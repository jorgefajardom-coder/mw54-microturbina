# Lockheed Martin SR-72 según el concepto público de Skunk Works (2013): cuerpo sustentador con aristas (chines), ala en
# delta cortada con elevones, dos derivas inclinadas hacia fuera y dos motores de ciclo combinado con turbina (TBCC) en
# disposición "over-under": un turbofán de la clase F100/F110 arriba y un estatorreactor de modo dual (ramjet/scramjet)
# abajo, que comparten la entrada de aire y la tobera. Una compuerta divisora pasa el aire de un camino al otro hacia
# Mach 3. Escala real, 1 unidad = 1 mm, +X morro, +Y izquierda, +Z arriba. Las cotas son estimaciones a partir de las
# imágenes del concepto; Lockheed no ha publicado planos.
import math
import bmesh
import bpy
from mathutils import Vector
from lib import (material, lathe, cylinder_between, box, join, tag, frame, point, TAU, to_object, empty, hull)
from hawk import loft, naca_cut, panel_textures, image_of, set_pivot

GROUND = -3600.0
ENGINE_Y = 1350.0
ENGINE_X = 3600.0

# Fuselaje: (x, ancho, alto por encima de la arista, alto por debajo, z de la arista)
ST = [
    (15000, 40, 10, 10, -40), (14200, 760, 190, 130, -40), (12500, 1800, 470, 330, -20), (10000, 3000, 780, 520, 0),
    (7000, 3800, 1000, 700, 20), (3500, 4200, 1080, 820, 20), (0, 4300, 1060, 880, 10), (-4000, 4200, 960, 900, 0),
    (-8000, 3950, 820, 880, 0), (-12000, 3600, 640, 820, 0), (-15500, 3200, 420, 720, 0),
]


