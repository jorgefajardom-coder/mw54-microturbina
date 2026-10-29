// Visor 3D: el entrenador con su MW54, piezas interactivas, montaje orgánico, arranque, mezcla de combustible,
// cámara de combustión en corte y mapa de calor. Los números salen del mismo modelo que la figura técnica.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { op, metal, PARTS, SPEC } from "./model.mjs";

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString("es-ES");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Blender (Z arriba, mm) → glTF (Y arriba): (x, y, z) → (x, z, −y)
const fromBlender = ([x, y, z]) => new THREE.Vector3(x, z, -y);

// ── escena ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
$("view").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f12);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 50);
camera.position.set(1.9, 0.95, 2.1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, -0.05, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.25;
controls.maxDistance = 6;
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(2.5, 4, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 10 });
sun.shadow.bias = -0.0004;
scene.add(sun, new THREE.HemisphereLight(0xbcd2ff, 0x2a2622, 0.5));
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.85 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.235;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(8, 80, 0x3a3f46, 0x24272c);
grid.position.y = -0.2348;
scene.add(grid);

// ── modelo ──
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/");
loader.setDRACOLoader(draco);
const parts = [];
let engineRoot = null;
let spinners = [];
const engineParts = {};
const gltf = await loader.loadAsync("./mw54.glb");
const model = gltf.scene;
scene.add(model);
model.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = o.receiveShadow = true;
    o.material.side = THREE.FrontSide;
    if (o.material.transmission > 0 || o.material.opacity < 1) { o.material.transparent = true; o.castShadow = false; }
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
for (const e of parts) for (const m of e.materials) m.userData.realMaterial = m.material;
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
function setExploded(share) {
  for (const e of parts) e.t = share;
  applyPose();
}
function applyPose(time = 0) {
  for (const e of parts) {
    const s = EASE(1 - e.t);
    const k = 1 - s;
    // camino orgánico: la pieza llega en arco (sube y baja) y se asienta con un leve balanceo
    const lift = Math.sin(Math.PI * k) * 0.25 * e.offset.length();
    e.obj.position.copy(e.home).addScaledVector(e.offset, k * (e.data.group === "engine" ? 1 : 0.001 * 1000));
    if (e.data.group !== "MW54") e.obj.position.y += lift * 0.0;
    const wob = k * 0.35 * Math.sin(time * 2 + e.data.order);
    e.obj.quaternion.copy(e.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(wob * 0.15, wob * 0.25, wob * 0.1)));
  }
}
function assemble() {
  stop();
  setExploded(1);
  const frame = parts.filter((e) => e.data.group === "airframe" || e.data.group === "systems").filter((e) => e.data.order < 30).sort((a, b) => a.data.order - b.data.order);
  const late = parts.filter((e) => (e.data.group === "airframe" || e.data.group === "systems") && e.data.order >= 30).sort((a, b) => a.data.order - b.data.order);
  const eng = Object.values(engineParts).sort((a, b) => a.data.order - b.data.order);
  const steps = [];
  let at = 0;
  for (const e of frame) { steps.push({ e, at, dur: 1.1 }); at += 0.32; }
  at += 0.4;
  for (const e of eng) { steps.push({ e, at, dur: 0.9 }); at += 0.38; }
  at += 0.3;
  if (engineRoot) { steps.push({ e: engineRoot, at, dur: 1.6, say: "La MW54 baja por la escotilla a su montura" }); at += 1.4; }
  for (const e of late) { steps.push({ e, at, dur: 1.0 }); at += 0.4; }
  timeline = { steps, start: performance.now() / 1000, total: at + 1.2 };
  if (engineRoot) engineRoot.t = 1;
  $("steps").style.display = "block";
}
function explode() {
  timeline = null;
  const target = parts.some((e) => e.t < 0.5) ? 1 : 0;
  const from = parts.map((e) => e.t);
  const start = performance.now() / 1000;
  timeline = { steps: parts.map((e, i) => ({ e, at: target ? (e.data.group === "MW54" ? 0.3 : 0) + (i % 7) * 0.04 : 0, dur: 1.0, from: from[i], to: target })), start, total: 1.8, reverse: true };
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
  if (current) $("steps").textContent = current.say || `Montando · ${current.e.data.label}`;
  if (t > timeline.total) {
    timeline = null;
    $("steps").style.display = "none";
  }
}
function stop() {
  timeline = null;
}

// ── combustible: mezcla de queroseno con un 5 % de aceite de turbina, del hopper a la bomba y al motor ──
const FUEL_PATH = [[195, 0, -32], [240, 0, -18], [400, -28, -29], [452, -28, -26], [452, 22, -26], [409, 22, -33], [300, 52, -30], [109.5, 2, 55]].map((p) => fromBlender(p).multiplyScalar(0.001));
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
  const show = motor.heat > 0.05 && !timeline && parts.every((e) => e.t < 0.02);
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

