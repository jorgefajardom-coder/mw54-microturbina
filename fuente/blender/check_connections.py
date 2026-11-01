"""Busca piezas separadas en el GLB armado, agrupando cada motor completo.

Blender --background --python check_connections.py -- [hawk f14 f22 sr71 sr72] [--strict]
Las distancias son entre superficies, no sólo entre cajas envolventes.
El informe señala holguras; no convierte una cercanía en prueba de sujeción.
"""
import json
import os
import sys
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
names = [n for n in args if n in ('hawk', 'f14', 'f22', 'sr71', 'sr72')]


def scan(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = 'mw54.glb' if name == 'hawk' else f'{name}/{name}.glb'
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'fuente', 'web', path))
    bpy.context.view_layer.update()
    groups = {}
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH':
            continue
        owner, parent = None, ob
        while parent is not None:
            if parent.get('part'):
                owner = parent
            parent = parent.parent
        if owner is not None:
            groups.setdefault(owner.name, []).append(ob)
    data = {}
    for key, meshes in groups.items():
        verts, faces = [], []
        for ob in meshes:
            start = len(verts)
            verts.extend((ob.matrix_world @ v.co) * 1000 for v in ob.data.vertices)
            faces.extend(tuple(start + i for i in f.vertices) for f in ob.data.polygons)
        if faces:
            lo = Vector(tuple(min(v[i] for v in verts) for i in range(3)))
            hi = Vector(tuple(max(v[i] for v in verts) for i in range(3)))
            data[key] = (verts, BVHTree.FromPolygons(verts, faces), lo, hi)
    nearest = {k: (float('inf'), None) for k in data}
    tolerance = 1.0  # mm: admite una junta o un cojinete, no un hueco visible
    edges = {k: set() for k in data}
    keys = list(data)
    for i, a in enumerate(keys):
        va, ta, la, ha = data[a]
        for b in keys[i + 1:]:
            vb, tb, lb, hb = data[b]
            lower = sum(max(la[k]-hb[k], lb[k]-ha[k], 0)**2 for k in range(3))**0.5
            if lower > tolerance and lower >= max(nearest[a][0], nearest[b][0]):
                continue
            if ta.overlap(tb):
                gap = 0.0
            else:
                gap = min(min(tb.find_nearest(v)[3] for v in va),
                          min(ta.find_nearest(v)[3] for v in vb))
            if gap < nearest[a][0]:
                nearest[a] = (gap, b)
            if gap < nearest[b][0]:
                nearest[b] = (gap, a)
            if gap <= tolerance:
                edges[a].add(b)
                edges[b].add(a)
    anchor = next(k for k in data if k.startswith('fuselaje.'))
    connected, pending = set(), [anchor]
    while pending:
        key = pending.pop()
        if key not in connected:
            connected.add(key)
            pending.extend(edges[key] - connected)
    result = {'model': name, 'nearest': [
        {'part': k, 'to': other, 'gap_mm': round(gap, 3)}
        for k, (gap, other) in sorted(nearest.items(), key=lambda item: -item[1][0])],
        'tolerance_mm': tolerance, 'disconnected': sorted(set(data) - connected)}
    out = os.path.join(ROOT, 'tmp', 'revision')
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, name + '-connections.json'), 'w', encoding='utf8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    threshold = tolerance
    print('CONNECTIONS', json.dumps({'model': name, 'gaps': [r for r in result['nearest']
          if r['gap_mm'] > threshold], 'disconnected': result['disconnected']}, ensure_ascii=False), flush=True)
    return not result['disconnected'] and all(gap <= tolerance for gap, _ in nearest.values())


results = [scan(name) for name in names or ['hawk', 'f14', 'f22', 'sr71', 'sr72']]
if '--strict' in args and not all(results):
    raise AssertionError('Hay piezas sin conexión al fuselaje dentro de la tolerancia de 1 mm')
