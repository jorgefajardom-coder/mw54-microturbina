# Construye el SR-72 con sus dos TBCC y exporta web/sr72/sr72.glb sin abrir Blender (bpy como módulo).
# Uso: python blender/build_sr72.py [salida.glb]
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402
import sr72  # noqa: E402

ROOT = os.path.dirname(HERE)
out = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].endswith(".glb") else os.path.join(ROOT, "web", "sr72", "sr72.glb")
meta = json.load(open(os.path.join(ROOT, "web", "sr72", "parts.json"), encoding="utf8"))
sc = bpy.data.scenes.new("SR72")
for other in list(bpy.data.scenes):
    if other != sc:
        bpy.data.scenes.remove(other)
with bpy.context.temp_override(scene=sc):
    root = lib.empty("SR72")
    M = sr72.materials()
    parts, eng = sr72.build_sr72(M, root, meta)
    root.scale = (0.001, 0.001, 0.001)
    obs = [root] + list(root.children_recursive)
    for o in sc.objects:
        o.select_set(o in obs)
    with bpy.context.temp_override(scene=sc, selected_objects=obs, selected_editable_objects=obs, active_object=root):
        bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_extras=True, export_apply=True, export_yup=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                                  export_image_format="WEBP", export_image_quality=90, export_cameras=False, export_lights=False)
print(f"{len(parts)} piezas de célula, {sum(len(p) for _, p in eng.values())} de motor → {out} ({os.path.getsize(out)} bytes)")
