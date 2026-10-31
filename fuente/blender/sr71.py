# Lockheed SR-71 Blackbird: 32,74 m de largo, 16,94 m de envergadura. Fuselaje con aristas (chines) que nacen en el
# morro y se funden con el ala en delta, góndolas a media ala con el cono de entrada que se retrasa 66 cm con el Mach,
# derivas enterizas inclinadas hacia dentro sobre las góndolas, y dos Pratt & Whitney J58: turborreactor con
# postquemador, compresor de 9 etapas, turbina de 2, seis tubos que llevan aire del 4.º escalón al postquemador por
# encima de Mach 2 y eyector con aletas libres al final de la góndola. 1 unidad = 1 mm, +X morro, +Y izquierda.
import math
from mathutils import Vector
from lib import (material, lathe, cylinder_between, box, join, tag, frame, point, TAU, empty, hull, tube_path, boolean_cut, halves)
from hawk import loft, naca_cut, panel_textures, image_of, set_pivot
from sr72 import catmull, blade_ring, hinged_ring, attach

GROUND = -2700.0
NAC_Y = 4100.0    # góndolas a media ala, como en el plano de tres vistas
NAC_Z = -150.0
FACE_X = -4200.0   # cara del compresor (mundo): la punta del cono queda en x = −800, como en el plano
OUTER = [(-2300, 840), (-1000, 960), (2000, 980), (4800, 950), (7300, 880)]   # radio exterior de la góndola
# hueco que la góndola y el eyector abren en el ala: el ala llega hasta la piel de la góndola y no sigue por dentro
HOLE = [(-4700, 0), (-4700, 830), (-2300, 834), (-1000, 954), (2000, 974), (4800, 944), (7300, 874), (7300, 920), (10300, 920), (10300, 0)]


