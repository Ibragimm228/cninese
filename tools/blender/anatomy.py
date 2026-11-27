"""Shared anime figure parts: skeleton, head, face drawing, hair, limbs."""
import math

import numpy as np

from lib import (TAU, ball, chain, curve, disc, lin, loft, merge, mirror, mixc, norm, oval, project, rigid, smooth,
                 spline, strip, sweep, transform, tube)

# joint heights of the default build; characters override what they need
BUILD = dict(
    ankle=0.13, knee=0.72, hip=1.33, waist=1.56, chest=1.88, shoulder=2.09, neck=2.2, head=2.68,
    hip_x=0.105, shoulder_x=0.3, arm_tilt=math.radians(13), upper=0.41, fore=0.38, head_scale=1.0,
)


def joints(b):
    """Joint positions for one side (+x); mirror x for the other."""
    t = b['arm_tilt']
    d = np.array([math.sin(t), -math.cos(t), 0])
    sh = np.array([b['shoulder_x'], b['shoulder'], 0.0])
    el = sh + d * b['upper']
    wr = el + d * b['fore'] + np.array([0, 0, 0.015])
    return dict(shoulder=sh, elbow=el, wrist=wr, dir=d,
                hip=np.array([b['hip_x'], b['hip'], 0.0]), knee=np.array([b['hip_x'], b['knee'], 0.005]),
                ankle=np.array([b['hip_x'], b['ankle'], -0.01]))


def skeleton(m, b):
    j = joints(b)
    m.bone('root', (0, 0, 0))
    m.bone('hips', (0, b['hip'], 0), 'root')
    m.bone('spine', (0, b['waist'], 0), 'hips')
    m.bone('chest', (0, b['chest'] - 0.12, 0), 'spine')
    m.bone('neck', (0, b['neck'] - 0.03, 0), 'chest')
    m.bone('head', (0, b['head'] - 0.33 * b['head_scale'], 0.02), 'neck')
    m.bone('eyes', (0, b['head'], 0.2), 'head')
    m.bone('brows', (0, b['head'] + 0.1, 0.2), 'head')
    for s, n in ((1, 'L'), (-1, 'R')):
        f = np.array([s, 1, 1])
        m.bone(f'upperarm_{n}', j['shoulder'] * f, 'chest')
        m.bone(f'forearm_{n}', j['elbow'] * f, f'upperarm_{n}')
        m.bone(f'hand_{n}', j['wrist'] * f, f'forearm_{n}')
        m.bone(f'thigh_{n}', j['hip'] * f, 'hips')
        m.bone(f'shin_{n}', j['knee'] * f, f'thigh_{n}')
        m.bone(f'foot_{n}', j['ankle'] * f, f'shin_{n}')


def torso_skin(b, blend=0.1):
    return chain([('hips', (0, b['hip'] - 0.3, 0)), ('spine', (0, b['waist'], 0)), ('chest', (0, b['chest'] - 0.12, 0)),
                  ('neck', (0, b['neck'] + 0.02, 0)), ('head', (0, b['head'] - 0.33 * b['head_scale'], 0))], blend)


def arm_skin(b, side, blend=0.09):
    j = joints(b)
    f = np.array([side, 1, 1])
    n = 'L' if side > 0 else 'R'
    return chain([(f'upperarm_{n}', j['shoulder'] * f), (f'forearm_{n}', j['elbow'] * f), (f'hand_{n}', j['wrist'] * f)], blend)


def leg_skin(b, side, blend=0.09, top='hips'):
    j = joints(b)
    f = np.array([side, 1, 1])
    n = 'L' if side > 0 else 'R'
    return chain([(top, j['hip'] * f + [0, 0.25, 0]), (f'thigh_{n}', j['hip'] * f + [0, 0.02, 0]), (f'shin_{n}', j['knee'] * f),
                  (f'foot_{n}', j['ankle'] * f + [0, 0.02, 0])], blend)


