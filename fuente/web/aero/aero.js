// Aerodinámica: cada avión del sitio en vuelo, con el aire que lo rodea. Subsónico, el aire se aparta antes de llegar
// al morro; supersónico, no se entera hasta que cruza el cono de Mach (semiángulo μ = asen 1/M) y ahí se comprime y se
// calienta de golpe. El panel da la atmósfera a esa altitud, la presión dinámica, la temperatura de remanso, el
// coeficiente de sustentación que pide el vuelo nivelado, la resistencia (de forma, de onda e inducida) y la finura.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setupEnvironment } from "../environment.js?v=20261031-color9";
import { detect, profileFor } from "../device.js?v=20261031-color9";
import { loadModel, guardContext, studioLights } from "../look.js?v=20261031-color9";
import * as sr71 from "../sr71/sim.js?v=20261031-color9";
import * as f22 from "../f22/sim.js?v=20261031-color9";
import * as f14 from "../f14/sim.js?v=20261031-color9";
import * as sr72 from "../sr72/sim.js?v=20261031-color9";

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 0) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const G0 = 9.80665;

// Datos de cada avión: superficie alar S (m²), masa en vuelo (kg), alargamiento, eficiencia de Oswald, resistencia
// de forma subsónica, pico de resistencia de onda al cruzar Mach 1 y valor supersónico (en veces la subsónica),
// empuje máximo y altitud según el Mach (de su propio sim.js). Valores públicos aproximados; el SR-72, estimado.
const AIRCRAFT = {
  hawk: {
    name: "Hawk 1:7 con MW54", glb: "../mw54.glb", S: 0.34, m: 7.5, AR: 5.3, e: 0.8, cd0: 0.03, peak: 1, sup: 1, maxM: 0.3, step: 0.005,
    engines: 1, thrust: () => 0.054, h: () => 0.1,
    note: "Una maqueta de 2 m vuela a menos de 300 km/h: el aire es incompresible y la resistencia la ponen el roce y la que induce la sustentación.",
  },
  sr71: { name: "SR-71 Blackbird", glb: "../sr71/sr71.glb", S: 167, m: 50000, AR: 1.7, e: 0.7, cd0: 0.011, peak: 2.4, sup: 1.55, maxM: 3.3, engines: 2, thrust: (M) => sr71.op(M, 1).thrust, h: (M) => sr71.op(M, 1).h, note: "Ala en delta muy fina y aristas a lo largo del morro: a Mach 3,2 el cono de Mach se cierra a 18° y la temperatura de remanso pasa de 400 °C." },
  f22: { name: "F-22 Raptor", glb: "../f22/f22.glb", S: 78, m: 29000, AR: 2.4, e: 0.75, cd0: 0.016, peak: 2.3, sup: 1.6, maxM: 2.25, engines: 2, thrust: (M) => f22.op(M, 1).thrust, h: (M) => f22.op(M, 1).h, note: "Ala en diamante de 42° de flecha: vuela en supercrucero, a Mach 1,5 o más sin postquemador." },
  f14: { name: "F-14 Tomcat", glb: "../f14/f14.glb", S: 52.5, m: 27000, AR: 7.3, e: 0.8, cd0: 0.02, peak: 2.5, sup: 1.7, maxM: 2.34, engines: 2, thrust: (M) => f14.op(M, 1).thrust, h: (M) => f14.op(M, 1).h, sweep: (M) => f14.op(M, 1).sweep, note: "El ala barre de 20° a 68°: abierta da alargamiento para despegar de un portaaviones; cerrada esconde el ala dentro del cono de Mach." },
  sr72: { name: "SR-72 (concepto)", glb: "../sr72/sr72.glb", S: 90, m: 35000, AR: 1.3, e: 0.65, cd0: 0.01, peak: 2.2, sup: 1.4, maxM: 6, engines: 2, thrust: (M) => sr72.op(M, 1).thrust, h: (M) => sr72.op(M, 1).h, note: "Cuerpo sustentador en punta de flecha: por encima de Mach 5 el choque se pega al cuerpo y el aire se calienta tanto que la química del aire empieza a contar." },
};

