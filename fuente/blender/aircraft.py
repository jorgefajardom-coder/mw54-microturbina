# Bimotor de aeromodelismo de referencia con dos MW54 en góndolas bajo el ala (1 unidad = 1 mm, +X morro).
# Cada pieza física es un objeto con metadatos: grupo, orden de montaje y vector de despiece.
import math
from mathutils import Vector
from lib import (material, lathe, tube, cylinder_between, box, surface_grid, tube_path, hull, boolean_cut,
                 join, empty, tag, frame, point, TAU)
import bmesh
import bpy

SPAN = 1900
RF = 92
GROUND = -300


def materials():
    return {
        "paint": material("Pintura blanca", (0.92, 0.93, 0.94), 0.0, 0.32, coat=1.0, coat_rough=0.04),
        "paint_grey": material("Pintura gris antirreflejo", (0.16, 0.17, 0.19), 0.0, 0.55),
        "paint_red": material("Pintura roja", (0.70, 0.07, 0.06), 0.0, 0.35, coat=1.0, coat_rough=0.05),
        "glass": material("Cabina ahumada", (0.08, 0.10, 0.13), 0.0, 0.03, coat=1.0, coat_rough=0.02, transmission=0.55, ior=1.49, alpha=0.82),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
        "anod": material("Aluminio anodizado negro", (0.05, 0.05, 0.06), 1.0, 0.38),
        "wood": material("Contrachapado", (0.72, 0.58, 0.40), 0.0, 0.7),
        "tank": material("Depósito", (0.86, 0.80, 0.62), 0.0, 0.25, transmission=0.6, alpha=0.75),
        "fuel": material("Queroseno con aceite", (0.85, 0.62, 0.18), 0.0, 0.05, transmission=0.8, alpha=0.7),
        "tygon": material("Tygon", (0.85, 0.85, 0.55), 0.0, 0.15, transmission=0.7, alpha=0.6),
        "festo": material("Festo azul", (0.05, 0.25, 0.75), 0.0, 0.35),
        "gasline": material("Tubo de gas", (0.75, 0.08, 0.06), 0.0, 0.4),
        "black": material("Plástico negro", (0.02, 0.02, 0.025), 0.0, 0.5),
        "pcb": material("ECU", (0.04, 0.04, 0.05), 0.2, 0.35),
        "lipo": material("Batería LiPo", (0.10, 0.25, 0.65), 0.0, 0.3, coat=0.6),
        "gascan": material("Botella de gas", (0.75, 0.10, 0.08), 0.8, 0.3, coat=0.5),
        "cable": material("Cable", (0.03, 0.03, 0.03), 0.0, 0.5),
        "steel": material("Acero", (0.72, 0.73, 0.75), 1.0, 0.28),
    }


def naca(chord, t, n=36):
    """Perfil simétrico NACA 00xx: puntos (x a lo largo de la cuerda, z) en sentido horario."""
    up, lo = [], []
    for i in range(n + 1):
        b = math.pi * i / n
        x = (1 - math.cos(b)) / 2
        yt = 5 * t * (0.2969 * math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4)
        up.append((x * chord, yt * chord))
        lo.append((x * chord, -yt * chord))
    return up + list(reversed(lo[1:-1]))


def loft(name, sections, mat, parent=None, caps=True):
    """Superficie entre secciones (cada una: lista de puntos 3D con el mismo número de puntos)."""
    bm = bmesh.new()
    rows = [[bm.verts.new(p) for p in sec] for sec in sections]
    n = len(rows[0])
    for i in range(len(rows) - 1):
        for j in range(n):
            bm.faces.new([rows[i][j], rows[i][(j + 1) % n], rows[i + 1][(j + 1) % n], rows[i + 1][j]])
    if caps:
        bm.faces.new(list(reversed(rows[0])))
        bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    from lib import to_object
    return to_object(name, bm, mat, parent, sharp=45)


def wing_section(le_x, y, z, chord, t=0.12, dihedral=0.0):
    return [Vector((le_x - x, y, z + zz)) for x, zz in naca(chord, t)]


def fin_section(le_x, z, chord, t=0.10):
    return [Vector((le_x - x, zz, z)) for x, zz in naca(chord, t)]