# ---------------------------------------------------------------- head
HEAD_Y = [-0.36, -0.348, -0.31, -0.24, -0.15, -0.05, 0.06, 0.16, 0.245, 0.31, 0.348, 0.36]
HEAD_W = [0.0, 0.04, 0.118, 0.2, 0.258, 0.29, 0.3, 0.288, 0.248, 0.178, 0.09, 0.0]
HEAD_CZ = [0.18, 0.172, 0.125, 0.065, 0.028, 0.008, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
HEAD_D = [0.0, 0.035, 0.12, 0.208, 0.27, 0.306, 0.322, 0.316, 0.28, 0.206, 0.11, 0.0]
_hw, _hcz, _hd = spline(HEAD_Y, HEAD_W), spline(HEAD_Y, HEAD_CZ), spline(HEAD_Y, HEAD_D)


def head_point(a, y, inflate=0.0):
    """Point on the head (local, unscaled) at angle `a` from the front and height `y`."""
    a, y = np.asarray(a, dtype=float), np.asarray(y, dtype=float)
    w, cz, d = np.maximum(_hw(y), 0) + inflate, _hcz(y), np.maximum(_hd(y), 0) + inflate
    s, c = np.sin(a), np.cos(a)
    # the face is flatter than the back of the skull
    p = np.where(c > 0, 2.0 + 0.55 * smooth(0.2, -0.1, y) * smooth(-0.36, -0.2, y), 2.0)
    x = np.sign(s) * np.abs(s) ** (2 / p) * w
    z = cz + np.sign(c) * np.abs(c) ** (2 / p) * d
    return np.stack([x, y + np.zeros_like(x), z], axis=-1)


def head_shape(n=64, rows=44, nose=0.03):
    ys = -0.36 * np.cos(np.linspace(0.02, 0.98, rows) * math.pi) * (1 - 1e-3)
    a = np.arange(n) / n * TAU
    rings = np.array([head_point(a, y) for y in ys])
    v, f = loft(rings)
    # a small anime nose: a soft point just below the eye line
    front = np.clip(v[:, 2] / 0.3, 0, 1)
    bump = np.exp(-((v[:, 0] / 0.032) ** 2 + ((v[:, 1] + 0.15) / 0.04) ** 2)) * front
    v[:, 2] += bump * nose
    v[:, 1] -= bump * nose * 0.25
    # cheeks swell a little, the eye line sits slightly in
    cheek = np.exp(-(((np.abs(v[:, 0]) - 0.17) / 0.09) ** 2 + ((v[:, 1] + 0.19) / 0.08) ** 2)) * front
    v[:, 2] += cheek * 0.012
    return v, f


def build_head(m, b, skin='skin', ears=True):
    """Adds head, ears and neck. Returns (to_world, tree) for drawing the face."""
    hs = b['head_scale']
    c = np.array([0, b['head'], 0.02])
    to_world = lambda p: np.asarray(p, dtype=float) * hs + c  # noqa: E731
    v, f = head_shape()
    m.add('body', (to_world(v), f), skin, rigid('head'), subdiv=2)
    tree = m.bvh((to_world(v), f), subdiv=2)
    if ears:
        for s in (1, -1):
            ear = ball((0, 0, 0), 1, 20, 12, (0.03, 0.085, 0.055))
            ear = (transform(ear[0], (s * 0.292, -0.075, -0.015), (0.12, s * 0.5, -s * 0.12)), ear[1])
            m.add('body', (to_world(ear[0]), ear[1]), skin, rigid('head'), subdiv=1)
            inner = ball((0, 0, 0), 1, 16, 10, (0.012, 0.055, 0.032))
            inner = (transform(inner[0], (s * 0.312, -0.07, 0.0), (0.12, s * 0.5, -s * 0.12)), inner[1])
            m.add('body', (to_world(inner[0]), inner[1]), 'skin_shade', rigid('head'), subdiv=1)
    neck = tube([((0, b['neck'] - 0.1, -0.015), 0.1, 0.095), ((0, b['neck'] + 0.03, 0.0), 0.085, 0.085),
                 ((0, c[1] - 0.26 * hs, 0.02), 0.082, 0.085), ((0, c[1] - 0.16 * hs, 0.03), 0.08, 0.08)], 24)
    m.add('body', neck, skin, torso_skin(b, 0.05), subdiv=1)
    return to_world, tree


# ---------------------------------------------------------------- face
class Face:
    """Draws flat shapes onto the head, like cel paint on a figure."""

    def __init__(self, m, to_world, tree, hs=1.0):
        self.m, self.to_world, self.tree, self.hs = m, to_world, tree, hs
        m.material('ink', '#ffffff', kind='unlit', outline=False)
        m.material('ink_soft', '#ffffff', kind='unlit', outline=False, alpha=True)

    def put(self, group, shape, color, layer=1, bone='head', mat='ink'):
        v, f = shape
        v = np.asarray(v, dtype=float)
        pts = self.to_world(np.stack([v[:, 0], v[:, 1], np.full(len(v), 1.0)], axis=1))
        pts = project(self.tree, pts, (0, 0, -1), 0.0016 * layer + 0.001)
        col = color if isinstance(color, np.ndarray) and color.ndim == 2 else np.broadcast_to(np.asarray(color, dtype=float), (len(v), 4))
        self.m.add(group, (pts, f), mat, rigid(bone), color=np.array(col), subdiv=0, keep_normals=(0, 0, 1))

    def band(self, group, a, b, color, layer=1, rows=2, **kw):
        self.put(group, strip(_xyz(a), _xyz(b), rows), color, layer, **kw)

    def line(self, group, pts, width, color, layer=1, n=24, taper=(1, 1), **kw):
        """A stroke with tapered ends through 2D control points."""
        p = curve(np.asarray(pts, dtype=float), n)
        t = np.linspace(0, 1, n)
        nrm = norm(np.gradient(p, axis=0)) @ np.array([[0, 1], [-1, 0]])
        w = width / 2 * (1 - (1 - taper[0]) * (1 - smooth(0, 0.35, t))) * (1 - (1 - taper[1]) * smooth(0.65, 1, t))
        self.band(group, p + nrm * w[:, None], p - nrm * w[:, None], color, layer, **kw)


def _xyz(p):
    p = np.asarray(p, dtype=float)
    return np.concatenate([p, np.zeros((len(p), 1))], axis=1) if p.shape[1] == 2 else p


def eye_curves(e, n=40):
    """Upper and lower lid of the left eye in face coordinates; u runs from inner to outer corner."""
    u = np.linspace(-1, 1, n)
    skew = e.get('skew', 0.0)
    uu = np.clip(u - skew * (1 - u ** 2), -1, 1)
    up = e['up'] * (1 - np.abs(uu) ** e.get('pu', 2.2)) ** (1 / e.get('qu', 2.2))
    lo = -e['lo'] * (1 - np.abs(u) ** e.get('pl', 2.4)) ** (1 / e.get('ql', 2.0))
    x = e['x'] + u * e['w'] / 2
    y = e['y'] + e.get('slant', 0.0) * u * e['w'] / 2
    return u, np.stack([x, y + up], axis=1), np.stack([x, y + lo], axis=1)


def draw_eyes(face, e):
    """Whites, irises, lashes, closed and smiling lids for both eyes."""
    n = 40
    u, up, lo = eye_curves(e, n)
    white, shade = lin(e.get('white', '#ffffff')), lin(e.get('white_shade', '#c9cfe6'))
    lash = lin(e.get('lash', '#1b1b26'))
    for s in (1, -1):
        fx = np.array([s, 1])
        # white, shadowed under the upper lid
        rows = 10
        t = np.linspace(0, 1, rows)[:, None, None]
        grid = lo[None] * (1 - t) + up[None] * t
        v, f = loft(_xyz(grid.reshape(-1, 2) * fx).reshape(rows, n, 3), closed=False)
        k = np.repeat(np.linspace(0, 1, rows), n)
        face.put('eyes_open', (v, f), mixc(white, shade, smooth(0.5, 1.0, k)), 1)
        # iris, clipped to the lids
        ir = e['iris']
        cx, cy = e['x'] + ir.get('dx', 0.0), e['y'] + ir.get('dy', 0.0)
        dv, df = disc((0, 0, 0), ir['rx'], ir['ry'], 48, 14)
        r = np.sqrt((dv[:, 0] / ir['rx']) ** 2 + (dv[:, 1] / ir['ry']) ** 2)
        yy = dv[:, 1] / ir['ry']
        top, mid, low = lin(ir['top']), lin(ir['mid']), lin(ir['low'])
        col = mixc(mixc(low, mid, smooth(-0.9, 0.0, yy)), top, smooth(-0.1, 0.9, yy))
        col = mixc(col, lin(ir.get('ring', ir['top'])), smooth(0.82, 0.97, r))
        # a pale crescent at the bottom of the iris
        col = mixc(col, lin(ir.get('glow', ir['low'])), smooth(0.25, 0.75, r) * smooth(-0.15, -0.8, yy) * 0.8)
        px, py = cx + dv[:, 0], cy + dv[:, 1]
        hi = np.interp(px, up[:, 0], up[:, 1])
        lw = np.interp(px, lo[:, 0], lo[:, 1])
        py = np.clip(py, lw, hi)
        px = np.clip(px, up[0, 0], up[-1, 0])
        face.put('iris', (np.stack([px * s, py], axis=1), df), col, 2, bone='eyes')
        # pupil and catchlights
        pu = ir.get('pupil', 0.42)
        pv, pf = disc((0, 0, 0), ir['rx'] * pu, ir['ry'] * pu, 32, 4)
        ppx, ppy = cx + pv[:, 0], np.clip(cy + pv[:, 1] + ir.get('pupil_dy', 0.0), None, np.interp(cx + pv[:, 0], up[:, 0], up[:, 1]))
        face.put('iris', (np.stack([ppx * s, ppy], axis=1), pf), lin(ir.get('pupil_color', '#10121c')), 3, bone='eyes')
        for (hx, hy, hr, hsq) in ir.get('lights', [(-0.38, 0.42, 0.26, 0.8), (0.4, -0.45, 0.12, 1.0)]):
            hv, hf = disc((0, 0, 0), ir['rx'] * hr, ir['ry'] * hr * hsq, 24, 3)
            # catchlights stay on the same side of both eyes, as a single light would leave them
            face.put('iris', (np.stack([cx * s + hx * ir['rx'] + hv[:, 0], cy + hy * ir['ry'] + hv[:, 1]], axis=1), hf), lin('#ffffff'), 4, bone='eyes')
        # upper lash: thicker towards the outer corner, with a wing
        th = e.get('lash_w', 0.016) * (0.5 + 0.5 * ((u + 1) / 2) ** 1.4)
        nrm = norm(np.gradient(up, axis=0)) @ np.array([[0, 1], [-1, 0]])
        face.band('eyes_open', (up - nrm * th[:, None] * 0.25) * fx, (up + nrm * th[:, None]) * fx, lash, 5)
        wing = e.get('wing', (0.03, 0.012))
        tip = up[-1] + np.array([wing[0], wing[1]])
        w0, w1 = up[-6] + nrm[-6] * th[-6], up[-1] - np.array([0.0, th[-1] * 0.6])
        a = curve([w0, up[-1] + nrm[-1] * th[-1], tip], 8)
        bb = curve([up[-6], w1, tip], 8)
        face.band('eyes_open', a * fx, bb * fx, lash, 5)
        for (lu, ll, la) in e.get('lashes', []):
            i = int((lu + 1) / 2 * (n - 1))
            base = up[i] + nrm[i] * th[i] * 0.6
            d = np.array([math.sin(la), math.cos(la)])
            face.line('eyes_open', (np.array([base - d * 0.004, base + d * ll * 0.5, base + d * ll]) * fx), th[i] * 1.1, lash, 5, n=8, taper=(1, 0.05))
        # lid crease
        if e.get('crease', True):
            cr = up + nrm * (th[:, None] + e.get('crease_gap', 0.014))
            face.line('eyes_open', cr[6:-3] * fx, 0.0045, lin(e.get('crease_color', '#c98f7c')), 4, n=20, taper=(0.1, 0.1))
        # lower lash line
        if e.get('lower', 0.5) > 0:
            i0 = int(n * (1 - e.get('lower', 0.5)))
            face.line('eyes_open', lo[i0:] * fx, e.get('lower_w', 0.005), lash, 5, n=16, taper=(0.05, 0.6))
        # closed and smiling lids
        mid = (up + lo) / 2
        sag = (1 - u ** 2) * e['lo'] * 0.45
        closed = np.stack([mid[:, 0], mid[:, 1] - sag - e['lo'] * 0.2], axis=1)
        face.line('eyes_closed', closed * fx, e.get('lash_w', 0.016) * 1.1, lash, 5, n=24, taper=(0.35, 0.8))
        happy = np.stack([mid[:, 0], mid[:, 1] + (1 - u ** 2) * e['up'] * 0.55 - e['up'] * 0.1], axis=1)
        face.line('eyes_happy', happy * fx, e.get('lash_w', 0.016) * 1.2, lash, 5, n=24, taper=(0.35, 0.6))


def draw_brows(face, e, br):
    for s in (1, -1):
        x0, x1 = e['x'] - br['len'] * br.get('inner', 0.5), e['x'] + br['len'] * (1 - br.get('inner', 0.5))
        y = e['y'] + e['up'] + br['gap']
        pts = np.array([[x0, y + br.get('in_y', 0.0)], [(x0 + x1) / 2, y + br.get('arch', 0.012)], [x1, y + br.get('out_y', 0.0)]])
        face.line('brows', pts * np.array([s, 1]), br['w'], lin(br['color']), 6, n=20, taper=br.get('taper', (0.7, 0.15)), bone='brows')


def draw_mouth(face, mo):
    y, w = mo['y'], mo['w']
    c = lin(mo.get('color', '#8a3d3a'))
    bend = mo.get('bend', 0.006)
    face.line('mouth_rest', np.array([[-w / 2, y + bend], [0, y - bend], [w / 2, y + bend]]), mo.get('line', 0.0075), c, 2, n=20, taper=(0.2, 0.2))
    # open mouth: a soft D with a tongue
    ow, oh = mo.get('open_w', w * 1.25), mo.get('open_h', 0.06)
    u = np.linspace(-1, 1, 24)
    top = np.stack([u * ow / 2, y + 0.012 + 0 * u - np.abs(u) ** 3 * 0.004], axis=1)
    bot = np.stack([u * ow / 2, y + 0.012 - oh * (1 - np.abs(u) ** 2.4) ** 0.6], axis=1)
    face.band('mouth_open', top, bot, lin(mo.get('inside', '#7a2430')), 2, rows=5)
    tongue = np.stack([u * ow / 3.2, y + 0.012 - oh * (1 - np.abs(u) ** 2.4) ** 0.6 * 0.93], axis=1)
    tongue_top = np.stack([u * ow / 3.2, y + 0.012 - oh * 0.45 - (1 - u ** 2) * -0.012], axis=1)
    face.band('mouth_open', tongue_top, tongue, lin(mo.get('tongue', '#f08a8f')), 3, rows=3)


def draw_nose(face, y=-0.165, color='#d99a84', w=0.012):
    face.line('face', np.array([[0.004, y + 0.012], [0.01, y], [0.0, y - 0.004]]), w * 0.45, lin(color), 1, n=10, taper=(0.1, 0.4))


def draw_blush(face, x, y, rx, ry, color='#ff8f9c', strength=0.55, lines=0):
    for s in (1, -1):
        v, f = disc((s * x, y, 0), rx, ry, 28, 6)
        r = np.sqrt(((v[:, 0] - s * x) / rx) ** 2 + ((v[:, 1] - y) / ry) ** 2)
        col = np.tile(lin(color), (len(v), 1))
        col[:, 3] = (1 - smooth(0.15, 1.0, r)) * strength
        face.put('face', (v[:, :2], f), col, 1, mat='ink_soft')
        for k in range(lines):
            ox = (k - (lines - 1) / 2) * rx * 0.42
            face.line('face', np.array([[s * x + ox - 0.008, y - ry * 0.4], [s * x + ox + 0.008, y + ry * 0.4]]), 0.005, lin(color, 1.0), 2, n=6, taper=(0.3, 0.3))


# ---------------------------------------------------------------- hair
def shell(to_world, yaw, pitch, r):
    """Point `r` skull-radii out from the head centre; yaw 0 is the face, +yaw the character's left."""
    y, p = np.radians(yaw), np.radians(pitch)
    return to_world(np.stack([0.3 * np.sin(y) * np.cos(p) * r, 0.352 * np.sin(p) * r, 0.322 * np.cos(y) * np.cos(p) * r], axis=-1))


def lock(m, group, to_world, pts, width, thick=0.035, mat='hair', bone='head', n=18, k=12, root=0.55, tip_p=1.6,
         colors=None, twist=0.0, belly=0.22, subdiv=1, raw=False, skin=None):
    """One clump of anime hair: a lens-shaped ribbon that ends in a point."""
    ctrl = np.asarray(pts, dtype=float)
    path = curve(ctrl if raw else shell(to_world, ctrl[:, 0], ctrl[:, 1], ctrl[:, 2]), n)
    centre = to_world(np.array([0, 0.02, 0]))
    out = norm(path[0] - centre)
    t = np.linspace(0, 1, n)
    w = width * (root + (1 - root) * np.sin(np.clip(t / 0.35, 0, 1) * math.pi / 2)) * (1 - t ** tip_p) ** 0.8
    w = np.maximum(w, width * 0.02)
    th = thick * (0.6 + 0.4 * np.sin(np.clip(t / 0.3, 0, 1) * math.pi / 2)) * (1 - t ** 2.2) ** 0.7 + 0.002
    a = np.arange(k) / k * TAU

    def section(i, _t):
        s, c = np.sin(a), np.cos(a)
        # outer face rounded with a soft ridge, inner face flatter
        return np.stack([c * w[i] / 2, np.where(s > 0, s * th[i], s * th[i] * belly)], axis=1)

    tang = norm(np.gradient(path, axis=0))
    side = np.cross(tang[0], out)
    rings = sweep(path, section, ref=side, twist=(lambda q: twist * q) if twist else None)
    v, f = loft(rings)
    col = None
    if colors:
        root_c, tip_c = lin(colors[0]), lin(colors[1])
        tt = np.concatenate([np.repeat(t, k), [0, 1]])
        col = mixc(root_c, tip_c, smooth(0.1, 1.0, tt))
    m.add(group, (v, f), mat, skin or rigid(bone), color=col, subdiv=subdiv)
    return path


def scalp(m, to_world, hairline, mat='hair', inflate=0.022, n=56, rows=14, color=None, group='hair'):
    """Hair-coloured cap under the locks; `hairline(a)` gives the lowest height at each angle."""
    a = np.arange(n) / n * TAU
    low = np.array([hairline(x) for x in a])
    rings = []
    for s in np.linspace(0, 1, rows):
        y = low + (0.352 - low) * (1 - (1 - s) ** 1.35)
        y = np.minimum(y, 0.3585)
        from_centre = np.array([head_point(a[j], y[j], inflate) for j in range(n)])
        rings.append(from_centre + np.array([0, inflate * smooth(0.0, 0.36, y)[0] * 0, 0]))
    v, f = loft(np.array(rings), True, (False, True))
    v[-1] = [0, 0.36 + inflate, 0]
    m.add(group, (to_world(v), f), mat, rigid('head'), color=color, subdiv=1)


# ---------------------------------------------------------------- limbs
def arm(m, b, side, skin='skin', group='body', r=(0.078, 0.066, 0.06, 0.047), shoulder=1.0):
    """Bare arm from shoulder to wrist."""
    j = joints(b)
    f = np.array([side, 1, 1])
    sh, el, wr, d = j['shoulder'] * f, j['elbow'] * f, j['wrist'] * f, j['dir'] * f
    st = [(sh - d * 0.07, r[0] * 0.55 * shoulder, r[0] * 0.55 * shoulder), (sh - d * 0.02, r[0] * 1.08 * shoulder, r[0] * 1.1 * shoulder),
          (sh + d * 0.09, r[0] * 1.04, r[0] * 1.06), (sh + d * 0.25, r[1] * 1.05, r[1] * 1.08), (el - d * 0.03, r[1] * 0.93, r[1]),
          (el + d * 0.08, r[2] * 1.08, r[2] * 1.12), (el + d * 0.2, r[2], r[2] * 1.02), (wr - d * 0.05, r[3] * 1.02, r[3]), (wr + d * 0.02, r[3] * 0.92, r[3] * 0.8)]
    m.add(group, tube(st, 24, 30), skin, arm_skin(b, side), subdiv=2)


def finger(base, d, inward, length, r, curl, spread=0.0, n=10, k=12, side_axis=None):
    """A finger from `base` along `d`, curling towards `inward`. Returns a shape."""
    d, inward = norm(d), norm(inward)
    seg = np.array([0.42, 0.31, 0.27]) * length
    pts = [np.asarray(base, dtype=float)]
    ang = spread
    axis = side_axis if side_axis is not None else np.cross(d, inward)
    for i, s in enumerate(seg):
        ang_i = curl * (0.6 if i == 0 else 1.0) * (i + 1)
        dirv = d * math.cos(ang_i) + inward * math.sin(ang_i)
        if ang:
            dirv = dirv * math.cos(ang) + axis * math.sin(ang)
        pts.append(pts[-1] + norm(dirv) * s)
    path = curve(pts, n)
    t = np.linspace(0, 1, n)
    rad = r * (1 - 0.22 * t) * (1 - smooth(0.86, 1.0, t) * 0.55)
    rings = sweep(path, lambda i, _t: oval(rad[i], rad[i] * 0.92, k), ref=axis)
    v, f = loft(rings)
    v[-1] = path[-1] + norm(path[-1] - path[-2]) * rad[-1] * 0.6
    return v, f


def hand(m, b, side, pose='relaxed', skin='skin', group='body', scale=1.0, nails=True):
    """Hand on the wrist. Poses: relaxed, open, fist, point, grip."""
    j = joints(b)
    n = 'L' if side > 0 else 'R'
    curls = dict(relaxed=[0.26, 0.3, 0.34, 0.4], open=[0.05, 0.04, 0.05, 0.08], fist=[0.95, 0.98, 1.0, 1.02],
                 point=[-0.02, 0.95, 1.0, 1.02], grip=[0.72, 0.76, 0.8, 0.84])[pose]
    thumb_curl = dict(relaxed=0.2, open=0.05, fist=0.55, point=0.6, grip=0.5)[pose]
    # canonical left hand: fingers down (-y), thumb forward (+z), palm facing the body (-x)
    d, inward, fwd = np.array([0, -1.0, 0]), np.array([-1.0, 0, 0]), np.array([0, 0, 1.0])
    palm = tube([((0, 0.02, 0), 0.03, 0.042), ((0, -0.03, 0.002), 0.027, 0.056), ((0, -0.085, 0.004), 0.026, 0.064),
                 ((0, -0.128, 0.004), 0.022, 0.06), ((0, -0.142, 0.004), 0.012, 0.05)], 20, 12, ref=(1, 0, 0), p=2.6)
    shapes = [palm]
    lengths = [0.108, 0.118, 0.11, 0.09]
    for i in range(4):
        z = 0.046 - i * 0.0285
        base = np.array([-0.002, -0.128 + abs(i - 1.2) * -0.0 - (0.006 if i == 3 else 0), z + 0.004])
        shapes.append(finger(base, d, inward, lengths[i], 0.0145 - (0.0015 if i == 3 else 0), curls[i], spread=(1.5 - i) * 0.07 * (0.3 if pose in ('fist', 'grip') else 1), side_axis=fwd))
        if nails:
            pass
    tb = np.array([-0.006, -0.045, 0.05])
    td = norm(np.array([-0.25, -0.62, 0.72]))
    shapes.append(finger(tb, td, norm(np.array([-0.8, -0.2, -0.55])), 0.1, 0.0165, thumb_curl, side_axis=np.cross(td, [1, 0, 0])))
    # thumb base pad
    shapes.append(ball((-0.012, -0.05, 0.036), 1, 14, 8, (0.02, 0.04, 0.026)))
    v, f = merge(*shapes)
    v = v * scale
    if side < 0:
        v, f = mirror((v, f))
    v = transform(v, j['wrist'] * np.array([side, 1, 1]), (0, 0, side * b['arm_tilt']))
    m.add(group, (v, f), skin, rigid(f'hand_{n}'), subdiv=2)


def leg(m, b, side, mat='skin', group='body', r=(0.118, 0.1, 0.073, 0.08, 0.05), top=None, bottom=None, subdiv=2):
    """Leg from hip to ankle; `top`/`bottom` trim it (heights) for shorts or socks."""
    j = joints(b)
    x = j['hip'][0] * side
    st = [(b['hip'] + 0.04, r[0] * 0.9, r[0] * 0.95), (b['hip'] - 0.1, r[0], r[0] * 1.02), (b['hip'] - 0.32, r[1], r[1] * 1.03),
          (b['knee'] + 0.04, r[2] * 1.06, r[2] * 1.08), (b['knee'] - 0.06, r[2], r[2] * 1.02), (b['knee'] - 0.22, r[3], r[3] * 1.08),
          (b['ankle'] + 0.16, r[4] * 1.18, r[4] * 1.22), (b['ankle'] + 0.03, r[4], r[4] * 1.04), (b['ankle'] - 0.04, r[4] * 0.96, r[4])]
    ys = np.array([s[0] for s in st])
    rad = spline(-ys, np.array([[s[1], s[2]] for s in st]))
    y0, y1 = top if top is not None else ys[0], bottom if bottom is not None else ys[-1]
    yy = np.linspace(y0, y1, 26)
    zz = np.interp(yy, [b['ankle'], b['knee'], b['hip']], [-0.012, 0.006, 0.0]) - 0.012 * np.exp(-((yy - (b['knee'] - 0.2)) / 0.14) ** 2)
    rr = rad(-yy)
    rings = np.array([np.column_stack([x + o[:, 0], np.full(24, yy[i]), zz[i] + o[:, 1]]) for i, o in enumerate(oval(rr[i, 0], rr[i, 1], 24) for i in range(len(yy)))])
    m.add(group, loft(rings[::-1]), mat, leg_skin(b, side), subdiv=subdiv)
    return rad


def shoe_shape(length=0.33, width=0.1, height=0.15, heel=-0.11, n=28, rows=22, toe_h=0.5, inflate=0.0, y0=0.0, top=1.0):
    """Sneaker-like last: flat sole, raised ankle, rounded toe. Local to the ankle's ground point."""
    z = heel + length * (0.5 - 0.5 * np.cos(np.linspace(0.04, 0.96, rows) * math.pi))
    t = (z - heel) / length
    w = width * spline([0, 0.08, 0.3, 0.62, 0.86, 1.0], [0.3, 0.72, 0.84, 1.0, 0.82, 0.25])(t) + inflate
    h = height * spline([0, 0.1, 0.34, 0.52, 0.8, 1.0], [0.55, 0.95, 1.0, 0.72, toe_h, toe_h * 0.45])(t) * top + inflate
    a = np.arange(n) / n * TAU
    rings = []
    for i in range(rows):
        s, c = np.sin(a), np.cos(a)
        x = np.sign(s) * np.abs(s) ** (2 / 2.6) * w[i]
        y = y0 + h[i] / 2 + np.sign(c) * np.abs(c) ** np.where(c < 0, 2 / 4.0, 2 / 2.3) * h[i] / 2
        rings.append(np.stack([x, y, np.full(n, z[i])], axis=1))
    return loft(np.array(rings))
