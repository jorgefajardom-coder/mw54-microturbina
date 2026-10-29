import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import { glCamera } from "../.claude/skills/anatomy/kit/gl.mjs";
import { glScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import { SPEC, S, PARTS, MOVES, STAGGER, ASSEMBLY, op } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "dist");
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

const W = 1080;
const H = 700;
const AZIMUTH = 58;
const ELEVATION = 25;
const ZC = 58;
const X0 = 108;
const R_CASE = SPEC.diameter / 2;
const R_FLANGE = 50;

const ENGINE = G.frameOf([X0, 0, ZC], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
const E = ENGINE;
const pt = (s, r, deg) => G.pointOf(E, s, r, deg * DEG);
const ex = (s) => G.pointOf(E, s, 0, 0);
const radial = (deg) => G.radialOf(E, deg * DEG);
const FRONT = [1, 0, 0];

const BENCH = { x: -150, y: -96, w: 300, d: 192, r: 10 };
const BENCH_H = 14;
const FOOT_H = 9;
const far = (s, dx) => X0 - s + dx;

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [far(S.lip, MOVES.bellmouth[0]), -R_FLANGE, ZC + R_FLANGE],
    [far(S.lip, MOVES.bellmouth[0]), R_FLANGE, ZC - R_FLANGE],
    [far(S.nozzle[1], MOVES.nozzle[0]) - 40, -R_FLANGE, ZC + R_FLANGE],
    [far(S.nozzle[1], MOVES.nozzle[0]) - 40, R_FLANGE, ZC - R_FLANGE],
  ],
  W,
  H,
  { pad: 30, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const Sv = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const Faded = (list, style) => k.fadedSvg(list, style);
const FADE = [0.04, 0.42];
const facing = (deg) => G.dot3(radial(deg), V);

const PIECES = Object.fromEntries(Object.keys(PARTS).map((id) => [id, { move: MOVES[id] ?? [0, 0, 0] }]));
PIECES.stand = { move: [0, 0, 0] };
const SPRING = { stagger: 0.06, stiffness: 52, damping: 13.5, substeps: 4 };
const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const { items, nameFor } = R;
const record = R.solid;

// Piezas alojadas dentro de la carcasa o de la toma. Una carcasa abierta "ve" su interior por la boca, y el
// orden por pares no puede saber que la toma y el difusor tapan esa boca: esos pares se ordenan a mano (más abajo).
const HOUSED = new Set(["nut", "wheel", "diffuser", "tunnel", "combustor", "ngv", "turbine"]);
const OPEN_SHELLS = new Set(["casing.body", "bellmouth.body"]);
// Último s de cada pieza alojada: sale de la carcasa cuando ese extremo cruza la cara delantera.
const REAR_S = { nut: S.nut[1], wheel: S.wheel[1], diffuser: S.diffuser[1], tunnel: S.turbine[0] };

function put(piece, ref, svg, { bias = 0, move, ride, shapes = [], name, route, chunk } = {}) {
  R.put({ piece, ride: ride ?? piece, at: ref, bias, svg, move: move ?? PIECES[piece].move, shapes, name: name ?? nameFor(`${piece}.item`), route, chunk, housed: HOUSED.has(ride ?? piece) });
}

function tubeItems(piece, route, r, { name, tone = "hi", bias = 0, move, ride, maxLength, spacing, owner, touch, limp = false, gaps = [], caps = true, rims, free = [false, false], rings } = {}) {
  const id = nameFor(name ?? `${piece}.tube`);
  R.route(id, route, r, { owner: owner ?? id, touch, limp, gaps, rims, free, piece, move: move ?? PIECES[piece].move, ride: ride ?? piece });
  tubePieces(route, r, P, { maxLength, spacing, gaps, caps, rings }).forEach((part, index) =>
    put(piece, part.mid, tubeSvg(part, { tone }), { bias, move, ride, name: `${id}:${index}`, route: id, chunk: index, shapes: [A.tube(part.points, part.radii)] }),
  );
  return id;
}

// Cuerpo torneado macizo (perfil cerrado al eje).
function turned(piece, profile, style = {}, { extra = "", inner = "", bias = 0, slope, name, owner, F = E } = {}) {
  const smooth = slope ? { slope, rows: 4 } : profile.some((p) => p[2]) ? { rows: 4 } : false;
  const paths = G.solidOf(profile, F, P, { smooth });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const id = nameFor(name ?? `${piece}.turned`);
  const shape = record(A.solid(F, profile, { name: id, owner, curve: smooth && !slope ? profile : undefined }));
  put(piece, G.add3(F.o, G.mul3(F.a, mid)), Sv(paths, { tone: "hi", ...style, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

// Cuerpo hueco: un meridiano cerrado que no toca el eje (carcasas, anillos, tobera).
function shell(piece, meridian, style = {}, { extra = "", inner = "", bias = 0, name, owner } = {}) {
  const paths = G.lathe(meridian, E, P, {});
  const ss = meridian.map((p) => p[0]);
  const mid = (Math.min(...ss) + Math.max(...ss)) / 2;
  const id = nameFor(name ?? `${piece}.shell`);
  const shape = record(A.lathe(E, meridian, { name: id, owner }));
  put(piece, ex(mid), Sv(paths, { tone: "hi", ...style, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

function boxAt(piece, plan, z, h, style = {}, { extra = "", bias = 0, bevel = 0.5, steps = 3, name } = {}) {
  const centre = [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
  const id = nameFor(name ?? `${piece}.box`);
  put(piece, centre, Sv(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, { bias, name: id, shapes: [record(A.slab(plan, z, h, { name: id }, steps))] });
}

function boss(piece, centre, outward, r, length, { tone = "hi", bias = 0.1, name, host, ring = true, owner } = {}) {
  const axis = G.unit3(outward);
  const F = G.frameAlong(centre, axis);
  const hosts = [host].flat().filter(Boolean);
  const id = nameFor(name ?? `${piece}.boss`);
  const face = ring && G.dot3(axis, V) > 0.15 ? Ln(G.circleOf(F, length, r * 0.55, P, 16), { tone: "faint" }) : "";
  if (!hosts.length) {
    put(piece, G.add3(centre, G.mul3(axis, length / 2)), Sv(G.disc(0, length, r, F, P), { tone }) + face, { bias, name: id, shapes: [record(A.disc(F, 0, length, r, { name: id, owner }))] });
    return G.add3(centre, G.mul3(axis, length));
  }
  const inside = (p) => hosts.some((shape) => A.sdf(shape, p) < 0);
  const start = (angle) => {
    let lo = -2.5 * r;
    let hi = length;
    if (!inside(G.pointOf(F, lo, r, angle))) return 0;
    for (let step = 0; step < 40; step++) {
      const mid = (lo + hi) / 2;
      if (inside(G.pointOf(F, mid, r, angle))) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const low = Math.min(...Array.from({ length: 48 }, (_, index) => start((index / 48) * Math.PI * 2)));
  put(piece, G.add3(centre, G.mul3(axis, length / 2)), Sv(G.saddleOf(F, r, start, length, P), { tone }) + face, { bias, name: id, shapes: [record(A.disc(F, low - 0.05, length, r, { name: id, owner, seated: true, cut: hosts }))] });
  return G.add3(centre, G.mul3(axis, length));
}

function cable(piece, points, { r = 0.7, bend = 6, name, shells = [false, false], free, tone = "mid", ride } = {}) {
  const route = G.fillet(points, bend, 12, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = 2.4;
  const gaps = [...(shells[0] ? [[0, SHELL]] : []), ...(shells[1] ? [[total - SHELL, total]] : [])];
  const id = tubeItems(piece, route, r, { name: name ?? `${piece}.cable`, tone, ride, maxLength: 16, spacing: 1, gaps, free, limp: true, rims: shells.map((on) => (on ? r * 2 : r)) });
  [0, 1].forEach((index) => {
    const end = index ? route[route.length - 1] : route[0];
    if (!shells[index]) {
      put(piece, end, Dots([at(end)], { size: 0.55, tone: "hi" }), { bias: 0.15, ride, name: `${id}.end`, shapes: [A.ball(end, 0.55 / KS)] });
      return;
    }
    const tangent = G.tangentAlong(route, index ? total : 0);
    const F = G.frameAlong(end, tangent);
    const [s0, s1] = index ? [-SHELL, 0] : [0, SHELL];
    put(piece, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), Sv(G.disc(s0, s1, r * 2, F, P, { bevel: 0.25 }), { tone: "mid" }), { bias: 0.1, ride, name: `${id}.shell`, shapes: [record(A.disc(F, s0, s1, r * 2, { name: `${id}.shell`, owner: id }))] });
  });
  return route;
}

// Un agujero visto en una superficie cilíndrica: contorno cerrado, relleno oscuro.
function holeOn(s, rBody, deg, rho) {
  const c = pt(s, rBody, deg);
  const t1 = E.a;
  const t2 = G.tangentOf(E, deg * DEG);
  const ring = Array.from({ length: 18 }, (_, j) => {
    const phi = (j / 18) * Math.PI * 2;
    return at(G.add3(c, G.add3(G.mul3(t1, rho * Math.cos(phi)), G.mul3(t2, rho * Math.sin(phi)))));
  });
  return `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

// La cara de una sección perpendicular al eje, como matriz afín: (x, y) locales = (r cos θ, r sin θ).
function faceMatrix(s) {
  const o = at(ex(s));
  const u = at(pt(s, 1, 0));
  const v = at(pt(s, 1, 90));
  return `matrix(${(u[0] - o[0]).toFixed(4)} ${(u[1] - o[1]).toFixed(4)} ${(v[0] - o[0]).toFixed(4)} ${(v[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
}
const polyD = (list) => `M${list.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}`;

// ───────────────────────── banco ─────────────────────────
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`);
const FEET = [-128, 0, 128].flatMap((x) => [-76, 76].map((y) => [x, y])).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
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
// T-slots del banco: ranuras cerradas a lo largo de x.
for (const y of [-40, 0, 40]) back.push(Ln(k.planOutline({ x: BENCH.x + 22, y: y - 2.2, w: BENCH.w - 44, d: 4.4, r: 2.2 }, 0, P, 4), { tone: "faint" }));
// Regla en mm a escala real (1 unidad = 1 mm) a lo largo del borde delantero.
const STRIP = { x: -120, y: BENCH.y + BENCH.d - 15, w: 240, d: 8, r: 1 };
back.push(Sv(k.slabOf(STRIP, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
const TICKS = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y + 0.8, 0.8, [2.4, 4.6], P);
back.push(Ln(TICKS.minor, { tone: "lo" }), Ln(TICKS.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 2, STRIP.y + 4, 0.8]), at([STRIP.x + STRIP.w - 2, STRIP.y + 4, 0.8])], { size: 0.45 }));
// Placa de identificación.
const LABEL = { x: 92, y: 44, w: 44, d: 16, r: 1.5 };
back.push(Sv(k.slabOf(LABEL, 0, 1, P, 3), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.8), 1, P), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([LABEL.x + 5, LABEL.y + 10.5], 1, P, "x"), "WREN MW54", { size: 4.4, tone: "lo" }));
back.push(Ln(k.onTop([[LABEL.x + 5, LABEL.y + 5], [LABEL.x + 30, LABEL.y + 5]], 1, P), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 1]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 1])], { size: 0.45 }));

// ───────────────────────── cunas de rodillos ─────────────────────────
const ROLLER = 6;
const CONTACT = 50;
const rollerAt = (s, side) => pt(s, R_CASE + ROLLER, -90 + side * CONTACT);
for (const s of [56, 150]) {
  const cx = X0 - s;
  const base = { x: cx - 13, y: -44, w: 26, d: 88, r: 2 };
  boxAt("stand", base, 0, 10, { tone: "mid" }, { bevel: 0.6, name: "stand.cradle", extra: Dots(k.corners(base, 4).map(([x, y]) => at([x, y, 10])), { size: 0.5 }) + Ln(k.corners(base, 4).map(([x, y]) => k.ring(x, y, 2, 10, P, 12)).join(""), { tone: "lo" }) });
  for (const side of [-1, 1]) {
    const c = rollerAt(s, side);
    for (const dx of [-11, 8]) {
      const cheek = { x: cx + dx, y: c[1] - 8, w: 3, d: 16, r: 0.8 };
      boxAt("stand", cheek, 10, c[2] + 6 - 10, { tone: "mid" }, { bevel: 0.3, name: "stand.cheek", extra: Dots([at([cx + dx + (dx > 0 ? 3 : 0), c[1], c[2]])], { size: 0.6, tone: "hi" }) });
    }
    const F = G.frameAlong([cx - 8, c[1], c[2]], [1, 0, 0]);
    put("stand", c, Sv(G.disc(0, 16, ROLLER, F, P, { bevel: 0.4 }), { tone: "hi" }) + Ln(G.circleOf(F, 16, 2, P, 14), { tone: "faint" }), { name: nameFor("stand.roller"), shapes: [record(A.disc(F, 0, 16, ROLLER, { name: "stand.roller" }))] });
  }
}

// ───────────────────────── carcasa (se queda en las cunas) ─────────────────────────
const CASE_IN = R_CASE - 0.8;
const CASING = shell(
  "casing",
  [[S.caseFront, CASE_IN], [S.caseFront, R_FLANGE], [S.caseFront + 4, R_FLANGE], [S.caseFront + 4, R_CASE], [S.caseBack - 4, R_CASE], [S.caseBack - 4, R_FLANGE], [S.caseBack, R_FLANGE], [S.caseBack, CASE_IN]],
  {},
  {
    name: "casing.body",
    inner: [64, 100, 138].map((s) => G.arcOf(E, s, R_CASE, P)).join(""),
    extra:
      `<path class="mw-void" d="${G.circleOf(E, S.caseFront, CASE_IN, P)}"/>` +
      Ln(G.arcOf(E, S.caseFront + 10, CASE_IN, P, { inward: true, least: -1 }), { tone: "lo" }) +
      Dots(G.dotsOf(E, S.caseFront, (R_FLANGE + R_CASE) / 2 + 0.6, 12, P, { all: true, phase: 0.13 }), { size: 0.5, tone: "mid" }),
  },
);
// Placa grabada en la carcasa: una banda que sigue al cilindro.
const TAG_S = [92, 112];
put("casing", pt(102, R_CASE, 40), Ln(G.arcOf(E, TAG_S[0], R_CASE + 0.01, P, { from: 22 * DEG, to: 58 * DEG }) + G.arcOf(E, TAG_S[1], R_CASE + 0.01, P, { from: 22 * DEG, to: 58 * DEG }), { tone: "lo" }) + Dots([pt(TAG_S[0] + 2.5, R_CASE, 26), pt(TAG_S[1] - 2.5, R_CASE, 26), pt(TAG_S[0] + 2.5, R_CASE, 54), pt(TAG_S[1] - 2.5, R_CASE, 54)].map(at), { size: 0.45 }), { bias: 0.3, name: "casing.tag", shapes: [A.ball(pt(102, R_CASE, 40), 0.4)] });
const FUEL_DEG = 140;
const TAP_DEG = 125;
const FUEL_BOSS = boss("casing", pt(44, R_CASE, FUEL_DEG), radial(FUEL_DEG), 3.6, 5, { host: CASING, name: "casing.fuel-boss" });
const GLOW_BOSS = boss("casing", pt(70, R_CASE, 115), radial(115), 4.2, 4, { host: CASING, name: "casing.glow-boss", ring: false });
const TAP_BOSS = boss("casing", pt(38, R_CASE, TAP_DEG), radial(TAP_DEG), 2.2, 3.2, { host: CASING, name: "casing.tap-boss" });
// Bujía incandescente: hexágono y terminal.
{
  const F = G.frameAlong(GLOW_BOSS, radial(115));
  const plug = [[0, 0], [0, 3.6], [3.4, 3.6], [3.4, 2.4], [7.4, 2.4], [8.4, 1.2], [8.4, 0]];
  put("casing", G.add3(GLOW_BOSS, G.mul3(radial(115), 4)), Sv(G.lathe(plug, F, P, { steps: 6 }), { tone: "hi" }), { bias: 0.3, name: "casing.glowplug", shapes: [record(A.body(F, plug, { name: "casing.glowplug" }))] });
}
const GLOW_TIP = G.add3(GLOW_BOSS, G.mul3(radial(115), 8.4));

// ───────────────────────── toma de aire ─────────────────────────
const LIP = [
  [S.caseFront, 28.5],
  [S.throat, 28.6, 1],
  [8, 32.5, 1],
  [4, 37, 1],
  [1.4, 40.6, 1],
  [0, 43, 1],
  [1.4, 45.2, 1],
  [4, 46.2],
  [20, 46.2],
  [20, R_FLANGE],
  [S.caseFront, R_FLANGE],
];
const SPIN_S = S.throat;
const thruBlades = (() => {
  const lines = [];
  for (let i = 0; i < 12; i++) {
    const main = i % 2 === 0;
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const r = (main ? 9 : 15) + ((28 - (main ? 9 : 15)) * j) / 10;
      const th = (i / 12) * Math.PI * 2 + 0.55 * ((r - 9) / 19) ** 1.6;
      pts.push([r * Math.cos(th), r * Math.sin(th)]);
    }
    lines.push(polyD(pts));
  }
  return lines;
})();
const THRU =
  `<clipPath id="mw-throat"><path d="${G.circleOf(E, SPIN_S, 28.5, P)}"/></clipPath>` +
  `<g class="mw-thru" clip-path="url(#mw-throat)"><g transform="${faceMatrix(SPIN_S + 6)}">` +
  `<circle class="mw-void" r="29"/><circle class="mw-blur" r="22" /><g data-spin>` +
  `<circle class="mw-hub" r="9.5"/>${thruBlades.map((d, i) => `<path class="mw-blade${i % 2 ? " mw-split" : ""}" d="${d}"/>`).join("")}` +
  `</g><circle class="mw-nut" r="6.8"/><circle class="mw-nut-ring" r="3.2"/><path class="mw-nut-ring" d="M-6.8 0L6.8 0M0 -6.8L0 6.8"/></g></g>`;
const BELLMOUTH = shell("bellmouth", LIP, {}, {
  name: "bellmouth.body",
  inner: G.arcOf(E, 20, 46.2, P),
  extra:
    `<path class="mw-void" d="${G.circleOf(E, 0.7, 41.4, P)}"/>` +
    Ln(G.arcOf(E, 6, 34.6, P, { inward: true, least: -1 }) + G.arcOf(E, S.throat, 28.6, P, { inward: true, least: -1 }), { tone: "lo" }) +
    THRU,
});
const BOLT_R = (R_FLANGE + 46.2) / 2;
for (let i = 0; i < 8; i++) {
  const deg = 22.5 + i * 45;
  const base = pt(20, BOLT_R, deg);
  const F = G.frameAlong(base, FRONT);
  const fly = G.add3(MOVES.bellmouth, G.mul3(radial(deg), 22));
  fly[0] += 26;
  put("bellmouth", G.add3(base, [0.8, 0, 0]), Sv(G.disc(0, 1.6, 1.5, F, P), { tone: "mid" }) + Ln(G.circleOf(F, 1.6, 0.7, P, 6), { tone: "lo" }), { move: fly, ride: "bellmouth", bias: 0.2, name: nameFor("bellmouth.screw"), shapes: [record(A.disc(F, 0, 1.6, 1.5, { name: "bellmouth.screw" }))] });
}

// ───────────────────────── tuerca y compresor ─────────────────────────
const nutR = (s) => 1.4 + 5.4 * Math.sin(Math.min(1, (s - S.nut[0]) / 7) * (Math.PI / 2));
const nutSlope = (s) => (s - S.nut[0] >= 7 ? 0 : (5.4 * (Math.PI / 14) * Math.cos(((s - S.nut[0]) / 7) * (Math.PI / 2))));
const NUT = [...Array.from({ length: 15 }, (_, i) => { const s = S.nut[0] + (7 * i) / 14; return [s, nutR(s), i && i < 14 ? 1 : 0]; }), [S.nut[1], 6.8]];
turned("nut", NUT, { tone: "mid" }, { slope: nutSlope, name: "nut.body", extra: Faded(G.ribsOf(E, 15, S.nut[1], 6.8, 6, P, { fade: [0.1, 0.55] }), { tone: "lo" }) });

const HUB_L = 14.5;
const hub = (s) => 8 + 19 * Math.min(1, Math.max(0, (s - S.wheel[0]) / HUB_L)) ** 2.2;
const hubSlope = (s) => { const x = (s - S.wheel[0]) / HUB_L; return x <= 0 || x >= 1 ? 0 : ((19 * 2.2) / HUB_L) * x ** 1.2; };
const HUB = [...Array.from({ length: 22 }, (_, i) => { const s = S.wheel[0] + (HUB_L * i) / 21; return [s, hub(s), i && i < 21 ? 1 : 0]; }), [S.wheel[1], 27]];
const tipR = (s) => 26 + (s - S.wheel[0]) / HUB_L;
const bladeAngle = (i, s) => (i / 12) * Math.PI * 2 + 0.7 * (1 - (s - S.wheel[0]) / HUB_L) ** 2;
const bladeLines = [];
for (let i = 0; i < 12; i++) {
  const sLE = i % 2 === 0 ? S.wheel[0] : S.wheel[0] + 5;
  const pts = [G.pointOf(E, sLE, hub(sLE) + 0.2, bladeAngle(i, sLE))];
  for (let j = 0; j <= 12; j++) {
    const s = sLE + ((S.wheel[0] + HUB_L - sLE) * j) / 12;
    pts.push(G.pointOf(E, s, tipR(s), bladeAngle(i, s)));
  }
  const mid = (S.wheel[0] + HUB_L + sLE) / 2;
  const alpha = G.fadeOf(G.dot3(G.radialOf(E, bladeAngle(i, mid)), V) + 0.25, [0.05, 0.5]);
  bladeLines.push({ d: polyD(pts.map(at)), alpha });
}
{
  const id = "wheel.body";
  const paths = G.solidOf(HUB, E, P, { smooth: { slope: hubSlope, rows: 4 } });
  const env = record(A.solid(E, [[S.wheel[0], 26], [S.wheel[0] + HUB_L, 27], [S.wheel[1], 27]], { name: "wheel.blades" }));
  const body = record(A.solid(E, HUB, { name: id }));
  put("wheel", ex(26), Sv(paths, { tone: "hi", inner: Ln(G.arcOf(E, S.wheel[0] + HUB_L, 27, P), { tone: "faint" }) }) + Faded(bladeLines, { tone: "hi" }), { name: id, shapes: [body, env] });
}

// ───────────────────────── difusor ─────────────────────────
const DIFF_OUT = CASE_IN - 0.15;
shell("diffuser", [[S.diffuser[0], 7], [S.diffuser[0], DIFF_OUT], [S.diffuser[1], DIFF_OUT], [S.diffuser[1], 7]], {}, {
  name: "diffuser.body",
  inner: G.arcOf(E, S.diffuser[0] + 4, DIFF_OUT, P),
  extra:
    Ln(G.spokesOf(E, S.diffuser[0], 29, 40.5, 20, P, { sweep: 0.42 }), { tone: "mid" }) +
    Ln(G.circleOf(E, S.diffuser[0], 29, P) + G.circleOf(E, S.diffuser[0], 40.5, P), { tone: "lo" }) +
    `<path class="mw-void" d="${G.circleOf(E, S.diffuser[0], 7, P)}"/>` +
    Dots(G.dotsOf(E, S.diffuser[0], 18, 6, P, { all: true }), { size: 0.55, tone: "mid" }) +
    Ln(G.circleOf(E, S.diffuser[0], 12, P), { tone: "faint" }),
});

// ───────────────────────── eje, túnel y rodamientos ─────────────────────────
const [T0, T1] = S.tunnel;
shell("tunnel", [[T0, 5], [T0, 10.5], [T0 + 8, 10.5], [T0 + 8, 9], [T1 - 8, 9], [T1 - 8, 10.5], [T1, 10.5], [T1, 5]], { tone: "mid" }, {
  name: "tunnel.body",
  extra: Dots(G.dotsOf(E, T0, 7.75, 9, P, { all: true }), { size: 0.75, tone: "hi" }) + Ln(G.circleOf(E, T0, 9.3, P) + G.circleOf(E, T0, 6.2, P), { tone: "faint" }),
});
turned("tunnel", [[S.diffuser[0], 4], [S.turbine[0], 4]], { tone: "hi" }, { name: "tunnel.shaft", inner: G.arcOf(E, T0 - 3, 4, P) });
// Tubo de engrase sobre el túnel, de rodamiento a rodamiento.
tubeItems("tunnel", [pt(T0 + 8, 10.4, 60), pt(T1 - 8, 10.4, 60)], 0.75, { name: "tunnel.oil", tone: "mid", maxLength: 40, spacing: 1 });

// ───────────────────────── cámara de combustión ─────────────────────────
const [C0, C1] = S.combustor;
const holes = [];
for (const [s, count, rho] of [[74, 10, 2.1], [102, 8, 3], [130, 6, 4]]) {
  for (let i = 0; i < count; i++) {
    const deg = (i / count) * 360 + (s % 3) * 7;
    const f = facing(deg);
    if (f < 0.12) continue;
    holes.push(`<path class="mw-hole" style="opacity:${G.fadeOf(f, [0.12, 0.45]).toFixed(2)}" d="${holeOn(s, 36, deg, rho)}"/>`);
  }
}
const COMBUSTOR = shell("combustor", [[C0 - 2, 13], [C0 - 2, 36], [C1, 36], [C1, 13]], {}, {
  name: "combustor.body",
  inner: [88, 116, 144].map((s) => G.arcOf(E, s, 36, P)).join(""),
  extra:
    holes.join("") +
    `<path class="mw-void" d="${G.circleOf(E, C0 - 2, 13, P)}"/>` +
    Ln(G.circleOf(E, C0 - 2, 24, P), { tone: "faint" }) +
    Dots(G.dotsOf(E, C0 - 2, 24, 6, P, { all: true, phase: 0.26 }), { size: 0.9, tone: "hi" }) +
    Dots(G.dotsOf(E, C0 - 2, 33.5, 18, P, { all: true }), { size: 0.4, tone: "mid" }),
});

// ───────────────────────── estátor de turbina (NGV) ─────────────────────────
const [N0, N1] = S.ngv;
shell("ngv", [[N0, 8], [N0, 36], [N1, 36], [N1, 8]], {}, {
  name: "ngv.body",
  extra:
    `<path class="mw-void" fill-rule="evenodd" d="${G.circleOf(E, N0, 33, P)}${G.circleOf(E, N0, 14, P)}"/>` +
    `<path class="mw-vane" d="${G.spokesOf(E, N0, 14, 33, 15, P, { sweep: 0.5 })}"/>` +
    `<path class="mw-void" d="${G.circleOf(E, N0, 8, P)}"/>` +
    Dots(G.dotsOf(E, N0, 34.6, 15, P, { all: true }), { size: 0.4, tone: "mid" }) +
    Dots(G.dotsOf(E, N0, 11, 5, P, { all: true }), { size: 0.45, tone: "mid" }),
});

// ───────────────────────── rueda de turbina ─────────────────────────
const [U0, U1] = S.turbine;
turned("turbine", [[U0, 6], [U0 + 1, 15, 1], [U0 + 3, 20.5, 1], [U0 + 4.5, 22.4], [U1, 22.4]], { tone: "hi" }, { name: "turbine.hub", extra: Ln(G.circleOf(E, U0, 6, P), { tone: "lo" }) });
shell("turbine", [[U0 + 1, 22.4], [U0 + 1, 31], [U1 - 1, 31], [U1 - 1, 22.4]], { tone: "mid" }, {
  name: "turbine.blades",
  extra: Ln(G.spokesOf(E, U0 + 1, 22.4, 31, 27, P, { sweep: -0.32 }), { tone: "hi" }) + Faded(G.ribsOf(E, U0 + 1, U1 - 1, 31, 27, P, { twist: -0.5, fade: [0.1, 0.55] }), { tone: "lo" }),
});

// ───────────────────────── tobera y cono de cola ─────────────────────────
const [Z0, Z1] = S.nozzle;
const nozIn = (s) => 41.8 - ((s - (Z0 + 4)) * (41.8 - 32.5)) / (Z1 - Z0 - 4);
const NOZZLE = shell("nozzle", [[Z0, 40.6], [Z0, R_FLANGE], [Z0 + 4, R_FLANGE], [Z0 + 4, R_CASE], [Z1, 34], [Z1, 32.5], [Z0 + 4, 41.8]], {}, {
  name: "nozzle.body",
  inner: G.arcOf(E, Z0 + 16, R_CASE - (12 * (R_CASE - 34)) / (Z1 - Z0 - 4), P, { slope: -(R_CASE - 34) / (Z1 - Z0 - 4) }),
  extra:
    `<path class="mw-void" d="${G.circleOf(E, Z0, 40.6, P)}"/>` +
    `<clipPath id="mw-noz"><path d="${G.circleOf(E, Z0, 40.6, P)}"/></clipPath><g clip-path="url(#mw-noz)">` +
    Sv(G.solidOf([[Z0 + 4, 14], [Z0 + 10, 14], [Z1 - 2, 3]], E, P), { tone: "mid" }) +
    [30, 150, 270].map((deg) => Sv(G.disc(14, nozIn(Z0 + 8) - 0.1, 1.3, G.frameAlong(pt(Z0 + 8, 0, 0), radial(deg)), P), { tone: "mid" })).join("") +
    `</g>` +
    Dots(G.dotsOf(E, Z0, (R_FLANGE + R_CASE) / 2 + 0.6, 12, P, { all: true, phase: 0.13 }), { size: 0.5, tone: "mid" }),
});
const TC_BOSS = boss("nozzle", pt(196, nozIn(196) + 1.5 + (R_CASE - 34) * 0, 100), radial(100), 2.2, 3, { host: NOZZLE, name: "nozzle.tc-boss" });

// ───────────────────────── ECU y bomba de combustible (detrás) ─────────────────────────
const ECU = { x: 10, y: -88, w: 56, d: 32, r: 2 };
const ECU_H = 15;
boxAt("ecu", ECU, 0, ECU_H, { tone: "mid", inner: Ln(k.sideSeam(ECU, 4, P, 3), { tone: "faint" }) }, {
  name: "ecu.box",
  bevel: 0.7,
  extra:
    Ln(k.planOutline(k.insetPlan(ECU, 2.4), ECU_H, P, 3), { tone: "faint" }) +
    Ln([0, 1, 2].map((row) => k.onTop([[ECU.x + 6, ECU.y + 7 + row * 3], [ECU.x + (row === 1 ? 26 : 34), ECU.y + 7 + row * 3]], ECU_H, P)).join(""), { tone: "lo", free: true }) +
    Dots(k.corners(ECU, 3).map(([x, y]) => at([x, y, ECU_H])), { size: 0.45 }),
});
const ecuPort = (i) => [ECU.x + 40 + i * 6, ECU.y + 24, ECU_H];
for (let i = 0; i < 3; i++) {
  const F = G.frameAlong(ecuPort(i), [0, 0, 1]);
  put("ecu", G.add3(ecuPort(i), [0, 0, 1.5]), Sv(G.disc(0, 3, 2.1, F, P), { tone: "hi" }) + Ln(G.circleOf(F, 3, 1, P, 12), { tone: "faint" }), { bias: 0.3, name: nameFor("ecu.connector"), shapes: [record(A.disc(F, 0, 3, 2.1, { name: "ecu.connector" }))] });
}
const plugTop = (i) => G.add3(ecuPort(i), [0, 0, 3]);
cable("ecu", [plugTop(0), G.add3(plugTop(0), [0, 0, 70]), G.add3(GLOW_TIP, G.mul3(radial(115), 14)), GLOW_TIP], { name: "ecu.glow-cable", bend: 8, shells: [false, true] });
{
  const near = G.add3(TAP_BOSS, G.mul3(radial(TAP_DEG), 10));
  cable("ecu", [plugTop(1), [plugTop(1)[0], plugTop(1)[1], near[2]], [near[0], plugTop(1)[1], near[2]], near, TAP_BOSS], { name: "ecu.tap-line", bend: 7, r: 0.9, shells: [false, true] });
}
const TC_TIP = G.add3(TC_BOSS, G.mul3(radial(100), 3));
put("nozzle", TC_TIP, Sv(G.disc(0, 3, 1.3, G.frameAlong(TC_BOSS, radial(100)), P), { tone: "hi" }), { bias: 0.3, name: "nozzle.tc", shapes: [record(A.disc(G.frameAlong(TC_BOSS, radial(100)), 0, 3, 1.3, { name: "nozzle.tc" }))] });
cable("ecu", [plugTop(2), G.add3(plugTop(2), [0, 0, 14]), [-60, -54, ZC + 56], G.add3(TC_TIP, G.mul3(radial(100), 10)), TC_TIP], { name: "ecu.tc-cable", bend: 8, shells: [false, true], free: [false, true] });

const PUMP = { x: 80, y: -86, w: 22, d: 20, r: 1.6 };
boxAt("fuel", PUMP, 0, 16, { tone: "mid" }, { name: "fuel.head", extra: Dots(k.corners(PUMP, 2.6).map(([x, y]) => at([x, y, 16])), { size: 0.45 }) + Ln(k.planOutline(k.insetPlan(PUMP, 1.6), 16, P, 2), { tone: "faint" }) });
{
  const F = G.frameAlong([PUMP.x + PUMP.w, PUMP.y + PUMP.d / 2, 8], [1, 0, 0]);
  put("fuel", [PUMP.x + PUMP.w + 12, PUMP.y + PUMP.d / 2, 8], Sv(G.disc(0, 24, 7.5, F, P, { bevel: 0.5 }), { tone: "hi" }) + Faded(G.ribsOf(F, 4, 20, 7.5, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }), { name: "fuel.motor", shapes: [record(A.disc(F, 0, 24, 7.5, { name: "fuel.motor" }))] });
}
const PUMP_OUT = [PUMP.x + 6, PUMP.y + PUMP.d / 2, 16];
{
  const near = G.add3(FUEL_BOSS, G.mul3(radial(FUEL_DEG), 12));
  tubeItems("fuel", G.fillet([PUMP_OUT, [PUMP_OUT[0], PUMP_OUT[1], near[2]], [near[0], PUMP_OUT[1], near[2]], near, FUEL_BOSS], 7, 12, { P, tube: 1.4 }), 1.4, { name: "fuel.line", tone: "hi", maxLength: 14, spacing: 1.2 });
}

// ───────────────────────── orden y salida ─────────────────────────
const openPair = (a, b) => (OPEN_SHELLS.has(a.name) && b.housed) || (OPEN_SHELLS.has(b.name) && a.housed);
// --reuse toma el orden del último build si la geometría no ha cambiado (para iterar en la página sin esperar al cálculo).
const KEYS = join(HERE, "..", ".tmp", `keys-${AZIMUTH}-${ELEVATION}.json`);
const cached = process.argv.includes("--reuse") && existsSync(KEYS) ? JSON.parse(readFileSync(KEYS, "utf8")) : null;
if (cached && cached.length === items.length && cached.every(([name], index) => name === items[index].name)) {
  items.forEach((item, index) => (item.key = cached[index][1]));
  R.settled = undefined;
  console.log("orden reutilizado de", KEYS);
} else {
  A.settle(R, P, { skip: (a, b) => A.sameRun(a, b) || openPair(a, b) });
  mkdirSync(dirname(KEYS), { recursive: true });
  writeFileSync(KEYS, JSON.stringify(items.map((item) => [item.name, item.key])));
}
{
  const keyOf = (name) => items.find((item) => item.name === name).key;
  const caseKey = keyOf("casing.body");
  const bellKey = keyOf("bellmouth.body");
  for (const item of items) {
    if (!item.housed) continue;
    const lift = G.dot3(item.move, V);
    if (lift <= 0) {
      item.key = Math.min(item.key, caseKey - 0.05);
      continue;
    }
    // Detrás de la carcasa mientras sigue dentro; delante en cuanto su extremo trasero sale por la boca.
    const exit = Math.max(0, (REAR_S[item.ride] - S.caseFront) / item.move[0]);
    item.key = Math.min(caseKey - lift * exit - 0.05, bellKey - 0.5 - (item.ride === "nut" ? 0 : 0.5));
  }
}
items.sort((a, b) => a.key - b.key);
const groups = items.map((item, index) => {
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
// Sólo las que viven delante del plano del labio (s < 0 queda más cerca de la cámara), así se pintan encima sin mentir.
const STREAMS = [];
for (const [alpha, count, reach] of [[22, 7, 150], [48, 9, 135], [72, 9, 120]]) {
  for (let i = 0; i < count; i++) {
    const deg = (i / count) * 360 + alpha * 1.7;
    const start = pt(-reach * Math.cos(alpha * DEG), reach * Math.sin(alpha * DEG), deg);
    const lipTurn = pt(-14, 43 + 8 * Math.sin(alpha * DEG), deg);
    const end = pt(S.throat, 18 + 6 * (alpha / 72), deg);
    const pts = [];
    let low = Infinity;
    for (let j = 0; j <= 36; j++) {
      const t = j / 36;
      const a = G.add3(G.mul3(start, (1 - t) ** 2), G.add3(G.mul3(lipTurn, 2 * t * (1 - t)), G.mul3(end, t * t)));
      low = Math.min(low, a[2]);
      pts.push(at(a).map((v) => +v.toFixed(1)));
    }
    if (low < 8) continue;
    if (G.dot3(radial(deg), V) < -0.55 && alpha > 40) continue;
    STREAMS.push(pts);
  }
}
const MAX = op(1);
const DATA = {
  W, H, V,
  EX: unit([1, 0, 0]), EY: unit([0, 1, 0]), EZ: unit([0, 0, 1]),
  camera: glCamera(P),
  x0: X0, zc: ZC, exitX: X0 - S.nozzle[1], exitR: 33.5, lipR: 43, caseR: R_FLANGE,
  spec: SPEC,
  parts: PARTS,
  stagger: STAGGER,
  assembly: ASSEMBLY,
  streams: STREAMS,
  spring: SPRING,
};

const LABEL_TEXT = "Microturbina Wren MW54 sobre un banco de ensayo con cunas de rodillos: toma de aire, tuerca cónica, rueda del compresor radial, difusor, eje con túnel y rodamientos, cámara de combustión anular, estátor y rueda de turbina, tobera con cono de cola, carcasa de acero inoxidable, bujía, termopar, ECU y bomba de combustible.";
const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "mw-back" });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg mw-front" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="mw-engine">${groups.join("")}</g><g class="mw-streams" data-streams>${STREAMS.map((pts) => k.fadeLineSvg(pts, { fade: [60, 18], tone: "lo", className: "mw-streamline" })).join("")}</g></svg>`;

const ROWS = Object.entries(PARTS).map(([id, p], index) =>
  `<tr class="mw-row" data-part="${id}" tabindex="0"><td class="mw-num">${String(index + 1).padStart(2, "0")}</td><td><span class="mw-name">${p.name}</span><span class="mw-mat">${p.material}</span></td>` +
  `<td class="mw-melt">${fmt(p.melt[0])}–${fmt(p.melt[1])} °C</td><td class="mw-serv">${fmt(p.service)} °C</td>` +
  `<td class="mw-temp"><span data-temp>15 °C</span><span class="mw-bar"><span class="mw-fill" data-fill></span><span class="mw-svc" style="left:${((p.service / p.melt[0]) * 100).toFixed(1)}%"></span></span></td></tr>`,
).join("");
const TABLE = `<table class="mw-table"><thead><tr><th></th><th>Pieza · material</th><th>Fusión</th><th>Servicio</th><th>Ahora · margen hasta fundir</th></tr></thead><tbody>${ROWS}</tbody></table>`;

const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Wren MW54 · microturbina</span><span class="iso-plate-corner" data-corner="readout" data-readout>Parada · ${SPEC.mass} g</span></div>`;
const controls =
  `<div class="mw-controls">` +
  `<button type="button" class="mw-btn" data-run><span class="mw-lamp" aria-hidden="true"></span><span data-run-label>Arrancar</span></button>` +
  `<label class="mw-throttle">Gas<input type="range" min="0" max="100" value="60" data-throttle aria-label="Palanca de gas"></label>` +
  `<button type="button" class="mw-btn" data-apart>Despiece</button>` +
  `<button type="button" class="mw-btn" data-assemble>Montaje</button>` +
  `<span class="mw-hint" data-hint>Pasa el cursor por una pieza</span><span class="mw-live" aria-live="polite" data-live></span></div>`;
const stage = `<div class="mw-stage" tabindex="0" role="group" aria-label="Wren MW54. Pasa el cursor o usa las flechas para recorrer las piezas; D despiece, M montaje, A arrancar.">${backSvg}${frontSvg}<canvas class="mw-air" aria-hidden="true"></canvas></div>`;
const caption =
  `La MW54 de Wren (Ø${SPEC.diameter} mm, carcasa de ${SPEC.caseLength} mm, compresor de ${SPEC.compressor} mm) gira a ${fmt(SPEC.rpmMax)} rpm y empuja unos ${SPEC.thrustMax} N con ${SPEC.egtMax} °C en el escape. ` +
  `El aire entra por la toma, el compresor radial lo lleva a unas ${MAX.pr.toFixed(1)} atmósferas (${Math.round(MAX.t2)} °C) a ${Math.round(MAX.tip)} m/s en la punta de los álabes, el difusor lo frena y lo reparte, ` +
  `la cámara anular lo quema con queroseno a unos ${Math.round(MAX.primary)} °C y la turbina, a unos ${Math.round(MAX.tit)} °C, toma la energía para mover el compresor por el mismo eje; lo que sobra sale por la tobera. ` +
  `Por eso el aluminio sólo vive delante, donde el aire está frío, y detrás manda el Inconel. Datos del motor: GTBA; relación de presiones, caudal y temperaturas internas son valores típicos aproximados de esta clase de motor.`;
const body =
  `<figure class="iso-figure mw"><div class="iso-plate">${corners}${stage}${controls}</div>` +
  `<figcaption class="iso-legend"><span class="iso-caption">${caption}</span></figcaption></figure>` +
  `<section class="mw-materials"><h2>Análisis de materiales</h2><p class="mw-note">Temperatura de metal de cada pieza en el punto de funcionamiento actual, frente a su temperatura de servicio (marca) y a su solidus (fin de la barra).</p>${TABLE}</section>`;

const CSS = readFileSync(join(HERE, "mw54.css"), "utf8");
const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const page = k.pageHtml({ title: "Wren MW54 · anatomía", theme: THEME, body: `<style>${CSS}</style>${body}`, script: glScript() + MODEL + LIVE, width: 1120 }).replace('<html lang="en">', '<html lang="es">');
mkdirSync(OUT, { recursive: true });
const name = THEME === "light" ? "light.html" : "index.html";
writeFileSync(join(OUT, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${items.length} items`);

A.auditOrExit(R, P, { allow: [["casing.body", "diffuser*"], ["casing.body", "tunnel*"], ["casing.body", "combustor*"], ["casing.body", "ngv*"], ["casing.body", "turbine*"], ["casing.body", "wheel*"], ["casing.body", "nut*"], ["bellmouth.body", "wheel*"], ["bellmouth.body", "nut*"], ["bellmouth.body", "diffuser*"], ["bellmouth.body", "tunnel*"]] });
