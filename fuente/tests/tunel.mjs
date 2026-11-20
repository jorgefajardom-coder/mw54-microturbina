// Prueba del túnel de viento (web/aero/tunnel.js): el solucionador de Navier-Stokes tiene que dar las soluciones que se
// conocen antes de mostrarse como física. Corre en Chrome, en la GPU (o SwiftShader), con el mismo código de la página.
//  1. Poiseuille: un canal entre dos paredes con Lattice Boltzmann desarrolla el perfil parabólico exacto,
//     u_max / u_media = 3/2.
//  2. Cilindro a Re = 100: la calle de vórtices de von Kármán se desprende con número de Strouhal f·D/U ≈ 0,16–0,18
//     (0,164 sin paredes; algo más con el 12 % de bloqueo de la malla).
//  3. Tubo de choque de Sod con el método compresible: rarefacción, contacto y choque contra la solución exacta del
//     problema de Riemann (error L1, posición del choque y densidad entre contacto y choque).
//  4. Choque oblicuo: aire a Mach 2 y 3 desviado 10° por una placa alineada con la malla da el β de la relación θ-β-M
//     (39,31° y 27,38°) y la densidad de Rankine-Hugoniot.
//  5. La misma desviación con una rampa de escalones, como las paredes de los cuerpos del túnel: mide cuánto abre el
//     choque la pared escalonada (unos grados) y que la densidad tras el choque siga siendo la de Rankine-Hugoniot.
// Uso: node tests/tunel.mjs [poiseuille cilindro sod choque rampa] [--sitio URL]
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = process.argv.slice(2);
const at = args.indexOf("--sitio");
const site = at < 0 ? null : args.splice(at, 2)[1];
const PORT = 8791;
const base = site ? site.replace(/\/?$/, "/") : `http://127.0.0.1:${PORT}/`;
const drive = join(root, ".claude/skills/anatomy/scripts/drive.mjs");

// cada caso corre dentro de la página: crea su propio túnel, avanza por tandas (cediendo el hilo entre una y otra)
// y devuelve sus medidas
const helpers = String.raw`
const T = window.__tunel;
const yieldNow = () => new Promise((r) => setTimeout(r, 0));
async function advance(t, n, chunk, each) {
  for (let s = 0; s < n; s += chunk) { t.step(Math.min(chunk, n - s)); if (each) each(); else { t.macro(); t.read(0, 0, 1, 1); } await yieldNow(); }
}`;