def door_angles(n, w, keep=0.45, fin=0.0):
    """Ángulos de las compuertas repartidos fuera de la unión con el ala (a 0° y 180°, ±`keep` rad) y, si `fin`, fuera
    del pie de la deriva (arriba, ±`fin` rad)."""
    half = math.pi / n * w
    arcs = [(keep + half, math.pi / 2 - fin - half), (math.pi / 2 + fin + half, math.pi - keep - half), (math.pi + keep + half, TAU - keep - half)] if fin else \
        [(keep + half, math.pi - keep - half), (math.pi + keep + half, TAU - keep - half)]
    per = [n // 4, n // 4, n - 2 * (n // 4)] if fin else [n // 2, n - n // 2]
    return [a + (b - a) * (k + 0.5) / m for (a, b), m in zip(arcs, per) for k in range(m)]



ST = [
    (16000, 30, 10, 10, 0), (14500, 700, 220, 180, 0), (12000, 1500, 460, 300, 0), (9000, 2200, 760, 420, 0),
    (6000, 2700, 880, 520, 0), (2000, 2900, 820, 600, 0), (-2000, 2700, 760, 640, 0), (-6000, 2400, 680, 640, 0),
    (-10000, 2000, 580, 600, 0), (-14000, 1500, 440, 500, 0), (-16700, 1100, 330, 380, 0),
]


def section(x, n=64):
    _, w, ht, hb, zc = catmull(ST, x)
    pts = []
    for k in range(n):
        t = TAU * k / n
        c, s = math.cos(t), math.sin(t)
        p = 1.5 if s >= 0 else 2.2
        pts.append((x, w / 2 * math.copysign(abs(c) ** (2 / p), c), zc + (ht if s >= 0 else hb) * math.copysign(abs(s) ** (2 / p), s)))
    return pts


def materials():
    black = (0.012, 0.012, 0.014)
    c, nrm, rgh = panel_textures(black, seed=71)
    nrm, rgh = image_of("sr71_normal", nrm), image_of("sr71_rough", rgh)
    return {
        "skin": material("Titanio con pintura de ferrita negra", (1, 1, 1), 0.2, 0.55, image=image_of("sr71_skin", c), normal=nrm, rough=rgh, strength=0.7),
        "edge": material("Borde de plástico compuesto absorbente", (0.03, 0.03, 0.035), 0.0, 0.6),
        "glass": material("Parabrisas de cuarzo", (0.25, 0.3, 0.35), 0.4, 0.05, coat=1.0, coat_rough=0.02, transmission=0.3, ior=1.46, alpha=0.6),
        "dark": material("Interior oscuro", (0.02, 0.02, 0.022), 0.0, 0.8),
        "ti": material("Titanio Ti-13V-11Cr-3Al", (0.6, 0.58, 0.55), 1.0, 0.36),
        "steel": material("Acero inoxidable", (0.66, 0.67, 0.69), 1.0, 0.3),
        "wasp": material("Waspaloy", (0.58, 0.56, 0.52), 1.0, 0.36),
        "inco": material("Inconel X-750", (0.55, 0.53, 0.5), 1.0, 0.38),
        "hast": material("Hastelloy X", (0.6, 0.55, 0.5), 1.0, 0.4),
        "blade": material("Superaleación de níquel colada", (0.7, 0.66, 0.6), 0.8, 0.42),
        "hot": material("Hastelloy X con tono de calor", (0.48, 0.38, 0.42), 1.0, 0.45),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
    }


def build_j58(prefix, M, parent, location, meta, detailed=True):
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
    # cono de entrada: punta 3,4 m por delante de la cara del compresor, 1,1 m por delante del labio; se desliza
    # 660 mm hacia atrás con el Mach
    spike = lathe("spike", F, [(-3400, 0), (-2720, 260), (-2040, 560), (-1740, 640), (-900, 520), (-300, 330), (0, 300), (0, 0)], M["ti"], steps=64)
    part("cono", [spike], 1, (3500, 0, 0), out=1, control="spike", slide=[-1.0, 0.0, 0.0], range=[0, 660])
    comp = [lathe("drum", F, [(0, 80), (0, 300), (1600, 330), (1600, 80)], M["wasp"], steps=48)]   # con el agujero del eje
    for k in range(9):
        s = 80 + k * 175
        comp.append(blade_ring(f"c{k}", F, s, 305 + k * 3, 640 - k * 22, 32 + 5 * k, 110 - k * 5, 30, 55, 6, M["ti"] if k < 4 else M["wasp"], phase=k * 0.1))
    part("compresor", comp, 10, (2000, 0, 0), pivot=O, spin=1, out=9)
    tubes = []
    for i in range(6):
        th = TAU * i / 6 + 0.26
        a = point(F, 720, 680, th)
        b = point(F, 820, 730, th)
        c = point(F, 2900, 730, th)
        d = point(F, 3100, 680, th)
        tubes.append(tube_path(f"bt{i}", [tuple(a), tuple(b), tuple(c), tuple(d)], 70, M["steel"], bend=120))
    part("tubos", tubes, 11, (-2600, 0, 2400), out=5)
    comb = [lathe("cmbcase", F, [(1700, 330), (1700, 600), (2350, 600), (2350, 330)], M["hast"], steps=64)]
    for i in range(8):
        th = TAU * i / 8
        Fc = frame(point(F, 1720, 465, th), (-1, 0, 0))
        comb.append(lathe(f"can{i}", Fc, [(0, 0), (0, 95), (600, 95), (600, 0)], M["hot"], steps=24))
    # soportes de la cámara a la carcasa: ocho patas radiales que la centran en el motor
    for i in range(8):
        th = TAU * (i + 0.5) / 8
        comb.append(cylinder_between(f"cmbleg{i}", point(F, 2020, 600, th), point(F, 2020, 638, th), 22, M["hast"], steps=8))
    part("camara", comb, 12, (-1200, 0, 0), out=8)
    turb = [lathe("tdisc", F, [(2400, 80), (2400, 330), (2750, 340), (2750, 80)], M["wasp"], steps=48)]
    for k, s in enumerate((2470, 2660)):
        turb.append(blade_ring(f"t{k}", F, s, 335, 560 + k * 30, 68 + 8 * k, 105, -40, -56, 10, M["blade"], phase=k * 0.05))
    part("turbina", turb, 13, (-2000, 0, 0), pivot=O, spin=1, out=7)
    part("eje", [cylinder_between("shaft", point(F, 20, 0, 0), point(F, 2800, 0, 0), 75, M["steel"], steps=24)], 14, (0, -1500, 0), pivot=O, spin=1, out=10)
    case = [lathe("case", F, [(-60, 640), (-60, 690), (2950, 690), (2950, 640)], M["inco"], steps=64)]
    for k in range(3):
        case.append(blade_ring(f"igv{k}", F, (-40, 692, 1392)[k], (315, 318, 332)[k], 640, 30, 64, -15, -8, 7, M["inco"], phase=0.03))
    # la carcasa se parte en dos mitades por el plano del eje, como la real, y cada una sale hacia su lado con sus
    # estátores sin cruzar los álabes del rotor
    a, b = halves(join(f"{prefix}.case", case), f"{prefix}.case.b")
    part("carcasa", [a], 15, (0, 2000, 0), out=6)
    part("carcasa.b", [b], 15, (0, -2000, 0), out=6)
    ab = [lathe("abl", F, [(2950, 640), (2950, 690), (6500, 690), (6500, 640)], M["hast"], steps=64),
          lathe("cone", F, [(2800, 0), (2800, 330), (3900, 150), (4200, 0)], M["inco"], steps=48)]
    for r in (260, 470):
        ab.append(lathe(f"gut{r}", F, [(3300, r - 40), (3410, r), (3300, r + 40), (3320, r)], M["inco"], steps=64))
    for i in range(12):
        th = TAU * i / 12
        ab.append(cylinder_between(f"sb{i}", point(F, 3150, 140, th), point(F, 3150, 630, th), 9, M["inco"], steps=8))
    part("postquemador", ab, 16, (-3000, 0, 0), out=4)
    part("tobera", [lathe("cd", F, [(6500, 640), (6500, 690), (7100, 560), (7300, 600), (7300, 570), (7100, 530)], M["inco"], steps=48)], 17, (-4200, 0, 0), out=3)
    # eyector: anillo de montaje y 16 aletas libres; convergen a baja velocidad y el propio flujo las abre hasta Mach 3,2
    ring = lathe("ejring", F, [(7350, 700), (7350, 790), (7460, 790), (7460, 700)], M["hot"], steps=64)
    ej = part("eyector", [ring], 18, (-5400, 0, 0), out=2)
    attach(ej, hinged_ring("ejf", F, 7430, 9900, 760, 610, 16, M["hot"], "ejector", width=0.94, thick=28))
    return root, parts


def build_sr71(M, root, meta, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system="airframe", **extra):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system, **extra)
        parts.append(ob)
        log(label)
        return ob

    # ── fuselaje ──
    def body(x0, x1, step=500):
        return [section(x) for x in range(x0, x1 - 1, -step)] + ([section(x1)] if (x0 - x1) % step else [])
    part("fuselaje.morro", [loft("nose", body(16000, 6000), M["skin"], uvscale=4000)], "airframe", 2, (5500, 0, 0), "Morro con la sonda y el puesto de los sensores")
    part("fuselaje.central", [loft("mid", body(6000, -6000), M["skin"], uvscale=4000)], "airframe", 0, (0, 0, 0), "Fuselaje central (tanques de JP-7)")
    part("fuselaje.trasero", [loft("aft", body(-6000, -16700), M["skin"], uvscale=4000, caps=True)], "airframe", 1, (-5000, 0, 0), "Fuselaje trasero")
    # cabina en tándem: parabrisas y dos cúpulas que siguen el lomo
    cockpit = []
    for k, (x0, x1) in enumerate(((10400, 9100), (8900, 7400))):   # como en el plano: la cabina empieza a 5,5 m de la punta
        rows = []
        for i in range(9):
            x = x0 - (x0 - x1) * i / 8
            top = catmull(ST, x)
            zt = top[4] + top[2]
            bulge = 300 * math.sin(math.pi * i / 8) ** 0.6
            w = top[1]
            # el borde de la cúpula sigue la piel del lomo (superelipse de exponente 1,5) y queda apenas por dentro
            zb = lambda y: top[4] + top[2] * max(0.0, 1 - (2 * abs(y) / w) ** 1.5) ** (1 / 1.5)
            rows.append([(x, 380 * math.cos(t), zb(380 * math.cos(t)) - 12 + bulge * math.sin(t) ** 0.8) for t in [math.pi * j / 16 for j in range(17)]])
        cockpit.append(loft(f"can{k}", rows, M["glass"] if k == 0 else M["skin"], closed=False))
    part("cabina", cockpit, "airframe", 30, (0, 0, 1800), "Cabina en tándem: piloto y oficial de reconocimiento")

    # ── aristas (chines): láminas finas desde el morro hasta el borde de ataque del ala; su borde sigue la ojiva del
    #    plano de tres vistas (media anchura en mm según x) y se queda en 1945 mm hasta la raíz del ala ──
    CHINE = [(15182, 123), (14363, 410), (13544, 737), (12726, 1024), (11908, 1229), (11089, 1413), (10270, 1556), (9452, 1679), (8634, 1781), (7815, 1843), (6996, 1904), (6178, 1925), (5360, 1945), (-400, 1945)]
    chine_edge = lambda x: next(e0 + (e1 - e0) * (x0 - x) / (x0 - x1) for (x0, e0), (x1, e1) in zip(CHINE, CHINE[1:]) if x0 >= x >= x1) if x <= CHINE[0][0] else CHINE[0][1]
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        rows = []
        for x in [15180] + list(range(14800, -401, -400)):
            half = catmull(ST, x)[1] / 2 - 60
            edge = max(half + 20, chine_edge(x))
            rows.append([(x, side * half, 25), (x, side * edge, 0), (x, side * half, -25)])
        part(f"arista.{tagname}", [loft(f"chine{side}", rows, M["skin"], closed=True, caps=True, uvscale=4000)], "airframe", 3, (2000, side * 2200, 0), f"Arista {tagname}")

    # ── ala en delta: 60° de flecha, perfil fino; elevones exteriores e interiores ──
    LINE = lambda y: -400 - 1.88 * (y - 1945)   # del fin de las aristas (x = −400) a la punta (x ≈ −12 650), como en el plano
    # por fuera de la góndola el borde de ataque nace casi en su boca y se curva hasta la línea del ala (carenado)
    FAIR = lambda y: -2600 - max(0.0, y - (NAC_Y + 900)) ** 2 / 1300 ** 2 * (-2600 - LINE(NAC_Y + 2200))
    LE = lambda y: max(LINE(y), FAIR(y)) if y > NAC_Y else LINE(y)
    TE = lambda y: -14300 + 0.03 * (y - 1300)
    HINGE = 0.84

    SPANS = ((1500, 3100), (5100, 8100))
    # charnela recta en cada elevón aunque el borde de ataque se curve junto a la góndola: el elevón gira sin rozar el ala
    def split(y):
        for a, b in SPANS:
            if a <= y <= b:
                ha, hb = LE(a) - HINGE * (LE(a) - TE(a)), LE(b) - HINGE * (LE(b) - TE(b))
                return (LE(y) - (ha + (hb - ha) * (y - a) / (b - a))) / (LE(y) - TE(y))
        return HINGE

    def wrow(y, side, a, b, t=0.04):
        ch = LE(y) - TE(y)
        return [(LE(y) - x, side * y, NAC_Z + z) for x, z in naca_cut(ch, t, a, b)]
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        hole = lambda: lathe(f"hole{side}", frame((FACE_X, side * NAC_Y, NAC_Z), (-1, 0, 0)), HOLE, steps=64)
        for key, ys, fills, order, explode, title in (
                ("ala", [1300, 2000, 2800, 3600], ((1300, 1500), (3100, 3600)), 4, (0, side * 2200, 0), "Ala interior"),
                ("ala.ext", [4600, 5000, 5300, 5600, 5900, 6300, 6800, 8100, 8470], ((4600, 5100), (8100, 8470)), 4, (0, side * 5000, 0), "Ala exterior")):
            wing = loft(f"wing{side}{key}", [wrow(y, side, 0, split(y)) for y in ys], [M["skin"], M["edge"]], caps=True, uvscale=4000, matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)
            fill = [loft(f"wf{side}{a}", [wrow(y, side, HINGE, 1) for y in (a, b)], M["skin"], caps=True, uvscale=4000) for a, b in fills]
            for ob in [wing] + fill:
                boolean_cut(ob, [hole()])   # cada pieza por separado: juntas, el corte falla en sus caras comunes
            part(f"{key}.{tagname}", [wing] + fill, "airframe", order, explode, f"{title} {tagname}")
        # elevones: el interior sale hacia atrás y el exterior hacia fuera, ninguno pasa por la góndola ni por el otro
        for k, (a, b) in enumerate(SPANS):
            rows = [a + 20] + [y for y in (2000, 2800, 5300, 5600, 5900, 6300, 6800) if a < y < b] + [b - 20]
            ob = part(f"elevon.{tagname}.{k}", [loft(f"ev{side}{k}", [wrow(y, side, split(y) + 0.004, 1) for y in rows], M["skin"], caps=True, uvscale=4000)],
                      "airframe", 5, (-2600, 0, 0), f"Elevón {'interior' if k == 0 else 'exterior'} {tagname}", control="elevon", range=[-20, 20], sign=side)
            p0 = Vector((LE(a) - HINGE * (LE(a) - TE(a)), side * a, NAC_Z))
            p1 = Vector((LE(b) - HINGE * (LE(b) - TE(b)), side * b, NAC_Z))
            ob["hinge"] = list((p1 - p0).normalized() * side)
            set_pivot(ob, p0)

    # ── góndolas: piel exterior desde el labio de la toma hasta el eyector ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        prof = [(-2300, 800), (-2300, 840), (-1000, 960), (2000, 980), (4800, 950), (7300, 880), (7300, 840), (2000, 940), (-1000, 920), (-2250, 805)]
        F = frame((FACE_X, side * NAC_Y, NAC_Z), (-1, 0, 0))
        nac = lathe(f"nac{side}", F, prof, M["skin"], steps=64)
        # compuertas de la góndola, como en el SR-71: de derivación delanteras junto a la toma (abren hacia fuera por
        # encima de Mach 1,4 para tirar el aire que sobra), de succión junto a la cara del compresor (abren hacia dentro
        # al despegar) y terciarias delante del eyector (abiertas a baja velocidad, cerradas al pasar Mach 1)
        outer = lambda s_: next(r0 + (r1 - r0) * (s_ - a0) / (a1 - a0) for (a0, r0), (a1, r1) in zip(OUTER, OUTER[1:]) if a0 <= s_ <= a1)
        doors, recess = [], []
        for name, s0, s1, n, kind, w in (("bp", -1750, -1300, 6, "bypass", 0.55), ("si", -300, 350, 8, "suckin", 0.6), ("te", 6000, 6600, 12, "tertiary", 0.7)):
            r0, r1 = outer(s0) + 4, outer(s1) + 4
            at = door_angles(n, w, fin=0.5 if kind == "tertiary" else 0.0)
            doors += hinged_ring(f"{name}{side}", F, s0, s1, r0, r1, n, M["skin"], kind, width=w, thick=12, at=at)
            recess += [hull(f"{name}h{side}{i}", [tuple(point(F, ss, rr, t)) for ss, rr in ((s0 + 20, outer(s0 + 20) + 2), (s1 - 20, outer(s1 - 20) + 2)) for t in (th - TAU / n * w * 0.45, th + TAU / n * w * 0.45)]
                             + [tuple(point(F, ss, rr - 25, t)) for ss, rr in ((s0 + 20, outer(s0 + 20)), (s1 - 20, outer(s1 - 20))) for t in (th - TAU / n * w * 0.45, th + TAU / n * w * 0.45)], M["dark"])
                       for i, th in enumerate(door_angles(n, w, fin=0.5 if kind == "tertiary" else 0.0))]
        nacp = part(f"gondola.{tagname}", [nac] + recess, "airframe", 7, (0, side * 3500, 0), f"Góndola {tagname} con el labio de la toma y sus compuertas")
        attach(nacp, doors)

    # ── derivas enterizas sobre las góndolas, inclinadas 15° hacia dentro ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        cant = -math.tan(math.radians(15)) * side
        base = NAC_Z + 975

        def frow(h, le, c):
            if h == 0:
                # la raíz copia el lomo de la góndola, 30 mm por encima (gira sin rozarla y no queda en el aire)
                top = lambda x: NAC_Z + next(r0 + (r1 - r0) * (s_ - a0) / (a1 - a0) for s_ in [min(7300, max(-2300, FACE_X - x))]
                                             for (a0, r0), (a1, r1) in zip(OUTER, OUTER[1:]) if a0 <= s_ <= a1) + 30
                return [(le - x, side * NAC_Y + y, top(le - x)) for x, y in naca_cut(c, 0.05)]
            return [(le - x, side * NAC_Y + y + cant * h, base + h) for x, y in naca_cut(c, 0.05)]
        FIN = ((0, -9600, 4000), (2300, -12000, 1600))
        ob = part(f"deriva.{tagname}", [loft(f"fin{side}", [frow(h, le, c) for h, le, c in FIN], [M["skin"], M["edge"]], caps="strip", uvscale=4000, matof=lambda i, j: 1 if j <= 1 or j >= 43 else 0)],
                  "airframe", 6, (0, side * 1200, 2600), f"Deriva enteriza {tagname}", control="rudder", range=[-20, 20], path="v")
        ob["hinge"] = [0.0, 0.0, 1.0]   # eje vertical: la raíz gira en su plano, sin hundirse en la góndola
        set_pivot(ob, (-11200, side * NAC_Y, base))

    # ── tren: tres ruedas en cada pata principal, dos en el morro ──
    def wheel(name, c, r, w):
        Fw = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        return [lathe(f"{name}_t", Fw, [(0, r * 0.6), (0, r * 0.9), (w * 0.15, r), (w * 0.85, r), (w, r * 0.9), (w, r * 0.6)], M["rubber"], steps=40),
                lathe(f"{name}_h", Fw, [(w * 0.1, 0), (w * 0.1, r * 0.6), (w * 0.9, r * 0.6), (w * 0.9, 0)], M["alu"], steps=32)]
    # tren en su sitio del plano de tres vistas: el de morro a 10,9 m de la punta, los principales bajo las góndolas
    NOSE_GX, MAIN_GX = 5100, -7100
    belly = catmull(ST, NOSE_GX)
    nose = [cylinder_between("ns", (NOSE_GX, 0, belly[4] - belly[3] - 4), (NOSE_GX, 0, GROUND + 330), 90, M["steel"], steps=20)]
    for y in (-200, 200):
        nose += wheel(f"nw{y}", (NOSE_GX, y, GROUND + 330), 330, 220)
    part("tren.morro", nose, "airframe", 8, (0, 2600, 0), "Tren de morro")
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        y = side * 1900
        g = [cylinder_between(f"ms{side}", (MAIN_GX, y, -480), (MAIN_GX, y, GROUND + 450), 130, M["steel"], steps=20)]
        for dy in (-330, 0, 330):
            g += wheel(f"mw{side}{dy}", (MAIN_GX, y + dy, GROUND + 450), 450, 260)
        part(f"tren.{tagname}", g, "airframe", 9, (5500, 0, 0), f"Tren principal {tagname}")

    eng = {}
    for side, prefix, detailed in ((-1, "J58", True), (1, "J58.L", False)):
        er, ep = build_j58(prefix, M, root, (FACE_X, side * NAC_Y, NAC_Z), meta, detailed)
        tag(er, part=prefix, group="engine", order=40, explode=[-16000, 0, -1300], label="J58 derecho" if detailed else "J58 izquierdo", system="engines")
        eng[prefix] = (er, ep)
        log(f"Motor {prefix}")
    return parts, eng
