import { createCombustion, reactionAt } from "../combustion.js?v=20261031-transition10";
// Núcleo común de los visores de aviones a escala real (SR-72, F-22, SR-71), igual en escritorio y en celular.
// Todo lo propio de cada avión llega en su config.js: modelo, piezas, física, mecanismos que mueve el Mach, chorros,
// corte, flujo, lectura y misión. Este archivo no escucha ratón, teclado ni toques; las interfaces (desktop.js,
// mobile.js) llaman a las acciones que devuelve `start`.
import * as THREE from "three";
import { setupEnvironment } from "../environment.js?v=20261031-transition10";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createFloor } from "../floor.js?v=20261031-transition10";
import { studioLights, createComposer, enrichMetal, blackbody, organicPose, disassemblyOrder, sequenceSteps, loadModel, guardContext } from "../look.js?v=20261031-transition10";
import { createFlame } from "../flame.js?v=20261031-transition10";
import { createFlight } from "../flight.js?v=20261031-transition10";

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
  const modelLoad = loadModel(cfg.glb, "../draco/", { workerLimit: profile.dracoWorkers ?? 2 });
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
  guardContext(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);
  await setupEnvironment(renderer, scene, profile, "../hangar.hdr");
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
  const SUN_OFFSET = new THREE.Vector3(40, 60, 25), ORIGIN = new THREE.Vector3();
  sun.position.copy(SUN_OFFSET);
  sun.castShadow = true;
  sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
  const S = cfg.shadow;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 10, far: 160 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, new THREE.HemisphereLight(0xbcd2ff, 0x2a2622, 0.4));
  studioLights(scene, cfg.view.max / 4);
  const composer = await createComposer(renderer, scene, camera, profile, { aoRadius: cfg.view.max / 140 });
  const floor = createFloor(renderer, { ...cfg.floor, res: profile.textureSize });
  scene.add(floor);

  // ── modelo ──
  const gltf = await modelLoad;
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
      const entry = { obj: o, data: d, home: o.position.clone(), quat: o.quaternion.clone(), offset: fromBlender(d.explode || [0, 0, 0]), via: d.via ? fromBlender(d.via) : null, t: 0, materials: [], T: 15 };
      o.traverse((m) => m.isMesh && entry.materials.push(m));
      if (d.group === "engine" && d.part === cfg.engine) engineRoot = entry;
      if (d.group === cfg.engine) engineParts.push(entry);
      parts.push(entry);
    }
  });
  // cada pieza del motor con su propio material (para que brille sola cuando se calienta) y los metales con microdetalle
  const isEngineGroup = (d) => d.group === cfg.engine || (cfg.engineAlt && d.group === cfg.engineAlt);
  const clones = new Map();
  for (const e of parts) {
    for (const m of e.materials) {
      if (isEngineGroup(e.data)) m.material = m.material.clone();
      else if (m.material.metalness > 0.5) m.material = clones.get(m.material) ?? clones.set(m.material, m.material.clone()).get(m.material);
      if (m.material.metalness > 0.5 && profile.microdetail !== false) enrichMetal(m.material);
      allMaterials.add(m.material);
    }
  }
  for (const e of parts) for (const m of e.materials) m.userData.realMaterial = m.material;
  const spinners = engineParts.filter((e) => e.data.spin);
  const controlParts = parts.filter((e) => e.data.control).map((e) => ({
    e, kind: e.data.control, range: e.data.range, sign: e.data.sign ?? 1, rest: e.quat.clone(),
    axis: e.data.hinge ? fromBlender(e.data.hinge).normalize() : null,
    slide: e.data.slide ? fromBlender(e.data.slide).normalize() : null,
  }));
  // compuertas y flaps que van dentro de una pieza (puertas de la góndola, flaps del eyector, pétalos de la tobera):
  // giran sobre su bisagra y viajan con la pieza en el despiece
  const subControls = [];
  model.traverse((o) => {
    if (o.userData.subcontrol) subControls.push({ obj: o, kind: o.userData.subcontrol, rest: o.quaternion.clone(), axis: fromBlender(o.userData.hinge).normalize(), value: null });
  });
  $("loading")?.remove();
  const meshes = [];
  for (const e of parts) for (const m of e.materials) { m.userData.entry = e; meshes.push(m); }

  // ── estado: el motor, los gases y el Mach, que llega con inercia ──
  const motor = { on: false, spin: 0, heat: 0, angle: 0, thr: 0, target: cfg.throttle ?? 0.85, M: 0, Mtarget: 0, mission: null };
  const combustion = createCombustion();
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
  const UP = new THREE.Vector3(0, 1, 0);
  function applyPose(time) {
    for (const e of parts) organicPose(e, time, { up: UP, dir: e.dir ?? 1 });
  }
  // desarme y montaje pieza por pieza, por caminos libres (look.js); el montaje es el desarme al revés
  const order = disassemblyOrder(parts, {
    isGear: (e) => e.data.part.startsWith("tren"),
    isLate: (e) => late(e),
    root: engineRoot,
    isEngine: (e) => e.data.group === cfg.engine,
  });
  const labelOf = (e) => infoOf(e)?.name ?? e.data.label;
  function sequence(target, speed = 1) {
    const active = order.filter((e) => Math.abs(e.t - target) > 1e-6);
    if (!active.length) { timeline = null; setExploded(target); $("steps").style.display = "none"; return; }
    const steps = sequenceSteps(active, target, { speed, label: labelOf });
    for (const st of steps) st.from = st.e.t;
    timeline = { steps, start: performance.now() / 1000, total: Math.max(...steps.map((x) => x.at + x.dur)) + 0.1 };
    exploded = !!target;
    $("steps").style.display = "block";
  }
  function assemble(speed = 1) {
    exploded = false;
    for (const e of parts) if (e.offset.length() < 1e-6) e.t = 0;
    sequence(0, speed);
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
    for (const c of subControls) {
      const drive = cfg.drive[c.kind];
      if (!drive) continue;
      const v = drive(o, surf, c);
      if (v === c.value) continue;
      c.obj.quaternion.copy(c.rest).multiply(new THREE.Quaternion().setFromAxisAngle(c.axis, v * D));
      c.value = v;
    }
  }
  function slideControls() {
    for (const c of controlParts) if (c.slide && c.value) c.e.obj.position.addScaledVector(c.slide, c.value);
  }

  // ── llama: volumen con el gradiente de las fotos reales de este motor y diamantes de choque (flame.js) ──
  const flame = createFlame(scene, cfg.flame, { steps: profile.tier === "baja" ? 20 : profile.tier === "media" ? 28 : 40 });
  for (const p of cfg.plumes) flame.add(model, fromBlender(p.at).multiplyScalar(MM), p);   // viajan con el avión al volar


  // ── tren retráctil: cada pata gira sobre su anclaje y se guarda (la de morro hacia delante, las principales hacia el
  //    eje); ya dentro se oculta para que ninguna rueda asome por la piel ──
  const gearState = { t: 0, target: 0 };
  const fullBox = new THREE.Box3().setFromObject(model);
  const gearParts = parts.filter((e) => e.data.part.startsWith("tren")).map((e) => {
    const b = new THREE.Box3().setFromObject(e.obj);
    const c = b.getCenter(new THREE.Vector3());
    const pivot = e.obj.parent.worldToLocal(new THREE.Vector3(c.x, b.max.y, c.z));
    const nose = e.data.part === "tren.morro";
    const axis = nose ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const angle = nose ? Math.PI / 2 : (c.z < 0 ? -1 : 1) * Math.PI / 2;
    return { e, pivot, axis, angle, foot: new THREE.Vector3(c.x, b.min.y, c.z) };
  });
  const qGear = new THREE.Quaternion();
  function poseGear(dt) {
    gearState.t += (gearState.target - gearState.t) * Math.min(1, dt * 0.9);
    if (Math.abs(gearState.target - gearState.t) < 0.002) gearState.t = gearState.target;
    const k = gearState.t * gearState.t * (3 - 2 * gearState.t);
    for (const g of gearParts) {
      g.e.obj.visible = k < 0.97;
      if (k <= 0) continue;
      qGear.setFromAxisAngle(g.axis, g.angle * k);
      g.e.obj.position.sub(g.pivot).applyQuaternion(qGear).add(g.pivot);
      g.e.obj.quaternion.premultiply(qGear);
    }
  }

  // ── cabina: la cámara se sienta en el puesto delantero, bajo la cúpula, mirando el tablero ──
  // cada config da los ojos del piloto (mm del modelo) o sólo su estación x; si no, se toman de la cúpula
  const canopy = parts.find((e) => e.data.part === "cabina");
  let eye = null;
  const ck = cfg.cockpit;
  if (ck?.eye) {
    eye = { pos: fromBlender([ck.eye[0], 0, ck.eye[1]]).multiplyScalar(MM), target: fromBlender([ck.look[0], 0, ck.look[1]]).multiplyScalar(MM) };
  } else if (ck?.x) {
    const hit = new THREE.Raycaster(new THREE.Vector3(ck.x * MM, 100, 0), new THREE.Vector3(0, -1, 0)).intersectObject(model, true)[0];
    const top = hit ? hit.point.y : 0;
    // `side`, `lookSide`: desplazamiento lateral (mm, a la izquierda positivo) de los ojos y del punto al que miran
    eye = { pos: new THREE.Vector3(ck.x * MM, top - ck.drop * MM, -(ck.side ?? 0) * MM), target: new THREE.Vector3((ck.x + ck.look) * MM, top - ck.drop * MM - 0.25, -(ck.lookSide ?? ck.side ?? 0) * MM) };
  } else if (canopy) {
    const b = new THREE.Box3().setFromObject(canopy.obj);
    const len = b.max.x - b.min.x;
    const hgt = b.max.y - b.min.y;
    const x = b.max.x - Math.min(0.24 * len, 1.3);
    // los ojos del piloto, bajo la cúpula: a media altura entre el borde y el techo del vidrio
    eye = { pos: new THREE.Vector3(x, b.min.y + 0.45 * hgt, 0), target: new THREE.Vector3(x + 1.6, b.min.y + 0.2 * hgt, 0) };
  }
  let inCockpit = false;

  // ── vuelo: el mismo simulador del Hawk con la masa, el ala y el empuje de este avión ──
  const L = fullBox.max.x - fullBox.min.x;
  const span = fullBox.max.z - fullBox.min.z;
  const footY = gearParts.length ? Math.min(...gearParts.map((g) => g.foot.y)) : fullBox.min.y;
  const fly = cfg.fly;
  const m = fly.m;
  const wheels = gearParts.map((g) => ({ p: new THREE.Vector3(g.foot.x, footY, g.foot.z), steer: g.e.data.part === "tren.morro" }));
  const bellyY = footY + 0.6 * (fullBox.min.y < footY + 0.1 ? 1 : 1) * Math.max(0.6, (fly.belly ?? 1.2));
  const belly = [[0.35 * fullBox.max.x, bellyY, 0], [0.35 * fullBox.min.x, bellyY, 0], [0, bellyY, 0.3 * span], [0, bellyY, -0.3 * span]].map((q) => ({ p: new THREE.Vector3(...q) }));
  const flight = createFlight({
    scene, camera, model, op, motor, setGear: (t) => (gearState.target = t), gearState, pad: profile.pad,
    setSurfaces: (v) => Object.assign(surf, { roll: v.roll, pitch: v.pitch, yaw: v.yaw }),
    spec: {
      ac: { m, S: fly.S, b: fly.b, c: fly.c, I: new THREE.Vector3(0.0217, 0.0657, 0.048).multiplyScalar(m * fly.b * fly.b) },
      wheels, belly,
      world: { runway: [46, 3600], at: 1700, trees: 10, ground: 60000, fog: [2500, 30000], start: -footY + 0.05 },
      chase: [2.2 * L, 0.45 * L, 1.0 * L],
      eye: eye ? [eye.pos.x, eye.pos.y, 1.2] : [0.3 * L, 1, 1.2],
      near: [0.3, 0.05],
      // empuje de todos los motores según el Mach que lleva; el Mach del motor sigue al del vuelo (tomas, conos, toberas)
      thrust: (thr, V) => { motor.target = thr; motor.Mtarget = Math.min(cfg.maxMach, V / 340); return motor.on ? fly.engines * op(motor.M, motor.thr).thrust * 1000 * motor.spin : 0; },
      engineHud: (info, st) => `${cfg.say.engines}: ${motor.on ? `<b>${fmt(info.thrust / 1000)}</b> kN · Mach <b>${fmt(info.V / 340, 2)}</b>` : `apagados (${profile.pad?.touch ? "Motor" : "E"} para arrancar)`} · gas ${(st.throttle * 100).toFixed(0)} %`,
    },
  });
  let flying = false;


  // ── cámara de combustión: un segundo punto de vista, el motor cortado por su plano medio y el gas que lo recorre ──
  const FUEL = {
    J58: ["JP-7", "C₁₂H₂₆ + 18,5 O₂ → 12 CO₂ + 13 H₂O"],
    TBCC: ["JP-7 endotérmico", "C₁₂H₂₆ + 18,5 O₂ → 12 CO₂ + 13 H₂O"],
  }[cfg.engine] ?? ["JP-8", "C₁₁H₂₁ + 16,25 O₂ → 11 CO₂ + 10,5 H₂O"];
  if (!$("hud")) document.body.insertAdjacentHTML("beforeend", '<div class="ui" id="hud"></div>');
  if (!$("pip")) document.body.insertAdjacentHTML("beforeend", '<div class="ui" id="pip"><div class="head"><span>Cámara de combustión</span><span id="pipT"></span></div><div class="frame" id="pipFrame"></div><div class="chem" id="chem"></div></div>');
  const pipCam = new THREE.PerspectiveCamera(38, 340 / 220, 0.05, 200);
  const pipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), cfg.cut.z);
  let pipOn = false;
  const engBox = engineRoot ? new THREE.Box3().setFromObject(engineRoot.obj) : fullBox;
  const pipLen = engBox.max.x - engBox.min.x;
  // la cámara de combustión queda hacia el 40 % del motor contando desde la cara del compresor
  const pipAim = new THREE.Vector3(engBox.max.x - 0.42 * pipLen, (engBox.min.y + engBox.max.y) / 2, cfg.cut.z);
  function renderPip() {
    const r = $("pipFrame").getBoundingClientRect();
    if (!r.width) return;
    if (Math.abs(pipCam.aspect - r.width / r.height) > 1e-3) { pipCam.aspect = r.width / r.height; pipCam.updateProjectionMatrix(); }
    // de lado, a la altura del eje, con la cámara de combustión en el centro
    const tgt = pipAim.clone().applyMatrix4(model.matrixWorld);
    const pos = pipAim.clone().add(new THREE.Vector3(0, 0.15 * pipLen, 0.62 * pipLen)).applyMatrix4(model.matrixWorld);
    pipCam.position.copy(pos);
    pipCam.lookAt(tgt);
    pipPlane.normal.set(0, 0, -1).transformDirection(model.matrixWorld);
    pipPlane.constant = -pipPlane.normal.dot(new THREE.Vector3(0, 0, cfg.cut.z).applyMatrix4(model.matrixWorld));
    const [, H] = profile.size();
    const y = H - r.bottom;
    const flowWas = flow.visible;
    flow.visible = true;
    for (const stream of streams) stream.material.uniforms.onlyFlame.value = 1;
    // las piezas cortadas se ven por dentro: un instante con las dos caras
    const sides = [...allMaterials].map((m) => [m, m.side]);
    for (const m of allMaterials) m.side = THREE.DoubleSide;
    renderer.clippingPlanes = [pipPlane];
    renderer.setScissorTest(true);
    renderer.setScissor(r.left, y, r.width, r.height);
    renderer.setViewport(r.left, y, r.width, r.height);
    const bg = scene.background;
    scene.background = new THREE.Color(0x050608);
    renderer.render(scene, pipCam);
    scene.background = bg;
    renderer.clippingPlanes = [];
    for (const [m, side] of sides) m.side = side;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, ...profile.size());
    flow.visible = flowWas;
    for (const stream of streams) stream.material.uniforms.onlyFlame.value = cutOn ? 1 : 0;
    const burn = Number.isFinite(o.burner) ? o.burner - K : null;
    $("pipT").textContent = combustion.state.flame > .01 ? "en combustión" : motor.heat > .02 ? "caliente · sin combustión" : "fría";
    $("chem").innerHTML = `<b>${FUEL[1]}</b><br>Combustible ${FUEL[0]} · aire de la toma a <b>${fmt(o.T0 - K)}</b> °C` +
      (Number.isFinite(o.T3) ? ` · salida del compresor <b>${fmt(o.T3 - K)}</b> °C` : "") +
      (burn !== null ? `<br>Llama en la cámara ≈ <b>${fmt(motor.on ? burn * motor.heat + (o.T0 - K) * (1 - motor.heat) : o.T0 - K)}</b> °C` : "");
  }

  // ── corte por el plano medio del motor, con el aire que lo recorre coloreado por su temperatura ──
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), cfg.cut.z);
  let cutOn = false;
  // Superficies continuas para el gas y la llama; sin sprites ni partículas.
  const flow = new THREE.Group();
  flow.visible = false;
  scene.add(flow);
  const names = Object.keys(cfg.flow.paths);
  const curves = Object.fromEntries(names.map((n) => [n, new THREE.CatmullRomCurve3(cfg.flow.paths[n].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.2)]));
  const segments = profile.tier === "baja" ? 64 : 112, sides = 24;
  const streams = names.map((path) => {
    const positions = [], coords = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, p = curves[path].getPointAt(u);
      const [ry, rz] = cfg.flow.spread(path, u);
      for (let j = 0; j <= sides; j++) {
        const th = j / sides * Math.PI * 2;
        positions.push(...fromBlender([p.x, ry * Math.cos(th), p.z + rz * Math.sin(th)]).toArray());
        coords.push(u, j / sides);
        if (i < segments && j < sides) {
          const a = i * (sides + 1) + j, b = a + sides + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(coords, 2));
    geometry.setAttribute("burn", new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3), 1));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, clipping: true,
      uniforms: { time: { value: 0 }, heat: { value: 0 }, share: { value: 0 }, onlyFlame: { value: 0 }, rich: { value: 0 }, abStart: { value: cfg.engine === "J58" ? .47 : cfg.engine === "TBCC" ? .6 : .55 } },
      vertexShader: `#include <clipping_planes_pars_vertex>
        attribute float burn; varying vec2 vUv; varying float vBurn;
        void main(){ vUv=uv; vBurn=burn;
          vec4 mvPosition=modelViewMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: `#include <clipping_planes_pars_fragment>
        uniform float time, heat, share, onlyFlame, rich, abStart; varying vec2 vUv; varying float vBurn;
        void main(){
          #include <clipping_planes_fragment>
          float hot=smoothstep(.03,.35,vBurn)*sqrt(heat);
          float tongues=.76+.14*sin(vUv.y*37.7-vUv.x*22.+time*4.)
            +.1*sin(vUv.y*69.1+vUv.x*31.-time*6.);
          float fade=smoothstep(0.,.035,vUv.x)*(1.-smoothstep(.9,1.,vUv.x));
          vec3 clean=mix(vec3(.13,.28,1.),vec3(.68,.78,1.),smoothstep(.1,.85,vBurn));
          vec3 luminous=mix(vec3(1.,.78,.32),vec3(1.,.34,.075),vUv.y*.25);
          float warmth=rich*mix(.45,1.,smoothstep(abStart-.02,abStart+.04,vUv.x));
          vec3 color=mix(clean,luminous,warmth);
          float alpha=fade*share*tongues*(.13*(1.-onlyFlame)*(1.-hot)+.95*hot);
          gl_FragColor=vec4(color*(1.+.45*hot),min(.95,alpha));
        }`,
    });
    const roots = parts.filter((e) => e.data.group === "engine" && (e.data.part === cfg.engine || e.data.part === cfg.engineAlt));
    for (const root of roots) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.noAO = true;
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      mesh.userData.root = root.obj;
      flow.add(mesh);
    }
    return { path, geometry, material };
  });
  function stepFlow(dt) {
    if ((!flow.visible && !pipOn) || !engineRoot) return;
    for (const mesh of flow.children) {
      // Actualizar también sus ancestros después de mover el avión y sus mecanismos.
      mesh.userData.root.updateWorldMatrix(true, false);
      mesh.matrix.copy(mesh.userData.root.matrixWorld);
      mesh.matrixWorldNeedsUpdate = true;
    }
    const running = motor.on && motor.spin > 0.3;
    for (const { path, geometry, material } of streams) {
      material.uniforms.time.value += dt * (.5 + motor.thr);
      material.uniforms.heat.value = combustion.state.flame;
      material.uniforms.rich.value = Math.min(.85, .18 + .45 * combustion.state.startup + .4 * combustion.state.afterburner);
      material.uniforms.share.value = Math.max(0, cfg.flow.share(path, o));
      const burn = geometry.attributes.burn;
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        // La llama aparece donde la combustión añade calor, también en postquemador y ramjet.
        const added = reactionAt(cfg.engine, path, u, combustion.state, o);
        for (let j = 0; j <= sides; j++) burn.setX(i * (sides + 1) + j, added);
      }
      burn.needsUpdate = true;
    }
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
    for (const stream of streams) {
      stream.material.clippingPlanes = on ? [cutPlane] : null;
      stream.material.uniforms.onlyFlame.value = on ? 1 : 0;
      stream.material.needsUpdate = true;
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
  const state = () => ({ exploded, running: motor.on, heat: heatOn, cut: cutOn, surfaces: demo, mission: !!motor.mission, mach: motor.Mtarget, throttle: motor.target, gear: !!gearState.target, cockpit: inCockpit, flying, pip: pipOn });
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
    gear() { if (!gearState.target) settle(); gearState.target = gearState.target ? 0 : 1; notify(); },
    cockpit() {
      if (!eye) return;
      inCockpit = !inCockpit;
      controls.minDistance = inCockpit ? 0.05 : 4;
      if (inCockpit) { settle(); setCut(false); }
      // desde dentro se ve la cara interior de la piel (en la vista de fuera sólo se dibuja la exterior)
      for (const mt of allMaterials) if (!cfg.doubleSided?.test(mt.name) && !mt.transparent && !(mt.transmission > 0)) mt.side = inCockpit ? THREE.DoubleSide : THREE.FrontSide;
      demo = inCockpit;
      if (!demo) Object.assign(surf, { roll: 0, pitch: 0, yaw: 0 });
      flyCamera(inCockpit ? eye : "home");
      notify();
    },
    fly() {
      flying = !flying;
      document.body.toggleAttribute("data-flying", flying);
      if (flying) { timeline = null; setExploded(0); setCut(false); demo = false; motor.mission = null; controls.enabled = false; floor.visible = false; gearState.target = 0; gearState.t = 0; flight.enter(); }
      else { flight.exit(); controls.enabled = true; floor.visible = true; Object.assign(surf, { roll: 0, pitch: 0, yaw: 0 }); gearState.target = 0; gearState.t = 0; motor.Mtarget = 0; flyCamera(inCockpit ? eye : "home"); }
      notify();
    },
    pip() { pipOn = !pipOn; $("pip").style.display = pipOn ? "block" : "none"; notify(); },
  };
  window.__sim = { motor, camera, controls, model, op: () => o, pipCam, gearState };

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
    if (Math.abs(next - ratio) > 0.02) { ratio = next; renderer.setPixelRatio(ratio); renderer.setSize(...profile.size()); composer.setPixelRatio?.(ratio); composer.setSize(...profile.size()); }
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
    if (flying) flight.update(dt);
    if (demo && !flying) Object.assign(surf, { roll: Math.sin(now * 1.1), pitch: Math.sin(now * 0.8) * 0.8, yaw: Math.sin(now * 0.6) });
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
    poseGear(dt);
    motor.angle += dt * motor.spin * (8 + 30 * motor.thr) * (o.turbine ?? 1);
    for (const e of spinners) e.obj.rotation.x = motor.angle * (e.data.spin ?? 1);
    const assembled = parts.every((e) => e.t < 0.02);
    const burning = combustion.update(dt, motor, o);
    const plumeState = cfg.flame.state(o, motor);
    const augmented = Math.max(burning.afterburner, burning.ram);
    // En seco sólo un resplandor corto; el chorro largo requiere combustión aumentada.
    plumeState.level *= burning.flame * (.035 + .965 * augmented);
    plumeState.reach = .06 + .94 * augmented;
    flame.update({ ...plumeState, time: now, visible: burning.flame > .01 && assembled });
    stepFlow(dt);
    // el metal que pasa de ~520 °C empieza a brillar con su color de cuerpo negro
    if (!heatOn) for (const e of engineParts) { if (e === hovered) continue; const g = blackbody(e.T); for (const m of e.materials) m.material.emissive?.copy(g); }
    if (heatOn && (heatTick += dt) > 0.2) { heatTick = 0; paintHeat(); }
    if (hovered && heatTick % 0.2 < dt) showCard(hovered);
    const md = modeOf(motor.M);
    if (md.key !== lastMode) { lastMode = md.key; $("mode").innerHTML = `<b>${md.name}</b> · ${md.say}`; }
    $("mode").style.display = motor.on && !timeline ? "block" : "none";
    $("readout").innerHTML = motor.on || motor.M > 0.05 ? cfg.readout(o, motor, md, K) : `En tierra · ${parts.length} piezas · ${cfg.say.engines}`;
    profile.onFrame?.(motor);
    if (!flying) { stepCamera(now); controls.update(); }
    sun.target.position.copy(flying ? model.position : ORIGIN);
    sun.position.copy(sun.target.position).add(SUN_OFFSET);
    sun.target.updateMatrixWorld();
    // el cambio de resolución va antes de dibujar: si va después, ese cuadro se ve negro
    adapt(dt);
    composer.render();
    if (pipOn) renderPip();
    requestAnimationFrame(frame);
  }
  function resize() {
    const [w, h] = profile.size();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (!camTween && !cutOn && !inCockpit && !flying) flyCamera("home");
    composer.render();   // cambiar el tamaño borra el lienzo: se vuelve a dibujar en el acto para que no parpadee en negro
  }
  setExploded(1);
  // Introducción pausada: 0,8 s de despiece y 6,4 s de montaje.
  assemble(.5);
  if (timeline) timeline.start += .8;
  frame();
  return { actions, state, pick, focusPicked, resize, onChange: (fn) => { listeners.add(fn); fn(state()); }, canvas: renderer.domElement, maxMach: cfg.maxMach };
}
