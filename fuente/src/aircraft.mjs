// Fig 2: dos MW54 instaladas en un bimotor de aeromodelismo, a escala real (1 unidad = 1 mm). El fuselaje y la
// góndola derecha llevan una ventana de corte (como una ilustración técnica en corte) para ver la bahía de equipos
// y el motor en su montura; la góndola izquierda va cerrada, con el motor visto sólo por su toma.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import { kitOf } from "./parts.mjs";
import { engine, R_CASE } from "./engine.mjs";
import { S } from "./model.mjs";
import { PLANE, SYSTEMS } from "./aircraft-model.mjs";
import { settleOrder, mw54Impossible } from "./order.mjs";

const DEG = Math.PI / 180;
export const W2 = 1280;
export const H2 = 780;
const AZIMUTH = 36;
const ELEVATION = 26;
const GROUND = -300;

export function buildFig2({ cache, reuse }) {
  // ── la célula en números ──
  const NOSE = 300;
  const BAY = [420, 1160];
  const TAIL0 = 1200;
  const LEN = PLANE.length;
  const RF = PLANE.fuselageR;
  const RT = 20;
  const F = G.frameOf([900, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const xOf = (s) => 900 - s;
  const fusR = (s) => (s < NOSE ? RF * Math.sqrt(Math.max(0, 1 - (1 - s / NOSE) ** 2)) : s < TAIL0 ? RF : RF - ((RF - RT) * (s - TAIL0)) / (LEN - TAIL0));
  const fusSlope = (s) => (s < NOSE ? (RF * (1 - s / NOSE)) / (NOSE * Math.sqrt(Math.max(1e-6, 1 - (1 - s / NOSE) ** 2))) : 0);
  const WING = { z0: -44, z1: -18, rootLE: 250, rootTE: -250, tipY: PLANE.span / 2, sweepLE: 0.14, sweepTE: 0.08 };
  const le = (y) => WING.rootLE - WING.sweepLE * (Math.abs(y) - 90);
  const te = (y) => WING.rootTE + WING.sweepTE * (Math.abs(y) - 90);
  const NY = PLANE.nacelleY;
  const NR = 58;
  const NZ = WING.z0 - 20 - NR;
  const NX = 180;
  const NLEN = 215;
  const ENGINE_AT = 25;

  const P = k.fitProjection(
    [
      [900, 0, 0], [xOf(LEN), 0, 0], [xOf(LEN) + 60, 0, 330],
      [le(WING.tipY), WING.tipY, WING.z1], [te(WING.tipY), WING.tipY, WING.z0], [le(WING.tipY), -WING.tipY, WING.z1], [te(WING.tipY), -WING.tipY, WING.z0],
      [700, 0, GROUND], [-60, 250, GROUND], [-60, -250, GROUND], [NX, NY, NZ - NR], [NX, -NY, NZ - NR],
      [1000, 1060, GROUND - 8], [-1000, -1060, GROUND - 8], [1000, -1060, GROUND - 8], [-1000, 1060, GROUND - 8],
    ],
    W2,
    H2,
    { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
  );
  const V = G.viewOf(P);
  const R = A.recorder(P, {});
  const engineOf = (piece) => (/^[LR]\./.test(piece) ? piece[0] : undefined);
  const K = kitOf(P, R, { moveOf: () => [0, 0, 0], housed: (piece) => /^[LR]\.(nut|wheel|diffuser|tunnel|combustor|ngv|turbine)$/.test(piece), engineOf });
  const { at, Sv, Ln, Dots, Faded, put, boxAt, tubeItems, cable, record, nameFor } = K;
  const back = [];

  // ── suelo del taller ──
  const FLOOR = { x: -1000, y: -1060, w: 2000, d: 2120, r: 18 };
  back.push(Sv(k.slabOf(FLOOR, GROUND - 8, 8, P, 8, 1.2), { tone: "lo" }));
  record(A.slab(FLOOR, GROUND - 8, 8, { name: "stand.floor" }));
  for (let x = FLOOR.x + 100; x < FLOOR.x + FLOOR.w - 50; x += 200) back.push(Ln(k.lineOnTop([x, FLOOR.y], [x, FLOOR.y + FLOOR.d], GROUND, P), { tone: "faint" }));
  for (let y = FLOOR.y + 120; y < FLOOR.y + FLOOR.d - 50; y += 200) back.push(Ln(k.lineOnTop([FLOOR.x, y], [FLOOR.x + FLOOR.w, y], GROUND, P), { tone: "faint" }));
  back.push(`<path class="iso-halo" d="${k.haloOf({ x: -700, y: -950, w: 1500, d: 1900, r: 400 }, GROUND, 1, P)}"/>`);

  // ── ventana de corte: el contorno de la piel quitada por encima de una altura, entre dos estaciones ──
  function windowOf(Fr, s0, s1, radius, cut) {
    const th1 = (s) => Math.asin(Math.min(0.99, cut / radius(s)));
    const pts = [];
    for (let i = 0; i <= 40; i++) { const s = s0 + ((s1 - s0) * i) / 40; pts.push(G.pointOf(Fr, s, radius(s), th1(s))); }
    for (let i = 0; i <= 24; i++) { const t = th1(s1) + ((Math.PI - 2 * th1(s1)) * i) / 24; pts.push(G.pointOf(Fr, s1, radius(s1), t)); }
    for (let i = 40; i >= 0; i--) { const s = s0 + ((s1 - s0) * i) / 40; pts.push(G.pointOf(Fr, s, radius(s), Math.PI - th1(s))); }
    for (let i = 24; i >= 0; i--) { const t = th1(s0) + ((Math.PI - 2 * th1(s0)) * i) / 24; pts.push(G.pointOf(Fr, s0, radius(s0), t)); }
    const screen = pts.map(at);
    return { d: `M${screen.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`, rim: [pts.slice(0, 41), pts.slice(41, 66), pts.slice(66, 107), pts.slice(107)] };
  }
  const FULL = `M-20 -20H${W2 + 20}V${H2 + 20}H-20Z`;
  const defs = [];
  const clipHole = (id, d) => (defs.push(`<clipPath id="${id}"><path clip-rule="evenodd" d="${FULL}${d}"/></clipPath>`), `url(#${id})`);
  const clipIn = (id, ...ds) => (defs.push(`<clipPath id="${id}">${ds.map((d) => `<path d="${d}"/>`).join("")}</clipPath>`), `url(#${id})`);
  const cutEdge = (rim) => Ln(rim.map((list) => `M${list.map(at).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`).join(""), { tone: "hi", className: "mw-cut" });

  // ── fuselaje: morro ojival, bahía hueca con su ventana, cono de cola recto ──
  const FUS = G.bandsOf([[0.6, fusR(0.6)], [BAY[0], RF]], [120, 220, NOSE], F, P, { radius: fusR, slope: fusSlope, steps: 96, rows: 6 });
  FUS.bands.forEach((band, index) => put("airframe", G.pointOf(F, (band.s0 + band.s1) / 2, 0, 0), Sv(index === FUS.bands.length - 1 ? { ...band.paths, outline: band.outline } : band.paths, { tone: "hi", inner: index === 2 ? Ln(band.seam, { tone: "faint" }) : "" }), { name: `airframe.nose${index}`, shapes: [record(A.solid(F, band.profile, { radius: fusR, name: `airframe.nose${index}` }))] }));
  const NOSE_SIDES = FUS.sidesOf(0.6, BAY[0], { ends: false, count: 72 });
  put("airframe", G.pointOf(F, BAY[0] - 10, 0, 0), Ln(NOSE_SIDES.d, { tone: "hi" }), { bias: 0.2, name: "airframe.nose-sides", shapes: NOSE_SIDES.points.map((points) => A.tube(points, 0.4 / G.scaleOf(P))) });
  const BAY_WIN = windowOf(F, BAY[0], BAY[1], () => RF, 12);
  const BAY_SHELL = [[BAY[0], RF - 2], [BAY[0], RF], [BAY[1], RF], [BAY[1], RF - 2]];
  const bayShape = record(A.lathe(F, BAY_SHELL, { name: "airframe.bay" }));
  put("airframe", G.pointOf(F, (BAY[0] + BAY[1]) / 2, 0, 0),
    `<g clip-path="${clipHole("fus-cut", BAY_WIN.d)}">${Sv(G.lathe(BAY_SHELL, F, P, {}), { tone: "hi", inner: Ln([620, 900].map((s) => G.arcOf(F, s, RF, P)).join(""), { tone: "faint" }) })}</g>` +
    // la bahía por dentro: fondo oscuro, la cuaderna trasera y la bandeja de equipos
    `<path class="mw-void" d="${BAY_WIN.d}"/>` +
    `<g clip-path="${clipIn("bay-in", BAY_WIN.d)}">${Sv(G.disc(BAY[1] - 3, BAY[1], RF - 2, F, P), { tone: "mid" })}</g>` +
    cutEdge(BAY_WIN.rim),
    { name: "airframe.bay", shapes: [bayShape] });
  turned("airframe", [[BAY[1], RF], [TAIL0, RF]], "airframe.aft");
  turned("airframe", [[TAIL0, RF], [LEN, RT]], "airframe.tailcone", Ln(G.circleOf(F, LEN, RT, P), { tone: "lo" }));
  function turned(piece, profile, name, extra = "") {
    const shape = record(A.solid(F, profile, { name }));
    put(piece, G.pointOf(F, (profile[0][0] + profile[profile.length - 1][0]) / 2, 0, 0), Sv(G.solidOf(profile, F, P), { tone: "hi" }) + extra, { name, shapes: [shape] });
    return shape;
  }
  // Cabina: una burbuja sobre el morro, asentada en la piel.
  {
    const FC = G.frameOf([xOf(150), 0, 62], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const bubble = (s) => 34 * Math.sin(Math.PI * Math.min(1, Math.max(0, s / 240))) ** 0.6;
    const CAN = Array.from({ length: 25 }, (_, i) => { const s = (240 * i) / 24; return [s, Math.max(0.01, bubble(s)), i && i < 24 ? 1 : 0]; });
    const host = R.solids.filter((shape) => /airframe\.nose/.test(shape.meta?.name ?? shape.name ?? ""));
    put("airframe", G.pointOf(FC, 120, 0, 0), Sv(G.lathe(CAN, FC, P, {}), { tone: "hi", className: "mw-canopy" }), { name: "airframe.canopy", shapes: [record(A.lathe(FC, CAN, { name: "airframe.canopy", seated: true, cut: host }))] });
  }

  // ── alas: paneles cortados en el pilón de cada góndola, con sus bisagras de flap y alerón ──
  const wingPanels = [];
  for (const side of [1, -1]) {
    const cuts = [90.3, NY - 34, NY + 34, WING.tipY];
    for (let i = 0; i < cuts.length - 1; i++) {
      const [ya, yb] = [cuts[i], cuts[i + 1]];
      const ring = [[le(ya), side * ya], [le(yb), side * yb], [te(yb), side * yb], [te(ya), side * ya]];
      const id = nameFor("airframe.wing");
      const hinge = i === 2 ? [[te(ya) + 70, side * ya], [te(yb) + 52, side * yb]] : [[te(ya) + 62, side * ya], [te(yb) + 60, side * yb]];
      const extra = Ln(k.onTop(hinge, WING.z1, P), { tone: "lo" }) + (i === 2 ? Ln(k.onTop([[te(ya + 300) + 58, side * (ya + 300)], [te(ya + 300), side * (ya + 300)]], WING.z1, P), { tone: "faint" }) : "");
      put("airframe", [(le(ya) + te(yb)) / 2, (side * (ya + yb)) / 2, (WING.z0 + WING.z1) / 2], Sv(k.extrude(ring, WING.z0, WING.z1 - WING.z0, P, { bevel: 0.8 }), { tone: "hi" }) + extra, { name: id, shapes: [record(A.extruded(ring, WING.z0, WING.z1 - WING.z0, { name: id }))] });
      wingPanels.push(id);
    }
  }
  // ── cola en T: deriva sobre el cono de cola y estabilizador encima ──
  {
    const xa = xOf(1420);
    const xb = xOf(1760);
    const za = fusR(1420);
    const zb = fusR(1760);
    const SF = { o: [0, 0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
    const FIN = [[xa, za], [xb, zb], [xb - 30, 300], [xa - 150, 300]];
    put("airframe", [(xa + xb) / 2, 0, 160], Sv(G.prismOf(SF, FIN, -3.5, 3.5, P), { tone: "hi", inner: Ln(k.segment([xb - 18, 0, zb + 10], [xb - 24, 0, 290], P), { tone: "faint" }) }), { name: "airframe.fin", shapes: [record(A.prism(SF, FIN, -3.5, 3.5, { name: "airframe.fin" }))] });
    const STAB = [[xa - 150, -330], [xa - 150 + 20, 330], [xb - 70, 330], [xb - 30, -330]];
    const stabRing = [[xa - 140, -320], [xa - 140, 320], [xb - 40, 320], [xb - 30, -320]];
    put("airframe", [(xa + xb) / 2 - 80, 0, 304], Sv(k.extrude(stabRing, 300, 8, P, { bevel: 0.6 }), { tone: "hi" }) + Ln(k.onTop([[xb - 10, -300], [xb - 10, 300]].map(([x, y]) => [x + 2, y]), 308, P), { tone: "lo" }), { name: "airframe.stab", shapes: [record(A.extruded(stabRing, 300, 8, { name: "airframe.stab" }))] });
    void STAB;
  }

  // ── góndolas y pilones ──
  const N_MER = [[0, 51], [1.5, 54, 1], [5, 56.5, 1], [12, NR], [160, NR], [NLEN, 50], [NLEN, 48], [160, 55], [12, 55], [5, 53, 1], [1.5, 51.5, 1]];
  const nacR = (s) => (s < 12 ? 56 : s < 160 ? NR : NR - ((NR - 50) * (s - 160)) / (NLEN - 160));
  const engines = {};
  for (const [side, tag] of [[1, "R"], [-1, "L"]]) {
    const NF = G.frameOf([NX, side * NY, NZ], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const opening = G.circleOf(NF, 0.6, 51.2, P);
    const win = side > 0 ? windowOf(NF, 40, 190, nacR, 10) : null;
    const shell = record(A.lathe(NF, N_MER, { name: `nacelles.${tag}` }));
    const body = Sv(G.lathe(N_MER, NF, P, {}), { tone: "hi", inner: Ln(G.arcOf(NF, 160, NR, P), { tone: "faint" }) });
    put("nacelles", G.pointOf(NF, NLEN / 2, 0, 0),
      (win ? `<g clip-path="${clipHole(`nac-${tag}`, win.d)}">${body}</g><path class="mw-void" d="${win.d}"/>` : body) +
      `<path class="mw-void" d="${opening}"/>`,
      { name: `nacelles.${tag}`, shapes: [shell] });
    if (win) put("nacelles", G.pointOf(NF, 115, 0, 0), cutEdge(win.rim), { bias: 400, name: `nacelles.${tag}-cut`, shapes: [A.ball(G.pointOf(NF, 115, NR, Math.PI / 2), 0.5)] });
    // pilón al ala
    const pylon = { x: NX - 170, y: side * NY - 4, w: 150, d: 8, r: 1 };
    boxAt("nacelles", pylon, NZ + NR, WING.z0 - NZ - NR, { tone: "mid" }, { name: `nacelles.pylon-${tag}`, bevel: 0.3 });
    // el motor: dibujado entero, visible por la toma y (en la góndola derecha) por la ventana
    const EF = G.frameOf([NX - ENGINE_AT, side * NY, NZ], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const before = R.items.length;
    const M = engine(K, P, EF, { pc: (id) => `${tag}.${id}`, tag: `fig2${tag}` });
    // montura de dos piezas: dos abrazaderas en la carcasa y su soporte a la góndola, bajo el pilón
    for (const s of [52, 96]) {
      const id = nameFor(`${tag}.mount`);
      put(`${tag}.mount`, G.pointOf(EF, s, 0, 0), Sv(G.ringBand(s - 4, s + 4, R_CASE, R_CASE + 2.2, EF, P), { tone: "mid" }) + Dots(G.dotsOf(EF, s - 4, R_CASE + 1.1, 2, P, { phase: 0.1 }), { size: 0.5 }), { name: id, shapes: [record(A.ring(EF, s - 4, s + 4, R_CASE, R_CASE + 2.2, { name: id }))] });
      const foot = { x: NX - ENGINE_AT - s - 5, y: side * NY - 6, w: 10, d: 12, r: 1 };
      boxAt(`${tag}.mount`, foot, NZ + R_CASE + 2.2, 55 - R_CASE - 2.2 - 0.05, { tone: "mid" }, { name: `${tag}.mount-foot`, bevel: 0.2 });
    }
    // líneas desde el pilón hasta los adaptadores, y los cables de bujía y sonda
    const roofZ = NZ + 54.9;
    for (const [key, r] of [["fuel", 1.0], ["gas", 0.8], ["lube", 0.8]]) {
      const a = M.adaptors[key];
      const near = G.add3(a.at, G.mul3(a.out, 4));
      tubeItems(`${tag}.fuel`, G.fillet([[near[0], near[1], roofZ], near, a.at], 4, 10, { P, tube: r }), r, { name: `${tag}.fuel-${key}`, tone: "hi", maxLength: 12, spacing: 1 });
    }
    {
      const g = M.glow148;
      cable(`${tag}.ecu`, [[g[0], g[1], roofZ], G.add3(g, [0, 0, 6]), g], { r: 0.6, bend: 3, name: `${tag}.ecu-glow`, shells: [false, true] });
      const tc = M.tc;
      cable(`${tag}.ecu`, [[tc.at[0], tc.at[1], roofZ], G.add3(tc.at, G.mul3(tc.out, 4)), tc.at], { r: 0.6, bend: 3, name: `${tag}.ecu-tc`, shells: [false, true] });
    }
    // todo lo de este motor se ve sólo por la toma y por la ventana
    const clip = win ? clipIn(`eng-${tag}`, opening, win.d) : clipIn(`eng-${tag}`, opening);
    for (const item of R.items.slice(before)) item.svg = `<g clip-path="${clip}">${item.svg}</g>`;
    engines[tag] = { NF, EF, M };
  }

  // ── bahía de equipos: todo sobre la bandeja, recortado a la ventana ──
  const bayStart = R.items.length;
  const TRAY_Z = -38;
  const TRAY = { x: xOf(BAY[1]) + 6, y: -79.5, w: BAY[1] - BAY[0] - 12, d: 159, r: 2 };
  boxAt("airframe", TRAY, TRAY_Z - 4, 4, { tone: "mid" }, { name: "airframe.tray", bevel: 0.3 });
  const horiz = (piece, name, x0, x1, y, r, z = TRAY_Z + r, extra = () => "") => {
    const Fh = G.frameAlong([x1, y, z], [-1, 0, 0]);
    const len = x1 - x0;
    put(piece, [(x0 + x1) / 2, y, z], Sv(G.disc(0, len, r, Fh, P, { bevel: 0.4 }), { tone: "hi" }) + extra(Fh, len), { name, shapes: [record(A.disc(Fh, 0, len, r, { name }))] });
    return Fh;
  };
  // depósito principal y hopper
  const TANK = { x: 200, y: -58, w: 195, d: 116, r: 10 };
  boxAt("fuel", TANK, TRAY_Z, 100, { tone: "hi", inner: Ln(k.sideSeam(TANK, TRAY_Z + 60, P, 6), { tone: "faint" }) }, { name: "fuel.tank", bevel: 1, steps: 6, extra: Sv(k.cylinder(TANK.x + 150, 0, 9, TRAY_Z + 100, 6, P, 24), { tone: "mid" }) + Ln(k.ring(TANK.x + 150, 0, 5, TRAY_Z + 106, P, 16), { tone: "faint" }) });
  const HOP = horiz("fuel", "fuel.hopper", 120, 188, 0, 26, TRAY_Z + 26, (Fh, len) => Ln(G.circleOf(Fh, 0, 18, P), { tone: "faint" }) + Ln([10, len - 10].map((s) => G.arcOf(Fh, s, 26, P)).join(""), { tone: "faint" }));
  // bombas, electroválvulas, ECU, botella de gas
  const pumps = [1, -1].map((side) => horiz("pumps", nameFor("pumps.pump"), 60, 105, side * 38, 11, TRAY_Z + 11, (Fh, len) => Faded(G.ribsOf(Fh, 6, len - 14, 11, 16, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" })));
  const valves = [1, -1].map((side) => {
    const plan = { x: 20, y: side > 0 ? 60 : -76, w: 24, d: 16, r: 1.5 };
    boxAt("pumps", plan, TRAY_Z, 14, { tone: "mid" }, { name: nameFor("pumps.fuel-valve"), extra: Dots([at([plan.x + 6, plan.y + 8, TRAY_Z + 14]), at([plan.x + 18, plan.y + 8, TRAY_Z + 14])], { size: 0.5 }) });
    return plan;
  });
  const gasValves = [1, -1].map((side) => {
    const plan = { x: -120, y: side > 0 ? 40 : -54, w: 20, d: 14, r: 1.5 };
    boxAt("gas", plan, TRAY_Z, 12, { tone: "mid" }, { name: nameFor("gas.valve"), extra: Dots([at([plan.x + 10, plan.y + 7, TRAY_Z + 12])], { size: 0.5 }) });
    return plan;
  });
  for (const side of [1, -1]) {
    const plan = { x: -60, y: side > 0 ? 6 : -56, w: 70, d: 50, r: 2 };
    boxAt("ecu", plan, TRAY_Z, 12, { tone: "mid" }, { name: nameFor("ecu.box"), bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan(plan, 3), TRAY_Z + 12, P, 3), { tone: "faint" }) + Ln([0, 1].map((row) => k.onTop([[plan.x + 8, plan.y + 14 + row * 5], [plan.x + 40 - row * 12, plan.y + 14 + row * 5]], TRAY_Z + 12, P)).join(""), { tone: "lo", free: true }) });
  }
  const GAS = horiz("gas", "gas.bottle", -240, -140, 0, 24, TRAY_Z + 24, (Fh, len) => Ln(G.arcOf(Fh, len - 16, 24, P), { tone: "faint" }));
  // radio: receptor y dos baterías
  boxAt("radio", { x: 440, y: -14, w: 28, d: 28, r: 2 }, TRAY_Z, 14, { tone: "mid" }, { name: "radio.rx", extra: Dots([at([450, 0, TRAY_Z + 14]), at([458, 0, TRAY_Z + 14])], { size: 0.5, tone: "hi" }) });
  for (const side of [1, -1]) boxAt("radio", { x: 410, y: side > 0 ? 22 : -50, w: 60, d: 28, r: 3 }, TRAY_Z, 20, { tone: "hi" }, { name: nameFor("radio.battery"), bevel: 0.5 });
  // líneas de la bahía: depósito → hopper → bombas → electroválvulas; botella → electroválvulas de gas
  tubeItems("fuel", G.fillet([[TANK.x + 6, 0, TRAY_Z + 8], [188 + 18, 0, TRAY_Z + 8], [188 + 18, 0, TRAY_Z + 26], [188, 0, TRAY_Z + 26]], 6, 10, { P, tube: 1.6 }), 1.6, { name: "fuel.tygon", tone: "hi", maxLength: 14 });
  pumps.forEach((Fh, i) => {
    const side = i ? -1 : 1;
    tubeItems("fuel", G.fillet([[120, side * 10, TRAY_Z + 18], [112, side * 10, TRAY_Z + 18], [112, side * 38, TRAY_Z + 18], [105, side * 38, TRAY_Z + 11]], 4, 10, { P, tube: 1.4 }), 1.4, { name: nameFor("fuel.feed"), tone: "hi", maxLength: 14 });
    const v = valves[i];
    tubeItems("pumps", G.fillet([[60, side * 38, TRAY_Z + 11], [52, side * 38, TRAY_Z + 11], [52, v.y + 8, TRAY_Z + 7], [v.x + v.w, v.y + 8, TRAY_Z + 7]], 4, 10, { P, tube: 1.1 }), 1.1, { name: nameFor("pumps.festo"), tone: "hi", maxLength: 14 });
    const g = gasValves[i];
    tubeItems("gas", G.fillet([[-140, side * 8, TRAY_Z + 24], [-132, side * 8, TRAY_Z + 24], [-132, g.y + 7, TRAY_Z + 6], [g.x, g.y + 7, TRAY_Z + 6]], 4, 10, { P, tube: 0.9 }), 0.9, { name: nameFor("gas.line"), tone: "hi", maxLength: 14 });
  });
  void HOP; void GAS;
  const bayClip = clipIn("bay-eq", BAY_WIN.d);
  for (const item of R.items.slice(bayStart)) item.svg = `<g clip-path="${bayClip}">${item.svg}</g>`;

  // ── tren triciclo ──
  const leg = (name, top, axle, wheelR, width) => {
    const Fl = G.frameAlong(axle, G.unit3(G.sub3(top, axle)));
    const len = G.len3(G.sub3(top, axle));
    put("gear", G.lerp3(top, axle, 0.5), Sv(G.disc(wheelR * 0.3, len, 4.5, Fl, P), { tone: "mid", inner: Ln(G.arcOf(Fl, len * 0.6, 4.5, P), { tone: "faint" }) }), { name: `${name}.leg`, shapes: [record(A.disc(Fl, wheelR * 0.3, len, 4.5, { name: `${name}.leg` }))] });
    const Fw = G.frameAlong(G.add3(axle, [0, -width / 2, 0]), [0, 1, 0]);
    put("gear", axle, Sv(G.disc(0, width, wheelR, Fw, P, { bevel: 0.6 }), { tone: "hi" }) + Ln(G.circleOf(Fw, width, wheelR * 0.45, P) + G.circleOf(Fw, width, wheelR * 0.16, P), { tone: "lo" }), { name: `${name}.wheel`, shapes: [record(A.disc(Fw, 0, width, wheelR, { name: `${name}.wheel` }))] });
  };
  leg("gear.nose", [640, 0, -fusR(260) + 0.5], [640, 0, GROUND + 38], 38, 16);
  for (const side of [1, -1]) leg(`gear.main${side > 0 ? "R" : "L"}`, [-40, side * 210, WING.z0 + 0.5], [-40, side * 210, GROUND + 42], 42, 20);

  // ── orden ──
  settleOrder(R, P, { cache, reuse, impossible: twinImpossible });
  R.items.sort((a, b) => a.key - b.key);
  const groups = R.items.map((item) => `<g class="it" data-piece="${item.piece}" data-sys="${systemOf(item.piece)}">${item.svg}</g>`);
  const label = "Dos microturbinas MW54 instaladas en un bimotor de aeromodelismo de 1,9 m: góndolas abiertas bajo el ala con su pilón, motor en montura de dos piezas, y una bahía de equipos en corte con depósito principal, hopper, dos bombas, electroválvulas de combustible y gas, dos ECU, botella de gas, receptor y baterías; tren triciclo.";
  const backSvg = k.figureSvg({ width: W2, height: H2, label, body: back, className: "mw-back" });
  const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg mw-front" viewBox="0 0 ${W2} ${H2}" aria-hidden="true"><defs>${defs.join("")}</defs><g class="mw-engine">${groups.join("")}</g></svg>`;
  return { R, P, backSvg, frontSvg, engines };

  // Reglas de orden propias del avión: el corte se dibuja encima de lo que tapa (es una ventana), y cada motor
  // queda dentro de su góndola.
  function twinImpossible(a, b, state) {
    const base = mw54Impossible({ S, pieceOf: (id) => id.replace(/^[LR]\./, "") })(a, b, state);
    const isEngine = (item) => /^[LR]\./.test(item.piece);
    const isNacelle = (item) => /^nacelles\.[LR]$/.test(item.name);
    const inBay = (item) => ["fuel", "pumps", "gas", "ecu", "radio"].includes(item.piece) || item.name === "airframe.tray";
    const isBay = (item) => item.name === "airframe.bay";
    const drop = [base[0], base[1]];
    // dentro de la góndola, el motor va detrás de su piel salvo en la ventana, que ya lo recorta
    if (isNacelle(a) && isEngine(b) && a.name.endsWith(b.engine)) drop[0] = true;
    if (isNacelle(b) && isEngine(a) && b.name.endsWith(a.engine)) drop[1] = true;
    if (isBay(a) && inBay(b)) drop[0] = true;
    if (isBay(b) && inBay(a)) drop[1] = true;
    return drop;
  }
}

export function systemOf(piece) {
  if (/^[LR]\.mount/.test(piece)) return "mounts";
  if (/^[LR]\.fuel/.test(piece)) return "fuel";
  if (/^[LR]\.ecu/.test(piece)) return "ecu";
  if (/^[LR]\./.test(piece)) return "engines";
  return SYSTEMS[piece] ? piece : piece === "stand" ? "" : "airframe";
}
