// Núcleo común de los visores de aviones a escala real (SR-72, F-22, SR-71), igual en escritorio y en celular.
// Todo lo propio de cada avión llega en su config.js: modelo, piezas, física, mecanismos que mueve el Mach, chorros,
// corte, flujo, lectura y misión. Este archivo no escucha ratón, teclado ni toques; las interfaces (desktop.js,
// mobile.js) llaman a las acciones que devuelve `start`.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { createFloor } from "../floor.js";

const $ = (id) => document.getElementById(id);
export const fmt = (n, d = 0) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
// Blender (Z arriba, mm) → glTF (Y arriba): (x, y, z) → (x, z, −y)
export const fromBlender = ([x, y, z]) => new THREE.Vector3(x, z, -y);
const MM = 0.001;
const EASE = (t) => 1 - Math.pow(1 - t, 3);
export const turbo = (t) => {
  t = Math.min(1, Math.max(0, t));
  const r = 0.1357 + t * (4.5974 - t * (42.3277 - t * (130.5887 - t * (150.5666 - t * 58.1375))));
  const g = 0.0914 + t * (2.1856 + t * (4.8052 - t * (14.0195 - t * (4.2109 + t * 2.7747))));
  const b = 0.1067 + t * (12.5925 - t * (60.1097 - t * (109.0745 - t * (88.5066 - t * 26.8183))));
  return new THREE.Color(r, g, b);
};

