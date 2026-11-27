"""Tetsuya Kuroko — Seirin #11."""
import math

import numpy as np

import anatomy as A
from outfit import pipe
from lib import Model, ball, chain, curve, lin, loft, merge, mixc, norm, oval, rigid, smooth, spline, sweep, transform, tube

SKIN, SKIN_SHADE = '#ffe3d2', '#f2b9a4'
HAIR, HAIR_TIP, HAIR_DARK = '#8fd0f2', '#bfe8fb', '#5fa9d6'


def build(lod=0):
    m = Model('kuroko', lod)
    b = dict(A.BUILD)
    A.skeleton(m, b)
    m.material('skin', SKIN, shade=SKIN_SHADE)
    m.material('skin_shade', SKIN_SHADE)
    m.material('hair', '#ffffff', shade=HAIR_DARK, gloss=0.6)
    to_world, tree = A.build_head(m, b)
    face = A.Face(m, to_world, tree)
    eye = dict(x=0.128, y=-0.055, w=0.142, up=0.07, lo=0.058, pu=2.3, qu=2.0, pl=2.2, ql=1.9, skew=0.05, slant=-0.02,
               lash='#27425e', lash_w=0.017, wing=(0.016, -0.004), lower=0.45, crease_color='#e0a590',
               iris=dict(rx=0.05, ry=0.06, dy=0.004, top='#2f6fb5', mid='#5fb4ee', low='#bdeaff', ring='#1f4f8c', glow='#e2f7ff', pupil=0.4, pupil_color='#163a66'))
    A.draw_eyes(face, eye)
    A.draw_brows(face, eye, dict(len=0.11, gap=0.045, w=0.012, color='#6aa9cf', arch=0.004, in_y=-0.004, out_y=-0.006))
    A.draw_mouth(face, dict(y=-0.243, w=0.05, bend=0.001, color='#a8584f'))
    A.draw_nose(face)
    hair(m, to_world)
    m.material('jersey', '#ffffff', shade='#c9cfe6')
    m.material('black', '#23232b')
    m.material('red', '#e0303a')
    m.material('sole', '#2b6fd0')
    m.material('print', '#1d1d24', kind='unlit', outline=False)
    m.material('ball', '#f08a2c', shade='#b85a1c')
    j = A.joints(b)
    for s in (1, -1):
        n = 'L' if s > 0 else 'R'
        f = np.array([s, 1, 1])
        A.arm(m, b, s)
        A.hand(m, b, s, 'point' if s < 0 else 'relaxed')
        A.leg(m, b, s, top=0.95, bottom=b['ankle'] + 0.2)
        A.leg(m, b, s, mat='jersey', r=(0.118, 0.1, 0.073, 0.086, 0.058), top=b['ankle'] + 0.27, bottom=b['ankle'] - 0.02)
        shoe(m, b, s)
        wr, d = j['wrist'] * f, j['dir'] * f
        m.add('body', tube([(wr - d * 0.085, 0.05, 0.05), (wr - d * 0.075, 0.057, 0.057), (wr - d * 0.02, 0.055, 0.055), (wr - d * 0.01, 0.047, 0.047)], 24, 8), 'black', rigid(f'forearm_{n}'))
        # armhole piping
        sh = j['shoulder'] * f
        a = np.linspace(0, math.tau, 40, endpoint=False)
        ring = sh + np.stack([s * (-0.03 - 0.035 * np.cos(a)), -0.035 + 0.082 * np.cos(a), 0.088 * np.sin(a)], axis=1)
        m.add('body', pipe(ring, 0.014), 'black', rigid('chest'))
    uniform(m, b)
    basketball(m, b)
    return m


TY = [1.2, 1.33, 1.56, 1.88, 2.02, 2.09, 2.15, 2.2]
TORSO = spline(TY, np.array([[0.222, 0.158, 0.0], [0.215, 0.155, 0.0], [0.19, 0.13, 0.0], [0.228, 0.148, 0.006], [0.25, 0.136, 0.0],
                             [0.262, 0.118, -0.004], [0.2, 0.1, -0.008], [0.118, 0.094, -0.01]]))


