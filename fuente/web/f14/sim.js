// Física del F-14D y de su F110-GE-400 para el visor. Exacto: atmósfera estándar y temperatura de remanso. Publicado:
// ≈ 74 kN en seco y ≈ 120 kN con postquemador; Mach máximo ≈ 2,34; el ordenador de datos de aire lleva el ala de 20°
// a 68° según el Mach. La ley de flecha, las rampas y las temperaturas internas son estimaciones de orden de magnitud.
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const K = 273.15;
export const altitude = (M) => (M < 0.2 ? 0 : Math.min(15, 1 + M * 6.2));
export function isa(h) {
  if (h < 11) return 288.15 - 6.5 * h;
  if (h < 20) return 216.65;
  return 216.65 + (h - 20);
}
export function modeOf(M) {
  if (M < 0.4) return { key: "fwd", name: "Ala adelante", say: "Alas a 20°: máxima sustentación para despegar y apontar en el portaviones." };
  if (M < 1.2) return { key: "auto", name: "Flecha automática", say: "El ordenador de datos de aire lleva las alas hacia atrás a medida que sube el Mach." };
  if (M < 2) return { key: "super", name: "Supersónico", say: "Alas a 68° y rampas de la toma bajando para frenar el aire antes del fan." };
  return { key: "max", name: "Máxima velocidad", say: "Con postquemador completo el Tomcat pasa de Mach 2,3." };
}
export function op(M, throttle) {
  const h = altitude(M);
  const T = isa(h);
  const T0 = T * (1 + 0.2 * M * M);
  const ab = Math.max(smooth(1.15, 1.3, M), smooth(0.8, 0.95, throttle)) * (throttle > 0.05 ? 1 : 0);
  const rho = 1.225 * Math.exp(-h / 7.6);
  const pr = 1 + (29 * Math.pow(throttle, 0.6)) / (1 + 0.15 * M * M);
  const T3 = T0 * (1 + (Math.pow(pr, 0.2857) - 1) / 0.86);
  const burner = T3 + (1000 + 330 * throttle) * (throttle > 0.02 ? 1 : 0);
  const thrust = throttle * 74 * Math.pow(rho / 1.225, 0.75) * (1 + 0.35 * M) * (1 + 0.62 * ab);
  return { M, h, T, T0, pr, T3, burner, ab, throttle, thrust, turbine: 1, sweep: 20 + 48 * smooth(0.4, 1.2, M), ramp: 18 * smooth(1.2, 2.3, M) };
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
    case "nozzle": return 450 + 450 * o.ab;
    default: return soak;
  }
}
export function gasAlong(path, u, o, on) {
  const T0 = o.T0 - K;
  const ab = on ? 900 * o.ab * smooth(0.55, 0.65, u) : 0;
  if (path === "core") {
    if (u < 0.22) return T0;
    if (u < 0.34) return T0 + (o.T3 - o.T0) * (u - 0.22) / 0.12;
    if (u < 0.42) return on ? o.burner - K : o.T3 - K;
    if (u < 0.55) return on ? (o.burner - K) * 0.6 : o.T3 - K;
    return (on ? (o.burner - K) * 0.6 : o.T3 - K) * 0.85 + ab;
  }
  return u < 0.55 ? T0 + 60 * smooth(0.12, 0.25, u) : T0 + 60 + 0.4 * ab + (on ? 250 * smooth(0.55, 0.65, u) : 0);
}
