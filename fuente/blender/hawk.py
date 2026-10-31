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
# Insignia en la deriva (agujero negro con "SINGULARITY" en arco), 150 × 77 mm con la proporción de la imagen. El UV
# de la deriva va centrado en x = −555, z = 60 (u = 0,5 + (−x − 555)/300, v = (z − 60)/190) y se refleja en la cara
# derecha, para que el texto se lea bien por los dos lados.
FIN_DECAL = (0.5 - 75 / 300, 0.5 + 75 / 300, (118 - 38.5 - 60) / 190, (118 + 38.5 - 60) / 190)

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


def panel_textures(base, size=1024, seed=3, decal=None, place=None):
    """La pintura como en el avión real: color, relieve (normal) y rugosidad de una misma chapa.

    El periodo de los paneles es el de siempre (1/4 de u y 3/16 de v). Las líneas son ranuras de verdad en el mapa de
    normales, los remaches cabezas abombadas, la laca tiene piel de naranja y un brillo que varía de panel a panel
    (pulido, desgaste, retoques), de modo que el reflejo se rompe como en una chapa pintada y no como en un plástico.
    Con `decal` y `place` = (u0, u1, v0, v1) la insignia se hornea en el color y alisa la rugosidad bajo la calcomanía.
    Devuelve las tres matrices (n × n × 4) para crear las imágenes."""
    import numpy as np
    rng = np.random.default_rng(seed)
    n = size
    u = (np.arange(n) + 0.5) / n
    U, V = np.meshgrid(u, u)

    def smooth_noise(cells):
        g = rng.random((cells + 1, cells + 1))
        g[-1, :] = g[0, :]
        g[:, -1] = g[:, 0]
        x = U * cells
        y = V * cells
        i, j = x.astype(int), y.astype(int)
        fx, fy = x - i, y - j
        fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = g[j, i] * (1 - fx) + g[j, i + 1] * fx
        b = g[j + 1, i] * (1 - fx) + g[j + 1, i + 1] * fx
        return a * (1 - fy) + b * fy

    def line(t, period, width):
        d = np.abs(((t / period + 0.5) % 1.0) - 0.5) * period * n
        return np.clip(width - d, 0, 1)

    def rivets(along, across, period_along, step, offset):
        da = np.abs(((across - offset) / period_along + 0.5) % 1.0 - 0.5) * period_along * n
        db = np.abs(((along * n / step) + 0.5) % 1.0 - 0.5) * step
        return np.clip(1 - (np.hypot(da, db) / 2.2) ** 2, 0, 1)

    mottle = 0.55 * smooth_noise(6) + 0.3 * smooth_noise(16) + 0.15 * smooth_noise(48)
    groove = np.maximum(line(U, 0.25, 1.4), line(V, 0.1875, 1.4))
    rv = np.maximum(rivets(V, U, 0.25, 24, 12 / n), rivets(U, V, 0.1875, 32, 12 / n))
    # cada panel con su propio brillo: id del panel → valor pseudoaleatorio
    pid = (np.floor(U / 0.25) * 7 + np.floor(V / 0.1875) * 13) % 17
    panel = (np.sin(pid * 12.9898) * 43758.5453) % 1.0

    k = (1.0 + 0.3 * (mottle - 0.5)) * (1 - 0.5 * groove) + 0.9 * rv + rng.normal(0, 0.025, (n, n))
    color = np.ones((n, n, 4), dtype=np.float32)
    for c in range(3):
        color[..., c] = base[c] * k

    peel = smooth_noise(180) * 0.6 + smooth_noise(90) * 0.4
    height = -1.6 * groove + 0.9 * rv + 0.12 * peel
    gy, gx = np.gradient(height)
    nx, ny, nz = -gx * 2.2, -gy * 2.2, np.ones_like(height)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.ones((n, n, 4), dtype=np.float32)
    normal[..., 0] = nx / ln * 0.5 + 0.5
    normal[..., 1] = ny / ln * 0.5 + 0.5
    normal[..., 2] = nz / ln * 0.5 + 0.5

    r = 0.26 + 0.12 * panel + 0.1 * (smooth_noise(24) - 0.5) + 0.35 * groove + 0.08 * rv
    if decal is not None:
        dw, dh = decal.size
        d = np.array(decal.pixels[:], dtype=np.float32).reshape(dh, dw, 4)
        u0, u1, v0, v1 = place
        su = (U - u0) / (u1 - u0) * (dw - 1)
        sv = (V - v0) / (v1 - v0) * (dh - 1)
        inside = (su >= 0) & (su <= dw - 1) & (sv >= 0) & (sv <= dh - 1)
        su, sv = np.clip(su, 0, dw - 1.001), np.clip(sv, 0, dh - 1.001)
        i, j = su.astype(int), sv.astype(int)
        fx, fy = (su - i)[..., None], (sv - j)[..., None]
        s = (d[j, i] * (1 - fx) + d[j, i + 1] * fx) * (1 - fy) + (d[j + 1, i] * (1 - fx) + d[j + 1, i + 1] * fx) * fy
        a = s[..., 3] * inside
        # el halo blanco del recorte no debe quedar como un filo claro sobre el negro
        white = np.clip((s[..., :3].min(axis=-1) - 0.55) / 0.35, 0, 1)
        a = a * (1 - white * (1 - a))
        for c in range(3):
            color[..., c] = color[..., c] * (1 - a) + s[..., c] * a
        r = r * (1 - a) + 0.22 * a
    rough = np.ones((n, n, 4), dtype=np.float32)
    rough[..., 0] = rough[..., 2] = 0.0
    rough[..., 1] = np.clip(r, 0.05, 1)
    return color, normal, rough


