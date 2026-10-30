# Construye uno de los aviones a escala real y exporta web/<avión>/<avión>.glb sin abrir Blender (bpy como módulo).
# Uso: python blender/build_jet.py sr72|f22|sr71|f14
import importlib
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402

name = next((a for a in sys.argv[1:] if a in ("sr72", "f22", "sr71", "f14")), "sr72")
mod = importlib.import_module(name)
ROOT = os.path.dirname(HERE)
out = os.path.join(ROOT, "web", name, f"{name}.glb")
meta = json.load(open(os.path.join(ROOT, "web", name, "parts.json"), encoding="utf8"))
sc = bpy.data.scenes.new(name.upper())
for other in list(bpy.data.scenes):
    if other != sc:
        bpy.data.scenes.remove(other)
with bpy.context.temp_override(scene=sc):
    root = lib.empty(name.upper())
    M = mod.materials()
    parts, eng = getattr(mod, f"build_{name}")(M, root, meta)
    root.scale = (0.001, 0.001, 0.001)
    obs = [root] + list(root.children_recursive)
    for o in sc.objects:
        o.select_set(o in obs)
    with bpy.context.temp_override(scene=sc, selected_objects=obs, selected_editable_objects=obs, active_object=root):
        bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_extras=True, export_apply=True, export_yup=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                                  export_image_format="WEBP", export_image_quality=90, export_cameras=False, export_lights=False)
print(f"{name}: {len(parts)} piezas de célula, {sum(len(p) for _, p in eng.values())} de motor → {out} ({os.path.getsize(out)} bytes)")
