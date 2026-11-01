// Simulador de vuelo de la maqueta: dinámica de 6 grados de libertad a escala real del modelo (≈ 7 kg, 1,34 m de
// envergadura), con el empuje de la MW54 del mismo modelo que el resto de la página. Ejes del cuerpo: x morro, y arriba,
// z ala derecha. Coeficientes aerodinámicos típicos de un entrenador de ala en flecha, ajustados a esta escala.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { createTerrain } from "./terrain.js";

const RHO = 1.225;
const G0 = 9.81;
const AC = { m: 7.2, S: 0.34, b: 1.34, c: 0.28, I: new THREE.Vector3(0.28, 0.85, 0.62) };
const CL = { a: 4.6, z: 0.0, flap: 0.55, de: 0.35, stall: THREE.MathUtils.degToRad(15) };
const CD = { z: 0.028, k: 0.065, flap: 0.05, gear: 0.018 };
const CM = { z: 0.0, a: -0.9, q: -14, de: -1.15, flap: -0.06 };
const CR = { b: -0.08, p: -0.48, da: 0.2, r: 0.08 };
const CN = { b: 0.13, r: -0.18, dr: -0.09 };
const WHEELS = [
  { p: new THREE.Vector3(0.6, -0.18, 0), steer: true },
  { p: new THREE.Vector3(-0.04, -0.18, 0.238) },
  { p: new THREE.Vector3(-0.04, -0.18, -0.238) },
];
// puntos que no deben tocar nada: morro, cola, deriva y puntas de ala (las ruedas y la panza son los que apoyan)
const SKIN = [[0.78, 0, 0], [-0.8, 0.05, 0], [-0.68, 0.32, 0], [-0.12, 0.02, 0.67], [-0.12, 0.02, -0.67], [0.2, 0.1, 0]].map((p) => new THREE.Vector3(...p));
const BELLY = [[0.5, -0.06, 0], [-0.3, -0.06, 0], [-0.04, -0.07, 0.24], [-0.04, -0.07, -0.24]].map((p) => ({ p: new THREE.Vector3(...p) }));

