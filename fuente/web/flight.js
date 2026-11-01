// Simulador de vuelo de la maqueta: dinámica de 6 grados de libertad a escala real del modelo (≈ 7 kg, 1,34 m de
// envergadura), con el empuje de la MW54 del mismo modelo que el resto de la página. Ejes del cuerpo: x morro, y arriba,
// z ala derecha. Coeficientes aerodinámicos típicos de un entrenador de ala en flecha, ajustados a esta escala.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

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
const BELLY = [[0.5, -0.06, 0], [-0.3, -0.06, 0], [-0.04, -0.07, 0.24], [-0.04, -0.07, -0.24]].map((p) => ({ p: new THREE.Vector3(...p) }));

export function createFlight({ scene, camera, model, op, motor, setGear, setSurfaces, gearState, pad }) {
  const world = new THREE.Group();
  world.visible = false;
  scene.add(world);
  // ── terreno, pista y cielo ──
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x3d5a2c, roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  world.add(grass);
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
  tex.anisotropy = 8;
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(14, 320), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  runway.rotation.x = -Math.PI / 2;
  runway.rotation.z = Math.PI / 2;
  runway.position.set(120, 0.005, 0);
  runway.receiveShadow = true;
  world.add(runway);
  for (let i = 0; i < 40; i++) {
    const tree = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 7 + Math.random() * 6, 7), new THREE.MeshStandardMaterial({ color: 0x24401f, roughness: 1 }));
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 400;
    tree.position.set(120 + Math.cos(a) * r * 1.5, 4, Math.sin(a) * r);
    if (Math.abs(tree.position.z) < 25) tree.position.z += 60;
    tree.castShadow = true;
    world.add(tree);
  }
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(60), THREE.MathUtils.degToRad(160));
  Object.assign(sky.material.uniforms.sunPosition.value, sun);
  sky.material.uniforms.turbidity.value = 4;
  sky.material.uniforms.rayleigh.value = 1.4;
  world.add(sky);

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
    s.crashed = false;
    gearState.target = 0;
  }
  const onKey = (down) => (e) => {
    const k = e.key.toLowerCase();
    if (down) {
      if (k === "g" && s.p.y > 1.5) { s.gearUp = !s.gearUp; gearState.target = s.gearUp ? 1 : 0; }
      if (k === "f") s.flap = s.flap > 0.6 ? 0 : s.flap + 0.5;
      if (k === "c") s.cam = s.cam === "chase" ? "cockpit" : "chase";
      if (k === "r") reset();
      if (k === "e") motor.on = !motor.on;
      if (k === "t") s.assist = !s.assist;
    }
    if (["w", "s", "a", "d", "q", "e", "shift", "control", "b", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
    down ? keys.add(k) : keys.delete(k);
  };
  const kd = onKey(true);
  const ku = onKey(false);

  const tmp = new THREE.Vector3();
  const vb = new THREE.Vector3();
  function step(dt) {
    // mandos con su recorrido real y algo de inercia
    // teclado, palancas táctiles y mando de juego se suman (cada uno limitado a su recorrido)
    const want = (a, b) => (keys.has(a) ? 1 : 0) - (keys.has(b) ? 1 : 0);
    const clamp1 = (v) => Math.max(-1, Math.min(1, v));
    const ax = analog;
    s.pitch += (clamp1(want("s", "w") + (ax?.pitch ?? 0)) - s.pitch) * Math.min(1, dt * 6);
    s.roll += (clamp1(want("d", "a") + (ax?.roll ?? 0)) - s.roll) * Math.min(1, dt * 7);
    s.yaw += (clamp1(want("z", "x") + (ax?.yaw ?? 0)) - s.yaw) * Math.min(1, dt * 5);
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
    vb.copy(s.v).applyMatrix4(Rt);
    const V = Math.max(0.01, vb.length());
    const alpha = Math.atan2(-vb.y, vb.x);
    const beta = Math.asin(THREE.MathUtils.clamp(vb.z / V, -1, 1));
    const qbar = 0.5 * RHO * V * V;
    // tirar (S) sube el morro: borde de salida del estabilizador hacia arriba, deflexión negativa
    const de = -s.pitch * THREE.MathUtils.degToRad(16);
    const da = s.roll * THREE.MathUtils.degToRad(20);
    const dr = -s.yaw * THREE.MathUtils.degToRad(22);
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
      M.x += Math.abs(s.roll) < 0.05 ? kq * AC.b * (-0.06 * bank - 0.25 * p) : kq * AC.b * -0.05 * p;
      M.z += Math.abs(s.pitch) < 0.05 ? kq * AC.c * (-0.35 * gamma - 2.5 * qd) : kq * AC.c * -1.0 * qd;
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
      const pen = -pw.y;
      if (pen <= 0) continue;
      onGround = true;
      const vel = s.v.clone().add(new THREE.Vector3().copy(s.w).applyQuaternion(s.q).cross(rp));
      const n = Math.max(0, 9000 * pen - 260 * vel.y);
      const fc = new THREE.Vector3(0, n, 0);
      // rozamiento: rodadura y freno en las ruedas, arrastre en la panza
      const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(s.q).setY(0).normalize();
      const side = new THREE.Vector3(0, 1, 0).cross(fwd);
      const mu = contacts === BELLY ? 0.5 : 0.02 + 0.5 * s.brake;
      fc.addScaledVector(fwd, -Math.sign(vel.dot(fwd)) * Math.min(Math.abs(vel.dot(fwd)) * 40, mu * n));
      const steerV = c.steer ? vel.dot(side) - fwd.dot(vel) * dr * 0.8 : vel.dot(side);
      fc.addScaledVector(side, -THREE.MathUtils.clamp(steerV * 60, -0.9 * n, 0.9 * n));
      Fw.add(fc);
      Mw.add(rp.clone().cross(fc));
      if (contacts === BELLY && -vel.y > 2.5) s.crashed = true;
      if (contacts === WHEELS && -vel.y > 4) s.crashed = true;
    }
    s.v.addScaledVector(Fw, dt / AC.m);
    s.p.addScaledVector(s.v, dt);
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
    return { V, alpha, onGround, thrust };
  }

  let info = { V: 0, alpha: 0, onGround: true, thrust: 0 };
  let analog = null;
  const camPos = new THREE.Vector3(-4, 1.5, 0);
  function update(dt) {
    if (s.crashed) { $hud(`<b>Accidente</b> · ${pad?.touch ? "Reinicio" : "R"} para volver a la pista`); return; }
    analog = pad?.read() ?? null;
    for (let i = 0; i < 8; i++) info = step(dt / 8);
    model.position.copy(s.p);
    model.quaternion.copy(s.q);
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(s.q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(s.q);
    const fov = s.cam === "chase" ? 32 : 70;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (s.cam === "chase") {
      const want = s.p.clone().addScaledVector(fwd, -3.6).add(new THREE.Vector3(0, 1.0, 0));
      camPos.lerp(want, Math.min(1, dt * 3));
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(s.p.clone().addScaledVector(fwd, 2));
    } else {
      // ojos del piloto delantero: sobre el asiento, a la altura del cabezal, mirando por encima del HUD
      camera.position.copy(s.p).addScaledVector(fwd, 0.486).addScaledVector(up, 0.09);
      camera.up.copy(up);
      camera.lookAt(camera.position.clone().addScaledVector(fwd, 10).addScaledVector(up, -1.7));
    }
    const o = op(motor.f);
    const alt = Math.max(0, s.p.y);
    const kmh = info.V * 3.6;
    const vs = s.v.y;
    $hud(
      `<b>${kmh.toFixed(0)}</b> km/h · <b>${alt.toFixed(1)}</b> m · ${vs >= 0 ? "+" : ""}${vs.toFixed(1)} m/s · α ${THREE.MathUtils.radToDeg(info.alpha).toFixed(0)}°<br>` +
      `MW54 ${motor.on ? `<b>${Math.round(o.n * motor.spin).toLocaleString("es-ES")}</b> rpm · ${info.thrust.toFixed(0)} N · EGT ${Math.round(15 + (o.egt - 15) * motor.heat)} °C` : `apagada (${pad?.touch ? "Motor" : "E"} para arrancar)`} · gas ${(s.throttle * 100).toFixed(0)} %<br>` +
      `Tren ${gearState.t < 0.05 ? "abajo" : gearState.t > 0.95 ? "arriba" : "en tránsito"} · flaps ${(s.flap * 40).toFixed(0)}° · giróscopo ${s.assist ? "sí" : "no"}${s.brake ? " · frenos" : ""}${info.alpha > CL.stall ? " · <b>PÉRDIDA</b>" : ""}`,
    );
  }
  function $hud(html) { document.getElementById("hud").innerHTML = html; }

  return {
    enter() {
      world.visible = true;
      scene.fog = new THREE.Fog(0xb8c8d8, 200, 2500);
      reset();
      addEventListener("keydown", kd);
      addEventListener("keyup", ku);
      camPos.set(-4, 1.5, 0);
      pad?.reset(0);
      camera.near = 0.004;
      camera.far = 12000;
      camera.updateProjectionMatrix();
    },
    exit() {
      world.visible = false;
      scene.fog = null;
      removeEventListener("keydown", kd);
      removeEventListener("keyup", ku);
      model.position.copy(home.pos);
      model.quaternion.copy(home.quat);
      camera.up.set(0, 1, 0);
      camera.fov = 32;
      camera.near = 0.01;
      camera.far = 50;
      camera.updateProjectionMatrix();
    },
    update,
    state: s,
  };
}
