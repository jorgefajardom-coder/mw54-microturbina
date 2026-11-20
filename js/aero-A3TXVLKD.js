import{b as tt}from"./chunks/chunk-BRJNBZFH.js";import{b as at}from"./chunks/chunk-RN5XWJKH.js";import{b as ze}from"./chunks/chunk-424HQSPG.js";import{b as ot}from"./chunks/chunk-2ADPM7RW.js";import{a as jt,b as Gt,c as Ot,d as _t,e as Vt,i as Qt}from"./chunks/chunk-N3CD2LUC.js";import{$ as Ye,Ba as Fe,E as Ke,F as Xe,G as Mt,Ga as Ct,I as Le,Ia as Ft,K as bt,Q as Et,Qa as zt,T as Rt,Ta as Pt,V as He,Va as Wt,X as oe,_ as Ze,aa as Tt,f as Ae,fa as se,h as Qe,ha as qt,hb as Dt,ja as Je,kb as Nt,la as kt,lb as $t,ma as Ce,ob as It,pa as St,qa as At,ra as Lt,t as yt,tb as Ut,ua as Ht,ub as Bt,vb as et,wa as Me,y as ye}from"./chunks/chunk-V5OSS73Z.js";import"./chunks/chunk-VC46IEJQ.js";var ma="in vec3 position; void main() { gl_Position = vec4(position.xy, 0., 1.); }",pa=`precision highp float; precision highp int;
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
// se guarda f \u2212 w (la desviaci\xF3n del reposo) para no perder precisi\xF3n en texturas de media precisi\xF3n
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
  // salida a presi\xF3n fija: lo que entra por la derecha est\xE1 en equilibrio con \u03C1 = 1 y la velocidad de la propia celda;
  // sin esa referencia la masa del t\xFAnel derivar\xEDa sin fin
  vec2 uout = vec2(0.);
  if (p.x == N.x - 1) {
    float r = 0.;
    for (int i = 0; i < 9; i++) { float g = fget(p, i); r += g; uout += g * vec2(E[i]); }
    uout /= r;
  }
  // transporte: cada poblaci\xF3n llega de la vecina que tiene detr\xE1s; si ah\xED hay pared, rebota la que sali\xF3 hacia ella
  for (int i = 0; i < 9; i++) {
    ivec2 s = p - E[i];
    if (s.x < 0) f[i] = feq(i, 1., uin);
    else if (s.x >= N.x) f[i] = feq(i, 1., uout);
    else {
      // arriba y abajo, gradiente nulo: la poblaci\xF3n llega de la celda del borde
      s = min(max(s, ivec2(0)), N - 1);
      f[i] = solid(s) ? fget(p, OPP[i]) : fget(s, i);
    }
  }
  // entrada de velocidad de Zou y He: en la primera columna las tres poblaciones que entran se deducen de las que se
  // conocen para que la velocidad sea exactamente u\u221E (el caudal es el impuesto aunque la presi\xF3n suba dentro)
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
  // esponja en las 16 primeras columnas: un tir\xF3n suave hacia el aire libre (con la densidad de la celda, sin meter
  // masa) que se traga las ondas de sonido que vuelven a la entrada y har\xEDan bandas en todo el t\xFAnel
  if (p.x < 16 && sponge) {
    float s = .08 * pow(1. - float(p.x) / 16., 2.);
    for (int i = 0; i < 9; i++) f[i] = mix(f[i], feq(i, rho, uin), s);
  }
  put(f);
}`,ha=`precision highp float; precision highp int;
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
}`,va=`precision highp float; precision highp int;
uniform sampler2D Q, Q0, GEO;
uniform ivec2 N;
uniform float dt, mu, kap, ca, cb;
uniform vec4 Winf;
uniform bool init;
out vec4 o;
const float G = 1.4;
vec4 prim(vec4 q) { float r = max(q.x, 1e-4); vec2 u = q.yz / r; return vec4(r, u, max((G - 1.) * (q.w - .5 * r * dot(u, u)), 1e-6)); }
vec4 cons(vec4 w) { return vec4(w.x, w.x * w.yz, w.w / (G - 1.) + .5 * w.x * dot(w.yz, w.yz)); }
// geometr\xEDa de celdas cortadas: r = fracci\xF3n de la celda que es aire (\u03BA), g = apertura de la cara derecha, b = de la de
// arriba. Fuera de la malla, aire libre con las caras abiertas
vec4 geo(ivec2 p) { if (any(lessThan(p, ivec2(0))) || any(greaterThanEqual(p, N))) return vec4(1.); return texelFetch(GEO, p, 0); }
bool solid(ivec2 p) { return geo(p).r < .002; }
// fuera de la malla: aire libre que entra por la izquierda; en los otros bordes, el valor de la celda del borde
vec4 W(ivec2 p) { if (p.x < 0) return Winf; return prim(texelFetch(Q, clamp(p, ivec2(0), N - 1), 0)); }
// celda fantasma de una pared para las pendientes: la misma celda con la velocidad normal a la cara invertida
vec4 ghost(vec4 w, ivec2 e) { if (e.x != 0) w.y = -w.y; else w.z = -w.z; return w; }
// presi\xF3n de la pared: el problema de Riemann contra la superficie con la velocidad normal n (hacia el s\xF3lido). Al
// comprimir, choque reflejado (p* \u2212 p = \u03C1 un W); al alejarse, onda de rarefacci\xF3n isentr\xF3pica
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
// diferencia de flujos en una direcci\xF3n, cada cara pesada por su apertura (lo que tiene de aire): MUSCL de segundo
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
// velocidad y temperatura de una vecina para los t\xE9rminos viscosos: en la pared, no desliza (u = 0 en la cara) y no
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
  // (hacia el s\xF3lido). Empuja con la presi\xF3n de Riemann a lo largo de esa normal verdadera, no la del escal\xF3n
  vec2 Lw = -vec2(axr - axl, ayt - ayb);
  float lw = length(Lw);
  if (lw > 1e-3) L.yz -= wallPressure(w0, Lw / lw) * Lw;
  // se divide por el aire de la celda; las celdas muy peque\xF1as cuentan como media celda para no exigir pasos de
  // tiempo diminutos (cambia c\xF3mo llegan al estado estable, no cu\xE1l es)
  L /= max(k0, .5);
  if (mu > 0.) {
    // difusi\xF3n expl\xEDcita: donde el aire est\xE1 muy enrarecido (la estela tras la base) \u03BD = \u03BC/\u03C1 disparar\xEDa la difusi\xF3n por
    // encima de lo que aguanta el paso de tiempo; ah\xED se limita \u03BC local (el n\xFAmero de difusi\xF3n queda por debajo de \xBD)
    float ml = min(mu, .06 * w0.x / dt), kl = kap * ml / mu;
    vec3 c = vec3(w0.yz, G * w0.w / w0.x);
    vec3 xp = vt(p + ivec2(1, 0), w0), xm = vt(p - ivec2(1, 0), w0), yp = vt(p + ivec2(0, 1), w0), ym = vt(p - ivec2(0, 1), w0);
    vec3 dxy = (vt(p + ivec2(1, 1), w0) - vt(p + ivec2(1, -1), w0) - vt(p + ivec2(-1, 1), w0) + vt(p + ivec2(-1, -1), w0)) * .25;
    vec3 dx = (xp - xm) * .5, dy = (yp - ym) * .5, dxx = xp - 2. * c + xm, dyy = yp - 2. * c + ym;
    // \u2202\u03C4xx/\u2202x + \u2202\u03C4xy/\u2202y y \u2202\u03C4xy/\u2202x + \u2202\u03C4yy/\u2202y con \u03BC constante
    float fx = ml * (4. / 3. * dxx.x + dyy.x + dxy.y / 3.);
    float fy = ml * (dxx.y + 4. / 3. * dyy.y + dxy.x / 3.);
    float div = dx.x + dy.y;
    float phi = ml * (2. * dx.x * dx.x + 2. * dy.y * dy.y + (dy.x + dx.y) * (dy.x + dx.y) - 2. / 3. * div * div);
    L += vec4(0., fx, fy, c.x * fx + c.y * fy + phi + kl * (dxx.z + dyy.z));
  }
  vec4 qn = ca * q0 + cb * (texelFetch(Q, p, 0) + dt * L);
  qn.x = max(qn.x, 1e-3);
  // positividad sin crear energ\xEDa: si la cin\xE9tica pasa de la total (presi\xF3n negativa), se recorta la velocidad y no se
  // sube la energ\xEDa; subirla realimentar\xEDa la velocidad en las celdas encerradas entre paredes hasta reventar
  qn.w = max(qn.w, 2e-3);
  float ke = .5 * dot(qn.yz, qn.yz) / qn.x, room = qn.w - 1e-3;
  if (ke > room) qn.yz *= sqrt(room / ke);
  if (any(isnan(qn)) || any(isinf(qn))) qn = cons(Winf);
  o = qn;
}`,xa=`precision highp float; precision highp int;
uniform sampler2D Q;
out vec4 o;
void main() {
  vec4 q = texelFetch(Q, ivec2(gl_FragCoord.xy), 0);
  float r = max(q.x, 1e-4);
  vec2 u = q.yz / r;
  o = vec4(r, u, max(.4 * (q.w - .5 * r * dot(u, u)), 1e-6));
}`,wa=`precision highp float; precision highp int;
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
}`,ga=`precision highp float; precision highp int;
uniform sampler2D S;
out vec4 o;
void main() {
  vec4 w = texelFetch(S, ivec2(gl_FragCoord.xy), 0);
  o = vec4(w.x, w.x * w.yz, w.w / .4 + .5 * w.x * dot(w.yz, w.yz));
}`,fe=(t,e)=>new Wt({glslVersion:Rt,vertexShader:ma,fragmentShader:t,uniforms:e,depthTest:!1,depthWrite:!1});function nt(t){return t.capabilities.isWebGL2&&(t.extensions.has("EXT_color_buffer_float")||t.extensions.has("EXT_color_buffer_half_float"))}function be(t,{nx:e,ny:a}){let o=t.extensions.has("EXT_color_buffer_float"),i=o?Xe:Mt,r=(y=1)=>new Ye(e,a,{count:y,type:i,format:Le,minFilter:ye,magFilter:ye,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),n=new Uint8Array(e*a),l=new Fe(n,e,a,bt,Ke);l.needsUpdate=!0;let c=new Float32Array(e*a).fill(1),u=new Float32Array(e*a).fill(1),m=new Float32Array(e*a).fill(1),d=new Uint8Array(e*a*4).fill(255),v=new Fe(d,e,a,Le,Ke);v.needsUpdate=!0;let h=new He(e,a),M=new Ce(new Pt(2,2));M.frustumCulled=!1;let L=new Me;L.add(M);let $=new At,P=[r(3),r(3)],E=[r(),r(),r()],g=r(),x=fe(pa,{A:{value:null},B:{value:null},C:{value:null},MASK:{value:l},N:{value:h},tau:{value:.6},U:{value:.08},smag:{value:0},init:{value:!1},sponge:{value:!0}}),U=fe(ha,{A:{value:null},B:{value:null},C:{value:null},MASK:{value:l}}),N=fe(va,{Q:{value:null},Q0:{value:null},GEO:{value:v},N:{value:h},dt:{value:.05},mu:{value:0},kap:{value:0},ca:{value:0},cb:{value:1},Winf:{value:new Ze(1,1,0,1/1.4)},init:{value:!1}}),re=fe(xa,{Q:{value:null}}),O=fe(wa,{F:{value:g.texture},MASK:{value:l},N:{value:h},box:{value:new Ze},field:{value:0},pInf:{value:1/3},qInf:{value:1},uInf:{value:1},vScale:{value:1}}),s={mode:"lbm",M:.1,U:.08,tau:.6,cs:0,mu:0,chord:e*.38},H=0,b=0;function F(y,R){M.material=y;let p=t.getRenderTarget();t.setRenderTarget(R),t.render(L,$),t.setRenderTarget(p)}let I=(y,R)=>{y.uniforms.A.value=R.textures[0],y.uniforms.B.value=R.textures[1],y.uniforms.C.value=R.textures[2]};function Z(){H=b=0,s.mode==="lbm"?(x.uniforms.init.value=!0,I(x,P[1]),F(x,P[0]),x.uniforms.init.value=!1):(N.uniforms.init.value=!0,N.uniforms.Q.value=N.uniforms.Q0.value=E[1].texture,F(N,E[0]),N.uniforms.init.value=!1),j()}function Y(){let y=s.M,p=.45/(2*(Math.max(y+1,Math.sqrt(1+.2*y*y)+.5*y)*1.15));return s.mu>0&&(p=Math.min(p,.1/(s.mu*2))),Math.min(p,s.dtMax??1/0)}function J(y){let R=y.mode??s.mode,p=R!==s.mode;Object.assign(s,y,{mode:R}),x.uniforms.tau.value=s.tau,x.uniforms.U.value=s.U,x.uniforms.smag.value=18*s.cs*s.cs,x.uniforms.sponge.value=s.sponge??!0,s.inflow?N.uniforms.Winf.value.fromArray(s.inflow):N.uniforms.Winf.value.set(1,s.M*Math.cos(s.tilt??0),s.M*Math.sin(s.tilt??0),1/1.4),N.uniforms.mu.value=s.mu,N.uniforms.kap.value=s.mu/(.4*.72),p&&Z()}function Q(y=1){for(let R=0;R<y;R++){if(s.mode==="lbm")I(x,P[0]),F(x,P[1]),P=[P[1],P[0]],b+=1;else{let p=Y(),W=N.uniforms;W.dt.value=p,W.Q.value=W.Q0.value=E[0].texture,W.ca.value=0,W.cb.value=1,F(N,E[1]),W.Q.value=E[1].texture,W.Q0.value=E[0].texture,W.ca.value=.5,W.cb.value=.5,F(N,E[2]),E=[E[2],E[0],E[1]],b+=p}H++}}function j(){s.mode==="lbm"?(I(U,P[0]),F(U,g)):(re.uniforms.Q.value=E[0].texture,F(re,g))}function _(){return s.mode==="lbm"?{U:s.U,p:1/3,q:.5*s.U*s.U}:{U:s.M,p:1/1.4,q:.5*s.M*s.M}}function K(y,[R,p,W,ie]){let z=_(),f=O.uniforms;f.field.value=y,f.pInf.value=z.p,f.qInf.value=z.q,f.uInf.value=z.U,f.vScale.value=s.chord/(z.U*40),f.box.value.set(R,p,W,ie),F(O,null)}function te(y=0,R=0,p=e,W=a){if(!o)return null;let ie=new Float32Array(p*W*4);return t.readRenderTargetPixels(g,y,R,p,W,ie),ie}function ee(){let y=te();if(!y)return null;let R=0,p=0;if(s.mode==="ns"){for(let f=0;f<a;f++)for(let T=0;T<e;T++){let G=f*e+T;if(c[G]<=0)continue;let V=-(u[G]-(T>0?u[G-1]:1)),ge=-(m[G]-(f>0?m[G-e]:1));R+=y[G*4+3]*V,p+=y[G*4+3]*ge}let z=_();return{cd:R/(z.q*s.chord),cl:p/(z.q*s.chord)}}let W=(z,f)=>z>=0&&f>=0&&z<e&&f<a&&n[f*e+z]>127;for(let z=0;z<a;z++)for(let f=0;f<e;f++){if(W(f,z))continue;let T=y[(z*e+f)*4+3];W(f+1,z)&&(R+=T),W(f-1,z)&&(R-=T),W(f,z+1)&&(p+=T),W(f,z-1)&&(p-=T)}let ie=_();return{cd:R/(ie.q*s.chord),cl:p/(ie.q*s.chord)}}function xe(y){let R=new Fe(y,e,a,Le,Xe);R.needsUpdate=!0;let p=fe(ga,{S:{value:R}});F(p,E[0]),p.dispose(),R.dispose(),H=b=0,j()}function we(y,R,p=1){let W=e*p,ie=a*p,z=(f,T)=>f<0||T<0||f>=W||T>=ie||!y[T*W+f];for(let f=0;f<a;f++)for(let T=0;T<e;T++){let G=0,V=0,ge=0;for(let ae=0;ae<p;ae++)for(let Ve=0;Ve<p;Ve++)z(T*p+Ve,f*p+ae)&&G++;for(let ae=0;ae<p;ae++)z(T*p+p-1,f*p+ae)&&z((T+1)*p,f*p+ae)&&V++,z(T*p+ae,f*p+p-1)&&z(T*p+ae,(f+1)*p)&&ge++;let _e=f*e+T;c[_e]=G/(p*p),u[_e]=V/p,m[_e]=ge/p}for(let f=0;f<e*a;f++)n[f]=c[f]<.5?255:0;for(let f=!0;f;){f=!1;for(let T=0;T<a;T++)for(let G=0;G<e;G++){let V=T*e+G;if(n[V])continue;(G>0&&n[V-1]?1:0)+(G<e-1&&n[V+1]?1:0)+(T>0&&n[V-e]?1:0)+(T<a-1&&n[V+e]?1:0)>=3&&(n[V]=255,f=!0,c[V]=u[V]=m[V]=0,G>0&&(u[V-1]=0),T>0&&(m[V-e]=0))}}for(let f=0;f<e*a;f++)d[f*4]=Math.round(c[f]*255),d[f*4+1]=Math.round(u[f]*255),d[f*4+2]=Math.round(m[f]*255),n[f]?n[f]=Math.max(128,Math.round((1-c[f])*255)):n[f]=Math.round((1-c[f])*255)>>1;l.needsUpdate=!0,v.needsUpdate=!0,R&&(s.chord=R)}return Z(),{nx:e,ny:a,exact:o,mask:n,setMask:we,setFlow:J,reset:Z,load:xe,step:Q,macro:j,render:K,read:te,forces:ee,get steps(){return H},get time(){return b},get flow(){return s},dispose(){for(let y of[...P,...E,g])y.dispose();for(let y of[x,U,N,re,O])y.dispose();l.dispose(),v.dispose(),M.geometry.dispose()}}}function rt(t,e,a,{nx:o,ny:i,alpha:r=0,cut:n="perfil"}){let l=[];e.traverse(c=>{c.visible&&/^(tren|compuerta)/.test(c.name)&&(c.visible=!1,l.push(c))});try{let u=n==="ala"?ba(e,a,o*4,i*4,r):Ma(t,e,a,o*4,i*4,r);return{mask:u.mask,chord:Math.max(1,Math.round(u.chord/4)),scale:4}}finally{for(let c of l)c.visible=!0}}var ya=t=>{for(let e=t;e;e=e.parent)if(!e.visible)return!1;return!0};function Ma(t,e,a,o,i,r){let n=a.max.x-a.min.x,l=a.max.z-a.min.z,c=a.getCenter(new oe),u=n/.38,m=u*i/o,d=new Nt(-.42*u,.58*u,m/2,-m/2,.01,l*4+n);d.position.set(c.x,c.y,a.min.z-l-n*.1),d.up.set(0,1,0),d.lookAt(c),d.rotateZ(r*Math.PI/180),d.updateMatrixWorld();let v=new Ye(o,i,{depthBuffer:!0,minFilter:ye,magFilter:ye}),h=new qt({color:16777215,side:Ae}),M=new Me;M.overrideMaterial=h;let L=e.parent;M.add(e);let $=t.getClearColor(new se),P=t.getClearAlpha(),E=t.getRenderTarget();t.setClearColor(0,1),t.setRenderTarget(v),t.render(M,d);let g=new Uint8Array(o*i*4);t.readRenderTargetPixels(v,0,0,o,i,g),t.setClearColor($,P),t.setRenderTarget(E),L==null||L.add(e),v.dispose(),h.dispose();let x=new Uint8Array(o*i);for(let U=0;U<o*i;U++)x[U]=g[U*4]>127?1:0;return{mask:x,chord:Kt(x,o,i)}}function Kt(t,e,a){let o=e,i=-1;for(let r=0;r<a;r++)for(let n=0;n<e;n++)t[r*e+n]&&(o=Math.min(o,n),i=Math.max(i,n));return Math.max(1,i-o+1)}function ba(t,e,a,o,i){let r=(e.min.z+e.max.z)/2-.4*((e.max.z-e.min.z)/2),n=[],l=new oe,c=new oe,u=new oe;t.updateMatrixWorld(!0),t.traverse(s=>{if(!s.isMesh||!ya(s))return;let H=s.geometry.attributes.position,b=s.geometry.index,F=b?b.count:H.count;for(let I=0;I+2<F;I+=3){let Z=b?b.getX(I):I,Y=b?b.getX(I+1):I+1,J=b?b.getX(I+2):I+2;l.fromBufferAttribute(H,Z).applyMatrix4(s.matrixWorld),c.fromBufferAttribute(H,Y).applyMatrix4(s.matrixWorld),u.fromBufferAttribute(H,J).applyMatrix4(s.matrixWorld);let Q=[];for(let[j,_]of[[l,c],[c,u],[u,l]]){let K=j.z-r,te=_.z-r;if(K<0==te<0)continue;let ee=K/(K-te);Q.push(j.x+(_.x-j.x)*ee,j.y+(_.y-j.y)*ee)}Q.length===4&&n.push(Q)}});let m=new Uint8Array(a*o);if(!n.length)return{mask:m,chord:1};let d=1/0,v=-1/0,h=1/0,M=-1/0;for(let[s,H,b,F]of n)d=Math.min(d,s,b),v=Math.max(v,s,b),h=Math.min(h,H,F),M=Math.max(M,H,F);let L=(v-d)/.38/a,$=(d+v)/2,P=(h+M)/2,E=Math.cos(i*Math.PI/180),g=Math.sin(i*Math.PI/180),x=(s,H)=>{let b=-(s-$),F=H-P;return[(b*E+F*g)/L+.42*a,(-b*g+F*E)/L+o/2]},U=new Uint8Array(a*o),N=(s,H)=>{s>=0&&H>=0&&s<a&&H<o&&(U[H*a+s]=1)};for(let[s,H,b,F]of n){let[I,Z]=x(s,H),[Y,J]=x(b,F),Q=Math.max(1,Math.ceil(Math.hypot(Y-I,J-Z)*4));for(let j=0;j<=Q;j++){let _=Math.floor(I+(Y-I)*j/Q),K=Math.floor(Z+(J-Z)*j/Q);N(_,K),N(_+1,K),N(_-1,K),N(_,K+1),N(_,K-1)}}let re=new Uint8Array(a*o),O=[];for(let s=0;s<a;s++)O.push(s,(o-1)*a+s);for(let s=0;s<o;s++)O.push(s*a,s*a+a-1);for(;O.length;){let s=O.pop();if(re[s]||U[s])continue;re[s]=1;let H=s%a,b=(s-H)/a;H>0&&O.push(s-1),H<a-1&&O.push(s+1),b>0&&O.push(s-a),b<o-1&&O.push(s+a)}for(let s=0;s<a*o;s++)m[s]=re[s]?0:1;return{mask:m,chord:Kt(m,a,o)}}var q=1.4,Xt=()=>new Promise(t=>setTimeout(t,0));function Ea(t,e){let a=(r,n)=>{let l=Math.sqrt(q*n.p/n.r);if(r>n.p){let u=2/((q+1)*n.r),m=(q-1)/(q+1)*n.p;return[(r-n.p)*Math.sqrt(u/(r+m)),Math.sqrt(u/(m+r))*(1-(r-n.p)/(2*(m+r)))]}let c=(q-1)/(2*q);return[2*l/(q-1)*((r/n.p)**c-1),1/(n.r*l)*(r/n.p)**(-(q+1)/(2*q))]},o=.5*(t.p+e.p);for(let r=0;r<40;r++){let[n,l]=a(o,t),[c,u]=a(o,e);o=Math.max(1e-8,o-(n+c+e.u-t.u)/(l+u))}let i=.5*(t.u+e.u)+.5*(a(o,e)[0]-a(o,t)[0]);return{p:o,u:i}}var Pe=(()=>{let t={r:1,u:0,p:1},e={r:.125,u:0,p:.1},{p:a,u:o}=Ea(t,e),i=Math.sqrt(q*t.p/t.r),r=Math.sqrt(q*e.p/e.r);return{L:t,R:e,p:a,u:o,aL:i,rL:t.r*(a/t.p)**(1/q),rR:e.r*((a/e.p+(q-1)/(q+1))/((q-1)/(q+1)*(a/e.p)+1)),shock:r*Math.sqrt((q+1)/(2*q)*(a/e.p)+(q-1)/(2*q)),tail:o-i*(a/t.p)**((q-1)/(2*q))}})();function Ra(t){let e=Pe;if(t<-e.aL)return e.L.r;if(t<e.tail){let a=2/(q+1)*(e.aL+t);return e.L.r*((e.aL-(q-1)/2*a)/e.aL)**(2/(q-1))}return t<e.u?e.rL:t<e.shock?e.rR:e.R.r}async function it(t,{nx:e=400}={}){let o=be(t,{nx:e,ny:4});o.setMask(new Uint8Array(e*4)),o.setFlow({mode:"ns",M:0,mu:0,inflow:[1,0,0,1],dtMax:.1});let i=new Float32Array(e*4*4);for(let h=0;h<4;h++)for(let M=0;M<e;M++){let L=M<e/2,$=(h*e+M)*4;i[$]=L?1:.125,i[$+3]=L?1:.1}o.load(i);let r=.2*e;for(;o.time<r-1e-9;)o.setFlow({dtMax:Math.min(.1,r-o.time)}),o.step(1),o.steps%100===0&&await Xt();o.macro();let n=o.read();if(o.dispose(),!n)return null;let l=[],c=[],u=[],m=0,d=0;for(let h=0;h<e;h++){let M=(h+.5-e/2)/r,L=n[(e+h)*4],$=Ra(M);l.push((h+.5)/e),c.push(L),u.push($),m+=Math.abs(L-$)/e,L>(Pe.rR+Pe.R.r)/2&&(d=h)}let v=e/2+Pe.shock*r;return{x:l,sim:c,exact:u,l1:m,shock:d+1,shockExact:v}}function We(t,e){let a=Math.tan(e*Math.PI/180),o=u=>2/Math.tan(u)*((t*t*Math.sin(u)**2-1)/(t*t*(q+Math.cos(2*u))+2)),i=Math.asin(1/t),r=i,n=-1/0;for(let u=i;u<Math.PI/2;u+=5e-4){let m=o(u);m>n&&(n=m,r=u)}if(n<a)return null;let l=i,c=r;for(let u=0;u<60;u++){let m=(l+c)/2;o(m)<a?l=m:c=m}return(l+c)/2*(180/Math.PI)}function Zt(t,e){let a=e*Math.PI/180,o=2/Math.tan(a)*((t*t*Math.sin(a)**2-1)/(t*t*(q+Math.cos(2*a))+2));return Math.atan(o)*180/Math.PI}var st=(t,e)=>{let a=(t*Math.sin(e*Math.PI/180))**2;return(q+1)*a/((q-1)*a+2)};function lt(t,e,a,o,i,r,n){let l=(g,x)=>t[(x*e+g)*4],c=[],u=g=>typeof r=="function"?r(g):r;for(let g=o;g<=i;g+=5)for(let x=a-8;x>u(g);x--)if(l(g,x)>n){c.push([g+.5,x+.5+(l(g,x)-n)/(l(g,x)-l(g,x+1))]);break}let m=c.length,d=c.reduce((g,x)=>g+x[0],0),v=c.reduce((g,x)=>g+x[1],0),h=c.reduce((g,x)=>g+x[0]*x[0],0),M=c.reduce((g,x)=>g+x[0]*x[1],0),L=(m*M-d*v)/(m*h-d*d),$=(v-L*d)/m,P=Math.round((o+i)/2),E=Math.round((u(P)+L*(P+.5)+$)/2);return{angle:Math.atan(L)*180/Math.PI,n:m,rho2:E>0&&E<a?l(P,E):NaN}}async function ct(t,{M:e=2,theta:a=10}={}){let o=We(e,a);if(!o)return null;let i=260,r=170,n=be(t,{nx:i,ny:r}),l=20,c=30,u=new Uint8Array(i*r);for(let E=l-4;E<l;E++)for(let g=c;g<i;g++)u[E*i+g]=1;n.setMask(u,i-c),n.setFlow({mode:"ns",M:e,mu:0,tilt:-a*Math.PI/180}),n.reset();let m=Math.tan((o-a)*Math.PI/180),d=Math.min(i-c-10,(r-l-14)/m),v=Math.round(c+.4*d),h=Math.round(c+.9*d),M=2*i/(e*Math.cos(a*Math.PI/180));for(;n.time<M;)n.step(50),n.macro(),n.read(0,0,1,1),await Xt();n.macro();let L=n.read();if(n.dispose(),!L)return null;let $=st(e,o),P=lt(L,i,r,v,h,l,(1+$)/2);return{M:e,theta:a,beta:o,measured:P.angle+a,points:P.n,rho2:$,rho2Measured:P.rho2}}var S=t=>document.getElementById(t),w=(t,e=0)=>Number(t).toLocaleString("es-ES",{minimumFractionDigits:e,maximumFractionDigits:e}),pt=t=>{var e;return((e=window.mw54i18n)==null?void 0:e.t(t))??t};addEventListener("mw54:lang",()=>{try{fa()}catch{}});var Re=(t,e,a)=>{let o=Math.min(1,Math.max(0,(a-t)/(e-t)));return o*o*(3-2*o)},ea=9.80665,Se={hawk:{name:"Hawk 1:7 con MW54",glb:"../assets/mw54.glb",S:.34,m:7.5,AR:5.3,e:.8,cd0:.03,peak:1,sup:1,maxM:.3,step:.005,engines:1,thrust:()=>.054,h:()=>.1,note:"Una maqueta de 2 m vuela a menos de 300 km/h: el aire es incompresible y la resistencia la ponen el roce y la que induce la sustentaci\xF3n."},sr71:{name:"SR-71 Blackbird",glb:"../sr71/sr71.glb",S:167,m:5e4,AR:1.7,e:.7,cd0:.011,peak:2.4,sup:1.55,maxM:3.3,engines:2,thrust:t=>ot(t,1).thrust,h:t=>ot(t,1).h,note:"Ala en delta muy fina y aristas a lo largo del morro: a Mach 3,2 el cono de Mach se cierra a 18\xB0 y la temperatura de remanso pasa de 400 \xB0C."},f22:{name:"F-22 Raptor",glb:"../f22/f22.glb",S:78,m:29e3,AR:2.4,e:.75,cd0:.016,peak:2.3,sup:1.6,maxM:2.25,engines:2,thrust:t=>at(t,1).thrust,h:t=>at(t,1).h,note:"Ala en diamante de 42\xB0 de flecha: vuela en supercrucero, a Mach 1,5 o m\xE1s sin postquemador."},f14:{name:"F-14 Tomcat",glb:"../f14/f14.glb",S:52.5,m:27e3,AR:7.3,e:.8,cd0:.02,peak:2.5,sup:1.7,maxM:2.34,engines:2,thrust:t=>ze(t,1).thrust,h:t=>ze(t,1).h,sweep:t=>ze(t,1).sweep,note:"El ala barre de 20\xB0 a 68\xB0: abierta da alargamiento para despegar de un portaaviones; cerrada esconde el ala dentro del cono de Mach."},sr72:{name:"SR-72 (concepto)",glb:"../sr72/sr72.glb",S:90,m:35e3,AR:1.3,e:.65,cd0:.01,peak:2.2,sup:1.4,maxM:6,engines:2,thrust:t=>tt(t,1).thrust,h:t=>tt(t,1).h,note:"Cuerpo sustentador en punta de flecha: por encima de Mach 5 el choque se pega al cuerpo y el aire se calienta tanto que la qu\xEDmica del aire empieza a contar."}};function Ta(t){let e,a;t<11?(e=288.15-6.5*t,a=101325*(e/288.15)**5.2559):t<20?(e=216.65,a=22632*Math.exp(-ea*(t-11)*1e3/(287.05*e))):(e=216.65+(t-20),a=5474.9*(e/216.65)**-34.163);let o=a/(287.05*e);return{T:e,p:a,rho:o,a:Math.sqrt(1.4*287.05*e),mu:1458e-9*e**1.5/(e+110.4)}}function qa(t,e){let a=e<.8?1:e<1.05?1+(t.peak-1)*Re(.8,1.05,e):t.sup+(t.peak-t.sup)*Math.exp(-(e-1.05)*1.6),o=t.AR;t.sweep&&(o=t.AR*(Math.cos(t.sweep(e)*Math.PI/180)/Math.cos(20*Math.PI/180))**2);let i=1/(Math.PI*t.e*o),r=e<1?i:Math.max(i,Math.sqrt(e*e-1)/4);return{cd0:t.cd0*a,K:r,AR:o}}function ht(t,e){let a=t.h(e),o=Ta(a),i=Math.max(e,.02)*o.a,r=.5*o.rho*i*i,l=t.m*ea/(r*t.S),{cd0:c,K:u,AR:m}=qa(t,e),d=c+u*l*l,v=r*t.S*d,h=t.engines*t.thrust(e)*1e3,M=t.S**.5*2.2;return{h:a,air:o,V:i,q:r,CL:l,CD:d,cd0:c,Di:r*t.S*u*l*l,D:v,LD:l/d,thrust:h,AR:m,T0:o.T*(1+.2*e*e),Re:o.rho*i*M/o.mu,mu:e>1?Math.asin(1/e):null}}function ka(t){return t<.3?["Incompresible","El aire apenas cambia de densidad: se aparta antes de llegar y rodea el avi\xF3n."]:t<.8?["Subs\xF3nico","El aire se comprime un poco; las perturbaciones viajan por delante del avi\xF3n y el flujo se prepara para pasar."]:t<1.2?["Trans\xF3nico","Sobre el ala ya hay zonas supers\xF3nicas que acaban en choques: la resistencia de onda sube de golpe."]:t<5?["Supers\xF3nico","El aire de delante no sabe que llega el avi\xF3n: lo cruza el cono de Mach y ah\xED se comprime y se calienta de golpe."]:["Hipers\xF3nico","El choque se pega al cuerpo y la capa de aire comprimido es tan caliente que el calor manda sobre la forma."]}var B=new Bt({antialias:!0,powerPreference:"high-performance"});B.setPixelRatio(Math.min(devicePixelRatio,2));B.outputColorSpace=Et;B.toneMapping=yt;S("view").appendChild(B.domElement);_t(B);var X=new Me;X.background=new se(855826);X.environment=new Ut(B).fromScene(new Gt,.04).texture;X.environmentIntensity=.7;var ta=new $t(16777215,2.2);ta.position.set(30,50,20);X.add(ta,new Dt(12374783,2762274,.5));var ne=new Lt(32,1,.01,2e3),he=new jt(ne,B.domElement);he.enableDamping=!0;var De=null,aa=new St({transparent:!0,depthWrite:!1,side:Ae,blending:Qe,uniforms:{uColor:{value:new se(16751184)},uAlpha:{value:0}},vertexShader:"varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = uv.y; vec4 p = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }",fragmentShader:"uniform vec3 uColor; uniform float uAlpha; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(1. - abs(dot(vN, vV)), 2.); float fade = smoothstep(0., .25, vT) * smoothstep(1., .55, vT); gl_FragColor = vec4(uColor * (0.25 + 1.4 * rim), uAlpha * (0.25 + rim) * fade); }"}),ft=new Ce(new zt(1,1,96,1,!0),aa),Be=new Ht;Be.add(ft);X.add(Be);var je=matchMedia("(max-width: 760px)").matches,Oe=je?900:2200,qe=6,ke=new kt,Ne=new Float32Array(Oe*qe*2*3),$e=new Float32Array(Oe*qe*2*3);ke.setAttribute("position",new Je(Ne,3));ke.setAttribute("color",new Je($e,3));var oa=new Ft(ke,new Ct({vertexColors:!0,transparent:!0,opacity:.85,depthWrite:!1,blending:Qe}));oa.frustumCulled=!1;X.add(oa);var Sa=Array.from({length:Oe},()=>[Math.random(),Math.random()*2-1,Math.random()*2-1]),ue=null,k=null,de=null,me=72;function Aa(t,e){let a=new Float32Array(me),o=new Float32Array(me),i=(e.min.y+e.max.y)/2,r=(e.min.z+e.max.z)/2,n=e.max.x-e.min.x,l=new oe;t.traverse(u=>{if(!u.isMesh)return;let m=u.geometry.attributes.position,d=Math.max(1,Math.floor(m.count/6e3));for(let v=0;v<m.count;v+=d){l.fromBufferAttribute(m,v).applyMatrix4(u.matrixWorld);let h=Math.min(me-1,Math.max(0,Math.floor((l.x-e.min.x)/n*me)));a[h]=Math.max(a[h],Math.abs(l.y-i)),o[h]=Math.max(o[h],Math.abs(l.z-r))}});let c=u=>{let m=u.map((d,v)=>Math.max(...u.slice(Math.max(0,v-2),v+3)));return m.map((d,v)=>{let h=m.slice(Math.max(0,v-4),v+5);return h.reduce((M,L)=>M+L,0)/h.length})};return{hy:c(a),hz:c(o),cy:i,cz:r}}var C=0,pe={},ut=new se(8368895),Yt=new se(16777215),La=new se(16747068);async function na(t){let e=Se[t];if(document.querySelectorAll("[data-plane]").forEach(l=>l.toggleAttribute("aria-pressed",l.dataset.plane===t)),ue&&X.remove(pe[ue]),S("loading").hidden=!1,!pe[t]){let l=await Ot(e.glb,"../assets/draco/");l.scene.traverse(c=>{!c.isMesh||!(c.material.transmission>0)||(c.material.opacity=Math.min(c.material.opacity,1-.55*c.material.transmission),c.material.transmission=0,Object.assign(c.material,{transparent:!0,depthWrite:!1}))}),l.scene.traverse(c=>{/^tren/.test(c.name)&&(c.visible=!1)}),pe[t]=l.scene}ue=t;let a=pe[t];X.add(a),a.updateMatrixWorld(!0),k=new Tt().setFromObject(a),de=Aa(a,k);let i=k.getSize(new oe).x;De&&X.remove(De.fill,De.rim),De=Vt(X,i),await Qt(B,X,ne,{ready:Promise.resolve(),target:null}),S("loading").hidden=!0,ne.near=i/200,ne.far=i*60,ne.updateProjectionMatrix();let r=k.getCenter(new oe);he.target.copy(r),ne.position.copy(r).add(new oe(-1.1,.55,1.25).multiplyScalar(i*1.25)),he.minDistance=i*.6,he.maxDistance=i*6;let n=S("mach");n.max=e.maxM,n.step=e.step??.01,vt(Math.min(e.maxM,t==="hawk"?.15:Math.max(.85,e.maxM*.8))),fa(),ce==="tunel"&&Ge(!0)}function vt(t){C=Number(t),S("mach").value=C,Ha()}function Ha(){let t=Se[ue],e=ht(t,C),[a,o]=ka(C);S("regime").innerHTML=`<b>${a}</b> \xB7 ${o}`,S("machOut").textContent=w(C,C<1?2:1);let i=[["Altitud",`${w(e.h,(e.h<1,1))} km`],["Velocidad",`${w(e.V*3.6)} km/h`],["Sonido a esa altura",`${w(e.air.a)} m/s \xB7 ${w(e.air.T-273.15)} \xB0C`],["Densidad del aire",`${w(e.air.rho,3)} kg/m\xB3`],["Presi\xF3n din\xE1mica",`${w(e.q/1e3,1)} kPa`],["Temperatura de remanso",`${w(e.T0-273.15)} \xB0C`],["Cono de Mach",e.mu?`${w(e.mu*180/Math.PI,1)}\xB0 de semi\xE1ngulo`:"no hay: subs\xF3nico"],["Reynolds",`${(e.Re/1e6).toLocaleString("es-ES",{maximumFractionDigits:e.Re>1e7?0:1})} millones`],["CL para vuelo nivelado",w(e.CL,3)],["CD (forma + onda / inducida)",`${w(e.cd0,4)} / ${w(e.CD-e.cd0,4)}`],["Finura L/D",w(e.LD,1)],["Resistencia",e.D>2e3?`${w(e.D/1e3,1)} kN`:`${w(e.D,1)} N`],["Empuje disponible",e.thrust>2e3?`${w(e.thrust/1e3,1)} kN`:`${w(e.thrust,1)} N`]];t.sweep&&i.splice(8,0,["Flecha del ala",`${w(t.sweep(C))}\xB0 \xB7 alargamiento ${w(e.AR,1)}`]),S("data").innerHTML=i.map(([n,l])=>`<dt>${n}</dt><dd>${l}</dd>`).join(""),S("note").textContent=t.note;let r=e.thrust-e.D;if(S("verdict").innerHTML=e.CL>1.4?"<b>Demasiado lento:</b> el ala no da la sustentaci\xF3n que pide el peso.":r<0?`<b>No llega:</b> le faltan ${e.D-e.thrust>2e3?w((e.D-e.thrust)/1e3,1)+" kN":w(e.D-e.thrust,1)+" N"} de empuje para sostener este Mach.`:`<b>Vuela:</b> le sobran ${r>2e3?w(r/1e3,1)+" kN":w(r,1)+" N"} de empuje para acelerar o subir.`,k){let l=(k.max.x-k.min.x)*1.6,c=e.mu??0;aa.uniforms.uAlpha.value=e.mu?.3:0,ft.scale.set(Math.tan(c)*l,l,Math.tan(c)*l),ft.position.set(0,-l/2,0),Be.position.set(k.max.x,(k.min.y+k.max.y)/2,(k.min.z+k.max.z)/2),Be.rotation.set(0,0,-Math.PI/2)}wt(),ce==="tunel"&&(sa(),la())}var ra=je?{nx:256,ny:128}:{nx:384,ny:192},ce="3d",D=null,ia="perfil",ve=0,dt=4,Ie=0,Ca=0,Ee=new He;function sa(){let t=D.flow.chord;if(C<.3){let a=Math.max(.515,.5+.24*t/1200);D.setFlow({mode:"lbm",M:C,U:.08,tau:a,cs:.15}),Ie=.08*t/((a-.5)/3)}else Ie=5e3,D.setFlow({mode:"ns",M:C,mu:C*t/Ie})}function la(){let t=D.flow.mode==="ns",e=S("field3");e.textContent=t?"Choques":"Remolinos",e.dataset.field=t?"3":"2",ve>=2&&(ve=t?3:2),document.querySelectorAll("[data-field]").forEach(a=>a.toggleAttribute("aria-pressed",Number(a.dataset.field)===ve))}function Ge(t){if(!D||!ue)return;let{mask:e,chord:a,scale:o}=rt(B,pe[ue],k,{...ra,alpha:dt,cut:ia});D.setMask(e,a,o),sa(),t&&D.reset(),la()}var Fa=["<b>Velocidad</b> \xB7 azul, m\xE1s lento que el aire libre; oscuro, igual; naranja, m\xE1s r\xE1pido.","<b>Presi\xF3n</b> (Cp) \xB7 naranja, el aire se frena y aprieta; azul, succi\xF3n. La diferencia entre arriba y abajo es la sustentaci\xF3n.","<b>Remolinos</b> (vorticidad) \xB7 el aire que gira: la capa l\xEDmite que se despega y la estela que deja el avi\xF3n.","<b>Choques</b> (schlieren num\xE9rico) \xB7 donde la densidad cambia de golpe: el choque del morro y los choques oblicuos donde la superficie se mete en el aire, y los abanicos de expansi\xF3n de Prandtl-Meyer, m\xE1s difusos, donde se aparta."];function xt(){let t=D.forces(),e=ht(Se[ue],C),a=D.flow.mode==="ns",o=D.time*(a?C:D.flow.U)/D.flow.chord;S("tunnelInfo").innerHTML=`${Fa[ve]} Corte 2D: es como un ala (o un fuselaje) infinitamente ancha con esta forma; las puntas y el flujo de un lado a otro no est\xE1n.${a?" La superficie corta las celdas de la malla como corta la forma real (celdas cortadas), as\xED que los choques salen con el \xE1ngulo de la forma lisa.":""}`;let i=[["M\xE9todo",a?"Navier-Stokes compresible \xB7 vol\xFAmenes finitos HLL":"Navier-Stokes incompresible \xB7 Lattice Boltzmann D2Q9"],["Malla",`${D.nx} \xD7 ${D.ny} celdas \xB7 cuerda de ${D.flow.chord}`],["Reynolds del t\xFAnel",`${w(Ie)} (el avi\xF3n real: ${w(e.Re/1e6)} millones)`],["Tiempo simulado",`${w(o,1)} cuerdas recorridas`]];if(t&&i.push(["Cl / Cd del corte (por presi\xF3n)",`${w(t.cl,2)} / ${w(t.cd,3)}`]),a&&C>1){let r=We(C,10);i.push(["Ondas de Mach (\u03BC = asen 1/M)",`${w(Math.asin(1/C)*180/Math.PI,1)}\xB0`]),i.push(["Choque que desv\xEDa 10\xB0 (\u03B8-\u03B2-M)",r?`\u03B2 = ${w(r,1)}\xB0 \xB7 densidad \xD7 ${w(st(C,r),2)}`:"se separa: choque curvo delante"])}S("tunnelData").innerHTML=i.map(([r,n])=>`<dt>${r}</dt><dd>${n}</dd>`).join("")}var Ue=!1;function ca(t){let e=Math.min(devicePixelRatio,2);t.width=t.clientWidth*e,t.height=t.clientHeight*e;let a=t.getContext("2d");return a.setTransform(e,0,0,e,0,0),a.clearRect(0,0,t.clientWidth,t.clientHeight),a.font="10px ui-monospace, Menlo, monospace",[a,t.clientWidth,t.clientHeight]}function za(t){let[e,a,o]=ca(S("sodChart")),i=n=>8+n*(a-16),r=n=>o-18-n/1.05*(o-30);e.strokeStyle="#ff8a3c",e.lineWidth=1.5,e.beginPath(),t.x.forEach((n,l)=>l?e.lineTo(i(n),r(t.exact[l])):e.moveTo(i(n),r(t.exact[l]))),e.stroke(),e.fillStyle="#7fb2ff",t.x.forEach((n,l)=>{l%4===0&&e.fillRect(i(n)-1,r(t.sim[l])-1,2.2,2.2)}),e.fillStyle="#8b939c",e.fillText(pt("Sod \xB7 densidad en t = 0,2"),8,12),e.fillText("x 0",8,o-4),e.fillText("1",a-14,o-4)}function Pa(t,e){let[a,o,i]=ca(S("betaChart")),r=Math.asin(1/t)*180/Math.PI,n=[];for(let d=r;d<=90;d+=.25)n.push([Zt(t,d),d]);let l=Math.max(...n.map(d=>d[0]))*1.08,c=d=>8+d/l*(o-16),u=d=>i-18-(d-r)/(90-r)*(i-30);a.strokeStyle="#ffffff55",a.lineWidth=1.2,a.beginPath(),n.forEach(([d,v],h)=>h?a.lineTo(c(d),u(v)):a.moveTo(c(d),u(v))),a.stroke();let m=(d,v,h,M)=>{a.beginPath(),a.arc(c(d),u(v),M?5:3,0,Math.PI*2),M?(a.strokeStyle=h,a.lineWidth=1.5,a.stroke()):(a.fillStyle=h,a.fill())};m(e.theta,e.beta,"#ff8a3c",!0),m(e.theta,e.measured,"#7fb2ff",!1),a.fillStyle="#8b939c",a.fillText(pt(`\u03B8-\u03B2-M a Mach ${w(t,1)} \xB7 \u03B2 seg\xFAn \u03B8`),8,12),a.fillText("\u03B8 0",8,i-4),a.fillText(`${w(l,0)}\xB0`,o-24,i-4)}async function Wa(){if(Ue)return;Ue=!0;let t=S("checkRun");t.disabled=!0,S("checkOut").textContent="Corriendo el tubo de Sod\u2026";try{let e=await it(B);if(!e){S("checkOut").textContent="Esta GPU no deja leer texturas de coma flotante: no se puede comparar.";return}za(e);let a=C>=1.5&&C<=6?C:2;S("checkOut").textContent=`Corriendo el choque oblicuo a Mach ${w(a,1)}\u2026`;let o=await ct(B,{M:a,theta:10});Pa(a,o),S("checkOut").innerHTML=`<b>Sod:</b> error medio de densidad ${w(e.l1*100,2)} % \xB7 choque en ${w(e.shock/e.x.length,3)} (exacto ${w(e.shockExact/e.x.length,3)}).<br><b>Choque oblicuo a Mach ${w(a,1)}:</b> \u03B2 medido ${w(o.measured,1)}\xB0 frente a ${w(o.beta,1)}\xB0 de la teor\xEDa; densidad \xD7 ${w(o.rho2Measured,3)} frente a \xD7 ${w(o.rho2,3)}.`}finally{Ue=!1,t.disabled=!1}}function ua(t){t==="tunel"&&!D&&(D=be(B,ra)),ce=t,document.querySelectorAll("[data-view]").forEach(e=>e.toggleAttribute("aria-pressed",e.dataset.view===ce)),S("tunnel").hidden=ce!=="tunel",he.enabled=ce==="3d",ce==="tunel"&&(Ge(!0),xt())}nt(B)?(document.querySelectorAll("[data-view]").forEach(t=>t.addEventListener("click",()=>ua(t.dataset.view))),document.querySelectorAll("[data-cut]").forEach(t=>t.addEventListener("click",()=>{ia=t.dataset.cut,document.querySelectorAll("[data-cut]").forEach(e=>e.toggleAttribute("aria-pressed",e===t)),Ge(!0)})),document.querySelectorAll("[data-field]").forEach(t=>t.addEventListener("click",()=>{ve=Number(t.dataset.field),document.querySelectorAll("[data-field]").forEach(e=>e.toggleAttribute("aria-pressed",e===t)),xt()})),S("alpha").addEventListener("input",t=>{dt=Number(t.target.value),S("alphaOut").textContent=`${dt}\xB0`,Ge(!1)}),S("checkRun").addEventListener("click",Wa)):document.querySelector(".views").hidden=!0;new URLSearchParams(location.search).has("prueba")&&(window.__tunel={createTunnel:be,silhouette:rt,checkSod:it,checkOblique:ct,obliqueBeta:We,shockFit:lt,renderer:B,THREE:et,model:()=>pe[ue],box:()=>k});function Da(){Ue||D.step(D.flow.mode==="ns"?je?3:6:je?6:12),D.macro(),B.getDrawingBufferSize(Ee);let t=D.nx/D.ny,e=Math.min(Ee.x,Ee.y*t),a=e/t;D.render(ve,[(Ee.x-e)/2,(Ee.y-a)/2,e,a]),++Ca%40===0&&xt()}function Na(t){if(!k)return;let e=k.max.x-k.min.x,a=k.max.z-k.min.z,o=(k.min.y+k.max.y)/2,i=(k.min.z+k.max.z)/2,r=k.max.x+e*.6,n=k.min.x-e*1.2,l=Math.max(a,e*.5)*.75,c=C>1?Math.tan(Math.asin(1/C)):0,u=e*(.25+.35*Math.min(C,3)),m=e*.025*(1+Math.min(C,3)*.3),d=new se;for(let v=0;v<Oe;v++){let[h,M,L]=Sa[v],$=o+M*l*.55,P=i+L*l,E=r-((h*(r-n)+t*u)%(r-n)+(r-n))%(r-n);for(let g=0;g<qe;g++)for(let x=0;x<2;x++){let U=E+(g+x)*m,N=k.max.x-U,re=Math.hypot($-o,P-i),O=C>1?N>0&&re<N*c:!0,s=$,H=P,b=0;if(O&&de){let Z=(U-k.min.x)/e*me-.5,Y=Math.floor(Z),J=Z-Y,Q=(te,ee)=>ee<0||ee>=me?0:te[ee],j=Re(-e*.25,0,U-k.min.x)*Re(e*.15,0,U-k.max.x),_=(Q(de.hy,Y)*(1-J)+Q(de.hy,Y+1)*J+e*.012)*j,K=(Q(de.hz,Y)*(1-J)+Q(de.hz,Y+1)*J+e*.012)*j;if(_>1e-6&&K>1e-6){let te=$-o,ee=P-i,xe=Math.max(.001,Math.hypot(te/_,ee/K)),we=Math.sqrt(xe*xe+1)/xe;s=o+te*we,H=i+ee*we,b=Math.min(1,(we-1)*2.2)}}let F=((v*qe+g)*2+x)*3;Ne[F]=U,Ne[F+1]=s,Ne[F+2]=H;let I=(1-g/qe)*Re(n,n+e*.4,U)*Re(r,r-e*.3,U);C>1?d.copy(O?La:ut).lerp(Yt,O?b*.5:0):d.copy(ut).lerp(b>.35?Yt:ut,Math.min(1,b*1.4)),$e[F]=d.r*I,$e[F+1]=d.g*I,$e[F+2]=d.b*I}}ke.attributes.position.needsUpdate=!0,ke.attributes.color.needsUpdate=!0}var Te=S("chart"),A=Te.getContext("2d"),le=null;function fa(){let t=Se[ue],e=120,a=Array.from({length:e+1},(o,i)=>{let r=Math.max(t.maxM*.08,t.maxM*i/e),n=ht(t,r);return[r,Math.min(n.LD,25),n.D]});le={pts:a,maxLD:Math.max(...a.map(o=>o[1]))*1.1,maxD:Math.max(...a.map(o=>o[2]))*1.1,maxM:t.maxM},wt()}function wt(){if(!le)return;let t=Math.min(devicePixelRatio,2),e=Te.clientWidth,a=Te.clientHeight;Te.width=e*t,Te.height=a*t,A.setTransform(t,0,0,t,0,0),A.clearRect(0,0,e,a);let o=r=>8+(e-16)*r/le.maxM,i=(r,n,l)=>{A.beginPath(),le.pts.forEach(([c,u,m],d)=>{let v=r===1?u:m,h=a-18-(a-30)*v/n;d?A.lineTo(o(c),h):A.moveTo(o(c),h)}),A.strokeStyle=l,A.lineWidth=1.6,A.stroke()};A.strokeStyle="#ffffff14",A.beginPath(),A.moveTo(8,a-18),A.lineTo(e-8,a-18),A.stroke(),le.maxM>1&&(A.setLineDash([3,3]),A.beginPath(),A.moveTo(o(1),6),A.lineTo(o(1),a-18),A.stroke(),A.setLineDash([])),i(1,le.maxLD,"#7fb2ff"),i(2,le.maxD,"#ff8a3c"),A.fillStyle="#e9ecef",A.beginPath(),A.arc(o(C),a-18,3.5,0,Math.PI*2),A.fill(),A.font="10px ui-monospace, Menlo, monospace",A.fillStyle="#8b939c",A.fillText("Mach 0",8,a-4),A.fillText(pt(w(le.maxM,1)),e-30,a-4),le.maxM>1&&A.fillText("1",o(1)-3,a-4)}function gt(){let t=S("view"),e=t.clientWidth,a=t.clientHeight;B.setSize(e,a),ne.aspect=e/a,ne.updateProjectionMatrix(),wt(),ce==="3d"&&B.render(X,ne)}addEventListener("resize",gt);visualViewport==null||visualViewport.addEventListener("resize",gt);document.querySelectorAll("[data-plane]").forEach(t=>t.addEventListener("click",()=>na(t.dataset.plane)));S("mach").addEventListener("input",t=>vt(t.target.value));var $a=new It;function da(){if(ce==="tunel")Da();else{let t=$a.getElapsedTime();Na(t),he.update(),B.render(X,ne)}requestAnimationFrame(da)}gt();var Jt=new URLSearchParams(location.search).get("avion");await na(Se[Jt]?Jt:"sr71");var mt=new URLSearchParams(location.search);mt.has("mach")&&vt(Math.min(Number(S("mach").max),Math.max(Number(S("mach").min),Number(mt.get("mach")))));mt.get("vista")==="tunel"&&nt(B)&&ua("tunel");da();