const CASES = {
  poiseuille: {
    code: String.raw`
const nx = 200, ny = 34, t = T.createTunnel(T.renderer, { nx, ny });
const m = new Uint8Array(nx * ny);
for (let i = 0; i < nx; i++) { m[i] = 1; m[(ny - 1) * nx + i] = 1; }
t.setMask(m);
t.setFlow({ mode: "lbm", U: 0.05, tau: 0.8, cs: 0 });
t.reset();
await advance(t, 16000, 500);
t.macro();
const d = t.read();
const u = []; for (let y = 1; y < ny - 1; y++) u.push(d[(y * nx + 150) * 4 + 1]);
const mean = u.reduce((a, b) => a + b, 0) / u.length, max = Math.max(...u);
// perfil exacto con la pared a media celda (rebote a mitad de camino): u = 6 ū s (1 − s), s = (y − ½)/H
let err = 0; u.forEach((v, k) => { const s = (k + 0.5) / u.length; err = Math.max(err, Math.abs(v - 6 * mean * s * (1 - s)) / max); });
t.dispose();
return { ratio: max / mean, perfil: err, caudal: mean / 0.05 };`,
    check: (r) => [
      [`u_max/u_media = ${r.ratio.toFixed(4)} (exacto 1,5 con la pared a media celda: 1,4978)`, Math.abs(r.ratio - 1.4978) < 0.03],
      [`mayor desvío de la parábola = ${(r.perfil * 100).toFixed(2)} % de u_max`, r.perfil < 0.03],
      [`caudal medio / impuesto = ${r.caudal.toFixed(3)}`, Math.abs(r.caudal - 1) < 0.05],
    ],
  },
  cilindro: {
    code: String.raw`
const nx = 320, ny = 128, D = 16, U = 0.08, Re = 100, t = T.createTunnel(T.renderer, { nx, ny });
const cx = 64, cy = 64.3, m = new Uint8Array(nx * ny);   // 0,3 celdas fuera del eje para que la estela se desestabilice antes
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) m[j * nx + i] = (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= (D / 2) ** 2 ? 1 : 0;
t.setMask(m, D);
t.setFlow({ mode: "lbm", U, tau: 0.5 + (3 * U * D) / Re, cs: 0 });
t.reset();
await advance(t, 9000, 500);
const v = [];
await advance(t, 12000, 10, () => { t.macro(); v.push(t.read(cx + 4 * D, 64, 1, 1)[2]); });
const ups = []; for (let k = 1; k < v.length; k++) if (v[k - 1] < 0 && v[k] >= 0) ups.push(k - 1 + -v[k - 1] / (v[k] - v[k - 1]));
const period = ups.length > 2 ? ((ups[ups.length - 1] - ups[0]) / (ups.length - 1)) * 10 : NaN;
const amp = Math.max(...v.slice(-300)) / U;
t.dispose();
return { St: D / (U * period), ciclos: ups.length - 1, amplitud: amp };`,
    check: (r) => [
      [`Strouhal = ${r.St.toFixed(3)} en ${r.ciclos} ciclos (0,164 sin paredes)`, r.St > 0.15 && r.St < 0.2],
      [`la estela oscila: amplitud de v = ${r.amplitud.toFixed(2)} U`, r.amplitud > 0.1],
    ],
  },
  sod: {
    // la misma comprobación que el botón «Comprobar» de la página (tunnel.js, checkSod)
    code: String.raw`
const r = await T.checkSod(T.renderer);
const at = (f) => Math.round(f * r.x.length);
return { l1: r.l1, shock: r.shock, shockExact: r.shockExact, a: r.sim[at(0.6)], aExact: r.exact[at(0.6)], b: r.sim[at(0.77)], bExact: r.exact[at(0.77)] };`,
    check: (r) => [
      [`error L1 medio de la densidad = ${r.l1.toFixed(4)}`, r.l1 < 0.01],
      [`choque en la celda ${r.shock} (exacta ${r.shockExact.toFixed(1)})`, Math.abs(r.shock - r.shockExact) < 3],
      [`densidad entre la rarefacción y el contacto = ${r.a.toFixed(4)} (exacta ${r.aExact.toFixed(4)})`, Math.abs(r.a / r.aExact - 1) < 0.02],
      [`densidad entre el contacto y el choque = ${r.b.toFixed(4)} (exacta ${r.bExact.toFixed(4)})`, Math.abs(r.b / r.bExact - 1) < 0.02],
    ],
  },
  choque: {
    // placa alineada con la malla y aire que llega 10° de arriba, a Mach 2 y a Mach 3 (tunnel.js, checkOblique)
    code: String.raw`
const out = [];
for (const M of [2, 3]) out.push(await T.checkOblique(T.renderer, { M, theta: 10 }));
return out;`,
    check: (rs) => rs.flatMap((r) => [
      [`Mach ${r.M}: β = ${r.measured.toFixed(2)}° con ${r.points} puntos (θ-β-M: ${r.beta.toFixed(2)}°)`, Math.abs(r.measured - r.beta) < 1.5],
      [`Mach ${r.M}: densidad tras el choque = ${r.rho2Measured.toFixed(3)} (Rankine-Hugoniot ${r.rho2.toFixed(3)})`, Math.abs(r.rho2Measured / r.rho2 - 1) < 0.04],
    ]),
  },
  rampa: {
    code: String.raw`
const nx = 320, ny = 200, t = T.createTunnel(T.renderer, { nx, ny });
// esquina de compresión: pared plana y desde x0 una rampa de 10° hecha de escalones de la malla, como los cuerpos del
// túnel. Mide cuánto engruesa el cuerpo la pared escalonada: el choque sale unos grados más abierto que el exacto
const x0 = 50, y0 = 12, tan = Math.tan((10 * Math.PI) / 180), m = new Uint8Array(nx * ny);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) m[j * nx + i] = j + 0.5 <= y0 + Math.max(0, i + 0.5 - x0) * tan ? 1 : 0;
t.setMask(m, 200);
t.setFlow({ mode: "ns", M: 2, mu: 0 });
t.reset();
while (t.time < 400) { t.step(100); t.macro(); t.read(0, 0, 1, 1); await yieldNow(); }
t.macro();
const f = T.shockFit(t.read(), nx, ny, x0 + 60, x0 + 190, (i) => y0 + (i + 0.5 - x0) * tan, (1 + 1.4583) / 2);
t.dispose();
return { beta: f.angle, puntos: f.n, rho2: f.rho2 };`,
    check: (r) => [
      [`ángulo del choque β = ${Number(r.beta).toFixed(2)}° con ${r.puntos} puntos (exacto 39,31°; la pared escalonada lo abre, se admite hasta +4°)`, r.beta > 38.3 && r.beta < 43.3],
      [`densidad tras el choque = ${Number(r.rho2).toFixed(3)} (Rankine-Hugoniot 1,458)`, Math.abs(r.rho2 / 1.4583 - 1) < 0.05],
    ],
  },
};

