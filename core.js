// Núcleo del visor del Hawk con su MW54, común a escritorio y celular: escena, modelo, montaje, motor, combustible,
// cámara de combustión, mapa de calor, cabina y simulador. No escucha ratón, teclado ni toques: cada interfaz
// (desktop.js, mobile.js) decide cómo se usa y llama a las acciones que devuelve `start`. La calidad de imagen viene
// del perfil del dispositivo (device.js).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { op, metal, PARTS, SPEC } from "./model.js";
import { createFlight } from "./flight.js";
import { createFloor } from "./floor.js";
import { studioLights, createComposer, enrichMetal, blackbody, organicPose, disassemblyOrder, sequenceSteps, loadModel, guardContext } from "./look.js";
import { createFlame } from "./flame.js";

const $ = (id) => document.getElementById(id);
// escribe en la página sólo si el texto cambió: reescribir lo mismo cada cuadro recalcula estilos y diseño
const shown = new Map();
const put = (id, html, prop = "innerHTML") => { if (shown.get(id) !== html) { shown.set(id, html); $(id)[prop] = html; } };

export async function start(profile) {
const modelLoad = loadModel("./mw54.glb", "./draco/");
const fmt = (n) => Math.round(n).toLocaleString("es-ES");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Blender (Z arriba, mm) → glTF (Y arriba): (x, y, z) → (x, z, −y)
const fromBlender = ([x, y, z]) => new THREE.Vector3(x, z, -y);

// ── escena ──
const renderer = new THREE.WebGLRenderer({ antialias: profile.antialias, powerPreference: "high-performance" });
renderer.setPixelRatio(profile.pixelRatio);
renderer.setSize(...profile.size());
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// la luz es fija y la cámara no cambia las sombras: el mapa sólo se rehace si algo se mueve (montaje, mandos, tren,
// vuelo) y cada medio segundo por si acaso; en el teléfono ahorra redibujar la escena entera en cada cuadro
renderer.shadowMap.autoUpdate = false;
let shadowAt = 0;
renderer.localClippingEnabled = true;
$("view").appendChild(renderer.domElement);
guardContext(renderer);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f12);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;
// reflejos de una nave industrial real (Poly Haven, CC0): la pintura y el metal reflejan luces, vigas y puertas, no una caja
new HDRLoader().load("./hangar.hdr", (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.75;
  hdr.dispose();
});
const camera = new THREE.PerspectiveCamera(32, profile.size()[0] / profile.size()[1], 0.01, 50);
// el perfil decide cuánto alejar la cámara para que quepa la envergadura en esa pantalla
function homeView() {
  const k = profile.fit(camera.aspect);
  return new THREE.Vector3(1.9, 0.95, 2.1).multiplyScalar(k);
}
camera.position.copy(homeView());
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, -0.05, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.25;
controls.maxDistance = 6 * profile.fit(camera.aspect);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(2.5, 4, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 10 });
sun.shadow.bias = -0.0004;
scene.add(sun, new THREE.HemisphereLight(0xbcd2ff, 0x2a2622, 0.4));
studioLights(scene, 1.6);
const composer = createComposer(renderer, scene, camera, profile, { aoRadius: 0.05 });
// ── piso del taller (módulo compartido con la página del SR-72) ──
const ground = createFloor(renderer, {
  res: profile.textureSize,
  y: -0.18,
  fade: [2.4, 6.2],
  stand: { W: 2.6, D: 1.8, box: { x0: -0.95, x1: 1.2, z0: -0.78, z1: 0.78, arm: 0.24, w: 0.028 }, dash: [0.11, 0.2, 0.02], stops: [[-0.04, 0.238], [-0.04, -0.238], [0.6, 0]], stop: [0.03, 0.09] },
  ao: { w: 1.9, d: 1.5, x: 0.12 },
});
scene.add(ground);

