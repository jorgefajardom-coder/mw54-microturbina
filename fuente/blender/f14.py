# Grumman F-14D Tomcat según las cotas públicas de su manual de vuelo NATOPS: 19,1 m de largo; 19,54 m de envergadura
# con el ala a 20° y 11,65 m a 68°; 4,88 m de alto. Morro con radomo, cabina en tándem bajo una burbuja, cuerpo plano
# ("pancake") entre dos góndolas muy separadas, tomas rectangulares con rampas móviles, guantes fijos y alas de
# geometría variable que giran sobre su pivote entre 20° y 68° según el Mach, dos derivas y estabilizadores enterizos.
# Motores: dos General Electric F110-GE-400 (fan de 3 etapas, compresor de alta de 9, turbina de alta de 1 etapa y de
# baja de 2, postquemador, tobera convergente-divergente de pétalos; ≈ 120 kN con postquemador).
# 1 unidad = 1 mm, +X morro, +Y izquierda, +Z arriba.
import math
from mathutils import Vector
from lib import (material, lathe, cylinder_between, box, join, tag, frame, point, TAU, empty, hull, boolean_cut, halves)
from hawk import loft, naca_cut, panel_textures, image_of, set_pivot
from sr72 import catmull, blade_ring, rect_duct, smooth, hinged_ring, attach

GROUND = -2150.0
NAC_Y = 1450.0
AX_Z = -250.0
FAN_X = -2600.0
PIVOT = (-700.0, 2720.0)   # pivote del ala (x, y)
WING_Z = 640.0             # plano del guante y del ala: por encima del lomo de las góndolas, para que el ala barra sin tocarlas

# fuselaje delantero redondo: (x, radio horizontal, radio vertical, z del centro)
FWD = [(9900, 20, 20, 0), (9300, 330, 330, 0), (8300, 560, 540, 0), (7000, 690, 680, 30), (5600, 760, 820, 120), (4400, 800, 900, 160), (3400, 840, 820, 150), (2200, 820, 620, 120), (1000, 740, 420, 100)]
CAN = (6300, 3700)


def materials():
    grey = (0.31, 0.33, 0.35)
    c, nrm, rgh = panel_textures(grey, seed=14)
    nrm, rgh = image_of("f14_normal", nrm), image_of("f14_rough", rgh)
    return {
        "skin": material("Gris gaviota claro", (1, 1, 1), 0.05, 0.5, image=image_of("f14_skin", c), normal=nrm, rough=rgh, strength=0.6),
        "dark": material("Interior oscuro", (0.02, 0.02, 0.022), 0.0, 0.8),
        "radome": material("Radomo", (0.22, 0.23, 0.24), 0.0, 0.45),
        "glass": material("Burbuja de acrílico", (0.35, 0.4, 0.42), 0.2, 0.03, coat=1.0, coat_rough=0.01, transmission=0.6, ior=1.49, alpha=0.35),
        "cockpit": material("Gris de cabina", (0.03, 0.032, 0.036), 0.0, 0.6),
        "seat": material("Asiento", (0.05, 0.06, 0.045), 0.0, 0.85),
        "ti": material("Titanio Ti-6Al-4V", (0.62, 0.6, 0.57), 1.0, 0.33),
        "ti_dark": material("Titanio de alta temperatura", (0.52, 0.5, 0.48), 1.0, 0.38),
        "inco": material("Inconel 718", (0.55, 0.53, 0.5), 1.0, 0.36),
        "hast": material("Hastelloy X", (0.6, 0.55, 0.5), 1.0, 0.4),
        "sx": material("Monocristal René N5", (0.78, 0.74, 0.66), 0.6, 0.42),
        "steel": material("Acero maraging", (0.66, 0.67, 0.69), 1.0, 0.28),
        "petal": material("Pétalos de tobera con tono de calor", (0.42, 0.36, 0.36), 1.0, 0.45),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
    }


