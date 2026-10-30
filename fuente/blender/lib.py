# Utilidades de modelado: torneado de perfiles, superficies, booleanas, materiales PBR y metadatos de pieza.
# Unidades: milímetros (la raíz de la escena se escala a metros al exportar). Ejes: +X morro, +Y izquierda, +Z arriba.
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

TAU = math.tau


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


# ───────────── materiales ─────────────
_mats = {}


def material(name, color, metallic=0.0, roughness=0.5, coat=0.0, coat_rough=0.05, transmission=0.0, ior=1.45, alpha=1.0, image=None, emission=None, specular=0.5, normal=None, rough=None, strength=1.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1.0)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    p.inputs["IOR"].default_value = ior
    if "Coat Weight" in p.inputs:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = coat_rough
    if "Transmission Weight" in p.inputs:
        p.inputs["Transmission Weight"].default_value = transmission
    if "Specular IOR Level" in p.inputs:
        p.inputs["Specular IOR Level"].default_value = specular
    p.inputs["Alpha"].default_value = alpha
    if alpha < 1.0 or transmission > 0:
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            pass
    if emission:
        p.inputs["Emission Color"].default_value = (*emission[0], 1.0)
        p.inputs["Emission Strength"].default_value = emission[1]
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    if rough is not None:
        # rugosidad en el canal verde, como la lee el exportador glTF (metallicRoughness)
        rt = nt.nodes.new("ShaderNodeTexImage")
        rt.image = rough
        rough.colorspace_settings.name = "Non-Color"
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(rt.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
    if normal is not None:
        nm = nt.nodes.new("ShaderNodeTexImage")
        nm.image = normal
        normal.colorspace_settings.name = "Non-Color"
        node = nt.nodes.new("ShaderNodeNormalMap")
        node.inputs["Strength"].default_value = strength
        nt.links.new(nm.outputs["Color"], node.inputs["Color"])
        nt.links.new(node.outputs["Normal"], p.inputs["Normal"])
    _mats[name] = m
    return m


def gradient_image(name, stops, width=256):
    """Imagen 1D (ancho × 4) con un degradado por paradas [(t, (r,g,b)), …], para el tono de calor del inox."""
    img = bpy.data.images.new(name, width, 4)
    px = []
    for row in range(4):
        for i in range(width):
            t = i / (width - 1)
            for j in range(len(stops) - 1):
                t0, c0 = stops[j]
                t1, c1 = stops[j + 1]
                if t0 <= t <= t1:
                    f = (t - t0) / max(1e-6, t1 - t0)
                    f = f * f * (3 - 2 * f)
                    c = [c0[k] + (c1[k] - c0[k]) * f for k in range(3)]
                    break
            else:
                c = stops[-1][1]
            px += [c[0], c[1], c[2], 1.0]
    img.pixels = px
    img.pack()
    return img


# ───────────── objetos ─────────────
def to_object(name, bm, mat=None, parent=None, sharp=38, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat is not None:
        me.materials.append(mat)
    if smooth:
        for poly in me.polygons:
            poly.use_smooth = True
        try:
            me.set_sharp_from_angle(angle=math.radians(sharp))
        except Exception:
            pass
    if parent is not None:
        ob.parent = parent
    return ob


def frame(origin, axis=(-1, 0, 0)):
    """Marco de un eje: punto(s, r, θ) con θ desde +Y hacia +Z (para ejes por X)."""
    o = Vector(origin)
    a = Vector(axis).normalized()
    helper = Vector((0, 0, 1)) if abs(a.z) < 0.9 else Vector((1, 0, 0))
    if abs(a.x) > 0.9:
        u, v = Vector((0, 1, 0)), Vector((0, 0, 1))
    else:
        u = helper.cross(a).normalized()
        v = a.cross(u).normalized()
    return o, a, u, v


def point(F, s, r, th):
    o, a, u, v = F
    return o + a * s + u * (r * math.cos(th)) + v * (r * math.sin(th))


def lathe(name, F, profile, mat=None, parent=None, steps=96, closed=True, sharp=38, uv_len=None):
    """Torno: `profile` es [(s, r), …] (meridiano). Cerrado o abierto. Pone UV u = s / uv_len para degradados."""
    bm = bmesh.new()
    rows = []
    for k in range(steps):
        th = TAU * k / steps
        rows.append([bm.verts.new(point(F, s, r, th)) for s, r in profile])
    n = len(profile)
    seg = range(n) if closed else range(n - 1)
    for k in range(steps):
        a, b = rows[k], rows[(k + 1) % steps]
        for i in seg:
            j = (i + 1) % n
            quad = [a[i], a[j], b[j], b[i]]
            if len({id(q) for q in quad}) == 4:
                try:
                    bm.faces.new(quad)
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv_len:
        uv = bm.loops.layers.uv.new("UVMap")
        o, a, _, _ = F
        for f in bm.faces:
            for loop in f.loops:
                s = (loop.vert.co - o).dot(a)
                loop[uv].uv = (max(0.0, min(1.0, s / uv_len)), 0.5)
    return to_object(name, bm, mat, parent, sharp)


def tube(name, F, s0, s1, r_in, r_out, **kw):
    return lathe(name, F, [(s0, r_in), (s0, r_out), (s1, r_out), (s1, r_in)], **kw)


def cylinder_between(name, p0, p1, r, mat=None, parent=None, steps=24, caps=True):
    p0, p1 = Vector(p0), Vector(p1)
    F = frame(p0, p1 - p0)
    L = (p1 - p0).length
    prof = [(0, 0), (0, r), (L, r), (L, 0)] if caps else [(0, r), (L, r)]
    return lathe(name, F, prof, mat, parent, steps=steps, closed=caps)


def box(name, center, size, mat=None, parent=None, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(center)
    ob = to_object(name, bm, mat, parent, smooth=False)
    if bevel > 0:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = "ANGLE"
        apply_modifiers(ob)
        for p in ob.data.polygons:
            p.use_smooth = True
        ob.data.set_sharp_from_angle(angle=math.radians(35))
    return ob


def surface_grid(name, grid, mat=None, parent=None, thickness=0.6):
    """Una superficie (lista de filas de puntos) con espesor: álabes, aletas, paneles finos."""
    bm = bmesh.new()
    rows = [[bm.verts.new(p) for p in row] for row in grid]
    for i in range(len(rows) - 1):
        for j in range(len(rows[0]) - 1):
            bm.faces.new([rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]])
    ob = to_object(name, bm, mat, parent, sharp=50)
    mod = ob.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 0
    apply_modifiers(ob)
    return ob


def tube_path(name, points, r, mat=None, parent=None, steps=14, bend=6.0):
    """Tubo o cable a lo largo de una polilínea con esquinas redondeadas."""
    pts = [Vector(p) for p in points]
    path = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        d0 = (b - a)
        d1 = (c - b)
        rad = min(bend, d0.length * 0.45, d1.length * 0.45)
        p0 = b - d0.normalized() * rad
        p1 = b + d1.normalized() * rad
        for k in range(7):
            t = k / 6
            path.append((1 - t) ** 2 * p0 + 2 * t * (1 - t) * b + t * t * p1)
    path.append(pts[-1])
    bm = bmesh.new()
    rings = []
    prev_n = None
    for i, p in enumerate(path):
        tan = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        n = prev_n if prev_n is not None else (Vector((0, 0, 1)) if abs(tan.z) < 0.9 else Vector((1, 0, 0)))
        n = (n - tan * n.dot(tan)).normalized()
        prev_n = n
        bnorm = tan.cross(n)
        rings.append([bm.verts.new(p + (n * math.cos(TAU * k / steps) + bnorm * math.sin(TAU * k / steps)) * r) for k in range(steps)])
    for i in range(len(rings) - 1):
        for k in range(steps):
            bm.faces.new([rings[i][k], rings[i][(k + 1) % steps], rings[i + 1][(k + 1) % steps], rings[i + 1][k]])
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return to_object(name, bm, mat, parent, sharp=60)


def hull(name, points, mat=None, parent=None):
    """Sólido convexo de una nube de puntos: cuñas, soportes, piezas prismáticas."""
    bm = bmesh.new()
    vs = [bm.verts.new(Vector(p)) for p in points]
    res = bmesh.ops.convex_hull(bm, input=vs)
    loose = {g for g in res["geom_interior"] + res["geom_unused"] if isinstance(g, bmesh.types.BMVert)}
    if loose:
        bmesh.ops.delete(bm, geom=list(loose), context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return to_object(name, bm, mat, parent, smooth=False)


def apply_modifiers(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def boolean_cut(ob, cutters):
    """Resta los cortadores (lista de objetos) y los borra."""
    if not cutters:
        return
    for c in cutters:
        mod = ob.modifiers.new("cut", "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = "EXACT"
        mod.object = c
    apply_modifiers(ob)
    for c in cutters:
        bpy.data.objects.remove(c, do_unlink=True)


def join(name, obs, parent=None):
    """Une varias mallas en un objeto (una pieza física = un objeto que se mueve entero)."""
    obs = [o for o in obs if o is not None]
    base = obs[0]
    for o in obs:
        o.parent = None
    with bpy.context.temp_override(active_object=base, selected_editable_objects=obs, selected_objects=obs):
        bpy.ops.object.join()
    base.name = name
    base.data.name = name
    if parent is not None:
        base.parent = parent
    return base


def empty(name, location=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.location = location
    bpy.context.scene.collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    return ob


def tag(ob, **meta):
    """Metadatos que el visor lee del GLB (extras): pieza, grupo, orden, despiece, material…"""
    for key, value in meta.items():
        ob[key] = value
    return ob