def catmull(stations, x):
    """Interpolación suave de la tabla de secciones (Catmull-Rom por columnas)."""
    xs = [s[0] for s in stations]
    for i in range(len(stations) - 1):
        if xs[i] >= x >= xs[i + 1]:
            t = (xs[i] - x) / (xs[i] - xs[i + 1])
            p0 = stations[max(i - 1, 0)]
            p1, p2 = stations[i], stations[i + 1]
            p3 = stations[min(i + 2, len(stations) - 1)]
            out = [x]
            for k in range(1, len(p1)):
                a, b, c, d = p0[k], p1[k], p2[k], p3[k]
                out.append(0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
            return tuple(out)
    return stations[0] if x > xs[0] else stations[-1]


def chine_section(x, n=64):
    _, w, ht, hb, zc = catmull(ST, x)
    pts = []
    for k in range(n):
        t = TAU * k / n
        c, s = math.cos(t), math.sin(t)
        p = 1.7 if s >= 0 else 2.6
        pts.append((x, w / 2 * math.copysign(abs(c) ** (2 / p), c), zc + (ht if s >= 0 else hb) * math.copysign(abs(s) ** (2 / p), s)))
    return pts


def body_bottom(x, y):
    """z de la panza del fuselaje en (x, y), para apoyar góndolas, tren y alas."""
    _, w, ht, hb, zc = catmull(ST, x)
    q = min(0.999, abs(y) / (w / 2))
    return zc - hb * (1 - q ** 2.6) ** (1 / 2.6)


def materials():
    skin = (0.024, 0.025, 0.029)
    c, nrm, rgh = panel_textures(skin, seed=11)
    nrm, rgh = image_of("sr72_normal", nrm), image_of("sr72_rough", rgh)
    return {
        "skin": material("Recubrimiento de alta emisividad", (1, 1, 1), 0.0, 0.5, image=image_of("sr72_skin", c), normal=nrm, rough=rgh, strength=0.6),
        "edge": material("Borde de ataque de C/SiC", (0.16, 0.155, 0.15), 0.0, 0.62),
        "nacelle": material("Góndola de titanio", (0.05, 0.05, 0.055), 0.4, 0.45),
        "cmc": material("C/SiC", (0.11, 0.11, 0.11), 0.0, 0.68),
        "cc": material("Carbono-carbono", (0.07, 0.07, 0.075), 0.0, 0.55),
        "ti": material("Titanio Ti-6Al-4V", (0.62, 0.6, 0.57), 1.0, 0.33),
        "ti_dark": material("Titanio Ti-6242", (0.52, 0.5, 0.48), 1.0, 0.38),
        "inco": material("Inconel 718", (0.55, 0.53, 0.5), 1.0, 0.36),
        "hast": material("Hastelloy X", (0.6, 0.55, 0.5), 1.0, 0.4),
        "sx": material("Monocristal CMSX-4 con recubrimiento térmico", (0.78, 0.74, 0.66), 0.6, 0.42),
        "nb": material("Niobio C-103", (0.72, 0.72, 0.75), 1.0, 0.3),
        "steel": material("Acero maraging", (0.66, 0.67, 0.69), 1.0, 0.28),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
        "dark": material("Interior oscuro", (0.02, 0.02, 0.022), 0.0, 0.8),
    }


def blade_ring(name, F, s, r0, r1, n, chord, tw0, tw1, thick, mat, phase=0.0):
    """Corona de álabes en un solo objeto: cada álabe es una placa con su calado de raíz a punta."""
    bm = bmesh.new()
    o, a, u, v = F
    for i in range(n):
        th = phase + TAU * i / n
        rad = u * math.cos(th) + v * math.sin(th)
        tan = -u * math.sin(th) + v * math.cos(th)
        rows = []
        for r, tw, ch in ((r0, tw0, chord), (r1, tw1, chord * 0.8)):
            tw = math.radians(tw)
            c = o + a * s + rad * r
            cd = (a * math.cos(tw) + tan * math.sin(tw)) * ch / 2
            td = (tan * math.cos(tw) - a * math.sin(tw)) * thick / 2
            rows.append([bm.verts.new(p) for p in (c - cd - td, c + cd - td, c + cd + td, c - cd + td)])
        bm.faces.new(list(reversed(rows[0])))
        bm.faces.new(rows[1])
        for k in range(4):
            bm.faces.new([rows[0][k], rows[0][(k + 1) % 4], rows[1][(k + 1) % 4], rows[1][k]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return to_object(name, bm, mat, smooth=False)


def rect_duct(name, x0, x1, y0, y1, z0, z1, t, mat, y0b=None, y1b=None, z0b=None, z1b=None):
    """Conducto rectangular de pared t, que puede abrirse hacia atrás (secciones distintas en x0 y x1)."""
    y0b, y1b = y0 if y0b is None else y0b, y1 if y1b is None else y1b
    z0b, z1b = z0 if z0b is None else z0b, z1 if z1b is None else z1b
    walls = []
    for k, (a, b) in enumerate((((y0, z1), (y1, z1)), ((y0, z0), (y1, z0)))):
        za, zb = (z1, z1b) if k == 0 else (z0, z0b)
        off = t if k == 0 else -t
        walls.append(hull(f"{name}_h{k}", [(x0, y0, za), (x0, y1, za), (x1, y0b, zb), (x1, y1b, zb),
                                           (x0, y0, za + off), (x0, y1, za + off), (x1, y0b, zb + off), (x1, y1b, zb + off)], mat))
    for k, (ya, yb) in enumerate(((y0, y0b), (y1, y1b))):
        off = -t if k == 0 else t
        walls.append(hull(f"{name}_v{k}", [(x0, ya, z0), (x0, ya, z1), (x1, yb, z0b), (x1, yb, z1b),
                                           (x0, ya + off, z0), (x0, ya + off, z1), (x1, yb + off, z0b), (x1, yb + off, z1b)], mat))
    return walls


# ── el motor TBCC, en coordenadas locales: labio de la entrada en x = 0, el aire viaja hacia −X ──
AX_Z = -700.0          # eje del turbofán
FAN_X = -3200.0        # cara del fan
RAMP_Z, COWL_Z = -300.0, -2000.0
HALF_W = 720.0
SPLIT = (-1500.0, -1380.0)   # bisagra de la compuerta divisora
RAM_TOP = -1450.0
THROAT_X = -12800.0
NOZZLE_END = -19100.0


def build_tbcc(prefix, M, parent, location, meta, detailed=True):
    root = empty(prefix, location, parent)
    parts = {}

    def part(key, obs, order, explode, pivot=None, **extra):
        ob = join(f"{prefix}.{key}", obs, root)
        info = meta.get(key, {})
        tag(ob, part=key, group=prefix if detailed else "TBCC.L", order=order, explode=list(explode) if detailed else [0, 0, 0], label=info.get("name", key),
            material=info.get("material", ""), melt=list(info.get("melt", [0, 0])), service=info.get("service", 0), system="engines", **extra)
        if pivot is not None:
            set_pivot(ob, pivot)
        parts[key] = ob
        return ob

    F = frame((FAN_X, 0, AX_Z), (-1, 0, 0))

    # entrada: rampa de compresión con bisagra delantera y labio de la capota (C/SiC)
    ramp = hull("ramp", [(900, -HALF_W + 10, RAMP_Z), (900, HALF_W - 10, RAMP_Z), (-1300, -HALF_W + 10, RAMP_Z), (-1300, HALF_W - 10, RAMP_Z),
                         (900, -HALF_W + 10, RAMP_Z + 50), (900, HALF_W - 10, RAMP_Z + 50), (-1300, -HALF_W + 10, RAMP_Z + 40), (-1300, HALF_W - 10, RAMP_Z + 40)], M["cmc"])
    part("rampa", [ramp], 1, (1800, 0, 600), pivot=(900, 0, RAMP_Z + 25), control="ramp", hinge=[0.0, 1.0, 0.0], range=[3, 14])
    lip = hull("lip", [(0, -HALF_W, COWL_Z), (0, HALF_W, COWL_Z), (-900, -HALF_W, COWL_Z - 100), (-900, HALF_W, COWL_Z - 100),
                       (-900, -HALF_W, COWL_Z + 20), (-900, HALF_W, COWL_Z + 20)], M["cmc"])
    part("labio", [lip], 2, (1500, 0, -700))

    # compuerta divisora: a baja velocidad cierra el estatorreactor; hacia Mach 3 sube y cierra la turbina
    flap = hull("splitter", [(SPLIT[0], -HALF_W + 15, SPLIT[1] - 30), (SPLIT[0], HALF_W - 15, SPLIT[1] - 30), (SPLIT[0], -HALF_W + 15, SPLIT[1] + 30), (SPLIT[0], HALF_W - 15, SPLIT[1] + 30),
                             (SPLIT[0] + 1150, -HALF_W + 15, SPLIT[1] - 6), (SPLIT[0] + 1150, HALF_W - 15, SPLIT[1] - 6), (SPLIT[0] + 1150, -HALF_W + 15, SPLIT[1] + 6), (SPLIT[0] + 1150, HALF_W - 15, SPLIT[1] + 6)], M["cmc"])
    hinge = cylinder_between("split_pin", (SPLIT[0], -HALF_W + 15, SPLIT[1]), (SPLIT[0], HALF_W - 15, SPLIT[1]), 40, M["inco"], steps=24)
    part("compuerta", [flap, hinge], 3, (900, 0, 900), pivot=(SPLIT[0], 0, SPLIT[1]), control="splitter", hinge=[0.0, 1.0, 0.0], range=[-62, 31])

    # conducto en S de la turbina: de la boca rectangular a la cara redonda del fan (titanio)
    rows = []
    for k in range(9):
        f = k / 8
        x = SPLIT[0] - (SPLIT[0] - FAN_X) * f
        w = HALF_W * (1 - f) + 600 * f
        zt, zb = RAMP_Z * (1 - f) + (AX_Z + 600) * f, (SPLIT[1] + 40) * (1 - f) + (AX_Z - 600) * f
        p = 8 * (1 - f) + 2 * f
        rows.append([(x, w * math.copysign(abs(math.cos(t)) ** (2 / p), math.cos(t)), (zt + zb) / 2 + (zt - zb) / 2 * math.copysign(abs(math.sin(t)) ** (2 / p), math.sin(t)))
                     for t in [TAU * j / 48 for j in range(48)]])
    part("conducto", [loft("sduct", rows, M["ti"], uvscale=4000)], 4, (0, 0, 1600))

    # ── turbofán (clase F100/F110): fan de 3 etapas, compresor de 10, cámara anular, turbinas, postquemador ──
    if detailed:
        spinner = lathe("spinner", F, [(-560, 0), (-420, 120), (-230, 215), (0, 262), (0, 0)], M["ti"], steps=48)
        fan = [spinner, lathe("fanhub", F, [(0, 0), (0, 268), (900, 300), (900, 0)], M["ti"], steps=48)]
        for k, (s, n) in enumerate(((120, 26), (430, 34), (720, 42))):
            fan.append(blade_ring(f"fan{k}", F, s, 270 + k * 12, 556, n, 230 - k * 30, 28, 62, 9, M["ti"], phase=k * 0.07))
        part("fan", fan, 10, (2600, 0, 0), pivot=(FAN_X, 0, AX_Z), spin=1)
        comp = [lathe("hpc", F, [(980, 0), (980, 240), (2600, 280), (2600, 0)], M["ti_dark"], steps=48)]
        for k in range(10):
            s = 1060 + k * 155
            tip = 440 - k * 13
            comp.append(blade_ring(f"hpc{k}", F, s, 245 + k * 3.5, tip, 40 + 4 * k, 90 - k * 3, 30, 55, 5, M["ti_dark"] if k < 6 else M["inco"], phase=k * 0.11))
        part("compresor", comp, 11, (1300, 0, 0), pivot=(FAN_X, 0, AX_Z), spin=1)
        comb = [lathe("liner", F, [(2700, 300), (2700, 440), (3500, 440), (3500, 425), (2715, 425), (2715, 315), (3500, 315), (3500, 300)], M["hast"], steps=64)]
        for i in range(20):
            th = TAU * i / 20
            comb.append(cylinder_between(f"nozzle{i}", point(F, 2640, 370, th), point(F, 2760, 370, th), 16, M["inco"], steps=10))
        part("camara", comb, 12, (0, 0, -1600))
        turb = [lathe("hptdisc", F, [(3560, 0), (3560, 280), (3700, 280), (3700, 0)], M["inco"], steps=48),
                lathe("lptdisc", F, [(3850, 0), (3850, 280), (4350, 300), (4350, 0)], M["inco"], steps=48)]
        turb.append(blade_ring("hpt", F, 3630, 285, 425, 66, 100, -40, -55, 10, M["sx"]))
        for k, s in enumerate((3930, 4170)):
            turb.append(blade_ring(f"lpt{k}", F, s, 305, 480 + k * 30, 72 + 6 * k, 110, -35, -58, 9, M["sx"], phase=k * 0.05))
        part("turbina", turb, 13, (-1700, 0, 0), pivot=(FAN_X, 0, AX_Z), spin=1)
        part("eje", [cylinder_between("shaft", point(F, -100, 0, 0), point(F, 4450, 0, 0), 70, M["steel"], steps=24)], 14, (0, 0, -2400), pivot=(FAN_X, 0, AX_Z), spin=1)
        case = [lathe("case", F, [(-40, 580), (-40, 612), (4600, 612), (4600, 580)], M["inco"], steps=64),
                lathe("splitcase", F, [(950, 452), (950, 462), (3550, 462), (3550, 452)], M["ti"], steps=64)]
        for k, s in enumerate((280, 575, 860)):
            case.append(blade_ring(f"ogv{k}", F, s, 300, 578, 44, 120, -20, -10, 7, M["ti"], phase=0.04))
        part("carcasa", case, 15, (0, 0, 2200))
        ab = [lathe("abliner", F, [(4600, 545), (4600, 600), (8500, 600), (8500, 545)], M["inco"], steps=64),
              lathe("tailcone", F, [(4400, 0), (4400, 290), (5600, 120), (5900, 0)], M["inco"], steps=48)]
        for r in (230, 400):
            ab.append(lathe(f"gutter{r}", F, [(5050, r - 40), (5150, r), (5050, r + 40), (5070, r)], M["inco"], steps=64))
        for i in range(12):
            th = TAU * i / 12
            ab.append(cylinder_between(f"spray{i}", point(F, 4900, 130, th), point(F, 4900, 540, th), 9, M["inco"], steps=8))
        part("postquemador", ab, 16, (-3600, 0, 0))
        petals = lathe("cdnozzle", F, [(8500, 545), (8500, 600), (9200, 470), (9500, 520), (9500, 490), (9200, 440)], M["inco"], steps=48)
        part("tobera_turbina", [petals], 17, (-4800, 0, 0))
    else:
        core = [lathe("core", F, [(-560, 0), (0, 262), (0, 612), (9300, 560), (9300, 0)], M["inco"], steps=48)]
        part("turbofan", core, 10, (0, 0, 0))

    # ── estatorreactor de modo dual: aislador, inyectores con cavidad, cámara refrigerada con combustible ──
    iso = rect_duct("iso", SPLIT[0], -5200, -600, 600, COWL_Z, RAM_TOP, 40, M["inco"])
    part("aislador", iso, 20, (0, 0, -1300))
    inj = []
    for y in (-400, 0, 400):
        inj.append(hull(f"strut{y}", [(-5300, y, COWL_Z), (-5300, y, RAM_TOP), (-5800, y - 45, COWL_Z), (-5800, y + 45, COWL_Z), (-5800, y - 45, RAM_TOP), (-5800, y + 45, RAM_TOP)], M["nb"]))
        for z in (-1880, -1720, -1580):
            inj.append(cylinder_between(f"port{y}{z}", (-5800, y, z), (-5815, y, z), 14, M["dark"], steps=8))
    inj.append(box("cavity", (-6200, 0, COWL_Z - 60), (700, 1180, 40), M["nb"]))
    part("inyectores", inj, 21, (0, 0, -2000))
    scram = rect_duct("scram", -5200, THROAT_X + 1300, -600, 600, COWL_Z, RAM_TOP, 50, M["cmc"], y0b=-700, y1b=700, z0b=COWL_Z - 60)
    for k in range(13):
        y = -620 + k * 103
        scram.append(box(f"rib{k}", ((-5200 + THROAT_X + 1300) / 2, y, COWL_Z - 70), (6200, 20, 30), M["inco"]))
    part("camara_scram", scram, 22, (0, 0, -2700))

    # tobera de rampa única (SERN), compartida: rampa superior larga y faldón inferior corto, de carbono-carbono
    ramp_up = hull("sern_up", [(THROAT_X, -HALF_W, RAMP_Z), (THROAT_X, HALF_W, RAMP_Z), (NOZZLE_END, -HALF_W, RAMP_Z + 250), (NOZZLE_END, HALF_W, RAMP_Z + 250),
                               (THROAT_X, -HALF_W, RAMP_Z + 60), (THROAT_X, HALF_W, RAMP_Z + 60), (NOZZLE_END, -HALF_W, RAMP_Z + 300), (NOZZLE_END, HALF_W, RAMP_Z + 300)], M["cc"])
    flap_lo = hull("sern_lo", [(THROAT_X + 1300, -HALF_W, COWL_Z - 60), (THROAT_X + 1300, HALF_W, COWL_Z - 60), (THROAT_X - 2000, -HALF_W, COWL_Z + 380), (THROAT_X - 2000, HALF_W, COWL_Z + 380),
                               (THROAT_X + 1300, -HALF_W, COWL_Z - 110), (THROAT_X + 1300, HALF_W, COWL_Z - 110), (THROAT_X - 2000, -HALF_W, COWL_Z + 330), (THROAT_X - 2000, HALF_W, COWL_Z + 330)], M["cc"])
    part("tobera", [ramp_up, flap_lo], 23, (-3000, 0, 0))
    return root, parts


def build_sr72(M, root, meta, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system="airframe", **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob

    # ── fuselaje en tres tramos ──
    def body(x0, x1, n):
        return [chine_section(x0 - (x0 - x1) * k / n) for k in range(n + 1)]
    part("fuselaje.morro", [loft("fwd", body(15000, 6000, 24), M["skin"], uvscale=4000)], "airframe", 2, (5000, 0, 0), "Morro y cuerpo delantero con aristas")
    part("fuselaje.central", [loft("mid", body(6000, -6000, 16), M["skin"], uvscale=4000)], "airframe", 0, (0, 0, 0), "Fuselaje central")
    part("fuselaje.trasero", [loft("aft", body(-6000, -15500, 14), M["skin"], uvscale=4000, caps=True)], "airframe", 1, (-5000, 0, 0), "Fuselaje trasero")

    # ── ala en delta cortada: flecha de ~67°, perfil del 3,5 %, elevones en el 22 % trasero ──
    LE = lambda y: 7000 - (y - 1700) * (17500 / 7300)
    TE = lambda y: -15000 + (y - 1700) * 0.08
    HINGE = 0.78

    def wrow(y, side, a, b, t=0.035):
        ch = LE(y) - TE(y)
        return [(LE(y) - x, side * y, -40 + z) for x, z in naca_cut(ch, t, a, b)]
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        ys = [1700, 2400, 3000, 4500, 5600, 5700, 7000, 8400, 9000]
        wing = loft(f"wing{side}", [wrow(y, side, 0, HINGE) for y in ys], [M["skin"], M["edge"]], caps=True, uvscale=4000,
                    matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)
        fill = [loft(f"fill{side}{a}", [wrow(y, side, HINGE, 1) for y in (a, b)], M["skin"], caps=True, uvscale=4000) for a, b in ((1700, 2400), (5600, 5700))]
        part(f"ala.{tagname}", [wing] + fill, "airframe", 3, (0, side * 4000, 0), f"Ala {tagname}")
        for k, (a, b) in enumerate(((2400, 5600), (5700, 9000))):
            ob = part(f"elevon.{tagname}.{k}", [loft(f"elev{side}{k}", [wrow(y, side, HINGE + 0.004, 1) for y in (a + 20, b - 20)], M["skin"], caps=True, uvscale=4000)],
                      "airframe", 4, (-1500, side * 4500, 0), f"Elevón {'interior' if k == 0 else 'exterior'} {tagname}", control="elevon", range=[-20, 20], sign=side)
            p0 = Vector((LE(a) - HINGE * (LE(a) - TE(a)), side * a, -40))
            p1 = Vector((LE(b) - HINGE * (LE(b) - TE(b)), side * b, -40))
            ob["hinge"] = list((p1 - p0).normalized() * side)
            set_pivot(ob, p0)

    # ── derivas gemelas inclinadas 12° hacia fuera, con timón ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        cant = math.tan(math.radians(12)) * side
        def frow(z, le, c, a, b):
            return [(le - x, side * 6400 + y + cant * z, z) for x, y in naca_cut(c, 0.04, a, b)]
        FIN = ((0, -9400, 4400), (3600, -12800, 1800))
        fin = loft(f"fin{side}", [frow(z, le, c, 0, 0.7) for z, le, c in FIN], [M["skin"], M["edge"]], caps=True, uvscale=4000,
                   matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)
        part(f"deriva.{tagname}", [fin], "airframe", 5, (0, side * 1500, 3500), f"Deriva {tagname}")
        rud = part(f"timon.{tagname}", [loft(f"rud{side}", [frow(z, le, c, 0.705, 1) for z, le, c in FIN], M["skin"], caps=True, uvscale=4000)],
                   "airframe", 6, (-1500, side * 1500, 3500), f"Timón {tagname}", control="rudder", range=[-25, 25])
        a = Vector((FIN[0][1] - 0.7 * FIN[0][2], side * 6400, 0))
        b = Vector((FIN[1][1] - 0.7 * FIN[1][2], side * 6400 + cant * 3600, 3600))
        rud["hinge"] = list((b - a).normalized())
        set_pivot(rud, a)

    # ── góndolas: la piel exterior de cada TBCC, abierta por delante (entrada) y por detrás (tobera) ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        rows = []
        for k in range(15):
            x = ENGINE_X - 15800 * k / 14 + 300
            w, h, zc = 1640, 2150, -1060
            top = body_bottom(x, side * ENGINE_Y) + 200
            rows.append([(x, side * ENGINE_Y + w / 2 * math.copysign(abs(math.cos(t)) ** (2 / 6), math.cos(t)),
                          ((top + COWL_Z - 80) / 2) + (top - COWL_Z + 80) / 2 * math.copysign(abs(math.sin(t)) ** (2 / 6), math.sin(t)))
                         for t in [TAU * j / 40 for j in range(40)]])
        part(f"gondola.{tagname}", [loft(f"nac{side}", rows, M["nacelle"], uvscale=4000)], "airframe", 7, (0, side * 3200, -500), f"Góndola {tagname}")

    # ── tren: dos ruedas en el morro, cuatro en cada pata principal ──
    def wheel(name, c, r, w):
        F = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        return [lathe(f"{name}_t", F, [(0, r * 0.62), (0, r * 0.9), (w * 0.15, r), (w * 0.85, r), (w, r * 0.9), (w, r * 0.62)], M["rubber"], steps=40),
                lathe(f"{name}_h", F, [(w * 0.1, 0), (w * 0.1, r * 0.62), (w * 0.9, r * 0.62), (w * 0.9, 0)], M["alu"], steps=32)]
    nose = [cylinder_between("nstrut", (9600, 0, body_bottom(9600, 0) + 100), (9600, 0, GROUND + 380), 110, M["steel"], steps=24)]
    for y in (-260, 260):
        nose += wheel(f"nw{y}", (9600, y, GROUND + 380), 380, 300)
    part("tren.morro", nose, "airframe", 8, (4000, 0, 0), "Tren de morro")
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        y = side * 3300
        g = [cylinder_between(f"mstrut{side}", (-3400, y, -60), (-3400, y, GROUND + 520), 150, M["steel"], steps=24),
             box(f"bogie{side}", (-3400, y, GROUND + 520), (1500, 160, 120), M["steel"])]
        for dx in (-560, 560):
            for dy in (-300, 300):
                g += wheel(f"mw{side}{dx}{dy}", (-3400 + dx, y + dy, GROUND + 520), 520, 360)
        part(f"tren.{tagname}", g, "airframe", 9, (0, side * 3000, 0), f"Tren principal {tagname}")

    # ── los dos TBCC: el derecho con todas sus piezas, el izquierdo armado ──
    eng = {}
    for side, prefix, detailed in ((-1, "TBCC", True), (1, "TBCC.L", False)):
        er, ep = build_tbcc(prefix, M, root, (ENGINE_X, side * ENGINE_Y, 0), meta, detailed)
        tag(er, part=prefix, group="engine", order=40, explode=[-2000, -17000, 1800] if detailed else [0, 0, 0], label="TBCC derecho" if detailed else "TBCC izquierdo", system="engines")
        eng[prefix] = (er, ep)
        log(f"Motor {prefix}")
    return parts, eng
