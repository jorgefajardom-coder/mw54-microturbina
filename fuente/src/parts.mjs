// Ayudantes de dibujo comunes a las dos figuras: cada uno dibuja una pieza con el kit y registra su forma real
// en el auditor, así nada de lo que se ve escapa a la comprobación.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";

export function kitOf(P, R, { moveOf, housed = () => false, engineOf = () => undefined }) {
  const V = G.viewOf(P);
  const KS = G.scaleOf(P);
  const at = (point) => k.iso(point, P);
  const Sv = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const Faded = (list, style) => k.fadedSvg(list, style);
  const { nameFor } = R;
  const record = R.solid;

  function put(piece, ref, svg, { bias = 0, move, ride, shapes = [], name, route, chunk } = {}) {
    const rider = ride ?? piece;
    R.put({ piece, ride: rider, at: ref, bias, svg, move: move ?? moveOf(piece), shapes, name: name ?? nameFor(`${piece}.item`), route, chunk, housed: housed(rider), engine: engineOf(rider) });
  }

  function tubeItems(piece, route, r, { name, tone = "hi", bias = 0, move, ride, maxLength, spacing, owner, touch, limp = false, gaps = [], caps = true, rims, free = [false, false], rings } = {}) {
    const id = nameFor(name ?? `${piece}.tube`);
    R.route(id, route, r, { owner: owner ?? id, touch, limp, gaps, rims, free, piece, move: move ?? moveOf(piece), ride: ride ?? piece });
    tubePieces(route, r, P, { maxLength, spacing, gaps, caps, rings }).forEach((part, index) =>
      put(piece, part.mid, tubeSvg(part, { tone }), { bias, move, ride, name: `${id}:${index}`, route: id, chunk: index, shapes: [A.tube(part.points, part.radii)] }),
    );
    return id;
  }

  // Cuerpo torneado macizo (perfil cerrado al eje).
  function turned(piece, F, profile, style = {}, { extra = "", inner = "", bias = 0, slope, name, owner, move, ride } = {}) {
    const smooth = slope ? { slope, rows: 4 } : profile.some((p) => p[2]) ? { rows: 4 } : false;
    const paths = G.solidOf(profile, F, P, { smooth });
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    const id = nameFor(name ?? `${piece}.turned`);
    const shape = record(A.solid(F, profile, { name: id, owner, curve: smooth && !slope ? profile : undefined }));
    put(piece, G.pointOf(F, mid, 0, 0), Sv(paths, { tone: "hi", ...style, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape], move, ride });
    return shape;
  }

  // Cuerpo hueco: un meridiano cerrado que no toca el eje.
  function shell(piece, F, meridian, style = {}, { extra = "", inner = "", bias = 0, name, owner, move, ride } = {}) {
    const paths = G.lathe(meridian, F, P, {});
    const ss = meridian.map((p) => p[0]);
    const mid = (Math.min(...ss) + Math.max(...ss)) / 2;
    const id = nameFor(name ?? `${piece}.shell`);
    const shape = record(A.lathe(F, meridian, { name: id, owner }));
    put(piece, G.pointOf(F, mid, 0, 0), Sv(paths, { tone: "hi", ...style, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape], move, ride });
    return shape;
  }

  // Brida: un anillo aparte del cuerpo, así el contorno del cuerpo sigue su radio real.
  function flange(piece, F, s0, s1, rIn, rOut, { name, extra = "", tone = "hi", move, ride } = {}) {
    const id = nameFor(name ?? `${piece}.flange`);
    const shape = record(A.ring(F, s0, s1, rIn, rOut, { name: id }));
    put(piece, G.pointOf(F, (s0 + s1) / 2, 0, 0), Sv(G.ringBand(s0, s1, rIn, rOut, F, P, { bevel: 0.3 }), { tone }) + extra, { name: id, shapes: [shape], move, ride });
    return shape;
  }

  function boxAt(piece, plan, z, h, style = {}, { extra = "", bias = 0, bevel = 0.5, steps = 3, name, move } = {}) {
    const centre = [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
    const id = nameFor(name ?? `${piece}.box`);
    put(piece, centre, Sv(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, { bias, name: id, move, shapes: [record(A.slab(plan, z, h, { name: id }, steps))] });
  }

  // Saliente sobre una superficie curva: su base sigue al huésped (silla), así ninguna brida queda al aire.
  function boss(piece, centre, outward, r, length, { tone = "hi", bias = 0.1, name, host, ring = true, owner, move, ride } = {}) {
    const axis = G.unit3(outward);
    const F = G.frameAlong(centre, axis);
    const hosts = [host].flat().filter(Boolean);
    const id = nameFor(name ?? `${piece}.boss`);
    const face = ring && G.dot3(axis, V) > 0.15 ? Ln(G.circleOf(F, length, r * 0.55, P, 16), { tone: "faint" }) : "";
    if (!hosts.length) {
      put(piece, G.add3(centre, G.mul3(axis, length / 2)), Sv(G.disc(0, length, r, F, P), { tone }) + face, { bias, name: id, move, ride, shapes: [record(A.disc(F, 0, length, r, { name: id, owner }))] });
      return G.add3(centre, G.mul3(axis, length));
    }
    const inside = (p) => hosts.some((shape) => A.sdf(shape, p) < 0);
    const start = (angle) => {
      let lo = -2.5 * r;
      let hi = length;
      if (!inside(G.pointOf(F, lo, r, angle))) return 0;
      for (let step = 0; step < 40; step++) {
        const mid = (lo + hi) / 2;
        if (inside(G.pointOf(F, mid, r, angle))) lo = mid;
        else hi = mid;
      }
      return hi;
    };
    const low = Math.min(...Array.from({ length: 48 }, (_, index) => start((index / 48) * Math.PI * 2)));
    put(piece, G.add3(centre, G.mul3(axis, length / 2)), Sv(G.saddleOf(F, r, start, length, P), { tone }) + face, { bias, name: id, move, ride, shapes: [record(A.disc(F, low - 0.05, length, r, { name: id, owner, seated: true, cut: hosts }))] });
    return G.add3(centre, G.mul3(axis, length));
  }

  function cable(piece, points, { r = 0.7, bend = 6, name, shells = [false, false], free, tone = "mid", ride, move, maxLength = 16 } = {}) {
    const route = G.fillet(points, bend, 12, { P, tube: r });
    const total = G.pathLength(route);
    const SHELL = Math.max(1.2, r * 3.4);
    const gaps = [...(shells[0] ? [[0, SHELL]] : []), ...(shells[1] ? [[total - SHELL, total]] : [])];
    const id = tubeItems(piece, route, r, { name: name ?? `${piece}.cable`, tone, ride, move, maxLength, spacing: 1, gaps, free, limp: true, rims: shells.map((on) => (on ? r * 2 : r)) });
    [0, 1].forEach((index) => {
      const end = index ? route[route.length - 1] : route[0];
      if (!shells[index]) {
        put(piece, end, Dots([at(end)], { size: 0.55, tone: "hi" }), { bias: 0.15, ride, move, name: `${id}.end`, shapes: [A.ball(end, 0.55 / KS)] });
        return;
      }
      const tangent = G.tangentAlong(route, index ? total : 0);
      const F = G.frameAlong(end, tangent);
      const [s0, s1] = index ? [-SHELL, 0] : [0, SHELL];
      put(piece, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), Sv(G.disc(s0, s1, r * 2, F, P, { bevel: 0.2 }), { tone: "mid" }), { bias: 0.1, ride, move, name: `${id}.shell`, shapes: [record(A.disc(F, s0, s1, r * 2, { name: `${id}.shell`, owner: id }))] });
    });
    return route;
  }

  // Un agujero visto en una superficie cilíndrica: contorno cerrado, relleno oscuro.
  function holeOn(F, s, rBody, angle, rho) {
    const c = G.pointOf(F, s, rBody, angle);
    const t2 = G.tangentOf(F, angle);
    const ring = Array.from({ length: 16 }, (_, j) => {
      const phi = (j / 16) * Math.PI * 2;
      return at(G.add3(c, G.add3(G.mul3(F.a, rho * Math.cos(phi)), G.mul3(t2, rho * Math.sin(phi)))));
    });
    return `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
  }

  // La cara de una sección perpendicular al eje, como matriz afín: (x, y) locales = (r cos θ, r sin θ).
  function faceMatrix(F, s) {
    const o = at(G.pointOf(F, s, 0, 0));
    const u = at(G.pointOf(F, s, 1, 0));
    const v = at(G.pointOf(F, s, 1, Math.PI / 2));
    return `matrix(${(u[0] - o[0]).toFixed(4)} ${(u[1] - o[1]).toFixed(4)} ${(v[0] - o[0]).toFixed(4)} ${(v[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
  }

  return { V, KS, at, Sv, Ln, Dots, Faded, put, tubeItems, turned, shell, flange, boxAt, boss, cable, holeOn, faceMatrix, record, nameFor };
}

export const polyD = (list) => `M${list.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}`;
