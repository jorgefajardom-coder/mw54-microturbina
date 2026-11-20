// Túnel de viento 2D: resuelve las ecuaciones de Navier-Stokes en la GPU, en una malla de nx × ny celdas, con el mismo
// renderizador de three.js que la vista 3D. Dos métodos según el Mach:
//
// · Incompresible (Mach < 0,3): Lattice Boltzmann D2Q9 con colisión BGK. Cada celda guarda nueve poblaciones de
//   partículas que se mueven a las vecinas y se relajan hacia el equilibrio de Maxwell con un tiempo τ; en el límite
//   de onda larga eso es Navier-Stokes incompresible con viscosidad ν = (τ − ½)/3 (en unidades de la malla). Opcional,
//   un modelo de submalla de Smagorinsky (cs) que sube τ donde el flujo se corta, para aguantar Reynolds más altos.
// · Compresible (Mach ≥ 0,3): volúmenes finitos sobre (ρ, ρu, ρv, E), flujo HLL con reconstrucción MUSCL (limitador
//   minmod), términos viscosos de Navier-Stokes con el tensor completo, trabajo viscoso, disipación y conducción de
//   calor, y Runge-Kutta SSP de segundo orden. Unidades: ρ∞ = 1, a∞ = 1 (u∞ = Mach), p∞ = 1/γ, T = γp/ρ.
//
// El cuerpo llega como una máscara con varias muestras por celda. Boltzmann usa celdas sólidas enteras con rebote a mitad
// de camino. Los volúmenes finitos usan celdas cortadas: cada celda sabe qué fracción es aire y cuánto de cada cara está
// abierto, los flujos pasan por la parte abierta y la pared que corta la celda (con su longitud y normal verdaderas)
// empuja con la presión del problema de Riemann. Así una pared inclinada no se comporta como una escalera: el aire que
// corre a lo largo de ella no choca con cada escalón y los choques oblicuos salen con su ángulo exacto.
// El aire entra por la izquierda en la dirección +x con la velocidad impuesta; arriba y abajo el borde copia su vecina
// (gradiente nulo), para que el aire que desvía el cuerpo salga sin rozar contra un borde impuesto; a la derecha sale a
// la presión del aire libre (Boltzmann) o con gradiente nulo (volúmenes, donde el flujo supersónico no mira atrás).
// Las pruebas de tests/tunel.mjs lo comparan con soluciones conocidas: Poiseuille, la calle de vórtices de un cilindro,
// el tubo de Sod, el choque oblicuo de una placa (θ-β-M) y rampas que cortan las celdas en diagonal.
import * as THREE from "three";

const VERT = "in vec3 position; void main() { gl_Position = vec4(position.xy, 0., 1.); }";

const LBM = /* glsl */ `precision highp float; precision highp int;
uniform sampler2D A, B, C, MASK;
uniform ivec2 N;
uniform float tau, U, smag;
uniform bool init, sponge;
layout(location = 0) out vec4 oA;
layout(location = 1) out vec4 oB;
layout(location = 2) out vec4 oC;
const ivec2 E[9] = ivec2[9](ivec2(0, 0), ivec2(1, 0), ivec2(0, 1), ivec2(-1, 0), ivec2(0, -1), ivec2(1, 1), ivec2(-1, 1), ivec2(-1, -1), ivec2(1, -1));
const float Wt[9] = float[9](4. / 9., 1. / 9., 1. / 9., 1. / 9., 1. / 9., 1. / 36., 1. / 36., 1. / 36., 1. / 36.);
const int OPP[9] = int[9](0, 3, 4, 1, 2, 7, 8, 5, 6);
bool solid(ivec2 p) { return texelFetch(MASK, p, 0).r > .5; }
// se guarda f − w (la desviación del reposo) para no perder precisión en texturas de media precisión
float fget(ivec2 p, int i) {
  if (i == 0) return texelFetch(C, p, 0).x + Wt[0];
  if (i < 5) return texelFetch(A, p, 0)[i - 1] + Wt[i];
  return texelFetch(B, p, 0)[i - 5] + Wt[i];
}
float feq(int i, float rho, vec2 u) { float eu = dot(vec2(E[i]), u); return Wt[i] * rho * (1. + 3. * eu + 4.5 * eu * eu - 1.5 * dot(u, u)); }
void put(float f[9]) {
  oA = vec4(f[1] - Wt[1], f[2] - Wt[2], f[3] - Wt[3], f[4] - Wt[4]);
  oB = vec4(f[5] - Wt[5], f[6] - Wt[6], f[7] - Wt[7], f[8] - Wt[8]);
  oC = vec4(f[0] - Wt[0], 0., 0., 0.);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float f[9];
  vec2 uin = vec2(U, 0.);
  if (init || solid(p)) {
    vec2 u0 = solid(p) ? vec2(0.) : uin;
    for (int i = 0; i < 9; i++) f[i] = feq(i, 1., u0);
    put(f);
    return;
  }
  // salida a presión fija: lo que entra por la derecha está en equilibrio con ρ = 1 y la velocidad de la propia celda;
  // sin esa referencia la masa del túnel derivaría sin fin
  vec2 uout = vec2(0.);
  if (p.x == N.x - 1) {
    float r = 0.;
    for (int i = 0; i < 9; i++) { float g = fget(p, i); r += g; uout += g * vec2(E[i]); }
    uout /= r;
  }
  // transporte: cada población llega de la vecina que tiene detrás; si ahí hay pared, rebota la que salió hacia ella
  for (int i = 0; i < 9; i++) {
    ivec2 s = p - E[i];
    if (s.x < 0) f[i] = feq(i, 1., uin);
    else if (s.x >= N.x) f[i] = feq(i, 1., uout);
    else {
      // arriba y abajo, gradiente nulo: la población llega de la celda del borde
      s = min(max(s, ivec2(0)), N - 1);
      f[i] = solid(s) ? fget(p, OPP[i]) : fget(s, i);
    }
  }
  // entrada de velocidad de Zou y He: en la primera columna las tres poblaciones que entran se deducen de las que se
  // conocen para que la velocidad sea exactamente u∞ (el caudal es el impuesto aunque la presión suba dentro)
  if (p.x == 0) {
    float r0 = (f[0] + f[2] + f[4] + 2. * (f[3] + f[6] + f[7])) / (1. - U);
    f[1] = f[3] + 2. / 3. * r0 * U;
    f[5] = f[7] - .5 * (f[2] - f[4]) + r0 * U / 6.;
    f[8] = f[6] + .5 * (f[2] - f[4]) + r0 * U / 6.;
  }
  float rho = 0.;
  vec2 u = vec2(0.);
  for (int i = 0; i < 9; i++) { rho += f[i]; u += f[i] * vec2(E[i]); }
  u /= rho;
  float t = tau;
  if (smag > 0.) {
    // Smagorinsky: el tensor de flujo de momento fuera del equilibrio mide el corte local
    float pxx = 0., pyy = 0., pxy = 0.;
    for (int i = 0; i < 9; i++) {
      float d = f[i] - feq(i, rho, u);
      vec2 e = vec2(E[i]);
      pxx += e.x * e.x * d; pyy += e.y * e.y * d; pxy += e.x * e.y * d;
    }
    float Q = sqrt(2. * (pxx * pxx + pyy * pyy + 2. * pxy * pxy));
    t = .5 * (tau + sqrt(tau * tau + smag * Q / rho));
  }
  for (int i = 0; i < 9; i++) f[i] += (feq(i, rho, u) - f[i]) / t;
  // esponja en las 16 primeras columnas: un tirón suave hacia el aire libre (con la densidad de la celda, sin meter
  // masa) que se traga las ondas de sonido que vuelven a la entrada y harían bandas en todo el túnel
  if (p.x < 16 && sponge) {
    float s = .08 * pow(1. - float(p.x) / 16., 2.);
    for (int i = 0; i < 9; i++) f[i] = mix(f[i], feq(i, rho, uin), s);
  }
  put(f);
}`;

