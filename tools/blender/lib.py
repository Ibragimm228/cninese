"""Procedural character kit for Blender. Run through tools/blender/build.py.

Authoring space matches the web runtime: x = character's left, y = up, z = forward.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

TAU = math.pi * 2


# ---------------------------------------------------------------- maths
def lin(hex_color, a=1.0):
    h = hex_color.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return np.array(c + [a])


def mixc(a, b, k):
    k = np.asarray(k, dtype=float)[..., None]
    return a * (1 - k) + b * k


def smooth(e0, e1, x):
    t = np.clip((np.asarray(x, dtype=float) - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def norm(v):
    v = np.asarray(v, dtype=float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.where(n < 1e-9, 1, n)


def spline(xs, ys):
    """Smooth 1D interpolation through (xs, ys); ys may be vectors."""
    xs = np.asarray(xs, dtype=float)
    ys = np.asarray(ys, dtype=float)
    m = np.gradient(ys, xs, axis=0)

    def f(x):
        x = np.clip(np.asarray(x, dtype=float), xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, x, side='right') - 1, 0, len(xs) - 2)
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        if ys.ndim > 1:
            t = t[..., None]
            h = h[..., None]
        return ((2 * t ** 3 - 3 * t ** 2 + 1) * ys[i] + (t ** 3 - 2 * t ** 2 + t) * h * m[i]
                + (-2 * t ** 3 + 3 * t ** 2) * ys[i + 1] + (t ** 3 - t ** 2) * h * m[i + 1])
    return f


def curve(points, n):
    """n points along a smooth curve through the control points."""
    pts = np.asarray(points, dtype=float)
    if len(pts) == 2:
        return pts[0] + (pts[1] - pts[0]) * np.linspace(0, 1, n)[:, None]
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    u = np.concatenate([[0], np.cumsum(np.sqrt(np.maximum(seg, 1e-9)))])
    return spline(u / u[-1], pts)(np.linspace(0, 1, n))


def resample(path, n):
    """Re-space a polyline evenly by arc length."""
    path = np.asarray(path, dtype=float)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, path[:, k]) for k in range(path.shape[1])], axis=1)


# ---------------------------------------------------------------- geometry
def loft(rings, closed=True, caps=(True, True)):
    """Quad surface through rows of points. Returns (verts, faces, (row, col) per vertex)."""
    rings = np.asarray(rings, dtype=float)
    m, n, _ = rings.shape
    verts = rings.reshape(-1, 3)
    faces = []
    cols = n if closed else n - 1
    for i in range(m - 1):
        for j in range(cols):
            a, b = i * n + j, i * n + (j + 1) % n
            faces.append((a, b, b + n, a + n))
    extra = []
    if closed:
        for end, on in ((0, caps[0]), (m - 1, caps[1])):
            if not on:
                continue
            c = len(verts) + len(extra)
            extra.append(rings[end].mean(axis=0))
            for j in range(n):
                a, b = end * n + j, end * n + (j + 1) % n
                faces.append((c, b, a) if end == 0 else (c, a, b))
    if extra:
        verts = np.vstack([verts, np.array(extra)])
    return verts, faces


def frames(path, ref):
    """Tangent and two normals along a path; `ref` seeds the first side vector."""
    path = np.asarray(path, dtype=float)
    t = norm(np.gradient(path, axis=0))
    side = np.zeros_like(path)
    r = np.asarray(ref, dtype=float)
    for i in range(len(path)):
        r = r - t[i] * np.dot(r, t[i])
        if np.linalg.norm(r) < 1e-6:
            r = np.cross(t[i], [0.3, 0.9, 0.2])
        r = norm(r)
        side[i] = r
    return t, side, np.cross(side, t)


def sweep(path, section, ref=(1, 0, 0), twist=None):
    """Rings of `section(i, t)` (k×2 offsets) carried along a path. Returns rings (m, k, 3)."""
    path = np.asarray(path, dtype=float)
    _, sx, sz = frames(path, ref)
    rings = []
    m = len(path)
    for i in range(m):
        s = np.asarray(section(i, i / (m - 1)), dtype=float)
        x, z = sx[i], sz[i]
        if twist is not None:
            a = twist(i / (m - 1))
            x, z = x * math.cos(a) + z * math.sin(a), z * math.cos(a) - x * math.sin(a)
        rings.append(path[i] + s[:, :1] * x + s[:, 1:] * z)
    return np.array(rings)


def oval(rx, rz, n=24, p=2.0, pz=None):
    """Superellipse outline, starting at +z (front) and going towards +x."""
    a = np.arange(n) / n * TAU
    s, c = np.sin(a), np.cos(a)
    pz = pz or p
    return np.stack([np.sign(s) * np.abs(s) ** (2 / p) * rx, np.sign(c) * np.abs(c) ** (2 / pz) * rz], axis=1)


def tube(stations, n=24, rings=None, ref=(1, 0, 0), p=2.0, caps=(True, True)):
    """A limb or garment: stations are (position, rx, rz[, power]) blended smoothly."""
    pos = np.array([s[0] for s in stations], dtype=float)
    rad = np.array([[s[1], s[2], s[3] if len(s) > 3 else p] for s in stations], dtype=float)
    m = rings or len(stations) * 3
    seg = np.linalg.norm(np.diff(pos, axis=0), axis=1)
    u = np.concatenate([[0], np.cumsum(seg)]) / seg.sum()
    t = np.linspace(0, 1, m)
    path = spline(u, pos)(t)
    r = spline(u, rad)(t)
    rr = sweep(path, lambda i, _t: oval(max(r[i, 0], 1e-4), max(r[i, 1], 1e-4), n, max(r[i, 2], 1.2)), ref)
    return loft(rr, True, caps)


def ball(center, r, n=24, m=16, squash=(1, 1, 1)):
    v = np.linspace(0, 1, m + 2)[1:-1]
    rings = []
    for t in v:
        y = -math.cos(t * math.pi)
        rad = math.sin(t * math.pi)
        o = oval(rad, rad, n)
        rings.append(np.stack([o[:, 0], np.full(n, y), o[:, 1]], axis=1))
    verts, faces = loft(np.array(rings))
    # pull the cap centres out to the poles
    verts[-2] = [0, -1, 0]
    verts[-1] = [0, 1, 0]
    return verts * r * np.asarray(squash) + np.asarray(center), faces


def strip(a, b, rows=2):
    """Open grid between two matching curves."""
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    t = np.linspace(0, 1, rows)[:, None, None]
    return loft(a[None] * (1 - t) + b[None] * t, closed=False)


def disc(center, rx, ry, n=40, rings=8, rot=0.0):
    """Flat polar grid in the xy plane (z = center z)."""
    cx, cy, cz = center
    out = []
    for k in range(rings, 0, -1):
        a = np.arange(n) / n * TAU
        x, y = np.cos(a) * rx * k / rings, np.sin(a) * ry * k / rings
        out.append(np.stack([cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot), np.full(n, cz)], axis=1))
    return loft(np.array(out), True, (False, True))


def transform(verts, pos=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    """Scale, rotate (XYZ euler, radians) then move."""
    v = np.asarray(verts, dtype=float) * np.asarray(scale, dtype=float)
    rx, ry, rz = rot
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    mx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    my = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    mz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return v @ (mz @ my @ mx).T + np.asarray(pos, dtype=float)


def merge(*shapes):
    verts, faces, off = [], [], 0
    for v, f in shapes:
        verts.append(np.asarray(v, dtype=float))
        faces += [tuple(i + off for i in face) for face in f]
        off += len(v)
    return np.vstack(verts), faces


def mirror(shape):
    v, f = shape
    return v * np.array([-1, 1, 1]), [tuple(reversed(face)) for face in f]


# ---------------------------------------------------------------- skinning
def rigid(bone):
    return lambda p: {bone: np.ones(len(p))}


def chain(joints, blend=0.12):
    """Weights along a chain: joints are (bone, position); each bone owns the span after its joint."""
    names = [j[0] for j in joints]
    pos = [np.asarray(j[1], dtype=float) for j in joints]
    dirs = []
    for i in range(len(pos)):
        a = pos[i] - pos[i - 1] if i > 0 else pos[1] - pos[0]
        b = pos[i + 1] - pos[i] if i + 1 < len(pos) else a
        dirs.append(norm(norm(a) + norm(b)))

    def f(p):
        enter = [np.ones(len(p))] + [smooth(-blend, blend, (p - pos[i]) @ dirs[i]) for i in range(1, len(pos))]
        out = {}
        for i, name in enumerate(names):
            w = enter[i] * (1 - enter[i + 1]) if i + 1 < len(names) else enter[i]
            for k in range(1, i):
                w = w * enter[k]
            out[name] = out.get(name, 0) + w
        return out
    return f


# ---------------------------------------------------------------- model
class Model:
    def __init__(self, name, lod=0):
        self.name = name
        self.lod = lod
        self.bones = {}
        self.parts = []
        self.materials = {}
        for o in list(bpy.data.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        for block in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures):
            for b in list(block):
                block.remove(b)

    def bone(self, name, pos, parent=None):
        self.bones[name] = (np.asarray(pos, dtype=float), parent)

    def material(self, name, color, kind='toon', outline=True, shade=None, alpha=False, gloss=0.0):
        if name in self.materials:
            return name
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = lin(color)
        bsdf.inputs['Roughness'].default_value = 0.8
        if alpha:
            m.blend_method = 'BLEND'
        m['kind'] = kind
        m['outline'] = 1 if outline else 0
        m['gloss'] = gloss
        if shade:
            m['shade'] = shade
        self.materials[name] = m
        return name

    def add(self, group, shape, mat, skin, color=None, subdiv=1, smooth_shade=True, keep_normals=None):
        """color: None, an (N, 4) per-vertex array or a function of positions returning one."""
        verts, faces = shape
        self.parts.append(dict(group=group, verts=np.asarray(verts, dtype=float), faces=faces, mat=mat, skin=skin,
                               color=color, subdiv=subdiv, smooth=smooth_shade, face_dir=keep_normals))

    # -- build
    def _mesh(self, part, index):
        me = bpy.data.meshes.new(f'{part["group"]}_{index}')
        v = part['verts']
        me.from_pydata([(p[0], -p[2], p[1]) for p in v], [], part['faces'])
        me.update()
        pre = part['color'] if isinstance(part['color'], np.ndarray) else None
        attr = me.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
        base = np.ones((len(v), 4)) if pre is None else np.broadcast_to(pre, (len(v), 4))
        attr.data.foreach_set('color', np.ascontiguousarray(base, dtype=np.float32).reshape(-1))
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(me.name, me)
        bpy.context.scene.collection.objects.link(obj)
        levels = max(0, part['subdiv'] - self.lod)
        if levels:
            mod = obj.modifiers.new('sub', 'SUBSURF')
            mod.levels = levels
            mod.render_levels = levels
            mod.boundary_smooth = 'PRESERVE_CORNERS'
            dg = bpy.context.evaluated_depsgraph_get()
            done = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
            obj.modifiers.clear()
            obj.data = done
            bpy.data.meshes.remove(me)
            me = done
        n = len(me.vertices)
        co = np.zeros(n * 3)
        me.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        p = np.stack([co[:, 0], co[:, 2], -co[:, 1]], axis=1)
        # make open sheets face the requested way
        if part['face_dir'] is not None:
            me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
            nrm = np.zeros(len(me.polygons) * 3)
            me.polygons.foreach_get('normal', nrm)
            nrm = nrm.reshape(-1, 3)
            d = np.asarray(part['face_dir'], dtype=float)
            if (nrm @ np.array([d[0], -d[2], d[1]])).mean() < 0:
                me.flip_normals()
        attr = me.color_attributes['Color']
        if callable(part['color']):
            col = np.broadcast_to(np.asarray(part['color'](p), dtype=np.float32), (n, 4))
            attr.data.foreach_set('color', np.ascontiguousarray(col).reshape(-1))
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = 0
        for poly in me.polygons:
            poly.use_smooth = part['smooth']
        me.materials.append(self.materials[part['mat']])
        weights = part['skin'](p)
        total = sum(np.asarray(w, dtype=float) * np.ones(n) for w in weights.values())
        for bone, w in weights.items():
            w = np.asarray(w, dtype=float) * np.ones(n) / np.maximum(total, 1e-9)
            g = obj.vertex_groups.new(name=bone)
            idx = np.nonzero(w > 1e-3)[0]
            for i in idx:
                g.add([int(i)], float(w[i]), 'REPLACE')
        return obj, p

    def bvh(self, shape, subdiv=0):
        """Ray-castable copy of a shape (in authoring space)."""
        verts, faces = shape
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in verts]
        for f in faces:
            bm.faces.new([vs[i] for i in f])
        bm.normal_update()
        if subdiv:
            me = bpy.data.meshes.new('tmp')
            bm.to_mesh(me)
            o = bpy.data.objects.new('tmp', me)
            bpy.context.scene.collection.objects.link(o)
            mod = o.modifiers.new('s', 'SUBSURF')
            mod.levels = subdiv
            dg = bpy.context.evaluated_depsgraph_get()
            bm.free()
            bm = bmesh.new()
            bm.from_mesh(o.evaluated_get(dg).data)
            bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.meshes.remove(me)
        tree = BVHTree.FromBMesh(bm)
        bm.free()
        return tree

    def build(self, path):
        arm = bpy.data.armatures.new('rig')
        rig = bpy.data.objects.new('rig', arm)
        bpy.context.scene.collection.objects.link(rig)
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode='EDIT')
        made = {}
        for name, (pos, parent) in self.bones.items():
            b = arm.edit_bones.new(name)
            b.head = (pos[0], -pos[2], pos[1])
            b.tail = (pos[0], -pos[2], pos[1] + 0.08)
            b.roll = 0
            if parent:
                b.parent = made[parent]
            made[name] = b
        bpy.ops.object.mode_set(mode='OBJECT')

        groups = {}
        tris = 0
        for i, part in enumerate(self.parts):
            obj, _ = self._mesh(part, i)
            groups.setdefault(part['group'], []).append(obj)
        for name, objs in groups.items():
            if len(objs) > 1:
                with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
                    bpy.ops.object.join()
            o = objs[0]
            o.name = name
            o.data.name = name
            o.parent = rig
            mod = o.modifiers.new('rig', 'ARMATURE')
            mod.object = rig
            o.data.calc_loop_triangles()
            tris += len(o.data.loop_triangles)
        bpy.ops.export_scene.gltf(
            filepath=path, export_format='GLB', export_yup=True, export_apply=False, export_skins=True,
            export_animations=False, export_extras=True, export_normals=True, export_texcoords=False,
            export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_materials='EXPORT',
            export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
            export_draco_position_quantization=14, export_draco_normal_quantization=10,
            export_draco_color_quantization=10, export_draco_generic_quantization=12,
            export_influence_nb=4, export_all_influences=False, export_def_bones=False,
        )
        return tris


def project(tree, pts, direction=(0, 0, -1), lift=0.002, origin_shift=2.0):
    """Drop points onto a surface along `direction`, then lift them back towards the viewer."""
    d = Vector(direction).normalized()
    out = []
    for p in np.asarray(pts, dtype=float):
        o = Vector(p) - d * origin_shift
        hit, _n, _i, _dist = tree.ray_cast(o, d)
        if hit is None:
            hit = tree.find_nearest(Vector(p))[0]
        out.append(np.array(hit) - np.array(d) * lift)
    return np.array(out)