// ── modelo ──
const parts = [];
let engineRoot = null;
let spinners = [];
const engineParts = {};
const gltf = await modelLoad;
const model = gltf.scene;
scene.add(model);
model.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = o.receiveShadow = true;
    // la cubeta de la cabina es una lámina abierta: se ve por las dos caras
    o.material.side = o.material.name.startsWith("Gris de cabina") ? THREE.DoubleSide : THREE.FrontSide;
    // en el teléfono la transmisión obliga a pintar la escena dos veces por cuadro (de 28 a 46 fps al quitarla en un
    // Adreno 610, medido en mw54-anatomy): el mismo tinte con transparencia se ve igual a esta escala
    if (profile.kind === "celular" && o.material.transmission > 0) {
      o.material.opacity = Math.min(o.material.opacity, 1 - 0.55 * o.material.transmission);
      o.material.transmission = 0;
      o.material.depthWrite = false;
    }
    if (o.material.transmission > 0 || o.material.opacity < 1) { o.material.transparent = true; o.castShadow = false; }
    // el combinador del HUD es una lámina casi invisible con un tinte verde, no un bloque refractivo
    if (o.material.name.startsWith("Combinador")) Object.assign(o.material, { transmission: 0, opacity: 0.16, transparent: true, depthWrite: false });
  }
  const d = o.userData;
  if (d && d.part) {
    const entry = { obj: o, data: d, home: o.position.clone(), quat: o.quaternion.clone(), offset: fromBlender(d.explode || [0, 0, 0]), t: 1, materials: [] };
    o.traverse((m) => m.isMesh && entry.materials.push(m));
    if (d.group === "engine" && d.part === "MW54") engineRoot = entry;
    else if (d.group === "MW54") engineParts[d.part] = entry;
    parts.push(entry);
  }
});
// cada pieza de la MW54 con su propio material (para que brille sola cuando se calienta) y los metales con microdetalle
const clones = new Map();
for (const e of parts) {
  for (const m of e.materials) {
    if (e.data.group === "MW54") m.material = m.material.clone();
    else if (m.material.metalness > 0.5) m.material = clones.get(m.material) ?? clones.set(m.material, m.material.clone()).get(m.material);
    if (m.material.metalness > 0.5) enrichMetal(m.material);
  }
}
for (const e of parts) for (const m of e.materials) m.userData.realMaterial = m.material;

// ── mandos y tren: cada pieza gira alrededor de su bisagra real (el eje viene del modelo de Blender) ──
const controlParts = parts.filter((e) => e.data.control).map((e) => ({ e, axis: fromBlender(e.data.hinge).normalize(), roll: e.data.roll ? fromBlender(e.data.roll).normalize() : null, range: e.data.range, kind: e.data.control, sign: e.data.sign ?? 1, rest: e.quat.clone(), angle: 0 }));
const gearState = { t: 0, target: 0 };
const surf = { roll: 0, pitch: 0, yaw: 0, flap: 0 };
const smooth01 = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
function setSurfaces(c) { Object.assign(surf, c); }
function poseControls() {
  const D = Math.PI / 180;
  for (const c of controlParts) {
    let a = 0;
    if (c.kind === "gear") a = -c.range[1] * smooth01((gearState.t - 0.1) / 0.65);
    else if (c.kind === "door") a = -c.range[1] * smooth01((gearState.t - 0.78) / 0.22);
    else if (c.kind === "aileron") a = surf.roll * c.range[1] * c.sign;
    else if (c.kind === "elevator") a = surf.pitch * (surf.pitch > 0 ? c.range[1] : -c.range[0]);
    else if (c.kind === "rudder") a = surf.yaw * c.range[1];
    else if (c.kind === "flap") a = surf.flap * c.range[1];
    // en la cabina: la palanca sigue cabeceo y alabeo, los gases la palanca del motor y los pedales el timón
    else if (c.kind === "stick") a = -surf.pitch * c.range[1];
    else if (c.kind === "throttle") a = (0.5 - motor.target) * 2 * c.range[1];
    else if (c.kind === "pedal") a = surf.yaw * c.range[1] * c.sign;
    c.angle = a;
    c.e.quat.copy(c.rest).multiply(new THREE.Quaternion().setFromAxisAngle(c.axis, a * D));
    if (c.roll) c.e.quat.multiply(new THREE.Quaternion().setFromAxisAngle(c.roll, surf.roll * c.range[1] * D));
  }
}
spinners = ["wheel", "turbine", "nut"].map((k) => engineParts[k]).filter(Boolean);
$("loading").remove();

// La pieza "física" de la que cuelga una malla (para el cursor).
const meshes = [];
for (const e of parts) for (const m of e.materials) { m.userData.entry = e; meshes.push(m); }