export async function start(profile, cfg) {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PARTS = await (await fetch(cfg.parts)).json();
  const { op, metalOf, modeOf, gasAlong, K } = cfg.sim;

  // ── escena ──
  const renderer = new THREE.WebGLRenderer({ antialias: profile.antialias, powerPreference: "high-performance" });
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.setSize(...profile.size());
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
  const [W0, H0] = profile.size();
  const camera = new THREE.PerspectiveCamera(32, W0 / H0, 0.1, 600);
  const homeView = () => new THREE.Vector3(...cfg.view.home).multiplyScalar(profile.fit(camera.aspect));
  camera.position.copy(homeView());
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(...cfg.view.target);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 4;
  controls.maxDistance = cfg.view.max * profile.fit(camera.aspect);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
  const S = cfg.shadow;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 10, far: 160 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, new THREE.HemisphereLight(0xbcd2ff, 0x2a2622, 0.5));
  scene.add(createFloor(renderer, { ...cfg.floor, res: profile.textureSize }));

  // ── modelo ──
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/");
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(cfg.glb);
  const model = gltf.scene;
  scene.add(model);
  const parts = [];
  const engineParts = [];
  let engineRoot = null;
  const allMaterials = new Set();
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = true;
      o.material.side = cfg.doubleSided?.test(o.material.name) ? THREE.DoubleSide : THREE.FrontSide;
      allMaterials.add(o.material);
    }
    const d = o.userData;
    if (d && d.part) {
      const entry = { obj: o, data: d, home: o.position.clone(), quat: o.quaternion.clone(), offset: fromBlender(d.explode || [0, 0, 0]), t: 1, materials: [], T: 15 };
      o.traverse((m) => m.isMesh && entry.materials.push(m));
      if (d.group === "engine" && d.part === cfg.engine) engineRoot = entry;
      if (d.group === cfg.engine) engineParts.push(entry);
      parts.push(entry);
    }
  });
  for (const e of parts) for (const m of e.materials) m.userData.realMaterial = m.material;
  const spinners = engineParts.filter((e) => e.data.spin);
  const controlParts = parts.filter((e) => e.data.control).map((e) => ({
    e, kind: e.data.control, range: e.data.range, sign: e.data.sign ?? 1, rest: e.quat.clone(),
    axis: e.data.hinge ? fromBlender(e.data.hinge).normalize() : null,
    slide: e.data.slide ? fromBlender(e.data.slide).normalize() : null,
  }));
  $("loading")?.remove();
  const meshes = [];
  for (const e of parts) for (const m of e.materials) { m.userData.entry = e; meshes.push(m); }

  // ── estado: el motor, los gases y el Mach, que llega con inercia ──
  const motor = { on: false, spin: 0, heat: 0, angle: 0, thr: 0, target: cfg.throttle ?? 0.85, M: 0, Mtarget: 0, mission: null };
  let o = op(0, 0);
  const isEngine = (e) => e.data.group === cfg.engine || (cfg.engineAlt && e.data.group === cfg.engineAlt);
  function tempTarget(e) {
    const info = PARTS[e.data.part];
    if (info && isEngine(e)) return metalOf(info.zone, o, motor.on && motor.spin > 0.3);
    if (isEngine(e)) return metalOf(cfg.coreZone ?? "hpc", o, motor.on);
    return cfg.skin(e.data.part, o);
  }
  const infoOf = (e) => (e.data.group === cfg.engine ? PARTS[e.data.part] : null);

  // ── montaje y despiece ──
  let timeline = null;
  let exploded = false;
  const late = (e) => cfg.late?.some((p) => e.data.part.startsWith(p));
  function setExploded(share) {
    exploded = share > 0.5;
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
    exploded = false;
    const frame = parts.filter((e) => e.data.group === "airframe" && !late(e)).sort((a, b) => a.data.order - b.data.order);
    const eng = engineParts.slice().sort((a, b) => a.data.order - b.data.order);
    for (const e of parts) if (!isEngine(e) && e.data.group !== "airframe" && e !== engineRoot) e.t = 0;
    const steps = [];
    let at = 0;
    for (const e of frame) { steps.push({ e, at, dur: 1.1 }); at += 0.3; }
    at += 0.3;
    for (const e of eng) { steps.push({ e, at, dur: 0.9 }); at += 0.32; }
    at += 0.3;
    if (engineRoot) { steps.push({ e: engineRoot, at, dur: 1.6, say: cfg.say.install }); at += 1.4; engineRoot.t = 1; }
    for (const e of parts.filter(late)) { steps.push({ e, at, dur: 1.1 }); at += 0.45; }
    timeline = { steps, start: performance.now() / 1000, total: at + 1.2 };
    $("steps").style.display = "block";
  }
  function explode() {
    const target = parts.some((e) => e.t < 0.5) ? 1 : 0;
    exploded = !!target;
    const start = performance.now() / 1000;
    timeline = { steps: parts.map((e, i) => ({ e, at: target ? (isEngine(e) ? 0.3 : 0) + (i % 7) * 0.04 : 0, dur: 1.0, from: e.t, to: target })), start, total: 1.8, reverse: true };
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
  const settle = () => { if (parts.some((e) => e.t > 0.02)) { timeline = null; setExploded(0); } };

  // ── mandos y mecanismos: cada config dice cómo mueve el Mach (o la palanca) cada tipo de pieza ──
  const surf = { roll: 0, pitch: 0, yaw: 0 };
  function poseControls() {
    const D = Math.PI / 180;
    for (const c of controlParts) {
      const drive = cfg.drive[c.kind];
      if (!drive) continue;
      const v = drive(o, surf, c);
      if (c.axis) c.e.quat.copy(c.rest).multiply(new THREE.Quaternion().setFromAxisAngle(c.axis, v * D));
      c.value = v;
    }
  }
  function slideControls() {
    for (const c of controlParts) if (c.slide && c.value) c.e.obj.position.addScaledVector(c.slide, c.value);
  }

  // ── chorro: un sombreador por tobera; la config da su posición, tamaño y forma ──
  const plumeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 }, uAb: { value: 0 }, uRam: { value: 0 }, uScram: { value: 0 }, uTeb: { value: 0 } },
    vertexShader: `varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      void main(){ vPos = position; vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uHeat; uniform float uAb; uniform float uRam; uniform float uScram; uniform float uTeb; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        float L = clamp(-vPos.x, 0., 1.);
        float rim = pow(abs(dot(vN, vView)), 1.4);
        float turb = n3(vec3(vPos.x*30. + uTime*12., vPos.y*3., vPos.z*3.));
        float diamonds = .5 + .5*sin(L*48. - uTime*3.);
        float reach = mix(.45, 1., max(uRam, uScram));
        float fade = 1. - smoothstep(reach*.55, reach, L);
        vec3 ab = mix(vec3(1., .55, .2), vec3(.6,.35,.3), L);
        vec3 ram = mix(vec3(.62, .55, 1.), vec3(.35,.3,.7), L);
        vec3 scr = mix(vec3(.8, .9, 1.), vec3(.4,.5,.8), L);
        vec3 teb = vec3(.35, 1., .45);
        vec3 col = ab*uAb + ram*uRam*(1.-uScram) + scr*uScram + vec3(.5,.45,.4)*(1.-uAb)*(1.-uRam)*.4;
        col = mix(col, teb, uTeb);
        float k = uAb*(.7+.3*diamonds) + uRam*(1.-uScram)*.8 + uScram*.35 + (1.-uAb)*(1.-uRam)*.35 + uTeb;
        float a = rim * (exp(-L*3.) + .4*smoothstep(.3,.9,turb)*(1.-L)) * fade * uHeat * k;
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  const plumes = cfg.plumes.map((p) => {
    // geometría de longitud 1 hacia −x; la escala da largo, alto y ancho reales
    const g = new THREE.CylinderGeometry(1, p.tail ?? 0.6, 1, 48, 32, true);
    g.rotateZ(Math.PI / 2);
    g.translate(-0.5, 0, 0);
    const m = new THREE.Mesh(g, plumeMat);
    m.position.copy(fromBlender(p.at).multiplyScalar(MM));
    m.scale.set(p.length, p.r * (p.h ?? 1), p.r * (p.w ?? 1));
    m.visible = false;
    scene.add(m);
    return m;
  });

  // ── corte por el plano medio del motor, con el aire que lo recorre coloreado por su temperatura ──
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), cfg.cut.z);
  let cutOn = false;
  const FLOW = profile.tier === "baja" ? 700 : 1400;
  const flowGeo = new THREE.BufferGeometry();
  const fpos = new Float32Array(FLOW * 3);
  const fcol = new Float32Array(FLOW * 3);
  const fseed = Float32Array.from({ length: FLOW }, () => Math.random());
  flowGeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  flowGeo.setAttribute("color", new THREE.BufferAttribute(fcol, 3));
  const flow = new THREE.Points(flowGeo, new THREE.PointsMaterial({ size: cfg.flow.size ?? 0.11, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  flow.frustumCulled = false;
  flow.visible = false;
  scene.add(flow);
  const names = Object.keys(cfg.flow.paths);
  const curves = Object.fromEntries(names.map((n) => [n, new THREE.CatmullRomCurve3(cfg.flow.paths[n].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.2)]));
  const tmpV = new THREE.Vector3();
  function stepFlow(dt) {
    if (!flow.visible || !engineRoot) return;
    const M = engineRoot.obj.matrixWorld;
    const running = motor.on && motor.spin > 0.3;
    for (let i = 0; i < FLOW; i++) {
      const path = names[i % names.length];
      const share = cfg.flow.share(path, o);
      const alive = i / FLOW < Math.max(0.04, share);
      fseed[i] = (fseed[i] + dt * cfg.flow.speed(path, o) * (0.7 + 0.6 * ((i * 0.618) % 1))) % 1;
      const u = fseed[i];
      const p = curves[path].getPointAt(u);
      const [sy, sz] = cfg.flow.spread(path, u);
      tmpV.copy(fromBlender([p.x, alive ? sy * (((i * 0.37) % 1) - 0.5) * 2 : 1e6, p.z + sz * (((i * 0.73) % 1) - 0.5) * 2])).applyMatrix4(M);
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
        hm.color.copy(turbo((e.T - 15) / cfg.heatMax));
        hm.emissive.copy(hm.color).multiplyScalar(0.25);
        hm.clippingPlanes = cutOn ? [cutPlane] : null;
        m.material = hm;
      }
    }
  }
  function setCut(on) {
    cutOn = on;
    for (const m of allMaterials) {
      m.clippingPlanes = on ? [cutPlane] : null;
      m.clipShadows = on;
      if (!cfg.doubleSided?.test(m.name)) m.side = on ? THREE.DoubleSide : THREE.FrontSide;
      m.needsUpdate = true;
    }
    flow.visible = on;
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
  function pick(x, y) {
    const [w, h] = profile.size();
    mouse.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(meshes, false).filter((hh) => !cutOn || cutPlane.distanceToPoint(hh.point) >= 0);
    const entry = hits[0] ? hits[0].object.userData.entry : null;
    if (entry !== hovered) {
      highlight(hovered, false);
      hovered = entry;
      highlight(hovered, true);
      showCard(hovered);
    }
    return entry ? infoOf(entry)?.name ?? entry.data.label : null;
  }

  // ── cámara: vista general, vista del corte y acercamiento a una pieza ──
  const VIEWS = {
    home: () => ({ pos: homeView(), target: new THREE.Vector3(...cfg.view.target) }),
    cut: () => ({ pos: new THREE.Vector3(...cfg.cut.pos).sub(new THREE.Vector3(...cfg.cut.target)).multiplyScalar(profile.fit(camera.aspect)).add(new THREE.Vector3(...cfg.cut.target)), target: new THREE.Vector3(...cfg.cut.target) }),
  };
  let camTween = null;
  function flyCamera(view) {
    const v = typeof view === "string" ? VIEWS[view]() : view;
    camTween = { from: camera.position.clone(), fromT: controls.target.clone(), pos: v.pos, target: v.target, start: performance.now() / 1000, dur: 1.5 };
  }
  function focusPicked() {
    if (!hovered) return;
    const box = new THREE.Box3().setFromObject(hovered.obj);
    const c = box.getCenter(new THREE.Vector3());
    const dist = Math.max(4, box.getSize(new THREE.Vector3()).length() * 1.8);
    const dir = camera.position.clone().sub(controls.target).normalize();
    flyCamera({ pos: c.clone().addScaledVector(dir, dist), target: c });
  }
  function stepCamera(now) {
    if (!camTween) return;
    const k = EASE(Math.min(1, (now - camTween.start) / camTween.dur));
    camera.position.lerpVectors(camTween.from, camTween.pos, k);
    controls.target.lerpVectors(camTween.fromT, camTween.target, k);
    if (k >= 1) camTween = null;
  }

  // ── acciones ──
  const listeners = new Set();
  let heatTick = 0;
  let demo = false;
  const state = () => ({ exploded, running: motor.on, heat: heatOn, cut: cutOn, surfaces: demo, mission: !!motor.mission, mach: motor.Mtarget, throttle: motor.target });
  const notify = () => { const st = state(); for (const fn of listeners) fn(st); };
  const actions = {
    assemble() { assemble(); notify(); },
    explode() { explode(); notify(); },
    run() { motor.on = !motor.on; if (motor.on) settle(); notify(); },
    throttle(v) { motor.target = v; notify(); },
    mach(v) { motor.Mtarget = v; motor.mission = null; notify(); },
    mission() { motor.mission = motor.mission ? null : { start: performance.now() / 1000 }; if (motor.mission && !motor.on) { motor.on = true; settle(); } notify(); },
    heat() { heatOn = !heatOn; $("legend").style.display = heatOn ? "block" : "none"; paintHeat(); notify(); },
    cut() { setCut(!cutOn); if (cutOn) settle(); flyCamera(cutOn ? "cut" : "home"); if (heatOn) paintHeat(); notify(); },
    surfaces() { demo = !demo; if (!demo) Object.assign(surf, { roll: 0, pitch: 0, yaw: 0 }); notify(); },
  };
  window.__sim = { motor, camera, controls, model, op: () => o };

  function missionMach(t) {
    const legs = cfg.mission;
    for (let i = 0; i < legs.length - 1; i++) {
      const [t0, m0] = legs[i];
      const [t1, m1] = legs[i + 1];
      if (t <= t1) { const k = (t - t0) / (t1 - t0); return m0 + (m1 - m0) * (k * k * (3 - 2 * k)); }
    }
    return null;
  }

  // ── bucle ──
  const clock = new THREE.Clock();
  let lastMode = null;
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
    if (Math.abs(next - ratio) > 0.02) { ratio = next; renderer.setPixelRatio(ratio); renderer.setSize(...profile.size()); }
    profile.onStats?.({ fps, ratio });
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const now = performance.now() / 1000;
    stepTimeline(now);
    if (motor.mission) {
      const m = missionMach(now - motor.mission.start);
      if (m === null) { motor.mission = null; notify(); }
      else motor.Mtarget = m;
    }
    if (demo) Object.assign(surf, { roll: Math.sin(now * 1.1), pitch: Math.sin(now * 0.8) * 0.8, yaw: Math.sin(now * 0.6) });
    const Mwant = motor.on ? motor.Mtarget : 0;
    motor.M += (Mwant - motor.M) * (1 - Math.exp(-dt / 1.8));
    motor.thr += ((motor.on ? motor.target : 0) - motor.thr) * (1 - Math.exp(-dt / 1.2));
    motor.spin += ((motor.on ? 1 : 0) * ((o.turbine ?? 1) > 0.05 ? 1 : 0) - motor.spin) * (1 - Math.exp(-dt / (motor.on ? 2.2 : 4)));
    motor.heat += ((motor.on ? 1 : 0) - motor.heat) * (1 - Math.exp(-dt / (motor.on ? 2.5 : 5)));
    o = op(motor.M, motor.thr);
    for (const e of parts) e.T += (tempTarget(e) - e.T) * (1 - Math.exp(-dt / 2.5));
    poseControls();
    applyPose(now);
    slideControls();
    motor.angle += dt * motor.spin * (8 + 30 * motor.thr) * (o.turbine ?? 1);
    for (const e of spinners) e.obj.rotation.x = motor.angle * (e.data.spin ?? 1);
    const assembled = parts.every((e) => e.t < 0.02);
    for (const p of plumes) p.visible = motor.heat > 0.02 && assembled;
    const u = plumeMat.uniforms;
    u.uTime.value = now;
    u.uHeat.value = motor.heat * (0.3 + 0.7 * motor.thr);
    u.uAb.value = o.ab ?? 0;
    u.uRam.value = (o.ram ?? 0) * motor.thr;
    u.uScram.value = o.scram ?? 0;
    u.uTeb.value = Math.max(0, 1 - motor.heat * 3) * (motor.on ? 1 : 0) * (cfg.teb ? 1 : 0);
    stepFlow(dt);
    if (heatOn && (heatTick += dt) > 0.2) { heatTick = 0; paintHeat(); }
    if (hovered && heatTick % 0.2 < dt) showCard(hovered);
    const md = modeOf(motor.M);
    if (md.key !== lastMode) { lastMode = md.key; $("mode").innerHTML = `<b>${md.name}</b> · ${md.say}`; }
    $("mode").style.display = motor.on && !timeline ? "block" : "none";
    $("readout").innerHTML = motor.on || motor.M > 0.05 ? cfg.readout(o, motor, md, K) : `En tierra · ${parts.length} piezas · ${cfg.say.engines}`;
    profile.onFrame?.(motor);
    stepCamera(now);
    controls.update();
    renderer.render(scene, camera);
    adapt(dt);
    requestAnimationFrame(frame);
  }
  function resize() {
    const [w, h] = profile.size();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (!camTween && !cutOn) flyCamera("home");
  }
  setExploded(0);
  if (!still) setTimeout(() => { assemble(); notify(); }, 600);
  frame();
  return { actions, state, pick, focusPicked, resize, onChange: (fn) => { listeners.add(fn); fn(state()); }, canvas: renderer.domElement, maxMach: cfg.maxMach };
}
