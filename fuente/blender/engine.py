# La MW54 según los planos de Wren, construida a partir de los mismos perfiles que la figura técnica.
# Origen en la punta de la tuerca del compresor, eje del motor por -X (el aire entra por +X).
import math
from mathutils import Vector
from lib import (material, gradient_image, lathe, tube, cylinder_between, box, surface_grid, tube_path, hull,
                 boolean_cut, join, empty, tag, frame, point, TAU)

L = 167.0


def materials():
    steel = (0.78, 0.78, 0.8)
    hot = gradient_image("heat_tint", [
        (0.0, steel), (0.30, steel), (0.42, (0.80, 0.68, 0.44)), (0.52, (0.62, 0.43, 0.30)),
        (0.60, (0.44, 0.32, 0.46)), (0.66, (0.33, 0.39, 0.60)), (0.73, (0.36, 0.37, 0.44)),
        (0.86, (0.58, 0.52, 0.44)), (1.0, (0.66, 0.63, 0.58)),
    ])
    warm = gradient_image("case_tint", [(0.0, steel), (0.45, steel), (0.62, (0.80, 0.72, 0.55)), (0.72, (0.74, 0.62, 0.48)), (1.0, (0.70, 0.66, 0.60))])
    return {
        "nylon": material("Nailon", (0.86, 0.85, 0.80), 0.0, 0.42, coat=0.15),
        "alu": material("Aluminio mecanizado", (0.91, 0.92, 0.93), 1.0, 0.2),
        "alu_cast": material("Aluminio fundido", (0.86, 0.87, 0.88), 1.0, 0.34),
        "steel": material("Acero", (0.72, 0.73, 0.75), 1.0, 0.28),
        "shaft": material("Acero En24T", (0.58, 0.59, 0.61), 1.0, 0.24),
        "bearing": material("Rodamiento", (0.82, 0.83, 0.86), 1.0, 0.12),
        "ceramic": material("Cerámica", (0.93, 0.93, 0.9), 0.0, 0.3),
        "case": material("Inox carcasa", (1, 1, 1), 1.0, 0.27, image=warm),
        "hot": material("Inox con tono de calor", (1, 1, 1), 1.0, 0.33, image=hot),
        "ngv": material("Inox fundido", (0.52, 0.5, 0.52), 1.0, 0.42, image=hot),
        "inconel": material("Inconel 713", (0.50, 0.49, 0.47), 1.0, 0.4),
        "mild": material("Acero dulce", (0.36, 0.36, 0.38), 1.0, 0.5),
        "brass": material("Latón", (0.88, 0.70, 0.38), 1.0, 0.28),
        "screw": material("Tornillería inox", (0.70, 0.71, 0.73), 1.0, 0.32),
    }


def screws_on_face(name, F, s, r, count, M, size=1.6, phase=0.0, depth=1.4, facing=-1):
    """Cabezas de tornillo Allen en una cara perpendicular al eje (facing = -1 mira hacia +X, el frente)."""
    obs = []
    for i in range(count):
        th = phase + TAU * i / count
        c = point(F, s, r, th)
        a = F[1] * facing
        head = cylinder_between(f"{name}.{i}", c, c + a * depth, size, M["screw"], steps=16)
        obs.append(head)
    return obs


