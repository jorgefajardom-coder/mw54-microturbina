# Exporta los cinco modelos para abrirlos en Autodesk Fusion: un FBX por avión (cada pieza es un cuerpo de malla con su
# nombre, en milímetros y con la jerarquía de piezas) y un OBJ de respaldo. Fusion los abre con Subir (FBX/OBJ) o con
# Insertar > Insertar malla (OBJ).
# Uso: python blender/export_cad.py [hawk sr71 f22 f14 sr72]
import importlib
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "cad")
NAMES = {"hawk": "hawk_mw54", "sr71": "sr71_j58", "f22": "f22_f119", "f14": "f14_f110", "sr72": "sr72_tbcc"}


def build(name, sc):
    with bpy.context.temp_override(scene=sc):
        if name == "hawk":
            import engine
            import hawk
            model = json.load(open(os.path.join(HERE, "model.json"), encoding="utf8"))
            root = lib.empty("Hawk_MW54")
            AM, EM = hawk.materials(), engine.materials()
            _, EF = hawk.build_hawk(AM, root)
            eroot, _, fit = engine.build_engine("MW54", EM, parent=root, location=tuple(EF[0]), meta=hawk.engine_meta(model))
            hawk.install_systems(AM, root, {k: (EF[0] + p, n) for k, (p, n) in fit.items()}, lambda m: None)
        else:
            meta = json.load(open(os.path.join(ROOT, "web", name, "parts.json"), encoding="utf8"))
            root = lib.empty(name.upper())
            mod = importlib.import_module(name)
            getattr(mod, f"build_{name}")(mod.materials(), root, meta)
    return root


os.makedirs(OUT, exist_ok=True)
for name in [a for a in sys.argv[1:] if a in NAMES] or list(NAMES):
    sc = bpy.data.scenes.new(name)
    for other in list(bpy.data.scenes):
        if other != sc:
            bpy.data.scenes.remove(other)
    # 1 unidad = 1 mm
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.001
    sc.unit_settings.length_unit = "MILLIMETERS"
    root = build(name, sc)
    obs = [root] + list(root.children_recursive)
    # cada pieza con el nombre que muestra el visor
    for o in obs:
        if o.get("label") and o.type == "MESH":
            o.name = o["label"][:60]
    for o in sc.objects:
        o.select_set(o in obs)
    base = os.path.join(OUT, NAMES[name])
    with bpy.context.temp_override(scene=sc, selected_objects=obs, selected_editable_objects=obs, active_object=root, view_layer=sc.view_layers[0]):
        bpy.ops.export_scene.fbx(filepath=base + ".fbx", use_selection=True, apply_unit_scale=True, global_scale=1.0, apply_scale_options="FBX_SCALE_UNITS",
                                 axis_forward="-Y", axis_up="Z", use_mesh_modifiers=True, mesh_smooth_type="FACE", bake_space_transform=False, add_leaf_bones=False, path_mode="STRIP")
        bpy.ops.wm.obj_export(filepath=base + ".obj", export_selected_objects=True, global_scale=1.0, forward_axis="NEGATIVE_Y", up_axis="Z", export_materials=False, export_uv=False, export_normals=False)
    print(f"{name}: {len([o for o in obs if o.type == 'MESH'])} piezas → {base}.fbx ({os.path.getsize(base + '.fbx') // 1024} KB), .obj ({os.path.getsize(base + '.obj') // 1024} KB)")
