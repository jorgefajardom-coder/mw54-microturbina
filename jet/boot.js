// Arranque de una página de avión: detecta el dispositivo, carga sus estilos y su interfaz, y le pasa la config del
// avión. Misma URL en celular y en escritorio.
import { detect, profileFor, loadStyle } from "../device.js?v=20261031-motion5";

export async function boot(cfg) {
  const kind = detect();
  document.documentElement.dataset.device = kind;
  const [profile, ui] = await Promise.all([
    profileFor(kind),
    import(kind === "celular" ? "./mobile.js?v=20261031-motion5" : "./desktop.js?v=20261031-motion5"),
    loadStyle(new URL(kind === "celular" ? "../mobile.css" : "../desktop.css", import.meta.url)),
  ]);
  await ui.default(profile, cfg);
}
