# Revisa que las piezas no se atraviesen: con el avión armado, en cada paso del despiece (por el mismo camino que sigue
# el visor) y con los mandos y compuertas en sus extremos. Mide la penetración de una pieza en otra en mm.
# Uso: python blender/check_overlap.py hawk|sr72|f22|sr71|f14 [umbral_mm]
import importlib
import json
import os
import re
import sys

import bpy
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402

name = next((a for a in sys.argv[1:] if a in ("sr72", "f22", "sr71", "f14", "hawk")), "sr72")
LIMIT = next((float(a) for a in sys.argv[1:] if re.fullmatch(r"[\d.]+", a)), 2.0 if name == "hawk" else 8.0)
ROOT = os.path.dirname(HERE)
sc = bpy.data.scenes.new(name.upper())
for other in list(bpy.data.scenes):
    if other != sc:
        bpy.data.scenes.remove(other)
if name == "hawk":
    # la maqueta 1:7 con su MW54, como blender/build_headless.py; el orden y los caminos son los de web/core.js
    import engine
    import hawk
    model = json.load(open(os.path.join(HERE, "model.json"), encoding="utf8"))
    meta = hawk.engine_meta(model)
    with bpy.context.temp_override(scene=sc):
        root = lib.empty("Avion_MW54")
        AM, EM = hawk.materials(), engine.materials()
        _, EF = hawk.build_hawk(AM, root)
        eroot, _, fit = engine.build_engine("MW54", EM, parent=root, location=tuple(EF[0]), meta=meta)
        lib.tag(eroot, part="MW54", group="engine", order=40, explode=[0, 0, 300], label="Wren MW54", system="engines")
        hawk.install_systems(AM, root, {k: (EF[0] + p, n) for k, (p, n) in fit.items()}, lambda m: None)
    ENGINE, LATE = "MW54", []
    for o in root.children_recursive:
        if o.get("control") in ("gear", "door"):
            side = (o.location.y > 0) - (o.location.y < 0)
            o["explode"] = [250, side * 260, 0] if side else [220, 0, 0]
else:
    cfg = open(os.path.join(ROOT, "web", name, "config.js"), encoding="utf8").read()
    ENGINE = re.search(r'engine:\s*"([^"]+)"', cfg).group(1)
    LATE = re.findall(r'"([^"]+)"', re.search(r"late:\s*\[([^\]]*)\]", cfg).group(1))
    meta = json.load(open(os.path.join(ROOT, "web", name, "parts.json"), encoding="utf8"))
    with bpy.context.temp_override(scene=sc):
        root = lib.empty(name.upper())
        M = importlib.import_module(name).materials()
        importlib.import_module(name).__dict__[f"build_{name}"](M, root, meta)
layer = sc.view_layers[0]
layer.update()

meshes = [o for o in root.children_recursive if o.type == "MESH" and len(o.data.polygons)]
parts = [o for o in root.children_recursive if "part" in o.keys()]
label = lambda o: o.get("label") or o.name
partOf = {}
for o in meshes:
    p = o
    while p is not None and "part" not in p.keys() and "subcontrol" not in p.keys():
        p = p.parent
    partOf[o] = p or o


def related(a, b):
    """Piezas que van juntas por diseño: una dentro de la jerarquía de la otra (la compuerta y su góndola)."""
    pa, pb = partOf[a], partOf[b]
    return pa == pb or pa in pb.children_recursive or pb in pa.children_recursive or pa.parent == pb or pb.parent == pa


cache = {}


def bvh(o):
    key = (o.name, tuple(round(x, 3) for row in o.matrix_world for x in row))
    if cache.get(o.name, (None,))[0] != key:
        mw = o.matrix_world
        verts = [mw @ v.co for v in o.data.vertices]
        tree = BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in o.data.polygons])
        lo = Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts)))
        hi = Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))
        cache[o.name] = (key, tree, verts, lo, hi)
    return cache[o.name][1:]