const LBM_MACRO = /* glsl */ `precision highp float; precision highp int;
uniform sampler2D A, B, C, MASK;
out vec4 o;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(A, p, 0) + 1. / 9., b = texelFetch(B, p, 0) + 1. / 36.;
  float f0 = texelFetch(C, p, 0).x + 4. / 9.;
  float rho = f0 + a.x + a.y + a.z + a.w + b.x + b.y + b.z + b.w;
  vec2 u = vec2(a.x - a.z + b.x - b.y - b.z + b.w, a.y - a.w + b.x + b.y - b.z - b.w) / rho;
  if (texelFetch(MASK, p, 0).r > .5) { rho = 1.; u = vec2(0.); }
  o = vec4(rho, u, rho / 3.);
}`;

const NS = /* glsl */ `precision highp float; precision highp int;
uniform sampler2D Q, Q0, GEO;
uniform ivec2 N;
uniform float dt, mu, kap, ca, cb;
uniform vec4 Winf;
uniform bool init;
out vec4 o;
const float G = 1.4;
vec4 prim(vec4 q) { float r = max(q.x, 1e-4); vec2 u = q.yz / r; return vec4(r, u, max((G - 1.) * (q.w - .5 * r * dot(u, u)), 1e-6)); }
vec4 cons(vec4 w) { return vec4(w.x, w.x * w.yz, w.w / (G - 1.) + .5 * w.x * dot(w.yz, w.yz)); }
// geometría de celdas cortadas: r = fracción de la celda que es aire (κ), g = apertura de la cara derecha, b = de la de
// arriba. Fuera de la malla, aire libre con las caras abiertas
vec4 geo(ivec2 p) { if (any(lessThan(p, ivec2(0))) || any(greaterThanEqual(p, N))) return vec4(1.); return texelFetch(GEO, p, 0); }
bool solid(ivec2 p) { return geo(p).r < .002; }
// fuera de la malla: aire libre que entra por la izquierda; en los otros bordes, el valor de la celda del borde
vec4 W(ivec2 p) { if (p.x < 0) return Winf; return prim(texelFetch(Q, clamp(p, ivec2(0), N - 1), 0)); }
// celda fantasma de una pared para las pendientes: la misma celda con la velocidad normal a la cara invertida
vec4 ghost(vec4 w, ivec2 e) { if (e.x != 0) w.y = -w.y; else w.z = -w.z; return w; }
// presión de la pared: el problema de Riemann contra la superficie con la velocidad normal n (hacia el sólido). Al
// comprimir, choque reflejado (p* − p = ρ un W); al alejarse, onda de rarefacción isentrópica
float wallPressure(vec4 w, vec2 n) {
  float un = dot(w.yz, n);
  float a = sqrt(G * w.w / w.x);
  if (un > 0.) { float k = (G + 1.) / 4. * un; return w.w + w.x * un * (k + sqrt(k * k + a * a)); }
  return w.w * pow(max(1. + .5 * (G - 1.) * un / a, 0.), 2. * G / (G - 1.));
}
vec4 mm(vec4 a, vec4 b) { return (sign(a) + sign(b)) * .5 * min(abs(a), abs(b)); }
vec4 safe(vec4 w, vec4 fallback) { return (w.x > 1e-4 && w.w > 1e-6) ? w : fallback; }
vec4 flux(vec4 w, vec2 n) { float un = dot(w.yz, n); vec4 q = cons(w); return vec4(q.x * un, q.yz * un + w.w * n, (q.w + w.w) * un); }
vec4 hll(vec4 L, vec4 R, vec2 n) {
  float aL = sqrt(G * L.w / L.x), aR = sqrt(G * R.w / R.x), uL = dot(L.yz, n), uR = dot(R.yz, n);
  float sL = min(uL - aL, uR - aR), sR = max(uL + aL, uR + aR);
  vec4 FL = flux(L, n), FR = flux(R, n);
  if (sL >= 0.) return FL;
  if (sR <= 0.) return FR;
  return (sR * FL - sL * FR + sL * sR * (cons(R) - cons(L))) / (sR - sL);
}
// diferencia de flujos en una dirección, cada cara pesada por su apertura (lo que tiene de aire): MUSCL de segundo
// orden donde las cinco celdas son aire entero, de primer orden junto al cuerpo
vec4 divDir(ivec2 p, ivec2 e, vec4 w0, float k0, float ar, float al) {
  vec2 n = vec2(e);
  float kp1 = geo(p + e).r, km1 = geo(p - e).r;
  vec4 wp1 = kp1 < .002 ? ghost(w0, e) : W(p + e);
  vec4 wm1 = km1 < .002 ? ghost(w0, e) : W(p - e);
  bool full = k0 > .998 && kp1 > .998 && km1 > .998 && geo(p + 2 * e).r > .998 && geo(p - 2 * e).r > .998;
  vec4 Fr = vec4(0.), Fl = vec4(0.);
  if (full) {
    vec4 wp2 = W(p + 2 * e), wm2 = W(p - 2 * e);
    vec4 s0 = mm(w0 - wm1, wp1 - w0), sp = mm(wp1 - w0, wp2 - wp1), sm = mm(wm1 - wm2, w0 - wm1);
    Fr = hll(safe(w0 + .5 * s0, w0), safe(wp1 - .5 * sp, wp1), n);
    Fl = hll(safe(wm1 + .5 * sm, wm1), safe(w0 - .5 * s0, w0), n);
  } else {
    if (ar > .002) Fr = ar * hll(w0, wp1, n);
    if (al > .002) Fl = al * hll(wm1, w0, n);
  }
  return Fr - Fl;
}
// velocidad y temperatura de una vecina para los términos viscosos: en la pared, no desliza (u = 0 en la cara) y no
// conduce calor (la misma temperatura)
vec3 vt(ivec2 p, vec4 w0) {
  if (solid(p)) return vec3(-w0.yz, G * w0.w / w0.x);
  vec4 w = W(p);
  return vec3(w.yz, G * w.w / w.x);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 q0 = texelFetch(Q0, p, 0);
  if (init) { o = cons(Winf); return; }
  vec4 g0 = geo(p);
  float k0 = g0.r;
  if (k0 < .002) { o = q0; return; }
  vec4 w0 = W(p);
  float axr = g0.g, axl = geo(p - ivec2(1, 0)).g, ayt = g0.b, ayb = geo(p - ivec2(0, 1)).b;
  vec4 L = -divDir(p, ivec2(1, 0), w0, k0, axr, axl) - divDir(p, ivec2(0, 1), w0, k0, ayt, ayb);
  // la pared que corta la celda: lo que les falta a las caras para cerrar el contorno es su longitud por su normal
  // (hacia el sólido). Empuja con la presión de Riemann a lo largo de esa normal verdadera, no la del escalón
  vec2 Lw = -vec2(axr - axl, ayt - ayb);
  float lw = length(Lw);
  if (lw > 1e-3) L.yz -= wallPressure(w0, Lw / lw) * Lw;
  // se divide por el aire de la celda; las celdas muy pequeñas cuentan como media celda para no exigir pasos de
  // tiempo diminutos (cambia cómo llegan al estado estable, no cuál es)
  L /= max(k0, .5);
  if (mu > 0.) {
    // difusión explícita: donde el aire está muy enrarecido (la estela tras la base) ν = μ/ρ dispararía la difusión por
    // encima de lo que aguanta el paso de tiempo; ahí se limita μ local (el número de difusión queda por debajo de ½)
    float ml = min(mu, .06 * w0.x / dt), kl = kap * ml / mu;
    vec3 c = vec3(w0.yz, G * w0.w / w0.x);
    vec3 xp = vt(p + ivec2(1, 0), w0), xm = vt(p - ivec2(1, 0), w0), yp = vt(p + ivec2(0, 1), w0), ym = vt(p - ivec2(0, 1), w0);
    vec3 dxy = (vt(p + ivec2(1, 1), w0) - vt(p + ivec2(1, -1), w0) - vt(p + ivec2(-1, 1), w0) + vt(p + ivec2(-1, -1), w0)) * .25;
    vec3 dx = (xp - xm) * .5, dy = (yp - ym) * .5, dxx = xp - 2. * c + xm, dyy = yp - 2. * c + ym;
    // ∂τxx/∂x + ∂τxy/∂y y ∂τxy/∂x + ∂τyy/∂y con μ constante
    float fx = ml * (4. / 3. * dxx.x + dyy.x + dxy.y / 3.);
    float fy = ml * (dxx.y + 4. / 3. * dyy.y + dxy.x / 3.);
    float div = dx.x + dy.y;
    float phi = ml * (2. * dx.x * dx.x + 2. * dy.y * dy.y + (dy.x + dx.y) * (dy.x + dx.y) - 2. / 3. * div * div);
    L += vec4(0., fx, fy, c.x * fx + c.y * fy + phi + kl * (dxx.z + dyy.z));
  }
  vec4 qn = ca * q0 + cb * (texelFetch(Q, p, 0) + dt * L);
  qn.x = max(qn.x, 1e-3);
  // positividad sin crear energía: si la cinética pasa de la total (presión negativa), se recorta la velocidad y no se
  // sube la energía; subirla realimentaría la velocidad en las celdas encerradas entre paredes hasta reventar
  qn.w = max(qn.w, 2e-3);
  float ke = .5 * dot(qn.yz, qn.yz) / qn.x, room = qn.w - 1e-3;
  if (ke > room) qn.yz *= sqrt(room / ke);
  if (any(isnan(qn)) || any(isinf(qn))) qn = cons(Winf);
  o = qn;
}`;

