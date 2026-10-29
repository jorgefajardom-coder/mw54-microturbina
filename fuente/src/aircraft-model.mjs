// Fig 2: dos MW54 instaladas en un bimotor de aeromodelismo genérico. El avión es un diseño de referencia (no un
// modelo comercial concreto); la instalación sigue lo que piden Wren y la práctica habitual en reactores RC:
// góndolas abiertas sin bypass ni encapsulado (el motor toma el aire que necesita), montura de dos piezas sobre el
// motor, una ECU y una bomba por motor, depósito principal con depósito de alimentación (hopper) en el centro de
// gravedad, tubo Tygon del depósito a la bomba y racores Festo de 3 mm de la bomba al motor, gas de arranque con
// su electroválvula por motor, receptor con baterías dobles.
import { SPEC, op } from "./model.mjs";

export const PLANE = {
  span: 1900,
  length: 1800,
  fuselageR: 92,
  nacelleY: 330,
  dryMass: 8.5,
};

// Consumo de referencia: TSFC típico de microturbina, ~0,15 kg/(N·h); queroseno a 0,8 kg/L.
const TSFC = 0.15;
export function twin(f) {
  const o = op(f);
  const perEngine = (o.thrust * TSFC) / 3600 / 0.8 * 1e6 / 1000 * 60; // ml/min
  return { ...o, total: o.thrust * 2, fuel: perEngine * 2 };
}
export const TANK_ML = 3000;
export const HOPPER_ML = 250;
export const MAX_TWIN = twin(1);

export const SYSTEMS = {
  airframe: { name: "Célula", say: `Bimotor de referencia · ${PLANE.span} mm de envergadura · ${PLANE.length} mm de largo` },
  nacelles: { name: "Góndolas", say: "Góndolas abiertas: el aire entra libre por delante, sin bypass, como pide Wren" },
  engines: { name: "Dos MW54", say: `2 × MW54 · ${SPEC.thrustMax * 2} N entre las dos · ${SPEC.mass * 2} g` },
  mounts: { name: "Monturas", say: "Montura de dos piezas sobre la carcasa: dos abrazaderas y su soporte al pilón" },
  fuel: { name: "Combustible", say: `Depósito de ${TANK_ML / 1000} L y hopper de ${HOPPER_ML} ml · Tygon hasta las bombas, Festo de 3 mm hasta los motores` },
  pumps: { name: "Bombas y válvulas", say: "Una bomba por motor y una electroválvula de combustible y otra de gas por motor" },
  gas: { name: "Gas de arranque", say: "Botella de propano-butano para el encendido con la bujía" },
  ecu: { name: "ECU", say: "Una ECU por motor: arranque, bujía, temperatura y gas" },
  radio: { name: "Radio", say: "Receptor con dos baterías y su interruptor" },
  gear: { name: "Tren", say: "Tren triciclo: rueda de morro y dos principales bajo el ala" },
};