DIRS = (Vector((0.267, 0.534, 0.802)), Vector((-0.802, 0.267, 0.534)), Vector((0.534, -0.802, -0.267)))


def inside(tree, p):
    """Punto dentro de un sólido: paridad de cortes en tres rayos y mayoría (tolera mallas no del todo cerradas)."""
    votes = 0
    for d in DIRS:
        n, o = 0, p.copy()
        while n < 64:
            hit = tree.ray_cast(o, d)
            if hit[0] is None:
                break
            n += 1
            o = hit[0] + d * 0.01
        votes += n % 2
    return votes >= 2


def depth(a, b):
    """Penetración de a en b: si sus triángulos se cruzan, la mayor distancia a la que un vértice de uno queda dentro
    del otro (en mm) y cuántos pares de triángulos se cortan."""
    ta, va, la, ha = bvh(a)
    tb, vb, lb, hb = bvh(b)
    if any(la[i] > hb[i] or lb[i] > ha[i] for i in range(3)):
        return 0.0, 0
    pairs = ta.overlap(tb)
    if not pairs:
        return 0.0, 0
    worst = 0.0
    for vx, ty, lo, hi in ((va, tb, lb, hb), (vb, ta, la, ha)):
        for v in vx:
            if any(v[i] < lo[i] or v[i] > hi[i] for i in range(3)):
                continue
            dist = ty.find_nearest(v)[3]
            if dist > worst and inside(ty, v):
                worst = dist
    return worst, len(pairs)


def scan(movers, others, tag):
    found = []
    for a in movers:
        for b in others:
            if a == b or related(a, b):
                continue
            d, n = depth(a, b)
            if n and d > LIMIT:
                found.append((d, n, a, b))
    for d, n, a, b in sorted(found, key=lambda f: -f[0]):
        print(f"  [{tag}] {label(partOf[a])} ↔ {label(partOf[b])}: {d:.0f} mm, {n} cruces")
    return found


def meshes_of(p):
    return [o for o in meshes if o == p or o in p.children_recursive]


issues = 0
print(f"\n{name.upper()} · {len(parts)} piezas, {len(meshes)} sólidos, umbral {LIMIT:g} mm")

# 1) armado
print("armado")
found = []
for i, a in enumerate(meshes):
    for b in meshes[i + 1:]:
        if related(a, b):
            continue
        d, n = depth(a, b)
        if n and d > LIMIT:
            found.append((d, n, a, b))
for d, n, a, b in sorted(found, key=lambda f: -f[0]):
    print(f"  {label(partOf[a])} ↔ {label(partOf[b])}: {d:.0f} mm, {n} cruces")
issues += len(found)

# 2) mandos y compuertas en sus extremos
print("mandos y compuertas")
SWEEP = 48


def turn(o, axis, deg):
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = REST[o] @ Quaternion(Vector(axis).normalized(), deg * 3.14159265 / 180)


movers = [o for o in root.children_recursive if ("control" in o.keys() or "subcontrol" in o.keys()) and "hinge" in o.keys()]
REST = {}
for o in movers:
    o.rotation_mode = "QUATERNION"
    REST[o] = o.rotation_quaternion.copy()
EXTREMES = {"ramp": (0, -18), "suckin": (0, 22), "tertiary": (0, 16), "bypass": (0, -16), "ejector": (5, -6), "iris": (6, -8)}
for o in movers:
    kind = o.get("control") or o.get("subcontrol")
    if kind == "sweep":
        ends = (0, -SWEEP * o.get("sign", 1))
    elif kind == "ramp":
        ends = (0, -max(o["range"]))
    elif kind in EXTREMES:
        ends = EXTREMES[kind]
    elif "range" in o.keys():
        ends = tuple(o["range"])
    else:
        continue
    for deg in ends:
        turn(o, o["hinge"], deg)
        layer.update()
        issues += len(scan(meshes_of(o), [m for m in meshes if m not in meshes_of(o)], f"{kind} {deg:+g}°"))
    turn(o, o["hinge"], 0)