// Atmósfera estándar (ISA) hasta 32 km; h en km. Devuelve temperatura (K), presión (Pa), densidad y velocidad del sonido.
function atmosphere(h) {
  let T, p;
  if (h < 11) { T = 288.15 - 6.5 * h; p = 101325 * (T / 288.15) ** 5.2559; }
  else if (h < 20) { T = 216.65; p = 22632 * Math.exp((-G0 * (h - 11) * 1000) / (287.05 * T)); }
  else { T = 216.65 + (h - 20); p = 5474.9 * (T / 216.65) ** (-34.163); }
  const rho = p / (287.05 * T);
  return { T, p, rho, a: Math.sqrt(1.4 * 287.05 * T), mu: (1.458e-6 * T ** 1.5) / (T + 110.4) };
}

// Polar: resistencia de forma con su subida de onda al cruzar Mach 1 e inducida 1/(π e AR), que en supersónico crece
// con √(M²−1) (la sustentación ya no sale del alargamiento sino de la presión sobre la superficie).
function polar(c, M) {
  const wave = M < 0.8 ? 1 : M < 1.05 ? 1 + (c.peak - 1) * smooth(0.8, 1.05, M) : c.sup + (c.peak - c.sup) * Math.exp(-(M - 1.05) * 1.6);
  let AR = c.AR;
  if (c.sweep) AR = c.AR * (Math.cos((c.sweep(M) * Math.PI) / 180) / Math.cos((20 * Math.PI) / 180)) ** 2;
  const Ksub = 1 / (Math.PI * c.e * AR);
  const K = M < 1 ? Ksub : Math.max(Ksub, Math.sqrt(M * M - 1) / 4);
  return { cd0: c.cd0 * wave, K, AR };
}

function state(c, M) {
  const h = c.h(M);
  const air = atmosphere(h);
  const V = Math.max(M, 0.02) * air.a;
  const q = 0.5 * air.rho * V * V;
  const W = c.m * G0;
  const CL = W / (q * c.S);
  const { cd0, K, AR } = polar(c, M);
  const CD = cd0 + K * CL * CL;
  const D = q * c.S * CD;
  const thrust = c.engines * c.thrust(M) * 1000;
  const L = c.S ** 0.5 * 2.2;
  return { h, air, V, q, CL, CD, cd0, Di: q * c.S * K * CL * CL, D, LD: CL / CD, thrust, AR, T0: air.T * (1 + 0.2 * M * M), Re: (air.rho * V * L) / air.mu, mu: M > 1 ? Math.asin(1 / M) : null };
}

function regime(M) {
  if (M < 0.3) return ["Incompresible", "El aire apenas cambia de densidad: se aparta antes de llegar y rodea el avión."];
  if (M < 0.8) return ["Subsónico", "El aire se comprime un poco; las perturbaciones viajan por delante del avión y el flujo se prepara para pasar."];
  if (M < 1.2) return ["Transónico", "Sobre el ala ya hay zonas supersónicas que acaban en choques: la resistencia de onda sube de golpe."];
  if (M < 5) return ["Supersónico", "El aire de delante no sabe que llega el avión: lo cruza el cono de Mach y ahí se comprime y se calienta de golpe."];
  return ["Hipersónico", "El choque se pega al cuerpo y la capa de aire comprimido es tan caliente que el calor manda sobre la forma."];
}

// ── escena ──
const device = await profileFor(detect());
const renderer = new THREE.WebGLRenderer({ antialias: device.antialias, powerPreference: "high-performance" });
renderer.setPixelRatio(device.pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
$("view").appendChild(renderer.domElement);
guardContext(renderer);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f12);
await setupEnvironment(renderer, scene, device);
scene.environmentIntensity = 0.7;
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(30, 50, 20);
scene.add(sun, new THREE.HemisphereLight(0xbcd2ff, 0x2a2622, 0.5));
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
let lights = null;

// cono de Mach con el vértice en el morro y el eje hacia atrás
const coneMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { uColor: { value: new THREE.Color(0xff9a50) }, uAlpha: { value: 0 } },
  vertexShader: "varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = uv.y; vec4 p = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }",
  fragmentShader: "uniform vec3 uColor; uniform float uAlpha; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(1. - abs(dot(vN, vV)), 2.); float fade = smoothstep(0., .25, vT) * smoothstep(1., .55, vT); gl_FragColor = vec4(uColor * (0.25 + 1.4 * rim), uAlpha * (0.25 + rim) * fade); }",
});
const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 96, 1, true), coneMat);
const coneHolder = new THREE.Group();
coneHolder.add(cone);
scene.add(coneHolder);

