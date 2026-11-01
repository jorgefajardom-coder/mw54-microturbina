// Arranque del visor del Hawk: una sola URL para todos. Detecta si lo abre un celular o un escritorio y carga sólo la
// interfaz y los estilos de ese dispositivo; el núcleo 3D (core.js) es el mismo para los dos.
import { detect, profileFor, loadStyle } from "./device.js";

const kind = detect();
document.documentElement.dataset.device = kind;
const [profile, ui] = await Promise.all([
  profileFor(kind),
  import(kind === "celular" ? "./mobile.js" : "./desktop.js"),
  loadStyle(new URL(kind === "celular" ? "./mobile.css" : "./desktop.css", import.meta.url)),
]);
await ui.default(profile);
