# Lockheed Martin F-22 Raptor: 18,92 m de largo, 13,56 m de envergadura. Fuselaje con aristas, cabina de una pieza
# con tinte dorado, tomas "caret" a los lados con conductos en S que esconden el fan, ala en diamante (42° en el borde de
# ataque) con flaperones y alerones, estabilizadores enterizos, dos derivas inclinadas 28° hacia fuera y dos turbofanes
# Pratt & Whitney F119 con postquemador y tobera bidimensional de empuje vectorial (±20° en cabeceo).
# F119: fan de 3 etapas, compresor de alta de 6, turbinas de alta y de baja de una etapa cada una y contrarrotativas,
# relación de derivación 0,3, ≈ 156 kN con postquemador. 1 unidad = 1 mm, +X morro, +Y izquierda, +Z arriba.
import math
from mathutils import Vector
from lib import (material, lathe, cylinder_between, box, join, tag, frame, point, TAU, empty, hull, boolean_cut, halves)
from hawk import loft, naca_cut, panel_textures, image_of, set_pivot
from sr72 import catmull, blade_ring, rect_duct, smooth

GROUND = -2150.0
ENG_Y = 620.0
FAN_X = -3500.0
AX_Z = -150.0
BOOM_Y = 1800.0   # eje de las vigas de cola

ST = [
    (9500, 30, 10, 10, -150), (8600, 600, 240, 200, -150), (7200, 1150, 400, 330, -120), (5800, 1450, 520, 430, -80),
    (4200, 1750, 560, 520, -60), (3200, 2500, 580, 600, -60), (1500, 3200, 600, 650, -80), (-1500, 3400, 620, 660, -100),
    (-4500, 3250, 620, 660, -120), (-6500, 2800, 620, 630, -150), (-8000, 2600, 620, 620, -150), (-8700, 2500, 600, 600, -150),
]
N = 64
TOP = set(range(11, 21))
CAN = (6700, 3500)


def section(x):
    _, w, ht, hb, zc = catmull(ST, x)
    pts = []
    for k in range(N):
        t = TAU * k / N
        c, s = math.cos(t), math.sin(t)
        # el lomo se va haciendo más cuadrado hacia atrás, donde los dos motores van uno al lado del otro
        # y hacia el morro se afila en diamante: la arista lateral del F-22 va de la punta a las tomas
        p = (1.6 + 2.4 * smooth(1500, -2500, x) - 0.4 * smooth(6000, 8200, x)) if s >= 0 else (2.3 + 1.7 * smooth(1500, -2500, x) - 0.75 * smooth(6000, 8200, x))
        pts.append((x, w / 2 * math.copysign(abs(c) ** (2 / p), c), zc + (ht if s >= 0 else hb) * math.copysign(abs(s) ** (2 / p), s)))
    return pts


def belly(x, y):
    """Altura de la panza del fuselaje en (x, y)."""
    _, w, ht, hb, zc = catmull(ST, x)
    p = 2.3 + 1.7 * smooth(1500, -2500, x) - 0.75 * smooth(6000, 8200, x)
    return zc - hb * max(0.0, 1 - (2 * abs(y) / w) ** p) ** (1 / p)


