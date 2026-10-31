// Aspecto común de los visores: iluminación de estudio (sol, relleno frío y contraluz), posproceso con oclusión
// ambiental (GTAO) y resplandor (bloom) según la gama del dispositivo, microdetalle procedural para los metales (que no
// tienen coordenadas de textura) y el brillo de cuerpo negro del metal caliente.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// Carga del modelo con el decodificador Draco servido por el propio sitio (sin esperar a otro dominio). Se llama al
// empezar, antes de montar la escena, para que la descarga corra en paralelo con todo lo demás.
export function loadModel(url, decoder) {
  const draco = new DRACOLoader().setDecoderPath(decoder).setDecoderConfig({ type: "wasm" });
  draco.preload();
  return new GLTFLoader().setDRACOLoader(draco).loadAsync(url);
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

// Posproceso: alta gama con oclusión ambiental y resplandor, media sólo con resplandor, baja sin posproceso.
// `aoRadius` en unidades de escena; devuelve { render(), setSize(w, h), bloom }.
export function createComposer(renderer, scene, camera, profile, { aoRadius = 0.5 } = {}) {
  const tier = profile.kind === "escritorio" ? "alta" : profile.tier;
  if (tier === "baja") return { render: () => renderer.render(scene, camera), setSize() {}, bloom: null };
  const [w, h] = profile.size();
  // búfer de color con decimales sólo donde la GPU sabe dibujar en él (si no, el lienzo sale negro) y suavizado de bordes
  // con las muestras que admita
  const ext = renderer.extensions;
  const half = ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float");
  const samples = profile.antialias ? Math.min(4, renderer.capabilities.maxSamples || 0) : 0;
  const target = new THREE.WebGLRenderTarget(w, h, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (tier === "alta") {
    gtao = new GTAOPass(scene, camera, w, h);
    gtao.updateGtaoMaterial({ radius: aoRadius, distanceExponent: 1.4, thickness: aoRadius * 2, scale: 1.1, samples: 12, screenSpaceRadius: false });
    gtao.blendIntensity = 0.85;
    // la oclusión no debe ver los volúmenes de llama ni los vidrios: se esconden mientras dibuja sus normales
    const hide = gtao._overrideVisibility.bind(gtao);
    gtao._overrideVisibility = () => {
      hide();
      scene.traverse((o) => {
        if (o.isMesh && o.visible && (o.userData.noAO || (o.material?.transparent && o.material.opacity < 0.95))) { o.visible = false; gtao._visibilityCache.push(o); }
      });
    };
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.45, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(width, height) { composer.setSize(width, height); gtao?.setSize(width, height); },
    setPixelRatio(r) { composer.setPixelRatio(r); },
    bloom,
  };
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
//    revés si su dato `path` es "v", o pasando por el punto `via`), sólo gira cuando ya está fuera, se asienta con un leve rebote al volver y, ya
//    separada, flota despacio ──
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// al llegar a su sitio la pieza frena sin pasarse: un rebote la metería un instante dentro de la vecina
const back = (t) => 1 - Math.pow(1 - t, 3);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const H = new THREE.Vector3();
const V = new THREE.Vector3();
export function organicPose(e, time, { up, float = 1, dir = 1 }) {
  const t = Math.min(1, Math.max(0, e.t));
  const k = dir < 0 ? 1 - back(1 - t) : eio(t);
  const L = e.offset.length();
  e.seed ??= { phase: Math.random() * 6.28, axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), spin: (Math.random() - 0.5) * 0.8 };
  V.copy(up).multiplyScalar(e.offset.dot(up));
  H.copy(e.offset).sub(V);
  const [first, second] = e.data.path === "v" ? [V, H] : [H, V];
  e.obj.position.copy(e.home);
  // `via`: punto de paso (sale primero hasta él, por ejemplo hacia delante por la boca de la toma, y luego al destino)
  if (e.via) e.obj.position.addScaledVector(e.via, Math.min(1, k * 2)).addScaledVector(H.copy(e.offset).sub(e.via), Math.max(0, (k - 0.5) * 2));
  else if (first.length() < 0.05 * L || second.length() < 0.05 * L) e.obj.position.addScaledVector(e.offset, k);
  else e.obj.position.addScaledVector(first, k < 0.5 ? k * 2 : 1).addScaledVector(second, k > 0.5 ? (k - 0.5) * 2 : 0);
  const bob = float * Math.pow(t, 6) * L * 0.012 * Math.sin(time * 0.9 + e.seed.phase);
  e.obj.position.addScaledVector(up, bob);
  // sólo gira cuando ya está bien lejos de su sitio, nunca mientras entra o sale
  const tumble = (e.seed.spin * Math.sin(Math.PI * t) * sm(0.75, 0.95, t) + Math.pow(t, 6) * 0.02 * Math.sin(time * 0.7 + e.seed.phase)) * (dir < 0 ? sm(0.8, 1, t) : 1);
  e.obj.quaternion.copy(e.quat).multiply(new THREE.Quaternion().setFromAxisAngle(e.seed.axis, tumble));
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
