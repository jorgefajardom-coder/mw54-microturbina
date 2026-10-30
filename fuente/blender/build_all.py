# Construye el avión con sus dos MW54 en la escena "MW54" y, si se pide, va guardando capturas de la ventana
# para un time-lapse. Se ejecuta dentro de Blender (complemento MCP o `blender -P`).
import bpy
import sys
import os
import json
import importlib

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"C:\Users\J.A.F.M\Desktop\Github profile\mw54-anatomy\blender"
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import lib, engine, hawk  # noqa: E402
for m in (lib, engine, hawk):
    importlib.reload(m)


def run(frames_dir=None, caption=None):
    sc = bpy.data.scenes.get("MW54") or bpy.data.scenes.new("MW54")
    for o in list(sc.objects):
        if o.name != "MW54Cam":
            bpy.data.objects.remove(o, do_unlink=True)
    win = bpy.context.window_manager.windows[0]
    win.scene = sc
    lib._mats.clear()
    model = json.load(open(os.path.join(HERE, "model.json"), encoding="utf8"))
    meta = {k: {**v, "move": [model["MOVES"].get(k, [0, 0, 0])[0], 0, 0]} for k, v in model["PARTS"].items()}
    shots = [0]

    def log(msg):
        if caption:
            caption(msg)
        if not frames_dir:
            return
        for a in win.screen.areas:
            a.tag_redraw()
        bpy.ops.wm.redraw_timer(type="DRAW_WIN_SWAP", iterations=1)
        path = os.path.join(frames_dir, f"{shots[0]:04d}.png")
        with bpy.context.temp_override(window=win):
            bpy.ops.screen.screenshot(filepath=path)
        shots[0] += 1

    with bpy.context.temp_override(window=win, scene=sc):
        root = lib.empty("Avion_MW54")
        AM = hawk.materials()
        EM = engine.materials()
        parts, EF = hawk.build_hawk(AM, root, log)
        eroot, eparts, fit = engine.build_engine("MW54", EM, parent=root, location=tuple(EF[0]), meta=meta)
        lib.tag(eroot, part="MW54", group="engine", order=40, explode=[0, 0, 300], label="Wren MW54", system="engines")
        log("MW54 instalada en el fuselaje")
        world_fit = {k: (EF[0] + p, n) for k, (p, n) in fit.items()}
        parts += hawk.install_systems(AM, root, world_fit, log)
        root.scale = (0.001, 0.001, 0.001)
    return {"parts": len(parts), "objects": len(sc.objects), "shots": shots[0]}


def export(path=None):
    """GLB con la jerarquía (avión → piezas, motores → piezas), sus extras y compresión Draco."""
    sc = bpy.data.scenes["MW54"]
    win = bpy.context.window_manager.windows[0]
    root = bpy.data.objects["Avion_MW54"]
    obs = [root] + list(root.children_recursive)
    path = path or os.path.join(os.path.dirname(HERE), "web", "mw54.glb")
    # nada seleccionado en otras escenas (el cubo de la escena de inicio se colaba en el GLB)
    for other in bpy.data.scenes:
        for vl in other.view_layers:
            for o in other.objects:
                o.select_set(other == sc and o in obs, view_layer=vl)
    with bpy.context.temp_override(window=win, scene=sc, selected_objects=obs, selected_editable_objects=obs, active_object=root):
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_extras=True, export_apply=True, export_yup=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_image_format="WEBP", export_image_quality=90, export_cameras=False, export_lights=False)
    return {"path": path, "bytes": os.path.getsize(path)}