def image_of(name, px):
    img = bpy.data.images.new(name, px.shape[1], px.shape[0])
    img.pixels.foreach_set(px.ravel())
    img.pack()
    return img


def screen_image(kind, n=256):
    """Imagen de una pantalla de cabina: horizonte artificial (pfd) o página de motor de la MW54 (mfd)."""
    import numpy as np
    y, x = np.mgrid[0:n, 0:n] / (n - 1)
    px = np.zeros((n, n, 4), dtype=np.float32)
    px[..., 3] = 1
    green = np.array([0.15, 1.0, 0.35])

    def paint(mask, col, a=1.0):
        for c in range(3):
            px[..., c] = px[..., c] * (1 - mask * a) + col[c] * mask * a

    if kind == "pfd":
        sky = y > 0.5 + 0.12 * (x - 0.5)
        paint(sky.astype(float), (0.05, 0.22, 0.55))
        paint((~sky).astype(float), (0.30, 0.17, 0.06))
        horizon = np.abs(y - (0.5 + 0.12 * (x - 0.5))) < 0.008
        paint(horizon.astype(float), (1, 1, 1))
        for k in (-2, -1, 1, 2):
            ladder = (np.abs(y - (0.5 + k * 0.1 + 0.12 * (x - 0.5))) < 0.005) & (np.abs(x - 0.5) < 0.08 + 0.03 * abs(k) % 2)
            paint(ladder.astype(float), (1, 1, 1))
        wings = ((np.abs(y - 0.5) < 0.012) & (np.abs(x - 0.5) > 0.07) & (np.abs(x - 0.5) < 0.2)) | (np.hypot(x - 0.5, y - 0.5) < 0.015)
        paint(wings.astype(float), (1.0, 0.75, 0.1))
        for x0 in (0.04, 0.84):
            tape = (x > x0) & (x < x0 + 0.12) & (y > 0.15) & (y < 0.85)
            paint(tape.astype(float), (0.02, 0.02, 0.03), 0.85)
            ticks = tape & (((y * 40) % 1) < 0.12)
            paint(ticks.astype(float), (0.9, 0.9, 0.9))
    else:
        for cx, cy in ((0.3, 0.62), (0.72, 0.62)):
            r = np.hypot(x - cx, y - cy)
            ang = np.arctan2(y - cy, x - cx)
            arc = (np.abs(r - 0.17) < 0.012) & (ang > -0.6) & (ang < 3.4)
            paint(arc.astype(float), green)
            red = (np.abs(r - 0.17) < 0.012) & (ang > -0.6) & (ang < 0.0)
            paint(red.astype(float), (1, 0.25, 0.1))
            needle = (np.abs((x - cx) * np.sin(0.9) - (y - cy) * np.cos(0.9)) < 0.008) & (r < 0.15) & ((x - cx) * np.cos(0.9) + (y - cy) * np.sin(0.9) > 0)
            paint(needle.astype(float), (1, 1, 1))
        for k, h in enumerate((0.55, 0.8, 0.35, 0.62)):
            bar = (x > 0.12 + k * 0.2) & (x < 0.2 + k * 0.2) & (y > 0.12) & (y < 0.12 + 0.25 * h)
            paint(bar.astype(float), green)
        frame = (x < 0.02) | (x > 0.98) | (y < 0.02) | (y > 0.98)
        paint(frame.astype(float), (0.25, 0.27, 0.3))
    img = bpy.data.images.new(f"screen_{kind}", n, n)
    img.pixels.foreach_set(px.ravel())
    img.pack()
    return img


def screen_material(name, kind):
    """Pantalla: la imagen es a la vez color y emisión, para que se lea dentro de la cabina en sombra."""
    m = material(name, (1, 1, 1), 0.0, 0.18, coat=1.0, coat_rough=0.03, image=screen_image(kind))
    nt = m.node_tree
    p = nt.nodes.get("Principled BSDF")
    tex = [nd for nd in nt.nodes if nd.type == "TEX_IMAGE"][0]
    nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
    p.inputs["Emission Strength"].default_value = 1.6
    return m


