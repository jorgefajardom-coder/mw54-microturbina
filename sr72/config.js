// El SR-72 con la forma del Darkstar para el visor común: modelo, piezas, física y mecanismos.
import * as sim from "./sim.js";
import { fmt } from "../jet/core.js";

const clamp1 = (v) => Math.max(-1, Math.min(1, v));

export default {
  glb: "./sr72.glb",
  parts: "./parts.json",
  sim,
  engine: "TBCC",
  engineAlt: "TBCC.L",
  coreZone: "hpc",
  maxMach: 6,
  throttle: 0.85,
  heatMax: 1600,
  doubleSided: /^Góndola/,
  view: { home: [21, 9, 25], target: [0, -1, 0], max: 80 },
  shadow: 16,
  floor: {
    y: -2.3,
    fade: [24, 60],
    stand: { W: 32, D: 22, box: { x0: -12.5, x1: 12.5, z0: -9.5, z1: 9.5, arm: 2.6, w: 0.24 }, dash: [1.15, 2, 0.18], stops: [[6.8, 0], [-1.5, 1.6], [-1.5, -1.6]], stop: [0.28, 1.2] },
    ao: { w: 24, d: 14, x: 0 },
  },
  late: ["gondola"],
  say: { install: "El TBCC sube a su bahía bajo el ala, detrás de la toma", engines: "dos TBCC" },
  // la piel se queda en el equilibrio radiativo, muy por debajo de T₀, salvo morro y bordes de ataque
  skin(part, o) {
    const T0 = o.T0 - sim.K;
    const amb = o.T - sim.K;
    if (part.startsWith("fuselaje.morro")) return amb + 0.85 * (T0 - amb);
    if (part.startsWith("deriva") || part.startsWith("elevon")) return amb + 0.78 * (T0 - amb);
    if (part.startsWith("tren")) return amb + 0.25 * (T0 - amb);
    return amb + 0.62 * (T0 - amb);
  },
  drive: {
    ramp: (o) => -o.ramp,
    splitter: (o, s, c) => c.range[1] + (c.range[0] - c.range[1]) * o.splitter,
    elevon: (o, s, c) => clamp1(s.pitch - s.roll * c.sign) * c.range[1],
    rudder: (o, s, c) => s.yaw * c.range[1],
  },
  plumes: [1600, -1600].map((y) => ({ at: [-9200, y, -850], length: 9, r: 0.55, h: 0.7, w: 0.5 })),
  cut: { z: 1.6, pos: [-3, -2.4, 15], target: [-3.5, -0.9, 1.6] },
  flow: {
    size: 0.08,
    paths: {
      turbo: [[2600, -850], [0, -850], [-1500, -820], [-3200, -700], [-4300, -560], [-5900, -560], [-6800, -600], [-7400, -620], [-12500, -650], [-13300, -900], [-16500, -800]],
      ram: [[2600, -1720], [0, -1720], [-1500, -1725], [-5200, -1725], [-11500, -1760], [-12800, -1500], [-16500, -1250]],
    },
    share: (path, o) => (path === "ram" ? o.ram : o.turbine),
    speed: (path, o) => (path === "ram" ? 0.18 + 0.25 * o.scram : 0.12),
    spread: (path, u) => [520, path === "ram" ? 220 : u > 0.3 && u < 0.6 ? 230 : 380],
  },
  // despegue con postquemador, subida, relevo a Mach 3, crucero a Mach 6 y vuelta
  mission: [[0, 0], [6, 0.4], [22, 2.6], [32, 3.4], [48, 5.2], [58, 6], [74, 6], [96, 2.2], [110, 0.6], [116, 0]],
  readout: (o, motor, md, K) => `Mach <b>${fmt(motor.M, 2)}</b> · <b>${fmt(o.h, 1)}</b> km · T₀ <b>${fmt(o.T0 - K)}</b> °C · <b>${md.name}</b> · 2 × <b>${fmt(o.thrust)}</b> kN`,
};
