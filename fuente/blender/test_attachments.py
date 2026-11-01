"""Prueba de anclajes con pivotes desplazados y piel fija intacta."""
import os
import sys
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from attachments import surface_link, hinge_pins
from lib import box, empty

bpy.ops.wm.read_factory_settings(use_empty=True)
root = empty('avion')
moving = box('mando', (10, 0, 0), (4, 4, 4))
fixed = box('estructura', (10, 20, 0), (10, 2, 10))
moving.parent = fixed.parent = root
moving.data.transform(Matrix.Translation((-10, 0, 0)))
moving.location = (10, 0, 0)
moving['part'] = 'mando'
moving['hinge'] = [0.0, 1.0, 0.0]
moving['explode'] = [0.0, 0.0, 30.0]
before = moving.matrix_basis.copy()
surface_link(moving, fixed, (10, 1, 0), (0, 1, 0), 30, 1, None)
assert moving.parent == root
assert moving.matrix_basis == before
assert list(moving['hinge']) == [0, 1, 0]
assert list(moving['explode']) == [0, 0, 30]
verts = [moving.matrix_basis @ v.co for v in moving.data.vertices]
assert max(v.y for v in verts) >= 19
assert min(v.x for v in verts) == 8
fixed_verts = [v.co.copy() for v in fixed.data.vertices]
hinge_pins(moving, fixed, (10, 0, 0), (10, 20, 0), 1, 3, None)
assert all(a == b.co for a, b in zip(fixed_verts, fixed.data.vertices))
assert len(fixed_verts) == len(fixed.data.vertices)
assert moving.matrix_basis == before
assert moving['joint_host'] == fixed.name
print('PASS: anclajes conectados, pivote y metadatos conservados, piel fija intacta')
