# Maqueta 1:7 de un entrenador a reacción tipo BAE Hawk (T1: 9,39 m de envergadura, 11,17 m de largo), la clase de
# avión en la que se ha instalado la MW54. Esquema gris genérico, sin insignias. 1 unidad = 1 mm, +X morro.
# Instalación como en una maqueta real: motor en el fuselaje sobre montura de dos piezas, tomas laterales abiertas a
# la cámara de admisión (sin bypass), tubo de empuje hasta la tobera, depósito y hopper en el centro de gravedad.
import math
import bmesh
import bpy
from mathutils import Vector
from lib import (material, lathe, tube, cylinder_between, box, tube_path, hull, join, tag, frame, point, TAU,
                 to_object, boolean_cut, apply_modifiers)

SCALE = 7.0
SPAN = 9390 / SCALE
LENGTH = 11170 / SCALE
GROUND = -235
ENGINE_TIP = (150.0, 0.0, 4.0)


def panel_texture(name, base, lines=(0.72, 0.74, 0.76), size=512, seed=3):
    """Pintura con líneas de panel y una leve variación: textura de color repetible (u a lo largo, v alrededor)."""
    import random
    random.seed(seed)
    img = bpy.data.images.new(name, size, size)
    px = [0.0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            n = (random.random() - 0.5) * 0.018
            line = (x % 128 < 2) or (y % 96 < 2)
            rivet = (x % 128 == 6 and y % 12 == 0) or (y % 96 == 6 and x % 16 == 0)
            k = 0.9 if line else (0.95 if rivet else 1.0)
            i = (y * size + x) * 4
            px[i:i + 4] = [base[0] * k + n, base[1] * k + n, base[2] * k + n, 1.0]
    img.pixels = px
    img.pack()
    return img


def decal_material():
    import os
    img = bpy.data.images.load(os.path.join(os.path.dirname(__file__), "assets", "stack-hole.png"), check_existing=True)
    img.pack()
    m = bpy.data.materials.new("Insignia agujero negro")
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.extension = "CLIP"
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], p.inputs["Alpha"])
    p.inputs["Roughness"].default_value = 0.25
    p.inputs["Coat Weight"].default_value = 1.0
    p.inputs["Coat Roughness"].default_value = 0.06
    m.surface_render_method = "BLENDED"
    return m


