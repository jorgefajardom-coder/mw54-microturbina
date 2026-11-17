// Arranque del visor del Hawk: una sola URL para todos. Detecta si lo abre un celular o un escritorio y carga sólo la
// interfaz y los estilos de ese dispositivo; el núcleo 3D (core.js) es el mismo para los dos.
import { detect, profileFor, loadStyle, styleURL, hasWebGL, showFailure } from "./device.js";

const kind = detect();
document.documentElement.dataset.device = kind;
if (!hasWebGL()) showFailure("Este navegador o este computador no tiene WebGL, que el visor 3D necesita.");
else {
  try {
    const [profile, ui] = await Promise.all([
      profileFor(kind),
      import(kind === "celular" ? "./mobile.js" : "./desktop.js"),
      loadStyle(styleURL(kind === "celular" ? "mobile.css" : "desktop.css")),
    ]);
    await ui.default(profile);
  } catch (err) {
    console.error(err);
    showFailure("El visor 3D no pudo arrancar en este equipo.");
  }
}
