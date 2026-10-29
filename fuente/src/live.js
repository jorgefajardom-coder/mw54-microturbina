const D = __DATA__;
const root = document.querySelector(".mw");
const stage = root.querySelector(".mw-stage");
const engine = stage.querySelector(".mw-engine");
const canvas = stage.querySelector(".mw-air");
const readout = root.querySelector("[data-readout]");
const live = root.querySelector("[data-live]");
const hint = root.querySelector("[data-hint]");
const runButton = root.querySelector("[data-run]");
const runLabel = root.querySelector("[data-run-label]");
const apartButton = root.querySelector("[data-apart]");
const assembleButton = root.querySelector("[data-assemble]");
const throttleInput = root.querySelector("[data-throttle]");
const rows = [...document.querySelectorAll(".mw-row")];
const spinners = [...stage.querySelectorAll("[data-spin]")];
const thru = stage.querySelector(".mw-thru");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const LIGHT = document.body.dataset.theme === "light" ? 1 : 0;
const fmt = (value) => Math.round(value).toLocaleString("es-ES");

const nodes = [...engine.querySelectorAll(".it")].map((el) => ({
  el,
  piece: el.dataset.piece,
  ride: el.dataset.ride || el.dataset.piece,
  key: Number(el.dataset.k),
  m: el.dataset.m.split(",").map(Number),
  shown: "",
}));
for (const node of nodes) node.lift = node.m[0] * D.V[0] + node.m[1] * D.V[1] + node.m[2] * D.V[2];
let order = nodes.map((_, index) => index);

const SPRING = D.spring;
const springs = Object.fromEntries(D.stagger.map((id) => [id, { x: 0, v: 0, target: 0, pending: null }]));
const shareOf = (id) => (springs[id] ? springs[id].x : 0);

let clock = 0;
let apart = false;
let selected = null;
let visible = false;
let frame = 0;
let last = 0;
let touring = !still.matches;
let tourClock = 0;
let idleTimer = 0;
let assembling = null;

// ── motor: estado, arranque y palanca ──
const motor = { state: "off", t: 0, f: 0, spin: 0, angle: 0, heat: 0, flow: { x: 0, v: 0 } };
let throttle = Number(throttleInput.value) / 100;

function say(text) {
  if (readout.textContent !== text) readout.textContent = text;
}
function announce(text) {
  if (live.textContent !== text) live.textContent = text;
}

function setApart(on, { gap = SPRING.stagger, list } = {}) {
  apart = on;
  const goal = on ? 1 : 0;
  const ids = list ?? (on ? D.stagger : [...D.stagger].reverse());
  let index = 0;
  for (const id of ids) {
    const s = springs[id];
    if (s.target === goal && !s.pending) continue;
    s.pending = { value: goal, at: clock + (still.matches ? 0 : index++ * gap) };
  }
  apartButton.toggleAttribute("data-on", on);
  run();
}

function select(id) {
  if (selected === id) return;
  selected = id;
  for (const node of nodes) node.el.toggleAttribute("data-on", id !== null && node.piece === id);
  stage.toggleAttribute("data-focus", id !== null);
  rows.forEach((row) => row.toggleAttribute("data-on", row.dataset.part === id));
  describe();
}

function partNow(id) {
  const p = D.parts[id];
  const o = op(motor.f);
  const hot = metalOf(id, o);
  const temp = 15 + (hot - 15) * motor.heat;
  return { ...p, temp };
}
function metalOf(id, o) {
  return metal[id](o);
}

function describe() {
  if (assembling) return;
  if (selected && D.parts[selected]) {
    const p = partNow(selected);
    say(`${p.name} · ${p.material} · funde ${fmt(p.melt[0])} °C · ahora ${fmt(p.temp)} °C`);
    return;
  }
  if (assembling) return;
  if (motor.state !== "off") {
    const o = op(motor.f);
    say(motor.state === "starting" ? `Arranque · bujía · ${fmt(o.n * motor.spin)} rpm` : `${fmt(o.n)} rpm · ${o.thrust.toFixed(1)} N · EGT ${fmt(15 + (o.egt - 15) * motor.heat)} °C`);
    return;
  }
  say(apart ? `Despiece · ${D.stagger.length} conjuntos` : `Parada · ${D.spec.mass} g`);
}

