// Interfaz de escritorio del Hawk: barra completa de botones, tarjeta que sigue al cursor, clic para acercarse a una
// pieza, teclado para volar (W/S, A/D, Z/X, Mayús/Ctrl…) y mando de juego si hay uno conectado.
import { start } from "./core.js";
import { createPad } from "./controls.js";
import { debugPanel } from "./device.js";

const $ = (id) => document.getElementById(id);

export default async function desktop(profile) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="ui" id="controls">
      <button id="assemble">Montaje</button>
      <button id="explode">Despiece</button>
      <button id="run"><span class="lamp"></span><span>Arrancar</span></button>
      <label class="chip">Gas <input id="throttle" type="range" min="0" max="100" value="60" aria-label="Palanca de gas"></label>
      <button id="heat">Mapa de calor</button>
      <button id="cam">Cámara de combustión</button>
      <button id="gear">Tren</button>
      <button id="surfaces">Mandos</button>
      <button id="cockpit">Cabina</button>
      <button id="fly">Volar</button>
    </div>
    <div class="ui" id="keys">E arrancar · Mayús/Ctrl gas · W/S cabeceo · A/D alabeo · Z/X timón · G tren · F flaps · B frenos · T giróscopo · C cámara · R reiniciar</div>`,
  );
  profile.pad = createPad({ touch: false });
  profile.onStats = debugPanel(profile);
  const api = await start(profile);
  const A = api.actions;
  for (const [id, fn] of Object.entries({ assemble: A.assemble, explode: A.explode, run: A.run, heat: A.heat, cam: A.pip, gear: A.gear, surfaces: A.surfaces, cockpit: A.cockpit, fly: A.fly })) $(id).onclick = fn;
  $("throttle").oninput = (e) => A.throttle(e.target.value / 100);
  api.onChange((st) => {
    for (const [id, on] of Object.entries({ explode: st.exploded, run: st.running, heat: st.heat, cam: st.pip, gear: st.gear, surfaces: st.surfaces, cockpit: st.cockpit, fly: st.flying })) $(id).toggleAttribute("data-on", on);
    $("run").lastChild.textContent = st.running ? "Apagar" : "Arrancar";
    $("fly").textContent = st.flying ? "Volver al taller" : "Volar";
  });

  // el cursor elige la pieza y su nombre lo acompaña; un clic acerca la cámara
  const tip = $("tip");
  api.canvas.addEventListener("pointermove", (ev) => {
    const name = api.pick(ev.clientX, ev.clientY);
    document.body.toggleAttribute("data-hover", !!name);
    if (name) { tip.style.left = `${ev.clientX + 14}px`; tip.style.top = `${ev.clientY + 10}px`; tip.textContent = name; }
  });
  api.canvas.addEventListener("pointerleave", () => document.body.removeAttribute("data-hover"));
  api.canvas.addEventListener("click", () => api.focusPicked());
  addEventListener("resize", api.resize);
}