def materials():
    grey = (0.11, 0.12, 0.13)
    c, nrm, rgh = panel_textures(grey, seed=22)
    nrm, rgh = image_of("f22_normal", nrm), image_of("f22_rough", rgh)
    return {
        "skin": material("Recubrimiento furtivo gris", (1, 1, 1), 0.15, 0.55, image=image_of("f22_skin", c), normal=nrm, rough=rgh, strength=0.5),
        "edge": material("Borde absorbente de radar", (0.06, 0.065, 0.07), 0.0, 0.7),
        "glass": material("Cabina con tinte dorado", (0.62, 0.48, 0.18), 0.6, 0.04, coat=1.0, coat_rough=0.02, transmission=0.35, ior=1.55, alpha=0.55),
        "dark": material("Interior oscuro", (0.02, 0.02, 0.022), 0.0, 0.8),
        "cockpit": material("Gris de cabina", (0.03, 0.032, 0.036), 0.0, 0.6),
        "seat": material("Asiento", (0.05, 0.06, 0.045), 0.0, 0.85),
        "ti": material("Titanio Ti-6Al-4V", (0.62, 0.6, 0.57), 1.0, 0.33),
        "ti_dark": material("Titanio de alta temperatura", (0.52, 0.5, 0.48), 1.0, 0.38),
        "inco": material("Inconel 718", (0.55, 0.53, 0.5), 1.0, 0.36),
        "hast": material("Hastelloy X", (0.6, 0.55, 0.5), 1.0, 0.4),
        "sx": material("Monocristal PWA 1484 con barrera térmica", (0.78, 0.74, 0.66), 0.6, 0.42),
        "burn": material("Aleación de titanio no inflamable Alloy C", (0.6, 0.56, 0.5), 1.0, 0.36),
        "cmc": material("Matriz cerámica", (0.16, 0.15, 0.15), 0.0, 0.65),
        "steel": material("Acero maraging", (0.66, 0.67, 0.69), 1.0, 0.28),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
    }


