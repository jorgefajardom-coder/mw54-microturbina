// Interfaz de escritorio de los visores de aviones: barra completa (montaje, despiece, motor, gas, Mach, misión,
// calor, corte, mandos), tarjeta que sigue al cursor y clic para acercarse a la pieza.
import { start, fmt } from "./core.js";
import { debugPanel } from "../device.js";

const $ = (id) => document.getElementById(id);

export default async function desktop(profile, cfg) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="ui" id="controls">
      <button id="explode">Despiece</button>
      <button id="run"><span class="lamp"></span><span>Arrancar</span></button>
      <label class="chip">Gas <input id="throttle" type="range" min="0" max="100" value="${Math.round((cfg.throttle ?? 0.85) * 100)}" aria-label="Palanca de gases"></label>
      <label class="chip">Mach <input id="mach" type="range" min="0" max="${cfg.maxMach * 10}" value="0" aria-label="Mach objetivo"><output id="machv">0</output></label>
      <button id="mission">Misión</button>
      <button id="heat">Mapa de calor</button>
      <button id="cut">Corte</button>
      <button id="surfaces">Mandos</button>
    </div>`,
  );
  profile.onStats = debugPanel(profile);
  profile.onFrame = (motor) => {
    if (motor.mission) $("mach").value = Math.round(motor.Mtarget * 10);
    $("machv").textContent = fmt(motor.Mtarget, 1);
  };
  const api = await start(profile, cfg);
  const A = api.actions;
  for (const id of ["explode", "run", "mission", "heat", "cut", "surfaces"]) $(id).onclick = A[id];
  $("throttle").oninput = (e) => A.throttle(e.target.value / 100);
  $("mach").oninput = (e) => A.mach(e.target.value / 10);
  api.onChange((st) => {
    for (const [id, on] of Object.entries({ explode: st.exploded, run: st.running, mission: st.mission, heat: st.heat, cut: st.cut, surfaces: st.surfaces })) $(id).toggleAttribute("data-on", on);
    $("explode").textContent = st.exploded ? "Montar" : "Despiece";
    $("run").lastChild.textContent = st.running ? "Apagar" : "Arrancar";
  });
  const tip = $("tip");
  api.canvas.addEventListener("pointermove", (ev) => {
    const name = api.pick(ev.clientX, ev.clientY);
    document.body.toggleAttribute("data-hover", !!name);
    if (name) { tip.style.left = `${ev.clientX + 14}px`; tip.style.top = `${ev.clientY + 10}px`; tip.textContent = name; }
  });
  api.canvas.addEventListener("pointerleave", () => document.body.removeAttribute("data-hover"));
  api.canvas.addEventListener("dblclick", () => api.focusPicked());
  addEventListener("resize", api.resize);
}
