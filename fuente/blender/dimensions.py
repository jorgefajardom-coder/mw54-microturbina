"""Restricciones dimensionales públicas; no sustituyen los contornos de planos.

F-14D: NAVAIR 01-F14AAD-1, Aircraft Characteristics and Limitations.
F-22: USAF, F-22 Raptor Fact Sheet.
https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104506/f-22-raptor/
"""
from mathutils import Vector

F14_LENGTH = (62 * 12 + 8.5) * 25.4
F22_LENGTH = (62 * 12 + 1) * 25.4


def fit_forebody_length(parts, target, seam):
    """Ajuste provisional de longitud, limitado al fuselaje delantero.

    Mantiene intactos el ala, su flecha, la cola y la instalación del motor.
    La unión `seam` permanece fija: sólo cambia X por delante de ella.
    El tren se traslada rígidamente. No se dejan escalas no uniformes en
    objetos articulados ni se cambian las rutas de despiece. Este ajuste
    cumple la cota general, pero no certifica los perfiles de las secciones.
    """
    if not parts or any(ob.type != 'MESH' for ob in parts):
        raise ValueError('Se requieren las mallas de la célula')
    if len({ob.parent for ob in parts}) != 1:
        raise ValueError('Las piezas deben compartir el marco del avión')
    poses = {ob: ob.matrix_basis.copy() for ob in parts}
    xs = [(poses[ob] @ v.co).x for ob in parts for v in ob.data.vertices]
    length = max(xs) - min(xs)
    if target <= 0 or length <= 0:
        raise ValueError('La longitud debe ser positiva')
    if not min(xs) < seam < max(xs) or target <= seam - min(xs):
        raise ValueError('La cota debe dejar longitud positiva delante de la unión')
    factor = (min(xs) + target - seam) / (max(xs) - seam)

    def deform(point):
        result = point.copy()
        if result.x > seam:
            result.x = seam + (result.x - seam) * factor
        return result

    for ob in parts:
        old = poses[ob]
        if all((old @ vertex.co).x <= seam for vertex in ob.data.vertices):
            continue
        new = old.copy()
        rigid = ob.name.startswith('tren.') or ob.name == 'gancho'
        # Los objetos rígidos pueden tener su origen en cero aun cuando su
        # geometría esté lejos del origen: trasladar su centro geométrico.
        if rigid:
            center = sum((old @ v.co for v in ob.data.vertices), Vector()) / len(ob.data.vertices)
            new.translation += deform(center) - center
        else:
            new.translation = deform(old.translation)
            inverse = new.inverted()
            for vertex in ob.data.vertices:
                vertex.co = inverse @ deform(old @ vertex.co)
            ob.data.update()
        ob.matrix_basis = new
        if not rigid and 'hinge' in ob and old.translation.x > seam:
            axis = Vector(ob['hinge'])
            axis.x *= factor
            ob['hinge'] = list(axis.normalized())
    return factor
