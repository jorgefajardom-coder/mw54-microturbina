// Visor 3D del SR-72: la célula y sus dos TBCC a escala real, montaje y despiece, arranque, el relevo turbofán →
// ramjet → scramjet con la compuerta divisora y la rampa de entrada moviéndose con el Mach, el chorro de cada modo,
// un corte por el motor derecho con el flujo coloreado por temperatura y el mapa de calor de los materiales.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { createFloor } from "../floor.js";
import { op, metalOf, modeOf, gasAlong, K } from "./sim.js";

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 0) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Blender (Z arriba, mm) → glTF (Y arriba): (x, y, z) → (x, z, −y)
const fromBlender = ([x, y, z]) => new THREE.Vector3(x, z, -y);
const MM = 0.001;
const PARTS = await (await fetch("./parts.json")).json();

// ── escena ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
$("view").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f12);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
new HDRLoader().load("../hangar.hdr", (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.8;
  hdr.dispose();
});
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 600);
function homeView() {
  const k = Math.min(2.6, Math.max(1, 1.25 / camera.aspect));
  return new THREE.Vector3(30, 14, 36).multiplyScalar(k);
}
camera.position.copy(homeView());
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(-1, -1.6, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 4;
controls.maxDistance = 110 * Math.max(1, 1.25 / camera.aspect);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(40, 60, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 10, far: 160 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
scene.add(sun, new THREE.HemisphereLight(0xbcd2ff, 0x2a2622, 0.5));
const ground = createFloor(renderer, {
  y: -3.6,
  fade: [34, 85],
  stand: { W: 44, D: 32, box: { x0: -17.5, x1: 17.5, z0: -14, z1: 14, arm: 3.6, w: 0.32 }, dash: [1.6, 2.8, 0.26], stops: [[9.6, 0], [-3.4, 3.3], [-3.4, -3.3]], stop: [0.35, 1.6] },
  ao: { w: 34, d: 22, x: -1 },
});
scene.add(ground);

// ── modelo ──
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/");
loader.setDRACOLoader(draco);
const gltf = await loader.loadAsync("./sr72.glb");
const model = gltf.scene;
scene.add(model);
const parts = [];
const engineParts = [];
let engineRoot = null;
const allMaterials = new Set();
model.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = o.receiveShadow = true;
    // las góndolas son una piel abierta por delante y por detrás: se ven por dentro desde la entrada
    o.material.side = o.material.name.startsWith("Góndola") ? THREE.DoubleSide : THREE.FrontSide;
    allMaterials.add(o.material);
  }
  const d = o.userData;
  if (d && d.part) {
    const entry = { obj: o, data: d, home: o.position.clone(), quat: o.quaternion.clone(), offset: fromBlender(d.explode || [0, 0, 0]), t: 1, materials: [], T: 15 };
    if (d.group === "TBCC.L") entry.offset.set(0, 0, 0);
    o.traverse((m) => m.isMesh && entry.materials.push(m));
    if (d.group === "engine" && d.part === "TBCC") engineRoot = entry;
    if (d.group === "TBCC") engineParts.push(entry);
    parts.push(entry);
  }
});
for (const e of parts) for (const m of e.materials) m.userData.realMaterial = m.material;
const spinners = engineParts.filter((e) => e.data.spin);
const controlParts = parts.filter((e) => e.data.control).map((e) => ({ e, axis: fromBlender(e.data.hinge).normalize(), range: e.data.range, kind: e.data.control, sign: e.data.sign ?? 1, rest: e.quat.clone() }));
$("loading").remove();
const meshes = [];
for (const e of parts) for (const m of e.materials) { m.userData.entry = e; meshes.push(m); }

// ── estado: el motor, los gases y el Mach, que llega con inercia (el avión acelera, no salta) ──
const motor = { on: false, spin: 0, heat: 0, angle: 0, thr: 0, target: 0.85, M: 0, Mtarget: 0, mission: null };
let o = op(0, 0);
const mode = () => modeOf(motor.M);

