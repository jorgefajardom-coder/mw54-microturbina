// Orden de pintado. Una carcasa abierta "ve" su interior por la boca y una pieza coaxial se ve por el agujero de
// otra; el orden por pares no sabe que otras piezas tapan esas bocas. Se descartan sólo esas medidas imposibles
// (lo de dentro "delante" de lo de fuera mientras siga dentro) y el kit resuelve todo lo demás.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";

export function settleOrder(R, P, { cache, reuse = false, impossible = () => [false, false] }) {
  const { items } = R;
  const cached = reuse && existsSync(cache) ? JSON.parse(readFileSync(cache, "utf8")) : null;
  if (cached && cached.length === items.length && cached.every(([name], index) => name === items[index].name)) {
    items.forEach((item, index) => (item.key = cached[index][1]));
    console.log("orden reutilizado de", cache);
    return;
  }
  const states = A.explodeStates(R.order, R.spring).depth;
  const overlaps = A.overlapsOf(items, P, { states, skip: A.sameRun });
  for (const pair of overlaps.pairs) {
    const [dropA, dropB] = impossible(items[pair.a], items[pair.b], pair.state);
    if (dropA) pair.front[0].area = 0;
    if (dropB) pair.front[1].area = 0;
  }
  const solved = A.orderKeys(items, overlaps);
  items.forEach((item, index) => (item.key = solved.keys[index]));
  R.settled = { items: items.slice(), overlaps, solved, states };
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, JSON.stringify(items.map((item) => [item.name, item.key])));
}

// Reglas de la MW54. `pieceOf` quita el prefijo de motor (en el avión hay dos); el eje del motor va siempre por
// -x, así que una pieza que se mueve +x avanza hacia s menores.
export function mw54Impossible({ S, pieceOf = (id) => id }) {
  const OPEN = /(^|\.)(casing\.body|bellmouth\.body|bellmouth\.flange|shroud\.flange)$/;
  const HOUSED = new Set(["nut", "wheel", "diffuser", "tunnel", "combustor", "ngv", "turbine"]);
  const REAR_S = { nut: S.nut[1], wheel: S.wheel[1], shroud: S.shroud[1], diffuser: S.diffuser[1], tunnel: S.shaft[1] };
  const AXIAL = { tunnel: S.shaft, combustor: S.combustor, diffuser: S.diffuser, ngv: S.ngv, wheel: S.wheel, nut: S.nut, bellmouth: S.intake, shroud: S.shroud, turbine: S.turbine, nozzle: S.nozzle };
  const NESTED = new Set(["tunnel>combustor", "tunnel>diffuser", "tunnel>ngv", "nut>bellmouth", "wheel>bellmouth", "wheel>shroud", "nut>shroud", "turbine>nozzle"]);
  const ds = (item, state) => -A.offsetOf(item, state)[0];
  function inShell(shell, item, state) {
    const s = pieceOf(shell.ride);
    const it = pieceOf(item.ride);
    const housed = HOUSED.has(it) || (it === "shroud" && /shroud\.body$/.test(item.name) && s === "casing");
    if (!housed || s === it) return false;
    if (s === "bellmouth" || s === "shroud") return true;
    if (item.move[0] <= 0) return true;
    return A.offsetOf(item, state)[0] < REAR_S[it] - S.caseFront - 0.5;
  }
  function nested(inner, outer, state) {
    const [a, b] = [pieceOf(inner.ride), pieceOf(outer.ride)];
    if (!NESTED.has(`${a}>${b}`) || inner.engine !== outer.engine) return false;
    const [a0, a1] = AXIAL[a].map((s) => s + ds(inner, state));
    const [b0, b1] = AXIAL[b].map((s) => s + ds(outer, state));
    return Math.max(a0, b0) < Math.min(a1, b1);
  }
  return (a, b, state) => {
    const same = a.engine === b.engine;
    const dropA = (same && OPEN.test(b.name) && inShell(b, a, state)) || nested(a, b, state);
    const dropB = (same && OPEN.test(a.name) && inShell(a, b, state)) || nested(b, a, state);
    return [dropA, dropB];
  };
}