// partículas del aire: cada una sigue una línea de corriente de la que se ve un trazo corto
const small = device.kind === "celular";
const COUNT = small ? 900 : 2200;
const TRAIL = 6;
const flowGeo = new THREE.BufferGeometry();
const flowPos = new Float32Array(COUNT * TRAIL * 2 * 3);
const flowCol = new Float32Array(COUNT * TRAIL * 2 * 3);
flowGeo.setAttribute("position", new THREE.BufferAttribute(flowPos, 3));
flowGeo.setAttribute("color", new THREE.BufferAttribute(flowCol, 3));
const flow = new THREE.LineSegments(flowGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
flow.frustumCulled = false;
scene.add(flow);
const seeds = Array.from({ length: COUNT }, () => [Math.random(), Math.random() * 2 - 1, Math.random() * 2 - 1]);

let current = null;
let box = null;
let profile = null;

// sección del avión a lo largo de x: en cada franja, cuánto se extiende hacia arriba/abajo y hacia los lados desde el
// eje. El aire de cada franja rodea esa elipse (por fuera de las alas, por encima y por debajo del fuselaje)
const BINS = 72;
function sectionsOf(model, box) {
  const hy = new Float32Array(BINS);
  const hz = new Float32Array(BINS);
  const cy = (box.min.y + box.max.y) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const L = box.max.x - box.min.x;
  const v = new THREE.Vector3();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 6000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const b = Math.min(BINS - 1, Math.max(0, Math.floor(((v.x - box.min.x) / L) * BINS)));
      hy[b] = Math.max(hy[b], Math.abs(v.y - cy));
      hz[b] = Math.max(hz[b], Math.abs(v.z - cz));
    }
  });
  // se suaviza a lo largo de x (envolvente de las vecinas y media) para que las líneas no zigzagueen entre franjas
  const soften = (arr) => {
    const env = arr.map((_, i) => Math.max(...arr.slice(Math.max(0, i - 2), i + 3)));
    return env.map((_, i) => { const w = env.slice(Math.max(0, i - 4), i + 5); return w.reduce((a, b) => a + b, 0) / w.length; });
  };
  return { hy: soften(hy), hz: soften(hz), cy, cz };
}
let M = 0;
const models = {};
const cold = new THREE.Color(0x7fb2ff);
const warm = new THREE.Color(0xffffff);
const hot = new THREE.Color(0xff8a3c);

async function show(id) {
  const c = AIRCRAFT[id];
  document.querySelectorAll("[data-plane]").forEach((b) => b.toggleAttribute("aria-pressed", b.dataset.plane === id));
  if (current) scene.remove(models[current]);
  $("loading").hidden = false;
  if (!models[id]) {
    const gltf = await loadModel(c.glb, "../draco/", { workerLimit: device.dracoWorkers ?? 2 });
    models[id] = gltf.scene;
  }
  $("loading").hidden = true;
  current = id;
  const model = models[id];
  scene.add(model);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  profile = sectionsOf(model, box);
  const size = box.getSize(new THREE.Vector3());
  const L = size.x;
  if (lights) scene.remove(lights.fill, lights.rim);
  lights = studioLights(scene, L);
  camera.near = L / 200;
  camera.far = L * 60;
  camera.updateProjectionMatrix();
  const centre = box.getCenter(new THREE.Vector3());
  controls.target.copy(centre);
  camera.position.copy(centre).add(new THREE.Vector3(-1.1, 0.55, 1.25).multiplyScalar(L * 1.25));
  controls.minDistance = L * 0.6;
  controls.maxDistance = L * 6;
  const slider = $("mach");
  slider.max = c.maxM;
  slider.step = c.step ?? 0.01;
  setMach(Math.min(c.maxM, id === "hawk" ? 0.15 : Math.max(0.85, c.maxM * 0.8)));
  drawChart();
}

function setMach(value) {
  M = Number(value);
  $("mach").value = M;
  update();
}

