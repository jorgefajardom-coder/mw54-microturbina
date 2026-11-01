// Exhibición: los cinco aviones del sitio vuelan solos sobre un aeródromo. Cada trayectoria es una curva cerrada que se
// recorre conservando la energía (sube y pierde velocidad, baja y la gana); la actitud sale de la propia trayectoria:
// el morro sigue la velocidad y el ala se inclina hasta que la sustentación compensa la gravedad más la aceleración, de
// modo que en los virajes se alabea y en lo alto de un rizo queda invertido, como en vuelo real.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { loadModel, guardContext } from "../look.js?v=20261031-motion7";

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 0) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const G = 9.81;
const wrap = (u) => ((u % 1) + 1) % 1;
const small = matchMedia("(max-width: 760px)").matches;

// ── escena ──
const renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: "high-performance", logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
$("view").appendChild(renderer.domElement);
guardContext(renderer);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb9cbe0, 4000, 22000);
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 60000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
let touched = -1e9;
controls.addEventListener("start", () => { touched = performance.now(); });
controls.addEventListener("end", () => { touched = performance.now(); });

const sky = new Sky();
sky.scale.setScalar(45000);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(150));
Object.assign(sky.material.uniforms.sunPosition.value, sunDir);
sky.material.uniforms.turbidity.value = 3.5;
sky.material.uniforms.rayleigh.value = 1.3;
sky.material.uniforms.mieCoefficient.value = 0.004;
scene.add(sky);
// el propio cielo ilumina los aviones: reflejos de metal y pintura con el mismo color que el fondo
const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene();
skyScene.add(sky.clone());
scene.environment = pmrem.fromScene(skyScene, 0, 1, 100000).texture;
scene.environmentIntensity = 0.9;
const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
sun.position.copy(sunDir).multiplyScalar(1000);
scene.add(sun, sun.target, new THREE.HemisphereLight(0xcfe0ff, 0x4a5a3a, 0.6));

// terreno: parcelas de cultivo con algo de ruido, la pista en el centro
function fieldsTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1024;
  const g = cv.getContext("2d");
  const tones = ["#56703f", "#617a45", "#6f7f4a", "#4d6638", "#7c8752", "#5b6f3c", "#8a8a5a"];
  for (let y = 0; y < 1024; y += 128) for (let x = 0; x < 1024; x += 128) {
    const w = 128 * (Math.random() < 0.3 ? 2 : 1);
    g.fillStyle = tones[Math.floor(Math.random() * tones.length)];
    g.fillRect(x, y, w, 128);
  }
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,230"},${Math.random() * 0.05})`; g.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 3); }
  g.strokeStyle = "rgba(40,45,30,0.35)";
  g.lineWidth = 2;
  for (let k = 0; k <= 1024; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 1024); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(1024, k); g.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  t.anisotropy = 8;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000), new THREE.MeshStandardMaterial({ map: fieldsTexture(), roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const runway = new THREE.Mesh(new THREE.PlaneGeometry(3000, 60), new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.9 }));
runway.rotation.x = -Math.PI / 2;
runway.position.y = 0.3;
scene.add(runway);
const marks = new THREE.Mesh(new THREE.PlaneGeometry(2800, 1.2), new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.8 }));
marks.rotation.x = -Math.PI / 2;
marks.position.y = 0.6;
scene.add(marks);

