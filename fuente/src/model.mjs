// Modelo de la MW54: la misma fuente para la geometría, el movimiento y cada número que muestra la figura.
// Datos de la ficha de la GTBA (gtba.co.uk/engine_designs/mw54.php): Ø87 mm, carcasa de 150 mm, compresor de 54 mm,
// 160.000 rpm, 75 N, 575 °C, 700–800 g. El resto (relación de presiones, caudal, temperaturas internas) son valores
// típicos de una microturbina de compresor radial de esta clase, marcados como aproximados en la leyenda.

export const SPEC = {
  diameter: 87,
  caseLength: 150,
  compressor: 54,
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

// Estaciones a lo largo del eje, en mm desde el labio de la toma (s = 0) hacia la tobera.
export const S = {
  lip: 0,
  throat: 14,
  nut: [8, 18],
  wheel: [18, 34],
  caseFront: 26,
  diffuser: [34, 48],
  tunnel: [48, 160],
  combustor: [54, 152],
  ngv: [152, 166],
  turbine: [167, 176],
  caseBack: 176,
  nozzle: [176, 216],
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

// Materiales: solidus–liquidus y temperatura de servicio continuo aproximada, en °C.
export const PARTS = {
  nut: { name: "Tuerca cónica", material: "Inox 303", melt: [1400, 1420], service: 800 },
  bellmouth: { name: "Toma de aire", material: "Aluminio 6061-T6", melt: [582, 652], service: 150 },
  wheel: { name: "Rueda del compresor", material: "Aluminio 2618-T61", melt: [549, 638], service: 230 },
  diffuser: { name: "Difusor", material: "Aluminio 6082-T6", melt: [555, 650], service: 150 },
  tunnel: { name: "Eje, túnel y rodamientos", material: "Acero plata · rodamientos híbridos Si₃N₄", melt: [1420, 1470], service: 180 },
  casing: { name: "Carcasa exterior", material: "Inox 304", melt: [1400, 1450], service: 870 },
  combustor: { name: "Cámara de combustión", material: "Inox 321", melt: [1400, 1425], service: 870 },
  ngv: { name: "Estátor de turbina (NGV)", material: "Inconel 625", melt: [1290, 1350], service: 980 },
  turbine: { name: "Rueda de turbina", material: "Inconel 713C", melt: [1260, 1290], service: 980 },
  nozzle: { name: "Tobera y cono de cola", material: "Inox 321", melt: [1400, 1425], service: 870 },
  fuel: { name: "Bomba y línea de combustible", material: "Latón · PTFE", melt: [900, 940], service: 120 },
  ecu: { name: "ECU y sensores", material: "FR-4 · termopar tipo K", melt: [1400, 1450], service: 85 },
};

export function partAt(id, f) {
  const o = op(f);
  const p = PARTS[id];
  const temp = metal[id](o);
  return { ...p, temp, margin: p.melt[0] - temp, load: temp / p.service };
}

// Despiece: la carcasa se queda en las cunas; lo de delante sale por la toma y lo de detrás por la tobera.
// Cada vector deja la pieza por delante de la siguiente, así nada atraviesa nada en ningún fotograma.
export const MOVES = {
  bellmouth: [205, 0, 0],
  nut: [178, 0, 0],
  wheel: [172, 0, 0],
  diffuser: [166, 0, 0],
  tunnel: [145, 0, 0],
  nozzle: [-170, 0, 0],
  turbine: [-152, 0, 0],
  ngv: [-142, 0, 0],
  combustor: [-130, 0, 0],
};
export const STAGGER = ["bellmouth", "nozzle", "nut", "turbine", "wheel", "ngv", "diffuser", "combustor", "tunnel"];
// El montaje real es el despiece al revés: eje y túnel, difusor, cámara, estátor, compresor, turbina, tuerca, tobera, toma.
export const ASSEMBLY = [...STAGGER].reverse();