function update() {
  const c = AIRCRAFT[current];
  const s = state(c, M);
  const [name, say] = regime(M);
  $("regime").innerHTML = `<b>${name}</b> · ${say}`;
  $("machOut").textContent = fmt(M, M < 1 ? 2 : 1);
  const rows = [
    ["Altitud", `${fmt(s.h, s.h < 1 ? 1 : 1)} km`],
    ["Velocidad", `${fmt(s.V * 3.6)} km/h`],
    ["Sonido a esa altura", `${fmt(s.air.a)} m/s · ${fmt(s.air.T - 273.15)} °C`],
    ["Densidad del aire", `${fmt(s.air.rho, 3)} kg/m³`],
    ["Presión dinámica", `${fmt(s.q / 1000, 1)} kPa`],
    ["Temperatura de remanso", `${fmt(s.T0 - 273.15)} °C`],
    ["Cono de Mach", s.mu ? `${fmt((s.mu * 180) / Math.PI, 1)}° de semiángulo` : "no hay: subsónico"],
    ["Reynolds", `${(s.Re / 1e6).toLocaleString("es-ES", { maximumFractionDigits: s.Re > 1e7 ? 0 : 1 })} millones`],
    ["CL para vuelo nivelado", fmt(s.CL, 3)],
    ["CD (forma + onda / inducida)", `${fmt(s.cd0, 4)} / ${fmt(s.CD - s.cd0, 4)}`],
    ["Finura L/D", fmt(s.LD, 1)],
    ["Resistencia", s.D > 2000 ? `${fmt(s.D / 1000, 1)} kN` : `${fmt(s.D, 1)} N`],
    ["Empuje disponible", s.thrust > 2000 ? `${fmt(s.thrust / 1000, 1)} kN` : `${fmt(s.thrust, 1)} N`],
  ];
  if (c.sweep) rows.splice(8, 0, ["Flecha del ala", `${fmt(c.sweep(M))}° · alargamiento ${fmt(s.AR, 1)}`]);
  $("data").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("note").textContent = c.note;
  const margin = s.thrust - s.D;
  $("verdict").innerHTML = s.CL > 1.4 ? "<b>Demasiado lento:</b> el ala no da la sustentación que pide el peso." : margin < 0 ? `<b>No llega:</b> le faltan ${s.D - s.thrust > 2000 ? fmt((s.D - s.thrust) / 1000, 1) + " kN" : fmt(s.D - s.thrust, 1) + " N"} de empuje para sostener este Mach.` : `<b>Vuela:</b> le sobran ${margin > 2000 ? fmt(margin / 1000, 1) + " kN" : fmt(margin, 1) + " N"} de empuje para acelerar o subir.`;
  // cono de Mach: vértice en el morro, abre hacia atrás con semiángulo μ
  if (box) {
    const L = box.max.x - box.min.x;
    const len = L * 1.6;
    const mu = s.mu ?? 0;
    coneMat.uniforms.uAlpha.value = s.mu ? 0.3 : 0;
    cone.scale.set(Math.tan(mu) * len, len, Math.tan(mu) * len);
    cone.position.set(0, -len / 2, 0);
    coneHolder.position.set(box.max.x, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);
    coneHolder.rotation.set(0, 0, -Math.PI / 2);   // el eje del cono (y local) apunta hacia atrás (−x)
  }
  marker();
}

// línea de corriente: el aire llega por delante (+x) y se va por detrás. Alrededor del cuerpo (un elipsoide con la
// forma de la caja del avión) se aparta y acelera; en supersónico, sólo dentro del cono de Mach.
function stepFlow(time) {
  if (!box) return;
  const L = box.max.x - box.min.x;
  const span = box.max.z - box.min.z;
  const cy = (box.min.y + box.max.y) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const x0 = box.max.x + L * 0.6;
  const x1 = box.min.x - L * 1.2;
  const R = Math.max(span, L * 0.5) * 0.75;
  const tanMu = M > 1 ? Math.tan(Math.asin(1 / M)) : 0;
  const speed = L * (0.25 + 0.35 * Math.min(M, 3));
  const dx = L * 0.025 * (1 + Math.min(M, 3) * 0.3);
  const tmp = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const [u, sy, sz] = seeds[i];
    const yr = cy + sy * R * 0.55;
    const zr = cz + sz * R;
    let x = x0 - (((u * (x0 - x1) + time * speed) % (x0 - x1)) + (x0 - x1)) % (x0 - x1);
    for (let k = 0; k < TRAIL; k++) {
      for (let e = 0; e < 2; e++) {
        const xi = x + (k + e) * dx;
        const behind = box.max.x - xi;
        const r = Math.hypot(yr - cy, zr - cz);
        const shocked = M > 1 ? behind > 0 && r < behind * tanMu : true;
        let y = yr;
        let z = zr;
        let gain = 0;
        if (shocked && profile) {
          // la sección del avión en esta x (con su vecina, para que no salte) y un margen para la capa de aire
          const f = ((xi - box.min.x) / L) * BINS - 0.5;
          const b0 = Math.floor(f);
          const t = f - b0;
          const at = (arr, b) => (b < 0 || b >= BINS ? 0 : arr[b]);
          const near = smooth(-L * 0.25, 0, xi - box.min.x) * smooth(L * 0.15, 0, xi - box.max.x);
          const sy = (at(profile.hy, b0) * (1 - t) + at(profile.hy, b0 + 1) * t + L * 0.012) * near;
          const sz = (at(profile.hz, b0) * (1 - t) + at(profile.hz, b0 + 1) * t + L * 0.012) * near;
          if (sy > 1e-6 && sz > 1e-6) {
            const dy = yr - cy;
            const dz = zr - cz;
            const rho = Math.max(1e-3, Math.hypot(dy / sy, dz / sz));
            // como un cuerpo de Rankine: cada línea se aparta hasta quedar fuera de la sección, menos cuanto más lejos
            const grow = Math.sqrt(rho * rho + 1) / rho;
            y = cy + dy * grow;
            z = cz + dz * grow;
            gain = Math.min(1, (grow - 1) * 2.2);
          }
        }
        const o = ((i * TRAIL + k) * 2 + e) * 3;
        flowPos[o] = xi;
        flowPos[o + 1] = y;
        flowPos[o + 2] = z;
        const fade = (1 - k / TRAIL) * smooth(x1, x1 + L * 0.4, xi) * smooth(x0, x0 - L * 0.3, xi);
        if (M > 1) tmp.copy(shocked ? hot : cold).lerp(warm, shocked ? gain * 0.5 : 0);
        else tmp.copy(cold).lerp(gain > 0.35 ? warm : cold, Math.min(1, gain * 1.4));
        flowCol[o] = tmp.r * fade;
        flowCol[o + 1] = tmp.g * fade;
        flowCol[o + 2] = tmp.b * fade;
      }
    }
  }
  flowGeo.attributes.position.needsUpdate = true;
  flowGeo.attributes.color.needsUpdate = true;
}

