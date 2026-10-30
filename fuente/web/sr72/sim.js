// Modelo del vuelo y del TBCC del SR-72: la fuente de cada número de la página.
// Lo físico es exacto (atmósfera estándar, temperatura de remanso T₀ = T·(1 + 0,2·M²)). Lo propio del motor son
// estimaciones de orden de magnitud a partir de lo publicado: un turbofán de la clase F100/F110 (≈ 129 kN con
// postquemador al nivel del mar) que entrega el relevo hacia Mach 3, cuando T₀ supera lo que aguanta el compresor, y un
// estatorreactor de modo dual que quema en subsónico (ramjet) hasta Mach 5 y en supersónico (scramjet) por encima.

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const K = 273.15;

// Altitud de la trayectoria de subida típica (km): despegue, aceleración transónica y crucero a 24 km (80.000 ft).
export const altitude = (M) => (M < 0.25 ? 0 : Math.min(24.4, 1 + M * 4.1));

// Atmósfera estándar internacional (K) hasta 32 km.
export function isa(h) {
  if (h < 11) return 288.15 - 6.5 * h;
  if (h < 20) return 216.65;
  return 216.65 + (h - 20);
}

export function modeOf(M) {
  if (M < 2.5) return { key: "turbo", name: "Turbofán", say: "El turbofán respira por la compuerta abierta; el estatorreactor está cerrado." };
  if (M < 3.2) return { key: "trans", name: "Transición", say: "Se enciende el estatorreactor y la compuerta pasa el aire de un camino al otro mientras el turbofán se apaga." };
  if (M < 5) return { key: "ram", name: "Ramjet", say: "Combustión subsónica: el aire se frena en el aislador antes de quemarse." };
  return { key: "scram", name: "Scramjet", say: "Combustión supersónica: el aire cruza la cámara a más de Mach 1." };
}

// Estado del sistema para un Mach y una posición de gases (0–1).
export function op(M, throttle) {
  const h = altitude(M);
  const T = isa(h);
  const T0 = T * (1 + 0.2 * M * M);
  const turbine = 1 - smooth(2.5, 3.2, M); // peso del turbofán en el empuje
  const ram = smooth(2.4, 3.0, M); // estatorreactor encendido
  const scram = smooth(4.5, 5.5, M); // fracción de la cámara en combustión supersónica
  const ab = smooth(0.75, 0.95, throttle) * turbine; // postquemador
  const rho = 1.225 * Math.exp(-h / 7.6);
  // empuje por motor (kN): el turbofán pierde con la altura, el estatorreactor gana con la presión de remanso
  const fTurb = throttle * (78 + 52 * ab / Math.max(turbine, 1e-3)) * turbine * Math.pow(rho / 1.225, 0.7) * (1 + 0.25 * M);
  const fRam = throttle * ram * 1.2 * rho * Math.pow(340 * M, 2) * 0.62 * (1 - 0.35 * scram) / 1000;
  // la compresión dinámica sustituye al compresor: su relación de presiones cae con el Mach para no pasarse de T₃
  const pr = 1 + (25 * Math.pow(throttle, 0.6) * turbine) / (1 + 0.9 * M * M);
  const T3 = T0 * (1 + (Math.pow(pr, 0.2857) - 1) / 0.86);
  return {
    M, h, T, T0, turbine, ram, scram, ab, throttle, pr, T3,
    thrust: fTurb + fRam,
    splitter: smooth(2.5, 3.2, M), // 0: cierra el estatorreactor · 1: cierra el turbofán
    ramp: 3 + 11 * smooth(0.8, 6, M), // deflexión de la rampa (°)
    rpm: 14500 * (0.35 + 0.65 * throttle) * turbine,
    burner: T3 + (1050 + 300 * throttle) * turbine * (throttle > 0.02 ? 1 : 0), // gas en la cámara (K)
    ramGas: T0 + 1500 * throttle * ram, // gas en la cámara del estatorreactor (K)
  };
}

// Temperatura objetivo del metal de cada zona (°C). Las piezas refrigeradas con combustible se quedan muy por debajo
// del gas; las de matriz cerámica trabajan casi a la temperatura de remanso.
export function metalOf(zone, o, on) {
  const amb = o.T - K;
  const T0 = o.T0 - K;
  // el turbofán, cerrado tras la compuerta y en una bahía aislada y refrigerada, sólo recibe parte del calor
  const soak = amb + 0.3 * (T0 - amb);
  const running = on ? 1 : 0;
  switch (zone) {
    case "lip": return T0;
    case "inlet": return 0.94 * T0 + 0.06 * amb;
    case "duct": return o.turbine > 0.05 ? T0 : soak * 0.8;
    case "fan": return o.turbine > 0.05 ? T0 + 25 * running : soak * 0.75;
    case "hpc": return (o.turbine > 0.05 ? o.T3 - K : soak * 0.7) * (running ? 1 : 0.95);
    case "burner": return running && o.turbine > 0.05 ? 0.55 * (o.burner - K) : soak * 0.6;
    case "turbine": return running && o.turbine > 0.05 ? 0.58 * (o.burner - K) - 40 : soak * 0.6;
    case "shaft": return running && o.turbine > 0.05 ? 180 + 220 * o.throttle : soak * 0.5;
    case "case": return running && o.turbine > 0.05 ? 0.55 * (o.T3 - K) + 80 : soak * 0.6;
    case "ab": return running && o.turbine > 0.05 ? 520 + 420 * o.ab : soak * 0.6;
    case "abnozzle": return running && o.turbine > 0.05 ? 480 + 450 * o.ab : soak * 0.6;
    case "isolator": return 0.55 * T0 + amb * 0.45 * (1 - o.ram) + (running ? 120 * o.ram : 0);
    case "injector": return 0.5 * T0 + (running ? 0.35 * (o.ramGas - o.T0) * o.ram : 0);
    case "scram": return 0.55 * T0 + (running ? 0.35 * (o.ramGas - o.T0) * o.ram : 0);
    case "nozzle": return 0.45 * T0 + (running ? 0.35 * Math.max(o.ab * 1900, o.ram * (o.ramGas - K)) : 0);
    default: return amb;
  }
}

// Temperatura del gas a lo largo de cada camino (para colorear el flujo en el corte), u ∈ [0, 1].
export function gasAlong(path, u, o, on) {
  const T0 = o.T0 - K;
  if (path === "turbo") {
    if (u < 0.22) return T0;
    if (u < 0.36) return T0 + (o.T3 - o.T0) * (u - 0.22) / 0.14;
    if (u < 0.46) return on ? o.burner - K : o.T3 - K;
    if (u < 0.6) return on ? (o.burner - K) * 0.62 : o.T3 - K;
    return on ? (o.burner - K) * 0.62 + 900 * o.ab * smooth(0.6, 0.7, u) : o.T3 - K;
  }
  if (u < 0.3) return T0 * 0.9;
  return on ? T0 + (o.ramGas - o.T0) * o.ram * smooth(0.3, 0.55, u) * (u > 0.85 ? 0.8 : 1) : T0;
}