def build_engine(prefix, M, parent=None, location=(0, 0, 0), meta=None):
    """Devuelve el vacío raíz del motor; cada pieza física es un objeto hijo con sus metadatos."""
    root = empty(f"{prefix}", location, parent)
    F = frame((0, 0, 0), (-1, 0, 0))
    parts = {}
    meta = meta or {}

    def part(key, obs, order):
        ob = join(f"{prefix}.{key}", obs, root)
        info = meta.get(key, {})
        tag(ob, part=key, group=prefix, order=order, explode=list(info.get("move", (0, 0, 0))), label=info.get("name", key), material=info.get("material", ""), melt=list(info.get("melt", [0, 0])), service=info.get("service", 0))
        if "out" in info:
            ob["out"] = info["out"]
        parts[key] = ob
        return ob

    # ── tuerca del compresor (bala de aluminio) ──
    nut = [(0.0, 0.0)] + [(s, 0.6 + 7.4 * math.sin(min(1, s / 11) * math.pi / 2)) for s in [i * 11 / 16 for i in range(1, 17)]] + [(16, 8), (16, 0)]
    part("nut", [lathe(f"{prefix}.nut.body", F, nut, M["alu"], steps=64)], 0)

    # ── rueda del compresor: Garrett 446335, Ø54 de salida, Ø38,2 de entrada, 6 + 6 álabes ──
    W0, HL = 16.0, 19.6
    hub = lambda s: 4.5 + 22.5 * min(1, max(0, (s - W0) / HL)) ** 2.1
    tip = lambda s: 19.1 + 7.9 * (s - W0) / HL
    prof = [(W0, 0), (W0, 4.5)] + [(W0 + HL * i / 20, hub(W0 + HL * i / 20)) for i in range(1, 21)] + [(38, 27), (38, 0)]
    wheel = [lathe(f"{prefix}.wheel.hub", F, prof, M["alu_cast"], steps=96)]
    for i in range(12):
        s_le = W0 if i % 2 == 0 else W0 + 6
        grid = []
        for j in range(13):
            s = s_le + (W0 + HL - s_le) * j / 12
            th = TAU * i / 12 + 0.75 * (1 - (s - W0) / HL) ** 2
            r0 = hub(s) - 0.4
            grid.append([point(F, s, r0 + (tip(s) - r0) * q / 5, th) for q in range(6)])
        wheel.append(surface_grid(f"{prefix}.wheel.blade{i}", grid, M["alu_cast"], thickness=0.8))
    part("wheel", wheel, 6)

    # ── toma de nailon y su brida con 6 tornillos ──
    intake = [(24, 22.9), (19, 21), (16, 19.7), (12, 20.6), (9, 22.6), (7, 25.5), (6.2, 28.5), (6.6, 31), (8, 32.5), (19, 33), (19, 36), (24, 36)]
    part("bellmouth", [lathe(f"{prefix}.intake.body", F, intake, M["nylon"], steps=96, sharp=50)] + screws_on_face(f"{prefix}.intake.screw", F, 19, 34.2, 6, M, 1.3, 0.26), 0)

    # ── tapa delantera de aluminio (envuelve la rueda) con 8 tornillos M2,5 ──
    shroud = [(24, 22.9), (24, 49), (28, 49), (28, 43.8), (34.6, 43.8), (34.6, 27.4), (32, 26.1), (28, 24.5)]
    part("shroud", [lathe(f"{prefix}.shroud.body", F, shroud, M["alu"], steps=96)] + screws_on_face(f"{prefix}.shroud.screw", F, 24, 46.4, 8, M, 1.5, 0.2), 0)

    # ── difusor: 11 cuñas y 36 álabes, Ø88 ──
    diff = [lathe(f"{prefix}.diffuser.body", F, [(38, 6), (38, 36), (49, 36), (49, 43.6), (52, 43.6), (52, 6)], M["alu"], steps=96)]
    for i in range(11):
        th = TAU * i / 11
        pts = [(28.8, th - 0.02), (35.6, th + 0.18), (33.0, th + 0.36)]
        # cuña: prisma triangular de 3,2 mm que sale de la cara del difusor hacia la rueda
        diff.append(hull(f"{prefix}.diffuser.wedge{i}", [point(F, 38 - d, r, t) for (r, t) in pts for d in (0.0, 3.2)], M["alu"]))
    for i in range(36):
        th = TAU * i / 36
        grid = [[point(F, s, r, th + 0.25 * (s - 42) / 7) for r in (36, 43.4)] for s in (42, 45.5, 49)]
        diff.append(surface_grid(f"{prefix}.diffuser.vane{i}", grid, M["alu"], thickness=0.8))
    part("diffuser", diff, 2)

    # ── eje En24T en su túnel de aluminio, con dos rodamientos GRW 688 ──
    tun = [lathe(f"{prefix}.tunnel.body", F, [(52, 8.6), (52, 10), (104, 10), (104, 8.6)], M["alu"], steps=64)]
    tun.append(lathe(f"{prefix}.shaft", F, [(38, 0), (38, 4), (115, 4), (115, 0)], M["shaft"], steps=48))
    for s in (52, 99):
        tun.append(tube(f"{prefix}.bearing{s}", F, s, s + 5, 4.0, 8.6, mat=M["bearing"], steps=48))
    part("tunnel", tun, 1)

    # ── cámara anular de chapa: Ø76 × 46, 6 filas de agujeros, 6 inyectores, 6 vaporizadores, 2 bujías ──
    C0, C1, WRAP0 = 52, 104, 56
    outer = tube(f"{prefix}.comb.outer", F, WRAP0, 102, 37.6, 38.0, mat=M["hot"], steps=120, uv_len=L)
    cutters = []
    for d, count, dia in [(8, 6, 3.8), (14.5, 24, 1.5), (18.5, 12, 2.3), (27.5, 24, 3.25), (38, 12, 4.9), (42, 24, 1.5)]:
        for i in range(count):
            th = TAU * i / count + (0.26 if count == 12 else 0.52 if count == 6 else 0.13)
            p = point(F, WRAP0 + d, 39.5, th)
            q = point(F, WRAP0 + d, 36.0, th)
            cutters.append(cylinder_between(f"cut{d}.{i}", q, p, dia / 2, steps=12))
    for th in (math.radians(32), math.radians(148)):
        cutters.append(cylinder_between("cutglow", point(F, WRAP0 + 22, 36, th), point(F, WRAP0 + 22, 39.5, th), 3.5, steps=16))
    boolean_cut(outer, cutters)
    comb = [outer,
            tube(f"{prefix}.comb.inner", F, WRAP0, 102, 15.0, 15.4, mat=M["hot"], steps=72, uv_len=L),
            lathe(f"{prefix}.comb.dome", F, [(C0, 15), (C0, 38), (WRAP0, 38), (WRAP0, 37.6), (C0 + 0.4, 37.6), (C0 + 0.4, 15.4), (WRAP0, 15.4), (WRAP0, 15)], M["hot"], steps=96, uv_len=L),
            lathe(f"{prefix}.comb.rear", F, [(102, 28), (102, 38), (C1, 38), (C1, 28)], M["hot"], steps=96, uv_len=L)]
    for i in range(6):
        th = TAU * i / 6 + 0.52
        comb.append(cylinder_between(f"{prefix}.comb.jet{i}", point(F, C0 + 0.4, 27, th), point(F, C0 + 2.6, 27, th), 1.1, M["steel"], steps=12))
        # vaporizador "bastón": entra por la cúpula, recorre el anillo y se curva hacia atrás
        pts = [point(F, C0 + 0.5, 27, th), point(F, WRAP0 + 18, 27, th), point(F, WRAP0 + 30, 31, th + 0.3), point(F, WRAP0 + 36, 22, th + 0.5)]
        comb.append(tube_path(f"{prefix}.comb.stick{i}", pts, 1.6, M["hot"], bend=6))
    for th in (math.radians(32), math.radians(148)):
        comb.append(cylinder_between(f"{prefix}.comb.glowboss", point(F, WRAP0 + 22, 37.8, th), point(F, WRAP0 + 22, 40.4, th), 3.4, M["hot"], steps=20))
    part("combustor", comb, 3)

    # ── estátor fundido de 13 álabes y la tapa trasera de acero dulce con 8 tornillos M3 ──
    N0, N1, CB = 104, 115, 112
    ngv = [tube(f"{prefix}.ngv.hub", F, N0, CB, 18.5, 19.6, mat=M["ngv"], steps=72, uv_len=L),
           tube(f"{prefix}.ngv.ring", F, N0, CB, 27.6, 29.0, mat=M["ngv"], steps=96, uv_len=L)]
    for i in range(13):
        th = TAU * i / 13
        grid = [[point(F, s, r, th + 0.55 * (s - N0) / (CB - N0)) for r in (19.4, 27.8)] for s in (N0 + 0.5, N0 + 3, N0 + 5.5, CB - 0.5)]
        ngv.append(surface_grid(f"{prefix}.ngv.vane{i}", grid, M["ngv"], thickness=0.9))
    ngv.append(tube(f"{prefix}.case_rear", F, CB, N1, 18.5, 47.5, mat=M["mild"], steps=96))
    ngv += screws_on_face(f"{prefix}.ngv.screw", F, CB, 35, 8, M, 1.9, 0.2)
    part("ngv", ngv, 4)

    # ── rueda de turbina de Inconel 713: Ø55 × 12, llanta de 6 ──
    U0, U1 = 115, 127
    tur = [lathe(f"{prefix}.turbine.disc", F, [(U0, 0), (U0, 4), (U0 + 2, 12), (U0 + 3, 22), (U1 - 3, 22), (U1 - 2, 12), (U1, 4), (U1, 0)], M["inconel"], steps=96)]
    for i in range(27):
        th = TAU * i / 27
        grid = [[point(F, s, r, th - 0.45 * (s - U0 - 3) / 6) for r in (21.8, 27.5)] for s in (U0 + 3, U0 + 6, U1 - 3)]
        tur.append(surface_grid(f"{prefix}.turbine.blade{i}", grid, M["inconel"], thickness=1.0))
    tur.append(lathe(f"{prefix}.turbine.nut", F, [(U1, 0), (U1, 4.5), (U1 + 4, 4.5), (U1 + 4, 0)], M["steel"], steps=6, sharp=20))
    part("turbine", tur, 5)

    # ── cono de escape: exterior e interior de chapa, 4 aletas, 6 tornillos avellanados ──
    Z0, Z1 = 115, 167
    cone = [tube(f"{prefix}.cone.flange", F, Z0, Z0 + 2, 30.4, 40, mat=M["hot"], steps=96, uv_len=L),
            lathe(f"{prefix}.cone.outer", F, [(Z0 + 2, 30.4), (Z0 + 2, 31), (Z1, 26), (Z1, 25.4)], M["hot"], steps=96, uv_len=L),
            lathe(f"{prefix}.cone.inner", F, [(131, 0), (131, 18), (Z1, 7.5), (Z1, 0)], M["hot"], steps=72, uv_len=L)]
    for i in range(4):
        th = TAU * i / 4 + math.pi / 4
        grid = [[point(F, s, r, th) for r in (17.5, 29.6)] for s in (134, 138, 142)]
        cone.append(surface_grid(f"{prefix}.cone.vane{i}", grid, M["hot"], thickness=0.5))
    cone += screws_on_face(f"{prefix}.cone.screw", F, Z0 + 2, 35.5, 6, M, 1.8, 0.26, facing=1)
    part("nozzle", cone, 7)

    # ── carcasa exterior: chapa de inox de 0,4 mm, Ø88 por dentro, 6 tornillos en cada extremo; bujías, latones y sonda ──
    case = tube(f"{prefix}.case.body", F, 28, 112, 44.0, 44.4, mat=M["case"], steps=128, uv_len=L)
    cas = [case]
    for s in (29.5, 110.5):
        for i in range(6):
            th = TAU * i / 6 + 0.3
            c = point(F, s, 44.4, th)
            n = (c - point(F, s, 0, th)).normalized()
            cas.append(cylinder_between(f"{prefix}.case.screw", c, c + n * 1.2, 1.6, M["screw"], steps=12))
    glow = {}
    for deg in (32, 148):
        th = math.radians(deg)
        base = point(F, WRAP0 + 22, 44.4, th)
        n = (base - point(F, WRAP0 + 22, 0, th)).normalized()
        cas.append(cylinder_between(f"{prefix}.glow.boss", base - n * 0.3, base + n * 3, 4, M["steel"], steps=6))
        cas.append(cylinder_between(f"{prefix}.glow.body", base + n * 3, base + n * 6.8, 3.0, M["steel"], steps=6))
        cas.append(cylinder_between(f"{prefix}.glow.insul", base + n * 6.8, base + n * 9.0, 1.9, M["ceramic"], steps=16))
        glow[deg] = base + n * 9.0
    fittings = {}
    for key, deg, s in (("fuel", 92, 40.5), ("gas", 114, 45.5), ("lube", 136, 50.5)):
        th = math.radians(deg)
        base = point(F, s, 44.4, th)
        n = (base - point(F, s, 0, th)).normalized()
        cas.append(cylinder_between(f"{prefix}.fit.{key}", base - n * 0.3, base + n * 3.6, 2.6, M["brass"], steps=6))
        cas.append(cylinder_between(f"{prefix}.fit.{key}.nip", base + n * 3.6, base + n * 6.0, 1.4, M["brass"], steps=16))
        fittings[key] = (base + n * 6.0, n)
    th = math.radians(100)
    base = point(F, 106, 44.4, th)
    n = (base - point(F, 106, 0, th)).normalized()
    cas.append(cylinder_between(f"{prefix}.tc", base - n * 0.3, base + n * 4, 1.6, M["steel"], steps=12))
    fittings["tc"] = (base + n * 4, n)
    fittings["glow"] = (glow[148], (glow[148] - point(F, WRAP0 + 22, 0, math.radians(148))).normalized())
    part("casing", cas, 8)
    return root, parts, fittings
