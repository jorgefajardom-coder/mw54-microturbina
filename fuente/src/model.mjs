// Modelo de la MW54: la misma fuente para la geometría, el movimiento y cada número que muestra la figura.
// Cotas, piezas, cantidades y materiales: planos de Wren Turbines "MW54 Turbo-Jet, plans and building instructions"
// (G.A. issue 4, lista de piezas issue 3/4). Prestaciones: ficha de la GTBA (160.000 rpm, 75 N, 575 °C, 700–800 g).
// La relación de presiones, el caudal y las temperaturas internas son valores típicos aproximados de esta clase de motor.

export const SPEC = {
  diameter: 88,
  caseLength: 90.5,
  length: 167,
  compressor: 54,
  inducer: 38.2,
  turbine: 55,
  rpmMax: 160000,
  rpmIdle: 45000,
  thrustMax: 75,
  egtMax: 575,
  egtIdle: 450,
  prMax: 2.2,
  massFlowMax: 0.14,
  mass: 750,
  etaC: 0.72,
};

// Estaciones a lo largo del eje, en mm desde la punta de la tuerca del compresor (s = 0) hacia el escape.
export const S = {
  nut: [0, 16],
  intake: [6, 24],
  throat: 16,
  wheel: [16, 38],
  shroud: [24, 38],
  caseFront: 28,
  diffuser: [38, 52],
  tunnel: [52, 104],
  shaft: [38, 115],
  combustor: [52, 104],
  ngv: [104, 115],
  caseBack: 112,
  turbine: [115, 127],
  nozzle: [115, 167],
};

// Lo que dicen los planos, para contarlo en la figura y comprobar que el dibujo lo cumple.
export const COUNTS = {
  compressorBlades: [6, 6],
  diffuserWedges: 11,
  diffuserVanes: 36,
  vaporisers: 6,
  swirlJets: 6,
  stickOutlets: 12,
  glowBosses: 2,
  ngvVanes: 13,
  outletVanes: 4,
  ballRaces: 2,
  shroudScrews: 8,
  caseScrews: 6,
  ngvScrews: 8,
  coneScrews: 6,
  // 24 Ø1,5 · 12 Ø4,9 · 24 Ø3,25 · 12 Ø2,3 · 24 Ø1,5 · 6 Ø3,8, medidos desde la cara delantera de la envolvente (46 mm).
  holeRows: [[8, 6, 3.8], [14.5, 24, 1.5], [18.5, 12, 2.3], [27.5, 24, 3.25], [38, 12, 4.9], [42, 24, 1.5]],
  screws: 52,
};

const T1 = 15;
const gamma = 1.4;

export function op(f) {
  const n = SPEC.rpmIdle + (SPEC.rpmMax - SPEC.rpmIdle) * f;
  const share = n / SPEC.rpmMax;
  const pr = 1 + (SPEC.prMax - 1) * share ** 2;
  const t1K = T1 + 273.15;
  const t2 = T1 + (t1K * (pr ** ((gamma - 1) / gamma) - 1)) / SPEC.etaC;
  const egt = SPEC.egtIdle + (SPEC.egtMax - SPEC.egtIdle) * f ** 1.4;
  const turbineDrop = ((t2 - T1) * 1.005) / 1.15;
  const tit = egt + turbineDrop;
  const thrust = SPEC.thrustMax * share ** 2.2;
  const flow = SPEC.massFlowMax * share;
  const tip = (n / 60) * 2 * Math.PI * (SPEC.compressor / 2000);
  return { n, share, pr, t1: T1, t2, tit, egt, primary: tit + 140, thrust, flow, jet: thrust / flow, tip };
}

// Temperatura de metal de cada pieza en un punto de funcionamiento.
const metal = {
  bellmouth: (o) => o.t1 + 3,
  nut: (o) => o.t1 + 12,
  shroud: (o) => o.t2 - 5,
  wheel: (o) => o.t2 + 15,
  diffuser: (o) => o.t2 + 5,
  tunnel: (o) => o.t2 + 45,
  combustor: (o) => o.tit + 60,
  casing: (o) => o.t2 + 110,
  ngv: (o) => o.tit,
  turbine: (o) => o.tit - 70,
  nozzle: (o) => o.egt - 25,
  fuel: (o) => o.t1 + 20,
  ecu: (o) => o.t1 + 15,
};

// Materiales de la lista de piezas de Wren; solidus–liquidus y servicio continuo aproximados, en °C.
export const PARTS = {
  bellmouth: { name: "Toma de aire", material: "Nailon (PA66)", melt: [255, 265], service: 120 },
  nut: { name: "Tuerca del compresor", material: "Aleación de aluminio", melt: [550, 640], service: 150 },
  shroud: { name: "Tapa delantera", material: "Aleación de aluminio", melt: [555, 650], service: 150 },
  wheel: { name: "Rueda del compresor", material: "Aluminio fundido · Garrett 446335", melt: [546, 621], service: 200 },
  diffuser: { name: "Difusor", material: "Aleación de aluminio", melt: [555, 650], service: 150 },
  tunnel: { name: "Eje, túnel y rodamientos", material: "Túnel de aluminio · eje En24T · 2 × GRW 688 cerámicos", melt: [555, 650], service: 180 },
  casing: { name: "Carcasa exterior", material: "Chapa de inox de 0,4 mm", melt: [1400, 1450], service: 870 },
  combustor: { name: "Cámara de combustión", material: "Chapa de inox de 0,4 mm", melt: [1400, 1450], service: 870 },
  ngv: { name: "Estátor (NGV) y tapa trasera", material: "Inox fundido · tapa de acero dulce", melt: [1400, 1450], service: 870 },
  turbine: { name: "Rueda de turbina", material: "Inconel 713 fundido", melt: [1260, 1290], service: 980 },
  nozzle: { name: "Cono de escape", material: "Chapa de inox · 4 aletas", melt: [1400, 1450], service: 870 },
  fuel: { name: "Combustible, gas y engrase", material: "Latón · 6 vaporizadores de inox", melt: [900, 940], service: 120 },
  ecu: { name: "ECU y sensores", material: "FR-4 · termopar tipo K", melt: [1400, 1450], service: 85 },
};

export function partAt(id, f) {
  const o = op(f);
  const p = PARTS[id];
  const temp = metal[id](o);
  return { ...p, temp, margin: p.melt[0] - temp, load: temp / p.service };
}

// Despiece en el orden real de desmontaje. La carcasa se queda en las cunas. Por delante: toma, tapa delantera
// (la rueda no pasa por su boca, así que sale antes), tuerca, rueda, difusor y por último eje con su túnel.
// Por detrás: cono, turbina, estátor con la tapa trasera (la cámara no cabe por su agujero) y la cámara.
// Cada vector deja la pieza por delante de la siguiente, así nada atraviesa nada en ningún fotograma.
export const MOVES = {
  bellmouth: [172, 0, 0],
  shroud: [166, 0, 0],
  nut: [123, 0, 0],
  wheel: [118, 0, 0],
  diffuser: [112, 0, 0],
  tunnel: [92, 0, 0],
  nozzle: [-96, 0, 0],
  turbine: [-78, 0, 0],
  ngv: [-72, 0, 0],
  combustor: [-66, 0, 0],
};
export const STAGGER = ["bellmouth", "nozzle", "shroud", "turbine", "nut", "ngv", "wheel", "combustor", "diffuser", "tunnel"];
// El montaje real es el despiece al revés.
export const ASSEMBLY = [...STAGGER].reverse();