export function createFlight({ scene, renderer, camera, model, op, motor, lite, setGear, setSurfaces, gearState, pad }) {
  const world = new THREE.Group();
  world.visible = false;
  scene.add(world);
  // ── terreno, pista y cielo ──
  const terrain = createTerrain({ lite });
  world.add(terrain.group);
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 4096;
  const g = cv.getContext("2d");
  g.fillStyle = "#2b2c2e";
  g.fillRect(0, 0, 256, 4096);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 256, Math.random() * 4096, 2, 2); }
  g.fillStyle = "#e8e6e0";
  for (let y = 300; y < 3800; y += 160) g.fillRect(124, y, 8, 80);
  g.fillRect(8, 0, 6, 4096);
  g.fillRect(242, 0, 6, 4096);
  for (let k = 0; k < 8; k++) { g.fillRect(24 + k * 26, 60, 14, 160); g.fillRect(24 + k * 26, 3876, 14, 160); }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = lite ? 2 : 8;
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(14, 320), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  runway.rotation.x = -Math.PI / 2;
  runway.rotation.z = Math.PI / 2;
  runway.position.set(120, 0.03, 0);
  runway.receiveShadow = true;
  world.add(runway);
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(60), THREE.MathUtils.degToRad(160));
  Object.assign(sky.material.uniforms.sunPosition.value, sun);
  sky.material.uniforms.turbidity.value = 4;
  sky.material.uniforms.rayleigh.value = 1.4;
  // el cielo no cambia (sol fijo): se hornea una vez en un cubo y se usa de fondo, en vez de calcular la dispersión
  // atmosférica en cada píxel de cada cuadro
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  let skyCube = null;
  function bakeSky() {
    const rt = new THREE.WebGLCubeRenderTarget(lite ? 256 : 512, { type: THREE.HalfFloatType });
    new THREE.CubeCamera(1, 20000, rt).update(renderer, skyScene);
    return rt.texture;
  }
  let bgBefore = null;

  // ── viento visible: torbellinos de punta de ala (se ven cuando el ala carga) y vetas de aire que pasan junto al avión
  // a la velocidad relativa, más largas y opacas cuanto más rápido vuela ──
  const fx = new THREE.Group();
  world.add(fx);
  const TRAIL = 70;
  const TIPS = [new THREE.Vector3(-0.12, 0.02, 0.67), new THREE.Vector3(-0.12, 0.02, -0.67)];
  const trails = TIPS.map(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL * 4), 4));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    line.frustumCulled = false;
    fx.add(line);
    return { geo, n: 0 };
  });
  const STREAKS = lite ? 70 : 160;
  const streakGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(STREAKS * 6);
  const sCol = new Float32Array(STREAKS * 8);
  streakGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  streakGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 4));
  const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  streaks.frustumCulled = false;
  fx.add(streaks);
  const air = Array.from({ length: STREAKS }, () => ({ p: new THREE.Vector3(), seed: Math.random() }));
  // cada veta es un punto quieto en el aire (se mueve sólo con el viento) que se recoloca delante del avión al quedar atrás
  function seedAir(a, ahead) {
    const fwd = s.v.lengthSq() > 1 ? s.v.clone().normalize() : new THREE.Vector3(1, 0, 0).applyQuaternion(s.q);
    const side = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();
    const up = fwd.clone().cross(side).normalize();
    const r = 0.5 + Math.random() * 2.2;
    const th = Math.random() * Math.PI * 2;
    a.p.copy(s.p).addScaledVector(fwd, ahead ? 6 + Math.random() * 10 : (Math.random() - 0.3) * 16).addScaledVector(side, Math.cos(th) * r).addScaledVector(up, Math.sin(th) * r * 0.7);
  }
  function paintWind(dt, info) {
    const Vk = THREE.MathUtils.smoothstep(info.V, 6, 30);
    // torbellinos: con más ángulo de ataque (más carga) se condensan; en tierra no hay
    const load = info.onGround ? 0 : Vk * THREE.MathUtils.clamp(0.25 + info.alpha * 5, 0, 1);
    TIPS.forEach((tip, k) => {
      const t = trails[k];
      const pos = t.geo.attributes.position.array;
      const col = t.geo.attributes.color.array;
      pos.copyWithin(3, 0, (TRAIL - 1) * 3);
      col.copyWithin(4, 0, (TRAIL - 1) * 4);
      const w = tip.clone().applyQuaternion(s.q).add(s.p);
      pos.set([w.x, w.y, w.z], 0);
      col.set([1, 1, 1, load * 0.75], 0);
      t.n = Math.min(TRAIL, t.n + 1);
      for (let i = 0; i < TRAIL; i++) col[i * 4 + 3] *= i === 0 ? 1 : 0.985;
      for (let i = 0; i < TRAIL; i++) { const j = i * 3; pos[j] += wind.x * dt; pos[j + 1] += (wind.y - 0.15) * dt; pos[j + 2] += wind.z * dt; }
      if (t.n < TRAIL) for (let i = t.n; i < TRAIL; i++) { pos.copyWithin(i * 3, (t.n - 1) * 3, t.n * 3); col[i * 4 + 3] = 0; }
      t.geo.attributes.position.needsUpdate = t.geo.attributes.color.needsUpdate = true;
    });
    // vetas: largo = el camino que recorre el aire respecto al avión en ~1/20 s
    const rel = wind.clone().sub(s.v);
    const fwd = s.v.lengthSq() > 1 ? s.v.clone().normalize() : new THREE.Vector3(1, 0, 0);
    for (let i = 0; i < STREAKS; i++) {
      const a = air[i];
      a.p.addScaledVector(wind, dt);
      const d = a.p.clone().sub(s.p);
      if (d.dot(fwd) < -10 || d.length() > 20) seedAir(a, true);
      const near = 1 - THREE.MathUtils.smoothstep(a.p.distanceTo(s.p), 1.5, 9);
      const al = Vk * near * (0.25 + 0.35 * a.seed);
      const tail = a.p.clone().addScaledVector(rel, -0.05);
      sPos.set([a.p.x, a.p.y, a.p.z, tail.x, tail.y, tail.z], i * 6);
      sCol.set([0.9, 0.95, 1, al, 0.9, 0.95, 1, 0], i * 8);
    }
    streakGeo.attributes.position.needsUpdate = streakGeo.attributes.color.needsUpdate = true;
  }

  // ── viento real: brisa constante con ráfagas y turbulencia que crece al despegarse del suelo ──
  const wind = new THREE.Vector3();
  // brisa moderada casi de cara a la pista (las pistas se orientan al viento dominante): se nota en la manga sin
  // empujar el avión fuera del eje al rodar
  const BREEZE = new THREE.Vector3(-1.6, 0, 0.2);
  function stepWind(t, alt) {
    const gust = 0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1.3);
    const turb = THREE.MathUtils.clamp(alt / 25, 0.1, 1) * 0.55;
    wind.copy(BREEZE).multiplyScalar(gust);
    wind.x += turb * (Math.sin(t * 1.7) + 0.5 * Math.sin(t * 4.3 + 2));
    wind.y += turb * 0.6 * (Math.sin(t * 2.1 + 0.7) + 0.5 * Math.sin(t * 5.9));
    wind.z += turb * (Math.sin(t * 1.3 + 4) + 0.5 * Math.sin(t * 3.7 + 1));
  }

  // ── estado ──
  const s = { p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), throttle: 0, roll: 0, pitch: 0, yaw: 0, flap: 0.5, brake: 0, gearUp: false, crashed: false, cam: "chase", t: 0, assist: true };
  const keys = new Set();
  const home = { pos: model.position.clone(), quat: model.quaternion.clone() };
  function reset() {
    s.p.set(0, 0.185, 0);
    s.v.set(0, 0, 0);
    s.q.identity();
    s.w.set(0, 0, 0);
    s.throttle = 0;
    s.flap = 0.5;
    s.gearUp = false;
    s.onGround = true;
    s.hold = 0;
    s.crashed = false;
    s.crashWhy = "";
    gearState.target = 0;
    for (const t of trails) t.n = 0;
    for (const a of air) seedAir(a, false);
  }
  const act = {
    gear() { if (s.p.y > 1.5) { s.gearUp = !s.gearUp; gearState.target = s.gearUp ? 1 : 0; } },
    flap() { s.flap = s.flap > 0.6 ? 0 : s.flap + 0.5; },
    cam() { s.cam = s.cam === "chase" ? "cockpit" : "chase"; },
    reset,
    engine() { motor.on = !motor.on; },
    assist() { s.assist = !s.assist; },
  };
  const onKey = (down) => (e) => {
    const k = e.key.toLowerCase();
    if (down && !e.repeat) {
      if (k === "g") act.gear();
      if (k === "f") act.flap();
      if (k === "c") act.cam();
      if (k === "r") act.reset();
      if (k === "e") act.engine();
      if (k === "t") act.assist();
    }
    if (["w", "s", "a", "d", "q", "e", "shift", "control", "b", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
    down ? keys.add(k) : keys.delete(k);
  };
  const kd = onKey(true);
  const ku = onKey(false);

  // teclado, palancas táctiles y mando de juego llegan sumados por la capa de mandos común (controls.js)
  let analog = null;
  const isTouch = () => !!pad?.touch;

  const tmp = new THREE.Vector3();
  function crash(why) {
    if (s.crashed) return;
    s.crashed = true;
    s.crashWhy = why;
    s.v.set(0, 0, 0);
    s.w.set(0, 0, 0);
  }
  const vb = new THREE.Vector3();
  function step(dt) {
    // mandos con su recorrido real y algo de inercia
    const want = (a, b) => (keys.has(a) ? 1 : 0) - (keys.has(b) ? 1 : 0);
    const clamp1 = (v) => Math.max(-1, Math.min(1, v));
    const ax = analog;
    s.pitch += (clamp1(want("s", "w") + (ax?.pitch ?? 0)) - s.pitch) * Math.min(1, dt * 6);
    s.roll += (clamp1(want("d", "a") + (ax?.roll ?? 0)) - s.roll) * Math.min(1, dt * 7);
    // en tierra el giróscopo también va en la rueda de morro y el timón (como en los reactores de radiocontrol): con el
    // pedal suelto sostiene el rumbo que llevaba, así el viento cruzado no lo saca de la pista
    let yawIn = clamp1(want("z", "x") + (ax?.yaw ?? 0));
    const fwdNow = new THREE.Vector3(1, 0, 0).applyQuaternion(s.q);
    const psi = Math.atan2(fwdNow.z, fwdNow.x);
    // sólo rodando (menos de 25 m/s) y con fuerza que baja con la velocidad: cerca de la rotación el timón ya muerde
    // fuerte y un golpe a fondo, con el diedro, tumbaba el avión al despegar
    const vGround = s.v.length();
    if (!s.onGround || Math.abs(yawIn) > 0.02 || vGround < 1 || vGround > 25) s.hold = psi;
    else if (s.assist) {
      const lim = THREE.MathUtils.clamp(10 / vGround, 0.4, 1);
      yawIn = THREE.MathUtils.clamp(Math.atan2(Math.sin(psi - s.hold), Math.cos(psi - s.hold)) * 6 + s.w.y * 0.4, -lim, lim);
    }
    s.yaw += (yawIn - s.yaw) * Math.min(1, dt * 5);
    if (keys.has("shift") || keys.has("arrowup")) s.throttle = Math.min(1, s.throttle + dt * 0.5);
    if (keys.has("control") || keys.has("arrowdown")) s.throttle = Math.max(0, s.throttle - dt * 0.5);
    if (ax?.throttle != null) s.throttle = ax.throttle;
    if (ax?.throttleRate) s.throttle = Math.min(1, Math.max(0, s.throttle + ax.throttleRate * dt * 0.6));
    s.brake = keys.has("b") || keys.has(" ") ? 1 : 0;
    motor.target = s.throttle;
    const o = op(motor.f);
    const thrust = motor.on ? o.thrust * motor.spin : 0;

    const R = new THREE.Matrix4().makeRotationFromQuaternion(s.q);
    const Rt = R.clone().transpose();
    s.t += dt;
    stepWind(s.t, s.p.y);
    vb.copy(s.v).sub(wind).applyMatrix4(Rt);
    const V = Math.max(0.01, vb.length());
    const alpha = Math.atan2(-vb.y, vb.x);
    const beta = Math.asin(THREE.MathUtils.clamp(vb.z / V, -1, 1));
    const qbar = 0.5 * RHO * V * V;
    // tirar (S) sube el morro: borde de salida del estabilizador hacia arriba, deflexión negativa
    // doble régimen automático con el giróscopo puesto (como en los reactores de radiocontrol): el recorrido baja con la
    // presión dinámica, así la palanca a fondo da el mismo giro firme a 90 que a 200 km/h; con las teclas (todo o nada)
    // los recorridos completos a 140 km/h daban más de 250°/s y el piloto entraba en oscilación
    const rate = s.assist ? THREE.MathUtils.clamp((22 / Math.max(V, 1)) ** 2, 0.22, 1) : 1;
    const de = -s.pitch * THREE.MathUtils.degToRad(16) * rate;
    const da = s.roll * THREE.MathUtils.degToRad(20) * rate;
    const dr = -s.yaw * THREE.MathUtils.degToRad(22) * Math.max(rate, 0.45);
    const flap = s.flap * 0.8;
    const gearDown = 1 - gearState.t;
    // sustentación con pérdida: por encima de ~15° de ataque cae hacia una placa plana
    let cl = CL.z + CL.a * alpha + CL.flap * flap - CL.de * de * 0.1;
    if (Math.abs(alpha) > CL.stall) cl = Math.sign(alpha) * (CL.a * CL.stall) * Math.max(0.35, 1 - (Math.abs(alpha) - CL.stall) * 3) + CL.flap * flap * 0.5;
    const cd = CD.z + CD.k * cl * cl + CD.flap * flap + CD.gear * gearDown + 0.4 * Math.max(0, Math.abs(alpha) - CL.stall);
    const F = new THREE.Vector3();
    if (V > 0.5) {
      const vdir = vb.clone().normalize();
      const liftDir = new THREE.Vector3(0, 0, 1).cross(vdir).normalize();
      F.addScaledVector(liftDir, qbar * AC.S * cl);
      F.addScaledVector(vdir, -qbar * AC.S * cd);
      F.z += -qbar * AC.S * 0.6 * beta;
    }
    F.x += thrust;
    const p = (s.w.x * AC.b) / (2 * V);
    const r = (s.w.y * AC.b) / (2 * V);
    const qd = (s.w.z * AC.c) / (2 * V);
    const M = new THREE.Vector3(
      qbar * AC.S * AC.b * (CR.b * beta + CR.p * p + CR.da * da + CR.r * r),
      qbar * AC.S * AC.b * (CN.b * -beta + CN.r * r + CN.dr * dr),
      qbar * AC.S * AC.c * (CM.z + CM.a * alpha + CM.q * qd + CM.de * de + CM.flap * flap),
    );
    // giroscopio estabilizador (como los que llevan los reactores de radiocontrol): con la palanca suelta nivela las
    // alas y sostiene la trayectoria; con palanca, sólo amortigua
    if (s.assist && V > 8) {
      const right = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q);
      const bank = Math.asin(THREE.MathUtils.clamp(-right.y, -1, 1));
      const gamma = Math.asin(THREE.MathUtils.clamp(s.v.y / V, -1, 1));
      const kq = qbar * AC.S;
      M.x += Math.abs(s.roll) < 0.05 ? kq * AC.b * (-0.06 * bank - 0.3 * p) : kq * AC.b * -0.2 * p;
      M.z += Math.abs(s.pitch) < 0.05 ? kq * AC.c * (-0.35 * gamma - 3 * qd) : kq * AC.c * -3 * qd;
    }
    // gravedad y suelo, en ejes de mundo
    const Fw = F.clone().applyMatrix4(R);
    Fw.y -= AC.m * G0;
    const Mw = new THREE.Vector3();
    let onGround = false;
    const contacts = gearState.t < 0.05 ? WHEELS : BELLY;
    for (const c of contacts) {
      const rp = c.p.clone().applyQuaternion(s.q);
      const pw = rp.clone().add(s.p);
      const pen = terrain.heightAt(pw.x, pw.z) - pw.y;
      if (pen <= 0) continue;
      // meterse 30 cm en el suelo sólo pasa chocando contra una ladera o un árbol de frente
      if (pen > 0.3) crash("contra el terreno");
      onGround = true;
      const vel = s.v.clone().add(new THREE.Vector3().copy(s.w).applyQuaternion(s.q).cross(rp));
      const n = Math.max(0, 9000 * pen - 260 * vel.y);
      const fc = new THREE.Vector3(0, n, 0);
      // rozamiento: rodadura y freno en las ruedas, arrastre en la panza
      const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(s.q).setY(0).normalize();
      const side = new THREE.Vector3(0, 1, 0).cross(fwd);
      const mu = contacts === BELLY ? 0.5 : 0.02 + 0.5 * s.brake;
      fc.addScaledVector(fwd, -Math.sign(vel.dot(fwd)) * Math.min(Math.abs(vel.dot(fwd)) * 40, mu * n));
      // rueda de morro en el mismo sentido que el timón (Z a la izquierda, X a la derecha); antes giraba al revés y en
      // tierra el asistente de rumbo agrandaba el desvío hasta el trompo
      const steerV = c.steer ? vel.dot(side) + fwd.dot(vel) * dr * 0.8 : vel.dot(side);
      // el neumático no se deja arrastrar de lado: rigidez lateral de 400 N·s/m hasta el límite de adherencia (con 60 el
      // viento cruzado sobre la deriva hacía girar el avión parado hasta dar un trompo)
      fc.addScaledVector(side, -THREE.MathUtils.clamp(steerV * 400, -0.9 * n, 0.9 * n));
      Fw.add(fc);
      Mw.add(rp.clone().cross(fc));
      if (contacts === BELLY && -vel.y > 2.5) crash("aterrizaje de panza demasiado fuerte");
      if (contacts === WHEELS && -vel.y > 4) crash("aterrizaje demasiado fuerte, se rompió el tren");
    }
    s.v.addScaledVector(Fw, dt / AC.m);
    s.p.addScaledVector(s.v, dt);
    // colisiones: cada punto del fuselaje y las alas contra el terreno y contra árboles, hangares y el mástil
    for (const c of SKIN) {
      const pw = tmp.copy(c).applyQuaternion(s.q).add(s.p);
      const what = terrain.hit(pw);
      if (what) { crash(`choque contra ${what}`); break; }
      if (terrain.heightAt(pw.x, pw.z) - pw.y > 0.03) { crash(c.z ? "una punta de ala tocó el suelo" : c.x > 0 ? "el morro contra el suelo" : "la cola contra el suelo"); break; }
    }
    // dinámica angular en ejes del cuerpo
    const Mb = M.add(Mw.applyMatrix4(Rt));
    const Iw = new THREE.Vector3(AC.I.x * s.w.x, AC.I.y * s.w.y, AC.I.z * s.w.z);
    const gyro = s.w.clone().cross(Iw);
    s.w.x += ((Mb.x - gyro.x) / AC.I.x) * dt;
    s.w.y += ((Mb.y - gyro.y) / AC.I.y) * dt;
    s.w.z += ((Mb.z - gyro.z) / AC.I.z) * dt;
    if (onGround) s.w.multiplyScalar(0.995);
    const dq = new THREE.Quaternion(s.w.x * dt * 0.5, s.w.y * dt * 0.5, s.w.z * dt * 0.5, 0).multiply(s.q);
    s.q.x += dq.x; s.q.y += dq.y; s.q.z += dq.z; s.q.w += dq.w;
    s.q.normalize();
    setSurfaces({ roll: s.roll, pitch: s.pitch, yaw: s.yaw, flap: s.flap });
    s.onGround = onGround;
    return { V, alpha, onGround, thrust };
  }

  let info = { V: 0, alpha: 0, onGround: true, thrust: 0 };
  const camPos = new THREE.Vector3(-3.4, 0.9, 0);
  function update(dt) {
    if (s.crashed) { $hud(`<b>Accidente</b> · ${s.crashWhy}<br>${isTouch() ? "Reinicio" : "R"} para volver a la pista`); return; }
    analog = pad?.read() ?? null;
    for (let i = 0; i < 8; i++) info = step(dt / 8);
    paintWind(dt, info);
    terrain.setWind(wind, dt);
    model.position.copy(s.p);
    model.quaternion.copy(s.q);
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(s.q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(s.q);
    if (s.cam === "chase") {
      const back = camera.aspect < 1 ? 2.6 : 3.4;
      // el retardo se aplica a la posición relativa al avión, no a la absoluta: a 150 km/h la cámara no se queda atrás
      const want = fwd.clone().multiplyScalar(-back).add(new THREE.Vector3(0, back * 0.27, 0));
      camPos.lerp(want, Math.min(1, dt * 3));
      camera.position.copy(s.p).add(camPos);
      camera.up.set(0, 1, 0);
      // se mira un poco por debajo del avión: así queda en la mitad de arriba de la pantalla, por encima de los mandos
      // (palancas y consolas en el celular, barra de botones en el escritorio)
      camera.lookAt(s.p.clone().addScaledVector(fwd, 2).add(new THREE.Vector3(0, isTouch() ? -0.8 : -0.5, 0)));
    } else {
      // ojos del piloto delantero: sobre el asiento, a la altura del cabezal, mirando por encima del HUD
      camera.position.copy(s.p).addScaledVector(fwd, 0.486).addScaledVector(up, 0.09);
      camera.up.copy(up);
      camera.lookAt(camera.position.clone().addScaledVector(fwd, 10).addScaledVector(up, -1.7));
    }
    const fovWant = s.cam === "chase" ? null : 70;
    if (fovWant && camera.fov !== fovWant) { camera.fov = fovWant; camera.updateProjectionMatrix(); }
    if (!fovWant && s.cam !== update.cam) fit();
    update.cam = s.cam;
    const o = op(motor.f);
    const alt = Math.max(0, s.p.y - terrain.heightAt(s.p.x, s.p.z));
    const kmh = info.V * 3.6;
    const vs = s.v.y;
    const stall = info.alpha > CL.stall;
    // pantalla estrecha: tres líneas cortas con lo que se mira volando; los estados de tren, flaps y giro ya los
    // muestran encendidos sus botones
    if (innerWidth < 560) {
      $hud(
        `<b>${kmh.toFixed(0)}</b> km/h · <b>${alt.toFixed(0)}</b> m · ${vs >= 0 ? "+" : ""}${vs.toFixed(1)} m/s<br>` +
        (motor.on ? `<b>${Math.round((o.n * motor.spin) / 1000)}k</b> rpm · ${info.thrust.toFixed(0)} N · gas ${(s.throttle * 100).toFixed(0)} %` : "MW54 apagada · Motor para arrancar") +
        (stall ? "<br><b>PÉRDIDA</b> · baja el morro" : s.brake ? "<br>frenos" : ""),
      );
      return;
    }
    $hud(
      `<b>${kmh.toFixed(0)}</b> km/h · <b>${alt.toFixed(1)}</b> m · ${vs >= 0 ? "+" : ""}${vs.toFixed(1)} m/s · α ${THREE.MathUtils.radToDeg(info.alpha).toFixed(0)}°<br>` +
      `MW54 ${motor.on ? `<b>${Math.round(o.n * motor.spin).toLocaleString("es-ES")}</b> rpm · ${info.thrust.toFixed(0)} N · EGT ${Math.round(15 + (o.egt - 15) * motor.heat)} °C` : `apagada (${isTouch() ? "Motor" : "E"} para arrancar)`} · gas ${(s.throttle * 100).toFixed(0)} %<br>` +
      `Viento ${wind.length().toFixed(1)} m/s · Tren ${gearState.t < 0.05 ? "abajo" : gearState.t > 0.95 ? "arriba" : "en tránsito"} · flaps ${(s.flap * 40).toFixed(0)}° · giróscopo ${s.assist ? "sí" : "no"}${s.brake ? " · frenos" : ""}${stall ? " · <b>PÉRDIDA</b>" : ""}`,
    );
  }
  let lastHud = "";
  function $hud(html) { if (html !== lastHud) { lastHud = html; document.getElementById("hud").innerHTML = html; } }
  // campo de visión horizontal fijo (~56°): en un teléfono vertical el avión no se sale por los lados
  function fit() {
    camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(28)) / camera.aspect)), 40, 66);
    camera.updateProjectionMatrix();
  }

  // el aeródromo con su cielo, compartido con la exhibición; fx son los efectos de viento del avión pilotado
  function showWorld(on, withFx = on) {
    if (on && !world.visible) { skyCube ??= bakeSky(); bgBefore = scene.background; scene.background = skyCube; }
    if (!on && world.visible) scene.background = bgBefore;
    world.visible = on;
    fx.visible = withFx;
    scene.fog = on ? new THREE.Fog(0xa9bfd4, 900, lite ? 4500 : 6500) : null;
    camera.up.set(0, 1, 0);
    camera.near = on ? 0.004 : 0.01;
    camera.far = on ? 12000 : 50;
    if (on) fit();
    else { camera.fov = 32; camera.updateProjectionMatrix(); }
  }

  return {
    enter() {
      showWorld(true);
      reset();
      pad?.reset(0);
      addEventListener("keydown", kd);
      addEventListener("keyup", ku);
      camPos.set(-3.4, 0.9, 0);
    },
    exit() {
      showWorld(false);
      removeEventListener("keydown", kd);
      removeEventListener("keyup", ku);
      keys.clear();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      model.position.copy(home.pos);
      model.quaternion.copy(home.quat);
    },
    update,
    fit,
    showWorld,
    home,
    terrain,
    state: s,
  };
}
