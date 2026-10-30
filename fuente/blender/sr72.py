# Lockheed Martin SR-72 con la forma del Darkstar de Top Gun: Maverick, que Skunk Works diseñó con el equipo de la
# película a partir de este concepto (21,18 m de largo y 10,06 m de envergadura según su diseñador, Daniel Simon).
# Cuerpo sustentador en punta de flecha: un morro largo y plano de filo cortante cuyas aristas se abren en línea recta
# hasta las puntas del ala; cabina de un piloto sin parabrisas, con ventanas ovaladas laterales y la ventana circular
# del rastreador de estrellas en el lomo; dos grandes tomas rectangulares bajo el ala; jorobas de los motores sobre la
# cola, dos derivas enterizas inclinadas hacia fuera y elevones en el borde de salida. Dentro, dos motores de ciclo
# combinado (TBCC) en disposición "over-under": turbofán arriba y estatorreactor de modo dual abajo, con la entrada y la
# tobera compartidas, como en el esquema de modos del Darkstar. 1 unidad = 1 mm, +X morro, +Y izquierda, +Z arriba.
import math
import bmesh
import bpy
from mathutils import Vector
from lib import (material, lathe, cylinder_between, box, join, tag, frame, point, TAU, to_object, empty, hull, boolean_cut, halves)
from hawk import loft, naca_cut, panel_textures, image_of, set_pivot

GROUND = -2300.0
NOSE, TAIL = 11000.0, -10200.0
TIP_X, HALF_SPAN = -6200.0, 5030.0
ENGINE_X, ENGINE_Y, ENGINE_Z = 2300.0, 1600.0, -250.0
ENGINE_SCALE = 0.6

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


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ── la forma, como funciones del punto (x, y): contorno en planta, fuselaje, ala fina y jorobas de los motores ──
def half_width(x):
    if x >= TIP_X:
        return HALF_SPAN * ((NOSE - x) / (NOSE - TIP_X)) ** 1.15
    return HALF_SPAN + (2000 - HALF_SPAN) * (TIP_X - x) / (TIP_X - TAIL)


def body_width(x):
    return 1150 * smooth(NOSE, 2500, x) ** 0.55 if x > 2500 else 1150


def z_top(x, y):
    a, half, rb = abs(y), half_width(x), body_width(x)
    hb = 720 * smooth(NOSE, 4500, x) ** 0.8 - 470 * smooth(4500, TAIL, x)
    body = hb * max(0.0, 1 - (a / rb) ** 2) ** 0.6 if a < rb else 0.0
    wing = 170 * max(0.0, 1 - a / half) ** 0.85 if half > 1 else 0.0
    hump = (430 * smooth(-200, -3200, x) - 250 * smooth(-7600, TAIL, x)) * math.exp(-(((a - 1600) / 760) ** 2)) * max(0.0, 1 - a / half) ** 0.3 if half > 1 else 0.0
    cockpit = 260 * math.exp(-(((x - 4300) / 1500) ** 2)) * max(0.0, 1 - (a / 650) ** 2) ** 0.7 if a < 650 else 0.0
    return max(body, wing) + hump + cockpit


def z_bottom(x, y):
    a, half, rb = abs(y), half_width(x), body_width(x)
    hl = 420 * smooth(NOSE, 4000, x) ** 0.8 - 200 * smooth(-3000, TAIL, x)
    body = hl * max(0.0, 1 - (a / rb) ** 2) ** 0.5 if a < rb else 0.0
    wing = 110 * max(0.0, 1 - a / half) ** 0.85 if half > 1 else 0.0
    return -max(body, wing)


SEC_N = 56


def section(x):
    """Sección cerrada de todo el cuerpo con el ala: de borde a borde por arriba y de vuelta por abajo."""
    half = max(half_width(x), 2.0)
    ys = [half * math.cos(math.pi * k / SEC_N) for k in range(SEC_N + 1)]
    up = [(x, y, z_top(x, y)) for y in ys]
    lo = [(x, y, z_bottom(x, y)) for y in reversed(ys[1:-1])]
    return up + lo


