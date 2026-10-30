// Mandos para volar sin teclado: dos palancas táctiles dispuestas como una emisora de radiocontrol en modo 2 (izquierda:
// gas sin retorno y timón; derecha: cabeceo y alabeo con retorno al centro) y cualquier mando de juego conectado
// (Gamepad API, distribución estándar). Los botones repiten las teclas del simulador, así no hay dos lógicas de vuelo.

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

export function createPad() {
  const touch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  document.body.toggleAttribute("data-touch", touch);
  const L = stick(document.getElementById("stickL"), { spring: { x: true, y: false } });
  const R = stick(document.getElementById("stickR"), { spring: { x: true, y: true } });
  for (const b of document.querySelectorAll("#pad [data-key]")) {
    const k = b.dataset.key;
    b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); key(k, true); });
    for (const t of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(t, () => key(k, false));
  }
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
      L.v.x = 0;
      L.v.y = 1 - 2 * throttle;
      R.v.x = R.v.y = 0;
      L.place();
      R.place();
    },
    // valores en [-1, 1]; throttle absoluto en [0, 1] si viene de la palanca táctil
    read() {
      const g = gamepad();
      const t = touch ? { pitch: R.v.y, roll: R.v.x, yaw: -L.v.x, throttle: (1 - L.v.y) / 2 } : null;
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
