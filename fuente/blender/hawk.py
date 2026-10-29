# Maqueta 1:7 de un entrenador a reacción tipo BAE Hawk (T1: 9,39 m de envergadura, 11,17 m de largo), la clase de
# avión en la que se ha instalado la MW54. Librea del portafolio (negro con naranja y brasa) y la insignia del agujero
# negro de la tarjeta del Stack en la deriva. 1 unidad = 1 mm, +X morro.
# Sin capas encima de la piel ni piezas metidas unas en otras: los colores son caras de la piel con otro material,
# las uniones se ajustan a la superficie del fuselaje y las superficies de mando, la cabina y las compuertas salen
# de cortes reales (la pieza ocupa el hueco que deja).
import math
import os
import bmesh
import bpy
from mathutils import Vector, Matrix
from lib import (material, lathe, cylinder_between, box, tube_path, join, tag, frame, TAU, to_object)

SPAN = 9390 / 7.0
GROUND = -180.0
ENGINE_TIP = (150.0, 0.0, 4.0)
WZ = -52.0

# Fuselaje: (x, ancho, alto, centro z) de secciones superelípticas.
ST = [
    (800, 2, 2, -6), (760, 34, 34, -4), (700, 62, 66, 0), (620, 90, 104, 6), (540, 110, 136, 12), (460, 120, 156, 16),
    (400, 124, 163, 17), (330, 128, 168, 18), (260, 132, 168, 16), (180, 134, 164, 13), (100, 134, 158, 10),
    (0, 130, 148, 6), (-60, 126, 142, 5), (-140, 118, 134, 4), (-260, 106, 120, 4), (-400, 90, 104, 8),
    (-540, 74, 88, 14), (-680, 58, 72, 18), (-796, 50, 58, 20),
]
P_EXP = 2.6
N_SEC = 48


def section_at(x):
    for a, b in zip(ST, ST[1:]):
        if b[0] <= x <= a[0]:
            f = (a[0] - x) / (a[0] - b[0])
            return (x,) + tuple(a[k] + (b[k] - a[k]) * f for k in (1, 2, 3))
    return ST[0] if x > ST[0][0] else ST[-1]


def superellipse(x, w, h, zc, n=N_SEC, p=P_EXP, y0=0.0):
    pts = []
    for k in range(n):
        t = TAU * k / n
        c, s = math.cos(t), math.sin(t)
        pts.append((x, y0 + w / 2 * math.copysign(abs(c) ** (2 / p), c), zc + h / 2 * math.copysign(abs(s) ** (2 / p), s)))
    return pts


def skin_y(x, z):
    """Semiancho del fuselaje a la altura z en la estación x (para ajustar raíces a la piel)."""
    _, w, h, zc = section_at(x)
    q = min(0.999, abs((z - zc) / (h / 2)))
    return w / 2 * (1 - q ** P_EXP) ** (1 / P_EXP)


def skin_top(x):
    _, w, h, zc = section_at(x)
    return zc + h / 2


def naca_t(x, t):
    return 5 * t * (0.2969 * math.sqrt(max(0.0, x)) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4)


def naca_cut(chord, t, a=0.0, b=1.0, n=22):
    """Contorno cerrado del tramo [a, b] de la cuerda de un NACA 00xx: (x, z) en mm."""
    if a == 0:
        xs = [a + (b - a) * (1 - math.cos(math.pi * k / n)) / 2 for k in range(n + 1)]
    else:
        xs = [a + (b - a) * k / n for k in range(n + 1)]
    up = [(x * chord, naca_t(x, t) * chord) for x in xs]
    lo = [(x * chord, -naca_t(x, t) * chord) for x in reversed(xs)]
    if a == 0:
        lo = lo[:-1]
    return up + lo


