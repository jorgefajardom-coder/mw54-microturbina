// El F-14D Tomcat para el visor común: modelo, piezas, física y mecanismos (alas de geometría variable, rampas de la
// toma, estabilizadores y timones).
import * as sim from "./sim.js?v=20261031-transition10";
import { fmt } from "../jet/core.js?v=20261031-transition10";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  glb: "./f14.glb",
  parts: "./parts.json",
  sim,
  engine: "F110",
  // vuelo: masa al despegar (kg), superficie alar (m²), envergadura y cuerda media (m), motores
  fly: { m: 27000, S: 52.5, b: 19.55, c: 3.0, engines: 2 },
  // ojos del piloto (mm del modelo)
  cockpit: { x: 5450, drop: 300, look: 1500 },
  engineAlt: "F110.L",
  coreZone: "hpc",
  maxMach: 2.3,
  throttle: 0.7,
  heatMax: 1200,
  doubleSided: /^Interior oscuro/,
  view: { home: [20, 9, 25], target: [0, -0.8, 0], max: 80 },
  shadow: 16,
  floor: {
    y: -2.15,
    fade: [24, 60],
    stand: { W: 30, D: 24, box: { x0: -11, x1: 11, z0: -10.5, z1: 10.5, arm: 2.4, w: 0.22 }, dash: [1, 1.8, 0.16], stops: [[7.4, 0], [-1.3, 2.75], [-1.3, -2.75]], stop: [0.25, 1] },
    ao: { w: 22, d: 18, x: 0 },
  },
  late: [],
  say: { install: "El F110 entra en su góndola por detrás", engines: "dos F110" },
  skin(part, o) {
    const T0 = o.T0 - sim.K;
    const amb = o.T - sim.K;
    if (part.startsWith("radomo") || part.startsWith("fuselaje.delantero") || part.startsWith("cabina")) return amb + 0.9 * (T0 - amb);
    if (part.startsWith("ala") || part.startsWith("guante") || part.startsWith("deriva") || part.startsWith("estabilizador")) return amb + 0.85 * (T0 - amb);
    return amb + 0.75 * (T0 - amb);
  },
  drive: {
    // el ala está dibujada a 20°: se gira lo que falta hasta la flecha del momento, hacia atrás en cada lado
    sweep: (o, s, c) => -(o.sweep - 20) * c.sign,
    ramp: (o) => -o.ramp,
    stabilator: (o, s, c) => Math.max(-1, Math.min(1, s.pitch - 0.6 * s.roll * c.sign)) * c.range[1],
    rudder: (o, s, c) => s.yaw * c.range[1],
    // pétalos de la tobera: cerrados en seco, se abren con el postquemador
    iris: (o) => 6 - 14 * o.ab,
  },
  // llama del F110: gradiente tomado de fotos del F110 en banco de pruebas y del F-14 al despegar (núcleo blanco rosado,
  // lavanda y cola azul violeta); diamantes con la separación de la tobera de pétalos
  flame: {
    modes: {
    dry: { core: [[0, [0.75, 0.72, 0.85], 0.6], [0.35, [0.55, 0.5, 0.7], 0.2], [1, [0.4, 0.4, 0.5], 0]], edge: [[0, [0.5, 0.5, 0.75], 0.25], [1, [0.3, 0.3, 0.4], 0]] },
      ab: { core: [[0, [1, 0.95, 0.98], 5], [0.15, [1, 0.9, 0.94], 3.5], [0.4, [0.9, 0.78, 0.92], 1.8], [0.7, [0.7, 0.65, 0.9], 0.8], [0.9, [0.47, 0.52, 0.85], 0.3], [1, [0.4, 0.45, 0.8], 0]], edge: [[0, [1, 0.75, 0.85], 1], [0.5, [0.75, 0.6, 0.85], 0.6], [1, [0.45, 0.5, 0.85], 0]] },
    },
    brightness: 0.55,
    diamonds: { spacing: 0.12, count: 6, color: [1, 0.9, 0.95] },
    light: { intensity: 40, distance: 22 },
    state: (o, motor) => ({ w: { dry: 1 - o.ab, ab: o.ab }, level: motor.heat * (0.25 + 0.75 * motor.thr), optimal: o.ab * sm(0.88, 1, motor.thr), reach: 0.55 + 0.45 * o.ab }),
  },
  // tobera de pétalos ≈ 0,5 m de radio en la boca
  plumes: [1450, -1450].map((y) => ({ at: [-8500, y, -250], length: 10, r: 0.8, tail: 0.6 })),
  cut: { z: 1.45, pos: [-4, -1.1, 15], target: [-4.5, -0.3, 1.45] },
  flow: {
    paths: {
      core: [[5500, 0], [2600, 0], [0, 0], [-950, 0], [-2100, 0], [-2700, 0], [-3300, 0], [-5300, 0], [-5900, 0], [-8500, 0]],
      bypass: [[5500, 430], [2600, 430], [0, 450], [-950, 460], [-2700, 460], [-3400, 420], [-5300, 300], [-5900, 260], [-8500, 300]],
      bypassLow: [[5500, -430], [2600, -430], [0, -450], [-950, -460], [-2700, -460], [-3400, -420], [-5300, -300], [-5900, -260], [-8500, -300]],
    },
    share: () => 1,
    speed: (path) => (path === "core" ? 0.13 : 0.16),
    spread: (path) => (path === "core" ? [300, 150] : [420, 40]),
    size: 0.07,
  },
  // catapulta, subida con las alas adelante, interceptación supersónica con las alas atrás y vuelta al portaviones
  mission: [[0, 0], [4, 0.25], [12, 0.4], [24, 0.9], [36, 1.3], [52, 2.2], [62, 2.3], [76, 1.0], [90, 0.35], [96, 0]],
  readout: (o, motor, md, K) => `Mach <b>${fmt(motor.M, 2)}</b> · <b>${fmt(o.h, 1)}</b> km · alas a <b>${fmt(o.sweep)}</b>° · <b>${md.name}</b> · 2 × <b>${fmt(o.thrust)}</b> kN`,
};
