// El F-22 Raptor para el visor común: modelo, piezas, física y mecanismos (mandos y tobera vectorial).
import * as sim from "./sim.js?v=20261031-intro6";
import { fmt } from "../jet/core.js?v=20261031-intro6";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  glb: "./f22.glb",
  parts: "./parts.json",
  sim,
  engine: "F119",
  // vuelo: masa al despegar (kg), superficie alar (m²), envergadura y cuerda media (m), motores
  fly: { m: 29000, S: 78, b: 13.56, c: 6.6, engines: 2 },
  // ojos del piloto (mm del modelo)
  cockpit: { eye: [4520, 830], look: [6200, 480] },
  engineAlt: "F119.L",
  coreZone: "hpc",
  maxMach: 2.3,
  throttle: 0.7,
  heatMax: 1200,
  doubleSided: /^Interior oscuro/,
  view: { home: [19, 8.5, 23], target: [-0.5, -0.8, 0], max: 70 },
  shadow: 14,
  floor: {
    y: -2.15,
    fade: [22, 55],
    stand: { W: 28, D: 20, box: { x0: -11, x1: 11, z0: -8.5, z1: 8.5, arm: 2.2, w: 0.2 }, dash: [1, 1.8, 0.16], stops: [[6.3, 0], [-1.8, 1.81], [-1.8, -1.81]], stop: [0.25, 1] },
    ao: { w: 20, d: 14, x: 0 },
  },
  late: [],
  say: { install: "El F119 entra en su bahía por detrás, entre las vigas de cola", engines: "dos F119" },
  skin(part, o) {
    const T0 = o.T0 - sim.K;
    const amb = o.T - sim.K;
    if (part.startsWith("fuselaje.delantero") || part.startsWith("cabina")) return amb + 0.9 * (T0 - amb);
    if (part.startsWith("ala") || part.startsWith("deriva") || part.startsWith("estabilizador")) return amb + 0.85 * (T0 - amb);
    if (part.startsWith("fuselaje.trasero")) return amb + 0.75 * (T0 - amb) + 40;
    return amb + 0.75 * (T0 - amb);
  },
  drive: {
    aileron: (o, s, c) => -s.roll * c.sign * c.range[1],
    stabilator: (o, s, c) => Math.max(-1, Math.min(1, s.pitch - 0.5 * s.roll * c.sign)) * c.range[1],
    rudder: (o, s, c) => s.yaw * c.range[1],
    // empuje vectorial: las dos aletas giran juntas con el cabeceo
    vector: (o, s, c) => s.pitch * c.range[1],
  },
  // llama del F119: gradiente tomado de fotos nocturnas del F-22 con postquemador (núcleo blanco que pasa a amarillo y a
  // rosa pálido); diamantes con la separación de la tobera bidimensional
  flame: {
    modes: {
    dry: { core: [[0, [0.75, 0.72, 0.85], 0.6], [0.35, [0.55, 0.5, 0.7], 0.2], [1, [0.4, 0.4, 0.5], 0]], edge: [[0, [0.5, 0.5, 0.75], 0.25], [1, [0.3, 0.3, 0.4], 0]] },
      ab: { core: [[0, [1, 0.97, 0.92], 5], [0.12, [1, 0.93, 0.82], 4], [0.35, [1, 0.8, 0.55], 2.2], [0.6, [0.98, 0.62, 0.42], 1], [0.85, [0.55, 0.42, 0.3], 0.3], [1, [0.4, 0.3, 0.25], 0]], edge: [[0, [1, 0.7, 0.8], 1.2], [0.4, [0.95, 0.55, 0.55], 0.7], [1, [0.5, 0.3, 0.3], 0]] },
    },
    brightness: 0.55,
    diamonds: { spacing: 0.11, count: 6, color: [1, 0.9, 0.7] },
    light: { intensity: 40, distance: 22 },
    state: (o, motor) => ({ w: { dry: 1 - o.ab, ab: o.ab }, level: motor.heat * (0.25 + 0.75 * motor.thr), optimal: o.ab * sm(0.88, 1, motor.thr), reach: 0.55 + 0.45 * o.ab }),
  },
  // tobera bidimensional: boca de ≈ 1,12 m de ancho por 0,6 m de alto
  plumes: [620, -620].map((y) => ({ at: [-8660, y, -150], length: 10, r: 0.6, h: 0.8, w: 1.5, tail: 0.75 })),
  cut: { z: 0.62, pos: [-4.5, -1.3, 16], target: [-4.8, -0.2, 0.62] },
  flow: {
    paths: {
      core: [[1800, 0], [0, 0], [-900, 0], [-1700, 0], [-2300, 0], [-2700, 0], [-4300, 0], [-5160, 0], [-8000, 0]],
      bypass: [[1800, 460], [0, 460], [-900, 470], [-2300, 470], [-2900, 420], [-4300, 280], [-5160, 220], [-8000, 260]],
      bypassLow: [[1800, -460], [0, -460], [-900, -470], [-2300, -470], [-2900, -420], [-4300, -280], [-5160, -220], [-8000, -260]],
    },
    share: () => 1,
    speed: (path) => (path === "core" ? 0.13 : 0.16),
    spread: (path) => (path === "core" ? [300, 160] : [440, 40]),
    size: 0.07,
  },
  // despegue, subida, supercrucero, carrera con postquemador y vuelta
  mission: [[0, 0], [5, 0.3], [18, 0.95], [30, 1.5], [50, 1.6], [62, 2.2], [72, 2.2], [88, 0.9], [100, 0.3], [104, 0]],
  readout: (o, motor, md, K) => `Mach <b>${fmt(motor.M, 2)}</b> · <b>${fmt(o.h, 1)}</b> km · T₀ <b>${fmt(o.T0 - K)}</b> °C · <b>${md.name}</b> · 2 × <b>${fmt(o.thrust)}</b> kN`,
};