def materials():
    # Colores del portafolio en lineal: tinta #08070a, brasa #ff9a3c, naranja del disco #ff6a12, rojo del borde #db3208.
    ink = (0.010, 0.009, 0.012)
    hole = bpy.data.images.load(os.path.join(os.path.dirname(__file__), "assets", "insignia.png"), check_existing=True)
    c, nrm, rgh = panel_textures(ink)
    fc, fn, fr = panel_textures(ink, decal=hole, place=FIN_DECAL)
    nrm, rgh, fn, fr = image_of("panel_normal", nrm), image_of("panel_rough", rgh), image_of("fin_normal", fn), image_of("fin_rough", fr)
    lac = dict(coat=0.55, coat_rough=0.12, normal=nrm, rough=rgh)
    return {
        "paint": material("Negro brillante", (1, 1, 1), 0.0, 0.3, image=image_of("panel_ink", c), **lac),
        "fin": material("Negro con insignia", (1, 1, 1), 0.0, 0.3, coat=0.55, coat_rough=0.12, image=image_of("panel_fin", fc), normal=fn, rough=fr),
        "orange": material("Naranja del disco", (1.0, 0.144, 0.006), 0.0, 0.32, **lac),
        "ember": material("Rojo del borde", (0.71, 0.032, 0.0024), 0.0, 0.32, **lac),
        "glow": material("Brasa", (1.0, 0.32, 0.045), 0.0, 0.32, **lac),
        "paint_dark": material("Gris antirreflejo", (0.03, 0.03, 0.035), 0.0, 0.75),
        "glass": material("Cabina de policarbonato", (0.62, 0.68, 0.72), 0.0, 0.02, coat=1.0, coat_rough=0.01, transmission=0.6, ior=1.58, alpha=0.3),
        "cockpit": material("Gris de cabina", (0.028, 0.03, 0.034), 0.0, 0.62),
        "console": material("Consola", (0.025, 0.027, 0.03), 0.0, 0.45),
        "cushion": material("Cojín de asiento", (0.03, 0.035, 0.025), 0.0, 0.9),
        "harness": material("Arnés", (0.32, 0.30, 0.22), 0.0, 0.85),
        "handle": material("Asa de eyección", (0.95, 0.62, 0.02), 0.0, 0.4),
        "hud": material("Combinador del HUD", (0.55, 0.9, 0.62), 0.0, 0.02, transmission=0.7, ior=1.5, alpha=0.25),
        "pfd": screen_material("Pantalla de vuelo", "pfd"),
        "mfd": screen_material("Pantalla de motor", "mfd"),
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
        "seat": material("Asiento", (0.06, 0.07, 0.05), 0.0, 0.8),
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
            side = f.calc_center_median().y
            for loop, (ii, jj) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                loop[layer].uv = uvmap(loop.vert.co, side) if uvmap else (lengths[ii] / uvscale, jj / n * 2.0)
    if caps == "strip":
        # la primera sección se cierra con una tira de caras entre extradós e intradós (sigue una raíz curva)
        r = rows[0]
        for k in range(n):
            a_, b_, c_, d_ = k, k + 1, n - k - 1, (n - k) % n
            if b_ >= c_:
                break
            bm.faces.new([r[a_], r[b_], r[c_]] if a_ == d_ else [r[a_], r[b_], r[c_], r[d_]])
        bm.faces.new(rows[-1])
    elif caps:
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


def build_cockpit(M, part):
    """Cabina en tándem a escala, metida bajo la cúpula por encima de los equipos (suelo a z = 38): cubeta con consolas
    laterales, tablero delantero con visera, HUD y dos pantallas, tablero trasero sobre el respaldo del asiento
    delantero, dos asientos eyectables, y en cada puesto palanca, gases y pedales con su bisagra real."""
    FLOOR, TOPZ = 38.0, 87.0
    X0, X1 = 546.0, 396.0
    inner = lambda x, z: skin_y(x, z) - 2.5

    # cubeta: perfil en U que sigue la piel por dentro, de la visera al mamparo trasero
    rows = []
    for x in [X0 - (X0 - X1) * k / 16 for k in range(17)]:
        # cada pared llega justo bajo el borde de la abertura de su lado (la franja superior no es simétrica)
        sec = superellipse(*section_at(x))
        walls = []
        for edge, sgn in ((sec[9], 1), (sec[16], -1)):
            top = min(TOPZ, edge[2] - 2)
            zs = [top] + [FLOOR + (top - FLOOR) * f for f in (0.75, 0.5, 0.25)]
            walls.append([(x, sgn * min(inner(x, z), abs(edge[1]) - 1.5 if z > top - 1 else inner(x, z)), z) for z in zs])
        floor = [(x, inner(x, FLOOR) * f, FLOOR) for f in (1.0, 0.5, 0.0, -0.5, -1.0)]
        rows.append(walls[0] + floor + list(reversed(walls[1])))
    tub = loft("tub", rows, M["cockpit"], closed=False)
    # mamparo trasero y cubierta posterior (tortuga) hasta el final de la abertura de la cúpula
    bulk = [(X1, inner(X1, z) * f, z) for z in (FLOOR, TOPZ) for f in (1, -1)]
    # pared del pozo de los pies: la propia sección en U de la cubeta en x = X0, cerrada como una cara
    fb = bmesh.new()
    fv = [fb.verts.new(p) for p in rows[0]]
    fb.faces.new(fv)
    footwell = to_object("footwell", fb, M["cockpit"], smooth=False)
    bulkhead = box("bulkhead", (X1 - 1.5, 0, (FLOOR + TOPZ) / 2), (3, 2 * inner(X1, 60), TOPZ - FLOOR), M["cockpit"])
    deck = loft("deck", [[(x, inner(x, TOPZ - 1) * f, TOPZ - 1 + 3 * (1 - f * f)) for f in (1, 0.5, 0, -0.5, -1)] for x in (X1, 330)], M["cockpit"], closed=False)
    # consolas laterales con paneles de interruptores
    consoles = []
    for xs, xe in ((536, 486), (462, 400)):
        for sgn in (1, -1):
            yc = sgn * (inner((xs + xe) / 2, 58) - 7)
            consoles.append(box(f"con{xs}{sgn}", ((xs + xe) / 2, yc, 52), (xs - xe, 13, 28), M["console"], bevel=1))
            for k in range(5):
                consoles.append(cylinder_between(f"sw{xs}{sgn}{k}", ((xs - 12 - k * 13), yc, 66), ((xs - 12 - k * 13), yc, 68.5), 1.3, M["alu"], steps=10))

    # tablero delantero con visera, dos pantallas y el HUD encima
    def panel(name, x, zb, zt, w, screens, hud=False):
        tilt = 12
        obs = [box(f"{name}_board", (x, 0, (zb + zt) / 2), (3, w, zt - zb), M["console"], bevel=0.8)]
        obs.append(box(f"{name}_hood", (x - 5, 0, zt + 1.5), (14, w + 4, 3), M["paint_dark"], bevel=1))
        for k, mat in enumerate(screens):
            yc = (k - (len(screens) - 1) / 2) * (w / len(screens))
            obs.append(box(f"{name}_bez{k}", (x - 2, yc, (zb + zt) / 2 + 1), (1.5, w / len(screens) - 4, zt - zb - 8), M["black"], bevel=0.6))
            scr = box(f"{name}_scr{k}", (x - 2.9, yc, (zb + zt) / 2 + 1), (0.4, w / len(screens) - 8, zt - zb - 12), mat)
            uv = scr.data.uv_layers.new(name="UVMap")
            for poly in scr.data.polygons:
                for li in poly.loop_indices:
                    co = scr.data.vertices[scr.data.loops[li].vertex_index].co
                    uv.data[li].uv = ((co.y - (yc - (w / len(screens) - 8) / 2)) / (w / len(screens) - 8), (co.z - (zb + 6 + 1)) / (zt - zb - 12))
            obs.append(scr)
        if hud:
            obs.append(box(f"{name}_hudbase", (x - 8, 0, zt + 4), (8, 14, 3), M["black"], bevel=0.6))
            g = box(f"{name}_hudglass", (x - 9, 0, zt + 11), (0.6, 13, 12), M["hud"])
            g.rotation_euler = (0, math.radians(-tilt), 0)
            obs.append(g)
        return obs
    front_panel = panel("fp", 533, 56, 76, 60, [M["pfd"], M["mfd"]], hud=True)
    rear_panel = panel("rp", 472, 68, 86, 46, [M["pfd"], M["mfd"]])

    # asientos eyectables: cubo, cojín, respaldo, cabezal con el paracaídas y el asa amarilla entre las piernas
    def seat(name, x):
        obs = [box(f"{name}_pan", (x, 0, FLOOR + 8), (26, 30, 16), M["cockpit"], bevel=1.5),
               box(f"{name}_cush", (x + 1, 0, FLOOR + 17), (22, 26, 3), M["cushion"], bevel=1.2),
               box(f"{name}_back", (x - 14, 0, FLOOR + 30), (5, 30, 42), M["cockpit"], bevel=1.5),
               box(f"{name}_pad", (x - 11, 0, FLOOR + 30), (2.5, 24, 30), M["cushion"], bevel=1),
               box(f"{name}_head", (x - 14, 0, FLOOR + 55), (9, 22, 12), M["seat"], bevel=2)]
        for sgn in (1, -1):
            obs.append(box(f"{name}_rail{sgn}", (x - 15, sgn * 16, FLOOR + 27), (3, 2, 44), M["anod"]))
            obs.append(tube_path(f"{name}_strap{sgn}", [(x - 9, sgn * 9, FLOOR + 46), (x - 2, sgn * 6, FLOOR + 36), (x + 4, sgn * 3, FLOOR + 22)], 1.1, M["harness"], bend=4))
        obs.append(tube_path(f"{name}_handle", [(x + 12, 5, FLOOR + 10), (x + 16, 5, FLOOR + 16), (x + 16, -5, FLOOR + 16), (x + 12, -5, FLOOR + 10)], 0.9, M["handle"], bend=2))
        return obs

    part("cabina.cubeta", [tub, footwell, bulkhead, deck] + consoles, "airframe", 55, (0, 350, 200), "Cubeta de cabina con consolas", "airframe", path="v")
    part("cabina.tablero", front_panel, "airframe", 60, (0, 350, 200), "Tablero delantero con HUD y dos pantallas", "airframe", path="v")
    part("cabina.tablero_trasero", rear_panel, "airframe", 61, (0, 350, 200), "Tablero trasero", "airframe", path="v")
    part("asientos", seat("s1", 498) + seat("s2", 430), "airframe", 56, (0, 350, 200), "Asientos eyectables", "airframe", path="v")

    # mandos de cada puesto, con la bisagra en su pie
    for tagname, x in (("delantero", 498), ("trasero", 430)):
        sx = x + 20
        stick = part(f"palanca.{tagname}", [cylinder_between(f"st{x}", (sx, 0, FLOOR), (sx, 0, FLOOR + 3), 4, M["black"], steps=20),
                                            cylinder_between(f"sts{x}", (sx, 0, FLOOR + 2), (sx - 2, 0, FLOOR + 22), 1.1, M["alu"], steps=12),
                                            box(f"stg{x}", (sx - 2.4, 0, FLOOR + 26), (4.5, 4, 9), M["black"], bevel=1.5),
                                            cylinder_between(f"stb{x}", (sx - 1, 0, FLOOR + 30.3), (sx - 1, 0, FLOOR + 31), 0.9, M["ember"], steps=10)],
                     "airframe", 58, (0, 350, 200), f"Palanca de mando ({tagname})", "airframe", path="v", control="stick", range=[-14, 14])
        stick["hinge"] = [0.0, 1.0, 0.0]
        stick["roll"] = [1.0, 0.0, 0.0]
        set_pivot(stick, (sx, 0, FLOOR + 1.5))
        ty = inner(x, 58) - 14   # separada de la pared para que la palanca gire sin rozarla
        thr = part(f"gases.{tagname}", [box(f"thb{x}", (x + 4, ty, 66.5), (14, 6, 2), M["alu"]),
                                         cylinder_between(f"thl{x}", (x + 4, ty, 66), (x + 4, ty, 74), 0.9, M["alu"], steps=10),
                                         box(f"thg{x}", (x + 4, ty - 0.5, 75.5), (4, 5, 4), M["black"], bevel=1.2)],
                   "airframe", 59, (0, 350, 200), f"Palanca de gases ({tagname})", "airframe", path="v", control="throttle", range=[-22, 22])
        thr["hinge"] = [0.0, 1.0, 0.0]
        set_pivot(thr, (x + 4, ty, 66))
        for sgn in (1, -1):
            px = x + 34
            ped = part(f"pedal.{tagname}.{'izq' if sgn > 0 else 'der'}", [cylinder_between(f"pa{x}{sgn}", (px, sgn * 8, FLOOR + 22), (px + 3, sgn * 8, FLOOR + 6), 0.9, M["alu"], steps=10),
                                                                            box(f"pp{x}{sgn}", (px + 3, sgn * 8, FLOOR + 6), (2, 6, 9), M["black"], bevel=0.6)],
                       "airframe", 57, (0, 350, 200), f"Pedal de timón ({tagname})", "airframe", path="v", control="pedal", range=[-12, 12], sign=sgn)
            ped["hinge"] = [0.0, 1.0, 0.0]
            set_pivot(ped, (px, sgn * 8, FLOOR + 22))


# despiece de la MW54 en el Hawk: (desplazamiento en x, turno). Por delante salen la tuerca, la toma, la tapa, la
# rueda del compresor y el difusor; por detrás la tobera, la turbina, el estátor y la cámara; el eje sale el último.
# Cada pieza queda delante (o detrás) de la anterior, sin pasar por las que siguen montadas.
ENGINE_EXPLODE = {"nut": (184, 1), "bellmouth": (166, 2), "shroud": (156, 3), "wheel": (129, 4), "diffuser": (117, 5),
                  "nozzle": (-108, 6), "turbine": (-84, 7), "ngv": (-76, 8), "combustor": (-68, 9), "tunnel": (95, 10)}


def engine_meta(model):
    """Datos de cada pieza de la MW54 para el Hawk, con el despiece de arriba."""
    meta = {k: {**v, "move": [model["MOVES"].get(k, [0, 0, 0])[0], 0, 0]} for k, v in model["PARTS"].items()}
    for k, (dx, out) in ENGINE_EXPLODE.items():
        meta.setdefault(k, {}).update(move=[dx, 0, 0], out=out)
    return meta


def smooth_step(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


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
    HATCH = (330, -60)     # empieza donde acaba la cabina: la MW54 y los equipos salen por arriba sin rozar la piel
    HTOP = set(range(6, 18))   # la escotilla es más ancha que la cabina: deja pasar la MW54 con su montura
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
    mid = loft("fus_mid", secs[iF:iM + 1], [M["paint"], M["orange"]], keep=lambda i, j: not (in_range(i + iF, *HATCH) and j in HTOP), matof=lambda i, j: cheat(i + iF, j))
    rear = loft("fus_rear", secs[iM:], [M["paint"], M["orange"]], matof=lambda i, j: cheat(i + iM, j))
    nz = section_at(-796)
    nozzle = lathe("nozzle_ring", frame((-796, 0, nz[3]), (1, 0, 0)), [(0, 18), (0, 23.0), (6, 22.0), (6, 18)], M["paint_dark"], steps=48)
    hatch = loft("hatch", [[s[k] for k in range(min(HTOP), max(HTOP) + 2)] for s in secs[xs.index(HATCH[0]):xs.index(HATCH[1]) + 1]], M["paint"], closed=False)
    canopy_rows = []
    for x in [x for x in xs if CAN[0] >= x >= CAN[1]]:
        s = superellipse(*section_at(x))
        # cúpula alta como la del Hawk, con el puesto de atrás más elevado que el de delante
        bulge = (34 + 8 * smooth_step(CAN[0] - 60, CAN[1] + 60, x)) * math.sin(math.pi * (CAN[0] - x) / (CAN[0] - CAN[1])) ** 0.7
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
    # el fuselaje delantero se abre en dos mitades (como el molde de la maqueta) para dejar a la vista los equipos
    for half, (sgn, tagname) in enumerate(((1, "izquierda"), (-1, "derecha"))):
        piece = front.copy()
        piece.data = front.data.copy()
        bpy.context.scene.collection.objects.link(piece)
        bm = bmesh.new()
        bm.from_mesh(piece.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y * sgn < 0], context="FACES")
        bm.to_mesh(piece.data)
        bm.free()
        part("fuselaje.delantero" + (".b" if half else ""), [piece], "airframe", 62, (0, sgn * 160, 0), f"Fuselaje delantero, mitad {tagname}", "airframe")
    bpy.data.objects.remove(front, do_unlink=True)
    part("fuselaje.central", [mid] + intakes, "airframe", 0, (0, 0, 0), "Fuselaje central con las tomas de aire", "airframe")
    part("fuselaje.trasero", [rear, nozzle], "airframe", 65, (-850, 0, 0), "Fuselaje trasero y tobera", "airframe")
    part("cabina", [canopy], "airframe", 64, (0, 0, 240), "Cabina en tándem", "airframe")
    part("escotilla", [hatch], "airframe", 63, (0, 0, 380), "Escotilla del motor", "airframe")
    build_cockpit(M, part)

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
        part(f"ala.{tagname}", wing, "airframe", 69, (0, side * 420, 0), f"Ala {tagname}", "airframe")
        flap = part(f"flap.{tagname}", [loft(f"flap{side}", rows(HINGE_F + 0.012, 1, [110.3, 200, 329.5]), M["paint"], caps=True)], "airframe", 70, (-160, 0, 0), f"Flap {tagname}", "airframe", control="flap", range=[0, 40], sign=side)
        ail = part(f"aleron.{tagname}", [loft(f"ail{side}", rows(HINGE_A + 0.012, 1, [380.5, 520, 640, half - 22.5]), M["paint"], caps=True)], "airframe", 70, (-160, 0, 0), f"Alerón {tagname}", "airframe", control="aileron", range=[-22, 22], sign=side)
        for ob, (ya, yb), frac in ((flap, (110.3, 329.5), HINGE_F), (ail, (380.5, half - 22.5), HINGE_A)):
            # bisagra en el intradós: al bajar, el borde de ataque del flap se aleja del ala en vez de meterse en ella
            low = lambda y: WZ + DZ(y) - naca_t(frac, TT(y)) * CH(y)
            pa = Vector((LE(ya) - frac * CH(ya), side * ya, low(ya)))
            pb = Vector((LE(yb) - frac * CH(yb), side * yb, low(yb)))
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
        ob = part(f"estabilizador.{tagname}", [loft(f"tail{side}", rows, M["paint"], caps=True)], "airframe", 66, (-120, side * 260, 0), f"Estabilizador {tagname} (monobloque)", "airframe", control="elevator", range=[-18, 14])
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

    def fin_uv(co, side):
        u = 0.5 + (-co.x - 555) / 300
        return (min(1, max(0, u if side >= 0 else 1 - u)), min(1, max(0, (co.z - 60) / 190)))
    fin = loft("fin", fin_rows(0, 0.7, FIN), [M["fin"]], uvmap=fin_uv)
    tipband = loft("finband", fin_rows(0, 1, ((248, -605, 150), (270, -620, 130))), M["glow"], caps=True)
    part("deriva", [fin, tipband], "airframe", 67, (0, 0, 300), "Deriva con la insignia del agujero negro", "airframe")
    rud = part("timon", [loft("rudder", fin_rows(0.703, 1, FIN), M["paint"], caps=True)], "airframe", 68, (-300, 0, 300), "Timón de dirección", "airframe", control="rudder", range=[-25, 25])
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
    # el de morro sale cuando ya no están el fuselaje delantero ni su pozo (su pata entra en el pozo)
    ob = part("tren.morro", nose, "airframe", 40, (0, 0, -160), "Tren de morro", "gear", control="gear", range=[0, 90])
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
    part("pozo.morro", [nose_well], "airframe", 43, (0, -350, 200), "Pozo del tren de morro", "gear", path="v")

    # ── instalación del motor: carriles, montura de dos piezas, tubo de empuje hasta la tobera ──
    EF = frame(ENGINE_TIP, (-1, 0, 0))
    mount = [box("rail_l", (ENGINE_TIP[0] - 80, 40, ENGINE_TIP[2] - 53), (120, 8, 6), M["wood"]), box("rail_r", (ENGINE_TIP[0] - 80, -40, ENGINE_TIP[2] - 53), (120, 8, 6), M["wood"])]
    for s_ in (64, 96):
        mount.append(lathe(f"band{s_}", EF, [(s_ - 4, 44.45), (s_ - 4, 46.6), (s_ + 4, 46.6), (s_ + 4, 44.45)], M["anod"], steps=72))
        mount.append(box(f"foot{s_}", (ENGINE_TIP[0] - s_, 0, ENGINE_TIP[2] - 48.6), (10, 88, 3), M["anod"]))
    # la montura es de dos piezas: las abrazaderas de arriba salen antes que el motor y la base después
    upper = []
    for ob in [m for m in mount if m.name.startswith("band")]:
        top = ob.copy()
        top.data = ob.data.copy()
        bpy.context.scene.collection.objects.link(top)
        for piece, keep_up in ((top, True), (ob, False)):
            bm = bmesh.new()
            bm.from_mesh(piece.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if (f.calc_center_median().z > ENGINE_TIP[2]) != keep_up], context="FACES")
            bm.to_mesh(piece.data)
            bm.free()
        upper.append(top)
    part("motor.montura.sup", upper, "systems", 54, (0, -350, 200), "Abrazaderas superiores de la montura", "mounts", path="v")
    part("motor.montura", mount, "systems", 20, (0, 0, 140), "Base de la montura de dos piezas de Wren", "mounts")
    x0 = ENGINE_TIP[0] - 167 - 6
    tail = section_at(-786)
    start = Vector((x0, 0, ENGINE_TIP[2]))
    end = Vector((-786, 0, tail[3]))
    TF = frame(start, end - start)
    L_TT = (end - start).length
    part("tubo_empuje", [lathe("thrusttube", TF, [(0, 38), (12, 32), (L_TT, 17.6), (L_TT, 17.0), (12, 31.4), (0, 37.4)], M["thrust"], steps=64)], "systems", 21, (0, 0, 160), "Tubo de empuje (pared simple)", "engines")
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
    part("bandeja", [box("tray", (320, 0, TZ - 2), (240, 80, 4), M["wood"])], "systems", 44, (0, -350, 200), "Bandeja de equipos", "airframe", path="v")
    part("bandeja.morro", [box("tray2", (575, 0, -2), (130, 52, 4), M["wood"])], "systems", 45, (0, -350, 200), "Bandeja del morro, sobre el pozo del tren", "airframe", path="v")
    part("deposito", [box("tank", (270, 0, TZ + 44), (130, 76, 88), M["tank"], bevel=10), box("fuelin", (270, 0, TZ + 26), (120, 68, 48), M["fuel"], bevel=8), cylinder_between("cap", (310, 0, TZ + 88), (310, 0, TZ + 95), 8, M["black"], steps=24)], "systems", 46, (0, -350, 200), "Depósito principal", "fuel", path="v")
    part("hopper", [cylinder_between("hop", (158, 0, TZ + 22), (196, 0, TZ + 22), 22, M["tank"], steps=48), cylinder_between("hopf", (160, 0, TZ + 16), (194, 0, TZ + 16), 16, M["fuel"], steps=32)], "systems", 47, (0, -350, 200), "Hopper con clunk de fieltro", "fuel", path="v")
    part("bomba", [cylinder_between("pump", (380, -28, TZ + 11), (420, -28, TZ + 11), 11, M["anod"], steps=32), box("ph", (426, -28, TZ + 11), (12, 22, 22), M["alu"])], "systems", 48, (0, -350, 200), "Bomba de combustible", "pumps", path="v")
    part("valvula.combustible", [box("v1", (410, 24, TZ + 7), (22, 16, 14), M["black"]), cylinder_between("v1c", (410, 24, TZ + 14), (410, 24, TZ + 21), 5.5, M["festo"], steps=20)], "systems", 49, (0, -350, 200), "Electroválvula de combustible", "pumps", path="v")
    part("valvula.gas", [box("v2", (365, 22, TZ + 6), (20, 12, 12), M["black"]), cylinder_between("v2c", (365, 22, TZ + 12), (365, 22, TZ + 19), 5, M["gasline"], steps=20)], "systems", 50, (0, -350, 200), "Electroválvula de gas", "gas", path="v")
    part("ecu", [box("ecu", (358, 38, TZ + 6), (26, 18, 12), M["pcb"], bevel=1.5)], "systems", 51, (0, -350, 200), "ECU", "ecu", path="v")
    part("gas", [cylinder_between("gas", (530, 0, 15), (585, 0, 15), 15, M["gascan"], steps=40)], "systems", 52, (0, -350, 200), "Botella de gas de arranque", "gas", path="v")
    part("radio", [box("rx", (600, 0, 6), (22, 22, 12), M["black"], bevel=1), box("bat1", (632, 0, 8), (30, 22, 16), M["lipo"], bevel=2)], "systems", 53, (0, -350, 200), "Receptor y batería", "radio", path="v")
    fp, fn = fittings["fuel"]
    gp, gn = fittings["gas"]
    lines = [tube_path("tyg1", [(205, 26, TZ + 8), (148, 26, TZ + 8), (148, 0, TZ + 22), (158, 0, TZ + 22)], 1.6, M["tygon"], bend=5),
             tube_path("tyg2", [(177, -22.5, TZ + 22), (177, -44, TZ + 22), (350, -44, TZ + 11), (366, -28, TZ + 11), (380, -28, TZ + 11)], 1.4, M["tygon"], bend=6),
             tube_path("festo1", [(432, -28, TZ + 14), (444, -28, TZ + 14), (444, 30, TZ + 7), (430, 24, TZ + 7), (421, 24, TZ + 7)], 1.2, M["festo"], bend=5),
             tube_path("festo2", [(399, 24, TZ + 7), (392, 24, TZ + 7), (386, 32, TZ + 7), (384, 34, 60), (220, 34, 62), tuple(fp + fn * 10), tuple(fp)], 1.2, M["festo"], bend=10),
             tube_path("gas1", [(530, 0, 15), (523, 0, 15), (523, 28, 8), (480, 34, 0), (392, 34, TZ + 6), (382, 22, TZ + 6), (375, 22, TZ + 6)], 0.9, M["gasline"], bend=5),
             tube_path("gas2", [(355, 22, TZ + 6), (349, 22, TZ + 6), (343, 14, TZ + 6), (341, 14, 72), (220, 14, 72), tuple(gp + gn * 10), tuple(gp)], 0.9, M["gasline"], bend=8)]
    # las líneas que suben hasta el motor salen primero; las de abajo, cuando ya no hay equipos encima y antes que las
    # bandejas sobre las que pasan
    part("lineas.motor", lines[3:4] + lines[5:6], "systems", 54.5, (0, -350, 200), "Líneas al motor: Festo de combustible y gas", "fuel", path="v")
    part("lineas", lines[:3] + lines[4:5], "systems", 45.5, (0, -350, 200), "Líneas entre equipos: Tygon al hopper y la bomba, Festo y gas", "fuel", path="v")
    # la cabina se aparta hacia la izquierda y los equipos hacia la derecha, cada pieza a su propio hueco: la primera en
    # salir va más lejos, así ninguna barre a las que ya están fuera
    for side in (1, -1):
        group = sorted([o for o in root.children if o.get("path") == "v" and o.get("explode", [0, 0, 0])[1] * side >= 350], key=lambda o: -o["order"])
        fan_out(group, side)
    return parts


def fan_out(obs, side, lift=200.0, near=200.0, gap=15.0):
    """Destinos en fila hacia `side` (±y): sube `lift` y se aparta; la última en salir queda más cerca."""
    cursor = near * side
    for ob in reversed(obs):
        ys = [(ob.matrix_basis @ v.co).y for v in ob.data.vertices]
        dy = cursor - (min(ys) if side > 0 else max(ys))
        ob["explode"] = [0.0, dy, lift]
        cursor = (max(ys) if side > 0 else min(ys)) + dy + gap * side


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
