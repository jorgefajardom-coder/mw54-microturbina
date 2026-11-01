// El SR-71 Blackbird para el visor común: modelo, piezas, física y mecanismos (cono de entrada, elevones, derivas).
import * as sim from "./sim.js?v=20261031-motion5";
import { fmt } from "../jet/core.js?v=20261031-motion5";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  glb: "./sr71.glb",
  parts: "./parts.json",
  sim,
  engine: "J58",
  // vuelo: masa al despegar (kg), superficie alar (m²), envergadura y cuerda media (m), motores
  fly: { m: 55000, S: 167, b: 16.94, c: 11, engines: 2 },
  engineAlt: "J58.L",
  coreZone: "hpc",
  maxMach: 3.3,
  throttle: 0.85,
  heatMax: 1200,
  doubleSided: /^Interior oscuro/,
  view: { home: [32, 15, 38], target: [-1, -1.2, 0], max: 110 },
  shadow: 24,
  floor: {
    y: -2.7,
    fade: [34, 85],
    stand: { W: 46, D: 30, box: { x0: -18.5, x1: 18.5, z0: -12.5, z1: 12.5, arm: 3.6, w: 0.32 }, dash: [1.6, 2.8, 0.26], stops: [[7.6, 0], [-3.2, 1.9], [-3.2, -1.9]], stop: [0.35, 1.6] },
    ao: { w: 36, d: 22, x: -1 },
  },
  late: ["deriva", "elevon", "ala.ext"],
  say: { install: "El J58 entra en su góndola por detrás, por el hueco del eyector", engines: "dos J58" },
  // titanio pintado de negro: radia bien y se queda por debajo de T₀; el morro y las góndolas son lo más caliente
  skin(part, o) {
    const T0 = o.T0 - sim.K;
    const amb = o.T - sim.K;
    if (part.startsWith("fuselaje.morro") || part.startsWith("arista")) return amb + 0.86 * (T0 - amb);
    if (part.startsWith("gondola")) return amb + 0.9 * (T0 - amb) + 120 * o.ab;
    if (part.startsWith("cabina")) return amb + 0.84 * (T0 - amb);
    if (part.startsWith("tren")) return amb + 0.2 * (T0 - amb);
    return amb + 0.72 * (T0 - amb);
  },
  drive: {
    spike: (o) => o.spike,
    elevon: (o, s, c) => Math.max(-1, Math.min(1, s.pitch - s.roll * c.sign)) * c.range[1],
    rudder: (o, s, c) => s.yaw * c.range[1],
    // ángulo positivo: el borde de salida va hacia el eje (la puerta entra o el flap cierra); negativo: hacia fuera
    suckin: (o) => 22 * o.suckin,
    tertiary: (o) => 16 * o.tertiary,
    bypass: (o) => -16 * o.bypass,
    ejector: (o) => 5 - 8 * o.ejector,   // cerrados en tierra; a Mach 3,2 quedan casi en línea con la góndola
  },
  // llama del J58: gradiente tomado de la foto del J58 en el banco de pruebas de noche (penacho violeta translúcido con
  // nudos claros) y del SR-71 despegando (núcleo blanco amarillento y diamantes amarillos muy marcados); al arrancar,
  // el destello verde del trietilborano (TEB)
  flame: {
    modes: {
    dry: { core: [[0, [0.75, 0.72, 0.85], 0.6], [0.35, [0.55, 0.5, 0.7], 0.2], [1, [0.4, 0.4, 0.5], 0]], edge: [[0, [0.5, 0.5, 0.75], 0.25], [1, [0.3, 0.3, 0.4], 0]] },
      ab: { core: [[0, [1, 0.96, 0.85], 4.5], [0.12, [1, 0.88, 0.7], 3], [0.3, [0.86, 0.55, 0.62], 1.6], [0.6, [0.76, 0.46, 0.55], 1], [0.85, [0.76, 0.44, 0.4], 0.45], [1, [0.6, 0.35, 0.3], 0]], edge: [[0, [0.55, 0.3, 0.6], 1], [0.5, [0.6, 0.35, 0.6], 0.6], [1, [0.5, 0.3, 0.4], 0]] },
      teb: { core: [[0, [0.4, 1, 0.5], 3], [0.5, [0.3, 0.9, 0.4], 1.2], [1, [0.2, 0.6, 0.3], 0]], edge: [[0, [0.3, 0.8, 0.4], 1], [1, [0.2, 0.5, 0.3], 0]] },
    },
    brightness: 0.55,
    diamonds: { spacing: 0.1, count: 8, color: [1, 0.82, 0.55] },
    light: { intensity: 45, distance: 26 },
    state: (o, motor) => {
      const teb = motor.on && motor.heat < 0.3 ? 1 - motor.heat / 0.3 : 0;
      return { w: { dry: (1 - o.ab) * (1 - teb), ab: o.ab * (1 - teb), teb }, level: Math.max(teb, motor.heat * (0.25 + 0.75 * motor.thr)), optimal: o.ab * sm(0.88, 1, motor.thr) * (1 - teb), reach: 0.55 + 0.45 * o.ab };
    },
  },
  // la llama nace en la tobera del J58 (0,6 m de radio), dentro del eyector, y sale por él
  plumes: [4100, -4100].map((y) => ({ at: [-11140, y, -150], length: 16.5, r: 0.95, tail: 0.5 })),
  cut: { z: 4.1, pos: [-7.5, -1.6, 26], target: [-8, -0.4, 4.1] },
  flow: {
    paths: {
      core: [[6900, 700], [4900, 760], [3800, 650], [1500, 480], [0, 420], [-1600, 330], [-2300, 360], [-2800, 300], [-3130, 300], [-4900, 320], [-5440, 300], [-9500, 280]],
      bleed: [[6900, 760], [4900, 800], [3800, 700], [1500, 520], [0, 500], [-700, 480], [-850, 700], [-2900, 710], [-3130, 560], [-4900, 480], [-9500, 420]],
      secondary: [[6900, 860], [4900, 880], [3800, 830], [1500, 820], [0, 820], [-2985, 800], [-4900, 790], [-5900, 740], [-9500, 640]],
    },
    share: (path, o) => (path === "core" ? 1 : path === "bleed" ? o.bleed * 2 : 0.25 + 0.5 * Math.min(1, Math.max(0, (o.M - 2) / 1.2))),
    speed: (path) => (path === "core" ? 0.12 : 0.14),
    spread: (path) => [path === "core" ? 380 : 520, path === "core" ? 110 : 40],
    size: 0.08,
  },
  // despegue, reabastecimiento subsónico, aceleración con picado transónico, crucero a Mach 3,2 y vuelta
  mission: [[0, 0], [6, 0.4], [18, 0.9], [26, 0.9], [36, 1.3], [50, 2.4], [62, 3.2], [80, 3.2], [98, 1.4], [110, 0.4], [114, 0]],
  readout: (o, motor, md, K) => `Mach <b>${fmt(motor.M, 2)}</b> · <b>${fmt(o.h, 1)}</b> km · T₀ <b>${fmt(o.T0 - K)}</b> °C · <b>${md.name}</b> · cono <b>${fmt(o.spike / 10)}</b> cm · 2 × <b>${fmt(o.thrust)}</b> kN`,
};
