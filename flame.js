// Llama del escape como volumen: se recorre el chorro con rayos (ray marching) dentro de una caja y se acumula la luz
// que emite cada punto. El color sale de gradientes tomados de fotos reales de cada motor (núcleo y borde, a lo largo
// del chorro) y se mezcla según el modo (en seco, postquemador, ramjet, scramjet, arranque). Los diamantes de choque
// (discos de Mach) aparecen como nudos brillantes cuando la combustión llega a su punto óptimo, con la separación que
// da el diámetro de la tobera. Una luz puntual en cada tobera ilumina el suelo y la cola con el color de la llama.
import * as THREE from "three";

const N = 64;

// Mezcla de varios gradientes { core: [[u, [r,g,b], k], …], edge: … } con pesos; devuelve los colores HDR en u.
function sample(stops, u) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [u0, c0, k0] = stops[i];
    const [u1, c1, k1] = stops[i + 1];
    if (u <= u1) {
      const t = (u - u0) / Math.max(1e-6, u1 - u0);
      const k = k0 + (k1 - k0) * t;
      return c0.map((c, j) => (c + (c1[j] - c) * t) * k);
    }
  }
  const [, c, k] = stops[stops.length - 1];
  return c.map((x) => x * k);
}

export function createFlame(scene, spec, { steps = 40 } = {}) {
  const data = new Float32Array(N * 2 * 4);
  const grad = new THREE.DataTexture(data, N, 2, THREE.RGBAFormat, THREE.FloatType);
  grad.magFilter = grad.minFilter = THREE.LinearFilter;
  grad.wrapS = grad.wrapT = THREE.ClampToEdgeWrapping;
  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uReach: { value: 1 },
    uDiamond: { value: 0 },
    uSpacing: { value: spec.diamonds?.spacing ?? 0.1 },
    uCount: { value: spec.diamonds?.count ?? 6 },
    uDiaColor: { value: new THREE.Color(...(spec.diamonds?.color ?? [1, 0.85, 0.6])) },
    uGrad: { value: grad },
    uTurb: { value: spec.turbulence ?? 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    defines: { STEPS: steps },
    vertexShader: /* glsl */ `
      varying vec3 vLocal; varying vec3 vCam;
      void main(){
        vLocal = position;
        vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity, uReach, uDiamond, uSpacing, uCount, uTurb;
      uniform vec3 uDiaColor; uniform sampler2D uGrad;
      varying vec3 vLocal; varying vec3 vCam;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      vec2 box(vec3 ro, vec3 rd){
        vec3 inv = 1. / rd; vec3 t0 = (vec3(-1., -1., -1.) - ro) * inv; vec3 t1 = (vec3(0., 1., 1.) - ro) * inv;
        vec3 tmin = min(t0, t1), tmax = max(t0, t1);
        return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
      }
      void main(){
        vec3 ro = vCam; vec3 rd = normalize(vLocal - vCam);
        vec2 t = box(ro, rd);
        t.x = max(t.x, 0.);
        if (t.y <= t.x) discard;
        float dt = (t.y - t.x) / float(STEPS);
        vec3 acc = vec3(0.);
        // tramado fijo por píxel (ruido de gradiente entrelazado): reparte los pasos sin cambiar de un cuadro al otro, así
        // el volumen se ve continuo; un desfase aleatorio nuevo en cada cuadro hacía hervir la llama como chispas
        float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * dt;
        for (int i = 0; i < STEPS; i++){
          vec3 p = ro + rd * (t.x + jitter + dt * float(i));
          float u = clamp(-p.x, 0., 1.);
          float rho = length(p.yz);
          // envolvente: sale con el ancho de la tobera, se abre y se deshace al final
          float R = mix(.62, 1., smoothstep(0., .8, u));
          float Rc = .5 * (1. - .45 * u);
          float turb = mix(1., .55 + .9 * n3(vec3(u * 16. - uTime * 9., p.y * 4., p.z * 4.)), uTurb * smoothstep(.05, .6, u));
          float body = (1. - smoothstep(Rc * .25, R, rho)) * turb;
          float fade = 1. - smoothstep(.45 * uReach, uReach, u);
          vec3 core = texture2D(uGrad, vec2(u, .25)).rgb;
          vec3 edge = texture2D(uGrad, vec2(u, .75)).rgb;
          vec3 col = mix(core, edge, smoothstep(Rc * .35, R, rho)) * body;
          // diamantes de choque: en cada celda, un rombo (ondas oblicuas) con un nudo brillante en el centro
          float cell = (u - .04) / uSpacing;
          float k = floor(cell);
          float d = fract(cell);
          float alive = step(0., cell) * (1. - smoothstep(uCount - 1.5, uCount, k));
          float wk = 1. - k / uCount;
          float Rd = Rc * .95;
          float diamond = 1. - smoothstep(.75, 1., rho / Rd + abs(2. * d - 1.));
          float knot = exp(-pow((d - .5) * 5., 2.)) * exp(-pow(rho / (Rd * .45), 2.));
          vec3 dia = uDiaColor * (diamond * .6 + knot * 3.2) * wk * alive;
          float gap = 1. - uDiamond * .45 * smoothstep(.06, .12, u) * (1. - diamond);
          acc += (col * gap + dia * uDiamond) * fade * dt;
        }
        gl_FragColor = vec4(acc * uIntensity, 1.);
      }`,
  });
  const plumes = [];
  let weights = {};
  function writeGradient(w) {
    const modes = Object.keys(spec.modes);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const c = [0, 0, 0];
        for (const m of modes) {
          if (!w[m]) continue;
          const s = sample(spec.modes[m][row ? "edge" : "core"], u);
          for (let j = 0; j < 3; j++) c[j] += s[j] * w[m];
        }
        data.set([c[0], c[1], c[2], 1], (row * N + i) * 4);
      }
    }
    grad.needsUpdate = true;
  }
  return {
    // `at` en metros de escena; la llama sale hacia −x con largo, alto y ancho dados
    add(parent, at, { length, r, h = 1, w = 1, light = true }) {
      const g = new THREE.BoxGeometry(1, 2, 2);
      g.translate(-0.5, 0, 0);
      const mesh = new THREE.Mesh(g, material);
      mesh.position.copy(at);
      mesh.scale.set(length, r * h, r * w);
      mesh.frustumCulled = false;
      mesh.userData.noAO = true;
      mesh.visible = false;
      parent.add(mesh);
      let lamp = null;
      if (light && spec.light) {
        lamp = new THREE.PointLight(0xffaa66, 0, spec.light.distance, 2);
        lamp.position.copy(at).add(new THREE.Vector3(-length * 0.12, 0, 0));
        parent.add(lamp);
      }
      plumes.push({ mesh, lamp });
      return mesh;
    },
    // w: pesos de cada modo; level: brillo global 0–1; optimal: 0–1 para los diamantes; reach: largo relativo
    update({ w, level, optimal, reach = 1, time, visible }) {
      if (Object.keys(w).some((k) => Math.abs((weights[k] ?? 0) - w[k]) > 0.01)) { weights = { ...w }; writeGradient(weights); }
      uniforms.uTime.value = time;
      uniforms.uIntensity.value = level * (spec.brightness ?? 1);
      uniforms.uDiamond.value = optimal;
      uniforms.uReach.value = reach;
      const glow = sample(Object.values(spec.modes)[0].core, 0.1);
      let lc = [0, 0, 0];
      for (const [m, k] of Object.entries(weights)) { if (!k) continue; const s = sample(spec.modes[m].core, 0.15); lc = lc.map((x, j) => x + s[j] * k); }
      const peak = Math.max(...lc, 1e-3);
      for (const p of plumes) {
        p.mesh.visible = visible && level > 0.01;
        if (p.lamp) {
          p.lamp.visible = p.mesh.visible;
          p.lamp.color.setRGB(lc[0] / peak, lc[1] / peak, lc[2] / peak);
          p.lamp.intensity = spec.light.intensity * level * Math.min(1, peak / 2) * (0.92 + 0.08 * Math.sin(time * 37 + glow[0]));
        }
      }
    },
  };
}
