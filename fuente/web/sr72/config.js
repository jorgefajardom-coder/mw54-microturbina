// El SR-72 para el visor común: su modelo, sus piezas, su física y cómo se mueven sus mecanismos.
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
  view: { home: [30, 14, 36], target: [-1, -1.6, 0], max: 110 },
  shadow: 24,
  floor: {
    y: -3.6,
    fade: [34, 85],
    stand: { W: 44, D: 32, box: { x0: -17.5, x1: 17.5, z0: -14, z1: 14, arm: 3.6, w: 0.32 }, dash: [1.6, 2.8, 0.26], stops: [[9.6, 0], [-3.4, 3.3], [-3.4, -3.3]], stop: [0.35, 1.6] },
    ao: { w: 34, d: 22, x: -1 },
  },
  late: ["gondola"],
  say: { install: "El TBCC sube a su bahía bajo el ala", engines: "dos TBCC" },
  // la piel se queda en el equilibrio radiativo, muy por debajo de T₀, salvo morro y bordes de ataque
  skin(part, o) {
    const T0 = o.T0 - sim.K;
    const amb = o.T - sim.K;
    if (part.startsWith("fuselaje.morro")) return amb + 0.85 * (T0 - amb);
    if (part.startsWith("ala") || part.startsWith("deriva")) return amb + 0.78 * (T0 - amb);
    if (part.startsWith("tren")) return amb + 0.25 * (T0 - amb);
    return amb + 0.62 * (T0 - amb);
  },
  drive: {
    ramp: (o) => -o.ramp,
    splitter: (o, s, c) => c.range[1] + (c.range[0] - c.range[1]) * o.splitter,
    elevon: (o, s, c) => clamp1(s.pitch - s.roll * c.sign) * c.range[1],
    rudder: (o, s, c) => s.yaw * c.range[1],
  },
  plumes: [1350, -1350].map((y) => ({ at: [-11200, y, -1050], length: 14, r: 0.85, h: 1.05, w: 0.62 })),
  cut: { z: 1.35, pos: [-6, -3.4, 22.35], target: [-6, -1.8, 1.35] },
  flow: {
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
