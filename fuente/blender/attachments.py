"""Herrajes ilustrativos que cierran huecos de montaje sin mover las piezas.

Se integran en la malla de su pieza: siguen su despiece y, en los mandos,
comparten el eje de la bisagra. No son cotas de fabricación verificadas.
"""
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from lib import cylinder_between, join


def add_to(owner, geometry):
    bpy.context.view_layer.update()
    return join(owner.name, [owner] + geometry, owner.parent)


def surface_link(owner, target, start, direction, reach, radius, material):
    """Tirante desde un anclaje hasta una superficie real del soporte."""
    start, direction = Vector(start), Vector(direction).normalized()
    verts = [target.matrix_basis @ v.co for v in target.data.vertices]
    tree = BVHTree.FromPolygons(verts, [tuple(f.vertices) for f in target.data.polygons])
    hit = tree.ray_cast(start, direction, reach)[0]
    if hit is None:
        raise ValueError(f'No hay superficie de apoyo: {owner.name} → {target.name}')
    # Solape de asiento pequeño para que el exportador no abra una junta.
    seat = min(radius * 0.1, 0.5)
    return add_to(owner, [cylinder_between(owner.name + '.anclaje', start,
                  hit + direction * seat, radius, material, steps=16)])


def hinge_pins(moving, fixed, p0, p1, radius, width, material):
    """Dos bulones coaxiales integrados en la superficie móvil.

    La piel fija puede ser una superficie abierta: no se le aplica una
    resta booleana, que eliminaría caras de todo el panel.
    """
    p0, p1 = Vector(p0), Vector(p1)
    axis = (p1 - p0).normalized()
    verts = [moving.matrix_basis @ v.co for v in moving.data.vertices]
    tree = BVHTree.FromPolygons(verts, [tuple(f.vertices) for f in moving.data.polygons])
    pins = []
    for t in (0.22, 0.78):
        center = p0.lerp(p1, t)
        contact = tree.find_nearest(center)[0]
        delta = contact - center
        axial = delta.dot(axis)
        # El bulón debe alcanzar también el mando, no sólo el ala fija.
        # De otro modo quedaría una malla flotante dentro de la misma pieza.
        fitted_radius = max(radius, (delta - axis * axial).length + 1.0)
        fitted_width = max(width, 2 * abs(axial) + 2.0)
        a, b = center - axis * fitted_width / 2, center + axis * fitted_width / 2
        pins.append(cylinder_between(moving.name + '.bulon', a, b, fitted_radius, material, steps=20))
    moving['joint_host'] = fixed.name
    return add_to(moving, pins)