const NS_MACRO = /* glsl */ `precision highp float; precision highp int;
uniform sampler2D Q;
out vec4 o;
void main() {
  vec4 q = texelFetch(Q, ivec2(gl_FragCoord.xy), 0);
  float r = max(q.x, 1e-4);
  vec2 u = q.yz / r;
  o = vec4(r, u, max(.4 * (q.w - .5 * r * dot(u, u)), 1e-6));
}`;

// lo que se ve: velocidad, coeficiente de presión, vorticidad o schlieren numérico, con interpolación bilineal hecha a
// mano (las texturas de coma flotante no siempre se pueden filtrar) y el cuerpo en gris
const SHOW = /* glsl */ `precision highp float; precision highp int;
uniform sampler2D F, MASK;
uniform ivec2 N;
uniform vec4 box;
uniform int field;
uniform float pInf, qInf, uInf, vScale;
out vec4 o;
vec4 at(ivec2 c) { return texelFetch(F, clamp(c, ivec2(0), N - 1), 0); }
float value(ivec2 c) {
  vec4 m = at(c);
  if (field == 0) return length(m.yz) / uInf;
  if (field == 1) return (m.w - pInf) / qInf;
  if (field == 2) {
    float w = (at(c + ivec2(1, 0)).z - at(c - ivec2(1, 0)).z - at(c + ivec2(0, 1)).y + at(c - ivec2(0, 1)).y) * .5;
    return w * vScale;
  }
  vec2 g = vec2(at(c + ivec2(1, 0)).x - at(c - ivec2(1, 0)).x, at(c + ivec2(0, 1)).x - at(c - ivec2(0, 1)).x) * .5;
  return length(g);
}
float solidAt(ivec2 c) { return texelFetch(MASK, clamp(c, ivec2(0), N - 1), 0).r; }
const vec3 BG = vec3(.051, .059, .071), COLD = vec3(.498, .698, 1.), HOT = vec3(1., .541, .235);
vec3 diverging(float v) {
  v = clamp(v, -1., 1.);
  return v < 0. ? mix(vec3(.09, .1, .12), COLD, sqrt(-v)) : mix(vec3(.09, .1, .12), HOT, sqrt(v));
}
void main() {
  vec2 uv = (gl_FragCoord.xy - box.xy) / box.zw;
  if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) { o = vec4(BG, 1.); return; }
  vec2 g = uv * vec2(N) - .5;
  ivec2 c = ivec2(floor(g));
  vec2 t = fract(g);
  float v = mix(mix(value(c), value(c + ivec2(1, 0)), t.x), mix(value(c + ivec2(0, 1)), value(c + ivec2(1, 1)), t.x), t.y);
  float s = mix(mix(solidAt(c), solidAt(c + ivec2(1, 0)), t.x), mix(solidAt(c + ivec2(0, 1)), solidAt(c + ivec2(1, 1)), t.x), t.y);
  vec3 col;
  if (field == 0) col = diverging((v - 1.) / .6);
  else if (field == 1) col = diverging(v < 0. ? v / 1.5 : v);
  else if (field == 2) col = diverging(v);
  else col = mix(BG, vec3(.92, .94, .96), 1. - exp(-v * 22.));
  if (s > .5) col = mix(vec3(.36, .39, .43), vec3(.24, .26, .29), smoothstep(.5, 1., s));
  o = vec4(col, 1.);
}`;

