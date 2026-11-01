// Terreno del aeródromo: llanura de cultivos alrededor de la pista, colinas con bosques, un lago y montañas al fondo.
// La altura sale de una sola función y la física lee la misma malla (interpolación en la rejilla), así que el avión se
// apoya y choca con lo que se ve. Alrededor de la pista y de la zona de exhibición el suelo es llano.
import * as THREE from "three";

const { smoothstep, clamp } = THREE.MathUtils;
const SIZE = 12000;
const FIELD = { x: 120, z: 60, rx: 750, rz: 600 };
const LAKE = { x: -480, z: 680, r: 170 };

// ruido de valor con interpolación suave y fBm: determinista, para que el paisaje sea siempre el mismo
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  let fx = x - xi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function fbm(x, z, oct = 5) {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i++) { s += a * noise(x, z); x *= 2.03; z *= 2.03; a *= 0.5; }
  return s;
}
const ridged = (x, z) => { let s = 0, a = 0.5; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(noise(x, z) * 2 - 1)) ** 2; x *= 2.1; z *= 2.1; a *= 0.5; } return s; };
// distancia elíptica al centro del aeródromo: < 1 llano, 1–1,8 colinas, > 2,2 montaña
const zone = (x, z) => Math.hypot((x - FIELD.x) / FIELD.rx, (z - FIELD.z) / FIELD.rz);

function rawHeight(x, z) {
  const e = zone(x, z);
  // ondulación suave de la llanura, nula junto a la pista y su calle de rodaje
  const strip = Math.max(smoothstep(Math.abs(z), 70, 140), smoothstep(Math.abs(x - 120), 260, 340));
  let h = (fbm(x / 260, z / 260, 3) - 0.5) * 3 * strip;
  h += smoothstep(e, 1, 1.7) * (fbm(x / 520 + 7, z / 520 + 3) * 110 - 15);
  h += smoothstep(e, 2.1, 3.4) * ridged(x / 1400, z / 1400) * 520;
  return h;
}
function baseHeight(x, z) {
  const d2 = (x - LAKE.x) ** 2 + (z - LAKE.z) ** 2;
  return rawHeight(x, z) - 26 * Math.exp(-d2 / (LAKE.r * LAKE.r));
}

