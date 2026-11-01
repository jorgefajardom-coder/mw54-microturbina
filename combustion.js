// Modelo visual de régimen; no resuelve química ni dinámica de fluidos.
const clamp = (x) => Math.min(1, Math.max(0, x));
const ramp = (a, b, x) => { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); };
export function createCombustion() {
  const state = { flame: 0, startup: 0, afterburner: 0, ram: 0, flow: 0 };
  return {
    state,
    update(dt, motor, cycle = {}) {
      const fuel = motor.on && motor.spin > .15;
      const throttle = motor.thr ?? motor.f ?? 0;
      const target = fuel ? .55 + .45 * clamp(throttle) : 0;
      const follow = (key, value, tau) => { state[key] += (value-state[key])*(1-Math.exp(-Math.max(0,dt)/tau)); };
      follow('flame', target, fuel ? .18 : .08);
      // El metal conserva calor al cortar combustible, pero la llama se extingue.
      state.startup = fuel ? (1-ramp(.2,.72,motor.spin)) : 0;
      follow('afterburner', fuel ? clamp(cycle.ab ?? 0) : 0, fuel ? .25 : .08);
      follow('ram', fuel ? clamp(cycle.ram ?? 0) : 0, .2);
      state.flow = fuel ? .4 + 1.6 * clamp(throttle) : 0;
      return state;
    },
  };
}
// Zonas alineadas con las estaciones del modelo termodinámico existente.
// El gas caliente en la turbina no implica una llama activa allí.
export function reactionAt(engine, path, u, state, cycle = {}) {
  const band = (a,b) => ramp(a,a+.018,u)*(1-ramp(b-.025,b,u));
  if (path === 'ram') return state.flame * state.ram * band(.3,.85);
  if (path !== 'core' && path !== 'turbo') return 0;
  const [a,b] = {F110:[.34,.42],F119:[.32,.4],J58:[.4,.47],TBCC:[.36,.46]}[engine] ?? [.32,.42];
  const primary = band(a,b) * (cycle.turbine ?? 1);
  const abStart = engine === 'J58' ? .47 : engine === 'TBCC' ? .6 : .55;
  return state.flame * primary + state.afterburner * band(abStart,.94);
}