// estado inicial dado en primitivas (ρ, u, v, p) → conservadas, para pruebas como el tubo de Sod
const LOAD = /* glsl */ `precision highp float; precision highp int;
uniform sampler2D S;
out vec4 o;
void main() {
  vec4 w = texelFetch(S, ivec2(gl_FragCoord.xy), 0);
  o = vec4(w.x, w.x * w.yz, w.w / .4 + .5 * w.x * dot(w.yz, w.yz));
}`;

const raw = (fragmentShader, uniforms) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });

export function supported(renderer) {
  return renderer.capabilities.isWebGL2 && (renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float"));
}

export function createTunnel(renderer, { nx, ny }) {
  const exact = renderer.extensions.has("EXT_color_buffer_float");
  const type = exact ? THREE.FloatType : THREE.HalfFloatType;
  const target = (count = 1) => new THREE.WebGLRenderTarget(nx, ny, { count, type, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false });
  const mask = new Uint8Array(nx * ny);
  const maskTex = new THREE.DataTexture(mask, nx, ny, THREE.RedFormat, THREE.UnsignedByteType);
  maskTex.needsUpdate = true;
  const kappa = new Float32Array(nx * ny).fill(1), apX = new Float32Array(nx * ny).fill(1), apY = new Float32Array(nx * ny).fill(1);
  const geometry = new Uint8Array(nx * ny * 4).fill(255);
  const geoTex = new THREE.DataTexture(geometry, nx, ny, THREE.RGBAFormat, THREE.UnsignedByteType);
  geoTex.needsUpdate = true;
  const N = new THREE.Vector2(nx, ny);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const stage = new THREE.Scene();
  stage.add(quad);
  const cam = new THREE.Camera();

  let lbm = [target(3), target(3)];
  let ns = [target(), target(), target()];
  const macroRT = target();
  const lbmMat = raw(LBM, { A: { value: null }, B: { value: null }, C: { value: null }, MASK: { value: maskTex }, N: { value: N }, tau: { value: 0.6 }, U: { value: 0.08 }, smag: { value: 0 }, init: { value: false }, sponge: { value: true } });
  const lbmMacro = raw(LBM_MACRO, { A: { value: null }, B: { value: null }, C: { value: null }, MASK: { value: maskTex } });
  const nsMat = raw(NS, { Q: { value: null }, Q0: { value: null }, GEO: { value: geoTex }, N: { value: N }, dt: { value: 0.05 }, mu: { value: 0 }, kap: { value: 0 }, ca: { value: 0 }, cb: { value: 1 }, Winf: { value: new THREE.Vector4(1, 1, 0, 1 / 1.4) }, init: { value: false } });
  const nsMacro = raw(NS_MACRO, { Q: { value: null } });
  const show = raw(SHOW, { F: { value: macroRT.texture }, MASK: { value: maskTex }, N: { value: N }, box: { value: new THREE.Vector4() }, field: { value: 0 }, pInf: { value: 1 / 3 }, qInf: { value: 1 }, uInf: { value: 1 }, vScale: { value: 1 } });

  const flow = { mode: "lbm", M: 0.1, U: 0.08, tau: 0.6, cs: 0, mu: 0, chord: nx * 0.38 };
  let steps = 0, time = 0;

  function pass(material, rt) {
    quad.material = material;
    const before = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(stage, cam);
    renderer.setRenderTarget(before);
  }
  const bindLbm = (m, rt) => { m.uniforms.A.value = rt.textures[0]; m.uniforms.B.value = rt.textures[1]; m.uniforms.C.value = rt.textures[2]; };

  function reset() {
    steps = time = 0;
    if (flow.mode === "lbm") {
      lbmMat.uniforms.init.value = true;
      bindLbm(lbmMat, lbm[1]);
      pass(lbmMat, lbm[0]);
      lbmMat.uniforms.init.value = false;
    } else {
      nsMat.uniforms.init.value = true;
      nsMat.uniforms.Q.value = nsMat.uniforms.Q0.value = ns[1].texture;
      pass(nsMat, ns[0]);
      nsMat.uniforms.init.value = false;
    }
    macro();
  }

  // paso de tiempo del método compresible: la condición CFL con la onda más rápida que puede haber (el aire libre más su
  // sonido, o el sonido del aire detenido en el morro) y el límite de la difusión viscosa y térmica
  function nsDt() {
    const M = flow.M;
    const fast = Math.max(M + 1, Math.sqrt(1 + 0.2 * M * M) + 0.5 * M) * 1.15;
    let dt = 0.45 / (2 * fast);
    if (flow.mu > 0) dt = Math.min(dt, 0.1 / (flow.mu * 2));
    return Math.min(dt, flow.dtMax ?? Infinity);
  }

  function setFlow(next) {
    const mode = next.mode ?? flow.mode;
    const changed = mode !== flow.mode;
    Object.assign(flow, next, { mode });
    lbmMat.uniforms.tau.value = flow.tau;
    lbmMat.uniforms.U.value = flow.U;
    lbmMat.uniforms.smag.value = 18 * flow.cs * flow.cs;
    lbmMat.uniforms.sponge.value = flow.sponge ?? true;
    // aire que entra por la izquierda: el libre a Mach M (inclinado tilt radianes) o uno dado [ρ, u, v, p]
    if (flow.inflow) nsMat.uniforms.Winf.value.fromArray(flow.inflow);
    else nsMat.uniforms.Winf.value.set(1, flow.M * Math.cos(flow.tilt ?? 0), flow.M * Math.sin(flow.tilt ?? 0), 1 / 1.4);
    nsMat.uniforms.mu.value = flow.mu;
    nsMat.uniforms.kap.value = flow.mu / (0.4 * 0.72);
    if (changed) reset();
  }

  function step(n = 1) {
    for (let k = 0; k < n; k++) {
      if (flow.mode === "lbm") {
        bindLbm(lbmMat, lbm[0]);
        pass(lbmMat, lbm[1]);
        lbm = [lbm[1], lbm[0]];
        time += 1;
      } else {
        // Runge-Kutta SSP de dos etapas: q1 = q + dt L(q); q' = ½ q + ½ (q1 + dt L(q1))
        const dt = nsDt();
        const u = nsMat.uniforms;
        u.dt.value = dt;
        u.Q.value = u.Q0.value = ns[0].texture; u.ca.value = 0; u.cb.value = 1;
        pass(nsMat, ns[1]);
        u.Q.value = ns[1].texture; u.Q0.value = ns[0].texture; u.ca.value = 0.5; u.cb.value = 0.5;
        pass(nsMat, ns[2]);
        ns = [ns[2], ns[0], ns[1]];
        time += dt;
      }
      steps++;
    }
  }

  function macro() {
    if (flow.mode === "lbm") { bindLbm(lbmMacro, lbm[0]); pass(lbmMacro, macroRT); }
    else { nsMacro.uniforms.Q.value = ns[0].texture; pass(nsMacro, macroRT); }
  }

  // velocidad, presión y escalas de la corriente libre en las unidades de cada método
  function freestream() {
    return flow.mode === "lbm" ? { U: flow.U, p: 1 / 3, q: 0.5 * flow.U * flow.U } : { U: flow.M, p: 1 / 1.4, q: 0.5 * flow.M * flow.M };
  }

  // field: 0 velocidad, 1 presión (Cp), 2 vorticidad, 3 schlieren. viewport en píxeles del lienzo: [x, y, ancho, alto]
  function render(field, [x, y, w, h]) {
    const f = freestream();
    const u = show.uniforms;
    u.field.value = field;
    u.pInf.value = f.p;
    u.qInf.value = f.q;
    u.uInf.value = f.U;
    u.vScale.value = flow.chord / (f.U * 40);
    u.box.value.set(x, y, w, h);
    pass(show, null);
  }

  function read(x = 0, y = 0, w = nx, h = ny) {
    if (!exact) return null;
    const buf = new Float32Array(w * h * 4);
    renderer.readRenderTargetPixels(macroRT, x, y, w, h, buf);
    return buf;
  }

  // fuerzas sobre el cuerpo por la presión, en coeficientes de la sección. Método compresible: cada pared cortada
  // empuja con su presión a lo largo de su normal; incompresible: las celdas de aire que tocan caras del cuerpo
  function forces() {
    const m = read();
    if (!m) return null;
    let fx = 0, fy = 0;
    if (flow.mode === "ns") {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (kappa[k] <= 0) continue;
        const lx = -(apX[k] - (i > 0 ? apX[k - 1] : 1)), ly = -(apY[k] - (j > 0 ? apY[k - nx] : 1));
        fx += m[k * 4 + 3] * lx;
        fy += m[k * 4 + 3] * ly;
      }
      const f = freestream();
      return { cd: fx / (f.q * flow.chord), cl: fy / (f.q * flow.chord) };
    }
    const solidAt = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && mask[j * nx + i] > 127;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (solidAt(i, j)) continue;
      const p = m[(j * nx + i) * 4 + 3];
      if (solidAt(i + 1, j)) fx += p;
      if (solidAt(i - 1, j)) fx -= p;
      if (solidAt(i, j + 1)) fy += p;
      if (solidAt(i, j - 1)) fy -= p;
    }
    const f = freestream();
    return { cd: fx / (f.q * flow.chord), cl: fy / (f.q * flow.chord) };
  }

  // carga un estado inicial del método compresible: prim con (ρ, u, v, p) por celda
  function load(prim) {
    const tex = new THREE.DataTexture(prim, nx, ny, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    const mat = raw(LOAD, { S: { value: tex } });
    pass(mat, ns[0]);
    mat.dispose();
    tex.dispose();
    steps = time = 0;
    macro();
  }

  // El cuerpo llega como una máscara (1 = sólido) de (nx·s) × (ny·s) muestras: s muestras por lado de celda. De ahí sale
  // la geometría de celdas cortadas: la fracción de aire de cada celda (κ) y la apertura de sus caras derecha y de
  // arriba (la parte de la cara con aire a los dos lados). Con s = 1 la pared queda en escalones, tal cual.
  function setMask(data, chord, s = 1) {
    const fx = nx * s, fy = ny * s;
    const air = (x, y) => x < 0 || y < 0 || x >= fx || y >= fy || !data[y * fx + x];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let n = 0, ox = 0, oy = 0;
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) if (air(i * s + a, j * s + b)) n++;
      for (let r = 0; r < s; r++) {
        if (air(i * s + s - 1, j * s + r) && air((i + 1) * s, j * s + r)) ox++;
        if (air(i * s + r, j * s + s - 1) && air(i * s + r, (j + 1) * s)) oy++;
      }
      const k = j * nx + i;
      kappa[k] = n / (s * s);
      apX[k] = ox / s;
      apY[k] = oy / s;
    }
    // la máscara de celdas (Boltzmann, dibujo, fuerzas del método incompresible): sólida si tiene menos de media celda
    // de aire. Se rellenan los bolsillos de una celda (aire con pared en tres o cuatro lados): ahí el aire queda
    // encerrado, la viscosidad con paredes que no deslizan le quita la energía y la celda acaba tragando masa sin presión
    for (let k = 0; k < nx * ny; k++) mask[k] = kappa[k] < 0.5 ? 255 : 0;
    for (let changed = true; changed; ) {
      changed = false;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (mask[k]) continue;
        const walls = (i > 0 && mask[k - 1] ? 1 : 0) + (i < nx - 1 && mask[k + 1] ? 1 : 0) + (j > 0 && mask[k - nx] ? 1 : 0) + (j < ny - 1 && mask[k + nx] ? 1 : 0);
        if (walls >= 3) {
          mask[k] = 255;
          changed = true;
          kappa[k] = apX[k] = apY[k] = 0;   // también se cierra para el método compresible
          if (i > 0) apX[k - 1] = 0;
          if (j > 0) apY[k - nx] = 0;
        }
      }
    }
    for (let k = 0; k < nx * ny; k++) {
      geometry[k * 4] = Math.round(kappa[k] * 255);
      geometry[k * 4 + 1] = Math.round(apX[k] * 255);
      geometry[k * 4 + 2] = Math.round(apY[k] * 255);
      // para el dibujo, el borde suave: 1 − κ (las celdas rellenadas, del todo sólidas)
      if (!mask[k]) mask[k] = Math.round((1 - kappa[k]) * 255) >> 1;
      else mask[k] = Math.max(128, Math.round((1 - kappa[k]) * 255));
    }
    maskTex.needsUpdate = true;
    geoTex.needsUpdate = true;
    if (chord) flow.chord = chord;
  }

  reset();
  return {
    nx, ny, exact, mask, setMask, setFlow, reset, load, step, macro, render, read, forces,
    get steps() { return steps; }, get time() { return time; }, get flow() { return flow; },
    dispose() { for (const rt of [...lbm, ...ns, macroRT]) rt.dispose(); for (const m of [lbmMat, lbmMacro, nsMat, nsMacro, show]) m.dispose(); maskTex.dispose(); geoTex.dispose(); quad.geometry.dispose(); },
  };
}