function tempTarget(e) {
  const T0 = o.T0 - K;
  const amb = o.T - K;
  const info = PARTS[e.data.part];
  if (info && (e.data.group === "TBCC" || e.data.group === "TBCC.L")) return metalOf(info.zone, o, motor.on && motor.spin > 0.3);
  if (e.data.group === "TBCC.L") return metalOf("hpc", o, motor.on);
  const p = e.data.part;
  // la piel se queda en el equilibrio radiativo, muy por debajo de T₀, salvo morro y bordes de ataque
  if (p.startsWith("fuselaje.morro")) return amb + 0.85 * (T0 - amb);
  if (p.startsWith("ala") || p.startsWith("deriva")) return amb + 0.78 * (T0 - amb);
  if (p.startsWith("tren")) return amb + 0.25 * (T0 - amb);
  return amb + 0.62 * (T0 - amb);
}
const infoOf = (e) => (e.data.group === "TBCC" ? PARTS[e.data.part] : null);

// ── montaje y despiece ──
const EASE = (t) => 1 - Math.pow(1 - t, 3);
let timeline = null;
function setExploded(share) {
  for (const e of parts) e.t = share;
  applyPose(0);
}
function applyPose(time) {
  for (const e of parts) {
    const k = 1 - EASE(1 - e.t);
    e.obj.position.copy(e.home).addScaledVector(e.offset, k);
    const wob = k * 0.35 * Math.sin(time * 2 + e.data.order);
    e.obj.quaternion.copy(e.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(wob * 0.08, wob * 0.12, wob * 0.05)));
  }
}
function assemble() {
  timeline = null;
  setExploded(1);
  const late = (e) => e.data.part.startsWith("gondola");
  const frame = parts.filter((e) => e.data.group === "airframe" && !late(e)).sort((a, b) => a.data.order - b.data.order);
  const eng = engineParts.slice().sort((a, b) => a.data.order - b.data.order);
  const steps = [];
  let at = 0;
  for (const e of frame) { steps.push({ e, at, dur: 1.1 }); at += 0.3; }
  for (const e of parts.filter((e) => e.data.group === "TBCC.L" || (e.data.part === "TBCC.L"))) e.t = 0;
  at += 0.3;
  for (const e of eng) { steps.push({ e, at, dur: 0.9 }); at += 0.32; }
  at += 0.3;
  steps.push({ e: engineRoot, at, dur: 1.6, say: "El TBCC sube a su bahía bajo el ala" });
  at += 1.4;
  for (const e of parts.filter(late)) { steps.push({ e, at, dur: 1.1 }); at += 0.45; }
  timeline = { steps, start: performance.now() / 1000, total: at + 1.2 };
  engineRoot.t = 1;
  $("steps").style.display = "block";
}
function explode() {
  const target = parts.some((e) => e.t < 0.5) ? 1 : 0;
  const start = performance.now() / 1000;
  timeline = { steps: parts.map((e, i) => ({ e, at: target ? (e.data.group === "TBCC" ? 0.3 : 0) + (i % 7) * 0.04 : 0, dur: 1.0, from: e.t, to: target })), start, total: 1.8, reverse: true };
  $("explode").toggleAttribute("data-on", !!target);
}
function stepTimeline(now) {
  if (!timeline) return;
  const t = now - timeline.start;
  let current = null;
  for (const s of timeline.steps) {
    const k = Math.min(1, Math.max(0, (t - s.at) / s.dur));
    if (timeline.reverse) s.e.t = s.from + (s.to - s.from) * EASE(k);
    else { s.e.t = 1 - k; if (k > 0 && k < 1) current = s; }
  }
  if (current) $("steps").textContent = current.say || `Montando · ${infoOf(current.e)?.name ?? current.e.data.label}`;
  if (t > timeline.total) { timeline = null; $("steps").style.display = "none"; }
}