// ── trayectorias ──
// Curva cerrada por puntos de control; se recorre por longitud de arco
function closed(points) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), true, "centripetal");
  c.arcLengthDivisions = 4000;
  c.updateArcLengths();
  return c;
}
function ellipse(A, B, h, { n = 64, dir = 1, wave = () => 0, cx = 0, cz = 0 } = {}) {
  return closed(Array.from({ length: n }, (_, i) => { const t = (dir * i * Math.PI * 2) / n; return [cx + A * Math.cos(t), h + wave(t), cz + B * Math.sin(t)]; }));
}
// figura en ocho, subiendo en una mitad y bajando en la otra
function eight(A, B, h, dh) {
  return closed(Array.from({ length: 72 }, (_, i) => { const t = (i * Math.PI * 2) / 72; return [A * Math.sin(t), h + dh * Math.cos(t), B * Math.sin(t) * Math.cos(t)]; }));
}
// circuito de exhibición del Hawk: pasada con rizo, viraje, pasada de vuelta (con tonel) y viraje
function airshow(z0, h, R, turn) {
  const p = [];
  for (let x = -1800; x < -200; x += 200) p.push([x, h, z0]);
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI / 2 + (k / 24) * Math.PI * 2;
    p.push([R * Math.cos(a) + 0, h + R + R * Math.sin(a), z0 + (60 * k) / 24]);
  }
  for (let x = 200; x <= 1800; x += 200) p.push([x, h, z0 + 60]);
  for (let k = 1; k < 16; k++) { const a = -Math.PI / 2 + (k / 16) * Math.PI; p.push([1800 + turn * Math.cos(a), h + 60, z0 + 60 + turn + turn * Math.sin(a)]); }
  for (let x = 1800; x >= -1800; x -= 200) p.push([x, h + 60, z0 + 60 + 2 * turn]);
  for (let k = 1; k < 16; k++) { const a = Math.PI / 2 + (k / 16) * Math.PI; p.push([-1800 + turn * Math.cos(a), h + 30, z0 + turn + 30 + (turn + 30) * Math.sin(a)]); }
  return closed(p);
}

// ── aviones ──
// plumes: (x, y, z) de la boca de cada tobera en mm del modelo (x hacia el morro, y a la izquierda, z arriba)
const PLANES = [
  { id: "hawk", name: "Hawk con MW54", glb: "../mw54.glb", scale: 7, v0: 115, h0: 160, smoke: true,
    plumes: [[-796, 0, 20]], flame: { r: 0.16, len: 1.6, ab: 0 },
    path: airshow(-2300, 160, 230, 520), roll: (u) => rollWindow(u, 0.62, 0.7) },
  { id: "sr72", name: "SR-72", glb: "../sr72/sr72.glb", scale: 1, v0: 240, h0: 1200,
    plumes: [[-9180, 1600, -750], [-9180, -1600, -750]], flame: { r: 0.8, len: 8, ab: 1 },
    path: ellipse(3600, 2400, 1200, { wave: (t) => 80 * Math.sin(2 * t) }) },
  { id: "f22", name: "F-22 Raptor", glb: "../f22/f22.glb", scale: 1, v0: 150, h0: 600,
    plumes: [[-8660, 620, -150], [-8660, -620, -150]], flame: { r: 0.6, len: 6, ab: 0.6 },
    path: eight(1500, 1500, 600, 120), roll: (u) => rollWindow(u, 0.21, 0.27) + rollWindow(u, 0.71, 0.77) },
  { id: "f14", name: "F-14 Tomcat", glb: "../f14/f14.glb", scale: 1, v0: 130, h0: 360,
    plumes: [[-8500, 1450, -250], [-8500, -1450, -250]], flame: { r: 0.7, len: 6, ab: 0.5 },
    path: ellipse(950, 950, 360, { dir: -1, wave: (t) => 30 * Math.sin(3 * t) }) },
  { id: "sr71", name: "SR-71 Blackbird", glb: "../sr71/sr71.glb", scale: 1, v0: 200, h0: 880,
    plumes: [[-14150, 4100, -150], [-14150, -4100, -150]], flame: { r: 0.9, len: 9, ab: 0.8 },
    path: ellipse(3000, 2000, 880, { dir: -1, n: 72 }) },
];
// tonel: una vuelta completa sobre el eje longitudinal entre dos fracciones del circuito
function rollWindow(u, a, b) {
  if (u < a || u > b) return 0;
  const t = (u - a) / (b - a);
  return Math.PI * 2 * (t * t * (3 - 2 * t));
}

// formación: el SR-71 guía y el resto se coloca en V a su alrededor (adelante, arriba, a la derecha, en metros)
const LEAD = { path: ellipse(2600, 1500, 700, { wave: (t) => 60 * Math.sin(2 * t) }), v0: 125, h0: 700 };
const SLOT = { sr71: [0, 0, 0], f22: [-42, 0, 40], f14: [-42, 0, -42], hawk: [-84, 0, 82], sr72: [-88, 0, -84] };

// vuelo con energía constante: v² = v0² − 2 g (h − h0)
const speedAt = (p, y) => Math.sqrt(Math.max(p.v0 * p.v0 * 0.25, p.v0 * p.v0 - 2 * G * (y - p.h0)));