// ── escape: núcleo caliente, cono de calima y diamantes tenues, en el sistema de la tobera ──
const EXIT = fromBlender([-796, 0, 20]).multiplyScalar(0.001);
const plumeGeo = new THREE.CylinderGeometry(0.06, 0.022, 0.55, 48, 32, true);
plumeGeo.rotateZ(Math.PI / 2);
plumeGeo.translate(-0.275, 0, 0);
const plumeMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 }, uHeat: { value: 0 }, uFlow: { value: 0 } },
  vertexShader: `varying vec3 vPos; varying vec3 vN; varying vec3 vView;
    void main(){ vPos = position; vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime; uniform float uHeat; uniform float uFlow; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){
      float L = clamp(-vPos.x / 0.55, 0., 1.);
      float rim = pow(abs(dot(vN, vView)), 1.5);
      float turb = n3(vec3(vPos.x*40. + uTime*(6.+18.*uFlow), vPos.y*60., vPos.z*60.));
      float wisp = smoothstep(.3, .9, turb);
      float core = exp(-L*5.);
      float diamonds = .5 + .5*sin(L*60. - uTime*2.);
      vec3 hot = mix(vec3(1., .55, .2), vec3(.55,.35,.3), L);
      float a = rim * (core*1.2 + wisp*.5*(1.-L)) * (1.-smoothstep(.6,1.,L)) * uHeat * (.35+.65*uFlow) * (.85+.15*diamonds);
      gl_FragColor = vec4(hot * a, a);
    }`,
});
const plume = new THREE.Mesh(plumeGeo, plumeMat);
plume.position.copy(EXIT);
plume.visible = false;
scene.add(plume);