def build_aircraft(M, E, root, log=lambda msg: None):
    """M: materiales del avión, E: materiales del motor. Devuelve las piezas y los marcos de las góndolas."""
    parts = []

    def part(name, obs, group, order, explode, label, system):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system)
        parts.append(ob)
        log(label)
        return ob

    # ── fuselaje: morro ojival, tramo central con bahía y escotilla, cono de cola ──
    F = frame((900, 0, 0), (-1, 0, 0))
    NOSE, BAY0, BAY1, TAIL0, LEN = 300, 420, 1160, 1200, 1800
    rf = lambda s: RF * math.sqrt(max(0.0, 1 - (1 - s / NOSE) ** 2)) if s < NOSE else (RF if s < TAIL0 else RF - (RF - 20) * (s - TAIL0) / (LEN - TAIL0))
    nose_prof = [(0, 0)] + [(s, rf(s)) for s in [NOSE * (1 - math.cos(math.pi / 2 * i / 24)) for i in range(1, 25)]] + [(NOSE, 0)]
    part("fuselaje.morro", lathe("nose", F, nose_prof, M["paint"], steps=96), "airframe", 2, (300, 0, 0), "Morro", "airframe")
    center = tube("center", F, NOSE, TAIL0, RF - 2, RF, mat=M["paint"], steps=128)
    hatch = tube("hatch", F, BAY0, BAY1, RF - 2, RF, mat=M["paint"], steps=128)
    cut = box("cutbox", ((900 - BAY0 + 900 - BAY1) / 2, 0, 12 + 60), (BAY1 - BAY0, 2 * RF + 10, 120))
    boolean_cut(center, [cut])
    keep = box("keepbox", ((900 - BAY0 + 900 - BAY1) / 2, 0, 12 + 60), (BAY1 - BAY0 - 0.2, 2 * RF + 10, 120))
    mod = hatch.modifiers.new("keep", "BOOLEAN"); mod.operation = "INTERSECT"; mod.solver = "EXACT"; mod.object = keep
    from lib import apply_modifiers
    apply_modifiers(hatch); bpy.data.objects.remove(keep, do_unlink=True)
    stripe = tube("stripe", F, 560, 1080, RF, RF + 0.3, mat=M["paint_red"], steps=128)
    keep2 = box("k2", (900 - 820, 0, 2), (600, 2 * RF + 10, 22))
    mod = stripe.modifiers.new("keep", "BOOLEAN"); mod.operation = "INTERSECT"; mod.solver = "EXACT"; mod.object = keep2
    apply_modifiers(stripe); bpy.data.objects.remove(keep2, do_unlink=True)
    formers = [cylinder_between(f"former{s}", point(F, s, 0, 0), point(F, s + 3, 0, 0), RF - 2.1, M["wood"], steps=64) for s in (BAY0 - 3, BAY1)]
    part("fuselaje.central", [center, stripe] + formers, "airframe", 0, (0, 0, 0), "Fuselaje central", "airframe")
    part("fuselaje.cola", lathe("tail", F, [(TAIL0, 0), (TAIL0, RF), (LEN, 20), (LEN, 0)], M["paint"], steps=96), "airframe", 1, (-320, 0, 0), "Cono de cola", "airframe")
    part("fuselaje.escotilla", hatch, "airframe", 30, (0, 0, 260), "Escotilla de la bahía", "airframe")
    # cabina: burbuja de policarbonato con su marco
    FC = frame((900 - 150, 0, 78), (-1, 0, 0))
    bubble = [(0, 0)] + [(s, 34 * math.sin(math.pi * s / 240) ** 0.6) for s in [240 * i / 30 for i in range(1, 30)]] + [(240, 0)]
    glass = lathe("canopy", FC, bubble, M["glass"], steps=64)
    frame_ring = tube("canopyframe", FC, 0, 240, 0, 0, mat=M["paint_grey"]) if False else None
    part("cabina", [glass], "airframe", 31, (0, 0, 220), "Cabina de policarbonato", "airframe")
    part("antena", [cylinder_between("ant", (900 - 700, 0, RF - 2), (900 - 720, 0, RF + 40), 1.2, M["black"], steps=12)], "airframe", 32, (0, 0, 160), "Antena del receptor", "radio")

    # ── alas: perfil NACA 0012 en la raíz, 0010 en la punta, con flecha ──
    le = lambda y: 250 - 0.14 * (abs(y) - 90)
    te = lambda y: -250 + 0.08 * (abs(y) - 90)
    ZW = -31
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        secs = [wing_section(le(y), side * y, ZW, le(y) - te(y), 0.12 - 0.02 * (y - 90) / 860) for y in (88, 330, 600, SPAN / 2)]
        wing = loft(f"wing{side}", secs, M["paint"])
        tipcap = hull(f"tip{side}", [p + Vector((0, side * 6, 0)) * 0.0 for p in secs[-1]] + [p + Vector((0, side * 8, 0)) for p in wing_section(le(SPAN / 2) - 10, side * SPAN / 2, ZW, le(SPAN / 2) - te(SPAN / 2) - 30, 0.05)], M["paint_red"])
        part(f"ala.{tagname}", [wing, tipcap], "airframe", 3, (0, side * 520, 0), f"Ala {tagname}", "airframe")
    # ── cola en T ──
    FIN_X0, FIN_X1 = 900 - 1420, 900 - 1760
    fin = loft("fin", [fin_section(FIN_X0, rf(1420) - 6, 340), fin_section(FIN_X0 - 160, 300, 200)], M["paint"])
    part("deriva", fin, "airframe", 4, (0, 0, 240), "Deriva", "airframe")
    stab = loft("stab", [[Vector((p.x, y, 304 + p.y)) for p in fin_section(FIN_X0 - 150 + 0.06 * abs(y), 0, 210 - 0.12 * abs(y), 0.09)] for y in (-330, 0, 330)], M["paint"])
    part("estabilizador", stab, "airframe", 5, (0, 0, 330), "Estabilizador horizontal", "airframe")

    # ── góndolas abiertas y pilones ──
    NY, NR, NZ, NX, NLEN = 330, 58, -31 - 30 - 20 - 58, 180, 215
    nac_mer = [(0, 51), (1.5, 54), (5, 56.5), (12, NR), (160, NR), (NLEN, 50), (NLEN, 48), (160, 55), (12, 55), (5, 53), (1.5, 51.5)]
    nacelles = {}
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        NF = frame((NX, side * NY, NZ), (-1, 0, 0))
        shell = lathe(f"nac{side}", NF, nac_mer, M["paint"], steps=96)
        lip = tube(f"lip{side}", NF, 0, 6, 50.6, 56.8, mat=M["paint_grey"], steps=96)
        pylon = loft(f"pylon{side}", [[Vector((p.x, side * NY + p.z, NZ + NR - 2)) for p in fin_section(NX - 20, 0, 150, 0.08)], [Vector((p.x, side * NY + p.z, ZW - 2)) for p in fin_section(NX - 10, 0, 170, 0.08)]], M["paint"])
        part(f"gondola.{tagname}", [shell, lip, pylon], "airframe", 6, (0, 0, -200), f"Góndola {tagname}", "nacelles")
        # montura de dos piezas: dos abrazaderas y su soporte al techo de la góndola
        EF = frame((NX - 25, side * NY, NZ), (-1, 0, 0))
        mount = []
        for s in (52, 96):
            mount.append(tube(f"band{side}{s}", EF, s - 4, s + 4, 44.4, 46.6, mat=M["anod"], steps=72))
            mount.append(box(f"foot{side}{s}", (NX - 25 - s, side * NY, NZ + 51), (10, 12, 8.8), M["anod"]))
        part(f"montura.{tagname}", mount, "airframe", 7, (0, 0, -120), f"Montura de dos piezas {tagname}", "mounts")
        nacelles[side] = (NF, EF)

    # ── tren triciclo ──
    def wheel(name, c, r, w):
        Fw = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        prof = [(0, r * 0.45), (0.0, r * 0.82)] + [(w / 2 - w / 2 * math.cos(math.pi * i / 10), r * 0.82 + r * 0.18 * math.sin(math.pi * i / 10)) for i in range(11)] + [(w, r * 0.82), (w, r * 0.45)]
        tire = lathe(name + "tire", Fw, prof, M["rubber"], steps=64)
        hubc = tube(name + "hub", Fw, w * 0.1, w * 0.9, 3, r * 0.46, mat=M["alu"], steps=48)
        return [tire, hubc]
    nose_leg = [cylinder_between("noseleg", (640, 0, -rf(260) + 1), (640, 0, GROUND + 70), 5.5, M["steel"], steps=20),
                box("fork", (640, 0, GROUND + 58), (12, 26, 24), M["alu"])] + wheel("nosew", (640, 0, GROUND + 38), 38, 16)
    part("tren.morro", nose_leg, "airframe", 8, (0, 0, -180), "Tren de morro", "gear")
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        leg = [cylinder_between(f"leg{side}", (-40, side * 210, ZW - 12), (-40, side * 210, GROUND + 42), 6, M["steel"], steps=20)] + wheel(f"mw{side}", (-40, side * 230, GROUND + 42), 42, 20)
        part(f"tren.{tagname}", leg, "airframe", 8, (0, side * 60, -180), f"Tren principal {tagname}", "gear")

    # ── bahía de equipos ──
    TZ = -38
    bayx = lambda s: 900 - s
    tray = box("tray", ((bayx(BAY0) + bayx(BAY1)) / 2, 0, TZ - 2), (BAY1 - BAY0 - 12, 159, 4), M["wood"])
    part("bahia.bandeja", tray, "systems", 9, (0, 0, 200), "Bandeja de equipos", "airframe")
    tankbox = box("tank", (297, 0, TZ + 50), (195, 116, 100), M["tank"], bevel=10)
    fuelbody = box("fuelin", (297, 0, TZ + 30), (185, 106, 58), M["fuel"], bevel=8)
    cap = cylinder_between("cap", (350, 0, TZ + 100), (350, 0, TZ + 108), 9, M["black"], steps=24)
    part("bahia.deposito", [tankbox, fuelbody, cap], "systems", 10, (0, 0, 320), "Depósito principal", "fuel")
    hop = [cylinder_between("hopper", (188, 0, TZ + 26), (120, 0, TZ + 26), 26, M["tank"], steps=48),
           cylinder_between("hopfuel", (186, 0, TZ + 20), (122, 0, TZ + 20), 19, M["fuel"], steps=32)]
    part("bahia.hopper", hop, "systems", 11, (0, 0, 300), "Hopper con clunk de fieltro", "fuel")
    for side in (1, -1):
        pump = [cylinder_between(f"pump{side}", (105, side * 38, TZ + 11), (60, side * 38, TZ + 11), 11, M["anod"], steps=32),
                box(f"pumphead{side}", (55, side * 38, TZ + 11), (12, 24, 22), M["alu"])]
        part(f"bahia.bomba{side}", pump, "systems", 12, (0, side * 40, 280), "Bomba de combustible", "pumps")
        part(f"bahia.valvula{side}", [box(f"valve{side}", (32, side * 68, TZ + 7), (24, 16, 14), M["black"]), cylinder_between(f"coil{side}", (32, side * 68, TZ + 14), (32, side * 68, TZ + 22), 6, M["festo"], steps=20)], "systems", 13, (0, side * 40, 260), "Electroválvula de combustible", "pumps")
        part(f"bahia.valvulagas{side}", [box(f"gvalve{side}", (-110, side * 47, TZ + 6), (20, 14, 12), M["black"]), cylinder_between(f"gcoil{side}", (-110, side * 47, TZ + 12), (-110, side * 47, TZ + 19), 5, M["gasline"], steps=20)], "systems", 14, (0, side * 40, 250), "Electroválvula de gas", "gas")
        part(f"bahia.ecu{side}", [box(f"ecu{side}", (-25, side * 31, TZ + 6), (70, 50, 12), M["pcb"], bevel=1.5)], "systems", 15, (0, side * 30, 300), "ECU", "ecu")
        part(f"bahia.bateria{side}", [box(f"bat{side}", (440, side * 36, TZ + 10), (60, 28, 20), M["lipo"], bevel=2)], "systems", 16, (0, side * 30, 280), "Batería del receptor", "radio")
    part("bahia.gas", [cylinder_between("gas", (-140, 0, TZ + 24), (-240, 0, TZ + 24), 24, M["gascan"], steps=48), cylinder_between("gasvalve", (-140, 0, TZ + 24), (-128, 0, TZ + 24), 6, M["alu"], steps=24)], "systems", 17, (0, 0, 320), "Botella de gas de arranque", "gas")
    part("bahia.receptor", [box("rx", (454, 0, TZ + 7), (28, 28, 14), M["black"], bevel=1)], "systems", 18, (0, 0, 300), "Receptor", "radio")
    lines = [tube_path("tygon", [(200, 0, TZ + 8), (206, 0, TZ + 8), (206, 0, TZ + 26), (188, 0, TZ + 26)], 1.6, M["tygon"], bend=5)]
    for side in (1, -1):
        lines.append(tube_path(f"feed{side}", [(120, side * 10, TZ + 18), (112, side * 10, TZ + 18), (112, side * 38, TZ + 18), (105, side * 38, TZ + 11)], 1.4, M["tygon"], bend=4))
        lines.append(tube_path(f"festo{side}", [(49, side * 38, TZ + 11), (44, side * 38, TZ + 11), (44, side * 68, TZ + 7)], 1.2, M["festo"], bend=4))
        lines.append(tube_path(f"gasl{side}", [(-128, side * 6, TZ + 24), (-124, side * 6, TZ + 24), (-124, side * 47, TZ + 6), (-120, side * 47, TZ + 6)], 0.9, M["gasline"], bend=4))
    part("bahia.lineas", lines, "systems", 19, (0, 0, 260), "Líneas: Tygon, Festo y gas", "fuel")
    return parts, nacelles