def build_f110(prefix, M, parent, location, meta, detailed=True):
    root = empty(prefix, location, parent)
    parts = {}

    def part(key, obs, order, explode, pivot=None, **extra):
        ob = join(f"{prefix}.{key}", obs, root)
        info = meta.get(key, {})
        tag(ob, part=key, group=prefix, order=order, explode=list(explode) if detailed else [0, 0, 0], label=info.get("name", key),
            material=info.get("material", ""), melt=list(info.get("melt", [0, 0])), service=info.get("service", 0), system="engines", **extra)
        if pivot is not None:
            set_pivot(ob, pivot)
        parts[key] = ob
        return ob

    F = frame((0, 0, 0), (-1, 0, 0))
    O = (0, 0, 0)
    fan = [lathe("spin", F, [(-400, 0), (-260, 115), (-110, 195), (0, 230), (0, 0)], M["ti"], steps=48),
           lathe("fhub", F, [(0, 70), (0, 235), (780, 275), (780, 70)], M["ti"], steps=48)]
    for k, (s, n) in enumerate(((110, 24), (390, 32), (660, 40))):
        fan.append(blade_ring(f"fan{k}", F, s, 240 + k * 14, 500 - k * 12, n, 190 - k * 25, 30, 62, 8, M["ti"], phase=k * 0.07))
    part("fan", fan, 10, (2400, 0, 0), pivot=O, spin=1, out=7)
    hpc = [lathe("drum", F, [(900, 70), (900, 240), (2100, 270), (2100, 70)], M["ti_dark"], steps=48)]
    for k in range(9):
        hpc.append(blade_ring(f"hpc{k}", F, 950 + k * 125, 245 + k * 3, 395 - k * 10, 40 + 5 * k, 80 - k * 3, 30, 55, 5, M["ti_dark"] if k < 5 else M["inco"], phase=k * 0.11))
    part("compresor", hpc, 11, (2300, 0, 0), pivot=O, spin=1, out=8)
    comb = [lathe("liner", F, [(2180, 285), (2180, 400), (2650, 400), (2650, 388), (2192, 388), (2192, 297), (2650, 297), (2650, 285)], M["hast"], steps=64)]
    for i in range(20):
        th = TAU * i / 20
        comb.append(cylinder_between(f"fn{i}", point(F, 2130, 342, th), point(F, 2220, 342, th), 13, M["inco"], steps=10))
    part("camara", comb, 12, (-1300, 0, 0), out=6)
    part("turbina_alta", [lathe("hptd", F, [(2700, 70), (2700, 270), (2820, 270), (2820, 70)], M["inco"], steps=48), blade_ring("hpt", F, 2760, 275, 410, 66, 90, -40, -55, 9, M["sx"])],
         13, (-2000, 0, 0), pivot=O, spin=1, out=5)
    lpt = [lathe("lptd", F, [(2920, 70), (2920, 280), (3300, 300), (3300, 70)], M["inco"], steps=48)]
    for k, s in enumerate((2990, 3200)):
        lpt.append(blade_ring(f"lpt{k}", F, s, 290, 460 + 20 * k, 70 + 6 * k, 100, -35, -56, 9, M["sx"], phase=k * 0.05))
    part("turbina_baja", lpt, 14, (-2600, 0, 0), pivot=O, spin=1, out=4)
    part("eje", [cylinder_between("shaft", point(F, 10, 0, 0), point(F, 3340, 0, 0), 60, M["steel"], steps=24)], 15, (0, -1500, 0), pivot=O, spin=1, out=9)
    case = [lathe("case", F, [(-40, 545), (-40, 585), (3450, 585), (3450, 545)], M["inco"], steps=64),
            lathe("split", F, [(850, 405), (850, 415), (2700, 415), (2700, 405)], M["ti"], steps=64)]
    for k, s in enumerate((250, 525)):
        case.append(blade_ring(f"vane{k}", F, s, 270, 540, 40, 110, -20, -10, 7, M["ti"], phase=0.04))
    # carcasa partida por el plano del eje: cada mitad sale hacia su lado con sus estátores, sin cruzar el fan
    a, b = halves(join(f"{prefix}.case", case), f"{prefix}.case.b")
    part("carcasa", [a], 16, (0, 1700, 0), out=3)
    part("carcasa.b", [b], 16, (0, -1700, 0), out=3)
    ab = [lathe("abl", F, [(3450, 505), (3450, 560), (5300, 560), (5300, 505)], M["inco"], steps=64),
          lathe("cone", F, [(3350, 0), (3350, 280), (4100, 110), (4300, 0)], M["inco"], steps=48)]
    for r in (210, 380):
        ab.append(lathe(f"gut{r}", F, [(3650, r - 35), (3740, r), (3650, r + 35), (3670, r)], M["inco"], steps=64))
    for i in range(12):
        th = TAU * i / 12
        ab.append(cylinder_between(f"sb{i}", point(F, 3520, 120, th), point(F, 3520, 500, th), 8, M["inco"], steps=8))
    part("postquemador", ab, 17, (-3400, 0, 0), out=2)
    # tobera de pétalos: la garganta se cierra en seco y se abre con el postquemador (la controla el núcleo)
    # tobera de pétalos: anillo de montaje y 18 pétalos que cierran la garganta en seco y se abren con el postquemador
    ring = lathe("nzring", F, [(5260, 530), (5260, 590), (5330, 590), (5330, 530)], M["petal"], steps=64)
    nz = part("tobera", [ring], 18, (-3600, 0, 0), out=1)
    attach(nz, hinged_ring("pt", F, 5300, 5900, 555, 470, 18, M["petal"], "iris", width=0.95, thick=18))
    return root, parts