// curva de finura y de resistencia con el Mach del avión elegido, y el punto actual
const chart = $("chart");
const ctx = chart.getContext("2d");
let curve = null;
function drawChart() {
  const c = AIRCRAFT[current];
  const N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const m = Math.max(c.maxM * 0.08, (c.maxM * i) / N);
    const s = state(c, m);
    return [m, Math.min(s.LD, 25), s.D];
  });
  curve = { pts, maxLD: Math.max(...pts.map((p) => p[1])) * 1.1, maxD: Math.max(...pts.map((p) => p[2])) * 1.1, maxM: c.maxM };
  marker();
}
function marker() {
  if (!curve) return;
  const dpr = Math.min(devicePixelRatio, 2);
  const W = chart.clientWidth;
  const H = chart.clientHeight;
  chart.width = W * dpr;
  chart.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const px = (m) => 8 + ((W - 16) * m) / curve.maxM;
  const plot = (k, max, color) => {
    ctx.beginPath();
    curve.pts.forEach(([m, ld, d], i) => { const v = k === 1 ? ld : d; const y = H - 18 - ((H - 30) * v) / max; i ? ctx.lineTo(px(m), y) : ctx.moveTo(px(m), y); });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  };
  ctx.strokeStyle = "#ffffff14";
  ctx.beginPath();
  ctx.moveTo(8, H - 18);
  ctx.lineTo(W - 8, H - 18);
  ctx.stroke();
  if (curve.maxM > 1) { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px(1), 6); ctx.lineTo(px(1), H - 18); ctx.stroke(); ctx.setLineDash([]); }
  plot(1, curve.maxLD, "#7fb2ff");
  plot(2, curve.maxD, "#ff8a3c");
  ctx.fillStyle = "#e9ecef";
  ctx.beginPath();
  ctx.arc(px(M), H - 18, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "10px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#8b939c";
  ctx.fillText("Mach 0", 8, H - 4);
  ctx.fillText(`${fmt(curve.maxM, 1)}`, W - 30, H - 4);
  if (curve.maxM > 1) ctx.fillText("1", px(1) - 3, H - 4);
}

function resize() {
  const v = $("view");
  const w = v.clientWidth;
  const h = v.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  marker();
  renderer.render(scene, camera);
}
addEventListener("resize", resize);
visualViewport?.addEventListener("resize", resize);
document.querySelectorAll("[data-plane]").forEach((b) => b.addEventListener("click", () => show(b.dataset.plane)));
$("mach").addEventListener("input", (e) => setMach(e.target.value));

const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  stepFlow(t);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resize();
const start = new URLSearchParams(location.search).get("avion");
await show(AIRCRAFT[start] ? start : "sr71");
frame();