// ── cámara de combustión: un segundo punto de vista con el motor cortado por la mitad y la llama dentro ──
const pipCam = new THREE.PerspectiveCamera(38, 340 / 220, 0.005, 5);
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const FLAMES = 900;
const flameGeo = new THREE.BufferGeometry();
const fpos = new Float32Array(FLAMES * 3);
const fseed = new Float32Array(FLAMES);
for (let i = 0; i < FLAMES; i++) fseed[i] = Math.random();
flameGeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
flameGeo.setAttribute("seed", new THREE.BufferAttribute(fseed, 1));
const flameMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uSize: { value: 26 } },
  vertexShader: `attribute float seed; varying float vLife; uniform float uSize;
    void main(){ vLife = fract(seed); vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = uSize * (1.-vLife*.6) / -mv.z * 0.1; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vLife;
    void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); float a = smoothstep(.5, .0, d);
      vec3 col = mix(vec3(.55,.75,1.), vec3(1.,.7,.25), smoothstep(.0,.25,vLife)); col = mix(col, vec3(1.,.35,.1), smoothstep(.4,.9,vLife));
      gl_FragColor = vec4(col * a * (1.-vLife) * 1.4, a * (1.-vLife)); }`,
});
const flames = new THREE.Points(flameGeo, flameMat);
flames.layers.set(1);
flames.frustumCulled = false;
scene.add(flames);
pipCam.layers.enable(1);
function stepFlames(dt) {
  if (!engineRoot) return;
  const burning = motor.heat;
  flames.visible = burning > 0.02;
  if (!flames.visible) return;
  const M = engineRoot.obj.matrixWorld;
  const speed = 0.4 + 1.6 * motor.f;
  for (let i = 0; i < FLAMES; i++) {
    fseed[i] = (fseed[i] + dt * speed * (0.6 + 0.8 * ((i * 0.618) % 1))) % 1;
    const life = fseed[i];
    const jet = i % 6;
    const th = (jet / 6) * Math.PI * 2 + 0.52 + (((i * 0.37) % 1) - 0.5) * 0.9 * life;
    const s = 56 + life * 46;
    const r = 27 + Math.sin(i * 1.7) * (4 + 6 * life);
    // marco del motor en Blender: punto(s, r, θ) = (−s, r cos θ, r sin θ)
    const p = fromBlender([-s, r * Math.cos(th), r * Math.sin(th)]);
    p.applyMatrix4(M);
    fpos.set([p.x, p.y, p.z], i * 3);
  }
  flameGeo.attributes.position.needsUpdate = true;
  flameGeo.attributes.seed.needsUpdate = true;
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
renderer.domElement.addEventListener("pointermove", (ev) => {
  mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(meshes, false)[0];
  const entry = hit ? hit.object.userData.entry : null;
  if (entry !== hovered) {
    highlight(hovered, false);
    hovered = entry;
    highlight(hovered, true);
    showCard(hovered);
  }
  const tip = $("tip");
  if (entry) { tip.style.display = "block"; tip.style.left = `${ev.clientX + 14}px`; tip.style.top = `${ev.clientY + 10}px`; tip.textContent = infoOf(entry)?.name ?? entry.data.label; }
  else tip.style.display = "none";
});
let focus = null;
renderer.domElement.addEventListener("click", () => {
  if (!hovered) return;
  const box = new THREE.Box3().setFromObject(hovered.obj);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  focus = { target: c, dist: Math.max(0.25, size * 2.2), t: 0 };
});
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

$("assemble").onclick = () => assemble();
$("explode").onclick = () => explode();
$("run").onclick = () => {
  motor.on = !motor.on;
  if (motor.on && parts.some((e) => e.t > 0.02)) { timeline = null; setExploded(0); $("explode").removeAttribute("data-on"); }
  $("run").toggleAttribute("data-on", motor.on);
  $("run").lastChild.textContent = motor.on ? "Apagar" : "Arrancar";
};
$("throttle").oninput = (e) => (motor.target = e.target.value / 100);
$("heat").onclick = () => { heatOn = !heatOn; $("heat").toggleAttribute("data-on", heatOn); $("legend").style.display = heatOn ? "block" : "none"; paintHeat(); };
$("cam").onclick = () => { const on = $("pip").style.display !== "block"; $("pip").style.display = on ? "block" : "none"; $("cam").toggleAttribute("data-on", on); };

// ── bucle ──
const clock = new THREE.Clock();
let heatTick = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now() / 1000;
  stepTimeline(now);
  applyPose(now);
  // motor: arranque con la bujía, ralentí, y la palanca; el calor llega y se va con inercia térmica
  const fT = motor.on ? motor.target : 0;
  motor.f += (fT - motor.f) * (1 - Math.exp(-dt / (fT > motor.f ? 1.6 : 1.1)));
  motor.spin += ((motor.on ? 1 : 0) - motor.spin) * (1 - Math.exp(-dt / (motor.on ? 1.4 : 2.6)));
  motor.heat += ((motor.on ? 1 : 0) - motor.heat) * (1 - Math.exp(-dt / (motor.on ? 3.5 : 6)));
  motor.angle += dt * motor.spin * (18 + 40 * motor.f);
  for (const e of spinners) e.obj.rotation.x = motor.angle;
  const o = op(motor.f);
  plume.visible = motor.heat > 0.02 && parts.every((e) => e.t < 0.02);
  plumeMat.uniforms.uTime.value = now;
  plumeMat.uniforms.uHeat.value = motor.heat;
  plumeMat.uniforms.uFlow.value = motor.f * motor.spin;
  stepFuel(dt);
  stepFlames(dt);
  stepFocus(dt);
  if (heatOn && (heatTick += dt) > 0.2) { heatTick = 0; paintHeat(); }
  if (hovered && (heatTick % 0.2) < dt) showCard(hovered);
  const rpm = o.n * motor.spin;
  const fuel = ((o.thrust * 0.15) / 3600 / 0.8) * 1e6 * 60 / 1000;
  $("readout").innerHTML = motor.heat > 0.02
    ? `<b>${fmt(rpm)}</b> rpm · <b>${o.thrust.toFixed(1)}</b> N · EGT <b>${fmt(15 + (o.egt - 15) * motor.heat)}</b> °C · <b>${fmt(fuel)}</b> ml/min`
    : `Parada · ${SPEC.mass} g · ${parts.length} piezas`;
  const air = o.flow * motor.spin;
  const fuelKg = (o.thrust * 0.15) / 3600;
  $("chem").innerHTML = `<b>C₁₂H₂₃ + 17,75 O₂ → 12 CO₂ + 11,5 H₂O</b><br>Queroseno + 5 % de aceite · AFR global ≈ <b>${air > 0.001 ? Math.round(air / fuelKg) : "—"}</b>:1 · zona primaria ≈ 15:1<br>Llama ≈ <b>${fmt(15 + (o.primary - 15) * motor.heat)}</b> °C · entrada a turbina <b>${fmt(15 + (o.tit - 15) * motor.heat)}</b> °C`;
  $("pipT").textContent = motor.heat > 0.02 ? "en combustión" : "fría";
  controls.update();
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.clippingPlanes = [];
  renderer.render(scene, camera);
  // la cámara de combustión: el motor cortado por su plano vertical, mirando la cámara anular desde un lado
  if ($("pip").style.display === "block" && engineRoot) {
    const r = $("pipFrame").getBoundingClientRect();
    const M = engineRoot.obj.matrixWorld;
    const centre = fromBlender([-78, 0, 0]).applyMatrix4(M);
    const side = fromBlender([-60, -140, 40]).applyMatrix4(M);
    pipCam.position.copy(side);
    pipCam.lookAt(centre);
    cutPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).transformDirection(M).negate(), centre);
    renderer.clippingPlanes = [cutPlane];
    renderer.setScissorTest(true);
    const y = innerHeight - r.bottom;
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
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
setExploded(0);
if (!still) setTimeout(() => assemble(), 600);
frame();