def materials():
    skin = (0.017, 0.018, 0.021)
    c, nrm, rgh = panel_textures(skin, seed=11)
    nrm, rgh = image_of("sr72_normal", nrm), image_of("sr72_rough", rgh)
    return {
        "skin": material("Recubrimiento negro satinado de alta emisividad", (1, 1, 1), 0.25, 0.42, image=image_of("sr72_skin", c), normal=nrm, rough=rgh, strength=0.5),
        "edge": material("Borde de carbono-carbono", (0.085, 0.085, 0.09), 0.1, 0.55),
        "window": material("Ventana de cuarzo", (0.05, 0.08, 0.14), 0.6, 0.03, coat=1.0, coat_rough=0.01),
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


def hinged_ring(name, F, s0, s1, r0, r1, n, mat, kind, width=0.9, thick=14, phase=0.0, pitch=None, at=None):
    """Corona de paneles con bisagra en su borde delantero (compuertas, aletas de eyector, pétalos de tobera).

    Cada panel es un objeto propio con `subcontrol` = kind y su eje de bisagra (la tangente a la corona en el borde
    delantero); el visor lo gira según el Mach o el postquemador. Se cuelgan de una pieza con `attach`. Ángulo positivo
    = el borde de salida va hacia el eje (cierra); negativo = hacia fuera (abre). `at` limita los paneles a unos ángulos."""
    o, a, u, v = F
    pitch = pitch or TAU / n
    panels = []
    angles = at if at is not None else [phase + TAU * i / n for i in range(n)]
    for i, th in enumerate(angles):
        th0, th1 = th - pitch * width / 2, th + pitch * width / 2
        pts = []
        for ss, rr in ((s0, r0), (s1, r1)):
            for t in (th0, th1):
                for dr in (0, thick):
                    pts.append(tuple(point(F, ss, rr + dr, t)))
        ob = hull(f"{name}{i}", pts, mat)
        mid = point(F, s0, r0 + thick / 2, th)
        tangent = -u * math.sin(th) + v * math.cos(th)
        set_pivot(ob, mid)
        tag(ob, subcontrol=kind, hinge=list(tangent.normalized()))
        panels.append(ob)
    return panels


def attach(parent, children):
    for c in children:
        c.parent = parent
    return children


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
    part("rampa", [ramp], 1, (3200, 0, 600), out=1, pivot=(900, 0, RAMP_Z + 25), control="ramp", hinge=[0.0, 1.0, 0.0], range=[3, 14])
    lip = hull("lip", [(0, -HALF_W, COWL_Z), (0, HALF_W, COWL_Z), (-900, -HALF_W, COWL_Z - 100), (-900, HALF_W, COWL_Z - 100),
                       (-900, -HALF_W, COWL_Z + 20), (-900, HALF_W, COWL_Z + 20)], M["cmc"])
    part("labio", [lip], 2, (1500, 0, -700), out=2)

    # compuerta divisora: a baja velocidad cierra el estatorreactor; hacia Mach 3 sube y cierra la turbina
    flap = hull("splitter", [(SPLIT[0], -HALF_W + 15, SPLIT[1] - 30), (SPLIT[0], HALF_W - 15, SPLIT[1] - 30), (SPLIT[0], -HALF_W + 15, SPLIT[1] + 30), (SPLIT[0], HALF_W - 15, SPLIT[1] + 30),
                             (SPLIT[0] + 1150, -HALF_W + 15, SPLIT[1] - 6), (SPLIT[0] + 1150, HALF_W - 15, SPLIT[1] - 6), (SPLIT[0] + 1150, -HALF_W + 15, SPLIT[1] + 6), (SPLIT[0] + 1150, HALF_W - 15, SPLIT[1] + 6)], M["cmc"])
    hinge = cylinder_between("split_pin", (SPLIT[0], -HALF_W + 15, SPLIT[1]), (SPLIT[0], HALF_W - 15, SPLIT[1]), 40, M["inco"], steps=24)
    part("compuerta", [flap, hinge], 3, (900, 0, -1500), out=4, pivot=(SPLIT[0], 0, SPLIT[1]), control="splitter", hinge=[0.0, 1.0, 0.0], range=[-62, 31])

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
    # sale hacia delante por la boca (por encima de la compuerta) y luego sube
    part("conducto", [loft("sduct", rows, M["dark"], uvscale=4000)], 4, (2600, 0, 1600), out=3)

    # ── turbofán (clase F100/F110): fan de 3 etapas, compresor de 10, cámara anular, turbinas, postquemador ──
    if detailed:
        spinner = lathe("spinner", F, [(-560, 0), (-420, 120), (-230, 215), (0, 262), (0, 0)], M["ti"], steps=48)
        fan = [spinner, lathe("fanhub", F, [(0, 80), (0, 268), (900, 300), (900, 80)], M["ti"], steps=48)]
        for k, (s, n) in enumerate(((120, 26), (430, 34), (720, 42))):
            fan.append(blade_ring(f"fan{k}", F, s, 270 + k * 12, 556, n, 230 - k * 30, 28, 62, 9, M["ti"], phase=k * 0.07))
        part("fan", fan, 10, (4400, 0, 0), pivot=(FAN_X, 0, AX_Z), spin=1, out=14)
        comp = [lathe("hpc", F, [(980, 80), (980, 240), (2600, 280), (2600, 80)], M["ti_dark"], steps=48)]
        for k in range(10):
            s = 1060 + k * 155
            tip = 440 - k * 13
            comp.append(blade_ring(f"hpc{k}", F, s, 245 + k * 3.5, tip, 40 + 4 * k, 90 - k * 3, 30, 55, 5, M["ti_dark"] if k < 6 else M["inco"], phase=k * 0.11))
        part("compresor", comp, 11, (2700, 0, 0), pivot=(FAN_X, 0, AX_Z), spin=1, out=15)
        comb = [lathe("liner", F, [(2700, 300), (2700, 440), (3500, 440), (3500, 425), (2715, 425), (2715, 315), (3500, 315), (3500, 300)], M["hast"], steps=64)]
        for i in range(20):
            th = TAU * i / 20
            comb.append(cylinder_between(f"nozzle{i}", point(F, 2640, 370, th), point(F, 2760, 370, th), 16, M["inco"], steps=10))
        part("camara", comb, 12, (-1800, 0, 0), out=13)
        turb = [lathe("hptdisc", F, [(3560, 80), (3560, 280), (3700, 280), (3700, 80)], M["inco"], steps=48),
                lathe("lptdisc", F, [(3850, 80), (3850, 280), (4350, 300), (4350, 80)], M["inco"], steps=48)]
        turb.append(blade_ring("hpt", F, 3630, 285, 425, 66, 100, -40, -55, 10, M["sx"]))
        for k, s in enumerate((3930, 4170)):
            turb.append(blade_ring(f"lpt{k}", F, s, 305, 480 + k * 30, 72 + 6 * k, 110, -35, -58, 9, M["sx"], phase=k * 0.05))
        part("turbina", turb, 13, (-2800, 0, 0), pivot=(FAN_X, 0, AX_Z), spin=1, out=12)
        part("eje", [cylinder_between("shaft", point(F, 10, 0, 0), point(F, 4390, 0, 0), 70, M["steel"], steps=24)], 14, (0, -1500, 0), pivot=(FAN_X, 0, AX_Z), spin=1, out=16)
        case = [lathe("case", F, [(-40, 580), (-40, 612), (4600, 612), (4600, 580)], M["inco"], steps=64),
                lathe("splitcase", F, [(950, 452), (950, 462), (3550, 462), (3550, 452)], M["ti"], steps=64)]
        for k, s in enumerate((280, 575, 860)):
            case.append(blade_ring(f"ogv{k}", F, s, 300, 578, 44, 120, -20, -10, 7, M["ti"], phase=0.04))
        # carcasa partida por el plano del eje: cada mitad sale hacia su lado con sus estátores, sin cruzar el fan
        a, b = halves(join(f"{prefix}.case", case), f"{prefix}.case.b")
        part("carcasa", [a], 15, (0, 2200, 0), out=9)
        part("carcasa.b", [b], 15, (0, -2200, 0), out=9)
        ab = [lathe("abliner", F, [(4600, 545), (4600, 600), (8500, 600), (8500, 545)], M["inco"], steps=64),
              lathe("tailcone", F, [(4400, 0), (4400, 290), (5600, 120), (5900, 0)], M["inco"], steps=48)]
        for r in (230, 400):
            ab.append(lathe(f"gutter{r}", F, [(5050, r - 40), (5150, r), (5050, r + 40), (5070, r)], M["inco"], steps=64))
        for i in range(12):
            th = TAU * i / 12
            ab.append(cylinder_between(f"spray{i}", point(F, 4900, 130, th), point(F, 4900, 540, th), 9, M["inco"], steps=8))
        part("postquemador", ab, 16, (-3600, 0, 0), out=11)
        petals = lathe("cdnozzle", F, [(8500, 545), (8500, 600), (9200, 470), (9500, 520), (9500, 490), (9200, 440)], M["inco"], steps=48)
        part("tobera_turbina", [petals], 17, (-4800, 0, 0), out=10)
    else:
        core = [lathe("core", F, [(-560, 0), (0, 262), (0, 590), (40, 612), (9300, 560), (9300, 0)], M["inco"], steps=48)]
        part("turbofan", core, 10, (0, 0, 0))

    # ── estatorreactor de modo dual: aislador, inyectores con cavidad, cámara refrigerada con combustible ──
    iso = rect_duct("iso", SPLIT[0], -5200, -600, 600, COWL_Z, RAM_TOP, 40, M["inco"])
    part("aislador", iso, 20, (0, 0, -1300), out=8)
    inj = []
    for y in (-400, 0, 400):
        inj.append(hull(f"strut{y}", [(-5300, y, COWL_Z), (-5300, y, RAM_TOP), (-5800, y - 45, COWL_Z), (-5800, y + 45, COWL_Z), (-5800, y - 45, RAM_TOP), (-5800, y + 45, RAM_TOP)], M["nb"]))
        for z in (-1880, -1720, -1580):
            inj.append(cylinder_between(f"port{y}{z}", (-5800, y, z), (-5815, y, z), 14, M["dark"], steps=8))
    inj.append(box("cavity", (-6200, 0, COWL_Z - 60), (700, 1180, 40), M["nb"]))
    part("inyectores", inj, 21, (0, 0, -2000), out=7)
    scram = rect_duct("scram", -5200, THROAT_X + 1300, -600, 600, COWL_Z, RAM_TOP, 50, M["cmc"], y0b=-700, y1b=700, z0b=COWL_Z - 60)
    for k in range(13):
        y = -620 + k * 103
        scram.append(box(f"rib{k}", ((-5200 + THROAT_X + 1300) / 2, y, COWL_Z - 70), (6200, 20, 30), M["inco"]))
    part("camara_scram", scram, 22, (0, 0, -2700), out=6)

    # tobera de rampa única (SERN), compartida: rampa superior larga y faldón inferior corto, de carbono-carbono
    ramp_up = hull("sern_up", [(THROAT_X, -HALF_W, RAMP_Z), (THROAT_X, HALF_W, RAMP_Z), (NOZZLE_END, -HALF_W, RAMP_Z + 250), (NOZZLE_END, HALF_W, RAMP_Z + 250),
                               (THROAT_X, -HALF_W, RAMP_Z + 60), (THROAT_X, HALF_W, RAMP_Z + 60), (NOZZLE_END, -HALF_W, RAMP_Z + 300), (NOZZLE_END, HALF_W, RAMP_Z + 300)], M["cc"])
    flap_lo = hull("sern_lo", [(THROAT_X + 1300, -HALF_W, COWL_Z - 60), (THROAT_X + 1300, HALF_W, COWL_Z - 60), (THROAT_X - 2000, -HALF_W, COWL_Z + 380), (THROAT_X - 2000, HALF_W, COWL_Z + 380),
                               (THROAT_X + 1300, -HALF_W, COWL_Z - 110), (THROAT_X + 1300, HALF_W, COWL_Z - 110), (THROAT_X - 2000, -HALF_W, COWL_Z + 330), (THROAT_X - 2000, HALF_W, COWL_Z + 330)], M["cc"])
    part("tobera", [ramp_up, flap_lo], 23, (-3000, 0, 2300), out=5)
    return root, parts


def build_sr72(M, root, meta, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system="airframe", **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob

    # ── cuerpo con el ala en una sola superficie, en tres tramos; los bordes en carbono-carbono ──
    edge = lambda i, j: 1 if j <= 1 or SEC_N - 2 <= j <= SEC_N + 1 or j >= 2 * SEC_N - 2 else 0

    def te(y):
        return TIP_X + (TAIL - TIP_X) * (HALF_SPAN - y) / (HALF_SPAN - 2000)
    ELEVONS = ((2400, 3500), (3650, 4750))

    def body(x0, x1, step=250):
        xs = [x0 - step * k for k in range(int((x0 - x1) / step) + 1)]
        if xs[-1] != x1:
            xs.append(x1)
        return [section(x) for x in xs]
    part("fuselaje.morro", [loft("fwd", body(NOSE - 40, 3000), [M["skin"], M["edge"]], uvscale=4000, matof=edge)], "airframe", 2, (3500, 0, 0), "Morro de filo cortante y cabina")
    part("fuselaje.central", [loft("mid", body(3000, -4000), [M["skin"], M["edge"]], uvscale=4000, matof=edge)], "airframe", 0, (0, 0, 0), "Cuerpo central con el ala integrada")
    aft = loft("aft", body(-4000, TAIL), [M["skin"], M["edge"]], uvscale=4000, caps=True, matof=edge)
    # hueco de cada elevón en el borde de salida (con holgura para que gire ±20° sin tocar la cola)
    boolean_cut(aft, [hull(f"evcut{side}{k}", [(te(y) + dx, side * y, dz) for y in (y0 - 15, y1 + 15) for dx in (-200, 875) for dz in (-500, 500)])
                      for side in (1, -1) for k, (y0, y1) in enumerate(ELEVONS)])
    part("fuselaje.trasero", [aft], "airframe", 1, (-3500, 0, 0), "Cola con las jorobas de los motores")

    # cabina sin parabrisas: dos ventanas ovaladas que miran a los lados y la del rastreador de estrellas en el lomo
    def window(name, cx, cy, rx, ry):
        pts = []
        for k in range(28):
            t = TAU * k / 28
            x, y = cx + rx * math.cos(t), cy + ry * math.sin(t)
            z = z_top(x, y)
            pts += [(x, y, z + 4), (x, y, z - 30)]
        return hull(name, pts, M["window"])
    wins = [window(f"win{s}", 4500, s * 430, 520, 170) for s in (1, -1)]
    part("cabina", wins + [window("star", 1300, 0, 130, 130)], "airframe", 30, (0, 0, 1500), "Cabina de un piloto: ventanas laterales de cuarzo y rastreador de estrellas")

    # ── elevones en el borde de salida, dos por lado ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        for k, (y0, y1) in enumerate(ELEVONS):
            p0 = Vector((te(y0) + 850, side * y0, 0))
            p1 = Vector((te(y1) + 850, side * y1, 0))
            pts = []
            for (y, p) in ((y0, p0), (y1, p1)):
                xt = te(y) + 5
                for dz in (-35, 35):
                    pts += [(p.x, side * y, dz * 1.6), (xt, side * y, dz * 0.3)]
            ob = part(f"elevon.{tagname}.{k}", [hull(f"ev{side}{k}", pts, M["skin"])], "airframe", 4, (0, 0, 1400),
                      f"Elevón {'interior' if k == 0 else 'exterior'} {tagname}", control="elevon", range=[-20, 20], sign=side)
            ob["hinge"] = list((p1 - p0).normalized() * side)
            set_pivot(ob, p0)

    # ── derivas enterizas sobre las jorobas, inclinadas 12° hacia fuera ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        cant = math.tan(math.radians(12)) * side
        base = z_top(-7600, 1700) + 25

        def frow(h, le, c):
            # la raíz copia la joroba a 25 mm por encima, para que la deriva gire sin rozarla
            if h == 0:
                return [(le - x, side * 1700 + y, z_top(le - x, 1700) + 25) for x, y in naca_cut(c, 0.05)]
            return [(le - x, side * 1700 + y + cant * h, base + h) for x, y in naca_cut(c, 0.05)]
        FIN = ((0, -5600, 4000), (2300, -8200, 1500))
        ob = part(f"deriva.{tagname}", [loft(f"fin{side}", [frow(h, le, c) for h, le, c in FIN], [M["skin"], M["edge"]], caps="strip", uvscale=4000, matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)],
                  "airframe", 6, (0, side * 1800, 2400), f"Deriva enteriza {tagname}", control="rudder", range=[-20, 20])
        ob["hinge"] = list(Vector((0, cant, 1)).normalized())
        set_pivot(ob, (-7800, side * 1700, base))

    # ── góndolas bajo el ala: la boca rectangular de la toma y la piel que cubre cada TBCC ──
    S = ENGINE_SCALE
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        rows = []
        for k in range(17):
            x = ENGINE_X + 60 - (ENGINE_X + 60 + 9200) * k / 16
            w = 1640 * S * (1.25 - 0.15 * smooth(-4000, -9200, x))
            yc = side * ENGINE_Y
            top = z_bottom(x, yc) + 80
            # el fondo cubre el labio, la cámara del estatorreactor y el faldón de la tobera, que sube al final
            bot = ENGINE_Z + (COWL_Z - 170 + 440 * smooth(-4600, -6580, x)) * S
            rows.append([(x, yc + w / 2 * math.copysign(abs(math.cos(t)) ** (2 / 8), math.cos(t)),
                          (top + bot) / 2 + (top - bot) / 2 * math.copysign(abs(math.sin(t)) ** (2 / 8), math.sin(t)))
                         for t in [TAU * j / 40 for j in range(40)]])
        part(f"gondola.{tagname}", [loft(f"nac{side}", rows, M["nacelle"], uvscale=4000)], "airframe", 7, (0, side * 1800, -900), f"Toma y góndola {tagname}", path="v")

    # ── tren fijo: el de morro adelante, los principales bajo las tomas ──
    def wheel(name, c, r, w):
        F = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        return [lathe(f"{name}_t", F, [(0, r * 0.62), (0, r * 0.9), (w * 0.15, r), (w * 0.85, r), (w, r * 0.9), (w, r * 0.62)], M["rubber"], steps=40),
                lathe(f"{name}_h", F, [(w * 0.1, 0), (w * 0.1, r * 0.62), (w * 0.9, r * 0.62), (w * 0.9, 0)], M["alu"], steps=32)]
    nose = [cylinder_between("nstrut", (6800, 0, z_bottom(6800, 0) + 10), (6800, 0, GROUND + 330), 90, M["steel"], steps=24)]
    for y in (-200, 200):
        nose += wheel(f"nw{y}", (6800, y, GROUND + 330), 330, 220)
    part("tren.morro", nose, "airframe", 8, (0, 3000, 0), "Tren de morro")
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        y = side * ENGINE_Y
        g = [cylinder_between(f"mstrut{side}", (-1500, y, ENGINE_Z + (COWL_Z - 170) * S + 5), (-1500, y, GROUND + 420), 120, M["steel"], steps=24)]
        for dy in (-260, 260):
            g += wheel(f"mw{side}{dy}", (-1500, y + dy, GROUND + 420), 420, 300)
        part(f"tren.{tagname}", g, "airframe", 9, (0, side * 3600, 0), f"Tren principal {tagname}")

    # ── los dos TBCC, a la escala de este avión: el derecho con todas sus piezas, el izquierdo armado ──
    eng = {}
    for side, prefix, detailed in ((-1, "TBCC", True), (1, "TBCC.L", False)):
        er, ep = build_tbcc(prefix, M, root, (ENGINE_X, side * ENGINE_Y, ENGINE_Z), meta, detailed)
        er.scale = (S, S, S)
        tag(er, part=prefix, group="engine", order=40, explode=[12500, side * 5000, 1600], via=[12500, 0, 0], label="TBCC derecho" if detailed else "TBCC izquierdo", system="engines")
        eng[prefix] = (er, ep)
        log(f"Motor {prefix}")
    return parts, eng