def panel_texture(name, base, size=512, seed=3, decal=None):
    """Pintura negra con líneas de panel y remaches; con `decal`, la insignia horneada en la propia textura."""
    import random
    random.seed(seed)
    img = bpy.data.images.new(name, size, size)
    px = [0.0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            n = (random.random() - 0.5) * 0.006
            line = (x % 128 < 2) or (y % 96 < 2)
            rivet = (x % 128 == 6 and y % 12 == 0) or (y % 96 == 6 and x % 16 == 0)
            k = 1.9 if line else (1.4 if rivet else 1.0)
            i = (y * size + x) * 4
            px[i:i + 4] = [base[0] * k + n, base[1] * k + n, base[2] * k + n, 1.0]
    if decal is not None:
        dw, dh = decal.size
        dpx = list(decal.pixels)
        u0, u1, v0, v1 = 0.18, 0.82, 0.30, 0.50
        for y in range(size):
            for x in range(size):
                u, v = x / size, y / size
                if u0 <= u <= u1 and v0 <= v <= v1:
                    du = int((u - u0) / (u1 - u0) * (dw - 1))
                    dv = int((v - v0) / (v1 - v0) * (dh - 1))
                    j = (dv * dw + du) * 4
                    a = dpx[j + 3]
                    i = (y * size + x) * 4
                    for c in range(3):
                        px[i + c] = px[i + c] * (1 - a) + dpx[j + c] * a
    img.pixels = px
    img.pack()
    return img


def materials():
    # Colores del portafolio en lineal: tinta #08070a, brasa #ff9a3c, naranja del disco #ff6a12, rojo del borde #db3208.
    ink = (0.010, 0.009, 0.012)
    hole = bpy.data.images.load(os.path.join(os.path.dirname(__file__), "assets", "stack-hole.png"), check_existing=True)
    return {
        "paint": material("Negro brillante", (1, 1, 1), 0.0, 0.3, coat=1.0, coat_rough=0.06, image=panel_texture("panel_ink", ink)),
        "fin": material("Negro con insignia", (1, 1, 1), 0.0, 0.3, coat=1.0, coat_rough=0.06, image=panel_texture("panel_fin", ink, decal=hole)),
        "orange": material("Naranja del disco", (1.0, 0.144, 0.006), 0.0, 0.32, coat=1.0, coat_rough=0.05),
        "ember": material("Rojo del borde", (0.71, 0.032, 0.0024), 0.0, 0.32, coat=1.0, coat_rough=0.05),
        "glow": material("Brasa", (1.0, 0.32, 0.045), 0.0, 0.32, coat=1.0, coat_rough=0.05),
        "paint_dark": material("Gris antirreflejo", (0.03, 0.03, 0.035), 0.0, 0.75),
        "glass": material("Cabina ahumada", (0.06, 0.08, 0.10), 0.0, 0.03, coat=1.0, coat_rough=0.02, transmission=0.5, ior=1.49, alpha=0.8),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
        "anod": material("Aluminio anodizado negro", (0.05, 0.05, 0.06), 1.0, 0.38),
        "wood": material("Contrachapado de abedul", (0.74, 0.60, 0.42), 0.0, 0.7),
        "thrust": material("Tubo de empuje", (0.70, 0.66, 0.60), 1.0, 0.35),
        "tank": material("Depósito", (0.86, 0.80, 0.62), 0.0, 0.25, transmission=0.6, alpha=0.75),
        "fuel": material("Queroseno con aceite", (0.85, 0.62, 0.18), 0.0, 0.05, transmission=0.8, alpha=0.7),
        "tygon": material("Tygon", (0.85, 0.85, 0.55), 0.0, 0.15, transmission=0.7, alpha=0.6),
        "festo": material("Festo azul", (0.05, 0.25, 0.75), 0.0, 0.35),
        "gasline": material("Tubo de gas", (0.75, 0.08, 0.06), 0.0, 0.4),
        "black": material("Plástico negro", (0.02, 0.02, 0.025), 0.0, 0.5),
        "pcb": material("ECU", (0.04, 0.04, 0.05), 0.2, 0.35),
        "lipo": material("Batería LiPo", (0.10, 0.25, 0.65), 0.0, 0.3, coat=0.6),
        "gascan": material("Botella de gas", (0.75, 0.10, 0.08), 0.8, 0.3, coat=0.5),
        "steel": material("Acero", (0.72, 0.73, 0.75), 1.0, 0.28),
        "seat": material("Asiento", (0.18, 0.20, 0.16), 0.0, 0.8),
        "light_red": material("Luz de navegación roja", (0.9, 0.05, 0.03), 0.0, 0.2, emission=((1, 0.1, 0.05), 2.0)),
        "light_green": material("Luz de navegación verde", (0.05, 0.8, 0.2), 0.0, 0.2, emission=((0.1, 1, 0.3), 2.0)),
    }


def loft(name, sections, mats, closed=True, caps=False, keep=lambda i, j: True, matof=lambda i, j: 0, uvscale=400.0, uvmap=None):
    """Superficie entre secciones. `keep(i, j)` quita caras (huecos), `matof(i, j)` elige el material de cada cara."""
    mats = mats if isinstance(mats, list) else [mats]
    bm = bmesh.new()
    rows = [[bm.verts.new(Vector(p)) for p in sec] for sec in sections]
    n = len(rows[0])
    layer = bm.loops.layers.uv.new("UVMap")
    lengths = [0.0]
    for i in range(1, len(rows)):
        lengths.append(lengths[-1] + (rows[i][0].co - rows[i - 1][0].co).length)
    for i in range(len(rows) - 1):
        for j in range(n if closed else n - 1):
            if not keep(i, j):
                continue
            jn = (j + 1) % n
            f = bm.faces.new([rows[i][j], rows[i][jn], rows[i + 1][jn], rows[i + 1][j]])
            f.material_index = matof(i, j)
            for loop, (ii, jj) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                loop[layer].uv = uvmap(loop.vert.co) if uvmap else (lengths[ii] / uvscale, jj / n * 2.0)
    if caps:
        bm.faces.new(list(reversed(rows[0])))
        bm.faces.new(rows[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = to_object(name, bm, None, None, sharp=50)
    for m in mats:
        ob.data.materials.append(m)
    return ob


def set_pivot(ob, pivot):
    """Pone el origen de la pieza en su bisagra, para girarla en el visor alrededor de su eje real."""
    pivot = Vector(pivot)
    ob.data.transform(Matrix.Translation(-pivot))
    ob.location = pivot


def build_hawk(M, root, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system, **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob

    # ── fuselaje en tres tramos; la cabina y la escotilla son la franja superior recortada, la línea naranja es
    #    pintura en la propia piel ──
    TOP = set(range(9, 16))
    SIDE = {N_SEC - 1, 0, N_SEC // 2 - 1, N_SEC // 2}
    CAN = (560, 330)
    HATCH = (300, -60)
    NOSE_WELL = (612, 450)
    BOT_R, BOT_L = (34, 35), (36, 37)
    xs = sorted(set([r[0] for r in ST] + [CAN[0], CAN[1], HATCH[0], HATCH[1], NOSE_WELL[0], NOSE_WELL[1]]), reverse=True)
    secs = [superellipse(*section_at(x)) for x in xs]

    def in_range(i, a, b):
        return a >= xs[i] and xs[i + 1] >= b

    def cheat(i, j):
        return 1 if j in SIDE and xs[i] <= 540 and xs[i + 1] >= -680 else 0

    iF, iM = xs.index(330), xs.index(-60)
    nose_hole = lambda i, j: in_range(i, *NOSE_WELL) and j in BOT_R + BOT_L
    front = loft("fus_front", secs[:iF + 1], [M["paint"], M["orange"]], keep=lambda i, j: not (in_range(i, *CAN) and j in TOP) and not nose_hole(i, j), matof=cheat)
    i0, i1 = xs.index(NOSE_WELL[0]), xs.index(NOSE_WELL[1])
    def inset(s, a, b, f=0.75):
        return tuple(s[a][c] + (s[b][c] - s[a][c]) * f for c in range(3))
    nose_doors = {
        1: loft("ndoor1", [[s[36], s[37], inset(s, 37, 38)] for s in secs[i0:i1 + 1]], M["paint"], closed=False),
        -1: loft("ndoor-1", [[inset(s, 35, 34), s[35], s[36]] for s in secs[i0:i1 + 1]], M["paint"], closed=False),
    }
    corners = [p for s in (secs[i0], secs[i1]) for p in (s[34], s[38])]
    nose_well = well_shell("nwell", corners, -8.0, M)
    mid = loft("fus_mid", secs[iF:iM + 1], [M["paint"], M["orange"]], keep=lambda i, j: not (in_range(i + iF, *HATCH) and j in TOP), matof=lambda i, j: cheat(i + iF, j))
    rear = loft("fus_rear", secs[iM:], [M["paint"], M["orange"]], matof=lambda i, j: cheat(i + iM, j))
    nz = section_at(-796)
    nozzle = lathe("nozzle_ring", frame((-796, 0, nz[3]), (1, 0, 0)), [(0, 18), (0, 23.0), (6, 22.0), (6, 18)], M["paint_dark"], steps=48)
    hatch = loft("hatch", [[s[k] for k in range(min(TOP), max(TOP) + 2)] for s in secs[xs.index(HATCH[0]):xs.index(HATCH[1]) + 1]], M["paint"], closed=False)
    canopy_rows = []
    for x in [x for x in xs if CAN[0] >= x >= CAN[1]]:
        s = superellipse(*section_at(x))
        bulge = 26 * math.sin(math.pi * (CAN[0] - x) / (CAN[0] - CAN[1])) ** 0.7
        row = []
        for k in range(min(TOP), max(TOP) + 2):
            t = (k - min(TOP)) / (max(TOP) + 1 - min(TOP))
            lift = bulge * math.sin(math.pi * t) ** 0.8
            px, py, pz = s[k]
            row.append((px, py * (1 + lift / 140), pz + lift))
        canopy_rows.append(row)
    canopy = loft("canopy", canopy_rows, M["glass"], closed=False)

    # ── tomas de aire: forman parte del tramo central, abiertas a la cámara de admisión, borde en naranja ──
    intakes = []
    for side in (1, -1):
        rows = []
        for x, w, h, zc in ((318, 30, 66, 4), (300, 38, 78, 4), (200, 40, 82, 6), (90, 30, 70, 8), (-50, 6, 30, 10)):
            off = skin_y(x, zc) + w / 2 - 6
            rows.append(superellipse(x, w, h, zc, n=32, p=2.2, y0=side * off))
        intakes.append(loft(f"intake{side}", rows, [M["paint"], M["orange"]], matof=lambda i, j: 1 if i == 0 else 0))
        x, w, h, zc = 318, 30, 66, 4
        off = skin_y(x, zc) + w / 2 - 6
        intakes.append(loft(f"mouth{side}", [superellipse(x, w - 1.5, h - 1.5, zc, n=32, p=2.2, y0=side * off), superellipse(x - 30, w - 3, h - 3, zc, n=32, p=2.2, y0=side * off)], M["paint_dark"]))
    part("fuselaje.delantero", [front], "airframe", 2, (360, 0, 0), "Fuselaje delantero", "airframe")
    part("fuselaje.central", [mid] + intakes, "airframe", 0, (0, 0, 0), "Fuselaje central con las tomas de aire", "airframe")
    part("fuselaje.trasero", [rear, nozzle], "airframe", 1, (-360, 0, 0), "Fuselaje trasero y tobera", "airframe")
    part("cabina", [canopy], "airframe", 31, (0, 0, 240), "Cabina en tándem", "airframe")
    part("escotilla", [hatch], "airframe", 32, (0, 0, 280), "Escotilla del motor", "airframe")
    part("asientos", [box(f"seat{x}", (x, 0, 34), (40, 40, 46), M["seat"], bevel=4) for x in (500, 390)], "airframe", 30, (0, 0, 200), "Asientos (maqueta)", "airframe")

    # ── alas: raíz ajustada a la piel, flecha de ~26°, perfil del 11 al 9 %, diedro de 2°;
    #    flaps y alerones cortados en su línea de bisagra; puntas en rojo de borde ──
    half = SPAN / 2
    LE = lambda y: 150 - 0.53 * (y - 55)
    CH = lambda y: 380 - 0.39 * (y - 55)
    TT = lambda y: 0.11 - 0.02 * (y - 55) / (half - 55)
    DZ = lambda y: math.tan(math.radians(2.0)) * (y - 55)

    def wing_row(y, side, a, b, root=False):
        pts = []
        for x, z in naca_cut(CH(y), TT(y), a, b):
            wx, wz = LE(y) - x, WZ + DZ(y) + z
            pts.append((wx, side * (skin_y(wx, wz) + 1.0 if root else y), wz))
        return pts

    HINGE_F, HINGE_A = 0.72, 0.74
    main_wells = {}
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        rows = lambda a, b, ys, root=False: [wing_row(y, side, a, b, root and k == 0) for k, y in enumerate(ys)]
        W0 = rows(0, 1, [55, 110], True)
        W1 = rows(0, HINGE_F, [110, 114, 140, 238, 244, 330])
        xs_c = [HINGE_F * (1 - math.cos(math.pi * k / 22)) / 2 for k in range(23)]
        lower_x = {23 + m: xs_c[22 - m] for m in range(22)}
        door_j = {j for j in range(23, 44) if 0.22 <= lower_x[j] <= 0.50 and 0.22 <= lower_x.get(j + 1, 0) <= 0.50}
        door_face = lambda i, j: i in (1, 2, 3) and j in door_j
        mdoor = loft(f"mdoor{side}", W1, M["paint"], keep=lambda i, j: i == 2 and j in door_j)
        idoor = loft(f"idoor{side}", W1, M["paint"], keep=lambda i, j: i == 1 and j in door_j)
        # holgura de 2 mm alrededor de cada compuerta, como en el avión real
        for d in (mdoor, idoor):
            vs = [v for v in d.data.vertices if d.data.polygons and any(v.index in p.vertices for p in d.data.polygons)]
            cx = sum(v.co.x for v in vs) / len(vs)
            span = max(v.co.x for v in vs) - min(v.co.x for v in vs)
            k = (span - 4.0) / span
            for v in vs:
                v.co.x = cx + (v.co.x - cx) * k
        jj = sorted(door_j)
        hole = [W1[i][j] for i in (1, 4) for j in (jj[0], jj[-1] + 1)]
        main_wells[side] = (mdoor, well_shell(f"mwell{side}", hole, -31.0, M), idoor, W1[1][jj[0]], W1[1][jj[-1] + 1])
        wing = [loft(f"w0{side}", W0, M["paint"]), loft(f"w1{side}", W1, M["paint"], keep=lambda i, j: not door_face(i, j)), main_wells[side][1],
                loft(f"w2{side}", rows(0, 1, [330, 380]), M["paint"]),
                loft(f"w3{side}", rows(0, HINGE_A, [380, 520, 640, half - 22]), M["paint"]),
                loft(f"w4{side}", rows(0, 1, [half - 22, half]), M["ember"], caps=True)]
        tz = WZ + DZ(half)
        wing.append(cylinder_between(f"navlight{side}", (LE(half) - 0.35 * CH(half), side * half, tz), (LE(half) - 0.35 * CH(half), side * (half + 3), tz), 3.0, M["light_red" if side > 0 else "light_green"], steps=12))
        part(f"ala.{tagname}", wing, "airframe", 5, (0, side * 420, -40), f"Ala {tagname}", "airframe")
        flap = part(f"flap.{tagname}", [loft(f"flap{side}", rows(HINGE_F + 0.004, 1, [110.3, 200, 329.5]), M["paint"], caps=True)], "airframe", 6, (-120, side * 300, -60), f"Flap {tagname}", "airframe", control="flap", range=[0, 40], sign=side)
        ail = part(f"aleron.{tagname}", [loft(f"ail{side}", rows(HINGE_A + 0.004, 1, [380.5, 520, 640, half - 22.5]), M["paint"], caps=True)], "airframe", 6, (-80, side * 480, -40), f"Alerón {tagname}", "airframe", control="aileron", range=[-22, 22], sign=side)
        for ob, (ya, yb), frac in ((flap, (110.3, 329.5), HINGE_F), (ail, (380.5, half - 22.5), HINGE_A)):
            pa = Vector((LE(ya) - frac * CH(ya), side * ya, WZ + DZ(ya)))
            pb = Vector((LE(yb) - frac * CH(yb), side * yb, WZ + DZ(yb)))
            ob["hinge"] = list((pb - pa).normalized())
            set_pivot(ob, pa)

    # ── estabilizador monobloque (anhedral de 10°), con su eje al 25 % de la cuerda de raíz ──
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        rows = []
        for y, le_x, c in ((None, -540, 160), (313, -700, 70)):
            row = []
            for x, z in naca_cut(c, 0.08):
                wx = le_x - x
                wz = 30 + z if y is None else 30 - math.tan(math.radians(10)) * (313 - 40) + z
                row.append((wx, side * (skin_y(wx, wz) + 0.3 if y is None else y), wz))
            rows.append(row)
        ob = part(f"estabilizador.{tagname}", [loft(f"tail{side}", rows, M["paint"], caps=True)], "airframe", 7, (-120, side * 260, 0), f"Estabilizador {tagname} (monobloque)", "airframe", control="elevator", range=[-18, 14])
        ob["hinge"] = [0.0, side * 1.0, 0.0]
        set_pivot(ob, (-580, side * skin_y(-580, 30), 30))

    # ── deriva con la insignia horneada en su textura y el timón cortado en su bisagra ──
    def fin_rows(a, b, zs):
        rows = []
        for z, le, c in zs:
            row = []
            for x, y in naca_cut(c, 0.09, a, b):
                fx = le - x
                row.append((fx, y, skin_top(fx) + 0.25 if z is None else z))
            rows.append(row)
        return rows
    FIN = ((None, -380, 360), (248, -605, 150))
    fin = loft("fin", fin_rows(0, 0.7, FIN), [M["fin"]], uvmap=lambda co: (min(1, max(0, (-co.x - 400) / 300)), min(1, max(0, (co.z - 60) / 190))))
    tipband = loft("finband", fin_rows(0, 1, ((248, -605, 150), (270, -620, 130))), M["glow"], caps=True)
    part("deriva", [fin, tipband], "airframe", 8, (0, 0, 300), "Deriva con la insignia del agujero negro", "airframe")
    rud = part("timon", [loft("rudder", fin_rows(0.703, 1, FIN), M["paint"], caps=True)], "airframe", 9, (-160, 0, 300), "Timón de dirección", "airframe", control="rudder", range=[-25, 25])
    ra = Vector((-380 - 0.7 * 360, 0, skin_top(-380 - 0.7 * 360)))
    rb = Vector((-605 - 0.7 * 150, 0, 248))
    rud["hinge"] = list((rb - ra).normalized())
    set_pivot(rud, ra)

    # ── tren retráctil: cada pata lleva su compuerta (la piel recortada del pozo) y gira 88° hacia dentro hasta que
    #    la rueda queda plana en el ala y la compuerta cierra a ras; el de morro gira hacia atrás bajo dos compuertas ──
    def wheel(name, c, r, w, axis=(0, 1, 0)):
        Fw = frame(Vector(c) - Vector(axis) * (w / 2), axis)
        prof = [(0, r * 0.45), (0.0, r * 0.8)] + [(w / 2 - w / 2 * math.cos(math.pi * i / 10), r * 0.8 + r * 0.2 * math.sin(math.pi * i / 10)) for i in range(11)] + [(w, r * 0.8), (w, r * 0.45)]
        return [lathe(name + "t", Fw, prof, M["rubber"], steps=48), lathe(name + "h", Fw, [(w * 0.1, 3), (w * 0.1, r * 0.46), (w * 0.9, r * 0.46), (w * 0.9, 3)], M["alu"], steps=40)]
    MAIN_Y, MAIN_X, MAIN_R, MAIN_W, RETRACT = 238.0, -40.0, 25.0, 14.0, 88.0
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        frac = (LE(MAIN_Y) - MAIN_X) / CH(MAIN_Y)
        skin_low = WZ + DZ(MAIN_Y) - naca_t(frac, TT(MAIN_Y)) * CH(MAIN_Y)
        pivot = Vector((MAIN_X, side * MAIN_Y, skin_low + 3.0))
        axle = Vector((MAIN_X, side * MAIN_Y, GROUND + MAIN_R))
        leg = [cylinder_between(f"ml{side}", pivot, axle + Vector((0, 0, 6)), 3.0, M["steel"], steps=20)]
        leg += wheel(f"mw{side}", axle + Vector((0, side * -(MAIN_W / 2 + 5), 0)), MAIN_R, MAIN_W)
        door = main_wells[side][0]
        # la compuerta se construye cerrada en el ala y se lleva a la posición de tren abajo
        ext = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(RETRACT), 4, Vector((side, 0, 0))) @ Matrix.Translation(-pivot)
        door.data.transform(ext)
        ob = part(f"tren.{tagname}", leg + [door], "airframe", 10, (0, side * 60, -160), f"Tren principal {tagname} con su compuerta", "gear", control="gear", range=[0, RETRACT])
        ob["hinge"] = [1.0 * side, 0.0, 0.0]
        set_pivot(ob, pivot)
        # compuerta interior: bisagra en su borde hacia el fuselaje; abierta (colgando) con el tren abajo
        idoor, ea, eb = main_wells[side][2], Vector(main_wells[side][3]), Vector(main_wells[side][4])
        axis = (eb - ea).normalized() * side
        opened = Matrix.Translation(ea) @ Matrix.Rotation(math.radians(85), 4, axis) @ Matrix.Translation(-ea)
        idoor.data.transform(opened)
        ob = part(f"compuerta.{tagname}", [idoor], "airframe", 11, (0, side * 40, -140), f"Compuerta interior del tren {tagname}", "gear", control="door", range=[0, 85])
        ob["hinge"] = list(axis)
        set_pivot(ob, ea)
    NOSE_X = 600.0
    sx = section_at(NOSE_X)
    npivot = Vector((NOSE_X, 0, sx[3] - sx[2] / 2 + 14))
    naxle = Vector((NOSE_X, 0, GROUND + 22))
    nose = [cylinder_between("nl", npivot, naxle + Vector((0, 0, 14)), 4.5, M["steel"], steps=20), box("nfork", (NOSE_X, 0, GROUND + 34), (10, 22, 20), M["alu"])] + wheel("nw", naxle, 22, 12)
    ob = part("tren.morro", nose, "airframe", 10, (0, 0, -160), "Tren de morro", "gear", control="gear", range=[0, 90])
    ob["hinge"] = [0.0, -1.0, 0.0]
    set_pivot(ob, npivot)
    for side in (1, -1):
        d = nose_doors[side]
        k = 38 if side > 0 else 34
        edge, edge2 = Vector(secs[i0][k]), Vector(secs[i1][k])
        axis = (edge - edge2).normalized() * side
        opened = Matrix.Translation(edge) @ Matrix.Rotation(math.radians(80), 4, axis) @ Matrix.Translation(-edge)
        d.data.transform(opened)
        ob = part(f"compuerta.morro.{'izquierda' if side > 0 else 'derecha'}", [d], "airframe", 11, (0, side * 40, -140), "Compuerta del tren de morro", "gear", control="door", range=[0, 80])
        ob["hinge"] = list(axis)
        set_pivot(ob, edge)
    part("pozo.morro", [nose_well], "airframe", 12, (0, 0, -120), "Pozo del tren de morro", "gear")

    # ── instalación del motor: carriles, montura de dos piezas, tubo de empuje hasta la tobera ──
    EF = frame(ENGINE_TIP, (-1, 0, 0))
    mount = [box("rail_l", (ENGINE_TIP[0] - 80, 40, ENGINE_TIP[2] - 53), (120, 8, 6), M["wood"]), box("rail_r", (ENGINE_TIP[0] - 80, -40, ENGINE_TIP[2] - 53), (120, 8, 6), M["wood"])]
    for s_ in (64, 96):
        mount.append(lathe(f"band{s_}", EF, [(s_ - 4, 44.45), (s_ - 4, 46.6), (s_ + 4, 46.6), (s_ + 4, 44.45)], M["anod"], steps=72))
        mount.append(box(f"foot{s_}", (ENGINE_TIP[0] - s_, 0, ENGINE_TIP[2] - 48.6), (10, 88, 3), M["anod"]))
    part("motor.montura", mount, "systems", 20, (0, 0, -220), "Montura de dos piezas de Wren", "mounts")
    x0 = ENGINE_TIP[0] - 167 - 6
    tail = section_at(-786)
    start = Vector((x0, 0, ENGINE_TIP[2]))
    end = Vector((-786, 0, tail[3]))
    TF = frame(start, end - start)
    L_TT = (end - start).length
    part("tubo_empuje", [lathe("thrusttube", TF, [(0, 38), (12, 32), (L_TT, 17.6), (L_TT, 17.0), (12, 31.4), (0, 37.4)], M["thrust"], steps=64)], "systems", 21, (-260, 0, 0), "Tubo de empuje (pared simple)", "engines")
    return parts, EF


def install_systems(M, root, fittings, log=lambda msg: None):
    """Equipos y líneas, con las líneas terminando en los racores reales del motor ya colocado."""
    parts = []

    def part(name, obs, group, order, explode, label, system, **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob
    TZ = -42
    part("bandeja", [box("tray", (320, 0, TZ - 2), (240, 80, 4), M["wood"])], "systems", 22, (0, 0, -180), "Bandeja de equipos", "airframe")
    part("bandeja.morro", [box("tray2", (575, 0, -2), (130, 52, 4), M["wood"])], "systems", 22, (0, 0, -160), "Bandeja del morro, sobre el pozo del tren", "airframe")
    part("deposito", [box("tank", (270, 0, TZ + 44), (130, 76, 88), M["tank"], bevel=10), box("fuelin", (270, 0, TZ + 26), (120, 68, 48), M["fuel"], bevel=8), cylinder_between("cap", (310, 0, TZ + 88), (310, 0, TZ + 95), 8, M["black"], steps=24)], "systems", 23, (0, 0, 300), "Depósito principal", "fuel")
    part("hopper", [cylinder_between("hop", (158, 0, TZ + 22), (196, 0, TZ + 22), 22, M["tank"], steps=48), cylinder_between("hopf", (160, 0, TZ + 16), (194, 0, TZ + 16), 16, M["fuel"], steps=32)], "systems", 24, (0, 0, 280), "Hopper con clunk de fieltro", "fuel")
    part("bomba", [cylinder_between("pump", (380, -28, TZ + 11), (420, -28, TZ + 11), 11, M["anod"], steps=32), box("ph", (426, -28, TZ + 11), (12, 22, 22), M["alu"])], "systems", 25, (0, -40, 260), "Bomba de combustible", "pumps")
    part("valvula.combustible", [box("v1", (410, 24, TZ + 7), (22, 16, 14), M["black"]), cylinder_between("v1c", (410, 24, TZ + 14), (410, 24, TZ + 21), 5.5, M["festo"], steps=20)], "systems", 26, (0, 40, 260), "Electroválvula de combustible", "pumps")
    part("valvula.gas", [box("v2", (365, 22, TZ + 6), (20, 12, 12), M["black"]), cylinder_between("v2c", (365, 22, TZ + 12), (365, 22, TZ + 19), 5, M["gasline"], steps=20)], "systems", 27, (0, 40, 240), "Electroválvula de gas", "gas")
    part("ecu", [box("ecu", (358, 38, TZ + 6), (26, 18, 12), M["pcb"], bevel=1.5)], "systems", 28, (0, 30, 300), "ECU", "ecu")
    part("gas", [cylinder_between("gas", (530, 0, 15), (585, 0, 15), 15, M["gascan"], steps=40)], "systems", 29, (0, 0, 280), "Botella de gas de arranque", "gas")
    part("radio", [box("rx", (600, 0, 6), (22, 22, 12), M["black"], bevel=1), box("bat1", (632, 0, 8), (30, 22, 16), M["lipo"], bevel=2)], "systems", 30, (220, 0, 120), "Receptor y batería", "radio")
    fp, fn = fittings["fuel"]
    gp, gn = fittings["gas"]
    lines = [tube_path("tyg1", [(205, 26, TZ + 8), (148, 26, TZ + 8), (148, 0, TZ + 22), (158, 0, TZ + 22)], 1.6, M["tygon"], bend=5),
             tube_path("tyg2", [(177, -22.5, TZ + 22), (177, -50, TZ + 22), (350, -50, TZ + 11), (366, -28, TZ + 11), (380, -28, TZ + 11)], 1.4, M["tygon"], bend=6),
             tube_path("festo1", [(432, -28, TZ + 14), (444, -28, TZ + 14), (444, 30, TZ + 7), (430, 24, TZ + 7), (421, 24, TZ + 7)], 1.2, M["festo"], bend=5),
             tube_path("festo2", [(399, 24, TZ + 7), (392, 24, TZ + 7), (386, 32, TZ + 7), (384, 34, 60), (220, 34, 62), tuple(fp + fn * 10), tuple(fp)], 1.2, M["festo"], bend=10),
             tube_path("gas1", [(530, 0, 15), (523, 0, 15), (523, 28, 8), (480, 34, 0), (392, 34, TZ + 6), (382, 22, TZ + 6), (375, 22, TZ + 6)], 0.9, M["gasline"], bend=5),
             tube_path("gas2", [(355, 22, TZ + 6), (349, 22, TZ + 6), (343, 14, TZ + 6), (341, 14, 72), (220, 14, 72), tuple(gp + gn * 10), tuple(gp)], 0.9, M["gasline"], bend=8)]
    part("lineas", lines, "systems", 31, (0, 0, 240), "Líneas: Tygon al hopper y la bomba, Festo y gas al motor", "fuel")
    return parts


def well_shell(name, corners, z_top, M):
    """Pozo del tren: las paredes y el techo que hay detrás del hueco de la compuerta (abierto por abajo)."""
    from lib import hull
    pts = [Vector(c) for c in corners] + [Vector((c[0], c[1], z_top)) for c in corners]
    ob = hull(name, pts, M["paint_dark"])
    me = ob.data
    low = min(v.co.z for v in me.vertices)
    bm = bmesh.new()
    bm.from_mesh(me)
    kill = [f for f in bm.faces if f.normal.z < -0.5]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(me)
    bm.free()
    return ob


def check_overlaps(obs, shrink=0.15):
    """Pares de piezas que se interpenetran de verdad: cada malla se encoge `shrink` mm hacia dentro (por la normal
    de sus vértices), así un contacto a ras no cuenta y una pieza metida en otra sí."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    trees = {}
    for ob in obs:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        mw = ob.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        scale = mw.to_scale()[0]
        verts = [mw @ (v.co - v.normal * (shrink / max(scale, 1e-9) * 0.001 / 0.001 if False else shrink)) for v in me.vertices]
        trees[ob.name] = BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in me.polygons], epsilon=0.0)
        ev.to_mesh_clear()
    names = sorted(trees)
    bad = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            hits = trees[a].overlap(trees[b])
            if hits:
                bad.append((a, b, len(hits)))
    return bad