// Máscara del avión vista desde un costado (morro a la izquierda, aire hacia +x), con el ángulo de ataque α en grados
// (morro arriba) y sin el tren de aterrizaje. Devuelve la máscara con 4 × 4 muestras por celda (1 = sólido; de ahí salen
// las celdas cortadas del método compresible), su escala y la cuerda en celdas.
// "perfil": la silueta lateral entera, dibujada en la GPU con el avión ocupando 38 % del ancho.
// "ala": el corte del modelo por el plano z a 40 % de la semienvergadura. Se cortan los triángulos en la CPU, se dibuja
// el contorno y se rellena lo que no se alcanza desde el borde de la malla (las mallas no siempre son sólidos cerrados,
// así que no basta con contar caras). La sección se escala para que su cuerda ocupe 38 % del ancho.
export function silhouette(renderer, model, box, { nx, ny, alpha = 0, cut = "perfil" }) {
  const hidden = [];
  // en vuelo el tren y sus compuertas van recogidos: no forman parte del cuerpo que ve el aire (los nombres llegan sin
  // puntos: "tren.derecho" es "trenderecho"; "TBCC.compuerta", la del motor, no empieza así y se queda)
  model.traverse((o) => { if (o.visible && /^(tren|compuerta)/.test(o.name)) { o.visible = false; hidden.push(o); } });
  try {
    const S = 4;
    const r = cut === "ala" ? section(model, box, nx * S, ny * S, alpha) : side(renderer, model, box, nx * S, ny * S, alpha);
    return { mask: r.mask, chord: Math.max(1, Math.round(r.chord / S)), scale: S };
  } finally {
    for (const o of hidden) o.visible = true;
  }
}