export function createTerrain({ lite }) {
  const group = new THREE.Group();
  const N = lite ? 160 : 240;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const H = new Float32Array((N + 1) * (N + 1));
  for (let i = 0; i < pos.count; i++) {
    const h = baseHeight(pos.getX(i), pos.getZ(i));
    pos.setY(i, h);
    H[i] = h;
  }
  geo.computeVertexNormals();
  const lakeLevel = rawHeight(LAKE.x, LAKE.z) - 7;

  // colores: parcelas de cultivo en la llanura, pasto, roca en las laderas fuertes y nieve en las cumbres
  const FIELDS = [[0.64, 0.58, 0.34], [0.25, 0.37, 0.16], [0.42, 0.33, 0.22], [0.44, 0.56, 0.27], [0.55, 0.52, 0.3]];
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color(0.22, 0.37, 0.13), grass2 = new THREE.Color(0.32, 0.46, 0.17), rock = new THREE.Color(0.42, 0.39, 0.35), snow = new THREE.Color(0.92, 0.94, 0.96), sand = new THREE.Color(0.62, 0.57, 0.44);
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    c.copy(grass).lerp(grass2, fbm(x / 90, z / 90, 3));
    const e = zone(x, z);
    // parcelas de 160 m, más en la llanura que en las colinas; franja segada junto a la pista
    const cell = hash(Math.floor(x / 160) + 0.5, Math.floor(z / 160) + 0.5);
    if (e < 1.5 && cell < 0.55 * (1 - smoothstep(e, 1, 1.5)) && Math.abs(z) > 80) c.setRGB(...FIELDS[Math.floor(hash(Math.floor(x / 160), Math.floor(z / 160) + 9) * FIELDS.length)]);
    if (Math.abs(z) < 70 && Math.abs(x - 120) < 300) c.lerp(new THREE.Color(0.4, 0.53, 0.26), 0.6);
    const slope = 1 - nrm.getY(i);
    c.lerp(rock, smoothstep(slope, 0.12, 0.3));
    c.lerp(snow, smoothstep(y, 300, 380) * (1 - smoothstep(slope, 0.3, 0.5)));
    if (y < lakeLevel + 1.5 && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.8) c.lerp(sand, 0.7);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  // textura de detalle (briznas y manchas) que se repite cada 24 m y quita lo plano de cerca
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  g.fillStyle = "#d8d8d8";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 150 + Math.random() * 105; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 3); }
  const detail = new THREE.CanvasTexture(cv);
  detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
  detail.colorSpace = THREE.SRGBColorSpace;
  detail.anisotropy = lite ? 2 : 8;
  const uvs = geo.attributes.uv;
  for (let i = 0; i < uvs.count; i++) uvs.setXY(i, pos.getX(i) / 24, pos.getZ(i) / 24);
  // el suelo, los árboles y el hormigón son mates del todo: Lambert da lo mismo que el PBR con mucho menos cálculo por píxel
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: detail }));
  ground.receiveShadow = true;
  group.add(ground);

  const water = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r * 2.2, 48), new THREE.MeshStandardMaterial({ color: 0x2c4a5e, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE.x, lakeLevel, LAKE.z);
  group.add(water);

  // altura en cualquier punto, leyendo la malla tal como se dibuja (dos triángulos por celda)
  const step = SIZE / N;
  function heightAt(x, z) {
    const gx = clamp((x + SIZE / 2) / step, 0, N - 1e-6), gz = clamp((z + SIZE / 2) / step, 0, N - 1e-6);
    const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j;
    const a = H[j * (N + 1) + i], b = H[j * (N + 1) + i + 1], cc = H[(j + 1) * (N + 1) + i], d = H[(j + 1) * (N + 1) + i + 1];
    return u + v < 1 ? a + (b - a) * u + (cc - a) * v : d + (cc - d) * (1 - u) + (b - d) * (1 - v);
  }

  // ── obstáculos para las colisiones: cajas (hangares) y cilindros verticales (árboles, mástil) en una rejilla de 25 m,
  // así cada consulta mira sólo los de alrededor ──
  const CELL = 25;
  const grid = new Map();
  const boxes = [];
  const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  function addPost(o) {
    const k = cellKey(o.x, o.z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(o);
  }
  function hit(p) {
    for (const b of boxes) if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y < b.top) return b.name;
    const cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = grid.get(`${cx + i},${cz + j}`);
      if (list) for (const o of list) if (p.y > o.y0 && p.y < o.top && (p.x - o.x) ** 2 + (p.z - o.z) ** 2 < o.r * o.r) return o.name;
    }
    return null;
  }

  // ── aeródromo: calle de rodaje, plataforma, hangares y la manga de viento ──
  const concrete = new THREE.MeshLambertMaterial({ color: 0x6d6c68 });
  const flat = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), concrete); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; group.add(m); };
  flat(300, 7, 120, -28);
  flat(8, 22, 20, -14);
  flat(8, 22, 220, -14);
  flat(110, 34, 120, -56);
  const shed = new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.6, metalness: 0.3 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x5b6067, roughness: 0.5, metalness: 0.4 });
  for (const hx of [90, 150]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 18), shed);
    body.position.set(hx, 3, -84);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 26, 20, 1, false, 0, Math.PI), roof);
    // medio cilindro con el eje a lo largo del hangar, aplastado a una bóveda de 4 m
    top.rotation.z = Math.PI / 2;
    top.position.set(hx, 6, -84);
    top.scale.set(0.45, 1, 1);
    body.castShadow = top.castShadow = true;
    boxes.push({ name: "un hangar", x0: hx - 13, x1: hx + 13, z0: -93, z1: -75, top: 10 });
    group.add(body, top);
  }
  // la manga apunta hacia donde va el viento y se llena con la velocidad (a ~7 m/s queda horizontal)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  pole.position.set(60, 3, -22);
  addPost({ name: "el mástil de la manga", x: 60, z: -22, y0: 0, top: 6.2, r: 0.2 });
  group.add(pole);
  const sockPivot = new THREE.Group();
  sockPivot.position.set(60, 5.9, -22);
  const sockGeo = new THREE.CylinderGeometry(0.35, 0.16, 2.6, 12, 5, true);
  sockGeo.rotateZ(-Math.PI / 2);
  sockGeo.translate(1.3, 0, 0);
  const sc = [];
  const sp = sockGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const band = Math.floor(sp.getX(i) / 0.52) % 2; sc.push(...(band ? [0.95, 0.95, 0.95] : [1, 0.45, 0.12])); }
  sockGeo.setAttribute("color", new THREE.Float32BufferAttribute(sc, 3));
  const sock = new THREE.Mesh(sockGeo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
  sockPivot.add(sock);
  group.add(sockPivot);
  let sockT = 0;
  function setWind(w, dt = 1 / 60) {
    const sp2 = Math.hypot(w.x, w.z);
    sockT += dt;
    sockPivot.rotation.y = Math.atan2(-w.z, w.x) + Math.sin(sockT * 3.1) * 0.05;
    sockPivot.rotation.z = -(1 - smoothstep(sp2, 0.5, 7)) * 1.2 + Math.sin(sockT * 4.3) * 0.03;
  }

  // ── bosques: coníferas en las laderas, frondosos en la llanura y en las riberas; instanciados para que pese poco ──
  const COUNT = lite ? 700 : 2200;
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 5);
  trunkGeo.translate(0, 1.5, 0);
  const coneGeo = new THREE.ConeGeometry(2.4, 8, 7);
  coneGeo.translate(0, 6.5, 0);
  const roundGeo = new THREE.IcosahedronGeometry(3, 0);
  roundGeo.translate(0, 5, 0);
  const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x4a3626 }), COUNT);
  const cones = new THREE.InstancedMesh(coneGeo, leafMat, COUNT);
  const rounds = new THREE.InstancedMesh(roundGeo, leafMat, COUNT);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let nt = 0, nc = 0, nr = 0, tries = 0;
  const tint = new THREE.Color();
  while (nt < COUNT && tries++ < COUNT * 40) {
    // se siembran sobre todo en manchas de bosque, a menos de 3 km y lejos de pista, plataforma y lago
    const x = FIELD.x + (Math.random() * 2 - 1) * 3000, z = FIELD.z + (Math.random() * 2 - 1) * 2600;
    const e = zone(x, z);
    if (Math.abs(z) < 110 && Math.abs(x - 120) < 360) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.1) continue;
    const forest = fbm(x / 400 + 31, z / 400 + 17, 3);
    if (forest < (e < 1 ? 0.56 : 0.44) && Math.random() > 0.04) continue;
    const y = heightAt(x, z);
    if (y > 330 || y < lakeLevel + 1) continue;
    const conifer = y > 60 || (e > 1.2 && Math.random() < 0.7);
    const k = 0.7 + Math.random() * 0.8;
    const sy = k * (0.9 + Math.random() * 0.4);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    m4.compose(p.set(x, y - 0.3, z), q, s.set(k, sy, k));
    // copa como cilindro: un poco más estrecha que el cono o la bola, que se afinan arriba y abajo
    addPost({ name: "un árbol", x, z, y0: y - 0.3, top: y - 0.3 + (conifer ? 10.5 : 8) * sy, r: (conifer ? 1.5 : 2.3) * k });
    trunks.setMatrixAt(nt++, m4);
    tint.setHSL(conifer ? 0.3 + Math.random() * 0.04 : 0.22 + Math.random() * 0.08, 0.45, conifer ? 0.16 + Math.random() * 0.06 : 0.22 + Math.random() * 0.08);
    if (conifer) { cones.setMatrixAt(nc, m4); cones.setColorAt(nc++, tint); }
    else { rounds.setMatrixAt(nr, m4); rounds.setColorAt(nr++, tint); }
  }
  trunks.count = nt;
  cones.count = nc;
  rounds.count = nr;
  for (const m of [trunks, cones, rounds]) { m.castShadow = !lite; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; group.add(m); }

  return { group, heightAt, setWind, hit };
}
