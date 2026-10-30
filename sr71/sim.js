// Física del SR-71 y de su J58 para el visor. Exacto: atmósfera estándar y temperatura de remanso. Publicado: ≈ 145 kN
// con postquemador, relación de presiones ≈ 8,8, el cono de entrada empieza a retrasarse en Mach 1,6 y llega a 66 cm
// en Mach 3,2; por encima de Mach 2 sale aire del 4.º escalón al postquemador por seis tubos (20–40 %); en crucero la
// toma da el 54 % del empuje, el eyector el 29 % y el motor el 17 %. Lo demás son estimaciones de orden de magnitud.
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const K = 273.15;
export const altitude = (M) => (M < 0.2 ? 0 : Math.min(25.9, 1 + M * 7.8));
export function isa(h) {
  if (h < 11) return 288.15 - 6.5 * h;
  if (h < 20) return 216.65;
  return 216.65 + (h - 20);
}
export function modeOf(M) {
  if (M < 1.6) return { key: "jet", name: "Turborreactor", say: "El cono está adelante y todo el empuje sale del J58." };
  if (M < 2) return { key: "spike", name: "Cono en marcha", say: "El cono empieza a retrasarse para mantener la onda de choque en el labio de la toma." };
  if (M < 2.8) return { key: "bleed", name: "Derivación", say: "Seis tubos llevan aire del 4.º escalón del compresor al postquemador." };
  return { key: "ram", name: "Casi estatorreactor", say: "En crucero la toma da el 54 % del empuje, el eyector el 29 % y el motor sólo el 17 %." };
}
export function op(M, throttle) {
  const h = altitude(M);
  const T = isa(h);
  const T0 = T * (1 + 0.2 * M * M);
  const ab = Math.max(smooth(0.8, 0.95, throttle), smooth(1.0, 1.3, M)) * (throttle > 0.05 ? 1 : 0);
  const bleed = (0.2 + 0.2 * smooth(2.2, 3.2, M)) * smooth(1.9, 2.1, M);
  const rho = 1.225 * Math.exp(-h / 7.6);
  const pr = 1 + (7.8 * Math.pow(throttle, 0.6)) / (1 + 0.55 * M * M);
  const T3 = T0 * (1 + (Math.pow(pr, 0.2857) - 1) / 0.85);
  const burner = T3 + (950 + 250 * throttle) * (throttle > 0.02 ? 1 : 0);
  const inlet = 1 + 2.2 * smooth(1.8, 3.2, M); // la compresión en la toma multiplica el empuje
  const thrust = throttle * 106 * Math.pow(rho / 1.225, 0.75) * (1 + 0.3 * M) * (1 + 0.37 * ab) * inlet;
  return { M, h, T, T0, pr, T3, burner, ab, bleed, throttle, thrust, turbine: 1, spike: 660 * smooth(1.6, 3.2, M), rpm: 7400 * (0.4 + 0.6 * throttle) };
}
export function metalOf(zone, o, on) {
  const amb = o.T - K;
  const T0 = o.T0 - K;
  if (!on) return { spike: T0, hpc: T0, bleed: T0 }[zone] ?? amb + 0.8 * (T0 - amb);
  switch (zone) {
    case "spike": return 0.97 * T0;
    case "hpc": return o.T3 - K;
    case "bleed": return T0 + (o.T3 - o.T0) * 0.45;
    case "burner": return 0.55 * (o.burner - K);
    case "turbine": return 0.6 * (o.burner - K) - 30;
    case "shaft": return 200 + 200 * o.throttle;
    case "case": return 0.5 * (o.T3 - K) + 90;
    case "ab": return 520 + 430 * o.ab;
    case "nozzle": return 480 + 400 * o.ab;
    case "ejector": return 380 + 350 * o.ab + 0.2 * T0;
    default: return T0;
  }
}
export function gasAlong(path, u, o, on) {
  const T0 = o.T0 - K;
  const ab = on ? 1000 * o.ab * smooth(0.45, 0.55, u) : 0;
  if (path === "core") {
    if (u < 0.3) return T0;
    if (u < 0.4) return T0 + (o.T3 - o.T0) * (u - 0.3) / 0.1;
    if (u < 0.47) return on ? o.burner - K : o.T3 - K;
    return (on ? (o.burner - K) * 0.62 : o.T3 - K) + ab;
  }
  if (path === "bleed") return u < 0.33 ? T0 + (o.T3 - o.T0) * 0.45 * smooth(0.25, 0.33, u) : T0 + (o.T3 - o.T0) * 0.45 + ab * 0.9;
  return T0 + (on ? 300 * o.ab * smooth(0.7, 0.9, u) : 0);
}
