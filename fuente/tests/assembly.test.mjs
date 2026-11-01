import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Harness vectorial mínimo para ejecutar la función de movimiento sin WebGL
// ni dependencias de CDN. Las expectativas son posiciones y estados públicos.
class Vector {
  constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
  copy(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  toArray() { return [this.x, this.y, this.z]; }
}
const look = readFileSync(new URL("../web/look.js", import.meta.url), "utf8");
const motion = look.slice(look.indexOf("const eio ="), look.indexOf("// Orden de desarme:"))
  .replace("export function organicPose", "function organicPose");
const pose = new Function("THREE", motion + ";return organicPose;")({ Vector3: Vector });
const up = new Vector(0, 1, 0);
function entry(path) {
  return { t: 0, dir: -1, data: { path }, home: new Vector(10, 20, 30),
    offset: new Vector(50, 80, 0), quat: { w: 1 },
    obj: { position: new Vector(), quaternion: { copy(q) { Object.assign(this, q); return this; } } } };
}

test("montado y desarmado quedan fijos sin depender del tiempo", () => {
  for (const t of [0, 1]) {
    const e = entry(); e.t = t;
    const expected = t ? [60, 100, 30] : [10, 20, 30];
    for (const now of [0, 0.5, 30, 6000]) {
      pose(e, now, { up });
      assert.deepEqual(e.obj.position.toArray(), expected);
      assert.equal(e.obj.quaternion.w, 1);
    }
    assert.deepEqual(e.home.toArray(), [10, 20, 30]);
    assert.deepEqual(e.offset.toArray(), [50, 80, 0]);
    assert.deepEqual(up.toArray(), [0, 1, 0]);
  }
});

test("respeta la salida horizontal, vertical y por punto de paso", () => {
  const horizontal = entry(); horizontal.t = 0.5;
  pose(horizontal, 0, { up });
  assert.deepEqual(horizontal.obj.position.toArray(), [60, 20, 30]);
  const vertical = entry("v"); vertical.t = 0.5;
  pose(vertical, 0, { up });
  assert.deepEqual(vertical.obj.position.toArray(), [10, 100, 30]);
  const waypoint = entry(); waypoint.t = 0.5; waypoint.via = new Vector(20, 0, 5);
  pose(waypoint, 0, { up });
  assert.deepEqual(waypoint.obj.position.toArray(), [30, 20, 35]);
  assert.deepEqual(waypoint.via.toArray(), [20, 0, 5]);
});

test("al montar nunca rebota más allá de su encaje", () => {
  for (let t = 1; t >= 0; t -= 0.005) {
    const e = entry(); e.t = t;
    pose(e, 100, { up, dir: -1 });
    assert.ok(e.obj.position.x >= 10 && e.obj.position.x <= 60);
    assert.ok(e.obj.position.y >= 20 && e.obj.position.y <= 100);
  }
});

for (const file of ["core.js", "jet/core.js"]) {
  test(`Montar conserva el punto actual en ${file}`, () => {
    const source = readFileSync(new URL("../web/" + file, import.meta.url), "utf8");
    const start = source.indexOf("function assemble(speed = 1)");
    const code = source.slice(start, source.indexOf("function explode()", start));
    const part = entry(); part.t = 0.4;
    const calls = [];
    const assemble = new Function("parts", "stop", "sequence", "setExploded", "notify", "queueMicrotask",
      "let exploded = true;" + code + ";return assemble;")(
      [part], () => {}, (target) => calls.push(["sequence", target]),
      (target) => calls.push(["reset", target]), () => {}, (fn) => fn());
    assemble();
    assert.equal(part.t, 0.4);
    assert.deepEqual(calls, [["sequence", 0]]);
  });
}