def materials():
    # Colores del portafolio: tinta #08070a, brasa #ff9a3c, naranja del disco #ff6a12, rojo del borde #db3208 (en lineal).
    ink = (0.0024, 0.0021, 0.003)
    return {
        "paint": material("Negro brillante", (1, 1, 1), 0.0, 0.3, coat=1.0, coat_rough=0.06, image=panel_texture("panel_ink", (0.012, 0.011, 0.014))),
        "orange": material("Naranja del disco", (1.0, 0.144, 0.006), 0.0, 0.32, coat=1.0, coat_rough=0.05),
        "ember": material("Rojo del borde", (0.71, 0.032, 0.0024), 0.0, 0.32, coat=1.0, coat_rough=0.05),
        "glow": material("Brasa", (1.0, 0.32, 0.045), 0.0, 0.32, coat=1.0, coat_rough=0.05),
        "decal": decal_material(),
        "paint_dark": material("Gris antirreflejo", (0.12, 0.13, 0.14), 0.0, 0.7),
        "glass": material("Cabina ahumada", (0.06, 0.08, 0.10), 0.0, 0.03, coat=1.0, coat_rough=0.02, transmission=0.5, ior=1.49, alpha=0.8),
        "frame": material("Marco de cabina", (0.20, 0.21, 0.22), 0.3, 0.5),
        "rubber": material("Goma", (0.03, 0.03, 0.03), 0.0, 0.75),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
        "anod": material("Aluminio anodizado negro", (0.05, 0.05, 0.06), 1.0, 0.38),
        "wood": material("Contrachapado de abedul", (0.74, 0.60, 0.42), 0.0, 0.7),
        "inside": material("Interior de fibra", (0.42, 0.40, 0.36), 0.0, 0.8),
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


def naca(chord, t, n=28):
    up, lo = [], []
    for i in range(n + 1):
        b = math.pi * i / n
        x = (1 - math.cos(b)) / 2
        yt = 5 * t * (0.2969 * math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4)
        up.append((x * chord, yt * chord))
        lo.append((x * chord, -yt * chord))
    return up + list(reversed(lo[1:-1]))


def loft(name, sections, mat, caps=True, uv=True, sharp=50, closed=True):
    bm = bmesh.new()
    rows = [[bm.verts.new(Vector(p)) for p in sec] for sec in sections]
    n = len(rows[0])
    faces = []
    for i in range(len(rows) - 1):
        for j in range(n if closed else n - 1):
            faces.append((bm.faces.new([rows[i][j], rows[i][(j + 1) % n], rows[i + 1][(j + 1) % n], rows[i + 1][j]]), i, j))
    if uv:
        layer = bm.loops.layers.uv.new("UVMap")
        lengths = [0.0]
        for i in range(1, len(rows)):
            lengths.append(lengths[-1] + (rows[i][0].co - rows[i - 1][0].co).length)
        for f, i, j in faces:
            for loop in f.loops:
                ii = next(k for k in range(len(rows)) if loop.vert in rows[k])
                jj = rows[ii].index(loop.vert)
                if jj == 0 and j == n - 1:
                    jj = n
                loop[layer].uv = (lengths[ii] / 400.0, jj / n * 2.0)
    if caps:
        bm.faces.new(list(reversed(rows[0])))
        bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return to_object(name, bm, mat, None, sharp=sharp)


def superellipse(x, w, h, zc, n=40, p=2.6, y0=0.0):
    pts = []
    for k in range(n):
        t = TAU * k / n
        c, s = math.cos(t), math.sin(t)
        pts.append((x, y0 + w / 2 * math.copysign(abs(c) ** (2 / p), c), zc + h / 2 * math.copysign(abs(s) ** (2 / p), s)))
    return pts


def wing_sections(stations, side, dihedral_deg=2.0):
    secs = []
    for y, le_x, chord, t in stations:
        z = math.tan(math.radians(dihedral_deg)) * (y - stations[0][0])
        secs.append([(le_x - x, side * y, WZ + z + zz) for x, zz in naca(chord, t)])
    return secs


WZ = -52


def build_hawk(M, root, log=lambda msg: None):
    parts = []

    def part(name, obs, group, order, explode, label, system):
        ob = join(name, obs if isinstance(obs, list) else [obs], root)
        tag(ob, part=name, group=group, order=order, explode=list(explode), label=label, system=system)
        parts.append(ob)
        log(label)
        return ob

    # ── fuselaje: secciones superelípticas (más alto que ancho en la cabina), en tres tramos que se separan ──
    ST = [  # x, ancho, alto, centro z
        (800, 2, 2, -6), (760, 34, 34, -4), (700, 62, 66, 0), (620, 90, 104, 6), (540, 110, 136, 12), (460, 120, 156, 16),
        (380, 126, 166, 18), (300, 130, 170, 18), (200, 134, 166, 14), (100, 134, 158, 10), (0, 130, 148, 6),
        (-120, 120, 136, 4), (-260, 106, 120, 4), (-400, 90, 104, 8), (-540, 74, 88, 14), (-680, 58, 72, 18), (-796, 50, 58, 20),
    ]
    sec = lambda row: superellipse(*row)
    front = loft("fus_front", [sec(r) for r in ST[:8]], M["paint"])
    # el tramo central es abierto por arriba: la escotilla del motor es la franja que falta
    mid = loft("fus_mid", [sec(r)[14:] + sec(r)[:7] for r in ST[7:11]], M["paint"], caps=False, closed=False)
    rear = loft("fus_rear", [sec(r) for r in ST[10:]], M["paint"], caps=False)
    # tobera: el anillo de salida y el oscuro de dentro
    nozzle = tube("nozzle_ring", frame((-790, 0, 20), (-1, 0, 0)), 0, 6, 21, 26, mat=M["paint_dark"], steps=48)
    part("fuselaje.delantero", [front], "airframe", 2, (360, 0, 0), "Fuselaje delantero y morro", "airframe")
    part("fuselaje.central", [mid], "airframe", 0, (0, 0, 0), "Fuselaje central", "airframe")
    part("fuselaje.trasero", [rear, nozzle], "airframe", 1, (-360, 0, 0), "Fuselaje trasero y tobera", "airframe")
    # antirreflejo delante de la cabina
    glare = loft("glare", [[(x, y * 0.62, z + 1.2) for (x, y, z) in superellipse(*r)[5:16]] for r in ST[2:5]], M["paint_dark"], caps=False)
    part("fuselaje.antirreflejo", [glare], "airframe", 3, (360, 0, 20), "Panel antirreflejo", "airframe")
    # línea lateral naranja: una cinta sobre la piel, por los dos costados
    for side in (1, -1):
        idx = [118, 119, 0, 1, 2] if side > 0 else [58, 59, 60, 61, 62]
        rows = [[(p[0], p[1] * 1.004 + side * 0.25, p[2] * 1.0) for p in (superellipse(*r, n=120)[i] for i in idx)] for r in ST[6:15]]
        part(f"fuselaje.linea{side}", [loft(f"cheat{side}", rows, M["orange"], caps=False, closed=False)], "airframe", 3, (0, side * 30, 0), "Línea del disco", "airframe")

    # ── tomas de aire laterales: bocas en riñón, abiertas a la cámara de admisión ──
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        rows = []
        for x, w, h, zc, off in ((330, 34, 70, -4, 70), (280, 40, 80, -4, 72), (180, 40, 82, -2, 70), (60, 30, 70, 0, 62), (-60, 10, 40, 2, 56)):
            rows.append(superellipse(x, w, h, zc, n=28, p=2.2, y0=side * off))
        duct = loft(f"intake{side}", rows, M["paint"], caps=False)
        mouth = loft(f"mouth{side}", [superellipse(331, 30, 64, -4, n=28, p=2.2, y0=side * 70), superellipse(300, 28, 60, -4, n=28, p=2.2, y0=side * 69)], M["paint_dark"], caps=False)
        lipband = loft(f"lipband{side}", [superellipse(331.5, 35, 71, -4, n=28, p=2.2, y0=side * 70), superellipse(318, 37, 75, -4, n=28, p=2.2, y0=side * 70.5)], M["orange"], caps=False)
        part(f"toma.{tagname}", [duct, mouth, lipband], "airframe", 4, (0, side * 140, 0), f"Toma de aire {tagname}", "airframe")

    # ── cabina en tándem y su marco ──
    canopy_rows = [superellipse(x, w, h, z, n=32, p=2.0) for x, w, h, z in ((560, 40, 30, 70), (500, 92, 70, 76), (420, 100, 84, 84), (330, 98, 82, 92), (260, 70, 50, 96), (210, 30, 20, 96))]
    canopy_rows = [[(x, y, max(z, 76 if x > 450 else 88)) for (x, y, z) in row] for row in canopy_rows]
    glass = loft("canopy", canopy_rows, M["glass"], uv=False)
    seats = [box(f"seat{x}", (x, 0, 50), (40, 40, 50), M["seat"], bevel=4) for x in (470, 360)]
    part("cabina", [glass], "airframe", 31, (0, 0, 240), "Cabina en tándem", "airframe")
    part("asientos", seats, "airframe", 30, (0, 0, 200), "Asientos eyectables (maqueta)", "airframe")

    # ── alas: flecha de ~26°, perfil del 11 al 9 %, diedro de 2°; alerones y flaps aparte ──
    half = SPAN / 2
    for side, tagname in ((1, "izquierda"), (-1, "derecha")):
        st = [(55, 150, 380, 0.11), (260, 40, 270, 0.105), (half, -205, 130, 0.09)]
        wing = loft(f"wing{side}", wing_sections(st, side), M["paint"])
        # superficies de mando: una franja junto al borde de salida
        ail = loft(f"ail{side}", wing_sections([(380, -14 - 0.15 * 0, 50, 0.07), (half - 20, -250, 40, 0.06)], side), M["paint"])
        flap = loft(f"flap{side}", wing_sections([(70, -170, 70, 0.08), (370, -228 + 70, 60, 0.07)], side), M["paint"])
        tz = WZ + math.tan(math.radians(2.0)) * (half - 55)
        tipl = cylinder_between(f"navlight{side}", (-222, side * (half - 3), tz), (-246, side * (half - 3), tz), 3.2, M["light_red" if side > 0 else "light_green"], steps=12)
        band = loft(f"wingband{side}", wing_sections([(half - 70, -205 + 0.53 * 70 - 37, 130 + 0.39 * 70, 0.091), (half - 0.5, -205, 130, 0.0902)], side), M["ember"])
        part(f"ala.{tagname}", [wing, tipl, band], "airframe", 5, (0, side * 420, -40), f"Ala {tagname}", "airframe")
        bpy.data.objects.remove(ail, do_unlink=True)
        bpy.data.objects.remove(flap, do_unlink=True)

    # ── estabilizador monobloque con anhedral de 10° y deriva en flecha con timón ──
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        secs = []
        for y, le_x, c in ((28, -540, 160), (313, -700, 70)):
            dz = -math.tan(math.radians(10)) * (y - 28)
            secs.append([(le_x - x, side * y, 30 + dz + zz) for x, zz in naca(c, 0.08)])
        part(f"estabilizador.{tagname}", [loft(f"tail{side}", secs, M["paint"])], "airframe", 7, (-120, side * 260, 0), f"Estabilizador {tagname}", "airframe")
    fin = loft("fin", [[(le - x, zz, z) for x, zz in naca(c, 0.09)] for le, z, c in ((-380, 46, 360), (-620, 270, 130))], M["paint"])
    rudder = loft("rudder", [[(le - x, zz, z) for x, zz in naca(c, 0.06)] for le, z, c in ((-735, 60, 60), (-748, 250, 40))], M["paint"])
    finband = loft("finband", [[(le - x, zz * 1.02, z) for x, zz in naca(c, 0.09)] for le, z, c in ((-589, 240, 160), (-620.5, 270.5, 130.5))], M["glow"])
    # insignia: el agujero negro de la tarjeta del Stack, proyectado sobre las dos caras de la deriva
    decals = []
    for side in (1, -1):
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        x0, x1, z0, z1 = -505, -715, 112, 176
        rows = []
        for i in range(25):
            z = z0 + (z1 - z0) * i / 24
            le, c = -380 - 240 * (z - 46) / 224, 360 - 230 * (z - 46) / 224
            row = []
            for j in range(41):
                x = x0 + (x1 - x0) * j / 40
                xc = (le - x) / c
                yt = 5 * 0.09 * (0.2969 * math.sqrt(max(0, xc)) - 0.1260 * xc - 0.3516 * xc ** 2 + 0.2843 * xc ** 3 - 0.1036 * xc ** 4) * c if 0 <= xc <= 1 else 0
                row.append(bm.verts.new((x, side * (yt + 0.35), z)))
            rows.append(row)
        for i in range(24):
            for j in range(40):
                quad = [rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]] if side > 0 else [rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]]
                f = bm.faces.new(quad)
                for loop in f.loops:
                    v = loop.vert.co
                    u = (v.x - x0) / (x1 - x0)
                    loop[uv].uv = (u if side < 0 else 1 - u, (v.z - z0) / (z1 - z0))
        decals.append(to_object(f"decal{side}", bm, M["decal"], None, sharp=80))
    part("deriva", [fin, finband] + decals, "airframe", 8, (0, 0, 300), "Deriva con la insignia del agujero negro", "airframe")
    bpy.data.objects.remove(rudder, do_unlink=True)

    # ── tren triciclo ──
    def wheel(name, c, r, w):
        Fw = frame(Vector(c) - Vector((0, w / 2, 0)), (0, 1, 0))
        prof = [(0, r * 0.45), (0.0, r * 0.8)] + [(w / 2 - w / 2 * math.cos(math.pi * i / 10), r * 0.8 + r * 0.2 * math.sin(math.pi * i / 10)) for i in range(11)] + [(w, r * 0.8), (w, r * 0.45)]
        return [lathe(name + "t", Fw, prof, M["rubber"], steps=64), tube(name + "h", Fw, w * 0.1, w * 0.9, 3, r * 0.46, mat=M["alu"], steps=48)]
    part("tren.morro", [cylinder_between("nl", (600, 0, -40), (600, 0, GROUND + 52), 5, M["steel"], steps=20), box("nfork", (600, 0, GROUND + 44), (12, 24, 22), M["alu"])] + wheel("nw", (600, 0, GROUND + 30), 30, 14), "airframe", 10, (0, 0, -160), "Tren de morro", "gear")
    for side, tagname in ((1, "izquierdo"), (-1, "derecho")):
        part(f"tren.{tagname}", [cylinder_between(f"ml{side}", (-60, side * 190, WZ - 6), (-60, side * 190, GROUND + 38), 6, M["steel"], steps=20)] + wheel(f"mw{side}", (-60, side * 206, GROUND + 38), 38, 18), "airframe", 10, (0, side * 60, -160), f"Tren principal {tagname}", "gear")

    # ── instalación del motor: cuaderna, montura de dos piezas, tubo de empuje ──
    EF = frame(ENGINE_TIP, (-1, 0, 0))
    mount = [box("rail_l", (ENGINE_TIP[0] - 75, 40, ENGINE_TIP[2] - 44), (120, 8, 6), M["wood"]), box("rail_r", (ENGINE_TIP[0] - 75, -40, ENGINE_TIP[2] - 44), (120, 8, 6), M["wood"])]
    for s in (52, 96):
        mount.append(tube(f"band{s}", EF, s - 4, s + 4, 44.4, 46.6, mat=M["anod"], steps=72))
        mount.append(box(f"foot{s}", (ENGINE_TIP[0] - s, 0, ENGINE_TIP[2] - 48.6), (10, 86, 5), M["anod"]))
    part("motor.montura", mount, "systems", 20, (0, 0, -220), "Montura de dos piezas de Wren", "mounts")
    TF = frame((ENGINE_TIP[0] - 167 + 8, 0, ENGINE_TIP[2]), (-1, 0, 0))
    L_TT = (ENGINE_TIP[0] - 167 + 8) - (-788)
    tt = lathe("thrusttube", TF, [(0, 40), (12, 34), (L_TT, 22), (L_TT, 21.4), (12, 33.4), (0, 39.4)], M["thrust"], steps=64)
    part("tubo_empuje", [tt], "systems", 21, (-260, 0, 0), "Tubo de empuje (pared simple)", "engines")

    # ── equipos: depósito y hopper en el CG, bombas, válvulas, ECU y gas delante, radio en el morro ──
    TZ = -40
    part("bandeja", [box("tray", (380, 0, TZ - 2), (420, 96, 4), M["wood"])], "systems", 22, (0, 0, -180), "Bandeja de equipos", "airframe")
    part("deposito", [box("tank", (270, 0, TZ + 46), (150, 92, 92), M["tank"], bevel=10), box("fuelin", (270, 0, TZ + 28), (140, 84, 52), M["fuel"], bevel=8), cylinder_between("cap", (320, 0, TZ + 92), (320, 0, TZ + 99), 8, M["black"], steps=24)], "systems", 23, (0, 0, 300), "Depósito principal", "fuel")
    part("hopper", [cylinder_between("hop", (195, 0, TZ + 22), (240, 0, TZ + 22), 22, M["tank"], steps=48), cylinder_between("hopf", (197, 0, TZ + 16), (238, 0, TZ + 16), 16, M["fuel"], steps=32)], "systems", 24, (0, 0, 280), "Hopper con clunk de fieltro", "fuel")
    part("bomba", [cylinder_between("pump", (400, -28, TZ + 11), (440, -28, TZ + 11), 11, M["anod"], steps=32), box("ph", (446, -28, TZ + 11), (12, 22, 22), M["alu"])], "systems", 25, (0, -40, 260), "Bomba de combustible", "pumps")
    part("valvula.combustible", [box("v1", (420, 22, TZ + 7), (22, 16, 14), M["black"]), cylinder_between("v1c", (420, 22, TZ + 14), (420, 22, TZ + 21), 5.5, M["festo"], steps=20)], "systems", 26, (0, 40, 260), "Electroválvula de combustible", "pumps")
    part("valvula.gas", [box("v2", (470, 22, TZ + 6), (20, 14, 12), M["black"]), cylinder_between("v2c", (470, 22, TZ + 12), (470, 22, TZ + 19), 5, M["gasline"], steps=20)], "systems", 27, (0, 40, 240), "Electroválvula de gas", "gas")
    part("ecu", [box("ecu", (500, -10, TZ + 6), (64, 46, 12), M["pcb"], bevel=1.5)], "systems", 28, (0, 0, 300), "ECU", "ecu")
    part("gas", [cylinder_between("gas", (540, 26, TZ + 18), (600, 26, TZ + 18), 18, M["gascan"], steps=40)], "systems", 29, (0, 30, 280), "Botella de gas de arranque", "gas")
    part("radio", [box("rx", (640, 0, TZ + 22), (26, 24, 12), M["black"], bevel=1), box("bat1", (680, 0, TZ + 30), (44, 26, 18), M["lipo"], bevel=2)], "systems", 30, (220, 0, 120), "Receptor y batería", "radio")
    lines = [tube_path("tyg1", [(270 - 75, 0, TZ + 8), (180, 0, TZ + 8), (180, 0, TZ + 22), (195, 0, TZ + 22)], 1.6, M["tygon"], bend=5),
             tube_path("tyg2", [(240, 0, TZ + 22), (380, -28, TZ + 11), (400, -28, TZ + 11)], 1.4, M["tygon"], bend=6),
             tube_path("festo1", [(452, -28, TZ + 14), (452, 22, TZ + 14), (431, 22, TZ + 7)], 1.2, M["festo"], bend=5),
             tube_path("festo2", [(409, 22, TZ + 7), (300, 52, TZ + 10), (ENGINE_TIP[0] - 40.5, 2, ENGINE_TIP[2] + 51)], 1.2, M["festo"], bend=12),
             tube_path("gas1", [(560, 26, TZ + 18), (480, 22, TZ + 10)], 0.9, M["gasline"], bend=4),
             tube_path("gas2", [(460, 22, TZ + 6), (300, -52, TZ + 10), (ENGINE_TIP[0] - 45.5, -20, ENGINE_TIP[2] + 46)], 0.9, M["gasline"], bend=12)]
    part("lineas", lines, "systems", 31, (0, 0, 240), "Líneas: Tygon al hopper y la bomba, Festo y gas al motor", "fuel")
    part("escotilla", [loft("hatch", [sec(r)[6:15] for r in ST[7:11]], M["paint"], caps=False, closed=False)], "airframe", 32, (0, 0, 280), "Escotilla del motor", "airframe")
    return parts, EF