const plumeMat = (color, strength) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
  vertexShader: "varying float vT; #include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){ vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); \n#include <logdepthbuf_vertex>\n}".replace("vT; #", "vT;\n#"),
  fragmentShader: "uniform vec3 uColor; uniform float uK; varying float vT;\n#include <logdepthbuf_pars_fragment>\nvoid main(){ \n#include <logdepthbuf_fragment>\nfloat a = pow(1. - vT, 1.6) * uK; gl_FragColor = vec4(uColor * a, a); }",
});
function plumeMesh(color, k) {
  const g = new THREE.ConeGeometry(1, 1, 18, 1, true);
  g.rotateZ(Math.PI / 2);
  g.translate(-0.5, 0, 0);
  return new THREE.Mesh(g, plumeMat(color, k));
}

const TRAIL = small ? 160 : 260;
function trailLine(color, alpha) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const col = new Float32Array(TRAIL * 4);
  const c = new THREE.Color(color);
  for (let i = 0; i < TRAIL; i++) { const f = 1 - i / TRAIL; col.set([c.r, c.g, c.b, alpha * f * f], i * 4); }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  line.frustumCulled = false;
  return line;
}

const labels = document.createElement("div");
labels.className = "labels";
document.body.appendChild(labels);
Object.assign(labels.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "4" });

async function build(p) {
  const gltf = await loadModel(p.glb, "../draco/");
  const model = gltf.scene;
  model.traverse((o) => {
    // en vuelo, con el tren recogido
    if (o.userData?.part?.startsWith("tren.")) o.visible = false;
  });
  model.scale.setScalar(p.scale);
  const box = new THREE.Box3().setFromObject(model);
  p.length = box.max.x - box.min.x;
  p.obj = new THREE.Group();
  p.obj.add(model);
  scene.add(p.obj);
  p.flames = p.plumes.map(([x, y, z]) => {
    const g = new THREE.Group();
    g.position.set((x / 1000) * p.scale, (z / 1000) * p.scale, (-y / 1000) * p.scale);
    const outer = plumeMesh(p.flame.ab ? 0xff7a30 : 0x8fa8ff, p.flame.ab ? 0.55 : 0.35);
    const core = plumeMesh(p.flame.ab ? 0xfff0c0 : 0xd8e2ff, 0.9);
    outer.scale.set(p.flame.len, p.flame.r, p.flame.r);
    core.scale.set(p.flame.len * 0.45, p.flame.r * 0.55, p.flame.r * 0.55);
    g.add(outer, core);
    p.obj.add(g);
    return g;
  });
  p.tail = new THREE.Vector3(Math.min(...p.plumes.map((q) => q[0])) / 1000 * p.scale, 0, 0);
  p.trail = trailLine(p.smoke ? 0xffffff : 0xe8eef6, p.smoke ? 0.85 : 0.35);
  scene.add(p.trail);
  p.trailHead = 0;
  p.trailFill = 0;
  p.trailClock = 0;
  p.label = document.createElement("span");
  p.label.textContent = p.name;
  Object.assign(p.label.style, { position: "absolute", transform: "translate(-50%, -150%)", padding: "2px 7px", borderRadius: "6px", background: "#000a", color: "#e9ecef", font: "600 10.5px ui-monospace, Menlo, monospace", letterSpacing: ".06em", whiteSpace: "nowrap", display: "none" });
  labels.appendChild(p.label);
  p.u = Math.random();
  p.L = p.path.getLength();
  p.pos = new THREE.Vector3();
  p.prev = null;
  p.vel = new THREE.Vector3();
  p.state = { V: p.v0, g: 1, bank: 0 };
}

// ── estado de la exhibición ──
let target = 1;        // 1: formación, 0: libre
let blend = 1;
let paused = false;
let follow = "sr71";
const lead = { u: 0, L: LEAD.path.getLength() };