def fwd_section(x, n=48):
    _, ry, rz, zc = catmull(FWD, x)
    return [(x, ry * math.cos(TAU * k / n), zc + rz * math.sin(TAU * k / n)) for k in range(n)]


def build_f14(M, root, meta, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system="airframe", **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob

    # ── morro con radomo y fuselaje delantero redondo, abierto arriba para la cabina ──
    TOP = set(range(8, 17))
    rad = [fwd_section(x) for x in range(9900, 8299, -200)]
    part("radomo", [loft("radome", rad, M["radome"], uvscale=4000)], "airframe", 13, (3000, 0, 0), "Radomo del radar AN/APG-71")
    xs = sorted(set(range(8300, 999, -200)) | {CAN[0], CAN[1], 1000}, reverse=True)
    secs = [fwd_section(x) for x in xs]
    in_can = lambda i: CAN[0] >= xs[i] and xs[i + 1] >= CAN[1]
    part("fuselaje.delantero", [loft("fwd", secs, M["skin"], uvscale=4000, caps=True, keep=lambda i, j: not (in_can(i) and j in TOP))], "airframe", 3, (2200, 0, 0), "Fuselaje delantero con la cabina en tándem")
    rows = []
    for x in [x for x in xs if CAN[0] >= x >= CAN[1]]:
        s = fwd_section(x)
        bulge = 430 * math.sin(math.pi * (CAN[0] - x) / (CAN[0] - CAN[1])) ** 0.55
        row = []
        for k in range(min(TOP), max(TOP) + 2):
            t = (k - min(TOP)) / (max(TOP) + 1 - min(TOP))
            lift = bulge * math.sin(math.pi * t) ** 0.7
            px, py, pz = s[k]
            row.append((px, py * (1 + lift / 1500), pz + lift))
        rows.append(row)
    part("cabina", [loft("canopy", rows, M["glass"], closed=False)], "airframe", 30, (0, 0, 1500), "Burbuja de la cabina")
    interior = [box("floor", (5000, 0, 250), (2600, 900, 30), M["cockpit"])]
    for x in (5500, 4300):
        interior += [box(f"pan{x}", (x, 0, 420), (420, 520, 220), M["cockpit"]), box(f"back{x}", (x - 230, 0, 700), (120, 520, 600), M["cockpit"]),
                     box(f"head{x}", (x - 230, 0, 1000), (180, 340, 160), M["seat"]), box(f"dash{x}", (x + 520, 0, 650), (60, 760, 260), M["cockpit"])]
    part("cabina.interior", interior, "airframe", 29, (0, 0, 1100), "Puestos del piloto y del oficial de interceptación de radar")

    # ── cuerpo central plano ("pancake") entre las góndolas, del final del fuselaje delantero a la cola ──
    def pancake(x):
        # llega hasta el eje de las góndolas y luego se recorta con ellas; su lomo queda por debajo del de las góndolas
        w = 900 + 550 * smooth(2600, 600, x) - 650 * smooth(-6400, -7800, x)
        h = 260 + 80 * smooth(2400, 600, x) - 80 * smooth(-5000, -7800, x)
        return [(x, w * math.copysign(abs(math.cos(t)) ** (2 / 4), math.cos(t)), 120 + h * math.copysign(abs(math.sin(t)) ** (2 / 2.5), math.sin(t))) for t in [TAU * k / 48 for k in range(48)]]
    pan = loft("pan", [pancake(x) for x in range(2600, -8801, -400)], M["skin"], uvscale=4000, caps=True)

    def nacelle_rows(side, inset=0.0):
        rows = []
        for x in range(2400, -7801, -400):
            w = 560 + 120 * smooth(2400, 600, x) - 60 * smooth(-5000, -7800, x) - inset
            h = 640 + 80 * smooth(2400, 600, x) - 80 * smooth(-5000, -7800, x) - inset
            p = 6 - 4 * smooth(-1500, -6000, x)
            rows.append([(x, side * NAC_Y + w * math.copysign(abs(math.cos(t)) ** (2 / p), math.cos(t)), AX_Z + h * math.copysign(abs(math.sin(t)) ** (2 / p), math.sin(t))) for t in [TAU * k / 40 for k in range(40)]])
        return rows
    # volumen de cada góndola (un poco por dentro de su piel) para recortar lo que llega hasta ella
    cutters = lambda: [loft(f"nacut{side}", nacelle_rows(side, 6), None, caps=True) for side in (1, -1)]
    boolean_cut(pan, cutters())
    part("fuselaje.central", [pan], "airframe", 0, (0, 0, 0), "Cuerpo central plano entre las góndolas")

    # ── góndolas con la toma rectangular y sus rampas móviles ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        rows = nacelle_rows(side)
        duct = []
        for k in range(8):
            f = k / 7
            x = 2300 + (FAN_X - 2300) * f
            w, h, p = 520 * (1 - f) + 500 * f, 600 * (1 - f) + 500 * f, 6 * (1 - f) + 2 * f
            duct.append([(x, side * NAC_Y + w * math.copysign(abs(math.cos(t)) ** (2 / p), math.cos(t)), AX_Z + h * math.copysign(abs(math.sin(t)) ** (2 / p), math.sin(t))) for t in [TAU * j / 40 for j in range(40)]])
        part(f"gondola.{tagname}", [loft(f"nac{side}", rows, M["skin"], uvscale=4000), loft(f"duct{side}", duct, M["dark"], uvscale=4000)], "airframe", 3, (0, side * 1200, -1000), f"Góndola {tagname} con su toma", path="v")
        # rampas: forman el techo del conducto, por debajo de él, y salen hacia delante por la boca de la toma
        ramp = hull(f"ramp{side}", [(2300, side * NAC_Y - 420, AX_Z + 520), (2300, side * NAC_Y + 420, AX_Z + 520), (700, side * NAC_Y - 350, AX_Z + 490), (700, side * NAC_Y + 350, AX_Z + 490),
                                    (2300, side * NAC_Y - 420, AX_Z + 560), (2300, side * NAC_Y + 420, AX_Z + 560), (700, side * NAC_Y - 350, AX_Z + 525), (700, side * NAC_Y + 350, AX_Z + 525)], M["skin"])
        ob = part(f"rampa.{tagname}", [ramp], "airframe", 8, (2600, 0, 900), f"Rampas de la toma {tagname}", control="ramp", hinge=[0.0, 1.0, 0.0], range=[0, 18])
        set_pivot(ob, (2300, side * NAC_Y, AX_Z + 540))

    # ── guantes fijos (flecha de ~67°) y alas de geometría variable sobre su pivote ──
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        glove = []
        # el guante nace en el costado exterior de la góndola (por dentro de ella sólo hay toma y motor)
        f = (2000 - 900) / (PIVOT[1] + 200 - 900)
        for y, le, te in ((2000, 3600 - 4000 * f, -4200 + 600 * f), (PIVOT[1] + 200, -400, -3600)):
            glove.append([(le - x, side * y, WING_Z + z) for x, z in naca_cut(le - te, 0.06)])
        gl = loft(f"glove{side}", glove, M["skin"], caps=True, uvscale=4000)
        boolean_cut(gl, [loft(f"glcut{side}", nacelle_rows(side, 6), None, caps=True)])
        part(f"guante.{tagname}", [gl], "airframe", 4, (0, side * 2200, 600), f"Guante {tagname}")
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        # ala dibujada a 20° de flecha; el visor la gira sobre el pivote hasta 68°
        sw = math.tan(math.radians(20))
        rows = []
        for k, y in enumerate((PIVOT[1] - 200, 5500, 8000, 9770)):
            le = PIVOT[0] + 1300 - (y - PIVOT[1]) * sw
            c = 3400 - 2150 * (y - PIVOT[1] + 200) / (9770 - PIVOT[1] + 200)
            rows.append([(le - x, side * y, WING_Z + z - 0.02 * (y - PIVOT[1])) for x, z in naca_cut(c, 0.09 - 0.03 * k / 3)])
        ob = part(f"ala.{tagname}", [loft(f"wing{side}", rows, M["skin"], caps=True, uvscale=4000)], "airframe", 5, (0, side * 3500, 300), f"Ala de geometría variable {tagname}",
                  control="sweep", hinge=[0.0, 0.0, 1.0], range=[20, 68], sign=side)
        set_pivot(ob, (PIVOT[0], side * PIVOT[1], WING_Z))

    # ── estabilizadores enterizos y dos derivas ──
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        # la raíz va pegada al costado exterior de la góndola, por fuera del postquemador y de la tobera
        rows = [[(le - x, side * y, AX_Z + 60 + z) for x, z in naca_cut(c, 0.045)] for y, le, c in ((2110, -6450, 3030), (3300, -7800, 1900), (4980, -9000, 750))]
        ob = part(f"estabilizador.{tagname}", [loft(f"stab{side}", rows, M["skin"], caps=True, uvscale=4000)], "airframe", 6, (-2200, side * 2400, 0),
                  f"Estabilizador enterizo {tagname}", control="stabilator", range=[-25, 25], sign=side)
        ob["hinge"] = [0.0, 1.0, 0.0]
        set_pivot(ob, (-7600, side * 2110, AX_Z + 60))
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        cant = math.tan(math.radians(5)) * side
        base = AX_Z + 600

        def frow(h, le, c, a, b):
            return [(le - x, side * NAC_Y + y + cant * h, base + h) for x, y in naca_cut(c, 0.05, a, b)]
        FIN = ((0, -4800, 3700), (2350, -7600, 1300))
        part(f"deriva.{tagname}", [loft(f"fin{side}", [frow(h, le, c, 0, 0.72) for h, le, c in FIN], M["skin"], caps=True, uvscale=4000)], "airframe", 9, (0, side * 1600, 2600), f"Deriva {tagname}", path="v")
        # el timón empieza por encima del lomo de la góndola para poder girar sin rozarla
        RUD = ((60, FIN[0][1] + (FIN[1][1] - FIN[0][1]) * 60 / 2350, FIN[0][2] + (FIN[1][2] - FIN[0][2]) * 60 / 2350), FIN[1])
        rud = part(f"timon.{tagname}", [loft(f"rud{side}", [frow(h, le, c, 0.725, 1) for h, le, c in RUD], M["skin"], caps=True, uvscale=4000)], "airframe", 10, (-1200, side * 1600, 2600),
                   f"Timón {tagname}", control="rudder", range=[-30, 30])
        a = Vector((FIN[0][1] - 0.72 * FIN[0][2], side * NAC_Y, base))
        b = Vector((FIN[1][1] - 0.72 * FIN[1][2], side * NAC_Y + cant * 2350, base + 2350))
        rud["hinge"] = list((b - a).normalized())
        set_pivot(rud, a)

    # ── tren: rueda doble en el morro con barra de catapulta, principales bajo los guantes ──
    def wheel(name, c, r, w):
        Fw = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        return [lathe(f"{name}_t", Fw, [(0, r * 0.6), (0, r * 0.9), (w * 0.15, r), (w * 0.85, r), (w, r * 0.9), (w, r * 0.6)], M["rubber"], steps=40),
                lathe(f"{name}_h", Fw, [(w * 0.1, 0), (w * 0.1, r * 0.6), (w * 0.9, r * 0.6), (w * 0.9, 0)], M["alu"], steps=32)]
    nose = [cylinder_between("ns", (7400, 0, -630), (7400, 0, GROUND + 280), 80, M["steel"], steps=20), box("launch", (7700, 0, GROUND + 520), (700, 60, 60), M["steel"])]
    for y in (-170, 170):
        nose += wheel(f"nw{y}", (7400, y, GROUND + 280), 280, 180)
    part("tren.morro", nose, "airframe", 11, (0, 2200, 0), "Tren de morro con barra de lanzamiento")
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        y = side * 2550
        part(f"tren.{tagname}", [cylinder_between(f"ms{side}", (-1300, y, 430), (-1300, y, GROUND + 450), 110, M["steel"], steps=20)] + wheel(f"mw{side}", (-1300, y + side * 200, GROUND + 450), 450, 300),
             "airframe", 11, (0, side * 1800, 0), f"Tren principal {tagname}")
    part("gancho", [cylinder_between("hook", (-6200, 0, -150), (-8800, 0, -450), 60, M["steel"], steps=16)], "airframe", 12, (-2000, 0, -800), "Gancho de apontaje")

    eng = {}
    for side, prefix, detailed in ((-1, "F110", True), (1, "F110.L", False)):
        er, ep = build_f110(prefix, M, root, (FAN_X, side * NAC_Y, AX_Z), meta, detailed)
        tag(er, part=prefix, group="engine", order=40, explode=[-10000, 0, -1250], label="F110 derecho" if detailed else "F110 izquierdo", system="engines")
        eng[prefix] = (er, ep)
        log(f"Motor {prefix}")
    return parts, eng