// ── mandos y mecanismos: elevones y timones con la demostración, rampa y compuerta con el Mach ──
const surf = { roll: 0, pitch: 0, yaw: 0 };
function poseControls() {
  const D = Math.PI / 180;
  for (const c of controlParts) {
    let a = 0;
    if (c.kind === "ramp") a = -o.ramp;
    else if (c.kind === "splitter") a = c.range[1] + (c.range[0] - c.range[1]) * o.splitter;
    else if (c.kind === "elevon") a = Math.max(-1, Math.min(1, surf.pitch - surf.roll * c.sign)) * c.range[1];
    else if (c.kind === "rudder") a = surf.yaw * c.range[1];
    c.e.quat.copy(c.rest).multiply(new THREE.Quaternion().setFromAxisAngle(c.axis, a * D));
  }
}

// ── chorro: naranja con diamantes del postquemador, violeta del ramjet, casi invisible y largo del scramjet ──
const plumeGeo = new THREE.CylinderGeometry(0.85, 0.5, 14, 48, 32, true);
plumeGeo.rotateZ(Math.PI / 2);
plumeGeo.translate(-7, 0, 0);
const plumeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 }, uHeat: { value: 0 }, uAb: { value: 0 }, uRam: { value: 0 }, uScram: { value: 0 } },
  vertexShader: `varying vec3 vPos; varying vec3 vN; varying vec3 vView;
    void main(){ vPos = position; vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime; uniform float uHeat; uniform float uAb; uniform float uRam; uniform float uScram; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){
      float L = clamp(-vPos.x / 14., 0., 1.);
      float rim = pow(abs(dot(vN, vView)), 1.4);
      float turb = n3(vec3(vPos.x*2.5 + uTime*12., vPos.y*3., vPos.z*3.));
      float diamonds = .5 + .5*sin(L*48. - uTime*3.);
      float reach = mix(.45, 1., max(uRam, uScram));
      float fade = 1. - smoothstep(reach*.55, reach, L);
      vec3 ab = mix(vec3(1., .55, .2), vec3(.6,.35,.3), L);
      vec3 ram = mix(vec3(.62, .55, 1.), vec3(.35,.3,.7), L);
      vec3 scr = mix(vec3(.8, .9, 1.), vec3(.4,.5,.8), L);
      vec3 col = ab*uAb + ram*uRam*(1.-uScram) + scr*uScram + vec3(.5,.45,.4)*(1.-uAb)*(1.-uRam)*.4;
      float k = uAb*(.7+.3*diamonds) + uRam*(1.-uScram)*.8 + uScram*.35 + (1.-uAb)*(1.-uRam)*.35;
      float a = rim * (exp(-L*3.) + .4*smoothstep(.3,.9,turb)*(1.-L)) * fade * uHeat * k;
      gl_FragColor = vec4(col * a, a);
    }`,
});
const plumes = [1350, -1350].map((y) => {
  const p = new THREE.Mesh(plumeGeo, plumeMat);
  p.position.copy(fromBlender([-11200, y, -1050]).multiplyScalar(MM));
  p.scale.set(1, 1.05, 0.62);
  p.visible = false;
  scene.add(p);
  return p;
});

