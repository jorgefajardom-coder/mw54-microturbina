# Construye el avión con sus MW54 y exporta web/mw54.glb sin abrir Blender (bpy como módulo: pip install bpy).
# Uso: python blender/build_headless.py [salida.glb]
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engine  # noqa: E402
import hawk  # noqa: E402
import lib  # noqa: E402

out = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].endswith(".glb") else os.path.join(os.path.dirname(HERE), "web", "mw54.glb")
sc = bpy.data.scenes.new("MW54")
for other in list(bpy.data.scenes):
    if other != sc:
        bpy.data.scenes.remove(other)
model = json.load(open(os.path.join(HERE, "model.json"), encoding="utf8"))
meta = hawk.engine_meta(model)
with bpy.context.temp_override(scene=sc):
    root = lib.empty("Avion_MW54")
    AM, EM = hawk.materials(), engine.materials()
    parts, EF = hawk.build_hawk(AM, root)
    eroot, eparts, fit = engine.build_engine("MW54", EM, parent=root, location=tuple(EF[0]), meta=meta)
    lib.tag(eroot, part="MW54", group="engine", order=40, explode=[0, 0, 300], label="Wren MW54", system="engines")
    parts += hawk.install_systems(AM, root, {k: (EF[0] + p, n) for k, (p, n) in fit.items()}, lambda m: None)
    root.scale = (0.001, 0.001, 0.001)
    obs = [root] + list(root.children_recursive)
    for o in sc.objects:
        o.select_set(o in obs)
    with bpy.context.temp_override(scene=sc, selected_objects=obs, selected_editable_objects=obs, active_object=root):
        bpy.ops.export_scene.gltf(filepath=out + ".tmp.glb", export_format="GLB", use_selection=True, export_extras=True, export_apply=True, export_yup=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                                  export_image_format="WEBP", export_image_quality=90, export_cameras=False, export_lights=False)
os.replace(out + ".tmp.glb", out)
print(f"{len(parts)} piezas → {out} ({os.path.getsize(out)} bytes)")
