// Interfaz de celular de los visores de aviones: barra inferior (motor, despiece, corte, misión, más) y hoja con el
// resto y las palancas de gas y Mach; un toque elige una pieza, dos toques acercan la cámara. La vista se recoloca con
// cada giro y con la barra de direcciones; la calidad la fija el perfil del teléfono.
import { start, fmt } from "./core.js?v=20261031-transition10";
import { debugPanel } from "../device.js?v=20261031-transition10";
import { createPad } from "../controls.js?v=20261031-transition10";

const $ = (id) => document.getElementById(id);
const icon = (d) => `<i aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg></i>`;
const ICONS = {
  run: icon('<circle cx="12" cy="12" r="8"/><path d="M12 7v5"/>'),
  explode: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  cut: icon('<path d="M4 20L20 4"/><rect x="3" y="8" width="18" height="8" rx="2"/>'),
  mission: icon('<path d="M3 18c4-1 6-5 9-9s5-5 9-5"/><circle cx="21" cy="4" r="1.5"/>'),
  cockpit: icon('<path d="M4 15c2-5 5-8 8-8s6 3 8 8"/><path d="M8 15h8"/><path d="M12 15v4"/>'),
  fly: icon('<path d="M2 13l8-2 4-7 2 1-2 6 6 1v2l-6 1 2 6-2 1-4-7-8-2z"/>'),
  more: icon('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
};

export default async function mobile(profile, cfg) {
  const haptic = () => navigator.vibrate?.(8);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="ui" id="sheet">
      <button id="assemble">Montaje</button>
      <button id="heat">Mapa de calor</button>
      <button id="surfaces">Mandos</button>
      <button id="cut">Corte</button>
      <button id="mission">Misión</button>
      <button id="cam">Combustión</button>
      <button id="gear">Tren</button>
      <label class="chip">Gas <input id="throttle" type="range" min="0" max="100" value="${Math.round((cfg.throttle ?? 0.85) * 100)}" aria-label="Palanca de gases"></label>
      <label class="chip">Mach <input id="mach" type="range" min="0" max="${cfg.maxMach * 10}" value="0" aria-label="Mach objetivo"><output id="machv">0</output></label>
    </div>
    <nav class="ui" id="bar">
      <button id="run">${ICONS.run}<span>Motor</span></button>
      <button id="explode">${ICONS.explode}<span>Despiece</span></button>
      <button id="cockpit">${ICONS.cockpit}<span>Cabina</span></button>
      <button id="fly">${ICONS.fly}<span>Volar</span></button>
      <button id="more">${ICONS.more}<span>Más</span></button>
    </nav>
    <div id="pad" aria-hidden="true">
      <div class="stick" id="stickL"><span>Gas · timón</span><div class="knob"></div></div>
      <div class="stick" id="stickR"><span>Cabeceo · alabeo</span><div class="knob"></div></div>
      <div class="padkeys"><button data-key="e">Motor</button><button data-key="g">Tren</button><button data-key="f">Flaps</button><button data-key="b">Freno</button><button data-key="c">Vista</button><button data-key="r">Reinicio</button><button data-action="salir">Salir</button></div>
    </div>`,
  );
  profile.pad = createPad({ touch: true, haptic });
  profile.onStats = debugPanel(profile);
  profile.onFrame = (motor) => {
    if (motor.mission) $("mach").value = Math.round(motor.Mtarget * 10);
    $("machv").textContent = fmt(motor.Mtarget, 1);
  };
  const api = await start(profile, cfg);
  const A = api.actions;
  const sheet = $("sheet");
  const closeSheet = () => { sheet.removeAttribute("data-open"); $("more").removeAttribute("data-on"); };
  const tap = (id, fn, keep) => ($(id).onclick = () => { haptic(); fn(); if (!keep) closeSheet(); });
  for (const id of ["run", "explode", "cut", "mission", "assemble", "heat", "cockpit"]) tap(id, A[id]);
  tap("cam", A.pip);
  tap("gear", A.gear, true);
  tap("fly", () => { A.fly(); setFlying(api.state().flying); });
  document.querySelector('[data-action="salir"]').onclick = () => { haptic(); A.fly(); setFlying(false); };
  tap("surfaces", A.surfaces, true);
  tap("more", () => { const open = !sheet.hasAttribute("data-open"); sheet.toggleAttribute("data-open", open); $("more").toggleAttribute("data-on", open); }, true);
  $("throttle").oninput = (e) => A.throttle(e.target.value / 100);
  $("mach").oninput = (e) => A.mach(e.target.value / 10);
  api.onChange((st) => {
    for (const [id, on] of Object.entries({ explode: st.exploded, run: st.running, mission: st.mission, heat: st.heat, cut: st.cut, surfaces: st.surfaces, cam: st.pip, gear: st.gear, cockpit: st.cockpit, fly: st.flying })) $(id).toggleAttribute("data-on", on);
    $("run").lastChild.textContent = st.running ? "Apagar" : "Motor";
  });

  const card = $("card");
  new MutationObserver(() => {
    if (!card.querySelector(".close")) card.insertAdjacentHTML("beforeend", '<button class="close" aria-label="Cerrar">×</button>');
  }).observe(card, { childList: true });
  card.addEventListener("click", (ev) => { if (ev.target.closest(".close")) { api.pick(-1e4, -1e4); card.style.display = "none"; } });

  let down = null;
  let lastTap = 0;
  api.canvas.addEventListener("pointerdown", (ev) => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  api.canvas.addEventListener("pointerup", (ev) => {
    if (!down || api.state().flying || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 10 || performance.now() - down.t > 350) return;
    closeSheet();
    const name = api.pick(ev.clientX, ev.clientY);
    const now = performance.now();
    if (name && now - lastTap < 320) api.focusPicked();
    lastTap = now;
  });

  let pending = false;
  const orient = () => document.body.setAttribute("data-orient", matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait");
  const relayout = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; orient(); api.resize(); }); };
  orient();
  addEventListener("resize", relayout);
  visualViewport?.addEventListener("resize", relayout);
  screen.orientation?.addEventListener("change", relayout);

  // al volar: pantalla completa, apaisada y sin que se apague (si el navegador lo permite)
  let wake = null;
  async function setFlying(on) {
    try {
      if (on) {
        await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
        await screen.orientation?.lock?.("landscape");
        wake = await navigator.wakeLock?.request("screen");
      } else {
        screen.orientation?.unlock?.();
        if (document.fullscreenElement) await document.exitFullscreen();
        await wake?.release();
        wake = null;
      }
    } catch {
      // el navegador puede negar la pantalla completa o el bloqueo de giro; el vuelo sigue igual
    }
    relayout();
  }
}