// ── estado del motor ──
const motor = { on: false, f: 0, target: 0.6, spin: 0, heat: 0, angle: 0, t: 0 };
const ambient = 15;
function tempOf(entry) {
  const o = op(motor.f);
  const key = entry.data.part;
  if (entry.data.group === "MW54" && metal[key]) return ambient + (metal[key](o) - ambient) * motor.heat;
  if (key === "tubo_empuje") return ambient + (o.egt - 60 - ambient) * motor.heat;
  if (key === "fuselaje.trasero") return ambient + 45 * motor.heat;
  if (key === "motor.montura") return ambient + (o.t2 + 60 - ambient) * motor.heat;
  return ambient + 4 * motor.heat;
}
const infoOf = (entry) => (entry.data.group === "MW54" ? PARTS[entry.data.part] : null);

// ── montaje y despiece ──
// La célula se monta pieza a pieza; el motor, ya armado en el aire, baja por la escotilla; cabina y escotilla al final.
const EASE = (t) => 1 - Math.pow(1 - t, 3);
let timeline = null;
let exploded = false;
function setExploded(share) {
  exploded = share > 0.5;
  for (const e of parts) e.t = share;
  applyPose();
}
// despiece orgánico (look.js): arco, giro en el camino, rebote al asentarse y flotación lenta una vez separada
const UP = new THREE.Vector3(0, 1, 0);
function applyPose(time = 0) {
  for (const e of parts) organicPose(e, time, { up: UP, dir: e.dir ?? 1 });
}
// el tren y sus compuertas no pueden bajar (el suelo está debajo): salen hacia delante y hacia fuera, por delante
// del borde de ataque, para que el ala pase luego sin tocarlos; el de morro, sólo hacia delante
for (const e of parts) {
  if (e.data.control !== "gear" && e.data.control !== "door") continue;
  const side = Math.sign(e.home.z) || 0;
  e.offset.set(side ? 250 : 220, 0, side * 260);
}
// desarme y montaje pieza por pieza por caminos libres (look.js); el montaje es el desarme al revés
const disassembly = disassemblyOrder(parts, {
  isGear: (e) => (e.data.control === "gear" && e.data.part !== "tren.morro") || e.data.control === "door",
  isLate: (e) => (e.data.group === "airframe" || e.data.group === "systems") && e.data.order >= 30,
  root: engineRoot,
  isEngine: (e) => e.data.group === "MW54",
});
const labelOf = (e) => (e === engineRoot ? "la MW54 sale por la escotilla" : infoOf(e)?.name ?? e.data.label);
function sequence(target, speed = 1) {
  const steps = sequenceSteps(disassembly, target, { speed, label: labelOf });
  for (const st of steps) st.from = st.e.t;
  timeline = { steps, start: performance.now() / 1000, total: Math.max(...steps.map((x) => x.at + x.dur)) + 0.1 };
  exploded = !!target;
  $("steps").style.display = "block";
}
function assemble(speed = 1) {
  stop();
  setExploded(1);
  for (const e of parts) if (e.offset.length() < 1e-6) e.t = 0;
  sequence(0, speed);
  queueMicrotask(() => notify());
}
function explode() {
  // si se pulsa a mitad de camino, la secuencia se da la vuelta desde donde está
  sequence(exploded ? 0 : 1);
}
function stepTimeline(now) {
  if (!timeline) return;
  const t = now - timeline.start;
  let current = null;
  for (const st of timeline.steps) {
    const k = Math.min(1, Math.max(0, (t - st.at) / st.dur));
    st.e.t = st.from + (st.to - st.from) * k;
    st.e.dir = st.to > st.from ? 1 : -1;
    if (k > 0 && k < 1) current = st;
  }
  if (current) $("steps").textContent = current.say;
  if (t > timeline.total) {
    timeline = null;
    $("steps").style.display = "none";
  }
}
function stop() {
  timeline = null;
}