def front(x, y, sign=1, off=0.006):
    rx, rz, cz = TORSO(y).T
    return cz + sign * (rz * np.sqrt(np.clip(1 - (x / rx) ** 2, 0, 1)) + off)


def decal(m, x0, x1, y0, y1, mat, sign=1, skin=None, off=0.006, nx=6, ny=10):
    xs, ys = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y0, y1, ny))
    rows = np.stack([xs, ys, front(xs.ravel(), ys.ravel(), sign, off).reshape(xs.shape)], axis=-1)
    if sign < 0:
        rows = rows[:, ::-1]
    m.add('body', loft(rows[::-1], closed=False), mat, skin, subdiv=0)


def uniform(m, b):
    n = 56
    ys = np.concatenate([np.linspace(1.2, 2.0, 30), np.linspace(2.02, 2.2, 12)])
    rings = []
    for y in ys:
        rx, rz, cz = TORSO(y)
        o = oval(rx, rz, n)
        rings.append(np.column_stack([o[:, 0], np.full(n, y), cz + o[:, 1]]))
    skin = A.torso_skin(b)

    def paint(p):
        c = np.tile(lin('#ffffff'), (len(p), 1))
        rx = TORSO(np.clip(p[:, 1], 1.2, 2.2))[:, 0]
        side = (np.abs(p[:, 0]) > rx * 0.9) & (p[:, 1] < 1.93)
        c[side] = lin('#23232b')
        c[(np.abs(p[:, 0]) > rx * 0.83) & ~side & (p[:, 1] < 1.95)] = lin('#e0303a')
        c[p[:, 1] < 1.225] = lin('#23232b')
        return c
    m.add('body', loft(np.array(rings), True, (True, False)), 'jersey', skin, color=paint, subdiv=2)
    # V collar
    a = np.linspace(0, math.tau, 48, endpoint=False)
    dip = 0.085 * np.clip(np.cos(a), 0, 1) ** 3
    col = np.stack([0.122 * np.sin(a), 2.195 - dip, -0.01 + 0.1 * np.cos(a) + dip * 0.42], axis=1)
    m.add('body', pipe(col, 0.016), 'black', skin)
    m.add('body', pipe(col + [0, -0.024, 0.006], 0.009), 'red', skin)
    # number 11, front and back
    for sign, (y0, y1), w in ((1, (1.62, 1.84), 0.036), (-1, (1.6, 1.9), 0.046)):
        for x in (-0.055, 0.055):
            decal(m, x - w / 2, x + w / 2, y0, y1, 'print', sign, skin)
            decal(m, x - w / 2 - 0.03 * sign, x - w / 2 + 0.004, y1 - 0.045, y1, 'print', sign, skin)
    # team name
    for i, x in enumerate(np.linspace(-0.11, 0.11, 6)):
        decal(m, x - 0.014, x + 0.014, 1.9, 1.935, 'print', 1, skin, nx=3, ny=3)

    # shorts
    def trim(p):
        c = np.tile(lin('#ffffff'), (len(p), 1))
        c[(np.abs(p[:, 0]) > 0.215) & (np.abs(p[:, 2]) < 0.05)] = lin('#23232b')
        c[p[:, 1] < 0.865] = lin('#23232b')
        c[(p[:, 1] >= 0.865) & (p[:, 1] < 0.885)] = lin('#e0303a')
        return c
    rings = []
    for y in np.linspace(1.5, 1.14, 12):
        k = (1.5 - y) / 0.36
        o = oval(0.2 + 0.05 * k, 0.14 + 0.03 * k, n)
        rings.append(np.column_stack([o[:, 0], np.full(n, y), o[:, 1]]))
    m.add('body', loft(np.array(rings)), 'jersey', chain([('hips', (0, 1.0, 0)), ('spine', (0, b['waist'], 0))], 0.1), color=trim, subdiv=1)
    for s in (1, -1):
        rings = []
        for y in np.linspace(1.3, 0.84, 16):
            k = (1.3 - y) / 0.46
            o = oval(0.128 + 0.022 * k, 0.15 + 0.022 * k, 32)
            rings.append(np.column_stack([s * (0.118 + 0.022 * k) + o[:, 0], np.full(32, y), 0.004 * k + o[:, 1]]))
        v, f = loft(np.array(rings), True, (True, False))
        # the hem hangs open: add an inner wall so it is not see-through
        inner = np.array(rings[::-1][:3]) * [0.94, 1, 0.94] + [s * 0.008, 0.0, 0]
        m.add('body', (v, f), 'jersey', A.leg_skin(b, s, 0.14), color=trim, subdiv=1)
        m.add('body', loft(inner, True, (False, True)), 'black', A.leg_skin(b, s, 0.14), subdiv=0)


