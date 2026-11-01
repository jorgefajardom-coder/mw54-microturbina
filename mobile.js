// Interfaz de celular del Hawk: barra inferior con lo esencial (motor, despiece, cabina, volar) y una hoja "Más" con el
// resto; un toque elige una pieza y abre su tarjeta, dos toques acercan la cámara. Al volar pasa a pantalla completa
// en horizontal, mantiene la pantalla encendida y muestra las palancas táctiles. La vista se recoloca con cada giro y
// con la barra de direcciones del navegador; la calidad la fija el perfil del teléfono (device.js).
import { start } from "./core.js";
import { createPad } from "./controls.js";
import { debugPanel } from "./device.js";

const $ = (id) => document.getElementById(id);
const icon = (d) => `<i aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg></i>`;
const ICONS = {
  run: icon('<circle cx="12" cy="12" r="8"/><path d="M12 7v5"/>'),
  explode: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  cam: icon('<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/><path d="M12 21a2 2 0 0 0 2-2c0-1.5-2-3-2-3s-2 1.5-2 3a2 2 0 0 0 2 2z"/>'),
  cockpit: icon('<path d="M4 15c2-5 5-8 8-8s6 3 8 8"/><path d="M8 15h8"/><path d="M12 15v4"/>'),
  fly: icon('<path d="M2 13l8-2 4-7 2 1-2 6 6 1v2l-6 1 2 6-2 1-4-7-8-2z"/>'),
  more: icon('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
};

export default async function mobile(profile) {
  const haptic = () => navigator.vibrate?.(8);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="ui" id="sheet">
      <button id="assemble">Montaje</button>
      <button id="heat">Mapa de calor</button>
      <button id="gear">Tren</button>
      <button id="surfaces">Mandos</button>
      <label class="chip">Gas <input id="throttle" type="range" min="0" max="100" value="60" aria-label="Palanca de gas"></label>
    </div>
    <nav class="ui" id="bar">
      <button id="run">${ICONS.run}<span>Motor</span></button>
      <button id="explode">${ICONS.explode}<span>Despiece</span></button>
      <button id="cam">${ICONS.cam}<span>Combustión</span></button>
      <button id="cockpit">${ICONS.cockpit}<span>Cabina</span></button>
      <button id="fly">${ICONS.fly}<span>Volar</span></button>
      <button id="more">${ICONS.more}<span>Más</span></button>
    </nav>
    <div id="pad" aria-hidden="true">
      <div class="stick" id="stickL"><span>Gas · timón</span><div class="knob"></div></div>
      <div class="stick" id="stickR"><span>Cabeceo · alabeo</span><div class="knob"></div></div>
      <div class="console" id="consoleL">
        <button class="cmp sw guarded" data-key="e" aria-label="Arranque de la MW54"><i class="plate"><i class="bat"></i><i class="cover"></i></i><b>Arranque</b></button>
        <button class="cmp gear" data-key="g" aria-label="Palanca del tren"><i class="plate"><i class="slot"><i class="wheel"></i></i><i class="lights"><em></em><em></em><em></em></i></i><b>Tren</b></button>
        <button class="cmp flaps" data-key="f" aria-label="Palanca de flaps"><i class="plate"><i class="slot"><i class="grip"></i></i><i class="marks"><em>0</em><em>20</em><em>40</em></i></i><b>Flaps</b></button>
        <button class="cmp tee" data-key="b" aria-label="Freno, mantener"><i class="plate"><i class="handle"></i></i><b>Freno</b></button>
      </div>
      <div class="console" id="consoleR">
        <button class="cmp rotary" data-key="c" aria-label="Selector de vista"><i class="plate"><i class="dial"><i class="ptr"></i></i><i class="pos"><em>EXT</em><em>CAB</em></i></i><b>Vista</b></button>
        <button class="cmp sw" data-action="inclinar" aria-label="Inclinación con el giroscopio"><i class="plate"><i class="bat"></i><i class="led"></i></i><b>Inclinar</b></button>
        <button class="cmp push" data-key="r" aria-label="Reiniciar en la pista"><i class="plate"><i class="cap"></i></i><b>Reinicio</b></button>
        <button class="cmp eject" data-action="salir" aria-label="Salir del vuelo"><i class="plate"><i class="loop"></i></i><b>Salir</b></button>
      </div>
    </div>`,
  );
  profile.pad = createPad({ touch: true, haptic });
  profile.onStats = debugPanel(profile);
  const api = await start(profile);
  const A = api.actions;
  const sheet = $("sheet");
  // Aero y Anatomía van en «Más»: arriba quedan sólo los cinco aviones, en una fila que cabe entera
  for (const a of document.querySelectorAll("nav.sections a")) {
    if (!/aero|anatomia/.test(a.getAttribute("href"))) continue;
    const link = Object.assign(a.cloneNode(true), { className: "go" });
    link.textContent = /aero/.test(a.getAttribute("href")) ? "Aerodinámica" : "Anatomía técnica";
    sheet.appendChild(link);
    a.remove();
  }
  const closeSheet = () => { sheet.removeAttribute("data-open"); $("more").removeAttribute("data-on"); };
  const tap = (id, fn, keep) => ($(id).onclick = () => { haptic(); fn(); if (!keep) closeSheet(); });
  tap("run", A.run);
  tap("explode", A.explode);
  tap("cockpit", A.cockpit);
  tap("fly", () => { A.fly(); setFlying(api.state().flying); });
  tap("assemble", A.assemble);
  tap("heat", A.heat);
  // la cámara de combustión va en la barra, a un toque (no se esconde en «Más»)
  tap("cam", A.pip);
  tap("gear", A.gear, true);
  tap("surfaces", A.surfaces, true);
  tap("more", () => { const open = !sheet.hasAttribute("data-open"); sheet.toggleAttribute("data-open", open); $("more").toggleAttribute("data-on", open); }, true);
  $("throttle").oninput = (e) => A.throttle(e.target.value / 100);
  document.querySelector('[data-action="salir"]').onclick = () => { haptic(); A.fly(); setFlying(false); };
  api.onChange((st) => {
    for (const [id, on] of Object.entries({ explode: st.exploded, run: st.running, heat: st.heat, cam: st.pip, gear: st.gear, surfaces: st.surfaces, cockpit: st.cockpit, fly: st.flying })) $(id).toggleAttribute("data-on", on);
    $("run").lastChild.textContent = st.running ? "Apagar" : "Motor";
  });

  // la tarjeta lleva su botón de cerrar (el núcleo reescribe su contenido en cada actualización)
  const card = $("card");
  new MutationObserver(() => {
    if (!card.querySelector(".close")) card.insertAdjacentHTML("beforeend", '<button class="close" aria-label="Cerrar">×</button>');
  }).observe(card, { childList: true });
  card.addEventListener("click", (ev) => { if (ev.target.closest(".close")) { api.pick(-1e4, -1e4); card.style.display = "none"; } });

  // un toque elige; dos toques seguidos sobre la misma pieza acercan la cámara. Arrastrar sigue girando la vista.
  let down = null;
  let lastTap = 0;
  api.canvas.addEventListener("pointerdown", (ev) => { down = { x: ev.clientX, y: ev.clientY, t: performance.now(), n: ev.isPrimary }; });
  api.canvas.addEventListener("pointerup", (ev) => {
    if (!down || api.state().flying || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 10 || performance.now() - down.t > 350) return;
    closeSheet();
    const name = api.pick(ev.clientX, ev.clientY);
    const now = performance.now();
    if (name && now - lastTap < 320) api.focusPicked();
    lastTap = now;
  });

  // giro, barra de direcciones y teclado virtual cambian el tamaño útil: se recoloca la vista en el siguiente cuadro
  let pending = false;
  const orient = () => document.body.setAttribute("data-orient", matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait");
  const relayout = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; orient(); api.resize(); }); };
  orient();
  addEventListener("resize", relayout);
  visualViewport?.addEventListener("resize", relayout);
  screen.orientation?.addEventListener("change", relayout);

  // volar: pantalla completa en horizontal y pantalla encendida, si el navegador lo permite
  let wake = null;
  // los mandos de cabina muestran el estado real del avión: tren (luces y pomo), flaps en su retén, arranque, freno
  // y la vista elegida, leídos de la simulación mientras se vuela
  const pad = $("pad");
  function paintConsole() {
    const sim = window.__sim;
    const s = sim?.flight?.state;
    if (!document.body.hasAttribute("data-flying") || !s) return;
    const t = sim.gearState?.t ?? 0;
    const gear = t < 0.05 ? "down" : t > 0.95 ? "up" : "transit";
    const flap = String(Math.round(s.flap * 2));
    if (pad.dataset.gear !== gear) pad.dataset.gear = gear;
    if (pad.dataset.flap !== flap) pad.dataset.flap = flap;
    if (pad.dataset.cam !== s.cam) pad.dataset.cam = s.cam;
    pad.toggleAttribute("data-motor", !!sim.motor?.on);
    pad.toggleAttribute("data-brake", s.brake > 0);
    requestAnimationFrame(paintConsole);
  }
  async function setFlying(on) {
    if (on) requestAnimationFrame(paintConsole);
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
