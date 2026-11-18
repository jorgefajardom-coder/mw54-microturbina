(async () => {
  // Piloto automático de prueba (lo carga tests/vuelos.mjs en la página de cada avión, ya en modo vuelo).
  // Mueve sólo lo que mueve una persona: las palancas analógicas (los mismos ejes que las táctiles), el gas y el freno.
  // Cada vuelo: arranque, carrera, despegue, subida, vuelo a un punto B al azar, regreso por un circuito de entrada,
  // aproximación, enderezada, toma y parada en la pista. Un vuelo es exitoso si llega a B y el avión acaba parado en
  // la pista sin accidente. La física corre más rápido que el tiempo real con flight.simulate().
  const N = window.__N ?? 100;
  const F = __sim.flight, s = F.state, motor = __sim.motor, af = F.airframe;
  const T = F.terrain, K = T.scale, L = af.size ?? 1, VR = af.vref ?? 22, isJet = K > 1;
  const G = 9.81, DT = 1 / 60, D2R = Math.PI / 180;
  const x0 = -40 * K, x1 = 280 * K, halfW = 7 * T.side * (K > 1 ? 1.3 : 1);
  const hC = 40 * K + 10 * L;              // altura de crucero sobre el terreno
  // velocidad de pérdida con flaps a nivel del mar; la aproximación va a 1,3 veces, como en los aviones de verdad
  const VS = Math.sqrt((2 * af.AC.m * G) / (1.225 * af.AC.S * (af.CL.a * af.CL.stall + af.CL.flap * 0.4)));
  // ángulo de cabeceo al que la cola toca el suelo, girando sobre el tren principal
  const mainX = Math.min(...af.WHEELS.map((w) => w.p.x)), wheelY = Math.min(...af.WHEELS.map((w) => w.p.y));
  let tailMax = 20 * D2R;
  for (const c of af.SKIN) if (c.x < mainX - 0.05 * L) tailMax = Math.min(tailMax, Math.atan2(c.y - wheelY, mainX - c.x));
  const pitchTD = Math.max(4 * D2R, tailMax - 3 * D2R);
  // la toma ha de caber en ese cabeceo: la velocidad que sostiene el peso con el ángulo de ataque de la toma
  const VTD = Math.sqrt((2 * af.AC.m * G) / (1.225 * af.AC.S * (af.CL.a * Math.min(pitchTD, af.CL.stall) + af.CL.flap * 0.4)));
  const VC = 1.6 * VR, VA = Math.max(1.3 * VS, 0.95 * VR, 1.08 * VTD);
  const GS = 3 * D2R;                       // senda de planeo
  const xTD = x0 + 0.12 * (x1 - x0);        // punto de toma
  const dApp = (hC / Math.tan(GS)) * 1.15;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let seed = window.__SEED ?? 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const key = (k, on) => dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: k }));
  const rot = (x, y, z) => { const q = s.q, qx = q.x, qy = q.y, qz = q.z, qw = q.w; const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z; return { x: ix * qw + iw * -qx + iy * -qz - iz * -qy, y: iy * qw + iw * -qy + iz * -qx - ix * -qz, z: iz * qw + iw * -qz + ix * -qy - iy * -qx }; };
  const motorStep = (dt) => {
    // la misma dinámica de motor que el bucle de dibujo, al paso de la simulación
    if (isJet) {
      motor.thr += ((motor.on ? motor.target : 0) - motor.thr) * (1 - Math.exp(-dt / 1.2));
      motor.M += ((motor.on ? motor.Mtarget : 0) - motor.M) * (1 - Math.exp(-dt / 1.8));
      motor.spin += ((motor.on ? 1 : 0) - motor.spin) * (1 - Math.exp(-dt / (motor.on ? 2.2 : 4)));
    } else {
      const fT = motor.on ? motor.target : 0;
      motor.f += (fT - motor.f) * (1 - Math.exp(-dt / (fT > motor.f ? 1.6 : 1.1)));
      motor.spin += ((motor.on ? 1 : 0) - motor.spin) * (1 - Math.exp(-dt / (motor.on ? 1.4 : 2.6)));
    }
  };
  // circuito de entrada: un punto a 1,5 senda de la cabecera, desplazado de lado tres radios de viraje; desde allí un
  // viraje de 180° hacia el eje deja el avión casi alineado (como el tramo base de un circuito de tránsito)
  const R0 = (VA * VA) / (G * Math.tan(30 * D2R));
  // en los reactores la final se alarga con el radio de viraje: un avión rápido necesita más recta para quedar en el eje
  // antes de la enderezada (con la final fija, el SR-72 llegaba a la enderezada fuera del eje y daba motor y al aire 2 de
  // cada 3 vuelos). El Hawk ya queda alineado con la final fija, y alargarla lo deja alto y largo en cada aproximación.
  const EX = x0 - 1.5 * dApp - (isJet ? 2 * R0 : 0);
  const results = [];
  window.__progress = 0;
  for (let n = 0; n < N; n++) {
    F.state.cam = 'chase';
    s.crashed = false;
    key('r', true); key('r', false);
    motor.on = false; motor.spin = 0; if (isJet) motor.thr = 0; else motor.f = 0;
    s.t = rnd() * 600;                      // cada vuelo con otra fase de ráfagas
    // B en el valle (las montañas del fondo son el borde del mapa): el tramo desde la pista y el regreso a la final
    // no pasan por relieve de más de media altura de crucero
    const hi = (ax, az, bx, bz) => { let m = -1e9; for (let i = 0; i <= 40; i++) m = Math.max(m, T.heightAt(ax + (bx - ax) * i / 40, az + (bz - az) * i / 40)); return m; };
    let B;
    for (let k = 0; k < 500; k++) {
      const brg = (rnd() * 300 - 150) * D2R, dist = (25 + rnd() * 25) * hC * (k < 250 ? 1 : 0.6);
      B = { x: x1 + Math.cos(brg) * dist, z: Math.sin(brg) * dist };
      if (Math.max(hi(x1, 0, B.x, B.z), hi(B.x, B.z, x0 - dApp, 0)) < 0.5 * hC) break;
      if (k === 499) B.bad = true;
    }
    let goArounds = 0;
    const gaWhy = [];
    const R = 1.2 * (VC * VC) / (G * Math.tan(35 * D2R));
    let side = 0, alphaF = 0, phase = 'arranque', t = 0, tPhase = 0, iP = 0, iV = 0.6, thr = 0, reachedB = false, minB = Infinity;
    let td = null, why = '', brake = false;
    const go = (p) => { phase = p; tPhase = 0; };
    while (t < 1500) {
      const fw = rot(1, 0, 0), rt = rot(0, 0, 1), up = rot(0, 1, 0);
      const bank = Math.atan2(-rt.y, up.y), pitch = Math.asin(clamp(fw.y, -1, 1)), hdg = Math.atan2(fw.z, fw.x);
      const V = s.v.length(), gamma = V > 1 ? Math.asin(clamp(s.v.y / V, -1, 1)) : 0;
      const agl = s.p.y - T.heightAt(s.p.x, s.p.z) - af.ground;
      let roll = 0, pst = 0, yaw = 0, gDes = null, bankDes = 0, vDes = VC, pDes = null;
      const toward = (x, z) => Math.atan2(z - s.p.z, x - s.p.x);
      // ladeo para corregir el rumbo en ~τ segundos (giro coordinado: ψ' = g·tan φ / V); con más velocidad, más ladeo
      // y más anticipación, si no el avión rápido se pasaba de rumbo y hacía eses
      const tau = isJet ? Math.max(5, V / 15) : 2.5;
      const bankFor = (err, maxB) => clamp(Math.atan((V * err) / (G * tau)), -maxB * D2R, maxB * D2R);
      const hdgTo = (h, maxB = 35) => { bankDes = bankFor(wrap(h - hdg), maxB); };
      // altura sobre el relieve más alto de los próximos ~20 s de vuelo (un piloto mira la ladera que viene)
      const ahead = () => { let m = -1e9; for (let d = 0; d <= Math.max(V, 10) * 20; d += Math.max(V, 10)) m = Math.max(m, T.heightAt(s.p.x + fw.x * d, s.p.z + fw.z * d)); return m; };
      const altTo = (h) => { const want = ahead() + af.ground + h; gDes = clamp((want - s.p.y) / (V * 5), -8 * D2R, 15 * D2R); };
      if (phase === 'arranque') { motor.on = true; thr = 0; if (motor.spin > 0.9) go('carrera'); }
      else if (phase === 'carrera') {
        thr = 1;
        yaw = clamp(1.2 * s.p.z / halfW + 4 * hdg, -1, 1);
        if (V > VR) pDes = (isJet ? 9 : 10) * D2R;
        if (!s.onGround && agl > 0.5 * L) go('subida');
        if (tPhase > 120) { why = 'no despegó'; break; }
      } else if (phase === 'subida') {
        thr = 1; vDes = VC;
        hdgTo(0, 10); gDes = (agl < 3 * L ? 6 : 10) * D2R;
        if (agl > 0.8 * hC) go('a B');
      } else if (phase === 'a B') {
        hdgTo(toward(B.x, B.z)); altTo(hC);
        const d = Math.hypot(B.x - s.p.x, B.z - s.p.z); minB = Math.min(minB, d);
        if (d < R) { reachedB = true; go('regreso'); }
      } else if (phase === 'regreso') {
        if (side === 0) side = s.p.z >= 0 ? 1 : -1;
        const Pz = side * 2.5 * R0;
        hdgTo(toward(EX, Pz)); altTo(hC); vDes = VA * 1.1;
        if (Math.hypot(EX - s.p.x, Pz - s.p.z) < Math.max(R, R0)) go(Math.abs(wrap(hdg)) < 90 * D2R ? 'final' : 'base');
      } else if (phase === 'base') {
        // viraje hacia el eje, del lado que lo acerca
        bankDes = side * 30 * D2R; altTo(hC); vDes = VA;
        if (Math.abs(wrap(hdg)) < 50 * D2R) go('final');
      } else if (phase === 'final' || phase === 'enderezada') {
        // seguir el eje de pista hacia +x y la senda de planeo hasta el punto de toma
        const look = Math.max(6 * L, V * 6, Math.min(1.5 * R0, 3 * Math.abs(s.p.z)));
        const aligned = Math.abs(wrap(hdg)) < 15 * D2R && Math.abs(s.p.z) < 6 * halfW;
        bankDes = bankFor(wrap(Math.atan2(-s.p.z, look) - hdg), 30);
        vDes = VA;
        // la senda se mide sobre la cota de la pista (no sobre el terreno de debajo, que sube y baja antes de la cabecera)
        const glide = Math.max(0, (xTD - s.p.x) * Math.tan(GS));
        const hWant = aligned ? Math.min(hC, glide) : hC;
        const hRwy = s.p.y - af.ground - T.heightAt(xTD, 0);
        if (phase === 'final') {
          gDes = clamp((hWant - hRwy) / (V * 3) - (aligned && glide < hC ? GS : 0), -6 * D2R, 6 * D2R);
          if (agl < 0.6 * hC && hRwy > agl) gDes = Math.max(gDes, 0);
          // nunca por debajo de media altura de crucero sobre el relieve que viene, salvo ya en la senda corta
          if (s.p.x < x0 - 0.4 * dApp) { const floor = ahead() + af.ground + 0.5 * hC; gDes = Math.max(gDes, clamp((floor - s.p.y) / (V * 5), -8 * D2R, 15 * D2R)); }
          if (aligned && agl < Math.max(1.2 * L, V * Math.tan(GS) * (isJet ? 5 : 2.25))) go('enderezada');
          if (s.p.x > x1) { why = 'se pasó de la pista sin tocar'; break; }
        } else {
          // enderezada: el ritmo de descenso baja con la altura hasta posarse suave
          // con algo de motor hasta casi tocar (los reactores pesados no flotan: sin empuje la velocidad se va y caen)
          vDes = VA * 0.95;
          const vsWant = -((isJet ? 0.15 : 0.25) + Math.max(0, agl) / (isJet ? 4.5 : 2.5));
          gDes = clamp(Math.asin(clamp(vsWant / V, -1, 1)), -6 * D2R, 2 * D2R);
        }
        // larga o descolocada: motor y al aire, como manda el procedimiento, y otra vuelta a la final
        if (!s.onGround && (s.p.x > xTD + 0.3 * (x1 - x0) || (phase === 'enderezada' && Math.abs(s.p.z) > 0.7 * halfW))) { goArounds++; gaWhy.push(`${s.p.x > xTD + 0.3 * (x1 - x0) ? 'larga' : 'descolocada'} en ${phase} a ${(V * 3.6).toFixed(0)} km/h y ${agl.toFixed(1)} m`); go('al aire'); }
        if (s.onGround) { td = { x: s.p.x, z: s.p.z, vs: s.v.y, V }; go('rodaje'); }
      } else if (phase === 'al aire') {
        thr = 1; hdgTo(0, 10); gDes = 8 * D2R;
        if (agl > 0.8 * hC) { side = 0; go('regreso'); }
      } else if (phase === 'rodaje') {
        thr = 0; vDes = 0;
        pst = tPhase < 1.5 ? -0.25 : 0;
        roll = 0; // alerones neutros en la carrera: el giróscopo nivela las alas (corregir a mano a 450 km/h inducía balanceo)
        // pedales suaves a alta velocidad: el timón muerde mucho y con tren estrecho un golpe hace bambolear el avión
        yaw = clamp((0.6 * s.p.z / halfW + 3 * hdg) * clamp((VR / Math.max(V, 1)) ** 2, 0.15, 1), -0.5, 0.5);
        brake = tPhase > 1;
        if (V < 0.5) break;
      }
      if (pDes != null) pst = clamp(3 * (pDes - pitch) - 0.6 * s.w.z, -1, 1);
      // trayectoria por actitud, como se vuela un reactor: el cabeceo deseado es el ángulo de ataque actual más la
      // senda pedida; el lazo de cabeceo lleva amortiguación y un integral lento
      alphaF += ((pitch - gamma) - alphaF) * Math.min(1, DT / 1.5);
      if (gDes != null) {
        const e = gDes - gamma;
        let thDes = alphaF + gDes + 0.6 * e;
        if (phase === 'enderezada') thDes = Math.min(thDes, pitchTD);
        const eth = thDes - pitch;
        iP = clamp(iP + eth * DT * 0.4, -0.3, 0.3);
        pst = clamp(3 * eth + iP - 1.5 * s.w.z, -1, 1);
      }
      if (phase !== 'carrera' && phase !== 'rodaje' && phase !== 'arranque') roll = clamp(2.5 * (bankDes - bank) - 0.6 * s.w.x, -1, 1);
      if (['subida', 'a B', 'regreso', 'base', 'final', 'al aire', 'enderezada'].includes(phase)) {
        const e = (vDes - V) / VR;
        iV = clamp(iV + e * DT * 0.3, 0, 1);
        thr = clamp(iV + 2 * e, 0, 1);
        if (phase === 'enderezada' && agl < 0.4 * L) thr = 0;
      }
      if (brake !== (s.brake > 0)) key('b', brake);
      const pre = { vy: s.v.y, V, wz: s.w.z, pitch: pitch / D2R, agl };
      motorStep(DT);
      F.simulate(DT, { roll, pitch: pst, yaw, throttle: thr });
      t += DT; tPhase += DT;
      if (s.crashed) { why = `choque (${phase}): ${s.crashWhy} [antes vy ${pre.vy.toFixed(2)} V ${(pre.V * 3.6).toFixed(0)} wz ${pre.wz.toFixed(3)} cabeceo ${pre.pitch.toFixed(1)} agl ${pre.agl.toFixed(2)}]`; break; }
      if (!s.onGround && agl < -2 * L) { why = 'bajo el terreno'; break; }
      if ((Math.floor(t / DT) % 600) === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (brake) key('b', false);
    const onRwy = s.p.x > x0 && s.p.x < x1 && Math.abs(s.p.z) < halfW;
    const ok = !why && reachedB && phase === 'rodaje' && s.v.length() < 0.5 && onRwy && !s.crashed;
    if (!why && !ok) why = !reachedB ? `no llegó a B (min ${minB.toFixed(0)} m)` : phase !== 'rodaje' ? `tiempo agotado en ${phase}` : `fuera de pista x ${s.p.x.toFixed(0)} z ${s.p.z.toFixed(1)}`;
    if (B.bad) why = 'sin punto B en el valle ' + why;
    results.push({ n, ok, ga: goArounds, gaWhy, t: Math.round(t), why, td: td && `x ${(td.x - x0).toFixed(0)} z ${td.z.toFixed(1)} vs ${td.vs.toFixed(2)} V ${(td.V * 3.6).toFixed(0)}`, stop: `x ${(s.p.x - x0).toFixed(0)} z ${s.p.z.toFixed(1)}` });
    window.__progress = n + 1;
  }
  F.endTest();
  const info = { cola: +(tailMax / D2R).toFixed(1), aproximacion: Math.round(VA * 3.6), perdida: Math.round(VS * 3.6), crucero: Math.round(hC) };
  return JSON.stringify({ info, results });
})()