def shoe(m, b, s):
    j = A.joints(b)
    n = 'L' if s > 0 else 'R'
    at = np.array([s * j['ankle'][0], 0.0, j['ankle'][2]])
    skin = rigid(f'foot_{n}')
    yaw = (0, s * 0.14, 0)

    def paint(p):
        c = np.tile(lin('#ffffff'), (len(p), 1))
        q = p - at
        c[(q[:, 2] > 0.02) & (q[:, 2] < 0.1) & (q[:, 1] > 0.035) & (q[:, 1] < 0.1) & (np.abs(q[:, 0]) > 0.05)] = lin('#2b6fd0')
        c[(q[:, 2] < -0.075) & (q[:, 1] > 0.05)] = lin('#2b6fd0')
        return c
    v, f = A.shoe_shape(0.36, 0.105, 0.2, -0.12, y0=0.02)
    m.add('body', (transform(v, at, yaw), f), 'jersey', skin, color=paint, subdiv=2)
    v, f = A.shoe_shape(0.37, 0.105, 0.2, -0.125, inflate=0.008, top=0.2)
    m.add('body', (transform(v, at, yaw), f), 'black', skin, subdiv=1)
    v, f = A.shoe_shape(0.372, 0.105, 0.2, -0.126, inflate=0.011, top=0.07)
    m.add('body', (transform(v, at, yaw), f), 'sole', skin, subdiv=1)
    # cuff and laces
    a = np.linspace(0, math.tau, 28, endpoint=False)
    cuff = np.stack([0.07 * np.sin(a), 0.2 + 0.012 * np.cos(a), -0.02 + 0.085 * np.cos(a)], axis=1)
    m.add('body', pipe(transform(cuff, at, yaw), 0.013), 'black', skin)
    for i in range(4):
        z, y = 0.055 + i * 0.03, 0.172 - i * 0.021
        bar = np.array([[-0.034, y - 0.012, z], [-0.017, y, z], [0.0, y + 0.004, z], [0.017, y, z], [0.034, y - 0.012, z]])
        m.add('body', pipe(transform(bar, at, yaw), 0.0075, 6, False), 'black', skin)


def basketball(m, b):
    j = A.joints(b)
    r = 0.2
    tip = transform(np.array([[0.002, -0.24, 0.05]]), j['wrist'] * [-1, 1, 1], (0, 0, -b['arm_tilt']))[0]
    c = tip + j['dir'] * [-1, 1, 1] * r * 0.98
    m.bone('prop', c, 'hand_R')
    skin = rigid('prop')
    m.add('prop', ball(c, r, 48, 32), 'ball', skin, subdiv=1)
    a = np.linspace(0, math.tau, 72, endpoint=False)
    co, si = np.cos(a) * r * 1.004, np.sin(a) * r * 1.004
    z = np.zeros_like(a)
    seams = [np.stack([co, z, si], axis=1), np.stack([z, co, si], axis=1)]
    for sx in (1, -1):
        bend = 0.62 + 0.2 * np.cos(2 * a)
        p = np.stack([sx * bend, np.cos(a), np.sin(a)], axis=1)
        seams.append(norm(p) * r * 1.004)
    for p in seams:
        m.add('prop', pipe_on_ball(p, c), 'print', skin, subdiv=0)