function frameOf(path, u, L, v, h = 0.25) {
  // posición, dirección y vertical aparente (sustentación) a partir de tres puntos de la trayectoria
  const du = (v * h) / L;
  const a = path.getPointAt(((u - du) % 1 + 1) % 1);
  const b = path.getPointAt(((u % 1) + 1) % 1);
  const c = path.getPointAt(((u + du) % 1 + 1) % 1);
  const fwd = c.clone().sub(a).normalize();
  const acc = a.clone().add(c).addScaledVector(b, -2).divideScalar(h * h);
  const lift = acc.add(new THREE.Vector3(0, G, 0));
  const up = lift.clone().addScaledVector(fwd, -lift.dot(fwd));
  if (up.lengthSq() < 1e-6) up.set(0, 1, 0);
  up.normalize();
  return { p: b, fwd, up, g: lift.length() / G };
}

function freePos(p) { return p.path.getPointAt(p.u); }
function formPos(p, F) {
  const [f, u, r] = SLOT[p.id];
  const right = F.fwd.clone().cross(F.up);
  return F.p.clone().addScaledVector(F.fwd, f).addScaledVector(F.up, u).addScaledVector(right, r);
}

const tmpM = new THREE.Matrix4();
const qRoll = new THREE.Quaternion();
function step(dt) {
  if (!paused) {
    blend += Math.sign(target - blend) * Math.min(Math.abs(target - blend), dt / 9);
    const leadP = LEAD.path.getPointAt(lead.u);
    lead.u = wrap(lead.u + (speedAt(LEAD, leadP.y) * dt) / lead.L);
  }
  const Fl = frameOf(LEAD.path, lead.u, lead.L, speedAt(LEAD, LEAD.path.getPointAt(lead.u).y));
  const b = blend * blend * (3 - 2 * blend);
  for (const p of PLANES) {
    if (!p.obj) continue;
    if (!paused) {
      const y = p.path.getPointAt(p.u).y;
      p.u = wrap(p.u + (speedAt(p, y) * dt) / p.L);
    }
    const pos = freePos(p).lerp(formPos(p, Fl), b);
    if (p.prev && dt > 0) {
      const v = pos.clone().sub(p.prev).divideScalar(dt);
      p.acc = p.vel.lengthSq() ? v.clone().sub(p.vel).divideScalar(dt) : new THREE.Vector3();
      p.vel.lerp(v, 0.5);
    }
    p.prev = pos.clone();
    p.pos.copy(pos);
    // actitud: la de su curva libre, la del guía en formación, mezcladas como la posición
    const Ff = frameOf(p.path, p.u, p.L, speedAt(p, pos.y));
    const fwd = Ff.fwd.clone().lerp(Fl.fwd, b).normalize();
    const up = Ff.up.clone().lerp(Fl.up, b);
    up.addScaledVector(fwd, -up.dot(fwd)).normalize();
    const right = fwd.clone().cross(up);
    tmpM.makeBasis(fwd, up, right);
    p.obj.quaternion.setFromRotationMatrix(tmpM);
    const extra = (p.roll ? p.roll(p.u) : 0) * (1 - b);
    if (extra) p.obj.quaternion.multiply(qRoll.setFromAxisAngle(new THREE.Vector3(1, 0, 0), extra));
    p.obj.position.copy(pos);
    const V = (1 - b) * speedAt(p, pos.y) + b * speedAt(LEAD, Fl.p.y);
    p.state = { V, g: (1 - b) * Ff.g + b * Fl.g, h: pos.y, bank: Math.atan2(-right.y, up.y) };
    // llamas: parpadeo y largo según el empuje que pide la subida
    const climb = THREE.MathUtils.clamp(fwd.y * 2 + 0.6, 0.3, 1.2);
    for (const f of p.flames) f.scale.set(climb * (0.9 + 0.2 * Math.random()), 1, 1);
    // estela
    p.trailClock += dt;
    if (!paused && p.trailClock > 0.08) {
      p.trailClock = 0;
      const tail = p.tail.clone().applyQuaternion(p.obj.quaternion).add(pos);
      const arr = p.trail.geometry.attributes.position.array;
      arr.copyWithin(3, 0, (TRAIL - 1) * 3);
      arr[0] = tail.x; arr[1] = tail.y; arr[2] = tail.z;
      p.trailFill = Math.min(TRAIL, p.trailFill + 1);
      if (p.trailFill === 1) for (let i = 1; i < TRAIL; i++) arr.set([tail.x, tail.y, tail.z], i * 3);
      p.trail.geometry.attributes.position.needsUpdate = true;
    }
  }
}

