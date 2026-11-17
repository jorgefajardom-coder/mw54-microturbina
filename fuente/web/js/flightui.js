// Interfaz de vuelo del celular, común al Hawk y a los jets: dos palancas como una emisora de radiocontrol y, junto a
// cada una, una consola con mandos de cabina (arranque con tapa, tren con sus luces, flaps con retenes, freno en T,
// selector de vista, inclinación, reinicio y asa de eyección) que muestran el estado real del avión. Al volar pasa a
// pantalla completa en horizontal y mantiene la pantalla encendida.

const $ = (id) => document.getElementById(id);

// `gear: false` quita la palanca del tren (los jets vuelan con el tren fijo)
export function padHTML({ engine = "el motor", gear = true } = {}) {
  return `<div id="pad" aria-hidden="true">
      <div class="stick" id="stickL"><span>Gas · timón</span><div class="knob"></div></div>
      <div class="stick" id="stickR"><span>Cabeceo · alabeo</span><div class="knob"></div></div>
      <div class="console" id="consoleL">
        <button class="cmp sw guarded" data-key="e" aria-label="Arranque de ${engine}"><i class="plate"><i class="bat"></i><i class="cover"></i></i><b>Arranque</b></button>
        ${gear ? '<button class="cmp gear" data-key="g" aria-label="Palanca del tren"><i class="plate"><i class="slot"><i class="wheel"></i></i><i class="lights"><em></em><em></em><em></em></i></i><b>Tren</b></button>' : '<button class="cmp sw" data-key="t" aria-label="Giróscopo estabilizador"><i class="plate"><i class="bat"></i><i class="led"></i></i><b>Giróscopo</b></button>'}
        <button class="cmp flaps" data-key="f" aria-label="Palanca de flaps"><i class="plate"><i class="slot"><i class="grip"></i></i><i class="marks"><em>0</em><em>20</em><em>40</em></i></i><b>Flaps</b></button>
        <button class="cmp tee" data-key="b" aria-label="Freno, mantener"><i class="plate"><i class="handle"></i></i><b>Freno</b></button>
      </div>
      <div class="console" id="consoleR">
        <button class="cmp rotary" data-key="c" aria-label="Selector de vista"><i class="plate"><i class="dial"><i class="ptr"></i></i><i class="pos"><em>EXT</em><em>CAB</em></i></i><b>Vista</b></button>
        <button class="cmp sw" data-action="inclinar" aria-label="Inclinación con el giroscopio"><i class="plate"><i class="bat"></i><i class="led"></i></i><b>Inclinar</b></button>
        <button class="cmp push" data-key="r" aria-label="Reiniciar en la pista"><i class="plate"><i class="cap"></i></i><b>Reinicio</b></button>
        <button class="cmp eject" data-action="salir" aria-label="Salir del vuelo"><i class="plate"><i class="loop"></i></i><b>Salir</b></button>
      </div>
    </div>`;
}

// enlaza la consola con la simulación y devuelve setFlying(on) para la barra y el asa de salir
export function mountFlightUI({ relayout }) {
  const pad = $("pad");
  let wake = null;
  // tren (luces y pomo), flaps en su retén, arranque, freno, giróscopo y vista, leídos de la simulación mientras se vuela
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
    pad.querySelector('[data-key="t"]')?.toggleAttribute("data-on", !!s.assist);
    requestAnimationFrame(paintConsole);
  }
  return async function setFlying(on) {
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
  };
}