def pipe_on_ball(p, c, w=0.007):
    t = norm(np.roll(p, -1, axis=0) - np.roll(p, 1, axis=0))
    out = norm(p)
    side = norm(np.cross(t, out))
    rows = np.stack([p - side * w + c, p + out * 0.003 + c, p + side * w + c])
    rows = np.concatenate([rows, rows[:, :1]], axis=1)
    return loft(rows, closed=False)


def hair(m, to_world):
    rnd = np.random.RandomState(7)
    A.scalp(m, to_world, lambda a: 0.2 - 0.33 * smooth(0.5, 1.6, abs(math.remainder(a, math.tau))), color=lin(HAIR))
    cols = (HAIR, HAIR_TIP)
    # fringe: jagged spikes over the forehead, the longest between the eyes
    for yaw, tip, wd in [(-58, 6, 0.15), (-44, 14, 0.14), (-30, 4, 0.15), (-15, 12, 0.13), (-2, -6, 0.15), (13, 9, 0.13), (27, 2, 0.15), (41, 13, 0.14), (56, 5, 0.15)]:
        A.lock(m, 'hair', to_world, [(yaw * 0.5, 74, 1.06), (yaw * 0.8, 52, 1.13), (yaw, 30, 1.13), (yaw + rnd.uniform(-5, 5), tip, 1.09)], wd, 0.04, colors=cols)
    # crown: long clumps that fall in every direction and kick out at the tips
    for i, yaw in enumerate(np.linspace(-180, 180, 17)[:-1] + 11):
        front_k = max(0.0, math.cos(math.radians(yaw)))
        low = 34 - 44 * (1 - front_k) + rnd.uniform(-6, 6)
        kick = 1.2 + 0.1 * (i % 2) + rnd.uniform(0, 0.05)
        A.lock(m, 'hair', to_world, [(yaw * 0.9, 88, 1.04), (yaw, 68, 1.17), (yaw + rnd.uniform(-6, 6), 40, 1.2), (yaw + rnd.uniform(-9, 9), low, kick)],
               0.22, 0.05, colors=cols, n=22)
    # back and sides: a second, lower layer down to the nape
    for i, yaw in enumerate(np.linspace(62, 298, 14)):
        back = max(0.0, -math.cos(math.radians(yaw)))
        low = -30 - 26 * back + rnd.uniform(-5, 5)
        kick = 1.1 + (0.12 if i % 3 == 0 else 0.03)
        A.lock(m, 'hair', to_world, [(yaw, 52, 1.1), (yaw, 20, 1.15), (yaw + rnd.uniform(-5, 5), -10, 1.13), (yaw + rnd.uniform(-8, 8), low, kick)],
               0.2, 0.045, colors=(HAIR_DARK, HAIR), n=20)
    # sideburn tufts in front of the ears
    for s in (1, -1):
        A.lock(m, 'hair', to_world, [(s * 62, 50, 1.1), (s * 70, 20, 1.14), (s * 72, -8, 1.1), (s * 66, -30, 1.06)], 0.12, 0.035, colors=cols)
        A.lock(m, 'hair', to_world, [(s * 78, 55, 1.1), (s * 86, 20, 1.16), (s * 90, -6, 1.16), (s * 96, -24, 1.24)], 0.13, 0.04, colors=cols)
    # stray wisps
    for yaw, p0, p1, r1 in [(-20, 80, 62, 1.36), (35, 84, 66, 1.34), (120, 70, 50, 1.36), (-130, 66, 44, 1.38), (175, 60, 36, 1.36)]:
        A.lock(m, 'hair', to_world, [(yaw, p0, 1.1), (yaw + 4, (p0 + p1) / 2, 1.24), (yaw + 10, p1, r1)], 0.06, 0.02, colors=cols, n=12, k=8)


if __name__ == '__main__':
    pass
