// Fig 1: la MW54 en su banco de ensayo, a escala real (1 unidad = 1 mm), con su despiece en el orden de los planos.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import { glCamera } from "../.claude/skills/anatomy/kit/gl.mjs";
import { glScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import { SPEC, S, COUNTS, PARTS, MOVES, STAGGER, ASSEMBLY, op } from "./model.mjs";
import { kitOf } from "./parts.mjs";
import { engine, R_CASE, R_FLANGE } from "./engine.mjs";
import { settleOrder, mw54Impossible } from "./order.mjs";
import { seoHead, SIGNATURE } from "./seo.mjs";
import { navHtml, NAV_CSS } from "./nav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "dist");
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

const W = 1080;
const H = 640;
const AZIMUTH = 58;
const ELEVATION = 25;
const ZC = 58;
const X0 = 70;

const E = G.frameOf([X0, 0, ZC], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
const BENCH = { x: -125, y: -96, w: 250, d: 192, r: 10 };
const BENCH_H = 14;
const FOOT_H = 9;
const xAt = (s, dx = 0) => X0 - s + dx;

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [xAt(S.intake[0], MOVES.bellmouth[0]), -R_FLANGE, ZC + R_FLANGE],
    [xAt(S.intake[0], MOVES.bellmouth[0]), R_FLANGE, ZC - R_FLANGE],
    [xAt(S.nozzle[1], MOVES.nozzle[0]) - 40, -R_FLANGE, ZC + R_FLANGE],
    [xAt(S.nozzle[1], MOVES.nozzle[0]) - 40, R_FLANGE, ZC - R_FLANGE],
  ],
  W,
  H,
  { pad: 30, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const SPRING = { stagger: 0.06, stiffness: 52, damping: 13.5, substeps: 4 };
const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const HOUSED = new Set(["nut", "wheel", "diffuser", "tunnel", "combustor", "ngv", "turbine"]);
const K = kitOf(P, R, { moveOf: (piece) => MOVES[piece] ?? [0, 0, 0], housed: (piece) => HOUSED.has(piece) });
const { at, Sv, Ln, Dots, Faded, put, boxAt, cable, tubeItems, record, nameFor } = K;

// ───────────────────────── banco ─────────────────────────
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`);
const FEET = [-104, 0, 104].flatMap((x) => [-76, 76].map((y) => [x, y])).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of FEET) {
  back.push(Sv(k.cylinder(x, y, 9, -BENCH_H - FOOT_H, 2, P, 28), { tone: "lo" }));
  back.push(Sv(k.cylinder(x, y, 6.5, -BENCH_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
}
back.push(Sv(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(BENCH, -BENCH_H / 2, P, 8), { tone: "faint" }) }));
record(A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench" }));
back.push(Ln(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: "lo" }));
const BENCH_SCREWS = k.corners(BENCH, 14);
back.push(Ln(BENCH_SCREWS.map(([x, y]) => k.ring(x, y, 3, 0, P, 18)).join(""), { tone: "lo" }));
back.push(Dots(BENCH_SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
for (const y of [-40, 0, 40]) back.push(Ln(k.planOutline({ x: BENCH.x + 22, y: y - 2.2, w: BENCH.w - 44, d: 4.4, r: 2.2 }, 0, P, 4), { tone: "faint" }));
// Regla en mm a escala real a lo largo del borde delantero: la MW54 mide 167 mm de punta a cola.
const STRIP = { x: -100, y: BENCH.y + BENCH.d - 15, w: 200, d: 8, r: 1 };
back.push(Sv(k.slabOf(STRIP, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
const TICKS = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y + 0.8, 0.8, [2.4, 4.6], P);
back.push(Ln(TICKS.minor, { tone: "lo" }), Ln(TICKS.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 2, STRIP.y + 4, 0.8]), at([STRIP.x + STRIP.w - 2, STRIP.y + 4, 0.8])], { size: 0.45 }));
const LABEL = { x: 66, y: 44, w: 44, d: 16, r: 1.5 };
back.push(Sv(k.slabOf(LABEL, 0, 1, P, 3), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.8), 1, P), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([LABEL.x + 5, LABEL.y + 10.5], 1, P, "x"), "WREN MW54", { size: 4.4, tone: "lo" }));
back.push(Ln(k.onTop([[LABEL.x + 5, LABEL.y + 5], [LABEL.x + 30, LABEL.y + 5]], 1, P), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 1]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 1])], { size: 0.45 }));

// ───────────────────────── cunas de rodillos bajo la carcasa ─────────────────────────
const ROLLER = 6;
const CONTACT = 50;
for (const s of [44, 98]) {
  const cx = xAt(s);
  const base = { x: cx - 13, y: -44, w: 26, d: 88, r: 2 };
  boxAt("stand", base, 0, 10, { tone: "mid" }, { bevel: 0.6, name: "stand.cradle", extra: Dots(k.corners(base, 4).map(([x, y]) => at([x, y, 10])), { size: 0.5 }) + Ln(k.corners(base, 4).map(([x, y]) => k.ring(x, y, 2, 10, P, 12)).join(""), { tone: "lo" }) });
  for (const side of [-1, 1]) {
    const c = G.pointOf(E, s, R_CASE + ROLLER, (-90 + side * CONTACT) * DEG);
    for (const dx of [-11, 8]) {
      const cheek = { x: cx + dx, y: c[1] - 6, w: 3, d: 12, r: 0.8 };
      boxAt("stand", cheek, 10, c[2] + 2 - 10, { tone: "mid" }, { bevel: 0.3, name: "stand.cheek", extra: Dots([at([cx + dx + (dx > 0 ? 3 : 0), c[1], c[2]])], { size: 0.6, tone: "hi" }) });
    }
    const F = G.frameAlong([cx - 8, c[1], c[2]], [1, 0, 0]);
    put("stand", c, Sv(G.disc(0, 16, ROLLER, F, P, { bevel: 0.4 }), { tone: "hi" }) + Ln(G.circleOf(F, 16, 2, P, 14), { tone: "faint" }), { name: nameFor("stand.roller"), shapes: [record(A.disc(F, 0, 16, ROLLER, { name: "stand.roller" }))] });
  }
}

// ───────────────────────── el motor ─────────────────────────
const M = engine(K, P, E, { tag: "fig1" });

// ───────────────────────── ECU, bomba y botella de gas (detrás del motor) ─────────────────────────
const ECU = { x: -70, y: -90, w: 56, d: 30, r: 2 };
const ECU_H = 15;
boxAt("ecu", ECU, 0, ECU_H, { tone: "mid", inner: Ln(k.sideSeam(ECU, 4, P, 3), { tone: "faint" }) }, {
  name: "ecu.box",
  bevel: 0.7,
  extra:
    Ln(k.planOutline(k.insetPlan(ECU, 2.4), ECU_H, P, 3), { tone: "faint" }) +
    Ln([0, 1, 2].map((row) => k.onTop([[ECU.x + 6, ECU.y + 7 + row * 3], [ECU.x + (row === 1 ? 26 : 34), ECU.y + 7 + row * 3]], ECU_H, P)).join(""), { tone: "lo", free: true }) +
    Dots(k.corners(ECU, 3).map(([x, y]) => at([x, y, ECU_H])), { size: 0.45 }),
});
const ecuPort = (i) => [ECU.x + 38 + i * 7, ECU.y + 22, ECU_H];
for (let i = 0; i < 2; i++) {
  const F = G.frameAlong(ecuPort(i), [0, 0, 1]);
  put("ecu", G.add3(ecuPort(i), [0, 0, 1.5]), Sv(G.disc(0, 3, 2.1, F, P), { tone: "hi" }) + Ln(G.circleOf(F, 3, 1, P, 12), { tone: "faint" }), { bias: 0.3, name: nameFor("ecu.connector"), shapes: [record(A.disc(F, 0, 3, 2.1, { name: "ecu.connector" }))] });
}
const plugTop = (i) => G.add3(ecuPort(i), [0, 0, 3]);
// Sonda de temperatura (puerto 0) y bujía trasera (puerto 1): el otro alojamiento de bujía queda de reserva.
{
  const tc = M.tc;
  const near = G.add3(tc.at, G.mul3(tc.out, 10));
  cable("ecu", [plugTop(0), G.add3(plugTop(0), [0, 0, 16]), [tc.at[0], -54, near[2]], near, tc.at], { name: "ecu.tc-cable", bend: 8, shells: [false, true] });
  const glow = M.glow148;
  const gNear = G.add3(glow, G.mul3(M.radial(148), 10));
  cable("ecu", [plugTop(1), [plugTop(1)[0], plugTop(1)[1], gNear[2]], [gNear[0], plugTop(1)[1], gNear[2]], gNear, glow], { name: "ecu.glow-cable", bend: 8, shells: [false, true] });
}

const PUMP = { x: 26, y: -88, w: 22, d: 20, r: 1.6 };
boxAt("fuel", PUMP, 0, 16, { tone: "mid" }, { name: "fuel.head", extra: Dots(k.corners(PUMP, 2.6).map(([x, y]) => at([x, y, 16])), { size: 0.45 }) + Ln(k.planOutline(k.insetPlan(PUMP, 1.6), 16, P, 2), { tone: "faint" }) });
{
  const F = G.frameAlong([PUMP.x + PUMP.w, PUMP.y + PUMP.d / 2, 8], [1, 0, 0]);
  put("fuel", [PUMP.x + PUMP.w + 12, PUMP.y + PUMP.d / 2, 8], Sv(G.disc(0, 24, 7.5, F, P, { bevel: 0.5 }), { tone: "hi" }) + Faded(G.ribsOf(F, 4, 20, 7.5, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }), { name: "fuel.motor", shapes: [record(A.disc(F, 0, 24, 7.5, { name: "fuel.motor" }))] });
}
// Botella de gas (propano/butano) para el arranque, con su válvula.
const GAS_AT = [90, -74];
put("fuel", [GAS_AT[0], GAS_AT[1], 17], Sv(k.cylinder(GAS_AT[0], GAS_AT[1], 9, 0, 34, P, 40, 0.6), { tone: "hi", inner: Ln(k.sideArc(GAS_AT[0], GAS_AT[1], 9, 28, P, 24), { tone: "faint" }) }), { name: "fuel.gas-bottle", shapes: [record(A.cylinder(GAS_AT[0], GAS_AT[1], 9, 0, 34, { name: "fuel.gas-bottle" }))] });
put("fuel", [GAS_AT[0], GAS_AT[1], 37], Sv(k.cylinder(GAS_AT[0], GAS_AT[1], 3.2, 34, 6, P, 20), { tone: "mid" }), { bias: 0.2, name: "fuel.gas-valve", shapes: [record(A.cylinder(GAS_AT[0], GAS_AT[1], 3.2, 34, 6, { name: "fuel.gas-valve" }))] });

// Tres líneas a los adaptadores de latón de la carcasa: combustible y engrase desde la bomba, gas desde la botella.
function feed(from, adaptor, r, name, lane) {
  const near = G.add3(adaptor.at, G.mul3(adaptor.out, 9));
  const up = near[2] + lane;
  const route = [from, [from[0], from[1], up], [near[0], from[1], up], [near[0], near[1], up], near, adaptor.at].filter((p, i, all) => !i || G.len3(G.sub3(p, all[i - 1])) > 0.5);
  tubeItems("fuel", G.fillet(route, 22, 16, { P, tube: r }), r, { name, tone: "hi", maxLength: 14, spacing: 1.2 });
}
// Cada línea sube por su propio carril (y distinta) y cruza a su altura (combustible abajo, gas en medio, engrase arriba).
feed([M.adaptors.fuel.at[0], -70, 16], M.adaptors.fuel, 1.2, "fuel.line", 6);
feed([PUMP.x + 18, -84, 16], M.adaptors.lube, 0.9, "fuel.lube", 30);
feed([GAS_AT[0], GAS_AT[1], 40], M.adaptors.gas, 0.9, "fuel.gas", 22);

// ───────────────────────── orden y salida ─────────────────────────
settleOrder(R, P, { cache: join(HERE, "..", ".tmp", `keys-fig1-${AZIMUTH}-${ELEVATION}.json`), reuse: process.argv.includes("--reuse"), impossible: mw54Impossible({ S }) });
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => {
  const [mx, my, mz] = item.move;
  return `<g class="it" data-piece="${item.piece}"${item.ride !== item.piece ? ` data-ride="${item.ride}"` : ""} data-k="${item.key.toFixed(2)}" data-m="${mx.toFixed(1)},${my.toFixed(1)},${mz.toFixed(1)}">${item.svg}</g>`;
});

const unit = (vector) => {
  const o = at([0, 0, 0]);
  const p = at(vector);
  return [p[0] - o[0], p[1] - o[1]];
};
const fmt = (n) => Math.round(n).toLocaleString("es-ES");
// Líneas de corriente de la admisión: llegan de todo el frente, se curvan sobre el labio y entran por la garganta.
const STREAMS = [];
for (const [alpha, count, reach] of [[22, 7, 120], [48, 9, 110], [72, 9, 100]]) {
  for (let i = 0; i < count; i++) {
    const deg = (i / count) * 360 + alpha * 1.7;
    const start = G.pointOf(E, -reach * Math.cos(alpha * DEG), reach * Math.sin(alpha * DEG), deg * DEG);
    const lipTurn = G.pointOf(E, -6, 32 + 6 * Math.sin(alpha * DEG), deg * DEG);
    const end = G.pointOf(E, S.throat, 12 + 5 * (alpha / 72), deg * DEG);
    const pts = [];
    let low = Infinity;
    for (let j = 0; j <= 36; j++) {
      const t = j / 36;
      const a = G.add3(G.mul3(start, (1 - t) ** 2), G.add3(G.mul3(lipTurn, 2 * t * (1 - t)), G.mul3(end, t * t)));
      low = Math.min(low, a[2]);
      pts.push(at(a).map((v) => +v.toFixed(1)));
    }
    if (low < 8) continue;
    if (G.dot3(G.radialOf(E, deg * DEG), V) < -0.55 && alpha > 40) continue;
    STREAMS.push(pts);
  }
}
const MAX = op(1);
const DATA = {
  W, H, V,
  EX: unit([1, 0, 0]), EY: unit([0, 1, 0]), EZ: unit([0, 0, 1]),
  camera: glCamera(P),
  x0: X0, zc: ZC, exitX: xAt(S.nozzle[1]), exitR: 26, lipR: 33, caseR: R_FLANGE,
  spec: SPEC,
  parts: PARTS,
  stagger: STAGGER,
  assembly: ASSEMBLY,
  streams: STREAMS,
  spring: SPRING,
};

const LABEL_TEXT = "Microturbina Wren MW54 a escala real sobre un banco de ensayo con cunas de rodillos: toma de nailon, tuerca del compresor, tapa delantera, rueda del compresor Garrett de 6 + 6 álabes, difusor de 11 cuñas y 36 álabes, eje en su túnel con dos rodamientos cerámicos, cámara anular con seis filas de agujeros, estátor de 13 álabes, rueda de turbina de Inconel, cono de escape con 4 aletas, carcasa de inox, bujías, sonda, ECU, bomba de combustible y botella de gas.";
const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "mw-back" });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg mw-front" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="mw-engine">${groups.join("")}</g><g class="mw-streams" data-streams>${STREAMS.map((pts) => k.fadeLineSvg(pts, { fade: [60, 18], tone: "lo", className: "mw-streamline" })).join("")}</g></svg>`;

const ROWS = Object.entries(PARTS).map(([id, p], index) =>
  `<tr class="mw-row" data-part="${id}" tabindex="0"><td class="mw-num">${String(index + 1).padStart(2, "0")}</td><td><span class="mw-name">${p.name}</span><span class="mw-mat">${p.material}</span></td>` +
  `<td class="mw-melt">${fmt(p.melt[0])}–${fmt(p.melt[1])} °C</td><td class="mw-serv">${fmt(p.service)} °C</td>` +
  `<td class="mw-temp"><span data-temp>15 °C</span><span class="mw-bar"><span class="mw-fill" data-fill></span><span class="mw-svc" style="left:${Math.min(100, (p.service / p.melt[0]) * 100).toFixed(1)}%"></span></span></td></tr>`,
).join("");
const TABLE = `<table class="mw-table"><thead><tr><th></th><th>Pieza · material</th><th>Fusión</th><th>Servicio</th><th>Ahora · margen hasta fundir</th></tr></thead><tbody>${ROWS}</tbody></table>`;
const CHECK = [
  ["Rueda del compresor", `${COUNTS.compressorBlades[0]} + ${COUNTS.compressorBlades[1]} álabes, Ø${SPEC.compressor} / Ø${SPEC.inducer}`],
  ["Difusor", `${COUNTS.diffuserWedges} cuñas y ${COUNTS.diffuserVanes} álabes, Ø88`],
  ["Cámara", `envolvente Ø76 × 46, ${COUNTS.holeRows.reduce((n, [, c]) => n + c, 0)} agujeros en 6 filas, ${COUNTS.vaporisers} vaporizadores, ${COUNTS.swirlJets} inyectores, ${COUNTS.glowBosses} alojamientos de bujía`],
  ["Estátor (NGV)", `${COUNTS.ngvVanes} álabes, brida Ø76 con ${COUNTS.ngvScrews} tornillos M3`],
  ["Turbina", `Ø${SPEC.turbine} × 12, Inconel 713 fundido`],
  ["Cono de escape", `${COUNTS.outletVanes} aletas entre R17 y R30`],
  ["Rodamientos", `${COUNTS.ballRaces} × GRW 688 cerámicos`],
  ["Tornillería", `${COUNTS.screws} tornillos (M2,5 y M3) y 2 juntas tóricas`],
];
const CHECKS = `<section class="mw-materials"><h2>Lo que dicen los planos</h2><p class="mw-note">Cantidades y cotas de la lista de piezas y los planos de Wren (MW54, G.A. issue 4), las mismas que dibuja la figura.</p><table class="mw-table"><tbody>${CHECK.map(([a, b]) => `<tr class="mw-row"><td><span class="mw-name">${a}</span></td><td class="mw-melt">${b}</td></tr>`).join("")}</tbody></table></section>`;

const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Wren MW54 · banco de ensayo</span><span class="iso-plate-corner" data-corner="readout" data-readout>Parada · ${SPEC.mass} g</span></div>`;
const controls =
  `<div class="mw-controls">` +
  `<button type="button" class="mw-btn" data-run><span class="mw-lamp" aria-hidden="true"></span><span data-run-label>Arrancar</span></button>` +
  `<label class="mw-throttle">Gas<input type="range" min="0" max="100" value="60" data-throttle aria-label="Palanca de gas"></label>` +
  `<button type="button" class="mw-btn" data-apart>Despiece</button>` +
  `<button type="button" class="mw-btn" data-assemble>Montaje</button>` +
  `<span class="mw-hint" data-hint>Pasa el cursor por una pieza</span><span class="mw-live" aria-live="polite" data-live></span></div>`;
const stage = `<div class="mw-stage" tabindex="0" role="group" aria-label="Wren MW54. Pasa el cursor o usa las flechas para recorrer las piezas; D despiece, M montaje, A arrancar.">${backSvg}${frontSvg}<canvas class="mw-air" aria-hidden="true"></canvas></div>`;
const caption =
  `La MW54 de Wren mide ${SPEC.length} mm de punta a cola y ${SPEC.diameter} mm de diámetro (carcasa de ${SPEC.caseLength} mm), gira a ${fmt(SPEC.rpmMax)} rpm y empuja unos ${SPEC.thrustMax} N con ${SPEC.egtMax} °C en el escape. ` +
  `El aire entra por la toma de nailon, el compresor radial lo lleva a unas ${MAX.pr.toFixed(1)} atmósferas (${Math.round(MAX.t2)} °C) a ${Math.round(MAX.tip)} m/s en la punta de los álabes, el difusor lo frena, ` +
  `la cámara anular lo quema con queroseno a unos ${Math.round(MAX.primary)} °C y la turbina, a unos ${Math.round(MAX.tit)} °C, mueve el compresor por el mismo eje; lo que sobra sale por el cono. ` +
  `Por eso el nailon y el aluminio sólo viven delante y detrás manda el Inconel. Cotas y piezas: planos de Wren; prestaciones: GTBA; relación de presiones, caudal y temperaturas internas, valores típicos aproximados.`;
export const FIG1 =
  `<figure class="iso-figure mw"><div class="iso-plate">${corners}${stage}${controls}</div>` +
  `<figcaption class="iso-legend"><span class="iso-caption">${caption}</span></figcaption></figure>` +
  `<section class="mw-materials"><h2>Análisis de materiales</h2><p class="mw-note">Temperatura de metal de cada pieza en el punto de funcionamiento actual, frente a su temperatura de servicio (marca) y a su solidus (fin de la barra).</p>${TABLE}</section>` +
  CHECKS;

const CSS = readFileSync(join(HERE, "mw54.css"), "utf8");
const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
let page = k.pageHtml({ title: "Wren MW54", theme: THEME, body: `<style>${CSS}${NAV_CSS}</style>${navHtml("index.html")}<h1 class="mw-h1">Microturbina Wren MW54 · anatomía interactiva</h1>${FIG1}${SIGNATURE}`, script: glScript() + MODEL + LIVE, width: 1120 });
page = page.replace('<html lang="en">', '<html lang="es">').replace(/<title>[^<]*<\/title>/, seoHead());
mkdirSync(OUT, { recursive: true });
const name = THEME === "light" ? "light.html" : "index.html";
writeFileSync(join(OUT, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`);

const INNER = ["diffuser*", "tunnel*", "combustor*", "ngv*", "turbine*", "wheel*", "nut*"];
A.auditOrExit(R, P, { allow: INNER.flatMap((inner) => [["casing.body", inner], ["bellmouth.body", inner], ["bellmouth.flange", inner], ["shroud.flange", inner], ["casing.body", "shroud.body"]]) });
