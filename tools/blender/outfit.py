"""Clothing helpers shared by the cast: lofted garments, piping, decals, fur."""
import math

import numpy as np

from lib import TAU, ball, lin, loft, merge, norm, oval, smooth, spline


def pipe(path, r, k=8, closed=True):
    """Round cord along a path; closed paths join up, open ones are capped."""
    path = np.asarray(path, dtype=float)
    t = norm(np.roll(path, -1, axis=0) - np.roll(path, 1, axis=0) if closed else np.gradient(path, axis=0))
    out = norm(path - path.mean(axis=0))
    side = norm(np.cross(t, out))
    out = norm(np.cross(side, t))
    a = np.arange(k) / k * TAU
    rings = path[:, None, :] + r * (np.cos(a)[None, :, None] * out[:, None, :] + np.sin(a)[None, :, None] * side[:, None, :])
    if closed:
        rings = np.concatenate([rings, rings[:1]])
    return loft(rings, True, (not closed, not closed))


def box(c, size, tilt=0.0):
    """Slab centred on c; `tilt` leans it about the y axis."""
    v = np.array([[x, y, z] for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], dtype=float) * np.asarray(size) / 2
    co, si = math.cos(tilt), math.sin(tilt)
    v = np.stack([v[:, 0] * co + v[:, 2] * si, v[:, 1], v[:, 2] * co - v[:, 0] * si], axis=1) + np.asarray(c)
    return v, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]


def flat(color):
    c = lin(color)
    return lambda p: np.tile(c, (len(p), 1))


def with_sway(skin, bone, y_hi, y_lo):
    """Hands the lower part of a hips-weighted garment to a sway bone so it trails behind jumps and turns."""
    def f(p):
        w = dict(skin(p))
        k = smooth(y_lo, y_hi, p[:, 1])
        hips = w['hips'] + np.zeros(len(p))
        w['hips'], w[bone] = hips * k, hips * (1 - k)
        return w
    return f


def tufts(path, r, seed=1, squash=(1, 0.8, 1)):
    """Fur: a row of overlapping puffs."""
    rnd = np.random.RandomState(seed)
    return merge(*[ball(p + rnd.uniform(-0.2, 0.2, 3) * r, r * rnd.uniform(0.85, 1.2), 12, 7, squash) for p in np.asarray(path)])


class Body:
    """A garment described by its cross-section at a few heights: (y, half-width, half-depth, centre z)."""

    def __init__(self, stations, p=2.0):
        st = np.asarray(sorted(stations), dtype=float)
        self.f = spline(st[:, 0], st[:, 1:])
        self.y0, self.y1, self.p = st[0, 0], st[-1, 0], p

    def add(self, m, mat, skin, y0=None, y1=None, color=None, n=56, rows=36, caps=(True, False), subdiv=2, ripple=None,
            inflate=0.0, group='body'):
        y0, y1 = self.y0 if y0 is None else y0, self.y1 if y1 is None else y1
        a = np.arange(n) / n * TAU
        rings = []
        for y in np.linspace(y0, y1, rows):
            rx, rz, cz = self.f(y)
            o = oval(rx + inflate, rz + inflate, n, self.p)
            if ripple:
                # pleats that deepen towards the hem
                o = o * (1 + ripple[1] * (y1 - y) / (y1 - y0) * np.cos(ripple[0] * a))[:, None]
            rings.append(np.column_stack([o[:, 0], np.full(n, y), cz + o[:, 1]]))
        m.add(group, loft(np.array(rings), True, caps), mat, skin, color=color, subdiv=subdiv)

    def z(self, x, y, sign=1, off=0.006):
        rx, rz, cz = self.f(np.clip(y, self.y0, self.y1)).T
        return cz + sign * (rz * (1 - np.clip(np.abs(x) / rx, 0, 1) ** self.p) ** (1 / self.p) + off)

    def decal(self, m, x0, x1, y0, y1, mat, skin, sign=1, off=0.006, nx=6, ny=10, group='body', color=None):
        xs, ys = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y0, y1, ny))
        rows = np.stack([xs, ys, self.z(xs.ravel(), ys.ravel(), sign, off).reshape(xs.shape)], axis=-1)
        m.add(group, loft(rows[::-1], closed=False), mat, skin, color=color, subdiv=0)

    def loop(self, y, n=48, inflate=0.0, dip=None):
        """Closed path around the garment at height y; `dip(a)` lowers it by angle (0 = front)."""
        a = np.linspace(0, TAU, n, endpoint=False)
        yy = y - (dip(a) if dip else 0 * a)
        rx, rz, cz = self.f(np.clip(yy, self.y0, self.y1)).T
        s, c = np.sin(a), np.cos(a)
        e = 2 / self.p
        return np.stack([np.sign(s) * np.abs(s) ** e * (rx + inflate), yy, cz + np.sign(c) * np.abs(c) ** e * (rz + inflate)], axis=1)


def back_hair(m, A, to_world, rnd, dark, base, n=14, low=-30, drop=26, kick=1.1, width=0.2):
    """Lower layer of clumps around the sides and back, down to the nape."""
    for i, yaw in enumerate(np.linspace(62, 298, n)):
        back = max(0.0, -math.cos(math.radians(yaw)))
        end = low - drop * back + rnd.uniform(-5, 5)
        A.lock(m, 'hair', to_world, [(yaw, 52, 1.1), (yaw, 20, 1.15), (yaw + rnd.uniform(-5, 5), -10, 1.13),
                                     (yaw + rnd.uniform(-8, 8), end, kick + (0.12 if i % 3 == 0 else 0.03) * (kick > 1.05))],
               width, 0.045, colors=(dark, base), n=20)
