// Arranque de una página de avión: detecta el dispositivo, carga sus estilos y su interfaz, y le pasa la config del
// avión. Misma URL en celular y en escritorio.
import { detect, profileFor, loadStyle, styleURL, hasWebGL, showFailure } from "../device.js";

export async function boot(cfg) {
  const kind = detect();
  document.documentElement.dataset.device = kind;
  if (!hasWebGL()) return showFailure("Este navegador o este computador no tiene WebGL, que el visor 3D necesita.");
  try {
    const [profile, ui] = await Promise.all([
      profileFor(kind),
      import(kind === "celular" ? "./mobile.js" : "./desktop.js"),
      loadStyle(styleURL(kind === "celular" ? "mobile.css" : "desktop.css")),
    ]);
    await ui.default(profile, cfg);
  } catch (err) {
    console.error(err);
    showFailure("El visor 3D no pudo arrancar en este equipo.");
  }
}
