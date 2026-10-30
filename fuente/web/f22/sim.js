// Física del F-22 y de su F119 para el visor: atmósfera estándar y temperatura de remanso exactas; empuje, relación de
// presiones y temperaturas internas como estimaciones de orden de magnitud a partir de lo publicado (≈ 116 kN sin
// postquemador y ≈ 156 kN con él, relación de derivación 0,3, supercrucero por encima de Mach 1,5 sin postquemador).
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const K = 273.15;
export const altitude = (M) => (M < 0.2 ? 0 : Math.min(15.2, 1 + M * 6.4));
export function isa(h) {
  if (h < 11) return 288.15 - 6.5 * h;
  if (h < 20) return 216.65;
  return 216.65 + (h - 20);
}
export function modeOf(M) {
  if (M < 0.9) return { key: "sub", name: "Subsónico", say: "Crucero normal: el turbofán trabaja sin postquemador." };
  if (M < 1.15) return { key: "trans", name: "Transónico", say: "Cruce de la barrera del sonido: aparece la onda de choque frente a las tomas." };
  if (M < 1.8) return { key: "super", name: "Supercrucero", say: "Vuelo supersónico sostenido sin postquemador, la marca del F-22." };
  return { key: "ab", name: "Postquemador", say: "Por encima de Mach 1,8 entra el postquemador; el máximo ronda Mach 2,25." };
}
export function op(M, throttle) {
  const h = altitude(M);
  const T = isa(h);
  const T0 = T * (1 + 0.2 * M * M);
  const ab = Math.max(smooth(1.75, 1.85, M), smooth(0.8, 0.95, throttle)) * (throttle > 0.05 ? 1 : 0);
  const rho = 1.225 * Math.exp(-h / 7.6);
  const pr = 1 + (25 * Math.pow(throttle, 0.6)) / (1 + 0.12 * M * M);
  const T3 = T0 * (1 + (Math.pow(pr, 0.2857) - 1) / 0.86);
  const burner = T3 + (1000 + 350 * throttle) * (throttle > 0.02 ? 1 : 0);
  const thrust = throttle * 116 * Math.pow(rho / 1.225, 0.75) * (1 + 0.35 * M) * (1 + 0.34 * ab);
  return { M, h, T, T0, pr, T3, burner, ab, throttle, thrust, turbine: 1, rpm: 13000 * (0.35 + 0.65 * throttle) };
}
export function metalOf(zone, o, on) {
  const amb = o.T - K;
  const T0 = o.T0 - K;
  const soak = amb + 0.3 * (T0 - amb);
  if (!on) return { fan: T0, hpc: T0 }[zone] ?? soak;
  switch (zone) {
    case "fan": return T0 + 30;
    case "hpc": return o.T3 - K;
    case "burner": return 0.55 * (o.burner - K);
    case "hpt": return 0.58 * (o.burner - K) - 40;
    case "lpt": return 0.48 * (o.burner - K);
    case "shaft": return 180 + 220 * o.throttle;
    case "case": return 0.5 * (o.T3 - K) + 60;
    case "ab": return 480 + 450 * o.ab;
    case "nozzle": return 0.4 * T0 + 0.35 * Math.max(o.ab * 1900, 0.55 * (o.burner - K));
    default: return soak;
  }
}
// gas a lo largo del núcleo y del flujo derivado (u ∈ [0, 1])
export function gasAlong(path, u, o, on) {
  const T0 = o.T0 - K;
  const ab = on ? 900 * o.ab * smooth(0.55, 0.65, u) : 0;
  if (path === "core") {
    if (u < 0.2) return T0;
    if (u < 0.32) return T0 + (o.T3 - o.T0) * (u - 0.2) / 0.12;
    if (u < 0.4) return on ? o.burner - K : o.T3 - K;
    if (u < 0.55) return on ? (o.burner - K) * 0.6 : o.T3 - K;
    return (on ? (o.burner - K) * 0.6 : o.T3 - K) * 0.85 + ab;
  }
  return u < 0.55 ? T0 + 60 * smooth(0.1, 0.25, u) : T0 + 60 + 0.4 * ab + (on ? 250 * smooth(0.55, 0.65, u) : 0);
}
