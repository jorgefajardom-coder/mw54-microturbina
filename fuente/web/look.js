// Aspecto común de los visores: iluminación de estudio (sol, relleno frío y contraluz), posproceso con oclusión
// ambiental (GTAO) y resplandor (bloom) según la gama del dispositivo, microdetalle procedural para los metales (que no
// tienen coordenadas de textura) y el brillo de cuerpo negro del metal caliente.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// Carga del modelo con el decodificador Draco servido por el propio sitio (sin esperar a otro dominio). Se llama al
// empezar, antes de montar la escena, para que la descarga corra en paralelo con todo lo demás.
export async function loadModel(url, decoder, { workerLimit = 2 } = {}) {
  const draco = new DRACOLoader().setDecoderPath(decoder).setDecoderConfig({ type: "wasm" });
  draco.setWorkerLimit(workerLimit);
  draco.preload();
  try {
    return await new GLTFLoader().setDRACOLoader(draco).loadAsync(url);
  } finally {
    draco.dispose();
  }
}

// Si el teléfono se queda sin memoria de vídeo, el navegador quita el contexto WebGL y el lienzo queda negro: se avisa
// y, cuando lo devuelve, se recarga la página.
export function guardContext(renderer) {
  const canvas = renderer.domElement;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    const note = document.createElement("div");
    note.id = "lost";
    note.textContent = "Recuperando el visor…";
    Object.assign(note.style, { position: "fixed", inset: "0", display: "grid", placeItems: "center", color: "#cfd6df", font: "14px system-ui", background: "#0d0f12", zIndex: "50" });
    document.body.appendChild(note);
  });
  canvas.addEventListener("webglcontextrestored", () => location.reload());
}

// Relleno frío desde el lado opuesto al sol y contraluz cálido que recorta la silueta contra el fondo oscuro.
// `size` es la escala del objeto en metros (1,5 para la maqueta, 20–30 para los aviones).
export function studioLights(scene, size) {
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.32);
  fill.position.set(-1.4, 0.8, -1.1).multiplyScalar(size * 2);
  const rim = new THREE.DirectionalLight(0xffe2c0, 0.9);
  rim.position.set(-0.6, 1.2, 1.6).multiplyScalar(size * 2);
  scene.add(fill, rim);
  return { fill, rim };
}

// Escritorio conserva el posproceso; celular dibuja directo sin descargar los pases.
// `aoRadius` en unidades de escena; devuelve { render(), setSize(w, h), bloom }.
export async function createComposer(renderer, scene, camera, profile, options = {}) {
  if (profile.kind === "celular" || profile.tier === "baja") {
    return { render: () => renderer.render(scene, camera), setSize() {}, bloom: null };
  }
  const { createDesktopComposer } = await import("./postprocessing.js");
  return createDesktopComposer(renderer, scene, camera, profile, options);
}

