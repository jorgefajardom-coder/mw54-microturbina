// Mandos para volar sin teclado: en celular, dos palancas táctiles dispuestas como una emisora de radiocontrol en modo 2
// (izquierda: gas sin retorno y timón; derecha: cabeceo y alabeo con retorno al centro); en los dos, cualquier mando de
// juego conectado (Gamepad API, distribución estándar). Los botones repiten las teclas del simulador, así no hay dos
// lógicas de vuelo. `touch` sólo es verdadero en la interfaz de celular, que crea las palancas antes de llamar aquí.

const DEAD = 0.12;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));
const key = (k, down) => dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: k }));

function stick(el, { spring }) {
  const knob = el.querySelector(".knob");
  const v = { x: 0, y: 0 };
  let id = null;
  const place = () => {
    const r = el.clientWidth / 2 - 26;
    knob.style.transform = `translate(${v.x * r}px, ${v.y * r}px)`;
  };
  const move = (ev) => {
    const b = el.getBoundingClientRect();
    const r = b.width / 2 - 26;
    let x = (ev.clientX - b.left - b.width / 2) / r;
    let y = (ev.clientY - b.top - b.height / 2) / r;
    const m = Math.hypot(x, y);
    if (m > 1 && spring.y) { x /= m; y /= m; }
    v.x = Math.max(-1, Math.min(1, x));
    v.y = Math.max(-1, Math.min(1, y));
    place();
  };
  el.addEventListener("pointerdown", (ev) => { id = ev.pointerId; el.setPointerCapture(id); move(ev); ev.preventDefault(); });
  el.addEventListener("pointermove", (ev) => { if (ev.pointerId === id) move(ev); });
  const end = (ev) => {
    if (ev.pointerId !== id) return;
    id = null;
    if (spring.x) v.x = 0;
    if (spring.y) v.y = 0;
    place();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  return { v, place, held: () => id !== null };
}

// Inclinación: el giroscopio del teléfono como palanca de cabeceo y alabeo. El centro es la postura en la que se tiene
// el teléfono al activarla (o al girar la pantalla); ±25° es palanca a fondo, con 2° muertos y la misma curva suave
// cerca del centro que usan las emisoras. En iPhone Safari pide permiso, y sólo desde un toque.
function tiltSensor() {
  const t = { on: false, base: null, roll: 0, pitch: 0 };
  const expo = (v) => 0.35 * v + 0.65 * v * v * v;
  const dead = (v) => Math.max(-1, Math.min(1, (Math.sign(v) * Math.max(0, Math.abs(v) - 2)) / 23));
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    const ang = ((screen.orientation?.angle ?? window.orientation ?? 0) + 360) % 360;
    // ejes del teléfono → ejes de la pantalla según cómo está girada
    const r = ang === 90 ? e.beta : ang === 270 ? -e.beta : e.gamma;
    const p = ang === 90 ? -e.gamma : ang === 270 ? e.gamma : e.beta;
    if (!t.base || t.base.ang !== ang) t.base = { r, p, ang };
    t.roll = expo(dead(r - t.base.r));
    t.pitch = expo(dead(p - t.base.p));
  }
  t.set = async (on) => {
    if (on && typeof DeviceOrientationEvent?.requestPermission === "function") {
      try { if ((await DeviceOrientationEvent.requestPermission()) !== "granted") return t.on; } catch { return t.on; }
    }
    t.on = on;
    t.base = null;
    t.roll = t.pitch = 0;
    if (on) addEventListener("deviceorientation", onTilt);
    else removeEventListener("deviceorientation", onTilt);
    return t.on;
  };
  return t;
}

export function createPad({ touch = false, haptic = () => {} } = {}) {
  const L = touch ? stick(document.getElementById("stickL"), { spring: { x: true, y: false } }) : null;
  const R = touch ? stick(document.getElementById("stickR"), { spring: { x: true, y: true } }) : null;
  for (const b of document.querySelectorAll("#pad [data-key]")) {
    const k = b.dataset.key;
    b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); haptic(); key(k, true); });
    for (const t of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(t, () => key(k, false));
  }
  const tilt = tiltSensor();
  const tiltBtn = document.querySelector('#pad [data-action="inclinar"]');
  if (tiltBtn && !("DeviceOrientationEvent" in window)) tiltBtn.remove();
  else tiltBtn?.addEventListener("click", async () => { haptic(); tiltBtn.toggleAttribute("data-on", await tilt.set(!tilt.on)); });
  // mando de juego: A tren, B flaps, X motor, Y vista, gatillo derecho freno, Start reinicio
  const MAP = { 0: "g", 1: "f", 2: "e", 3: "c", 7: "b", 9: "r" };
  const was = {};
  let used = false;
  function gamepad() {
    const gp = [...(navigator.getGamepads?.() ?? [])].find((g) => g && g.connected);
    if (!gp) return null;
    for (const [i, k] of Object.entries(MAP)) {
      const on = !!gp.buttons[i]?.pressed;
      if (on !== !!was[i]) key(k, on);
      was[i] = on;
    }
    const a = gp.axes.map(dz);
    const out = { yaw: -(a[0] ?? 0), throttleRate: -(a[1] ?? 0), roll: a[2] ?? 0, pitch: a[3] ?? 0 };
    if (Object.values(out).some((x) => x !== 0)) used = true;
    return used ? out : null;
  }
  return {
    touch,
    reset(throttle = 0) {
      if (!touch) return;
      tilt.set(false);
      tiltBtn?.removeAttribute("data-on");
      L.v.x = 0;
      L.v.y = 1 - 2 * throttle;
      R.v.x = R.v.y = 0;
      L.place();
      R.place();
    },
    // valores en [-1, 1]; throttle absoluto en [0, 1] si viene de la palanca táctil
    read() {
      const g = gamepad();
      // la palanca derecha manda sobre la inclinación mientras se toca
      const useTilt = tilt.on && !R?.held();
      const t = touch ? { pitch: useTilt ? tilt.pitch : R.v.y, roll: useTilt ? tilt.roll : R.v.x, yaw: -L.v.x, throttle: (1 - L.v.y) / 2 } : null;
      if (!g && !t) return null;
      return {
        pitch: Math.max(-1, Math.min(1, (t?.pitch ?? 0) + (g?.pitch ?? 0))),
        roll: Math.max(-1, Math.min(1, (t?.roll ?? 0) + (g?.roll ?? 0))),
        yaw: Math.max(-1, Math.min(1, (t?.yaw ?? 0) + (g?.yaw ?? 0))),
        throttle: t && (L.held() || !g) ? t.throttle : null,
        throttleRate: g?.throttleRate ?? 0,
      };
    },
  };
}