// ── tabla de materiales ──
const rowCells = rows.map((row) => ({ row, id: row.dataset.part, temp: row.querySelector("[data-temp]"), fill: row.querySelector("[data-fill]"), shown: "" }));
function paintTable() {
  for (const cell of rowCells) {
    const p = partNow(cell.id);
    const margin = p.melt[0] - p.temp;
    const text = `${fmt(p.temp)} °C · ${fmt(margin)} °C`;
    if (text === cell.shown) continue;
    cell.shown = text;
    cell.temp.textContent = text;
    cell.fill.style.width = `${Math.min(100, (p.temp / p.melt[0]) * 100).toFixed(1)}%`;
    cell.row.toggleAttribute("data-hot", p.temp > p.service * 0.85);
  }
}

// ── muelles del despiece ──
function steer(state, dt, calm) {
  if (state.pending && clock >= state.pending.at) {
    state.target = state.pending.value;
    state.pending = null;
  }
  if (calm) {
    state.x = state.target;
    state.v = 0;
    return state.pending !== null;
  }
  for (let index = 0; index < SPRING.substeps; index++) {
    const h = dt / SPRING.substeps;
    state.v += ((state.target - state.x) * SPRING.stiffness - state.v * SPRING.damping) * h;
    state.x += state.v * h;
  }
  if (Math.abs(state.target - state.x) < 2e-4 && Math.abs(state.v) < 2e-4) {
    state.x = state.target;
    state.v = 0;
    return state.pending !== null;
  }
  return true;
}

function place() {
  for (const node of nodes) {
    const share = shareOf(node.ride);
    const tx = (D.EX[0] * node.m[0] + D.EY[0] * node.m[1] + D.EZ[0] * node.m[2]) * share;
    const ty = (D.EX[1] * node.m[0] + D.EY[1] * node.m[1] + D.EZ[1] * node.m[2]) * share;
    const text = share === 0 ? "" : `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`;
    if (text !== node.shown) {
      node.shown = text;
      if (text) node.el.setAttribute("transform", text);
      else node.el.removeAttribute("transform");
    }
  }
  const next = nodes.map((_, index) => index).sort((a, b) => nodes[a].key + nodes[a].lift * shareOf(nodes[a].ride) - (nodes[b].key + nodes[b].lift * shareOf(nodes[b].ride)));
  if (next.some((index, at) => index !== order[at])) {
    const fragment = document.createDocumentFragment();
    for (const index of next) fragment.appendChild(nodes[index].el);
    engine.appendChild(fragment);
    order = next;
  }
  const open = Math.max(shareOf("bellmouth"), shareOf("wheel"));
  thru.style.opacity = (1 - Math.min(1, open * 4)).toFixed(3);
}