// Microdetalle para metales sin UV: ruido en coordenadas del objeto (en mm del modelo) que varía la rugosidad, deja
// marcas de mecanizado a lo largo del eje y altera apenas el relieve y el tono, para que el metal no parezca liso.
const NOISE = /* glsl */ `
  varying vec3 vObjPos;
  float lkH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float lkN(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(lkH(i), lkH(i + vec3(1,0,0)), f.x), mix(lkH(i + vec3(0,1,0)), lkH(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(lkH(i + vec3(0,0,1)), lkH(i + vec3(1,0,1)), f.x), mix(lkH(i + vec3(0,1,1)), lkH(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float lkF(vec3 p){ return .5 * lkN(p) + .25 * lkN(p * 2.03) + .125 * lkN(p * 4.07) + .125 * lkN(p * 8.11); }
  float lkBrush(vec3 p){ return lkN(vec3(p.x * .01, p.y * .35, p.z * .35)); }
`;
export function enrichMetal(material, { scale = 1 } = {}) {
  if (material.userData.enriched) return;
  material.userData.enriched = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uLkScale = { value: scale };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uLkScale;\n${NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 lkP = vObjPos * uLkScale;
        // el detalle fino se apaga cuando es más pequeño que un píxel (si no, centellea)
        float lkAA = clamp(1. - length(fwidth(lkP)) * .25, 0., 1.);
        float lkBig = lkF(lkP * .012);
        float lkFine = mix(.5, lkBrush(lkP), lkAA);
        diffuseColor.rgb *= .9 + .16 * lkBig + .05 * (lkFine - .5);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (.72 + .5 * lkBig) + .12 * (lkFine - .5), .04, 1.);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        float lkHgt = (.6 * lkBrush(lkP) + .4 * lkF(lkP * .06)) * lkAA;
        vec3 lkDx = dFdx(-vViewPosition), lkDy = dFdy(-vViewPosition);
        float lkHx = dFdx(lkHgt), lkHy = dFdy(lkHgt);
        vec3 lkR1 = cross(lkDy, normal), lkR2 = cross(normal, lkDx);
        float lkDet = dot(lkDx, lkR1);
        vec3 lkGrad = sign(lkDet) * (lkHx * lkR1 + lkHy * lkR2) * .12;
        normal = normalize(abs(lkDet) * normal - lkGrad);`);
  };
  material.needsUpdate = true;
}

// Color de cuerpo negro aproximado para el metal caliente: invisible por debajo de ~520 °C, rojo oscuro, naranja,
// amarillo. Devuelve la intensidad ya multiplicada en el color.
const glowColor = new THREE.Color();
export function blackbody(T) {
  const k = Math.min(1, Math.max(0, (T - 520) / 700));
  if (k <= 0) return glowColor.setRGB(0, 0, 0);
  glowColor.setRGB(1, 0.22 + 0.55 * k * k, 0.04 + 0.25 * k * k * k);
  return glowColor.multiplyScalar(0.25 * k * k * 3.2);
}

// ── despiece pieza por pieza: cada pieza sale por un camino libre (primero en horizontal y luego en vertical, o al
//    revés si su dato `path` es "v", o pasando por el punto `via`). Los extremos
//    quedan fijos: sin flotación aleatoria ni rebotes fuera del encaje. ──
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const H = new THREE.Vector3();
const V = new THREE.Vector3();
export function organicPose(e, time, { up }) {
  const t = Math.min(1, Math.max(0, e.t));
  const k = eio(t);
  const L = e.offset.length();
  V.copy(up).multiplyScalar(e.offset.dot(up));
  H.copy(e.offset).sub(V);
  const [first, second] = e.data.path === "v" ? [V, H] : [H, V];
  e.obj.position.copy(e.home);
  // `via`: punto de paso (sale primero hasta él, por ejemplo hacia delante por la boca de la toma, y luego al destino)
  if (e.via) e.obj.position.addScaledVector(e.via, Math.min(1, k * 2)).addScaledVector(H.copy(e.offset).sub(e.via), Math.max(0, (k - 0.5) * 2));
  else if (first.length() < 0.05 * L || second.length() < 0.05 * L) e.obj.position.addScaledVector(e.offset, k);
  else e.obj.position.addScaledVector(first, k < 0.5 ? k * 2 : 1).addScaledVector(second, k > 0.5 ? (k - 0.5) * 2 : 0);
  e.obj.quaternion.copy(e.quat);
}

// Orden de desarme: tren, cubiertas (góndolas, cabina, escotillas), el motor entero, el motor pieza a pieza según su
// turno `out` (carcasa primero, lo de atrás hacia atrás, lo de delante hacia delante, el eje al final) y el resto de la
// célula de fuera hacia dentro. El montaje es el mismo orden al revés.
export function disassemblyOrder(parts, { isGear, isLate, root, isEngine }) {
  const moving = parts.filter((e) => e.offset.length() > 1e-6);
  const byOrder = (a, b) => b.data.order - a.data.order;
  const gear = moving.filter((e) => isGear(e)).sort(byOrder);
  const late = moving.filter((e) => !isGear(e) && isLate(e) && !isEngine(e) && e !== root).sort(byOrder);
  const engine = moving.filter((e) => isEngine(e) && e !== root).sort((a, b) => (a.data.out ?? 100 - a.data.order) - (b.data.out ?? 100 - b.data.order));
  const rest = moving.filter((e) => !gear.includes(e) && !late.includes(e) && !engine.includes(e) && e !== root).sort(byOrder);
  return [...gear, ...late, ...(root && root.offset.length() > 1e-6 ? [root] : []), ...engine, ...rest];
}

// Pasos de una secuencia: uno detrás de otro, cada uno empieza cuando el anterior ya casi ha llegado.
export function sequenceSteps(order, target, { speed = 1, label }) {
  const list = target ? order : order.slice().reverse();
  const maxL = Math.max(...list.map((e) => e.offset.length()), 1e-6);
  let at = 0;
  return list.map((e) => {
    const dur = (0.75 + 0.55 * (e.offset.length() / maxL)) / speed;
    const step = { e, at, dur, from: target ? 0 : 1, to: target, say: `${target ? "Desarmando" : "Montando"} · ${label(e)}` };
    at += dur * 0.8;   // casi una detrás de otra: se ve qué entra y por dónde
    return step;
  });
}