// ── corte: el modelo cortado por el plano medio del motor derecho, con el aire que lo recorre coloreado por su
//    temperatura (arriba el camino del turbofán, abajo el del estatorreactor) ──
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1.35);
let cutOn = false;
function setCut(on) {
  cutOn = on;
  for (const m of allMaterials) {
    m.clippingPlanes = on ? [cutPlane] : null;
    m.clipShadows = on;
    if (!m.name.startsWith("Góndola")) m.side = on ? THREE.DoubleSide : THREE.FrontSide;
    m.needsUpdate = true;
  }
  flow.visible = on;
}
const PATHS = {
  turbo: [[2600, -850], [0, -850], [-1500, -820], [-3200, -700], [-4300, -560], [-5900, -560], [-6800, -600], [-7400, -620], [-12500, -650], [-13300, -900], [-16500, -800]],
  ram: [[2600, -1720], [0, -1720], [-1500, -1725], [-5200, -1725], [-11500, -1760], [-12800, -1500], [-16500, -1250]],
};
const FLOW = 1400;
const flowGeo = new THREE.BufferGeometry();
const fpos = new Float32Array(FLOW * 3);
const fcol = new Float32Array(FLOW * 3);
const fseed = Float32Array.from({ length: FLOW }, () => Math.random());
flowGeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
flowGeo.setAttribute("color", new THREE.BufferAttribute(fcol, 3));
const flow = new THREE.Points(flowGeo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
flow.frustumCulled = false;
flow.visible = false;
scene.add(flow);
const curveOf = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.2);
const curves = { turbo: curveOf(PATHS.turbo), ram: curveOf(PATHS.ram) };
const turbo = (t) => {
  t = Math.min(1, Math.max(0, t));
  const r = 0.1357 + t * (4.5974 - t * (42.3277 - t * (130.5887 - t * (150.5666 - t * 58.1375))));
  const g = 0.0914 + t * (2.1856 + t * (4.8052 - t * (14.0195 - t * (4.2109 + t * 2.7747))));
  const b = 0.1067 + t * (12.5925 - t * (60.1097 - t * (109.0745 - t * (88.5066 - t * 26.8183))));
  return new THREE.Color(r, g, b);
};
const tmpV = new THREE.Vector3();
function stepFlow(dt) {
  if (!flow.visible || !engineRoot) return;
  const M = engineRoot.obj.matrixWorld;
  const share = { turbo: Math.max(0.04, o.turbine), ram: Math.max(0.04, o.ram) };
  const running = motor.on && motor.spin > 0.3;
  for (let i = 0; i < FLOW; i++) {
    const path = i % 2 ? "ram" : "turbo";
    const alive = (i / FLOW) < share[path];
    const speed = path === "ram" ? 0.18 + 0.25 * o.scram : 0.12;
    fseed[i] = (fseed[i] + dt * speed * (0.7 + 0.6 * ((i * 0.618) % 1))) % 1;
    const u = fseed[i];
    const p = curves[path].getPointAt(u);
    const spreadY = 520 * (((i * 0.37) % 1) - 0.5) * 2;
    const spreadZ = (path === "ram" ? 220 : 380) * (((i * 0.73) % 1) - 0.5) * 2 * (path === "turbo" && u > 0.3 && u < 0.6 ? 0.6 : 1);
    tmpV.copy(fromBlender([p.x, alive ? spreadY : 1e6, p.z + spreadZ])).applyMatrix4(M);
    fpos.set([tmpV.x, tmpV.y, tmpV.z], i * 3);
    const c = turbo(gasAlong(path, u, o, running) / 2200);
    fcol.set([c.r, c.g, c.b], i * 3);
  }
  flowGeo.attributes.position.needsUpdate = true;
  flowGeo.attributes.color.needsUpdate = true;
}

// ── mapa de calor ──
let heatOn = false;
const heatMats = new Map();
function paintHeat() {
  for (const e of parts) {
    for (const m of e.materials) {
      if (!heatOn) { m.material = m.userData.realMaterial; continue; }
      let hm = heatMats.get(m);
      if (!hm) { hm = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, side: m.userData.realMaterial.side }); heatMats.set(m, hm); allMaterials.add(hm); }
      hm.color.copy(turbo((e.T - 15) / 1600));
      hm.emissive.copy(hm.color).multiplyScalar(0.25);
      hm.clippingPlanes = cutOn ? [cutPlane] : null;
      m.material = hm;
    }
  }
}

