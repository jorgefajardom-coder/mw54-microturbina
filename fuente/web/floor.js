// Piso del taller: concreto pulido de una sola pieza, marcas de estacionamiento y borde que se funde con el fondo.
// Lo usan el visor del Hawk (1:7) y el del SR-72 (escala real); cada uno da sus medidas en metros.
import * as THREE from "three";

const TILE = 4; // metros que cubre una repetición de la textura
function floorTextures(renderer, N) {
  // ruido de valor periódico, para que la textura case consigo misma al repetirse
  const noise = (cells, seed) => {
    const g = new Float32Array(cells * cells);
    let h = seed;
    for (let i = 0; i < g.length; i++) { h = (h * 1664525 + 1013904223) >>> 0; g[i] = h / 4294967296; }
    return (x, y) => {
      const fx = x * cells;
      const fy = y * cells;
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      let tx = fx - i;
      let ty = fy - j;
      tx = tx * tx * (3 - 2 * tx);
      ty = ty * ty * (3 - 2 * ty);
      const at = (a, b) => g[(((b % cells) + cells) % cells) * cells + (((a % cells) + cells) % cells)];
      return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - ty) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * ty;
    };
  };
  const octaves = [[5, 0.25], [12, 0.25], [30, 0.2], [80, 0.15], [200, 0.15]].map(([c, w], k) => [noise(c, 7 + k * 31), w]);
  const sheen = [noise(3, 101), noise(11, 202)];
  const color = document.createElement("canvas");
  const rough = document.createElement("canvas");
  color.width = color.height = rough.width = rough.height = N;
  const c = color.getContext("2d");
  const r = rough.getContext("2d");
  const ci = c.createImageData(N, N);
  const ri = r.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N;
    const v = y / N;
    let m = 0;
    for (const [f, w] of octaves) m += f(u, v) * w;
    // grano del árido: puntos claros y poros oscuros, sueltos
    const q = Math.random();
    const grain = q > 0.985 ? 0.12 * Math.random() : q < 0.01 ? -0.16 * Math.random() : (Math.random() - 0.5) * 0.04;
    const tone = 36 + (m - 0.5) * 12 + grain * 110;
    const i = (y * N + x) * 4;
    ci.data[i] = tone;
    ci.data[i + 1] = tone + 2;
    ci.data[i + 2] = tone + 5;
    ci.data[i + 3] = 255;
    // brillo del pulido: zonas amplias más lisas, y el árido algo más mate
    const s = 0.5 * sheen[0](u, v) + 0.5 * sheen[1](u, v);
    const g = 160 + (s - 0.5) * 60 + Math.abs(grain) * 300;
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = g;
    ri.data[i + 3] = 255;
  }
  c.putImageData(ci, 0, 0);
  r.putImageData(ri, 0, 0);
  const out = [color, rough].map((cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
  out[0].colorSpace = THREE.SRGBColorSpace;
  return out;
}
// El borde se funde con el color de fondo, así el piso no termina en un canto.
function fadeToBackground(material, inner, outer) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = { value: new THREE.Vector2(inner, outer) };
    // en lineal y antes del mapeo de tonos: así casa con el fondo tanto si se dibuja directo como con posproceso
    sh.uniforms.uBg = { value: new THREE.Color(0x0d0f12) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vFloor;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFloor = (modelMatrix * vec4(transformed, 1.0)).xz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vFloor;\nuniform vec2 uFade;\nuniform vec3 uBg;")
      .replace("#include <tonemapping_fragment>", "gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));\n#include <tonemapping_fragment>");
  };
}
// marcas pintadas del puesto: esquinas del recuadro, eje de rodaje con flecha y topes para las ruedas
function standDecal(renderer, { W, D, box, dash, stops, stop }) {
  const px = Math.min(512, 2600 / W);
  const cv = document.createElement("canvas");
  cv.width = W * px;
  cv.height = D * px;
  const g = cv.getContext("2d");
  const X = (m) => (m + W / 2) * px;
  const Z = (m) => (m + D / 2) * px;
  const paint = "#d9a93a";
  g.fillStyle = paint;
  for (const [x, sx] of [[box.x0, 1], [box.x1, -1]]) for (const [z, sz] of [[box.z0, 1], [box.z1, -1]]) {
    g.fillRect(Math.min(X(x), X(x + sx * box.arm)), Math.min(Z(z), Z(z + sz * box.w)), box.arm * px, box.w * px);
    g.fillRect(Math.min(X(x), X(x + sx * box.w)), Math.min(Z(z), Z(z + sz * box.arm)), box.w * px, box.arm * px);
  }
  const [dl, step, dw] = dash;
  for (let x = box.x0 + step / 2; x < box.x1 - 1.5 * step; x += step) g.fillRect(X(x), Z(-dw / 2), dl * px, dw * px);
  const a = step * 0.7;
  g.beginPath();
  g.moveTo(X(box.x1 - a * 0.3), Z(0));
  g.lineTo(X(box.x1 - a), Z(-a * 0.28));
  g.lineTo(X(box.x1 - a), Z(a * 0.28));
  g.closePath();
  g.fill();
  // topes de rueda: tren principal y rueda de morro
  g.fillStyle = "#e6e2d6";
  for (const [x, z] of stops) g.fillRect(X(x - stop[0] * 2.3), Z(z - stop[1] / 2), stop[0] * px, stop[1] * px);
  // desgaste: la pintura se pierde donde pisan las ruedas y en granos sueltos
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 14000; k++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.6})`;
    g.fillRect(Math.random() * cv.width, Math.random() * cv.height, 1 + Math.random(), 1 + Math.random());
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
// sombra de contacto: penumbra amplia bajo la célula que asienta el avión aunque el sol esté alto
function contactShadow({ w, d, x }) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(0.5, "rgba(0,0,0,0.22)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  ao.rotation.x = -Math.PI / 2;
  ao.position.x = x;
  return ao;
}

// `fade` = radios (m) donde el piso empieza y termina de fundirse con el fondo; `stand` en metros del puesto pintado.
export function createFloor(renderer, { y, fade, stand, ao, res = 2048 }) {
  const [map, rough] = floorTextures(renderer, res);
  const n = Math.ceil((fade[1] * 2.2) / TILE);
  for (const t of [map, rough]) t.repeat.set(n, n);
  const mat = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.7, metalness: 0, envMapIntensity: 0.35 });
  fadeToBackground(mat, fade[0], fade[1]);
  const ground = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(TILE * n, TILE * n), mat);
  slab.rotation.x = -Math.PI / 2;
  slab.receiveShadow = true;
  ground.add(slab, standDecal(renderer, stand), contactShadow(ao));
  ground.position.y = y;
  return ground;
}