const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

function side(renderer, model, box, nx, ny, alpha) {
  const L = box.max.x - box.min.x;
  const depth = box.max.z - box.min.z;
  const c = box.getCenter(new THREE.Vector3());
  const width = L / 0.38;
  const height = (width * ny) / nx;
  // el centro del avión queda a 42 % del ancho y a media altura; el desplazamiento del encuadre no gira con α. Con la
  // cámara en −z la pantalla a la derecha es −x (el morro, en +x, queda a la izquierda); girar la cámara +α levanta el morro
  const cam = new THREE.OrthographicCamera(-0.42 * width, 0.58 * width, height / 2, -height / 2, 0.01, depth * 4 + L);
  cam.position.set(c.x, c.y, box.min.z - depth - L * 0.1);
  cam.up.set(0, 1, 0);
  cam.lookAt(c);
  cam.rotateZ((alpha * Math.PI) / 180);
  cam.updateMatrixWorld();
  const rt = new THREE.WebGLRenderTarget(nx, ny, { depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const stage = new THREE.Scene();
  stage.overrideMaterial = material;
  const parent = model.parent;
  stage.add(model);
  const clear = renderer.getClearColor(new THREE.Color());
  const clearAlpha = renderer.getClearAlpha();
  const before = renderer.getRenderTarget();
  renderer.setClearColor(0x000000, 1);
  renderer.setRenderTarget(rt);
  renderer.render(stage, cam);
  const px = new Uint8Array(nx * ny * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, nx, ny, px);
  renderer.setClearColor(clear, clearAlpha);
  renderer.setRenderTarget(before);
  parent?.add(model);
  rt.dispose();
  material.dispose();
  const mask = new Uint8Array(nx * ny);
  for (let k = 0; k < nx * ny; k++) mask[k] = px[k * 4] > 127 ? 1 : 0;
  return { mask, chord: extent(mask, nx, ny) };
}

function extent(mask, nx, ny) {
  let x0 = nx, x1 = -1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (mask[j * nx + i]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); }
  return Math.max(1, x1 - x0 + 1);
}

function section(model, box, nx, ny, alpha) {
  const z0 = (box.min.z + box.max.z) / 2 - 0.4 * ((box.max.z - box.min.z) / 2);
  // segmentos (x, y) donde los triángulos cruzan el plano z = z0
  const segs = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!o.isMesh || !shown(o)) return;
    const pos = o.geometry.attributes.position;
    const index = o.geometry.index;
    const n = index ? index.count : pos.count;
    for (let t = 0; t + 2 < n; t += 3) {
      const ia = index ? index.getX(t) : t, ib = index ? index.getX(t + 1) : t + 1, ic = index ? index.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
      const pts = [];
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const dp = p.z - z0, dq = q.z - z0;
        if ((dp < 0) === (dq < 0)) continue;
        const k = dp / (dp - dq);
        pts.push(p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k);
      }
      if (pts.length === 4) segs.push(pts);
    }
  });
  const mask = new Uint8Array(nx * ny);
  if (!segs.length) return { mask, chord: 1 };
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const [x1, y1, x2, y2] of segs) { xmin = Math.min(xmin, x1, x2); xmax = Math.max(xmax, x1, x2); ymin = Math.min(ymin, y1, y2); ymax = Math.max(ymax, y1, y2); }
  // la sección ocupa 38 % del ancho con su centro a 42 %; el morro (x mayor) a la izquierda y α levanta el morro
  const cell = (xmax - xmin) / 0.38 / nx;
  const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2;
  const ca = Math.cos((alpha * Math.PI) / 180), sa = Math.sin((alpha * Math.PI) / 180);
  const toGrid = (x, y) => {
    const sx = -(x - cx), sy = y - cy;
    return [(sx * ca + sy * sa) / cell + 0.42 * nx, (-sx * sa + sy * ca) / cell + ny / 2];
  };
  // contorno: cada segmento muestreado cada cuarto de celda y engrosado una celda, para cerrar rendijas del modelo
  const wall = new Uint8Array(nx * ny);
  const mark = (i, j) => { if (i >= 0 && j >= 0 && i < nx && j < ny) wall[j * nx + i] = 1; };
  for (const [x1, y1, x2, y2] of segs) {
    const [i1, j1] = toGrid(x1, y1), [i2, j2] = toGrid(x2, y2);
    const steps = Math.max(1, Math.ceil(Math.hypot(i2 - i1, j2 - j1) * 4));
    for (let s = 0; s <= steps; s++) {
      const i = Math.floor(i1 + ((i2 - i1) * s) / steps), j = Math.floor(j1 + ((j2 - j1) * s) / steps);
      mark(i, j); mark(i + 1, j); mark(i - 1, j); mark(i, j + 1); mark(i, j - 1);
    }
  }
  // relleno: lo que el aire no alcanza desde el borde de la malla es sólido
  const outside = new Uint8Array(nx * ny);
  const stack = [];
  for (let i = 0; i < nx; i++) stack.push(i, (ny - 1) * nx + i);
  for (let j = 0; j < ny; j++) stack.push(j * nx, j * nx + nx - 1);
  while (stack.length) {
    const k = stack.pop();
    if (outside[k] || wall[k]) continue;
    outside[k] = 1;
    const i = k % nx, j = (k - i) / nx;
    if (i > 0) stack.push(k - 1);
    if (i < nx - 1) stack.push(k + 1);
    if (j > 0) stack.push(k - nx);
    if (j < ny - 1) stack.push(k + nx);
  }
  for (let k = 0; k < nx * ny; k++) mask[k] = outside[k] ? 0 : 1;
  return { mask, chord: extent(mask, nx, ny) };
}