// ── combustible: mezcla de queroseno con un 5 % de aceite de turbina, del hopper a la bomba y al motor ──
const FUEL_PATH = [[177, -22, -20], [177, -50, -20], [350, -50, -31], [380, -28, -31], [432, -28, -28], [444, -28, -28], [444, 30, -35], [421, 24, -35], [399, 24, -35], [386, 32, -35], [384, 34, 60], [220, 34, 62], [109.5, 1.8, 68], [109.5, 1.6, 58.4]].map((p) => fromBlender(p).multiplyScalar(0.001));
const fuelCurve = new THREE.CatmullRomCurve3(FUEL_PATH, false, "centripetal", 0.3);
const DROPS = 90;
const dropGeo = new THREE.SphereGeometry(0.0022, 10, 8);
const dropMat = new THREE.MeshStandardMaterial({ color: 0xd9a03a, emissive: 0x6b3a08, roughness: 0.15, metalness: 0 });
const oilMat = new THREE.MeshStandardMaterial({ color: 0x4a2c10, emissive: 0x1a0d04, roughness: 0.2 });
const drops = new THREE.InstancedMesh(dropGeo, dropMat, DROPS);
const oil = new THREE.InstancedMesh(dropGeo, oilMat, Math.round(DROPS * 0.05) + 2);
drops.visible = oil.visible = false;
scene.add(drops, oil);
const tmp = new THREE.Object3D();
function stepFuel(dt) {
  const show = motor.heat > 0.05 && !timeline && !flying && parts.every((e) => e.t < 0.02);
  drops.visible = oil.visible = show;
  if (!show) return;
  motor.t += dt * (0.05 + 0.25 * motor.f);
  for (let i = 0; i < DROPS; i++) {
    const u = (i / DROPS + motor.t) % 1;
    tmp.position.copy(fuelCurve.getPointAt(u));
    tmp.scale.setScalar(0.8 + 0.4 * Math.sin(i * 7.1));
    tmp.updateMatrix();
    drops.setMatrixAt(i, tmp.matrix);
  }
  for (let i = 0; i < oil.count; i++) {
    const u = (i / oil.count + motor.t * 1.0 + 0.013) % 1;
    tmp.position.copy(fuelCurve.getPointAt(u));
    tmp.scale.setScalar(0.7);
    tmp.updateMatrix();
    oil.setMatrixAt(i, tmp.matrix);
  }
  drops.instanceMatrix.needsUpdate = oil.instanceMatrix.needsUpdate = true;
}

// ── escape de la MW54: casi invisible en marcha (un tenue azul en la tobera y calima), llama naranja al arrancar ──
const EXIT = fromBlender([-796, 0, 20]).multiplyScalar(0.001);
const plumeHolder = new THREE.Group();
model.add(plumeHolder);
plumeHolder.scale.setScalar(1 / model.scale.x || 1);
const flame = createFlame(scene, {
  brightness: 0.6,
  turbulence: 1.4,
  modes: {
    run: { core: [[0, [0.55, 0.62, 1], 1.4], [0.12, [0.5, 0.52, 0.95], 0.7], [0.45, [0.45, 0.35, 0.6], 0.15], [1, [0.3, 0.2, 0.3], 0]], edge: [[0, [0.4, 0.42, 0.8], 0.3], [1, [0.2, 0.2, 0.3], 0]] },
    start: { core: [[0, [1, 0.62, 0.25], 3.2], [0.35, [1, 0.45, 0.15], 1.4], [0.8, [0.6, 0.2, 0.08], 0.3], [1, [0.4, 0.15, 0.05], 0]], edge: [[0, [1, 0.4, 0.12], 1.2], [1, [0.4, 0.12, 0.05], 0]] },
  },
  light: { intensity: 0.08, distance: 1.2 },
}, { steps: profile.tier === "baja" ? 18 : 30 });
flame.add(plumeHolder, EXIT, { length: 0.55, r: 0.03 });   // boca de la tobera de 18 mm de radio: 0,03 · 0,62