def build_f119(prefix, M, parent, location, meta, side, detailed=True):
    root = empty(prefix, location, parent)
    parts = {}

    def part(key, obs, order, explode, pivot=None, **extra):
        ob = join(f"{prefix}.{key}", obs, root)
        info = meta.get(key, {})
        tag(ob, part=key, group=prefix if detailed else f"{prefix}", order=order, explode=list(explode) if detailed else [0, 0, 0], label=info.get("name", key),
            material=info.get("material", ""), melt=list(info.get("melt", [0, 0])), service=info.get("service", 0), system="engines", **extra)
        if pivot is not None:
            set_pivot(ob, pivot)
        parts[key] = ob
        return ob

    F = frame((0, 0, 0), (-1, 0, 0))
    O = (0, 0, 0)
    fan = [lathe("spin", F, [(-380, 0), (-250, 110), (-110, 190), (0, 225), (0, 0)], M["ti"], steps=48),
           lathe("fhub", F, [(0, 70), (0, 230), (760, 270), (760, 70)], M["ti"], steps=48)]
    for k, (s, n) in enumerate(((100, 22), (380, 30), (640, 38))):
        fan.append(blade_ring(f"fan{k}", F, s, 235 + k * 14, 520 - k * 10, n, 200 - k * 30, 30, 62, 8, M["ti"], phase=k * 0.07))
    part("fan", fan, 10, (4400, 0, 0), pivot=O, spin=1, out=9)
    hpc = [lathe("drum", F, [(880, 70), (880, 240), (1680, 270), (1680, 70)], M["ti_dark"], steps=48)]
    for k in range(6):
        hpc.append(blade_ring(f"hpc{k}", F, 940 + k * 135, 245 + k * 4, 400 - k * 15, 40 + 6 * k, 85 - k * 4, 30, 55, 5, M["ti_dark"] if k < 4 else M["inco"], phase=k * 0.11))
    part("compresor", hpc, 11, (2300, 0, 0), pivot=O, spin=1, out=10)
    comb = [lathe("liner", F, [(1750, 290), (1750, 410), (2250, 410), (2250, 398), (1762, 398), (1762, 302), (2250, 302), (2250, 290)], M["hast"], steps=64)]
    for i in range(20):
        th = TAU * i / 20
        comb.append(cylinder_between(f"fn{i}", point(F, 1700, 350, th), point(F, 1790, 350, th), 13, M["inco"], steps=10))
    part("camara", comb, 12, (-1100, 0, 0), out=8)
    part("turbina_alta", [lathe("hptd", F, [(2300, 70), (2300, 270), (2420, 270), (2420, 70)], M["inco"], steps=48), blade_ring("hpt", F, 2360, 275, 415, 64, 90, -40, -55, 9, M["sx"])],
         13, (-1500, 0, 0), pivot=O, spin=1, out=7)
    part("turbina_baja", [lathe("lptd", F, [(2540, 70), (2540, 280), (2680, 290), (2680, 70)], M["inco"], steps=48), blade_ring("lpt", F, 2610, 295, 470, 70, 100, 40, 58, 9, M["sx"])],
         14, (-2000, 0, 0), pivot=O, spin=-1, out=6)
    part("eje", [cylinder_between("shaft", point(F, 10, 0, 0), point(F, 2690, 0, 0), 60, M["steel"], steps=24)], 15, (0, -1500, 0), pivot=O, spin=1, out=11)
    case = [lathe("case", F, [(-40, 545), (-40, 585), (2900, 585), (2900, 545)], M["burn"], steps=64),
            lathe("split", F, [(820, 405), (820, 415), (2300, 415), (2300, 405)], M["ti"], steps=64)]
    for k, s in enumerate((240, 510)):
        case.append(blade_ring(f"vane{k}", F, s, 270, 540, 40, 110, -20, -10, 7, M["ti"], phase=0.04))
    # carcasa partida por el plano del eje: cada mitad sale hacia su lado con sus estátores, sin cruzar el fan
    a, b = halves(join(f"{prefix}.case", case), f"{prefix}.case.b")
    part("carcasa", [a], 16, (0, 1700, 0), out=5)
    part("carcasa.b", [b], 16, (0, -1700, 0), out=5)
    ab = [lathe("abl", F, [(2900, 505), (2900, 560), (4300, 560), (4300, 505)], M["inco"], steps=64),
          lathe("cone", F, [(2750, 0), (2750, 270), (3500, 110), (3700, 0)], M["inco"], steps=48)]
    for r in (210, 380):
        ab.append(lathe(f"gut{r}", F, [(3050, r - 35), (3140, r), (3050, r + 35), (3070, r)], M["inco"], steps=64))
    for i in range(12):
        th = TAU * i / 12
        ab.append(cylinder_between(f"sb{i}", point(F, 2920, 120, th), point(F, 2920, 500, th), 8, M["inco"], steps=8))
    part("postquemador", ab, 17, (-2600, 0, 0), out=4)
    # transición de redondo a rectangular y paredes laterales de la tobera 2D
    rows = []
    for k in range(7):
        f = k / 6
        x = -4300 - 400 * f
        w, h = 560 * (1 - f) + 560 * f, 560 * (1 - f) + 360 * f
        p = 2 + 6 * f
        rows.append([(x, w * math.copysign(abs(math.cos(t)) ** (2 / p), math.cos(t)), h * math.copysign(abs(math.sin(t)) ** (2 / p), math.sin(t))) for t in [TAU * j / 48 for j in range(48)]])
    walls = [loft("trans", rows, M["cmc"], uvscale=4000)]
    for sy in (1, -1):
        walls.append(box(f"wall{sy}", (-4930, sy * 575, 0), (460, 30, 760), M["cmc"]))
    part("tobera", walls, 18, (-3400, 0, 0), out=3)
    for sz, name in ((1, "superior"), (-1, "inferior")):
        flap = hull(f"flap{sz}", [(-4700, -560, sz * 360), (-4700, 560, sz * 360), (-5160, -560, sz * 300), (-5160, 560, sz * 300),
                                  (-4700, -560, sz * 400), (-4700, 560, sz * 400), (-5160, -560, sz * 330), (-5160, 560, sz * 330)], M["cmc"])
        ob = part(f"aleta.{name}", [flap], 19, (-3900, 0, sz * 600), pivot=(-4700, 0, sz * 380), out=1 if sz > 0 else 2, control="vector", hinge=[0.0, 1.0, 0.0], range=[-20, 20])
    return root, parts


