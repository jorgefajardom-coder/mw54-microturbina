"""Read-only assembly bounds from glTF accessor boxes and scene transforms.

These are conservative bounds, not decoded-vertex measurements: rotating a
local accessor box can overestimate the actual mesh envelope.
"""
import itertools
import json
import struct
import sys
from pathlib import Path
import numpy as np


def transform(node):
    if 'matrix' in node:
        return np.array(node['matrix']).reshape(4, 4).T
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    r = np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)],
    ])
    out = np.eye(4)
    out[:3, :3] = r @ np.diag(node.get('scale', [1, 1, 1]))
    out[:3, 3] = node.get('translation', [0, 0, 0])
    return out


for path in sys.argv[1:] or ['mw54.glb', 'f14/f14.glb', 'f22/f22.glb',
                            'sr71/sr71.glb', 'sr72/sr72.glb']:
    with Path(path).open('rb') as f:
        f.read(12)
        size, kind = struct.unpack('<II', f.read(8))
        assert kind == 0x4E4F534A
        data = json.loads(f.read(size))
    boxes = []
    owners = []

    def visit(index, parent):
        node = data['nodes'][index]
        world = parent @ transform(node)
        if 'mesh' in node:
            for primitive in data['meshes'][node['mesh']]['primitives']:
                a = data['accessors'][primitive['attributes']['POSITION']]
                corners = np.array([list(p)+[1] for p in
                                    itertools.product(*zip(a['min'], a['max']))])
                boxes.append((world @ corners.T).T[:, :3])
                owners.append(node.get('name', str(index)))
        for child in node.get('children', []):
            visit(child, world)

    for root in data['scenes'][data.get('scene', 0)]['nodes']:
        visit(root, np.eye(4))
    points = np.concatenate(boxes)
    dims = points.max(axis=0)-points.min(axis=0)
    x_min_owner = owners[int(np.argmin([b[:, 0].min() for b in boxes]))]
    x_max_owner = owners[int(np.argmax([b[:, 0].max() for b in boxes]))]
    print(json.dumps({'model': path, 'length_m': round(float(dims[0]), 6),
                      'height_m': round(float(dims[1]), 6),
                      'span_m': round(float(dims[2]), 6),
                      'length_extremes': [x_min_owner, x_max_owner]}))