// ── cámara de combustión: un segundo punto de vista con el motor cortado por la mitad y la llama dentro ──
const pipCam = new THREE.PerspectiveCamera(38, 340 / 220, 0.005, 5);
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
// la llama como volumen, no como chispas: una corona entre los dos tubos del anular (r 22–33 mm, de la cabeza de los
// vaporizadores a la entrada del estátor), con seis antorchas, azul en la zona primaria y amarilla a naranja hacia la
// turbina, con lenguas que avanzan con el gasto. Va en la capa 1 (sólo la ve la cámara de combustión) y la corta el
// mismo plano que al motor.
const flameVol = (() => {
  const S = 48, A = 96, Rr = [22, 27.5, 33];
  const pos = [], uv = [], idx = [];
  for (let k = 0; k < Rr.length; k++) {
    const base = pos.length / 3;
    for (let i = 0; i <= S; i++) for (let j = 0; j <= A; j++) {
      const u = i / S, th = (j / A) * Math.PI * 2;
      const r = Rr[k] + Math.sin(th * 6 + 3.1) * 1.2 * u;
      pos.push(...fromBlender([-(54 + u * 52), r * Math.cos(th), r * Math.sin(th)]).toArray());
      uv.push(u, th / (Math.PI * 2), k / (Rr.length - 1));
    }
    for (let i = 0; i < S; i++) for (let j = 0; j < A; j++) {
      const a = base + i * (A + 1) + j, b = a + A + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("fuv", new THREE.Float32BufferAttribute(uv, 3));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, clipping: true,
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 }, uFlow: { value: 0 } },
    vertexShader: `#include <clipping_planes_pars_vertex>
      attribute vec3 fuv; varying vec3 vUv;
      void main(){ vUv = fuv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
      uniform float uTime; uniform float uHeat; uniform float uFlow; varying vec3 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * n2(p); p *= 2.03; a *= .5; } return s; }
      void main(){
        #include <clipping_planes_fragment>
        float u = vUv.x, th = vUv.y, layer = vUv.z;
        float speed = .6 + 2.4 * uFlow;
        float torch = pow(.5 + .5 * cos((th * 6. - .5) * 6.2832), mix(6., 1.2, u));
        float tongues = fbm(vec2(th * 18., u * 5. - uTime * speed));
        float flick = fbm(vec2(th * 40. + layer * 3., u * 9. - uTime * speed * 1.7));
        float body = smoothstep(.0, .08, u) * (1. - smoothstep(.55, 1., u));
        float a = body * (.35 + .65 * torch) * smoothstep(.25 + .35 * u, .95, tongues + .35 * flick + .2 * (1. - u));
        a *= mix(1., .55, abs(layer - .5) * 2.);
        vec3 blue = vec3(.25, .45, 1.), yel = vec3(1., .78, .35), org = vec3(1., .4, .1);
        vec3 col = mix(blue, yel, smoothstep(.08, .35, u)); col = mix(col, org, smoothstep(.45, .85, u));
        col += vec3(1., .9, .7) * pow(max(tongues + flick - .9, 0.), 2.) * 2.;
        a *= uHeat * (.5 + .5 * uFlow);
        gl_FragColor = vec4(col * a * .85, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(1);
  mesh.frustumCulled = false;
  mesh.visible = false;
  engineRoot?.obj.add(mesh);
  return { mesh, mat };
})();
pipCam.layers.enable(1);
function stepFlames(dt) {
  if (!engineRoot) return;
  flameVol.mesh.visible = motor.heat > 0.02;
  flameVol.mat.uniforms.uTime.value += dt;
  flameVol.mat.uniforms.uHeat.value = motor.heat;
  flameVol.mat.uniforms.uFlow.value = motor.f;
}

// ── mapa de calor: cada pieza con el color de su temperatura (escala turbo) ──
let heatOn = false;
const turbo = (t) => {
  t = Math.min(1, Math.max(0, t));
  const r = 0.1357 + t * (4.5974 - t * (42.3277 - t * (130.5887 - t * (150.5666 - t * 58.1375))));
  const g = 0.0914 + t * (2.1856 + t * (4.8052 - t * (14.0195 - t * (4.2109 + t * 2.7747))));
  const b = 0.1067 + t * (12.5925 - t * (60.1097 - t * (109.0745 - t * (88.5066 - t * 26.8183))));
  return new THREE.Color(r, g, b);
};
const heatMats = new Map();
function paintHeat() {
  for (const e of parts) {
    const T = tempOf(e);
    for (const m of e.materials) {
      if (!heatOn) { m.material = m.userData.realMaterial; continue; }
      let hm = heatMats.get(m);
      if (!hm) { hm = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 }); heatMats.set(m, hm); }
      hm.color.copy(turbo((T - 15) / 800));
      hm.emissive.copy(hm.color).multiplyScalar(0.25);
      m.material = hm;
    }
  }
}

// ── interacción ──
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;
const glow = new THREE.Color(0xff8a3c);
function highlight(entry, on) {
  if (!entry) return;
  for (const m of entry.materials) {
    const mat = m.material;
    if (!mat.emissive) continue;
    if (on) { mat.userData.e0 = mat.userData.e0 || mat.emissive.clone(); mat.emissive.copy(glow).multiplyScalar(0.18); }
    else if (mat.userData.e0) mat.emissive.copy(mat.userData.e0);
  }
}
function showCard(entry) {
  const card = $("card");
  if (!entry) { card.style.display = "none"; return; }
  const info = infoOf(entry);
  const T = tempOf(entry);
  const label = info?.name ?? entry.data.label;
  const mat = info?.material ?? (entry.materials[0]?.userData.realMaterial?.name || "");
  card.innerHTML =
    `<h2>${label}</h2><div class="mat">${mat}</div><dl>` +
    (info ? `<dt>Fusión</dt><dd>${fmt(info.melt[0])}–${fmt(info.melt[1])} °C</dd><dt>Servicio</dt><dd>${fmt(info.service)} °C</dd>` : "") +
    `<dt>Ahora</dt><dd>${fmt(T)} °C</dd>` +
    (info ? `<dt>Margen</dt><dd>${fmt(info.melt[0] - T)} °C hasta fundir</dd><span class="bar"><i style="width:${Math.min(100, (T / info.melt[0]) * 100).toFixed(1)}%;background:${T > info.service * 0.85 ? "#ff8a3c" : "#7fb2ff"}"></i></span>` : "") +
    `</dl>`;
  card.style.display = "block";
}
// la pieza bajo un punto de la pantalla: se resalta y su tarjeta se muestra (la interfaz decide cuándo preguntar)
function pick(x, y) {
  const [w, h] = profile.size();
  mouse.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = flying ? null : ray.intersectObjects(meshes, false)[0];
  const entry = hit ? hit.object.userData.entry : null;
  if (entry !== hovered) {
    highlight(hovered, false);
    hovered = entry;
    highlight(hovered, true);
    showCard(hovered);
  }
  return entry ? infoOf(entry)?.name ?? entry.data.label : null;
}
let focus = null;
function focusPicked() {
  if (!hovered) return;
  const box = new THREE.Box3().setFromObject(hovered.obj);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  focus = { target: c, dist: Math.max(0.25, size * 2.2), t: 0 };
}
function stepFocus(dt) {
  if (!focus) return;
  focus.t = Math.min(1, focus.t + dt * 1.6);
  const k = EASE(focus.t);
  controls.target.lerp(focus.target, k * 0.15);
  const dir = camera.position.clone().sub(controls.target).normalize();
  const want = controls.target.clone().addScaledVector(dir, focus.dist);
  camera.position.lerp(want, k * 0.12);
  if (focus.t >= 1) focus = null;
}

// ── acciones: lo que las interfaces pueden pedir; cada una deja el estado listo y avisa a quien escuche ──
const listeners = new Set();
const state = () => ({ exploded, running: motor.on, heat: heatOn, gear: !!gearState.target, surfaces: demoSurfaces, cockpit: inCockpit, flying, pip: pipOn, throttle: motor.target });
const notify = () => { const st = state(); for (const fn of listeners) fn(st); };
let pipOn = false;
function settle() { if (parts.some((e) => e.t > 0.02)) { timeline = null; setExploded(0); } }
const actions = {
  assemble() { assemble(); notify(); },
  explode() { explode(); notify(); },
  run() { motor.on = !motor.on; if (motor.on) settle(); notify(); },
  throttle(v) { motor.target = v; notify(); },
  heat() { heatOn = !heatOn; $("legend").style.display = heatOn ? "block" : "none"; paintHeat(); notify(); },
  gear() { gearState.target = gearState.target ? 0 : 1; notify(); },
  surfaces() { demoSurfaces = !demoSurfaces; if (!demoSurfaces) setSurfaces({ roll: 0, pitch: 0, yaw: 0, flap: 0 }); notify(); },
  cockpit() {
    inCockpit = !inCockpit;
    controls.minDistance = inCockpit ? 0.06 : 0.25;
    if (inCockpit) settle();
    if (inCockpit !== demoSurfaces) { demoSurfaces = inCockpit; if (!demoSurfaces) setSurfaces({ roll: 0, pitch: 0, yaw: 0, flap: 0 }); }
    flyCamera(inCockpit ? "cockpit" : "home");
    notify();
  },
  fly() {
    flying = !flying;
    document.body.toggleAttribute("data-flying", flying);
    if (flying) { timeline = null; setExploded(0); controls.enabled = false; ground.visible = false; flight.enter(); }
    else { flight.exit(); controls.enabled = true; ground.visible = true; setSurfaces({ roll: 0, pitch: 0, yaw: 0, flap: 0 }); gearState.target = 0; flyCamera(inCockpit ? "cockpit" : "home"); }
    notify();
  },
  pip() { pipOn = !pipOn; $("pip").style.display = pipOn ? "block" : "none"; notify(); },
};
let demoSurfaces = false;
let flying = false;
const pad = profile.pad;
const flight = createFlight({ scene, renderer, camera, model, op, motor, lite: profile.kind === "celular", setGear: (t) => (gearState.target = t), setSurfaces, gearState, pad });

// ── vista de cabina: la cámara entra por encima del puesto trasero y mira el tablero; los mandos se mueven solos ──
const VIEWS = {
  home: { pos: homeView(), target: new THREE.Vector3(0, -0.05, 0) },
  cockpit: { pos: new THREE.Vector3(0.405, 0.16, 0.07), target: new THREE.Vector3(0.53, 0.055, 0) },
};
let camTween = null;
let inCockpit = false;
function flyCamera(view) {
  camTween = { from: camera.position.clone(), fromT: controls.target.clone(), to: VIEWS[view], start: performance.now() / 1000, dur: 1.4 };
}
function stepCamera(now) {
  if (!camTween) return;
  const k = EASE(Math.min(1, (now - camTween.start) / camTween.dur));
  camera.position.lerpVectors(camTween.from, camTween.to.pos, k);
  controls.target.lerpVectors(camTween.fromT, camTween.to.target, k);
  if (k >= 1) camTween = null;
}
window.__sim = { flight, motor, gearState, camera, controls, model };
// ── bucle ──
const clock = new THREE.Clock();
let heatTick = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now() / 1000;
  if (!flying) stepTimeline(now);
  if (demoSurfaces && !flying) setSurfaces({ roll: Math.sin(now * 1.3), pitch: Math.sin(now * 0.9) * 0.8, yaw: Math.sin(now * 0.7), flap: 0.5 + 0.5 * Math.sin(now * 0.5) });
  gearState.t += (gearState.target - gearState.t) * Math.min(1, dt * 0.9);
  if (Math.abs(gearState.target - gearState.t) < 0.002) gearState.t = gearState.target;
  poseControls();
  applyPose(now);
  if (flying) flight.update(dt);
  // motor: arranque con la bujía, ralentí, y la palanca; el calor llega y se va con inercia térmica
  const fT = motor.on ? motor.target : 0;
  motor.f += (fT - motor.f) * (1 - Math.exp(-dt / (fT > motor.f ? 1.6 : 1.1)));
  motor.spin += ((motor.on ? 1 : 0) - motor.spin) * (1 - Math.exp(-dt / (motor.on ? 1.4 : 2.6)));
  motor.heat += ((motor.on ? 1 : 0) - motor.heat) * (1 - Math.exp(-dt / (motor.on ? 3.5 : 6)));
  motor.angle += dt * motor.spin * (18 + 40 * motor.f);
  for (const e of spinners) e.obj.rotation.x = motor.angle;
  const o = op(motor.f);
  // al arrancar, mientras el motor aún no llega a ralentí, sale llama naranja; luego el chorro es casi transparente
  const startFlame = motor.on ? Math.max(0, 1 - motor.heat / 0.45) : 0;
  flame.update({ w: { run: 1 - startFlame, start: startFlame }, level: Math.max(startFlame, motor.heat * (0.35 + 0.65 * motor.f)), optimal: 0, reach: 0.6 + 0.4 * motor.f, time: now, visible: motor.heat > 0.02 && parts.every((e) => e.t < 0.02) });
  stepFuel(dt);
  stepFlames(dt);
  if (!flying) stepFocus(dt);
  // la turbina y el escape pasan de ~520 °C: brillan con su color de cuerpo negro
  if (!heatOn) for (const e of Object.values(engineParts)) { if (e === hovered) continue; const g = blackbody(tempOf(e)); for (const m of e.materials) m.material.emissive?.copy(g); }
  if (heatOn && (heatTick += dt) > 0.2) { heatTick = 0; paintHeat(); }
  if (hovered && (heatTick % 0.2) < dt) showCard(hovered);
  const rpm = o.n * motor.spin;
  const fuel = ((o.thrust * 0.15) / 3600 / 0.8) * 1e6 * 60 / 1000;
  put("readout", motor.heat > 0.02
    ? `<b>${fmt(rpm)}</b> rpm · <b>${o.thrust.toFixed(1)}</b> N · EGT <b>${fmt(15 + (o.egt - 15) * motor.heat)}</b> °C · <b>${fmt(fuel)}</b> ml/min`
    : `Parada · ${SPEC.mass} g · ${parts.length} piezas`);
  const air = o.flow * motor.spin;
  const fuelKg = (o.thrust * 0.15) / 3600;
  put("chem", `<b>C₁₂H₂₃ + 17,75 O₂ → 12 CO₂ + 11,5 H₂O</b><br>Queroseno + 5 % de aceite · AFR global ≈ <b>${air > 0.001 ? Math.round(air / fuelKg) : "—"}</b>:1 · zona primaria ≈ 15:1<br>Llama ≈ <b>${fmt(15 + (o.primary - 15) * motor.heat)}</b> °C · entrada a turbina <b>${fmt(15 + (o.tit - 15) * motor.heat)}</b> °C`);
  put("pipT", motor.heat > 0.02 ? "en combustión" : "fría", "textContent");
  if (!flying) { stepCamera(now); controls.update(); }
  adapt(dt);   // antes de dibujar: si el cambio de resolución va después, ese cuadro se ve negro
  renderer.setScissorTest(false);
  const [W, H] = profile.size();
  renderer.setViewport(0, 0, W, H);
  renderer.clippingPlanes = [];
  if (timeline || demoSurfaces || flying || gearState.t !== gearState.target || now - shadowAt > 0.5) { renderer.shadowMap.needsUpdate = true; shadowAt = now; }
  composer.render();
  // la cámara de combustión: el motor cortado por su plano vertical, mirando la cámara anular desde un lado
  if (pipOn && engineRoot) {
    const r = $("pipFrame").getBoundingClientRect();
    if (pipCam.aspect !== r.width / r.height) { pipCam.aspect = r.width / r.height; pipCam.updateProjectionMatrix(); }
    const M = engineRoot.obj.matrixWorld;
    const centre = fromBlender([-78, 0, 0]).applyMatrix4(M);
    const side = fromBlender([-60, -140, 40]).applyMatrix4(M);
    pipCam.position.copy(side);
    pipCam.lookAt(centre);
    cutPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).transformDirection(M).negate(), centre);
    renderer.clippingPlanes = [cutPlane];
    renderer.setScissorTest(true);
    const y = H - r.bottom;
    renderer.setScissor(r.left, y, r.width, r.height);
    renderer.setViewport(r.left, y, r.width, r.height);
    const bg = scene.background;
    scene.background = new THREE.Color(0x050608);
    renderer.render(scene, pipCam);
    scene.background = bg;
    renderer.clippingPlanes = [];
    renderer.setScissorTest(false);
  }
  requestAnimationFrame(frame);
}
// resolución adaptable: si el dispositivo no llega a ~40 fps baja la densidad de píxeles, y la recupera con holgura
let fpsT = 0;
let fpsN = 0;
let ratio = profile.pixelRatio;
function adapt(dt) {
  if (!profile.adaptive) return;
  fpsT += dt;
  fpsN++;
  if (fpsT < 2) return;
  const fps = fpsN / fpsT;
  fpsT = fpsN = 0;
  const next = fps < 38 ? Math.max(profile.minPixelRatio, ratio * 0.85) : fps > 56 ? Math.min(profile.pixelRatio, ratio * 1.1) : ratio;
  if (Math.abs(next - ratio) > 0.02) { ratio = next; renderer.setPixelRatio(ratio); renderer.setSize(...profile.size()); composer.setPixelRatio?.(ratio); composer.setSize(...profile.size()); }
  profile.onStats?.({ fps, ratio });
}
function resize() {
  const [w, h] = profile.size();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  VIEWS.home.pos.copy(homeView());
  if (!camTween && !flying && !inCockpit) flyCamera("home");
  composer.render();   // cambiar el tamaño borra el lienzo: se vuelve a dibujar en el acto para que no parpadee en negro
}
setExploded(0);
if (!still) setTimeout(() => assemble(2.4), 600);
frame();
return { actions, state, pick, focusPicked, resize, onChange: (fn) => { listeners.add(fn); fn(state()); }, canvas: renderer.domElement, renderer };
}