layer.update()

# 3) despiece pieza por pieza, por el camino del visor (look.js: disassemblyOrder y organicPose)
print("despiece")
offset = {p: Vector(p.get("explode", [0, 0, 0])) for p in parts}
home = {p: p.location.copy() for p in parts}
moving = [p for p in parts if offset[p].length > 1e-6]
if name == "hawk":
    is_gear = lambda p: (p.get("control") == "gear" and p["part"] != "tren.morro") or p.get("control") == "door"
    is_late = lambda p: p.get("group") in ("airframe", "systems") and p.get("order", 0) >= 30
else:
    is_gear = lambda p: p["part"].startswith("tren")
    is_late = lambda p: any(p["part"].startswith(k) for k in LATE)
is_engine = lambda p: p.get("group") == ENGINE
eroot = next((p for p in parts if p.get("group") == "engine" and p["part"] == ENGINE), None)
by_order = lambda p: -p.get("order", 0)
gear = sorted([p for p in moving if is_gear(p)], key=by_order)
late = sorted([p for p in moving if not is_gear(p) and is_late(p) and not is_engine(p) and p != eroot], key=by_order)
engine = sorted([p for p in moving if is_engine(p) and p != eroot], key=lambda p: p.get("out", 100 - p.get("order", 0)))
rest = sorted([p for p in moving if p not in gear + late + engine and p != eroot], key=by_order)
order = gear + late + ([eroot] if eroot in moving else []) + engine + rest
assembled = {}
for i, a in enumerate(meshes):
    for b in meshes[i + 1:]:
        if not related(a, b):
            d, n = depth(a, b)
            if n:
                for key in ((partOf[a], partOf[b]), (partOf[b], partOf[a])):
                    assembled[key] = max(assembled.get(key, 0), d)
                    assembled[key, "n"] = assembled.get((key, "n"), 0) + n


def place(p, k):
    """Posición local en la fracción k del camino: primero horizontal y luego vertical, al revés con path = "v", o
    pasando por el punto `via`."""
    off = offset[p]
    V = Vector((0, 0, off.z))
    H = Vector((off.x, off.y, 0))
    first, second = (V, H) if p.get("path") == "v" else (H, V)
    L = off.length
    if "via" in p.keys():
        via = Vector(p["via"])
        p.location = home[p] + via * min(1, k * 2) + (off - via) * max(0, (k - 0.5) * 2)
    elif first.length < 0.05 * L or second.length < 0.05 * L:
        p.location = home[p] + off * k
    else:
        p.location = home[p] + first * min(1, k * 2) + second * max(0, (k - 0.5) * 2)


for p in order:
    mine = meshes_of(p)
    others = [m for m in meshes if m not in mine]
    base, hits = {}, {}
    for k in (0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0):
        place(p, k)
        layer.update()
        for a in mine:
            for b in others:
                if related(a, b):
                    continue
                d, n = depth(a, b)
                key = (partOf[a], partOf[b])
                if k == 0:
                    base[key] = max(base.get(key, 0), d, assembled.get(key, 0))
                    base[key, "n"] = base.get((key, "n"), 0) + n + assembled.get((key, "n"), 0)
                elif n and (d > base.get(key, 0) + LIMIT or (n >= 4 and not base.get((key, "n")))):
                    hits[key] = max(hits.get(key, (0, 0)), (d, k))
    for (a, b), (d, k) in sorted(hits.items(), key=lambda h: -h[1][0]):
        print(f"  {label(p)}: {label(a)} ↔ {label(b)} a {k * 100:.0f} % del camino, {d:.0f} mm" if d > LIMIT else f"  {label(p)}: {label(a)} ↔ {label(b)} a {k * 100:.0f} % del camino, se cruzan")
    issues += len(hits)

print(f"{name.upper()}: {issues} cruces por encima de {LIMIT:g} mm")