// ── cámara ──
const chase = new THREE.Vector3();
let lastTarget = null;
function placeCamera(dt, jump) {
  const sel = PLANES.find((p) => p.id === follow);
  if (follow === "all" || !sel?.obj) {
    // vista de espectador: todo el espacio de la exhibición, desde fuera del circuito
    const c = new THREE.Vector3();
    let n = 0;
    for (const p of PLANES) if (p.obj) { c.add(p.pos); n++; }
    if (n) c.divideScalar(n);
    c.y = Math.max(c.y, 300);
    if (jump) { camera.position.set(0, 1800, 7800); controls.target.copy(c); }
    controls.target.lerp(c, Math.min(1, dt * 0.8));
    lastTarget = null;
    return;
  }
  const p = sel.pos;
  const L = sel.length;
  const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(sel.obj.quaternion);
  const want = p.clone().addScaledVector(fwd, -2.4 * L).add(new THREE.Vector3(0, 0.55 * L, 0)).addScaledVector(new THREE.Vector3(-fwd.z, 0, fwd.x).normalize(), 0.9 * L);
  if (jump || !lastTarget) { camera.position.copy(want); controls.target.copy(p); lastTarget = p.clone(); chase.copy(want); return; }
  // el avión arrastra la cámara; si nadie la toca, vuelve sola detrás del avión
  camera.position.add(p.clone().sub(lastTarget));
  controls.target.copy(p);
  lastTarget.copy(p);
  if (performance.now() - touched > 3500) camera.position.lerp(want, Math.min(1, dt * 1.2));
  if (camera.position.y < 3) camera.position.y = 3;
}

function readout() {
  const sel = PLANES.find((p) => p.id === follow);
  if (!sel?.obj) { $("readout").innerHTML = `<b>${blend > 0.5 ? "Formación" : "Libre"}</b> · cinco aviones en el aire`; return; }
  const s = sel.state;
  $("readout").innerHTML = `<b>${sel.name}</b> · <b>${fmt(s.V * 3.6)}</b> km/h · <b>${fmt(s.h)}</b> m · <b>${fmt(s.g, 1)}</b> g · alabeo <b>${fmt(Math.abs((s.bank * 180) / Math.PI))}</b>°`;
}

function labelsUpdate() {
  const show = follow === "all";
  const w = innerWidth, h = innerHeight;
  for (const p of PLANES) {
    if (!p.obj) continue;
    const v = p.pos.clone().project(camera);
    const on = show && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    p.label.style.display = on ? "block" : "none";
    if (on) { p.label.style.left = `${((v.x + 1) / 2) * w}px`; p.label.style.top = `${((1 - v.y) / 2) * h}px`; }
  }
}

// ── interfaz ──
function press() {
  for (const b of document.querySelectorAll("[data-cam]")) b.setAttribute("aria-pressed", String(b.dataset.cam === follow));
  $("mode-form").setAttribute("aria-pressed", String(target === 1));
  $("mode-free").setAttribute("aria-pressed", String(target === 0));
  $("pause").setAttribute("aria-pressed", String(paused));
  $("pause").textContent = paused ? "Seguir" : "Pausa";
}
let jumpCam = true;
for (const b of document.querySelectorAll("[data-cam]")) b.addEventListener("click", () => { follow = b.dataset.cam; jumpCam = true; press(); });
$("mode-form").addEventListener("click", () => { target = 1; press(); });
$("mode-free").addEventListener("click", () => { target = 0; press(); });
$("pause").addEventListener("click", () => { paused = !paused; press(); });
press();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 60 : 45;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// carga: primero el guía, luego el resto; cada avión entra en escena en cuanto llega
const order = ["sr71", "f22", "f14", "hawk", "sr72"];
let loaded = 0;
for (const id of order) {
  const p = PLANES.find((q) => q.id === id);
  build(p).then(() => {
    loaded++;
    if (loaded === 1) $("loading").hidden = true;
  }).catch((e) => console.error(p.id, e));
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  step(paused ? 0 : dt);
  placeCamera(dt, jumpCam);
  jumpCam = false;
  sun.target.position.copy(controls.target);
  sun.position.copy(controls.target).addScaledVector(sunDir, 1000);
  controls.update();
  readout();
  labelsUpdate();
  renderer.render(scene, camera);
});
