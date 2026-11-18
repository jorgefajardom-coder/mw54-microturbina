// Prueba de vuelo: con cada avión, 100 vuelos (o los que se pidan) de la pista a un punto B y de vuelta a tierra,
// pilotados por tests/piloto.js con los mismos mandos que una persona. Si alguno no aterriza y se detiene en la
// pista, la prueba falla: el simulador de vuelo tiene que funcionar con todos.
// Uso: node tests/vuelos.mjs [hawk sr71 f22 f14 sr72] [--vuelos 100] [--semilla 12345] [--celular] [--sitio URL]
// --sitio prueba el sitio publicado (por ejemplo https://jorgefajardom-coder.github.io/mw54-microturbina/) en vez de web/.
// Necesita Chrome o Chromium (lo abre la skill anatomy, igual que las otras comprobaciones).
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = process.argv.slice(2);
const text = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const opt = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : Number(args.splice(i, 2)[1]); };
const flag = (name) => { const i = args.indexOf(name); if (i >= 0) args.splice(i, 1); return i >= 0; };
const site = text("--sitio");
const total = opt("--vuelos", 100);
const seed = opt("--semilla", 12345);
// --celular: la interfaz de teléfono (390 × 844, terreno ligero y palancas táctiles), la misma que abre un celular
const phone = flag("--celular");
const planes = args.length ? args : ["hawk", "sr71", "f22", "f14", "sr72"];
if (args.some((a) => a.startsWith("-"))) throw new Error(`opción desconocida: ${args.join(" ")}`);
const PORT = 8790;
const base = site ? site.replace(/\/?$/, "/") : `http://127.0.0.1:${PORT}/`;

const server = site ? null : spawn(process.execPath, [join(root, "src/serve.mjs"), join(root, "web"), String(PORT)], { stdio: "ignore" });
if (server) await new Promise((r) => setTimeout(r, 800));
const tmp = mkdtempSync(join(tmpdir(), "vuelos-"));
const pilot = readFileSync(join(here, "piloto.js"), "utf8").trim();
const body = pilot.slice(1, pilot.lastIndexOf(")"));
const drive = join(root, ".claude/skills/anatomy/scripts/drive.mjs");

let failed = false;
try {
  for (const plane of planes) {
    const url = `${base}${plane === "hawk" ? "" : plane + "/"}?vista=${phone ? "celular" : "escritorio"}`;
    const results = [];
    let info = null;
    // tandas de 25 para no pasar del tiempo de espera de cada evaluación; cada tanda con su propia semilla
    for (let done = 0, k = 0; done < total; k++) {
      const n = Math.min(25, total - done);
      const start = `window.__N=${n}; window.__SEED=${seed + k * 7919}; window.__done=false; (${body}).then((t) => { window.__log = t; window.__done = true; }, (e) => { window.__log = JSON.stringify({ error: String(e.stack) }); window.__done = true; }); 'en vuelo'`;
      const steps = [["until", "window.__sim && window.__sim.model", 60000], ["wait", plane === "hawk" ? 4000 : 14000],
        ["eval", "document.getElementById('fly').click(); 'f'"], ["wait", 2000], ["eval", start], ["until", "window.__done", 900000], ["eval", "window.__log"]];
      const file = join(tmp, `${plane}-${k}.json`);
      writeFileSync(file, JSON.stringify(steps));
      const size = phone ? ["--width", "390", "--height", "844"] : ["--width", "1200", "--height", "750"];
      const run = spawnSync(process.execPath, [drive, url, "--actions", file, ...size], { encoding: "utf8", maxBuffer: 64 << 20 });
      // drive.mjs imprime cada evaluación como `eval: "<texto en JSON>"`; la última trae el registro del piloto
      const line = (run.stdout ?? "").split("\n").reverse().find((l) => l.startsWith("eval: "));
      let out;
      try { out = JSON.parse(JSON.parse(line.slice(6))); } catch { out = { error: ((run.stdout ?? "") + (run.stderr ?? "")).slice(-800) }; }
      if (out.error) throw new Error(`${plane}: ${out.error}`);
      info = out.info;
      results.push(...out.results.map((r) => ({ ...r, n: done + r.n })));
      done += n;
      process.stdout.write(`\r${plane}: ${done}/${total}`);
    }
    const ok = results.filter((r) => r.ok).length;
    const goArounds = results.reduce((a, r) => a + r.ga, 0);
    console.log(`\r${plane}: ${ok}/${total} vuelos exitosos · aproximación ${info.aproximacion} km/h · ${goArounds} motor y al aire`);
    for (const r of results.filter((r) => !r.ok).slice(0, 10)) console.log(`  #${r.n} ${r.why} · toma ${r.td ?? "—"}`);
    if (ok < total) failed = true;
  }
} finally {
  server?.kill();
}
console.log(failed ? "prueba de vuelo: FALLA" : "prueba de vuelo: todos los vuelos aterrizaron");
process.exit(failed ? 1 : 0);