// ── comprobaciones del método compresible contra soluciones exactas ──
// Las usan la página (botón «Comprobar») y tests/tunel.mjs: corren en la misma GPU con el mismo código.

const G = 1.4;
const pause = () => new Promise((r) => setTimeout(r, 0));

// Solución exacta del tubo de choque de Sod (izquierda ρ = 1, p = 1; derecha ρ = 0,125, p = 0,1; en reposo): presión y
// velocidad en la zona central del problema de Riemann, resueltas con Newton sobre la función de presión de Toro.
function riemannStar(L, R) {
  const f = (p, s) => {
    const a = Math.sqrt((G * s.p) / s.r);
    if (p > s.p) {
      const A = 2 / ((G + 1) * s.r), B = ((G - 1) / (G + 1)) * s.p;
      return [(p - s.p) * Math.sqrt(A / (p + B)), Math.sqrt(A / (B + p)) * (1 - (p - s.p) / (2 * (B + p)))];
    }
    const e = (G - 1) / (2 * G);
    return [((2 * a) / (G - 1)) * ((p / s.p) ** e - 1), (1 / (s.r * a)) * (p / s.p) ** (-(G + 1) / (2 * G))];
  };
  let p = 0.5 * (L.p + R.p);
  for (let k = 0; k < 40; k++) {
    const [fl, dl] = f(p, L), [fr, dr] = f(p, R);
    p = Math.max(1e-8, p - (fl + fr + R.u - L.u) / (dl + dr));
  }
  const u = 0.5 * (L.u + R.u) + 0.5 * (f(p, R)[0] - f(p, L)[0]);
  return { p, u };
}

const SOD = (() => {
  const L = { r: 1, u: 0, p: 1 }, R = { r: 0.125, u: 0, p: 0.1 };
  const { p, u } = riemannStar(L, R);
  const aL = Math.sqrt((G * L.p) / L.r), aR = Math.sqrt((G * R.p) / R.r);
  return {
    L, R, p, u, aL,
    rL: L.r * (p / L.p) ** (1 / G),                                                      // tras la rarefacción
    rR: R.r * ((p / R.p + (G - 1) / (G + 1)) / (((G - 1) / (G + 1)) * (p / R.p) + 1)),   // tras el choque
    shock: aR * Math.sqrt(((G + 1) / (2 * G)) * (p / R.p) + (G - 1) / (2 * G)),           // velocidad del choque
    tail: u - aL * (p / L.p) ** ((G - 1) / (2 * G)),                                        // cola de la rarefacción
  };
})();

// densidad exacta en x/t = xi (el diafragma en x = 0)
export function sodExact(xi) {
  const s = SOD;
  if (xi < -s.aL) return s.L.r;
  if (xi < s.tail) {
    // dentro del abanico de rarefacción: u = 2/(γ+1) (a_L + ξ) y el aire se expande isentrópicamente
    const u = (2 / (G + 1)) * (s.aL + xi);
    return s.L.r * ((s.aL - ((G - 1) / 2) * u) / s.aL) ** (2 / (G - 1));
  }
  if (xi < s.u) return s.rL;
  if (xi < s.shock) return s.rR;
  return s.R.r;
}