// ── el aire: un ray-march en el espacio del mundo, con la misma cámara que el SVG ──
const FRAGMENT = `
uniform float uFlow;
uniform float uHeat;
uniform float uLight;
uniform float uClock;
const float X0=${D.x0.toFixed(1)};
const float XE=${D.exitX.toFixed(1)};
const float ZC=${D.zc.toFixed(1)};
const float RL=${D.lipR.toFixed(1)};
const float RX=${D.exitR.toFixed(1)};
const float RC=${D.caseR.toFixed(1)};
float bodyR(float x){
  return x>X0+1.?-9.:x>XE?RC:-9.;
}
// 1 donde el motor tapa el punto visto desde la cámara.
float hidden(vec3 p,vec3 V){
  vec2 q=vec2(p.y,p.z-ZC);
  vec2 v=V.yz;
  float tau=-dot(q,v)/max(dot(v,v),1e-4);
  vec2 c=q+tau*v;
  float x=p.x+tau*V.x;
  float r=bodyR(x);
  float inside=1.-smoothstep(r-1.5,r+1.5,length(c));
  return inside*smoothstep(-2.,4.,tau);
}
vec4 inkOf(vec3 col,vec3 ink){
  col=tonemap(col,1.1);
  float m=max(col.r,max(col.g,col.b));
  float n=(hash12(gl_FragCoord.xy+fract(uClock*.61)*91.)-.5)/255.;
  m=max(m+n*smoothstep(0.,2./255.,m),0.);
  vec4 dark=vec4(col,m);
  vec4 light=vec4(ink*m*.42,m*.42);
  return mix(dark,light,uLight);
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();
  vec3 g0=rayOf(vb);
  // Caja de interés: delante de la toma y detrás de la tobera.
  vec3 lo=vec3(XE-330.,-110.,0.);
  vec3 hi=vec3(XE,110.,ZC+110.);
  vec3 a=(lo-g0)/V;
  vec3 b=(hi-g0)/V;
  vec3 mn=min(a,b);
  vec3 mx=max(a,b);
  float t0=max(mn.x,max(mn.y,mn.z));
  float t1=min(mx.x,min(mx.y,mx.z));
  if(t1<=t0){gl_FragColor=vec4(0.);return;}
  vec3 cold=vec3(0.);
  vec3 hot=vec3(0.);
  const int N=36;
  float dt=(t1-t0)/float(N);
  for(int i=0;i<N;i++){
    float t=t0+(float(i)+hash12(gl_FragCoord.xy+float(i)))*dt;
    vec3 p=g0+t*V;
    float seen=1.-hidden(p,V);
    if(seen<.01)continue;
    // Chorro: se abre y se enfría al alejarse de la tobera.
    float L=XE-p.x;
    if(L>0.&&uHeat>.001){
      vec2 q=vec2(p.y,p.z-ZC);
      float w=RX+.16*L;
      float core=exp(-pow(length(q)/w,2.)*2.2);
      // Remolinos estirados a lo largo del chorro: se lee como calima caliente, no como humo.
      float turb=fbm3(vec3(p.x*.022+uClock*(1.2+3.*uFlow),q*.07));
      float wisp=smoothstep(.35,.85,turb);
      float life=smoothstep(0.,8.,L)*(1.-smoothstep(90.,280.,L));
      float temp=exp(-L/120.);
      vec3 c=mix(vec3(.5,.42,.4),vec3(1.,.5,.18),temp);
      hot+=c*core*(.12+1.1*wisp)*life*seen*uHeat*(.45+.55*uFlow);
    }
  }
  vec3 col=(cold+hot)*dt*.04;
  vec3 ink=normalize(cold*vec3(.2,.38,.8)+hot*vec3(.75,.33,.08)+1e-4);
  gl_FragColor=inkOf(col,ink);
}`;
const layer = glLayer({ canvas, fragment: FRAGMENT, view: [D.W, D.H], camera: D.camera, uniforms: ["uFlow", "uHeat", "uClock"], fixed: { uLight: LIGHT } });
if (layer) stage.setAttribute("data-gl", "");

