// La MW54 según los planos de Wren: cada pieza en su estación real, con sus cantidades (álabes, tornillos,
// agujeros de la cámara). Se dibuja en cualquier marco F (origen en la punta de la tuerca, F.a hacia el escape,
// ángulo 90° = arriba), así el banco la monta una vez y el avión dos.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import { polyD } from "./parts.mjs";
import { S, COUNTS } from "./model.mjs";

const DEG = Math.PI / 180;
export const R_CASE = 44.4;
export const CASE_IN = 44;
export const R_FLANGE = 47.5;

export function engine(K, P, F, { pc = (id) => id, tag = "e", thru = true } = {}) {
  const { V, Sv, Ln, Dots, Faded, put, turned, shell, flange, boss, holeOn, faceMatrix, record, nameFor, at } = K;
  const pt = (s, r, deg) => G.pointOf(F, s, r, deg * DEG);
  const radial = (deg) => G.radialOf(F, deg * DEG);
  const facing = (deg) => G.dot3(radial(deg), V);
  const front = G.mul3(F.a, -1);
  const shot = {};

  // ── tuerca del compresor: una bala de aluminio con el separador delantero ──
  const nutR = (s) => 0.6 + 7.4 * Math.sin(Math.min(1, s / 11) * (Math.PI / 2));
  const nutSlope = (s) => (s >= 11 ? 0 : 7.4 * (Math.PI / 22) * Math.cos((s / 11) * (Math.PI / 2)));
  const NUT = [...Array.from({ length: 14 }, (_, i) => { const s = (11 * i) / 13; return [s, nutR(s), i && i < 13 ? 1 : 0]; }), [S.nut[1], 8]];
  turned(pc("nut"), F, NUT, { tone: "mid" }, { slope: nutSlope, name: `${pc("nut")}.body`, extra: Faded(G.ribsOf(F, 12, S.nut[1], 8, 6, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });

  // ── rueda del compresor: Garrett 446335 rebajada, Ø54 de salida y Ø38,2 de entrada, 6 + 6 álabes ──
  const [W0, W1] = S.wheel;
  const HUB_L = 19.6;
  const hub = (s) => 4.5 + 22.5 * Math.min(1, Math.max(0, (s - W0) / HUB_L)) ** 2.1;
  const hubSlope = (s) => { const x = (s - W0) / HUB_L; return x <= 0 || x >= 1 ? 0 : ((22.5 * 2.1) / HUB_L) * x ** 1.1; };
  const HUB = [...Array.from({ length: 22 }, (_, i) => { const s = W0 + (HUB_L * i) / 21; return [s, hub(s), i && i < 21 ? 1 : 0]; }), [W1, 27]];
  const tipR = (s) => 19.1 + (7.9 * (s - W0)) / HUB_L;
  const blades = COUNTS.compressorBlades[0] + COUNTS.compressorBlades[1];
  const bladeAngle = (i, s) => (i / blades) * Math.PI * 2 + 0.75 * (1 - (s - W0) / HUB_L) ** 2;
  const bladeLines = [];
  for (let i = 0; i < blades; i++) {
    const sLE = i % 2 === 0 ? W0 : W0 + 6;
    const pts = [G.pointOf(F, sLE, hub(sLE) + 0.2, bladeAngle(i, sLE))];
    for (let j = 0; j <= 12; j++) {
      const s = sLE + ((W0 + HUB_L - sLE) * j) / 12;
      pts.push(G.pointOf(F, s, tipR(s), bladeAngle(i, s)));
    }
    const mid = (W0 + HUB_L + sLE) / 2;
    bladeLines.push({ d: polyD(pts.map(at)), alpha: G.fadeOf(G.dot3(G.radialOf(F, bladeAngle(i, mid)), V) + 0.25, [0.05, 0.5]) });
  }
  {
    const id = `${pc("wheel")}.body`;
    const paths = G.solidOf(HUB, F, P, { smooth: { slope: hubSlope, rows: 4 } });
    const env = record(A.solid(F, [[W0, 19.1], [W0 + HUB_L, 27], [W1, 27]], { name: `${pc("wheel")}.blades`, owner: id }));
    const body = record(A.solid(F, HUB, { name: id, owner: id }));
    put(pc("wheel"), G.pointOf(F, 27, 0, 0), Sv(paths, { tone: "hi", inner: Ln(G.arcOf(F, W0 + HUB_L, 27, P), { tone: "faint" }) }) + Faded(bladeLines, { tone: "hi" }), { name: id, shapes: [body, env] });
  }

  // ── toma de aire de nailon, atornillada a la tapa delantera ──
  const INTAKE = [[19, 21], [S.throat, 19.7, 1], [12, 20.6, 1], [9, 22.6, 1], [7, 25.5, 1], [6.2, 28.5, 1], [6.6, 31, 1], [8, 32.5], [19, 33]];
  let THRU = "";
  if (thru) {
    const pts = [];
    for (let i = 0; i < blades; i++) {
      const main = i % 2 === 0;
      const line = [];
      for (let j = 0; j <= 10; j++) {
        const r = (main ? 5 : 10) + ((19 - (main ? 5 : 10)) * j) / 10;
        const th = (i / blades) * Math.PI * 2 + 0.6 * ((r - 5) / 14) ** 1.5;
        line.push([r * Math.cos(th), r * Math.sin(th)]);
      }
      pts.push(`<path class="mw-blade${main ? "" : " mw-split"}" d="${polyD(line)}"/>`);
    }
    THRU =
      `<clipPath id="${tag}-throat"><path d="${G.circleOf(F, S.throat, 19.6, P)}"/></clipPath>` +
      `<g class="mw-thru" data-thru="${tag}" clip-path="url(#${tag}-throat)"><g transform="${faceMatrix(F, S.throat + 2)}">` +
      `<circle class="mw-void" r="20"/><circle class="mw-blur" r="13"/><g data-spin>` +
      `<circle class="mw-hub" r="5.2"/>${pts.join("")}</g>` +
      `</g><g transform="${faceMatrix(F, S.nut[1] - 1)}"><circle class="mw-nut" r="8"/><circle class="mw-nut-ring" r="3.4"/></g></g>`;
  }
  shell(pc("bellmouth"), F, INTAKE, {}, {
    name: `${pc("bellmouth")}.body`,
    extra: `<path class="mw-void" d="${G.circleOf(F, 6.9, 27.6, P)}"/>` + Ln(G.circleOf(F, S.throat, 19.6, P), { tone: "lo" }) + THRU,
  });
  flange(pc("bellmouth"), F, 19, S.intake[1], 22.9, 36, { name: `${pc("bellmouth")}.flange`, extra: Dots(G.dotsOf(F, 19, 34.2, 6, P, { all: true, phase: 0.26 }), { size: 0.6, tone: "mid" }) });

  // ── tapa delantera: envuelve la rueda (su boca es más estrecha que la rueda) y lleva 8 tornillos M2,5 × 8 ──
  const [H0, H1] = S.shroud;
  // La brida queda por delante de la carcasa y el cuerpo por dentro: dos piezas, cada una en su sitio del orden.
  shell(pc("shroud"), F, [[S.caseFront, 24.5], [S.caseFront, 43.8], [H1, 43.8], [H1, 28.5], [35.6, 27.6, 1], [32, 26.1, 1]], { tone: "mid" }, { name: `${pc("shroud")}.body` });
  shell(pc("shroud"), F, [[H0, 22.9], [H0, 49], [S.caseFront, 49], [S.caseFront, 24.5]], { tone: "mid" }, {
    name: `${pc("shroud")}.flange`,
    extra: Dots(G.dotsOf(F, H0, 46.4, COUNTS.shroudScrews, P, { all: true, phase: 0.2 }), { size: 0.75, tone: "hi" }) + Ln(G.circleOf(F, H0, 40, P), { tone: "faint" }),
  });

  // ── difusor de aluminio: 11 cuñas en la cara, 36 álabes en el aro, Ø88 ──
  const [D0, D1] = S.diffuser;
  {
    const wedges = [];
    for (let i = 0; i < COUNTS.diffuserWedges; i++) {
      const a = (i / COUNTS.diffuserWedges) * Math.PI * 2;
      const tri = [[23, a - 0.02], [35.5, a + 0.18], [33, a + 0.36]].map(([r, t]) => [r * Math.cos(t), r * Math.sin(t)]);
      wedges.push(`${polyD(tri)}Z`);
    }
    shell(pc("diffuser"), F, [[D0, 6], [D0, 36], [D0 + 4, 36], [D0 + 4, 38.5], [D0 + 11, 38.5], [D0 + 11, 43.6], [D1, 43.6], [D1, 6]], {}, {
      name: `${pc("diffuser")}.body`,
      extra:
        `<g transform="${faceMatrix(F, D0)}"><path class="mw-wedge" d="${wedges.join("")}"/></g>` +
        `<path class="mw-void" d="${G.circleOf(F, D0, 6, P)}"/>` +
        Ln(G.circleOf(F, D0, 13, P), { tone: "faint" }) +
        Dots(G.dotsOf(F, D0, 13, 6, P, { all: true }), { size: 0.55, tone: "mid" }) +
        Faded(G.ribsOf(F, D0 + 4, D0 + 11, 38.5, COUNTS.diffuserVanes, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
    });
  }

  // ── eje En24T dentro del túnel de aluminio, con dos rodamientos GRW 688 cerámicos ──
  const [T0, T1] = S.tunnel;
  const [A0, A1] = S.shaft;
  {
    const TUNNEL = [[T0, 4.05], [T0, 10], [T1, 10], [T1, 4.05]];
    const id = `${pc("tunnel")}.body`;
    const svg =
      Sv(G.disc(T1, A1, 4, F, P), { tone: "hi" }) +
      Sv(G.lathe([[T0, 4.05], [T0, 10], [T0 + 6, 10], [T0 + 6, 8.6], [T1 - 6, 8.6], [T1 - 6, 10], [T1, 10], [T1, 4.05]], F, P, {}), { tone: "mid" }) +
      Dots(G.dotsOf(F, T0, 6.1, 7, P, { all: true }), { size: 0.8, tone: "hi" }) +
      Ln(G.circleOf(F, T0, 8, P) + G.circleOf(F, T0, 4.6, P), { tone: "faint" }) +
      Sv(G.disc(A0, T0, 4, F, P), { tone: "hi" });
    put(pc("tunnel"), G.pointOf(F, (T0 + T1) / 2, 0, 0), svg, { name: id, shapes: [record(A.lathe(F, TUNNEL, { name: id, owner: id })), record(A.disc(F, A0, A1, 4, { name: `${pc("tunnel")}.shaft`, owner: id }))] });
  }

  // ── cámara anular de chapa: envolvente Ø76 × 46 con sus seis filas de agujeros, 6 inyectores, 2 bujías ──
  const [C0, C1] = S.combustor;
  const WRAP0 = C0 + 4;
  {
    const holes = [];
    for (const [d, count, dia] of COUNTS.holeRows) {
      for (let i = 0; i < count; i++) {
        const deg = (i / count) * 360 + (count === 12 ? 15 : count === 6 ? 30 : 7.5);
        const f = facing(deg);
        if (f < 0.12) continue;
        holes.push(`<path class="mw-hole" style="opacity:${G.fadeOf(f, [0.12, 0.45]).toFixed(2)}" d="${holeOn(F, WRAP0 + d, 38, deg * DEG, dia / 2)}"/>`);
      }
    }
    const COMB = shell(pc("combustor"), F, [[C0, 15], [C0, 38], [C1, 38], [C1, 15]], {}, {
      name: `${pc("combustor")}.body`,
      inner: G.arcOf(F, WRAP0, 38, P),
      extra:
        holes.join("") +
        `<path class="mw-void" d="${G.circleOf(F, C0, 15, P)}"/>` +
        Dots(G.dotsOf(F, C0, 27, COUNTS.swirlJets, P, { all: true, phase: 0.26 }), { size: 1, tone: "hi" }) +
        Ln(G.circleOf(F, C0, 27, P), { tone: "faint" }),
    });
    for (const deg of [32, 148]) boss(pc("combustor"), pt(WRAP0 + 22, 38, deg), radial(deg), 2.6, 2.2, { host: COMB, name: `${pc("combustor")}.glow-boss` });
  }

  // ── carcasa exterior: chapa de inox de 0,4 mm, Ø88 por dentro, 6 tornillos en cada extremo ──
  const CASING = shell(pc("casing"), F, [[S.caseFront, CASE_IN], [S.caseFront, R_CASE], [S.caseBack, R_CASE], [S.caseBack, CASE_IN]], {}, {
    name: `${pc("casing")}.body`,
    inner: G.arcOf(F, 73, R_CASE, P),
    extra:
      Dots([...G.dotsOf(F, S.caseFront + 1.5, R_CASE, COUNTS.caseScrews, P, { fade: FADE, phase: 0.3 }), ...G.dotsOf(F, S.caseBack - 1.5, R_CASE, COUNTS.caseScrews, P, { fade: FADE, phase: 0.3 })], { size: 0.7, tone: "mid" }) +
      `<path class="mw-void" d="${G.circleOf(F, S.caseFront, CASE_IN, P)}"/>`,
  });

  // ── estátor fundido de 13 álabes con la tapa trasera de acero dulce (8 tornillos M3 en Ø70) ──
  const [N0, N1] = S.ngv;
  shell(pc("ngv"), F, [[N0, 18.5], [N0, 29], [S.caseBack, 29], [S.caseBack, 18.5]], {}, {
    name: `${pc("ngv")}.body`,
    extra:
      `<path class="mw-void" fill-rule="evenodd" d="${G.circleOf(F, N0, 27.6, P)}${G.circleOf(F, N0, 19.6, P)}"/>` +
      `<path class="mw-vane" d="${G.spokesOf(F, N0, 19.6, 27.6, COUNTS.ngvVanes, P, { sweep: 0.5 })}"/>` +
      `<path class="mw-void" d="${G.circleOf(F, N0, 18.5, P)}"/>`,
  });
  flange(pc("ngv"), F, S.caseBack, N1, 18.5, R_FLANGE, { name: `${pc("ngv")}.case-rear`, tone: "mid", extra: Dots(G.dotsOf(F, S.caseBack, 35, COUNTS.ngvScrews, P, { all: true, phase: 0.2 }), { size: 0.7, tone: "hi" }) });

  // ── rueda de turbina de Inconel 713: Ø55 × 12, llanta de 6, con su tuerca ──
  const [U0, U1] = S.turbine;
  turned(pc("turbine"), F, [[U0, 4], [U0 + 2, 12], [U0 + 3, 27.5], [U1 - 3, 27.5], [U1 - 2, 12], [U1, 4]], { tone: "hi" }, {
    name: `${pc("turbine")}.wheel`,
    extra:
      Ln(G.circleOf(F, U0 + 3, 22, P), { tone: "lo" }) +
      Ln(G.spokesOf(F, U0 + 3, 22, 27.5, 27, P, { sweep: -0.3 }), { tone: "hi" }) +
      Faded(G.ribsOf(F, U0 + 3, U1 - 3, 27.5, 27, P, { twist: -0.5, fade: [0.1, 0.55] }), { tone: "lo" }),
  });

  // ── cono de escape: exterior e interior de chapa con 4 aletas de salida entre R17 y R30 ──
  const [Z0, Z1] = S.nozzle;
  const coneOut = (s) => 31 - (5 * (s - (Z0 + 2))) / (Z1 - Z0 - 2);
  const innerR = (s) => 18 - (10.5 * (s - 127)) / 40;
  const vanes = [45, 135, 225, 315].map((deg) => {
    const SF = { o: G.pointOf(F, 0, 0, 0), a: G.tangentOf(F, deg * DEG), u: radial(deg), v: F.a };
    return Sv(G.prismOf(SF, [[17.5, 134], [coneOut(134) - 0.6, 134], [coneOut(142) - 0.6, 142], [17, 142]], -0.25, 0.25, P), { tone: "mid" });
  });
  flange(pc("nozzle"), F, Z0, Z0 + 2, 30.4, 40, {
    name: `${pc("nozzle")}.flange`,
    extra:
      `<path class="mw-void" d="${G.circleOf(F, Z0, 30.4, P)}"/>` +
      `<clipPath id="${tag}-cone"><path d="${G.circleOf(F, Z0, 30.4, P)}"/></clipPath><g clip-path="url(#${tag}-cone)">` +
      Sv(G.solidOf([[127, 18], [132, 18], [Z1, 7.5]], F, P), { tone: "mid" }) +
      vanes.join("") +
      `</g>` +
      Dots(G.dotsOf(F, Z0, 35.5, COUNTS.coneScrews, P, { all: true, phase: 0.26 }), { size: 0.7, tone: "hi" }),
  });
  const NOZ_SLOPE = -5 / (Z1 - Z0 - 2);
  shell(pc("nozzle"), F, [[Z0 + 2, 30.4], [Z0 + 2, 31], [Z1, 26], [Z1, 25.4]], {}, {
    name: `${pc("nozzle")}.cone`,
    inner: G.arcOf(F, 140, coneOut(140), P, { slope: NOZ_SLOPE }),
  });

  // ── bujías, adaptadores de latón (combustible, gas, engrase) y sonda de temperatura ──
  for (const deg of [32, 148]) {
    const base = boss(pc("casing"), pt(WRAP0 + 22, R_CASE, deg), radial(deg), 4, 3, { host: CASING, name: `${pc("casing")}.glow-boss`, ring: false });
    const Fp = G.frameAlong(base, radial(deg));
    const plug = [[0, 0], [0, 3.4], [3, 3.4], [3, 2.2], [6.8, 2.2], [6.8, 1.6], [7.6, 1.6], [7.6, 0]];
    put(pc("casing"), G.add3(base, G.mul3(radial(deg), 3.8)), Sv(G.lathe(plug, Fp, P, { steps: 6 }), { tone: "hi" }), { bias: 0.3, name: nameFor(`${pc("casing")}.glowplug`), shapes: [record(A.body(Fp, plug, { name: `${pc("casing")}.glowplug` }))] });
    shot[`glow${deg}`] = G.add3(base, G.mul3(radial(deg), 7.6));
  }
  shot.adaptors = {};
  // Cada adaptador entra en su propia boca del difusor (combustible, gas, engrase), a su propia estación.
  for (const [key, deg, s] of [["fuel", 92, 40.5], ["gas", 114, 45.5], ["lube", 136, 50.5]]) {
    const top = boss(pc("casing"), pt(s, R_CASE, deg), radial(deg), 2.4, 3.6, { host: CASING, name: `${pc("casing")}.${key}-adaptor` });
    shot.adaptors[key] = { at: top, out: radial(deg) };
  }
  shot.tc = { at: boss(pc("casing"), pt(106, R_CASE, 100), radial(100), 2, 3, { host: CASING, name: `${pc("casing")}.tc-boss` }), out: radial(100) };
  shot.casing = CASING;
  shot.pt = pt;
  shot.radial = radial;
  return shot;
}

const FADE = [0.04, 0.42];
export { k };