// tubo de Sod en 400 celdas hasta t = 0,2 (en unidades del tubo de longitud 1): perfil de densidad simulado y exacto,
// error L1 medio y dónde queda el choque
export async function checkSod(renderer, { nx = 400 } = {}) {
  const ny = 4, t = createTunnel(renderer, { nx, ny });
  t.setMask(new Uint8Array(nx * ny));
  t.setFlow({ mode: "ns", M: 0, mu: 0, inflow: [1, 0, 0, 1], dtMax: 0.1 });
  const prim = new Float32Array(nx * ny * 4);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const left = i < nx / 2, o = (j * nx + i) * 4;
    prim[o] = left ? 1 : 0.125; prim[o + 3] = left ? 1 : 0.1;
  }
  t.load(prim);
  const end = 0.2 * nx;
  while (t.time < end - 1e-9) {
    t.setFlow({ dtMax: Math.min(0.1, end - t.time) });
    t.step(1);
    if (t.steps % 100 === 0) await pause();
  }
  t.macro();
  const d = t.read();
  t.dispose();
  if (!d) return null;
  const x = [], sim = [], exact = [];
  let l1 = 0, front = 0;
  for (let i = 0; i < nx; i++) {
    const xi = (i + 0.5 - nx / 2) / end;
    const r = d[(nx + i) * 4], e = sodExact(xi);
    x.push((i + 0.5) / nx); sim.push(r); exact.push(e);
    l1 += Math.abs(r - e) / nx;
    if (r > (SOD.rR + SOD.R.r) / 2) front = i;   // última celda por encima de la mitad del salto del choque
  }
  const shockExact = nx / 2 + SOD.shock * end;
  return { x, sim, exact, l1, shock: front + 1, shockExact };
}

// ángulo β del choque oblicuo débil que desvía θ (grados) a un aire de Mach M: relación θ-β-M. null si el choque se
// separa (θ mayor que el máximo para ese Mach)
export function obliqueBeta(M, theta) {
  const th = Math.tan((theta * Math.PI) / 180);
  const def = (b) => (2 / Math.tan(b)) * ((M * M * Math.sin(b) ** 2 - 1) / (M * M * (G + Math.cos(2 * b)) + 2));
  const mu = Math.asin(1 / M);
  let bmax = mu, best = -Infinity;
  for (let b = mu; b < Math.PI / 2; b += 0.0005) { const v = def(b); if (v > best) { best = v; bmax = b; } }
  if (best < th) return null;
  let lo = mu, hi = bmax;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (def(m) < th) lo = m; else hi = m; }
  return ((lo + hi) / 2) * (180 / Math.PI);
}
// desviación θ (grados) que produce un choque de ángulo β (grados) a Mach M; para dibujar la curva θ-β-M
export function obliqueTheta(M, beta) {
  const b = (beta * Math.PI) / 180;
  const t = (2 / Math.tan(b)) * ((M * M * Math.sin(b) ** 2 - 1) / (M * M * (G + Math.cos(2 * b)) + 2));
  return (Math.atan(t) * 180) / Math.PI;
}
export const shockDensity = (M, beta) => { const mn2 = (M * Math.sin((beta * Math.PI) / 180)) ** 2; return ((G + 1) * mn2) / ((G - 1) * mn2 + 2); };

// recta de un choque que sube por encima de una pared: en cada columna de xa a xb, la primera celda desde arriba donde
// la densidad pasa de thr; ajuste por mínimos cuadrados y la densidad a medio camino entre la pared y el choque
export function shockFit(d, nx, ny, xa, xb, wall, thr) {
  const rho = (i, j) => d[(j * nx + i) * 4], pts = [];
  const floor = (i) => (typeof wall === "function" ? wall(i) : wall);
  for (let i = xa; i <= xb; i += 5) {
    for (let j = ny - 8; j > floor(i); j--) if (rho(i, j) > thr) { pts.push([i + 0.5, j + 0.5 + (rho(i, j) - thr) / (rho(i, j) - rho(i, j + 1))]); break; }
  }
  const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
  const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), cut = (sy - slope * sx) / n;
  const xm = Math.round((xa + xb) / 2), jm = Math.round((floor(xm) + slope * (xm + 0.5) + cut) / 2);
  return { angle: (Math.atan(slope) * 180) / Math.PI, n, rho2: jm > 0 && jm < ny ? rho(xm, jm) : NaN };
}

// choque oblicuo: una placa plana alineada con la malla (sin escalones) y el aire a Mach M que llega θ grados de
// arriba. El choque de la cara de arriba tiene que salir con el β de la relación θ-β-M y la densidad de
// Rankine-Hugoniot. La malla se ajusta para que el choque quepa con cualquier Mach de 1,5 a 6.
export async function checkOblique(renderer, { M = 2, theta = 10 } = {}) {
  const beta = obliqueBeta(M, theta);
  if (!beta) return null;
  const nx = 260, ny = 170, t = createTunnel(renderer, { nx, ny });
  const plate = 20, x0 = 30;
  const m = new Uint8Array(nx * ny);
  for (let j = plate - 4; j < plate; j++) for (let i = x0; i < nx; i++) m[j * nx + i] = 1;
  t.setMask(m, nx - x0);
  t.setFlow({ mode: "ns", M, mu: 0, tilt: (-theta * Math.PI) / 180 });
  t.reset();
  // la medida, entre 40 y 90 % del largo de la placa que deja el choque dentro de la malla
  const rel = Math.tan(((beta - theta) * Math.PI) / 180);
  const reach = Math.min(nx - x0 - 10, (ny - plate - 14) / rel);
  const xa = Math.round(x0 + 0.4 * reach), xb = Math.round(x0 + 0.9 * reach);
  const end = (2 * nx) / (M * Math.cos((theta * Math.PI) / 180));
  while (t.time < end) { t.step(50); t.macro(); t.read(0, 0, 1, 1); await pause(); }
  t.macro();
  const d = t.read();
  t.dispose();
  if (!d) return null;
  const rho2 = shockDensity(M, beta);
  const f = shockFit(d, nx, ny, xa, xb, plate, (1 + rho2) / 2);
  return { M, theta, beta, measured: f.angle + theta, points: f.n, rho2, rho2Measured: f.rho2 };
}