// ── partículas de aire sobre las líneas de corriente de la admisión ──
const SVGNS = "http://www.w3.org/2000/svg";
const streamGroup = stage.querySelector("[data-streams]");
const PER_LINE = 4;
const streams = D.streams.map((points) => {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const marks = Array.from({ length: PER_LINE }, () => {
    const el = document.createElementNS(SVGNS, "path");
    el.setAttribute("class", "mw-particle");
    streamGroup.appendChild(el);
    return el;
  });
  return { points, lengths, total: lengths[lengths.length - 1], marks, phase: Math.random() };
});
function along(line, at) {
  const target = at * line.total;
  let i = 1;
  while (i < line.lengths.length - 1 && line.lengths[i] < target) i++;
  const span = line.lengths[i] - line.lengths[i - 1] || 1;
  const t = (target - line.lengths[i - 1]) / span;
  const a = line.points[i - 1];
  const b = line.points[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
let streamClock = 0;
function paintStreams(dt, amount) {
  streamGroup.style.opacity = Math.min(1, amount * 1.6).toFixed(3);
  if (amount < 0.002) return;
  streamClock += dt * (0.12 + 0.55 * amount);
  for (const line of streams) {
    line.marks.forEach((el, k) => {
      const u = (line.phase + k / PER_LINE + streamClock) % 1;
      // El aire se acelera al acercarse a la garganta: la posición avanza con u².
      const head = u * u;
      const tail = Math.max(0, head - 0.035 - 0.07 * u);
      const pts = [0, 0.25, 0.5, 0.75, 1].map((f) => along(line, tail + (head - tail) * f));
      el.setAttribute("d", `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`);
      el.style.opacity = (Math.min(1, u * 5) * Math.min(1, (1 - u) * 6)).toFixed(2);
    });
  }
}

// ── motor ──
function setRunning(on) {
  if (on) {
    if (motor.state !== "off") return;
    if (apart || assembling) {
      assembling = null;
      setApart(false);
    }
    motor.state = "starting";
    motor.t = 0;
  } else if (motor.state !== "off") {
    motor.state = "off";
  }
  runButton.dataset.state = motor.state;
  runLabel.textContent = motor.state === "off" ? "Arrancar" : "Apagar";
  run();
}

function stepMotor(dt, calm) {
  motor.t += dt;
  let fTarget = 0;
  let spinTarget = 0;
  if (motor.state === "starting") {
    stage.toggleAttribute("data-glow", motor.t < 2.6);
    spinTarget = motor.t < 1 ? 0.25 : 1;
    fTarget = 0;
    if (motor.t > 2.8) {
      motor.state = "running";
      runButton.dataset.state = "running";
      announce("Encendida, al ralentí");
    }
  } else if (motor.state === "running") {
    stage.removeAttribute("data-glow");
    spinTarget = 1;
    fTarget = throttle;
  } else {
    stage.removeAttribute("data-glow");
  }
  const up = fTarget > motor.f ? 1.6 : 1.1;
  motor.f += (fTarget - motor.f) * (calm ? 1 : 1 - Math.exp(-dt / up));
  motor.spin += (spinTarget - motor.spin) * (calm ? 1 : 1 - Math.exp(-dt / (spinTarget > motor.spin ? 1.2 : 2.6)));
  const burning = motor.state === "running" || (motor.state === "starting" && motor.t > 1.2) ? 1 : 0;
  motor.heat += (burning - motor.heat) * (calm ? 1 : 1 - Math.exp(-dt / (burning ? 3.5 : 6)));
  const o = op(motor.f);
  const rpm = o.n * motor.spin;
  // A la vista los álabes no pueden girar a 160.000 rpm: la rueda gira despacio y se funde en un disco.
  motor.angle = (motor.angle + dt * (90 + 260 * motor.spin) * motor.spin) % 360;
  for (const el of spinners) el.setAttribute("transform", `rotate(${motor.angle.toFixed(1)})`);
  stage.style.setProperty("--blur", Math.min(1, rpm / 60000).toFixed(3));
  settle(motor.flow, (o.flow / D.spec.massFlowMax) * motor.spin, dt, 0.5, calm);
  paintStreams(dt, apart ? 0 : motor.flow.x);
  const active = motor.flow.x > 0.002 || motor.heat > 0.01;
  if (layer) {
    if (active && !apart) layer.draw({ uFlow: motor.flow.x, uHeat: motor.heat, uClock: clock }, clock);
    else layer.clear();
  }
  return motor.state !== "off" || motor.spin > 0.002 || motor.heat > 0.004 || motor.flow.x > 0.002;
}

// ── montaje paso a paso ──
function assemble() {
  setRunning(false);
  select(null);
  assembling = { step: -1, at: clock + (apart ? 0.2 : 1.6) };
  if (!apart) setApart(true);
  run();
}
function stepAssembly() {
  if (!assembling || clock < assembling.at) return;
  const list = D.assembly;
  assembling.step += 1;
  if (assembling.step >= list.length) {
    assembling = null;
    apart = false;
    apartButton.removeAttribute("data-on");
    select(null);
    announce("Montaje completo");
    describe();
    return;
  }
  const id = list[assembling.step];
  springs[id].pending = { value: 0, at: clock };
  select(id);
  say(`Montaje ${assembling.step + 1}/${list.length} · ${D.parts[id].name} · ${D.parts[id].material}`);
  announce(`Paso ${assembling.step + 1}: ${D.parts[id].name}`);
  assembling.at = clock + (still.matches ? 0.6 : 1.15);
}

// ── recorrido cuando nadie toca ──
const TOUR = [
  [0.5, () => setRunning(true)],
  [6, () => setThrottle(1)],
  [11, () => setThrottle(0.25)],
  [15, () => setRunning(false)],
  [19, () => setApart(true)],
  [24, () => assemble()],
  [37, () => setThrottle(0.6)],
];
const TOUR_LENGTH = 40;
let tourIndex = 0;
function stepTour(dt) {
  if (!touring) return;
  tourClock += dt;
  while (tourIndex < TOUR.length && tourClock >= TOUR[tourIndex][0]) TOUR[tourIndex++][1]();
  if (tourClock >= TOUR_LENGTH) {
    tourClock = 0;
    tourIndex = 0;
  }
}
function quietTour() {
  touring = false;
  clearTimeout(idleTimer);
  if (!still.matches)
    idleTimer = setTimeout(() => {
      touring = true;
      tourClock = 0;
      tourIndex = 0;
      run();
    }, 14000);
}
function setThrottle(value) {
  throttle = value;
  throttleInput.value = String(Math.round(value * 100));
}

// ── bucle ──
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  stepTour(dt);
  stepAssembly();
  let moving = false;
  for (const id of D.stagger) moving = steer(springs[id], dt, calm) || moving;
  place();
  const running = stepMotor(dt, calm);
  paintTable();
  describe();
  frame = visible && (moving || running || touring || assembling) ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

// ── entrada ──
const pieceAt = (event) => event.target.closest?.(".it")?.dataset.piece ?? null;
stage.addEventListener("pointermove", (event) => {
  if (assembling) return;
  const id = pieceAt(event);
  select(id && D.parts[id] ? id : null);
  if (id) quietTour();
});
stage.addEventListener("pointerleave", () => !assembling && select(null));
runButton.addEventListener("click", () => {
  quietTour();
  setRunning(motor.state === "off");
});
apartButton.addEventListener("click", () => {
  quietTour();
  assembling = null;
  setRunning(false);
  setApart(!apart);
});
assembleButton.addEventListener("click", () => {
  quietTour();
  assemble();
});
throttleInput.addEventListener("input", () => {
  quietTour();
  throttle = Number(throttleInput.value) / 100;
  run();
});
rows.forEach((row) => {
  const show = () => !assembling && select(row.dataset.part);
  row.addEventListener("pointerenter", show);
  row.addEventListener("focus", show);
  row.addEventListener("pointerleave", () => !assembling && select(null));
  row.addEventListener("blur", () => !assembling && select(null));
});
const IDS = Object.keys(D.parts);
stage.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowright", "arrowdown", "arrowleft", "arrowup"].includes(key)) {
    const step = key === "arrowright" || key === "arrowdown" ? 1 : -1;
    const at = selected ? IDS.indexOf(selected) : -1;
    select(IDS[(at + step + IDS.length) % IDS.length]);
  } else if (key === "d") {
    assembling = null;
    setRunning(false);
    setApart(!apart);
  }
  else if (key === "m") assemble();
  else if (key === "a") setRunning(motor.state === "off");
  else if (key === "escape") {
    select(null);
    assembling = null;
    setRunning(false);
    setApart(false);
  } else return;
  event.preventDefault();
  quietTour();
});
still.addEventListener("change", () => {
  touring = !still.matches;
  run();
});
paintTable();
describe();
