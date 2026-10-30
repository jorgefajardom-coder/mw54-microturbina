// Figuras 2 a 5: los motores de los cuatro aviones del visor (J58 del SR-71, F119 del F-22, F110 del F-14 y TBCC del
// SR-72), con las mismas cotas que sus modelos de Blender (1 unidad = 1 mm). Cada figura se arma y se desarma pieza
// por pieza: primero salen las cubiertas, luego cada pieza por su lado (lo de delante hacia delante, lo de atrás
// hacia atrás, la carcasa hacia arriba), y la tabla da material, fusión y temperatura de servicio de cada una.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { seoHead, SIGNATURE, SITE } from "./seo.mjs";
import { navHtml, NAV_CSS } from "./nav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "dist");
const W = 1080;
const H = 560;
const F = G.frameOf([0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
const fmt = (n) => Math.round(n).toLocaleString("es-ES");

// ── piezas genéricas en el marco del motor (s a lo largo del eje, hacia el escape) ──
const solid = (profile) => ({ kind: "solid", profile });
const ring = (s0, s1, rIn, rOut) => ({ kind: "ring", s0, s1, rIn, rOut });
const shell = (meridian) => ({ kind: "shell", meridian });
const box = (u0, u1, v0, v1, s0, s1) => ({ kind: "box", u0, u1, v0, v1, s0, s1 });
// rotor: tambor o discos con una corona de álabes por etapa [s, punta, ancho, álabes]
const rotor = (s0, s1, hub, stages) => ({ kind: "rotor", s0, s1, hub, stages });
const shaft = (s0, s1, r) => solid([[s0, r], [s1, r]]);

const ENGINES = [
  {
    id: "j58", file: "j58.html", jet: "sr71", fig: "Fig 2", title: "Pratt & Whitney J58 · SR-71 Blackbird",
    lead: "Turborreactor con postquemador y derivación al postquemador: a Mach 3,2 el cono de la toma se retrasa 66 cm, seis tubos llevan aire del 4.º escalón del compresor al postquemador y el eyector de aletas libres da casi un tercio del empuje.",
    parts: [
      { key: "cono", shape: solid([[-4500, 0], [-3600, 260, 1], [-2700, 560, 1], [-2300, 640], [-1200, 520, 1], [-400, 330, 1], [0, 300]]), move: [3600, 0, 0], outer: true },
      { key: "carcasa", shape: ring(-60, 2950, 640, 690), move: [0, 0, 1700], outer: true, label: "Carcasa y estátores" },
      { key: "postquemador", shape: ring(2950, 8000, 640, 690), move: [-3000, 0, 0], outer: true },
      { key: "tobera", shape: shell([[8000, 640], [8000, 690], [8600, 560], [8800, 600], [8800, 570], [8600, 530], [8000, 640]]), move: [-4300, 0, 0], outer: true },
      { key: "eyector", shape: shell([[8850, 700], [8850, 790], [8960, 790], [11400, 640], [11400, 610], [8960, 700], [8850, 700]]), move: [-5600, 0, 0], outer: true },
      { key: "compresor", shape: rotor(0, 1600, 320, Array.from({ length: 9 }, (_, k) => [80 + k * 175, 640 - k * 22, 45, 32 + 5 * k])), move: [2000, 0, 0] },
      { key: "camara", shape: ring(1700, 2350, 330, 600), move: [-1300, 0, 0] },
      { key: "turbina", shape: rotor(2400, 2750, 340, [[2470, 560, 50, 68], [2660, 590, 50, 76]]), move: [-2100, 0, 0] },
      { key: "eje", shape: shaft(20, 2800, 75), move: [0, 0, -1100] },
    ],
  },
  {
    id: "f119", file: "f119.html", jet: "f22", fig: "Fig 3", title: "Pratt & Whitney F119 · F-22 Raptor",
    lead: "Turbofán de baja derivación (0,3) con fan de 3 etapas, compresor de alta de 6, turbinas de alta y de baja de una etapa que giran en sentidos contrarios, postquemador y tobera bidimensional que orienta el chorro ±20° en cabeceo.",
    parts: [
      { key: "fan", shape: rotor(-380, 760, 250, [[100, 520, 70, 22], [380, 510, 60, 30], [640, 500, 55, 38]]), spinner: [[-380, 0], [-250, 110, 1], [-110, 190, 1], [0, 225]], move: [2600, 0, 0] },
      { key: "carcasa", shape: ring(-40, 2900, 545, 585), move: [0, 0, 1500], outer: true, label: "Carcasa y estátores" },
      { key: "postquemador", shape: ring(2900, 4300, 505, 560), move: [-2600, 0, 0], outer: true },
      { key: "tobera", shape: box(-575, 575, -380, 380, 4300, 4700), move: [-3300, 0, 0], outer: true },
      { key: "aleta.superior", shape: box(-560, 560, 330, 400, 4700, 5160), move: [-3900, 0, 600], outer: true },
      { key: "aleta.inferior", shape: box(-560, 560, -400, -330, 4700, 5160), move: [-3900, 0, -600], outer: true },
      { key: "compresor", shape: rotor(880, 1680, 255, Array.from({ length: 6 }, (_, k) => [940 + k * 135, 400 - k * 15, 35, 40 + 6 * k])), move: [1300, 0, 0] },
      { key: "camara", shape: ring(1750, 2250, 290, 410), move: [-1000, 0, 0] },
      { key: "turbina_alta", shape: rotor(2300, 2420, 270, [[2360, 415, 45, 64]]), move: [-1500, 0, 0] },
      { key: "turbina_baja", shape: rotor(2540, 2680, 285, [[2610, 470, 50, 70]]), move: [-2000, 0, 0] },
      { key: "eje", shape: shaft(10, 2690, 60), move: [0, 0, -900] },
    ],
  },
  {
    id: "f110", file: "f110.html", jet: "f14", fig: "Fig 4", title: "General Electric F110-GE-400 · F-14 Tomcat",
    lead: "Turbofán con postquemador: fan de 3 etapas, compresor de alta de 9, turbina de alta de 1 etapa y de baja de 2, y tobera de pétalos que cierra la garganta en seco y la abre con el postquemador (unos 120 kN).",
    parts: [
      { key: "fan", shape: rotor(-400, 780, 255, [[110, 500, 80, 24], [390, 488, 70, 32], [660, 476, 60, 40]]), spinner: [[-400, 0], [-260, 115, 1], [-110, 195, 1], [0, 230]], move: [2600, 0, 0] },
      { key: "carcasa", shape: ring(-40, 3450, 545, 585), move: [0, 0, 1500], outer: true, label: "Carcasa y estátores" },
      { key: "postquemador", shape: ring(3450, 5300, 505, 560), move: [-2700, 0, 0], outer: true },
      { key: "tobera", shape: shell([[5260, 530], [5260, 590], [5330, 590], [5900, 488], [5900, 470], [5330, 555], [5260, 530]]), move: [-3700, 0, 0], outer: true },
      { key: "compresor", shape: rotor(900, 2100, 255, Array.from({ length: 9 }, (_, k) => [950 + k * 125, 395 - k * 10, 32, 40 + 5 * k])), move: [1400, 0, 0] },
      { key: "camara", shape: ring(2180, 2650, 285, 400), move: [-1100, 0, 0] },
      { key: "turbina_alta", shape: rotor(2700, 2820, 270, [[2760, 410, 45, 66]]), move: [-1700, 0, 0] },
      { key: "turbina_baja", shape: rotor(2920, 3300, 290, [[2990, 460, 45, 70], [3200, 480, 45, 76]]), move: [-2200, 0, 0] },
      { key: "eje", shape: shaft(10, 3340, 60), move: [0, 0, -900] },
    ],
  },
  {
    id: "tbcc", file: "tbcc.html", jet: "sr72", fig: "Fig 5", title: "Ciclo combinado TBCC · SR-72",
    lead: "Dos motores en uno, uno encima del otro: un turbofán de la clase F100/F110 arriba y un estatorreactor de modo dual (ramjet y scramjet) abajo, con la toma y la tobera compartidas. Una compuerta divisora pasa el aire de uno a otro hacia Mach 3. Cotas estimadas a partir del concepto publicado.",
    // a la escala real del avión (los planos internos del TBCC se dibujaron a 1/0,6 y aquí se reducen)
    scale: 0.6,
    parts: [
      { key: "rampa", shape: box(-710, 710, 400, 450, -4100, -1900), move: [3000, 0, 1400], outer: true },
      { key: "labio", shape: box(-720, 720, -1460, -1280, -3200, -2300), move: [2600, 0, -700], outer: true },
      { key: "aislador", shape: box(-640, 640, -1340, -710, -1700, 2000), move: [0, 0, -1300], outer: true },
      { key: "camara_scram", shape: box(-700, 700, -1420, -710, 2000, 8300), move: [0, 0, -2100], outer: true },
      { key: "tobera", shape: box(-720, 720, 400, 700, 9600, 15900), move: [-3200, 0, 1500], outer: true },
      { key: "carcasa", shape: ring(-40, 4600, 580, 612), move: [0, 0, 1700], outer: true, label: "Carcasa y estátores" },
      { key: "postquemador", shape: ring(4600, 8500, 545, 600), move: [-3600, 0, 0], outer: true },
      { key: "tobera_turbina", shape: shell([[8500, 545], [8500, 600], [9200, 470], [9500, 520], [9500, 490], [9200, 440], [8500, 545]]), move: [-4800, 0, 0], outer: true },
      { key: "fan", shape: rotor(-560, 900, 285, [[120, 556, 90, 26], [430, 556, 80, 34], [720, 556, 70, 42]]), spinner: [[-560, 0], [-420, 120, 1], [-230, 215, 1], [0, 262]], move: [4200, 0, 0] },
      { key: "compresor", shape: rotor(980, 2600, 260, Array.from({ length: 10 }, (_, k) => [1060 + k * 155, 440 - k * 13, 38, 40 + 4 * k])), move: [2500, 0, 0] },
      { key: "camara", shape: ring(2700, 3500, 300, 440), move: [-1800, 0, 0] },
      { key: "turbina", shape: rotor(3560, 4350, 290, [[3630, 425, 50, 66], [3930, 480, 55, 72], [4170, 510, 55, 78]]), move: [-2700, 0, 0] },
      { key: "eje", shape: shaft(10, 4390, 70), move: [0, 0, -1000] },
    ],
  },
];

function render(engine) {
  const meta = JSON.parse(readFileSync(join(HERE, "..", "web", engine.jet, "parts.json"), "utf8"));
  const S = engine.scale ?? 1;
  const scaled = (shape) => {
    const sc = (pts) => pts.map(([s, r, f]) => (f === undefined ? [s * S, r * S] : [s * S, r * S, f]));
    switch (shape.kind) {
      case "solid": return { ...shape, profile: sc(shape.profile) };
      case "shell": return { ...shape, meridian: sc(shape.meridian) };
      case "ring": return { ...shape, s0: shape.s0 * S, s1: shape.s1 * S, rIn: shape.rIn * S, rOut: shape.rOut * S };
      case "box": return { ...shape, u0: shape.u0 * S, u1: shape.u1 * S, v0: shape.v0 * S, v1: shape.v1 * S, s0: shape.s0 * S, s1: shape.s1 * S };
      case "rotor": return { ...shape, s0: shape.s0 * S, s1: shape.s1 * S, hub: shape.hub * S, stages: shape.stages.map(([s, t, w, n]) => [s * S, t * S, w * S, n]) };
    }
  };
  const parts = engine.parts.map((p) => ({ ...p, shape: scaled(p.shape), spinner: p.spinner && p.spinner.map(([s, r, f]) => [s * S, r * S, f]), move: p.move.map((v) => v * S) }));
  // extensión de cada pieza (s0, s1, radio) para encuadrar, ordenar por profundidad y elegir dónde va
  const extent = (p) => {
    const sh = p.shape;
    const pts = sh.kind === "solid" ? sh.profile : sh.kind === "shell" ? sh.meridian : null;
    if (pts) return [Math.min(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => Math.abs(q[1])))];
    if (sh.kind === "ring") return [sh.s0, sh.s1, sh.rOut];
    if (sh.kind === "box") return [sh.s0, sh.s1, Math.max(Math.abs(sh.u0), Math.abs(sh.u1), Math.abs(sh.v0), Math.abs(sh.v1))];
    return [Math.min(sh.s0, p.spinner?.[0][0] ?? sh.s0), sh.s1, Math.max(...sh.stages.map((q) => q[1]))];
  };
  const corners = [];
  for (const p of parts) {
    const [s0, s1, r] = extent(p);
    for (const share of [0, 1]) for (const s of [s0, s1]) for (const [y, z] of [[-r, -r], [r, r], [-r, r], [r, -r]]) {
      const q = G.pointOf(F, s, 0, 0);
      corners.push([q[0] + p.move[0] * share, y + p.move[1] * share, z + p.move[2] * share]);
    }
  }
  const P = k.fitProjection(corners, W, H, { pad: 26, azimuth: 52, elevation: 24 });

  const drawn = parts.map((p, index) => {
    const sh = p.shape;
    let svg = "";
    if (sh.kind === "solid") svg = k.solidSvg(G.solidOf(sh.profile, F, P), { tone: "hi" });
    else if (sh.kind === "shell") svg = k.solidSvg(G.lathe(sh.meridian, F, P), { tone: "hi" });
    else if (sh.kind === "ring") svg = k.solidSvg(G.ringBand(sh.s0, sh.s1, sh.rIn, sh.rOut, F, P), { tone: "hi", inner: k.lineSvg(G.arcOf(F, (sh.s0 + sh.s1) / 2, sh.rOut, P), { tone: "faint" }) });
    else if (sh.kind === "box") svg = k.solidSvg(G.prismOf(F, [[sh.u0, sh.v0], [sh.u1, sh.v0], [sh.u1, sh.v1], [sh.u0, sh.v1]], sh.s0, sh.s1, P), { tone: "hi" });
    else {
      // tambor con una corona de álabes por etapa; las líneas son los álabes que se ven
      const prof = [[sh.s0, sh.hub]];
      for (const [s, tip, w] of sh.stages) prof.push([s - w, sh.hub], [s - w, tip], [s + w, tip], [s + w, sh.hub]);
      prof.push([sh.s1, sh.hub]);
      const ribs = sh.stages.map(([s, tip, w, n]) => k.fadedSvg(G.ribsOf(F, s - w, s + w, tip, n, P, { twist: 0.25, fade: [0.1, 0.55] }), { tone: "lo" })).join("");
      const body = k.solidSvg(G.solidOf(prof, F, P), { tone: "hi", inner: ribs });
      svg = (p.spinner ? k.solidSvg(G.solidOf(p.spinner, F, P), { tone: "hi" }) : "") + body;
    }
    const [s0, s1] = extent(p);
    const mid = G.pointOf(F, (s0 + s1) / 2, 0, 0);
    const depth = (share) => k.depthOf([mid[0] + p.move[0] * share, mid[1] + p.move[1] * share, mid[2] + p.move[2] * share], P);
    const [dx, dy] = k.axisVector(P, p.move);
    return { p, index, svg, depth, dx, dy };
  });
  const orderAt = (share) => drawn.slice().sort((a, b) => a.depth(share) - b.depth(share)).map((d) => d.index);
  const info = (p) => meta[p.key] ?? { name: p.key, material: "", melt: [0, 0], service: 0 };
  const label = (p) => p.label ?? info(p).name;
  const groups = drawn.map(({ p, index, svg, dx, dy }) =>
    `<g class="eg-part${p.outer ? "" : " eg-inner"}" data-i="${index}" data-key="${p.key}" data-dx="${dx.toFixed(1)}" data-dy="${dy.toFixed(1)}" tabindex="0" aria-label="${label(p)}">${svg}</g>`);
  const rows = parts.map((p, index) => {
    const m = info(p);
    return `<tr class="mw-row" data-i="${index}" tabindex="0"><td class="mw-num">${String(index + 1).padStart(2, "0")}</td><td><span class="mw-name">${label(p)}</span><span class="mw-mat">${m.material}</span></td>` +
      `<td class="mw-melt">${fmt(m.melt[0])}–${fmt(m.melt[1])} °C</td><td class="mw-serv">${fmt(m.service)} °C</td>` +
      `<td class="mw-temp"><span class="mw-bar"><span class="mw-fill" style="width:${Math.min(100, (m.service / m.melt[0]) * 100).toFixed(1)}%"></span></span></td></tr>`;
  }).join("");
  const DATA = { parts: parts.map((p) => { const m = info(p); return { name: label(p), material: m.material, melt: m.melt, service: m.service }; }), home: orderAt(0), apart: orderAt(1) };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg eg-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${engine.title}, armado y en despiece">${groups.join("")}</svg>`;
  const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${text}</span>`;
  const figure =
    `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", engine.fig)}${corner("title", engine.title)}${corner("readout", "Armado", " data-readout")}</div>` +
    `<div class="eg-stage">${svg}</div>` +
    `<div class="mw-controls"><button type="button" class="mw-btn" data-apart>Despiece</button><button type="button" class="mw-btn" data-assemble>Montaje</button><span class="mw-hint">Pasa el cursor o toca una pieza</span></div></div>` +
    `<figcaption class="iso-legend"><span class="iso-caption">${engine.lead}</span></figcaption></figure>` +
    `<section class="mw-materials"><h2>Análisis de materiales</h2><p class="mw-note">Material de cada pieza, su intervalo de fusión y la temperatura a la que trabaja; la barra es la temperatura de servicio frente al comienzo de la fusión.</p>` +
    `<table class="mw-table"><thead><tr><th></th><th>Pieza · material</th><th>Fusión</th><th>Servicio</th><th>Servicio frente a fusión</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  const CSS = readFileSync(join(HERE, "mw54.css"), "utf8") + NAV_CSS + `
.eg-stage{position:relative}
.eg-svg{display:block;width:100%;height:auto}
.eg-part{transition:transform .9s cubic-bezier(.3,.7,.2,1),opacity .35s;cursor:pointer;outline:none}
.eg-inner{opacity:0;pointer-events:none}
[data-apart-on] .eg-inner{opacity:1;pointer-events:auto}
.eg-part:hover .iso-edge,.eg-part:focus .iso-edge,.eg-part[data-hot] .iso-edge{stroke:#f08a3c}
@media (prefers-reduced-motion:reduce){.eg-part{transition:none}}
@media (max-width:640px){.iso-plate-corner[data-corner="title"]{display:none}}
`;
  const script = `
const D = ${JSON.stringify(DATA)};
const svg = document.querySelector(".eg-svg");
const plate = document.querySelector(".iso-plate");
const out = document.querySelector("[data-readout]");
const parts = [...svg.querySelectorAll(".eg-part")];
const rows = [...document.querySelectorAll(".mw-row")];
let apart = false;
const reorder = (list) => list.forEach((i) => svg.appendChild(parts[i]));
// pieza por pieza: al desarmar salen en el orden de la lista; al montar vuelven al revés
function go(open) {
  if (open === apart) return;
  apart = open;
  const n = parts.length;
  if (open) { plate.setAttribute("data-apart-on", ""); reorder(D.apart); }
  parts.forEach((g, i) => {
    const turn = open ? i : n - 1 - i;
    g.style.transitionDelay = (turn * 0.16) + "s";
    g.style.transform = open ? "translate(" + g.dataset.dx + "px," + g.dataset.dy + "px)" : "";
  });
  const total = (n * 0.16 + 0.9) * 1000;
  clearTimeout(go.t);
  go.t = setTimeout(() => { if (!apart) { plate.removeAttribute("data-apart-on"); reorder(D.home); } }, total);
  out.textContent = open ? "Despiece · " + n + " piezas" : "Armado";
}
function show(i) {
  const p = D.parts[i];
  parts.forEach((g, j) => g.toggleAttribute("data-hot", j === i));
  rows.forEach((r, j) => r.toggleAttribute("data-hot", j === i));
  out.textContent = p.name + " · " + p.material + " · funde a " + p.melt[0].toLocaleString("es-ES") + " °C";
}
document.querySelector("[data-apart]").onclick = () => go(true);
document.querySelector("[data-assemble]").onclick = () => go(false);
parts.forEach((g, i) => { g.addEventListener("pointerenter", () => show(i)); g.addEventListener("focus", () => show(i)); g.addEventListener("click", () => { if (!apart) go(true); show(i); }); });
rows.forEach((r, i) => { r.addEventListener("pointerenter", () => { if (!apart) go(true); show(i); }); r.addEventListener("focus", () => show(i)); });
reorder(D.home);
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(() => go(true), 900);
`;
  let page = k.pageHtml({ title: engine.title, theme: "dark", body: `<style>${CSS}</style>${navHtml(engine.file)}<h1 class="mw-h1">${engine.title} · anatomía</h1>${figure}${SIGNATURE}`, script, width: 1120 });
  page = page.replace('<html lang="en">', '<html lang="es">').replace(/<title>[^<]*<\/title>/, seoHead({
    title: `${engine.title} · anatomía · Jorge Andres Fajardo Mora`,
    description: `${engine.title}: figura isométrica interactiva con despiece pieza por pieza y análisis de materiales. ${engine.lead}`,
    url: `${SITE}anatomia/${engine.file}`,
    name: `${engine.title} · anatomía`,
  }));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, engine.file), page);
  console.log("wrote", engine.file, `${(page.length / 1024).toFixed(0)} KB`);
}

for (const engine of ENGINES) render(engine);