const names = args.length ? args : Object.keys(CASES);
for (const n of names) if (!CASES[n]) throw new Error(`caso desconocido: ${n}`);
const server = site ? null : spawn(process.execPath, [join(root, "src/serve.mjs"), join(root, "web"), String(PORT)], { stdio: "ignore" });
if (server) await new Promise((r) => setTimeout(r, 800));
const tmp = mkdtempSync(join(tmpdir(), "tunel-"));
let failed = false;
try {
  for (const name of names) {
    const start = Date.now();
    const run = `window.__done = false; (async () => { ${helpers} ${CASES[name].code} })().then((r) => { window.__res = JSON.stringify(r); window.__done = true; }, (e) => { window.__res = JSON.stringify({ error: String(e.stack || e) }); window.__done = true; }); 'corriendo'`;
    const steps = [["until", "window.__tunel && window.__tunel.box()", 60000], ["eval", run], ["until", "window.__done", 900000], ["eval", "window.__res"]];
    const file = join(tmp, `${name}.json`);
    writeFileSync(file, JSON.stringify(steps));
    const out = spawnSync(process.execPath, [drive, `${base}aero/?prueba&debug`, "--actions", file, "--width", "800", "--height", "600"], { encoding: "utf8", maxBuffer: 64 << 20 });
    const line = (out.stdout ?? "").split("\n").reverse().find((l) => l.startsWith("eval: "));
    let r;
    try { r = JSON.parse(JSON.parse(line.slice(6))); } catch { r = { error: ((out.stdout ?? "") + (out.stderr ?? "")).slice(-800) }; }
    const secs = Math.round((Date.now() - start) / 1000);
    if (r.error) { console.log(`${name}: ERROR (${secs} s)\n  ${r.error}`); failed = true; continue; }
    console.log(`${name} (${secs} s)`);
    for (const [text, ok] of CASES[name].check(r)) { console.log(`  ${ok ? "ok   " : "FALLA"} ${text}`); if (!ok) failed = true; }
  }
} finally {
  server?.kill();
}
console.log(failed ? "túnel: FALLA" : "túnel: el solucionador da las soluciones conocidas");
process.exit(failed ? 1 : 0);