def build_f22(M, root, meta, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system="airframe", **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob

    # ── fuselaje en tres tramos; la cabina es la franja superior recortada ──
    xs = sorted(set(range(-7500, 9501, 300)) | {CAN[0], CAN[1], 3200, -4500, -7750}, reverse=True)
    secs = [section(x) for x in xs]
    i3, i4 = xs.index(3200), xs.index(-4500)
    in_can = lambda i: CAN[0] >= xs[i] and xs[i + 1] >= CAN[1]
    part("fuselaje.delantero", [loft("fwd", secs[:i3 + 1], M["skin"], uvscale=4000, keep=lambda i, j: not (in_can(i) and j in TOP))], "airframe", 2, (4500, 0, 0), "Fuselaje delantero con la cabina")
    mid = loft("mid", secs[i3:i4 + 1], M["skin"], uvscale=4000)
    # la popa termina delante de las toberas, que asoman entre las vigas de cola (y por ahí sale el motor)
    aft = loft("aft", secs[i4:], M["skin"], uvscale=4000)
    # vigas de cola por fuera de los motores: llevan las derivas encima y los estabilizadores en su costado
    def boom(side, mat=None, inset=0.0):
        rows = []
        for x in range(-3800, -8801, -500):
            f = smooth(-3800, -5000, x)
            w, zc, h = 120 + 230 * f - inset, -25, 100 + 225 * f - inset
            rows.append([(x, side * BOOM_Y + w * math.copysign(abs(math.cos(t)) ** (2 / 4), math.cos(t)), zc + h * math.copysign(abs(math.sin(t)) ** (2 / 4), math.sin(t))) for t in [TAU * j / 40 for j in range(40)]])
        return loft(f"boom{side}", rows, mat, caps=True, uvscale=4000)
    booms = [boom(side, M["skin"]) for side in (1, -1)]
    part("fuselaje.trasero", [aft] + booms, "airframe", 1, (-3000, 0, 0), "Fuselaje trasero y vigas de cola")

    # cabina: cúpula de una pieza sobre la abertura, con piso, asiento eyectable, tablero y HUD
    rows = []
    cx = [x for x in xs if CAN[0] >= x >= CAN[1]]
    for x in cx:
        s = section(x)
        bulge = 420 * math.sin(math.pi * (CAN[0] - x) / (CAN[0] - CAN[1])) ** 0.6
        row = []
        for k in range(min(TOP), max(TOP) + 2):
            t = (k - min(TOP)) / (max(TOP) + 1 - min(TOP))
            lift = bulge * math.sin(math.pi * t) ** 0.7
            px, py, pz = s[k]
            row.append((px, py * (1 + lift / 1200), pz + lift))
        rows.append(row)
    part("cabina", [loft("canopy", rows, M["glass"], closed=False)], "airframe", 30, (0, 0, 1800), "Cúpula de una pieza")
    # todo el interior queda por debajo de la cúpula y dentro del fuselaje
    tub = box("tub", (5100, 0, 250), (2400, 500, 30), M["cockpit"])
    seat = [box("seatpan", (4600, 0, 360), (420, 440, 180), M["cockpit"]), box("seatback", (4380, 0, 520), (120, 320, 400), M["cockpit"]),
            box("cush", (4610, 0, 470), (380, 400, 40), M["seat"]), box("head", (4400, 0, 735), (160, 200, 70), M["seat"])]
    panel = [box("panel", (5900, 0, 470), (60, 360, 160), M["cockpit"]), box("hood", (5950, 0, 580), (200, 320, 30), M["dark"]),
             box("stick", (5200, 250, 390), (50, 50, 180), M["dark"]), box("thr", (5000, -250, 380), (140, 50, 100), M["dark"])]
    part("cabina.interior", [tub] + seat + panel, "airframe", 29, (0, 0, 1300), "Cabina: asiento, tablero y mandos laterales")

    # ── tomas caret con su conducto en S que esconde el fan (el radar no ve los álabes); el conducto va por dentro
    #    del fuselaje central y es parte de él ──
    ducts = []
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        y0, y1 = side * 1150, side * 2050
        # toma caret: boca trapezoidal con los labios en flecha en planta y de perfil (el labio de abajo y el de
        # dentro van por delante), pared exterior inclinada como el costado del fuselaje
        def ring(x, wy, zb, zt, rake=False, inset=0.0):
            pts = [(1150 + inset, zt - inset), (wy[0] - inset, zt - inset), (wy[1] - inset, zb + inset), (1150 + inset, zb + inset)]
            out = []
            for y, z in pts:
                dx = -(420 * (z - zb) / (zt - zb) + 260 * (y - 1150) / (wy[1] - 1150)) if rake else 0.0
                out.append((x + dx, side * y, z))
            return out
        STA = ((3700, (1950, 2060), -620, 120, True), (3100, (1930, 2030), -610, 110, False), (2300, (1880, 1950), -590, 90, False), (1500, (1780, 1820), -560, 60, False))
        outer = loft(f"inlet{side}", [ring(*st) for st in STA], M["skin"], uvscale=4000)
        inner = loft(f"inletin{side}", [ring(*st, inset=45) for st in STA], M["dark"], uvscale=4000)
        mouth = loft(f"inletlip{side}", [ring(*STA[0]), ring(*STA[0], inset=45)], M["skin"], uvscale=4000)
        lip = [outer, inner, mouth]
        srows = []
        for k in range(10):
            f = k / 9
            x = 1500 + (FAN_X - 1500) * f
            yc = side * (1600 * (1 - f) + ENG_Y * f)
            zc = (-250) * (1 - f) + AX_Z * f
            w = 330 * (1 - f) + 520 * f
            h = 360 * (1 - f) + 520 * f
            p = 6 * (1 - f) + 2 * f
            srows.append([(x, yc + w * math.copysign(abs(math.cos(t)) ** (2 / p), math.cos(t)), zc + h * math.copysign(abs(math.sin(t)) ** (2 / p), math.sin(t))) for t in [TAU * j / 40 for j in range(40)]])
        ducts.append(loft(f"sduct{side}", srows, M["dark"], uvscale=4000))
        part(f"toma.{tagname}", lip, "airframe", 3, (2000, side * 2600, 0), f"Toma caret {tagname}")

    part("fuselaje.central", [mid] + ducts, "airframe", 0, (0, 0, 0), "Fuselaje central con los conductos en S")

    # ── ala en diamante: 42° en el borde de ataque, borde de salida en flecha invertida ──
    LE = lambda y: 1500 - 0.9 * (y - 1600)
    TE = lambda y: -6900 + 0.412 * (y - 1600)
    TT = lambda y: 0.05 - 0.012 * (y - 1600) / 5180
    DZ = lambda y: -150 - math.tan(math.radians(3.25)) * (y - 1600)
    HINGE = 0.8

    def wrow(y, side, a, b):
        ch = LE(y) - TE(y)
        return [(LE(y) - x, side * y, DZ(y) + z) for x, z in naca_cut(ch, TT(y), a, b)]
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        ys = [1600, 2200, 4100, 4200, 6300, 6780]
        wing = loft(f"wing{side}", [wrow(y, side, 0, HINGE) for y in ys], [M["skin"], M["edge"]], caps=True, uvscale=4000, matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)
        fill = [loft(f"wf{side}{a}", [wrow(y, side, HINGE, 1) for y in (a, b)], M["skin"], caps=True, uvscale=4000) for a, b in ((1600, 2200), (4100, 4200), (6300, 6780))]
        for ob in [wing] + fill:
            boolean_cut(ob, [boom(side, None, 6)])   # el ala llega hasta el costado de la viga, no la atraviesa
        part(f"ala.{tagname}", [wing] + fill, "airframe", 4, (0, side * 3200, 0), f"Ala {tagname}")
        for k, (a, b, label) in enumerate(((2200, 4100, "Flaperón"), (4200, 6300, "Alerón"))):
            ob = part(f"{'flaperon' if k == 0 else 'aleron'}.{tagname}", [loft(f"cs{side}{k}", [wrow(y, side, HINGE + 0.004, 1) for y in (a + 15, b - 15)], M["skin"], caps=True, uvscale=4000)],
                      "airframe", 5, (-2000, 0, 0), f"{label} {tagname}", control="aileron", range=[-25, 25], sign=side)
            p0 = Vector((LE(a) - HINGE * (LE(a) - TE(a)), side * a, DZ(a)))
            p1 = Vector((LE(b) - HINGE * (LE(b) - TE(b)), side * b, DZ(b)))
            ob["hinge"] = list((p1 - p0).normalized() * side)
            set_pivot(ob, p0)

    # ── estabilizadores enterizos ──
    SLE = lambda y: -7100 - 0.9 * (y - 2150)
    STE = lambda y: -9800 + 0.41 * (y - 2150)
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        rows = [[(SLE(y) - x, side * y, -150 + z) for x, z in naca_cut(SLE(y) - STE(y), 0.04)] for y in (2150, 3100, 4100)]
        ob = part(f"estabilizador.{tagname}", [loft(f"stab{side}", rows, [M["skin"], M["edge"]], caps=True, uvscale=4000, matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)],
                  "airframe", 6, (-2500, side * 2200, 1500), f"Estabilizador enterizo {tagname}", control="stabilator", range=[-25, 25], sign=side, path="v")
        ob["hinge"] = [0.0, 1.0, 0.0]
        set_pivot(ob, (-8300, side * 2150, -150))

    # ── derivas gemelas inclinadas 28° hacia fuera, con timón ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        cant = math.tan(math.radians(28)) * side
        base = 300

        def frow(h, le, c, a, b):
            return [(le - x, side * 1900 + y + cant * h, base + h) for x, y in naca_cut(c, 0.045, a, b)]
        FIN = ((0, -4700, 3600), (2400, -6900, 1100))
        part(f"deriva.{tagname}", [loft(f"fin{side}", [frow(h, le, c, 0, 0.7) for h, le, c in FIN], [M["skin"], M["edge"]], caps=True, uvscale=4000, matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)],
             "airframe", 7, (0, side * 1800, 2600), f"Deriva {tagname}")
        # el timón empieza un poco por encima de la viga para poder girar sin rozarla
        RUD = ((90, FIN[0][1] + (FIN[1][1] - FIN[0][1]) * 90 / 2400, FIN[0][2] + (FIN[1][2] - FIN[0][2]) * 90 / 2400), FIN[1])
        rud = part(f"timon.{tagname}", [loft(f"rud{side}", [frow(h, le, c, 0.705, 1) for h, le, c in RUD], M["skin"], caps=True, uvscale=4000)],
                   "airframe", 8, (-1200, side * 1800, 2600), f"Timón {tagname}", control="rudder", range=[-30, 30])
        a = Vector((FIN[0][1] - 0.7 * FIN[0][2], side * 1900, base))
        b = Vector((FIN[1][1] - 0.7 * FIN[1][2], side * 1900 + cant * 2400, base + 2400))
        rud["hinge"] = list((b - a).normalized())
        set_pivot(rud, a)

    # ── tren ──
    def wheel(name, c, r, w):
        Fw = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        return [lathe(f"{name}_t", Fw, [(0, r * 0.6), (0, r * 0.9), (w * 0.15, r), (w * 0.85, r), (w, r * 0.9), (w, r * 0.6)], M["rubber"], steps=40),
                lathe(f"{name}_h", Fw, [(w * 0.1, 0), (w * 0.1, r * 0.6), (w * 0.9, r * 0.6), (w * 0.9, 0)], M["alu"], steps=32)]
    part("tren.morro", [cylinder_between("ns", (6300, 0, belly(6300, 0) + 10), (6300, 0, GROUND + 300), 70, M["steel"], steps=20)] + wheel("nw", (6300, 0, GROUND + 300), 300, 200),
         "airframe", 9, (0, 2400, 0), "Tren de morro")
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        y = side * 1400
        part(f"tren.{tagname}", [cylinder_between(f"ms{side}", (-1800, y, belly(-1800, y) + 10), (-1800, y, GROUND + 420), 100, M["steel"], steps=20)] + wheel(f"mw{side}", (-1800, y + side * 160, GROUND + 420), 420, 280),
             "airframe", 9, (0, side * 2400, 0), f"Tren principal {tagname}")

    eng = {}
    for side, prefix, detailed in ((-1, "F119", True), (1, "F119.L", False)):
        er, ep = build_f119(prefix, M, root, (FAN_X, side * ENG_Y, AX_Z), meta, side, detailed)
        tag(er, part=prefix, group="engine", order=40, explode=[-11300, side * 4200, 0], via=[-11300, 0, 0], label="F119 derecho" if detailed else "F119 izquierdo", system="engines")
        eng[prefix] = (er, ep)
        log(f"Motor {prefix}")
    return parts, eng
