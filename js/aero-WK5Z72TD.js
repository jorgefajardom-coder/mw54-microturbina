import{b as at}from"./chunks/chunk-BRJNBZFH.js";import{b as ot}from"./chunks/chunk-RN5XWJKH.js";import{b as De}from"./chunks/chunk-424HQSPG.js";import{b as nt}from"./chunks/chunk-2ADPM7RW.js";import{a as _t,b as Vt,c as Qt,d as Kt,e as Xt,i as Zt}from"./chunks/chunk-N3CD2LUC.js";import{$ as Ye,Ba as We,E as Xe,F as Ze,G as Rt,Ga as Wt,I as Ce,Ia as Dt,K as Tt,Q as qt,Qa as Pt,T as kt,Ta as Nt,V as ze,Va as $t,X as oe,_ as Je,aa as At,f as Le,fa as se,h as Ke,ha as St,hb as It,ja as et,kb as Ut,la as Ht,lb as Bt,ma as Fe,ob as jt,pa as Lt,qa as Ct,ra as zt,t as Et,tb as Gt,ua as Ft,ub as Ot,vb as tt,wa as Ee,y as be}from"./chunks/chunk-V5OSS73Z.js";import"./chunks/chunk-VC46IEJQ.js";var ha="in vec3 position; void main() { gl_Position = vec4(position.xy, 0., 1.); }",va=`precision highp float; precision highp int;
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
}`,xa=`precision highp float; precision highp int;
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
}`,wa=`precision highp float; precision highp int;
uniform sampler2D Q, Q0, MASK, NORM;
uniform ivec2 N;
uniform float dt, mu, kap, ca, cb;
uniform vec4 Winf;
uniform bool init;
out vec4 o;
const float G = 1.4;
vec4 prim(vec4 q) { float r = max(q.x, 1e-4); vec2 u = q.yz / r; return vec4(r, u, max((G - 1.) * (q.w - .5 * r * dot(u, u)), 1e-6)); }
vec4 cons(vec4 w) { return vec4(w.x, w.x * w.yz, w.w / (G - 1.) + .5 * w.x * dot(w.yz, w.yz)); }
bool solid(ivec2 p) { if (any(lessThan(p, ivec2(0))) || any(greaterThanEqual(p, N))) return false; return texelFetch(MASK, p, 0).r > .5; }
// fuera de la malla: aire libre que entra por la izquierda; en los otros bordes, el valor de la celda del borde
vec4 W(ivec2 p) { if (p.x < 0) return Winf; return prim(texelFetch(Q, clamp(p, ivec2(0), N - 1), 0)); }
// celda fantasma de una pared para las pendientes: la misma celda con la velocidad normal a la cara invertida
vec4 ghost(vec4 w, ivec2 e) { if (e.x != 0) w.y = -w.y; else w.z = -w.z; return w; }
// flujo por la cara de una pared: no pasa masa ni energ\xEDa, s\xF3lo la presi\xF3n de la pared. Esa presi\xF3n sale del problema de
// Riemann contra la superficie con la velocidad normal a la forma suavizada, no a la cara del escal\xF3n de la malla: si el
// aire corre a lo largo de la superficie empuja cada escal\xF3n con la presi\xF3n local, y escalones y pelda\xF1os suman la fuerza
// de la pared inclinada; contra cada escal\xF3n se frenar\xEDa de golpe y llenar\xEDa la pared de choques falsos
vec4 wallFlux(vec4 w, ivec2 e, ivec2 s) {
  vec2 n = texelFetch(NORM, s, 0).xy * 2. - 1.;
  n = dot(n, n) < .25 ? -vec2(e) : normalize(n);
  float un = -dot(w.yz, n);   // velocidad hacia la pared
  float a = sqrt(G * w.w / w.x), ps;
  // compresi\xF3n: choque reflejado (p* \u2212 p = \u03C1 un W); expansi\xF3n: onda de rarefacci\xF3n isentr\xF3pica
  if (un > 0.) { float k = (G + 1.) / 4. * un; ps = w.w + w.x * un * (k + sqrt(k * k + a * a)); }
  else ps = w.w * pow(max(1. + .5 * (G - 1.) * un / a, 0.), 2. * G / (G - 1.));
  return vec4(0., ps * vec2(e), 0.);
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
// diferencia de flujos en una direcci\xF3n: MUSCL de segundo orden, de primer orden junto a una pared
vec4 divDir(ivec2 p, ivec2 e, vec4 w0) {
  vec2 n = vec2(e);
  bool sp1 = solid(p + e), sm1 = solid(p - e);
  vec4 wp1 = sp1 ? ghost(w0, e) : W(p + e);
  vec4 wm1 = sm1 ? ghost(w0, e) : W(p - e);
  bool sp2 = sp1 || solid(p + 2 * e), sm2 = sm1 || solid(p - 2 * e);
  vec4 wp2 = sp2 ? wp1 : W(p + 2 * e);
  vec4 wm2 = sm2 ? wm1 : W(p - 2 * e);
  vec4 s0 = (sp1 || sm1) ? vec4(0.) : mm(w0 - wm1, wp1 - w0);
  vec4 sp = sp1 ? vec4(0.) : mm(wp1 - w0, wp2 - wp1);
  vec4 sm = sm1 ? vec4(0.) : mm(wm1 - wm2, w0 - wm1);
  vec4 Fr = sp1 ? wallFlux(w0, e, p + e) : hll(safe(w0 + .5 * s0, w0), safe(wp1 - .5 * sp, wp1), n);
  vec4 Fl = sm1 ? wallFlux(w0, e, p - e) : hll(safe(wm1 + .5 * sm, wm1), safe(w0 - .5 * s0, w0), n);
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
  if (solid(p)) { o = q0; return; }
  vec4 w0 = W(p);
  vec4 L = -divDir(p, ivec2(1, 0), w0) - divDir(p, ivec2(0, 1), w0);
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
}`,ya=`precision highp float; precision highp int;
uniform sampler2D Q;
out vec4 o;
void main() {
  vec4 q = texelFetch(Q, ivec2(gl_FragCoord.xy), 0);
  float r = max(q.x, 1e-4);
  vec2 u = q.yz / r;
  o = vec4(r, u, max(.4 * (q.w - .5 * r * dot(u, u)), 1e-6));
}`,ga=`precision highp float; precision highp int;
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
}`,Ma=`precision highp float; precision highp int;
uniform sampler2D S;
out vec4 o;
void main() {
  vec4 w = texelFetch(S, ivec2(gl_FragCoord.xy), 0);
  o = vec4(w.x, w.x * w.yz, w.w / .4 + .5 * w.x * dot(w.yz, w.yz));
}`,ve=(t,e)=>new $t({glslVersion:kt,vertexShader:ha,fragmentShader:t,uniforms:e,depthTest:!1,depthWrite:!1});function it(t){return t.capabilities.isWebGL2&&(t.extensions.has("EXT_color_buffer_float")||t.extensions.has("EXT_color_buffer_half_float"))}function Re(t,{nx:e,ny:a}){let o=t.extensions.has("EXT_color_buffer_float"),r=o?Ze:Rt,i=(y=1)=>new Ye(e,a,{count:y,type:r,format:Ce,minFilter:be,magFilter:be,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),n=new Uint8Array(e*a),s=new We(n,e,a,Tt,Xe);s.needsUpdate=!0;let c=new Uint8Array(e*a*4),u=new We(c,e,a,Ce,Xe);u.needsUpdate=!0;let p=new ze(e,a),l=new Fe(new Nt(2,2));l.frustumCulled=!1;let w=new Ee;w.add(l);let v=new Ct,M=[i(3),i(3)],g=[i(),i(),i()],W=i(),L=ve(va,{A:{value:null},B:{value:null},C:{value:null},MASK:{value:s},N:{value:p},tau:{value:.6},U:{value:.08},smag:{value:0},init:{value:!1},sponge:{value:!0}}),I=ve(xa,{A:{value:null},B:{value:null},C:{value:null},MASK:{value:s}}),m=ve(wa,{Q:{value:null},Q0:{value:null},MASK:{value:s},NORM:{value:u},N:{value:p},dt:{value:.05},mu:{value:0},kap:{value:0},ca:{value:0},cb:{value:1},Winf:{value:new Je(1,1,0,1/1.4)},init:{value:!1}}),b=ve(ya,{Q:{value:null}}),N=ve(ga,{F:{value:W.texture},MASK:{value:s},N:{value:p},box:{value:new Je},field:{value:0},pInf:{value:1/3},qInf:{value:1},uInf:{value:1},vScale:{value:1}}),h={mode:"lbm",M:.1,U:.08,tau:.6,cs:0,mu:0,chord:e*.38},J=0,U=0;function f(y,R){l.material=y;let E=t.getRenderTarget();t.setRenderTarget(R),t.render(w,v),t.setRenderTarget(E)}let F=(y,R)=>{y.uniforms.A.value=R.textures[0],y.uniforms.B.value=R.textures[1],y.uniforms.C.value=R.textures[2]};function S(){J=U=0,h.mode==="lbm"?(L.uniforms.init.value=!0,F(L,M[1]),f(L,M[0]),L.uniforms.init.value=!1):(m.uniforms.init.value=!0,m.uniforms.Q.value=m.uniforms.Q0.value=g[1].texture,f(m,g[0]),m.uniforms.init.value=!1),O()}function B(){let y=h.M,E=.45/(2*(Math.max(y+1,Math.sqrt(1+.2*y*y)+.5*y)*1.15));return h.mu>0&&(E=Math.min(E,.1/(h.mu*2))),Math.min(E,h.dtMax??1/0)}function j(y){let R=y.mode??h.mode,E=R!==h.mode;Object.assign(h,y,{mode:R}),L.uniforms.tau.value=h.tau,L.uniforms.U.value=h.U,L.uniforms.smag.value=18*h.cs*h.cs,L.uniforms.sponge.value=h.sponge??!0,h.inflow?m.uniforms.Winf.value.fromArray(h.inflow):m.uniforms.Winf.value.set(1,h.M*Math.cos(h.tilt??0),h.M*Math.sin(h.tilt??0),1/1.4),m.uniforms.mu.value=h.mu,m.uniforms.kap.value=h.mu/(.4*.72),E&&S()}function Y(y=1){for(let R=0;R<y;R++){if(h.mode==="lbm")F(L,M[0]),f(L,M[1]),M=[M[1],M[0]],U+=1;else{let E=B(),C=m.uniforms;C.dt.value=E,C.Q.value=C.Q0.value=g[0].texture,C.ca.value=0,C.cb.value=1,f(m,g[1]),C.Q.value=g[1].texture,C.Q0.value=g[0].texture,C.ca.value=.5,C.cb.value=.5,f(m,g[2]),g=[g[2],g[0],g[1]],U+=E}J++}}function O(){h.mode==="lbm"?(F(I,M[0]),f(I,W)):(b.uniforms.Q.value=g[0].texture,f(b,W))}function X(){return h.mode==="lbm"?{U:h.U,p:1/3,q:.5*h.U*h.U}:{U:h.M,p:1/1.4,q:.5*h.M*h.M}}function _(y,[R,E,C,ee]){let P=X(),d=N.uniforms;d.field.value=y,d.pInf.value=P.p,d.qInf.value=P.q,d.uInf.value=P.U,d.vScale.value=h.chord/(P.U*40),d.box.value.set(R,E,C,ee),f(N,null)}function G(y=0,R=0,E=e,C=a){if(!o)return null;let ee=new Float32Array(E*C*4);return t.readRenderTargetPixels(W,y,R,E,C,ee),ee}function V(){let y=G();if(!y)return null;let R=0,E=0,C=(P,d)=>P>=0&&d>=0&&P<e&&d<a&&n[d*e+P]>127;for(let P=0;P<a;P++)for(let d=0;d<e;d++){if(C(d,P))continue;let T=y[(P*e+d)*4+3];C(d+1,P)&&(R+=T),C(d-1,P)&&(R-=T),C(d,P+1)&&(E+=T),C(d,P-1)&&(E-=T)}let ee=X();return{cd:R/(ee.q*h.chord),cl:E/(ee.q*h.chord)}}function Q(y){let R=new We(y,e,a,Ce,Ze);R.needsUpdate=!0;let E=ve(Ma,{S:{value:R}});f(E,g[0]),E.dispose(),R.dispose(),J=U=0,O()}function ie(y,R){for(let d=0;d<n.length;d++)n[d]=y[d]?255:0;for(let d=!0;d;){d=!1;for(let T=0;T<a;T++)for(let te=0;te<e;te++){let Z=T*e+te;if(n[Z])continue;(te>0&&n[Z-1]?1:0)+(te<e-1&&n[Z+1]?1:0)+(T>0&&n[Z-e]?1:0)+(T<a-1&&n[Z+e]?1:0)>=3&&(n[Z]=255,d=!0)}}s.needsUpdate=!0;let E=(d,T)=>d<0||T<0||d>=e||T>=a?!1:n[T*e+d]>0,C=new Float32Array(e*a*2),ee=[],P=4;for(let d=0;d<a;d++)for(let T=0;T<e;T++){if(!E(T,d)||E(T+1,d)&&E(T-1,d)&&E(T,d+1)&&E(T,d-1))continue;let te=1/0,Z=0,me=0;for(let ae=-P;ae<=P;ae++)for(let re=-P;re<=P;re++){let fe=T+re,de=d+ae;if(fe<0||de<0||fe>=e||de>=a||E(fe,de))continue;let he=re*re+ae*ae;he<te&&(te=he,Z=re,me=ae)}let pe=Math.hypot(Z,me)||1;C[(d*e+T)*2]=Z/pe,C[(d*e+T)*2+1]=me/pe,ee.push(d*e+T)}c.fill(128);for(let d of ee){let T=d%e,te=(d-T)/e,Z=C[d*2],me=C[d*2+1],pe=0,ae=0;for(let fe=-3;fe<=3;fe++)for(let de=-3;de<=3;de++){let he=T+de,Qe=te+fe;if(he<0||Qe<0||he>=e||Qe>=a)continue;let gt=Qe*e+he,Mt=C[gt*2],bt=C[gt*2+1];Mt*Z+bt*me>0&&(pe+=Mt,ae+=bt)}let re=Math.hypot(pe,ae)||1;c[d*4]=Math.round((pe/re*.5+.5)*255),c[d*4+1]=Math.round((ae/re*.5+.5)*255)}u.needsUpdate=!0,R&&(h.chord=R)}return S(),{nx:e,ny:a,exact:o,mask:n,setMask:ie,setFlow:j,reset:S,load:Q,step:Y,macro:O,render:_,read:G,forces:V,get steps(){return J},get time(){return U},get flow(){return h},dispose(){for(let y of[...M,...g,W])y.dispose();for(let y of[L,I,m,b,N])y.dispose();s.dispose(),u.dispose(),l.geometry.dispose()}}}function rt(t,e,a,{nx:o,ny:r,alpha:i=0,cut:n="perfil"}){let s=[];e.traverse(c=>{c.visible&&/^(tren|compuerta)/.test(c.name)&&(c.visible=!1,s.push(c))});try{return n==="ala"?Ra(e,a,o,r,i):Ea(t,e,a,o,r,i)}finally{for(let c of s)c.visible=!0}}var ba=t=>{for(let e=t;e;e=e.parent)if(!e.visible)return!1;return!0};function Ea(t,e,a,o,r,i){let n=a.max.x-a.min.x,s=a.max.z-a.min.z,c=a.getCenter(new oe),u=n/.38,p=u*r/o,l=new Ut(-.42*u,.58*u,p/2,-p/2,.01,s*4+n);l.position.set(c.x,c.y,a.min.z-s-n*.1),l.up.set(0,1,0),l.lookAt(c),l.rotateZ(i*Math.PI/180),l.updateMatrixWorld();let w=new Ye(o,r,{depthBuffer:!0,minFilter:be,magFilter:be}),v=new St({color:16777215,side:Le}),M=new Ee;M.overrideMaterial=v;let g=e.parent;M.add(e);let W=t.getClearColor(new se),L=t.getClearAlpha(),I=t.getRenderTarget();t.setClearColor(0,1),t.setRenderTarget(w),t.render(M,l);let m=new Uint8Array(o*r*4);t.readRenderTargetPixels(w,0,0,o,r,m),t.setClearColor(W,L),t.setRenderTarget(I),g==null||g.add(e),w.dispose(),v.dispose();let b=new Uint8Array(o*r);for(let N=0;N<o*r;N++)b[N]=m[N*4]>127?1:0;return{mask:b,chord:Jt(b,o,r)}}function Jt(t,e,a){let o=e,r=-1;for(let i=0;i<a;i++)for(let n=0;n<e;n++)t[i*e+n]&&(o=Math.min(o,n),r=Math.max(r,n));return Math.max(1,r-o+1)}function Ra(t,e,a,o,r){let i=(e.min.z+e.max.z)/2-.4*((e.max.z-e.min.z)/2),n=[],s=new oe,c=new oe,u=new oe;t.updateMatrixWorld(!0),t.traverse(f=>{if(!f.isMesh||!ba(f))return;let F=f.geometry.attributes.position,S=f.geometry.index,B=S?S.count:F.count;for(let j=0;j+2<B;j+=3){let Y=S?S.getX(j):j,O=S?S.getX(j+1):j+1,X=S?S.getX(j+2):j+2;s.fromBufferAttribute(F,Y).applyMatrix4(f.matrixWorld),c.fromBufferAttribute(F,O).applyMatrix4(f.matrixWorld),u.fromBufferAttribute(F,X).applyMatrix4(f.matrixWorld);let _=[];for(let[G,V]of[[s,c],[c,u],[u,s]]){let Q=G.z-i,ie=V.z-i;if(Q<0==ie<0)continue;let y=Q/(Q-ie);_.push(G.x+(V.x-G.x)*y,G.y+(V.y-G.y)*y)}_.length===4&&n.push(_)}});let p=new Uint8Array(a*o);if(!n.length)return{mask:p,chord:1};let l=1/0,w=-1/0,v=1/0,M=-1/0;for(let[f,F,S,B]of n)l=Math.min(l,f,S),w=Math.max(w,f,S),v=Math.min(v,F,B),M=Math.max(M,F,B);let g=(w-l)/.38/a,W=(l+w)/2,L=(v+M)/2,I=Math.cos(r*Math.PI/180),m=Math.sin(r*Math.PI/180),b=(f,F)=>{let S=-(f-W),B=F-L;return[(S*I+B*m)/g+.42*a,(-S*m+B*I)/g+o/2]},N=new Uint8Array(a*o),h=(f,F)=>{f>=0&&F>=0&&f<a&&F<o&&(N[F*a+f]=1)};for(let[f,F,S,B]of n){let[j,Y]=b(f,F),[O,X]=b(S,B),_=Math.max(1,Math.ceil(Math.hypot(O-j,X-Y)*4));for(let G=0;G<=_;G++){let V=Math.floor(j+(O-j)*G/_),Q=Math.floor(Y+(X-Y)*G/_);h(V,Q),h(V+1,Q),h(V-1,Q),h(V,Q+1),h(V,Q-1)}}let J=new Uint8Array(a*o),U=[];for(let f=0;f<a;f++)U.push(f,(o-1)*a+f);for(let f=0;f<o;f++)U.push(f*a,f*a+a-1);for(;U.length;){let f=U.pop();if(J[f]||N[f])continue;J[f]=1;let F=f%a,S=(f-F)/a;F>0&&U.push(f-1),F<a-1&&U.push(f+1),S>0&&U.push(f-a),S<o-1&&U.push(f+a)}for(let f=0;f<a*o;f++)p[f]=J[f]?0:1;return{mask:p,chord:Jt(p,a,o)}}var q=1.4,Yt=()=>new Promise(t=>setTimeout(t,0));function Ta(t,e){let a=(i,n)=>{let s=Math.sqrt(q*n.p/n.r);if(i>n.p){let u=2/((q+1)*n.r),p=(q-1)/(q+1)*n.p;return[(i-n.p)*Math.sqrt(u/(i+p)),Math.sqrt(u/(p+i))*(1-(i-n.p)/(2*(p+i)))]}let c=(q-1)/(2*q);return[2*s/(q-1)*((i/n.p)**c-1),1/(n.r*s)*(i/n.p)**(-(q+1)/(2*q))]},o=.5*(t.p+e.p);for(let i=0;i<40;i++){let[n,s]=a(o,t),[c,u]=a(o,e);o=Math.max(1e-8,o-(n+c+e.u-t.u)/(s+u))}let r=.5*(t.u+e.u)+.5*(a(o,e)[0]-a(o,t)[0]);return{p:o,u:r}}var Pe=(()=>{let t={r:1,u:0,p:1},e={r:.125,u:0,p:.1},{p:a,u:o}=Ta(t,e),r=Math.sqrt(q*t.p/t.r),i=Math.sqrt(q*e.p/e.r);return{L:t,R:e,p:a,u:o,aL:r,rL:t.r*(a/t.p)**(1/q),rR:e.r*((a/e.p+(q-1)/(q+1))/((q-1)/(q+1)*(a/e.p)+1)),shock:i*Math.sqrt((q+1)/(2*q)*(a/e.p)+(q-1)/(2*q)),tail:o-r*(a/t.p)**((q-1)/(2*q))}})();function qa(t){let e=Pe;if(t<-e.aL)return e.L.r;if(t<e.tail){let a=2/(q+1)*(e.aL+t);return e.L.r*((e.aL-(q-1)/2*a)/e.aL)**(2/(q-1))}return t<e.u?e.rL:t<e.shock?e.rR:e.R.r}async function st(t,{nx:e=400}={}){let o=Re(t,{nx:e,ny:4});o.setMask(new Uint8Array(e*4)),o.setFlow({mode:"ns",M:0,mu:0,inflow:[1,0,0,1],dtMax:.1});let r=new Float32Array(e*4*4);for(let v=0;v<4;v++)for(let M=0;M<e;M++){let g=M<e/2,W=(v*e+M)*4;r[W]=g?1:.125,r[W+3]=g?1:.1}o.load(r);let i=.2*e;for(;o.time<i-1e-9;)o.setFlow({dtMax:Math.min(.1,i-o.time)}),o.step(1),o.steps%100===0&&await Yt();o.macro();let n=o.read();if(o.dispose(),!n)return null;let s=[],c=[],u=[],p=0,l=0;for(let v=0;v<e;v++){let M=(v+.5-e/2)/i,g=n[(e+v)*4],W=qa(M);s.push((v+.5)/e),c.push(g),u.push(W),p+=Math.abs(g-W)/e,g>(Pe.rR+Pe.R.r)/2&&(l=v)}let w=e/2+Pe.shock*i;return{x:s,sim:c,exact:u,l1:p,shock:l+1,shockExact:w}}function Ne(t,e){let a=Math.tan(e*Math.PI/180),o=u=>2/Math.tan(u)*((t*t*Math.sin(u)**2-1)/(t*t*(q+Math.cos(2*u))+2)),r=Math.asin(1/t),i=r,n=-1/0;for(let u=r;u<Math.PI/2;u+=5e-4){let p=o(u);p>n&&(n=p,i=u)}if(n<a)return null;let s=r,c=i;for(let u=0;u<60;u++){let p=(s+c)/2;o(p)<a?s=p:c=p}return(s+c)/2*(180/Math.PI)}function ea(t,e){let a=e*Math.PI/180,o=2/Math.tan(a)*((t*t*Math.sin(a)**2-1)/(t*t*(q+Math.cos(2*a))+2));return Math.atan(o)*180/Math.PI}var ct=(t,e)=>{let a=(t*Math.sin(e*Math.PI/180))**2;return(q+1)*a/((q-1)*a+2)};function lt(t,e,a,o,r,i,n){let s=(m,b)=>t[(b*e+m)*4],c=[],u=m=>typeof i=="function"?i(m):i;for(let m=o;m<=r;m+=5)for(let b=a-8;b>u(m);b--)if(s(m,b)>n){c.push([m+.5,b+.5+(s(m,b)-n)/(s(m,b)-s(m,b+1))]);break}let p=c.length,l=c.reduce((m,b)=>m+b[0],0),w=c.reduce((m,b)=>m+b[1],0),v=c.reduce((m,b)=>m+b[0]*b[0],0),M=c.reduce((m,b)=>m+b[0]*b[1],0),g=(p*M-l*w)/(p*v-l*l),W=(w-g*l)/p,L=Math.round((o+r)/2),I=Math.round((u(L)+g*(L+.5)+W)/2);return{angle:Math.atan(g)*180/Math.PI,n:p,rho2:I>0&&I<a?s(L,I):NaN}}async function ut(t,{M:e=2,theta:a=10}={}){let o=Ne(e,a);if(!o)return null;let r=260,i=170,n=Re(t,{nx:r,ny:i}),s=20,c=30,u=new Uint8Array(r*i);for(let I=s-4;I<s;I++)for(let m=c;m<r;m++)u[I*r+m]=1;n.setMask(u,r-c),n.setFlow({mode:"ns",M:e,mu:0,tilt:-a*Math.PI/180}),n.reset();let p=Math.tan((o-a)*Math.PI/180),l=Math.min(r-c-10,(i-s-14)/p),w=Math.round(c+.4*l),v=Math.round(c+.9*l),M=2*r/(e*Math.cos(a*Math.PI/180));for(;n.time<M;)n.step(50),n.macro(),n.read(0,0,1,1),await Yt();n.macro();let g=n.read();if(n.dispose(),!g)return null;let W=ct(e,o),L=lt(g,r,i,w,v,s,(1+W)/2);return{M:e,theta:a,beta:o,measured:L.angle+a,points:L.n,rho2:W,rho2Measured:L.rho2}}var A=t=>document.getElementById(t),x=(t,e=0)=>Number(t).toLocaleString("es-ES",{minimumFractionDigits:e,maximumFractionDigits:e}),qe=(t,e,a)=>{let o=Math.min(1,Math.max(0,(a-t)/(e-t)));return o*o*(3-2*o)},oa=9.80665,He={hawk:{name:"Hawk 1:7 con MW54",glb:"../assets/mw54.glb",S:.34,m:7.5,AR:5.3,e:.8,cd0:.03,peak:1,sup:1,maxM:.3,step:.005,engines:1,thrust:()=>.054,h:()=>.1,note:"Una maqueta de 2 m vuela a menos de 300 km/h: el aire es incompresible y la resistencia la ponen el roce y la que induce la sustentaci\xF3n."},sr71:{name:"SR-71 Blackbird",glb:"../sr71/sr71.glb",S:167,m:5e4,AR:1.7,e:.7,cd0:.011,peak:2.4,sup:1.55,maxM:3.3,engines:2,thrust:t=>nt(t,1).thrust,h:t=>nt(t,1).h,note:"Ala en delta muy fina y aristas a lo largo del morro: a Mach 3,2 el cono de Mach se cierra a 18\xB0 y la temperatura de remanso pasa de 400 \xB0C."},f22:{name:"F-22 Raptor",glb:"../f22/f22.glb",S:78,m:29e3,AR:2.4,e:.75,cd0:.016,peak:2.3,sup:1.6,maxM:2.25,engines:2,thrust:t=>ot(t,1).thrust,h:t=>ot(t,1).h,note:"Ala en diamante de 42\xB0 de flecha: vuela en supercrucero, a Mach 1,5 o m\xE1s sin postquemador."},f14:{name:"F-14 Tomcat",glb:"../f14/f14.glb",S:52.5,m:27e3,AR:7.3,e:.8,cd0:.02,peak:2.5,sup:1.7,maxM:2.34,engines:2,thrust:t=>De(t,1).thrust,h:t=>De(t,1).h,sweep:t=>De(t,1).sweep,note:"El ala barre de 20\xB0 a 68\xB0: abierta da alargamiento para despegar de un portaaviones; cerrada esconde el ala dentro del cono de Mach."},sr72:{name:"SR-72 (concepto)",glb:"../sr72/sr72.glb",S:90,m:35e3,AR:1.3,e:.65,cd0:.01,peak:2.2,sup:1.4,maxM:6,engines:2,thrust:t=>at(t,1).thrust,h:t=>at(t,1).h,note:"Cuerpo sustentador en punta de flecha: por encima de Mach 5 el choque se pega al cuerpo y el aire se calienta tanto que la qu\xEDmica del aire empieza a contar."}};function ka(t){let e,a;t<11?(e=288.15-6.5*t,a=101325*(e/288.15)**5.2559):t<20?(e=216.65,a=22632*Math.exp(-oa*(t-11)*1e3/(287.05*e))):(e=216.65+(t-20),a=5474.9*(e/216.65)**-34.163);let o=a/(287.05*e);return{T:e,p:a,rho:o,a:Math.sqrt(1.4*287.05*e),mu:1458e-9*e**1.5/(e+110.4)}}function Aa(t,e){let a=e<.8?1:e<1.05?1+(t.peak-1)*qe(.8,1.05,e):t.sup+(t.peak-t.sup)*Math.exp(-(e-1.05)*1.6),o=t.AR;t.sweep&&(o=t.AR*(Math.cos(t.sweep(e)*Math.PI/180)/Math.cos(20*Math.PI/180))**2);let r=1/(Math.PI*t.e*o),i=e<1?r:Math.max(r,Math.sqrt(e*e-1)/4);return{cd0:t.cd0*a,K:i,AR:o}}function ht(t,e){let a=t.h(e),o=ka(a),r=Math.max(e,.02)*o.a,i=.5*o.rho*r*r,s=t.m*oa/(i*t.S),{cd0:c,K:u,AR:p}=Aa(t,e),l=c+u*s*s,w=i*t.S*l,v=t.engines*t.thrust(e)*1e3,M=t.S**.5*2.2;return{h:a,air:o,V:r,q:i,CL:s,CD:l,cd0:c,Di:i*t.S*u*s*s,D:w,LD:s/l,thrust:v,AR:p,T0:o.T*(1+.2*e*e),Re:o.rho*r*M/o.mu,mu:e>1?Math.asin(1/e):null}}function Sa(t){return t<.3?["Incompresible","El aire apenas cambia de densidad: se aparta antes de llegar y rodea el avi\xF3n."]:t<.8?["Subs\xF3nico","El aire se comprime un poco; las perturbaciones viajan por delante del avi\xF3n y el flujo se prepara para pasar."]:t<1.2?["Trans\xF3nico","Sobre el ala ya hay zonas supers\xF3nicas que acaban en choques: la resistencia de onda sube de golpe."]:t<5?["Supers\xF3nico","El aire de delante no sabe que llega el avi\xF3n: lo cruza el cono de Mach y ah\xED se comprime y se calienta de golpe."]:["Hipers\xF3nico","El choque se pega al cuerpo y la capa de aire comprimido es tan caliente que el calor manda sobre la forma."]}var $=new Ot({antialias:!0,powerPreference:"high-performance"});$.setPixelRatio(Math.min(devicePixelRatio,2));$.outputColorSpace=qt;$.toneMapping=Et;A("view").appendChild($.domElement);Kt($);var K=new Ee;K.background=new se(855826);K.environment=new Gt($).fromScene(new Vt,.04).texture;K.environmentIntensity=.7;var na=new Bt(16777215,2.2);na.position.set(30,50,20);K.add(na,new It(12374783,2762274,.5));var ne=new zt(32,1,.01,2e3),ge=new _t(ne,$.domElement);ge.enableDamping=!0;var $e=null,ia=new Lt({transparent:!0,depthWrite:!1,side:Le,blending:Ke,uniforms:{uColor:{value:new se(16751184)},uAlpha:{value:0}},vertexShader:"varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = uv.y; vec4 p = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }",fragmentShader:"uniform vec3 uColor; uniform float uAlpha; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(1. - abs(dot(vN, vV)), 2.); float fade = smoothstep(0., .25, vT) * smoothstep(1., .55, vT); gl_FragColor = vec4(uColor * (0.25 + 1.4 * rim), uAlpha * (0.25 + rim) * fade); }"}),dt=new Fe(new Pt(1,1,96,1,!0),ia),Ge=new Ft;Ge.add(dt);K.add(Ge);var Oe=matchMedia("(max-width: 760px)").matches,Ve=Oe?900:2200,Ae=6,Se=new Ht,Ie=new Float32Array(Ve*Ae*2*3),Ue=new Float32Array(Ve*Ae*2*3);Se.setAttribute("position",new et(Ie,3));Se.setAttribute("color",new et(Ue,3));var ra=new Dt(Se,new Wt({vertexColors:!0,transparent:!0,opacity:.85,depthWrite:!1,blending:Ke}));ra.frustumCulled=!1;K.add(ra);var Ha=Array.from({length:Ve},()=>[Math.random(),Math.random()*2-1,Math.random()*2-1]),ue=null,k=null,xe=null,we=72;function La(t,e){let a=new Float32Array(we),o=new Float32Array(we),r=(e.min.y+e.max.y)/2,i=(e.min.z+e.max.z)/2,n=e.max.x-e.min.x,s=new oe;t.traverse(u=>{if(!u.isMesh)return;let p=u.geometry.attributes.position,l=Math.max(1,Math.floor(p.count/6e3));for(let w=0;w<p.count;w+=l){s.fromBufferAttribute(p,w).applyMatrix4(u.matrixWorld);let v=Math.min(we-1,Math.max(0,Math.floor((s.x-e.min.x)/n*we)));a[v]=Math.max(a[v],Math.abs(s.y-r)),o[v]=Math.max(o[v],Math.abs(s.z-i))}});let c=u=>{let p=u.map((l,w)=>Math.max(...u.slice(Math.max(0,w-2),w+3)));return p.map((l,w)=>{let v=p.slice(Math.max(0,w-4),w+5);return v.reduce((M,g)=>M+g,0)/v.length})};return{hy:c(a),hz:c(o),cy:r,cz:i}}var z=0,ye={},ft=new se(8368895),ta=new se(16777215),Ca=new se(16747068);async function sa(t){let e=He[t];if(document.querySelectorAll("[data-plane]").forEach(s=>s.toggleAttribute("aria-pressed",s.dataset.plane===t)),ue&&K.remove(ye[ue]),A("loading").hidden=!1,!ye[t]){let s=await Qt(e.glb,"../assets/draco/");s.scene.traverse(c=>{!c.isMesh||!(c.material.transmission>0)||(c.material.opacity=Math.min(c.material.opacity,1-.55*c.material.transmission),c.material.transmission=0,Object.assign(c.material,{transparent:!0,depthWrite:!1}))}),s.scene.traverse(c=>{/^tren/.test(c.name)&&(c.visible=!1)}),ye[t]=s.scene}ue=t;let a=ye[t];K.add(a),a.updateMatrixWorld(!0),k=new At().setFromObject(a),xe=La(a,k);let r=k.getSize(new oe).x;$e&&K.remove($e.fill,$e.rim),$e=Xt(K,r),await Zt($,K,ne,{ready:Promise.resolve(),target:null}),A("loading").hidden=!0,ne.near=r/200,ne.far=r*60,ne.updateProjectionMatrix();let i=k.getCenter(new oe);ge.target.copy(i),ne.position.copy(i).add(new oe(-1.1,.55,1.25).multiplyScalar(r*1.25)),ge.minDistance=r*.6,ge.maxDistance=r*6;let n=A("mach");n.max=e.maxM,n.step=e.step??.01,vt(Math.min(e.maxM,t==="hawk"?.15:Math.max(.85,e.maxM*.8))),Ua(),le==="tunel"&&_e(!0)}function vt(t){z=Number(t),A("mach").value=z,za()}function za(){let t=He[ue],e=ht(t,z),[a,o]=Sa(z);A("regime").innerHTML=`<b>${a}</b> \xB7 ${o}`,A("machOut").textContent=x(z,z<1?2:1);let r=[["Altitud",`${x(e.h,(e.h<1,1))} km`],["Velocidad",`${x(e.V*3.6)} km/h`],["Sonido a esa altura",`${x(e.air.a)} m/s \xB7 ${x(e.air.T-273.15)} \xB0C`],["Densidad del aire",`${x(e.air.rho,3)} kg/m\xB3`],["Presi\xF3n din\xE1mica",`${x(e.q/1e3,1)} kPa`],["Temperatura de remanso",`${x(e.T0-273.15)} \xB0C`],["Cono de Mach",e.mu?`${x(e.mu*180/Math.PI,1)}\xB0 de semi\xE1ngulo`:"no hay: subs\xF3nico"],["Reynolds",`${(e.Re/1e6).toLocaleString("es-ES",{maximumFractionDigits:e.Re>1e7?0:1})} millones`],["CL para vuelo nivelado",x(e.CL,3)],["CD (forma + onda / inducida)",`${x(e.cd0,4)} / ${x(e.CD-e.cd0,4)}`],["Finura L/D",x(e.LD,1)],["Resistencia",e.D>2e3?`${x(e.D/1e3,1)} kN`:`${x(e.D,1)} N`],["Empuje disponible",e.thrust>2e3?`${x(e.thrust/1e3,1)} kN`:`${x(e.thrust,1)} N`]];t.sweep&&r.splice(8,0,["Flecha del ala",`${x(t.sweep(z))}\xB0 \xB7 alargamiento ${x(e.AR,1)}`]),A("data").innerHTML=r.map(([n,s])=>`<dt>${n}</dt><dd>${s}</dd>`).join(""),A("note").textContent=t.note;let i=e.thrust-e.D;if(A("verdict").innerHTML=e.CL>1.4?"<b>Demasiado lento:</b> el ala no da la sustentaci\xF3n que pide el peso.":i<0?`<b>No llega:</b> le faltan ${e.D-e.thrust>2e3?x((e.D-e.thrust)/1e3,1)+" kN":x(e.D-e.thrust,1)+" N"} de empuje para sostener este Mach.`:`<b>Vuela:</b> le sobran ${i>2e3?x(i/1e3,1)+" kN":x(i,1)+" N"} de empuje para acelerar o subir.`,k){let s=(k.max.x-k.min.x)*1.6,c=e.mu??0;ia.uniforms.uAlpha.value=e.mu?.3:0,dt.scale.set(Math.tan(c)*s,s,Math.tan(c)*s),dt.position.set(0,-s/2,0),Ge.position.set(k.max.x,(k.min.y+k.max.y)/2,(k.min.z+k.max.z)/2),Ge.rotation.set(0,0,-Math.PI/2)}wt(),le==="tunel"&&(ua(),fa())}var ca=Oe?{nx:256,ny:128}:{nx:384,ny:192},le="3d",D=null,la="perfil",Me=0,mt=4,Be=0,Fa=0,Te=new ze;function ua(){let t=D.flow.chord;if(z<.3){let a=Math.max(.515,.5+.24*t/1200);D.setFlow({mode:"lbm",M:z,U:.08,tau:a,cs:.15}),Be=.08*t/((a-.5)/3)}else Be=5e3,D.setFlow({mode:"ns",M:z,mu:z*t/Be})}function fa(){let t=D.flow.mode==="ns",e=A("field3");e.textContent=t?"Choques":"Remolinos",e.dataset.field=t?"3":"2",Me>=2&&(Me=t?3:2),document.querySelectorAll("[data-field]").forEach(a=>a.toggleAttribute("aria-pressed",Number(a.dataset.field)===Me))}function _e(t){if(!D||!ue)return;let{mask:e,chord:a}=rt($,ye[ue],k,{...ca,alpha:mt,cut:la});D.setMask(e,a),ua(),t&&D.reset(),fa()}var Wa=["<b>Velocidad</b> \xB7 azul, m\xE1s lento que el aire libre; oscuro, igual; naranja, m\xE1s r\xE1pido.","<b>Presi\xF3n</b> (Cp) \xB7 naranja, el aire se frena y aprieta; azul, succi\xF3n. La diferencia entre arriba y abajo es la sustentaci\xF3n.","<b>Remolinos</b> (vorticidad) \xB7 el aire que gira: la capa l\xEDmite que se despega y la estela que deja el avi\xF3n.","<b>Choques</b> (schlieren num\xE9rico) \xB7 donde la densidad cambia de golpe: el choque del morro y los choques oblicuos donde la superficie se mete en el aire, y los abanicos de expansi\xF3n de Prandtl-Meyer, m\xE1s difusos, donde se aparta."];function xt(){let t=D.forces(),e=ht(He[ue],z),a=D.flow.mode==="ns",o=D.time*(a?z:D.flow.U)/D.flow.chord;A("tunnelInfo").innerHTML=`${Wa[Me]} Corte 2D: es como un ala (o un fuselaje) infinitamente ancha con esta forma; las puntas y el flujo de un lado a otro no est\xE1n.${a?" La superficie queda en escalones de la malla: los choques salen unos 3\xB0 m\xE1s abiertos que en la forma lisa.":""}`;let r=[["M\xE9todo",a?"Navier-Stokes compresible \xB7 vol\xFAmenes finitos HLL":"Navier-Stokes incompresible \xB7 Lattice Boltzmann D2Q9"],["Malla",`${D.nx} \xD7 ${D.ny} celdas \xB7 cuerda de ${D.flow.chord}`],["Reynolds del t\xFAnel",`${x(Be)} (el avi\xF3n real: ${x(e.Re/1e6)} millones)`],["Tiempo simulado",`${x(o,1)} cuerdas recorridas`]];if(t&&r.push(["Cl / Cd del corte (por presi\xF3n)",`${x(t.cl,2)} / ${x(t.cd,3)}`]),a&&z>1){let i=Ne(z,10);r.push(["Ondas de Mach (\u03BC = asen 1/M)",`${x(Math.asin(1/z)*180/Math.PI,1)}\xB0`]),r.push(["Choque que desv\xEDa 10\xB0 (\u03B8-\u03B2-M)",i?`\u03B2 = ${x(i,1)}\xB0 \xB7 densidad \xD7 ${x(ct(z,i),2)}`:"se separa: choque curvo delante"])}A("tunnelData").innerHTML=r.map(([i,n])=>`<dt>${i}</dt><dd>${n}</dd>`).join("")}var je=!1;function da(t){let e=Math.min(devicePixelRatio,2);t.width=t.clientWidth*e,t.height=t.clientHeight*e;let a=t.getContext("2d");return a.setTransform(e,0,0,e,0,0),a.clearRect(0,0,t.clientWidth,t.clientHeight),a.font="10px ui-monospace, Menlo, monospace",[a,t.clientWidth,t.clientHeight]}function Da(t){let[e,a,o]=da(A("sodChart")),r=n=>8+n*(a-16),i=n=>o-18-n/1.05*(o-30);e.strokeStyle="#ff8a3c",e.lineWidth=1.5,e.beginPath(),t.x.forEach((n,s)=>s?e.lineTo(r(n),i(t.exact[s])):e.moveTo(r(n),i(t.exact[s]))),e.stroke(),e.fillStyle="#7fb2ff",t.x.forEach((n,s)=>{s%4===0&&e.fillRect(r(n)-1,i(t.sim[s])-1,2.2,2.2)}),e.fillStyle="#8b939c",e.fillText("Sod \xB7 densidad en t = 0,2",8,12),e.fillText("x 0",8,o-4),e.fillText("1",a-14,o-4)}function Pa(t,e){let[a,o,r]=da(A("betaChart")),i=Math.asin(1/t)*180/Math.PI,n=[];for(let l=i;l<=90;l+=.25)n.push([ea(t,l),l]);let s=Math.max(...n.map(l=>l[0]))*1.08,c=l=>8+l/s*(o-16),u=l=>r-18-(l-i)/(90-i)*(r-30);a.strokeStyle="#ffffff55",a.lineWidth=1.2,a.beginPath(),n.forEach(([l,w],v)=>v?a.lineTo(c(l),u(w)):a.moveTo(c(l),u(w))),a.stroke();let p=(l,w,v,M)=>{a.beginPath(),a.arc(c(l),u(w),M?5:3,0,Math.PI*2),M?(a.strokeStyle=v,a.lineWidth=1.5,a.stroke()):(a.fillStyle=v,a.fill())};p(e.theta,e.beta,"#ff8a3c",!0),p(e.theta,e.measured,"#7fb2ff",!1),a.fillStyle="#8b939c",a.fillText(`\u03B8-\u03B2-M a Mach ${x(t,1)} \xB7 \u03B2 seg\xFAn \u03B8`,8,12),a.fillText("\u03B8 0",8,r-4),a.fillText(`${x(s,0)}\xB0`,o-24,r-4)}async function Na(){if(je)return;je=!0;let t=A("checkRun");t.disabled=!0,A("checkOut").textContent="Corriendo el tubo de Sod\u2026";try{let e=await st($);if(!e){A("checkOut").textContent="Esta GPU no deja leer texturas de coma flotante: no se puede comparar.";return}Da(e);let a=z>=1.5&&z<=6?z:2;A("checkOut").textContent=`Corriendo el choque oblicuo a Mach ${x(a,1)}\u2026`;let o=await ut($,{M:a,theta:10});Pa(a,o),A("checkOut").innerHTML=`<b>Sod:</b> error medio de densidad ${x(e.l1*100,2)} % \xB7 choque en ${x(e.shock/e.x.length,3)} (exacto ${x(e.shockExact/e.x.length,3)}).<br><b>Choque oblicuo a Mach ${x(a,1)}:</b> \u03B2 medido ${x(o.measured,1)}\xB0 frente a ${x(o.beta,1)}\xB0 de la teor\xEDa; densidad \xD7 ${x(o.rho2Measured,3)} frente a \xD7 ${x(o.rho2,3)}.`}finally{je=!1,t.disabled=!1}}function ma(t){t==="tunel"&&!D&&(D=Re($,ca)),le=t,document.querySelectorAll("[data-view]").forEach(e=>e.toggleAttribute("aria-pressed",e.dataset.view===le)),A("tunnel").hidden=le!=="tunel",ge.enabled=le==="3d",le==="tunel"&&(_e(!0),xt())}it($)?(document.querySelectorAll("[data-view]").forEach(t=>t.addEventListener("click",()=>ma(t.dataset.view))),document.querySelectorAll("[data-cut]").forEach(t=>t.addEventListener("click",()=>{la=t.dataset.cut,document.querySelectorAll("[data-cut]").forEach(e=>e.toggleAttribute("aria-pressed",e===t)),_e(!0)})),document.querySelectorAll("[data-field]").forEach(t=>t.addEventListener("click",()=>{Me=Number(t.dataset.field),document.querySelectorAll("[data-field]").forEach(e=>e.toggleAttribute("aria-pressed",e===t)),xt()})),A("alpha").addEventListener("input",t=>{mt=Number(t.target.value),A("alphaOut").textContent=`${mt}\xB0`,_e(!1)}),A("checkRun").addEventListener("click",Na)):document.querySelector(".views").hidden=!0;new URLSearchParams(location.search).has("prueba")&&(window.__tunel={createTunnel:Re,silhouette:rt,checkSod:st,checkOblique:ut,obliqueBeta:Ne,shockFit:lt,renderer:$,THREE:tt,model:()=>ye[ue],box:()=>k});function $a(){je||D.step(D.flow.mode==="ns"?Oe?3:6:Oe?6:12),D.macro(),$.getDrawingBufferSize(Te);let t=D.nx/D.ny,e=Math.min(Te.x,Te.y*t),a=e/t;D.render(Me,[(Te.x-e)/2,(Te.y-a)/2,e,a]),++Fa%40===0&&xt()}function Ia(t){if(!k)return;let e=k.max.x-k.min.x,a=k.max.z-k.min.z,o=(k.min.y+k.max.y)/2,r=(k.min.z+k.max.z)/2,i=k.max.x+e*.6,n=k.min.x-e*1.2,s=Math.max(a,e*.5)*.75,c=z>1?Math.tan(Math.asin(1/z)):0,u=e*(.25+.35*Math.min(z,3)),p=e*.025*(1+Math.min(z,3)*.3),l=new se;for(let w=0;w<Ve;w++){let[v,M,g]=Ha[w],W=o+M*s*.55,L=r+g*s,I=i-((v*(i-n)+t*u)%(i-n)+(i-n))%(i-n);for(let m=0;m<Ae;m++)for(let b=0;b<2;b++){let N=I+(m+b)*p,h=k.max.x-N,J=Math.hypot(W-o,L-r),U=z>1?h>0&&J<h*c:!0,f=W,F=L,S=0;if(U&&xe){let Y=(N-k.min.x)/e*we-.5,O=Math.floor(Y),X=Y-O,_=(ie,y)=>y<0||y>=we?0:ie[y],G=qe(-e*.25,0,N-k.min.x)*qe(e*.15,0,N-k.max.x),V=(_(xe.hy,O)*(1-X)+_(xe.hy,O+1)*X+e*.012)*G,Q=(_(xe.hz,O)*(1-X)+_(xe.hz,O+1)*X+e*.012)*G;if(V>1e-6&&Q>1e-6){let ie=W-o,y=L-r,R=Math.max(.001,Math.hypot(ie/V,y/Q)),E=Math.sqrt(R*R+1)/R;f=o+ie*E,F=r+y*E,S=Math.min(1,(E-1)*2.2)}}let B=((w*Ae+m)*2+b)*3;Ie[B]=N,Ie[B+1]=f,Ie[B+2]=F;let j=(1-m/Ae)*qe(n,n+e*.4,N)*qe(i,i-e*.3,N);z>1?l.copy(U?Ca:ft).lerp(ta,U?S*.5:0):l.copy(ft).lerp(S>.35?ta:ft,Math.min(1,S*1.4)),Ue[B]=l.r*j,Ue[B+1]=l.g*j,Ue[B+2]=l.b*j}}Se.attributes.position.needsUpdate=!0,Se.attributes.color.needsUpdate=!0}var ke=A("chart"),H=ke.getContext("2d"),ce=null;function Ua(){let t=He[ue],e=120,a=Array.from({length:e+1},(o,r)=>{let i=Math.max(t.maxM*.08,t.maxM*r/e),n=ht(t,i);return[i,Math.min(n.LD,25),n.D]});ce={pts:a,maxLD:Math.max(...a.map(o=>o[1]))*1.1,maxD:Math.max(...a.map(o=>o[2]))*1.1,maxM:t.maxM},wt()}function wt(){if(!ce)return;let t=Math.min(devicePixelRatio,2),e=ke.clientWidth,a=ke.clientHeight;ke.width=e*t,ke.height=a*t,H.setTransform(t,0,0,t,0,0),H.clearRect(0,0,e,a);let o=i=>8+(e-16)*i/ce.maxM,r=(i,n,s)=>{H.beginPath(),ce.pts.forEach(([c,u,p],l)=>{let w=i===1?u:p,v=a-18-(a-30)*w/n;l?H.lineTo(o(c),v):H.moveTo(o(c),v)}),H.strokeStyle=s,H.lineWidth=1.6,H.stroke()};H.strokeStyle="#ffffff14",H.beginPath(),H.moveTo(8,a-18),H.lineTo(e-8,a-18),H.stroke(),ce.maxM>1&&(H.setLineDash([3,3]),H.beginPath(),H.moveTo(o(1),6),H.lineTo(o(1),a-18),H.stroke(),H.setLineDash([])),r(1,ce.maxLD,"#7fb2ff"),r(2,ce.maxD,"#ff8a3c"),H.fillStyle="#e9ecef",H.beginPath(),H.arc(o(z),a-18,3.5,0,Math.PI*2),H.fill(),H.font="10px ui-monospace, Menlo, monospace",H.fillStyle="#8b939c",H.fillText("Mach 0",8,a-4),H.fillText(`${x(ce.maxM,1)}`,e-30,a-4),ce.maxM>1&&H.fillText("1",o(1)-3,a-4)}function yt(){let t=A("view"),e=t.clientWidth,a=t.clientHeight;$.setSize(e,a),ne.aspect=e/a,ne.updateProjectionMatrix(),wt(),le==="3d"&&$.render(K,ne)}addEventListener("resize",yt);visualViewport==null||visualViewport.addEventListener("resize",yt);document.querySelectorAll("[data-plane]").forEach(t=>t.addEventListener("click",()=>sa(t.dataset.plane)));A("mach").addEventListener("input",t=>vt(t.target.value));var Ba=new jt;function pa(){if(le==="tunel")$a();else{let t=Ba.getElapsedTime();Ia(t),ge.update(),$.render(K,ne)}requestAnimationFrame(pa)}yt();var aa=new URLSearchParams(location.search).get("avion");await sa(He[aa]?aa:"sr71");var pt=new URLSearchParams(location.search);pt.has("mach")&&vt(Math.min(Number(A("mach").max),Math.max(Number(A("mach").min),Number(pt.get("mach")))));pt.get("vista")==="tunel"&&it($)&&ma("tunel");pa();