// ── tarjeta de pieza ──
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
  const T = entry.T;
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
function pick(ev) {
  mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(meshes, false).filter((h) => !cutOn || cutPlane.distanceToPoint(h.point) >= 0);
  const entry = hits[0] ? hits[0].object.userData.entry : null;
  if (entry !== hovered) {
    highlight(hovered, false);
    hovered = entry;
    highlight(hovered, true);
    showCard(hovered);
  }
  const tip = $("tip");
  if (entry && ev.pointerType === "mouse") { tip.style.display = "block"; tip.style.left = `${ev.clientX + 14}px`; tip.style.top = `${ev.clientY + 10}px`; tip.textContent = infoOf(entry)?.name ?? entry.data.label; }
  else tip.style.display = "none";
}
let downAt = null;
renderer.domElement.addEventListener("pointerdown", (ev) => { downAt = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener("pointerup", (ev) => {
  if (ev.pointerType === "mouse" || !downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 8) return;
  pick(ev);
});
renderer.domElement.addEventListener("pointermove", (ev) => { if (ev.pointerType === "mouse") pick(ev); });

// ── cámara: vista general y vista del corte ──
const VIEWS = {
  home: { pos: homeView(), target: new THREE.Vector3(-1, -1.6, 0) },
  cut: { pos: () => new THREE.Vector3(-6, -3.4, 1.35 + 21 * Math.min(2.4, Math.max(1, 1.4 / camera.aspect))), target: new THREE.Vector3(-6, -1.8, 1.35) },
};
let camTween = null;
function flyCamera(view) {
  const v = VIEWS[view];
  camTween = { from: camera.position.clone(), fromT: controls.target.clone(), pos: typeof v.pos === "function" ? v.pos() : v.pos.clone(), target: v.target.clone(), start: performance.now() / 1000, dur: 1.5 };
}
function stepCamera(now) {
  if (!camTween) return;
  const k = EASE(Math.min(1, (now - camTween.start) / camTween.dur));
  camera.position.lerpVectors(camTween.from, camTween.pos, k);
  controls.target.lerpVectors(camTween.fromT, camTween.target, k);
  if (k >= 1) camTween = null;
}

// ── botones ──
$("assemble").onclick = () => { $("explode").removeAttribute("data-on"); assemble(); };
$("explode").onclick = explode;
$("run").onclick = () => {
  motor.on = !motor.on;
  if (motor.on && parts.some((e) => e.t > 0.02)) { timeline = null; setExploded(0); $("explode").removeAttribute("data-on"); }
  $("run").toggleAttribute("data-on", motor.on);
  $("run").lastChild.textContent = motor.on ? "Apagar" : "Arrancar";
};
$("throttle").oninput = (e) => (motor.target = e.target.value / 100);
$("mach").oninput = (e) => { motor.Mtarget = e.target.value / 10; motor.mission = null; $("mission").removeAttribute("data-on"); };
$("mission").onclick = () => {
  motor.mission = motor.mission ? null : { start: performance.now() / 1000 };
  $("mission").toggleAttribute("data-on", !!motor.mission);
  if (motor.mission && !motor.on) $("run").click();
};
$("heat").onclick = () => { heatOn = !heatOn; $("heat").toggleAttribute("data-on", heatOn); $("legend").style.display = heatOn ? "block" : "none"; paintHeat(); };
$("cut").onclick = () => {
  setCut(!cutOn);
  $("cut").toggleAttribute("data-on", cutOn);
  if (cutOn && parts.some((e) => e.t > 0.02)) { timeline = null; setExploded(0); $("explode").removeAttribute("data-on"); }
  flyCamera(cutOn ? "cut" : "home");
  if (heatOn) paintHeat();
};
let demo = false;
$("surfaces").onclick = () => { demo = !demo; $("surfaces").toggleAttribute("data-on", demo); if (!demo) Object.assign(surf, { roll: 0, pitch: 0, yaw: 0 }); };
window.__sim = { motor, camera, controls, model, op: () => o };

// perfil de misión: despegue con postquemador, subida, relevo a Mach 3, crucero a Mach 6 y vuelta
function missionMach(t) {
  const legs = [[0, 0], [6, 0.4], [22, 2.6], [32, 3.4], [48, 5.2], [58, 6], [74, 6], [96, 2.2], [110, 0.6], [116, 0]];
  for (let i = 0; i < legs.length - 1; i++) {
    const [t0, m0] = legs[i];
    const [t1, m1] = legs[i + 1];
    if (t <= t1) { const k = (t - t0) / (t1 - t0); return m0 + (m1 - m0) * (k * k * (3 - 2 * k)); }
  }
  return null;
}

// ── bucle ──
const clock = new THREE.Clock();
let heatTick = 0;
let lastMode = null;
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now() / 1000;
  stepTimeline(now);
  if (motor.mission) {
    const m = missionMach(now - motor.mission.start);
    if (m === null) { motor.mission = null; $("mission").removeAttribute("data-on"); }
    else { motor.Mtarget = m; $("mach").value = Math.round(m * 10); }
  }
  if (demo) Object.assign(surf, { roll: Math.sin(now * 1.1), pitch: Math.sin(now * 0.8) * 0.8, yaw: Math.sin(now * 0.6) });
  // el Mach sólo sube con el motor encendido; parado, el avión se queda en tierra
  const Mwant = motor.on ? motor.Mtarget : 0;
  motor.M += (Mwant - motor.M) * (1 - Math.exp(-dt / 1.8));
  motor.thr += ((motor.on ? motor.target : 0) - motor.thr) * (1 - Math.exp(-dt / 1.2));
  motor.spin += ((motor.on ? 1 : 0) * (o.turbine > 0.05 ? 1 : 0) - motor.spin) * (1 - Math.exp(-dt / (motor.on ? 2.2 : 4)));
  motor.heat += ((motor.on ? 1 : 0) - motor.heat) * (1 - Math.exp(-dt / (motor.on ? 2.5 : 5)));
  o = op(motor.M, motor.thr);
  for (const e of parts) e.T += (tempTarget(e) - e.T) * (1 - Math.exp(-dt / 2.5));
  poseControls();
  applyPose(now);
  motor.angle += dt * motor.spin * (8 + 30 * motor.thr) * o.turbine;
  for (const e of spinners) e.obj.rotation.x = motor.angle;
  const assembled = parts.every((e) => e.t < 0.02);
  for (const p of plumes) p.visible = motor.heat > 0.02 && assembled;
  plumeMat.uniforms.uTime.value = now;
  plumeMat.uniforms.uHeat.value = motor.heat * (0.3 + 0.7 * motor.thr);
  plumeMat.uniforms.uAb.value = o.ab;
  plumeMat.uniforms.uRam.value = o.ram * motor.thr;
  plumeMat.uniforms.uScram.value = o.scram;
  stepFlow(dt);
  if (heatOn && (heatTick += dt) > 0.2) { heatTick = 0; paintHeat(); }
  if (hovered && (heatTick % 0.2) < dt) showCard(hovered);
  const md = mode();
  if (md.key !== lastMode) { lastMode = md.key; $("mode").innerHTML = `<b>${md.name}</b> · ${md.say}`; }
  $("mode").style.display = motor.on && !timeline ? "block" : "none";
  $("machv").textContent = fmt(motor.Mtarget, 1);
  $("readout").innerHTML = motor.on || motor.M > 0.05
    ? `Mach <b>${fmt(motor.M, 2)}</b> · <b>${fmt(o.h, 1)}</b> km · T₀ <b>${fmt(o.T0 - K)}</b> °C · <b>${md.name}</b> · 2 × <b>${fmt(o.thrust)}</b> kN`
    : `En tierra · ${parts.length} piezas · dos TBCC`;
  stepCamera(now);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  VIEWS.home.pos.copy(homeView());
});
setExploded(0);
if (!still) setTimeout(() => assemble(), 600);
frame();
