"""Prueba con Blender: --background --python-exit-code 1 --python este_archivo."""
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dimensions import fit_forebody_length


def mesh(name, root, coords):
    data = bpy.data.meshes.new(name)
    data.from_pydata(coords, [], [])
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)
root = bpy.data.objects.new('airframe', None)
bpy.context.scene.collection.objects.link(root)
skin = mesh('skin', root, [(-10, -3, -2), (10, 3, 2)])
skin['explode'] = [4, 6, 8]
skin['via'] = [2, 3, 4]
skin['hinge'] = [0, 1, 0]
# Una pieza articulada con pivote y rotación inicial no nulos.
flap = mesh('flap', root, [(-1, -1, 0), (1, 1, 0)])
flap.matrix_basis = Matrix.Translation((2, 1, 0)) @ Matrix.Rotation(0.2, 4, 'Z')
old_flap = [flap.matrix_basis @ v.co for v in flap.data.vertices]
# Tren con origen cero y centro geométrico separado: no ovalar la rueda.
gear = mesh('tren.morro', root, [(3, -1, -1), (5, 1, 1)])
old_gear = [gear.matrix_basis @ v.co for v in gear.data.vertices]
factor = fit_forebody_length([skin, flap, gear], 30, seam=0)
assert abs(factor - 2) < 1e-6
for before, vertex in zip(old_flap, flap.data.vertices):
    expected = Vector((before.x * 2, before.y, before.z))
    assert ((flap.matrix_basis @ vertex.co) - expected).length < 1e-5
new_gear = [gear.matrix_basis @ v.co for v in gear.data.vertices]
assert abs((new_gear[1] - new_gear[0]).length - (old_gear[1] - old_gear[0]).length) < 1e-5
assert abs(sum(v.x for v in new_gear) / 2 - 8) < 1e-5
assert list(skin['explode']) == [4, 6, 8]
assert list(skin['via']) == [2, 3, 4]
assert list(skin['hinge']) == [0, 1, 0]
assert (skin.matrix_basis @ skin.data.vertices[0].co - Vector((-10, -3, -2))).length < 1e-5
points = [ob.matrix_basis @ v.co for ob in [skin, flap, gear] for v in ob.data.vertices]
assert abs(max(p.x for p in points) - min(p.x for p in points) - 30) < 1e-5
assert abs(max(p.y for p in points) - min(p.y for p in points) - 6) < 1e-5
assert abs(max(p.z for p in points) - min(p.z for p in points) - 4) < 1e-5
print('PASS: longitud, pivote, rotación, tren rígido y rutas de despiece')
