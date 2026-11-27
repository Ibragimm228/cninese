"""Ichigo Kurosaki — spiked orange hair, shihakusho, Zangetsu on his back."""
import math

import numpy as np

import anatomy as A
from lib import Model, ball, lin, loft, norm, rigid, transform, tube
from outfit import fan, folds, Body, box, pipe, with_sway

SKIN, SKIN_SHADE = '#ffdcc4', '#eeab8e'
HAIR, HAIR_TIP, HAIR_DARK = '#ff8a1f', '#ffb84d', '#e2601a'
ROBE = '#26262e'


def build(lod=0):
    m = Model('ichigo', lod)
    b = dict(A.BUILD)
    A.skeleton(m, b)
    m.bone('sway_hakama', (0, 1.3, 0), 'hips')
    m.material('skin', SKIN, shade=SKIN_SHADE, tint='#ffd3c8')
    m.material('skin_shade', SKIN_SHADE, tint='#ffd3c8')
    m.material('hair', '#ffffff', shade=HAIR_DARK, gloss=0.6)
    m.material('robe', '#ffffff')
    m.material('sleeve', ROBE)
    m.material('white', '#fbfaf5')
    m.material('straw', '#d2a95c')
    m.material('red', '#b3222c')
    m.material('steel', '#ffffff')
    to_world, tree = A.build_head(m, b)
    face = A.Face(m, to_world, tree)
    eye = dict(x=0.125, y=-0.055, w=0.138, up=0.052, lo=0.044, pu=2.8, qu=2.2, pl=2.4, ql=1.8, skew=0.1, slant=0.1,
               lash='#3a2416', lash_w=0.017, wing=(0.02, 0.008), lower=0.4,
               iris=dict(rx=0.041, ry=0.048, dy=0.0, top='#6b3a16', mid='#b06a26', low='#f0b866', ring='#4a260d', glow='#ffd898', pupil=0.4, pupil_color='#2a1408'))
    A.draw_eyes(face, eye)
    # the permanent scowl
    A.draw_brows(face, eye, dict(len=0.125, gap=0.016, w=0.017, color='#c9591a', arch=-0.004, in_y=-0.03, out_y=0.016, taper=(0.9, 0.3)))
    A.draw_mouth(face, dict(y=-0.245, w=0.06, bend=-0.004, color='#9a4a3c'))
    A.draw_nose(face)
    A.fringe_shadow(face, FRINGE, SKIN, drop=0.035)
    hair(m, to_world)
    outfit(m, b)
    sword(m)
    return m


FRINGE = [(-60, 10, 0.13), (-46, 22, 0.14), (-31, 12, 0.13), (-17, 26, 0.12), (-4, 6, 0.14), (10, 24, 0.12), (24, 14, 0.13), (38, 28, 0.13), (52, 16, 0.14), (64, 8, 0.12)]


def hair(m, to_world):
    rnd = np.random.RandomState(11)
    A.scalp(m, to_world, lambda a: 0.2 - 0.33 * A.smooth(0.5, 1.6, abs(math.remainder(a, math.tau))), color=lin(HAIR))
    cols = (HAIR, HAIR_TIP)
    # spikes in rings from the crown down, each leaning away from the face
    for pitch, count, length in [(80, 5, 0.6), (58, 9, 0.62), (36, 11, 0.58), (12, 10, 0.5), (-12, 9, 0.4), (-34, 7, 0.3)]:
        for i in range(count):
            yaw = (i + 0.5 * (pitch % 3 == 0)) / count * 360 - 180 + rnd.uniform(-8, 8)
            if abs(yaw) < 66 and pitch < 50:
                continue
            lean = 14 if abs(yaw) < 100 else 0
            p1 = pitch + rnd.uniform(-6, 10)
            A.lock(m, 'hair', to_world, [(yaw, pitch, 1.0), (yaw + rnd.uniform(-6, 6), p1 + lean * 0.5, 1.0 + length * 0.55), (yaw + rnd.uniform(-12, 12), p1 + lean, 1.0 + length + rnd.uniform(0, 0.1))],
                   0.2, 0.06, colors=cols, n=14, root=1.0, tip_p=0.9)
    # ragged fringe
    for yaw, tip, wd in FRINGE:
        A.lock(m, 'hair', to_world, [(yaw * 0.5, 72, 1.07), (yaw * 0.85, 52, 1.16), (yaw + rnd.uniform(-4, 4), 36, 1.15), (yaw + rnd.uniform(-9, 9), tip, 1.13)], wd, 0.04, colors=cols)
    for s in (1, -1):
        A.lock(m, 'hair', to_world, [(s * 66, 48, 1.1), (s * 72, 22, 1.14), (s * 72, 0, 1.1), (s * 68, -18, 1.08)], 0.11, 0.035, colors=cols)


def outfit(m, b):
    j = A.joints(b)
    top = Body([(1.36, 0.225, 0.165, 0.0), (1.56, 0.205, 0.145, 0.0), (1.88, 0.24, 0.158, 0.006), (2.02, 0.262, 0.142, 0.0),
                (2.09, 0.272, 0.124, -0.004), (2.15, 0.2, 0.104, -0.008), (2.2, 0.124, 0.098, -0.01)])
    skin = A.torso_skin(b)

    def paint(p):
        c = np.tile(lin(ROBE), (len(p), 1))
        x, y, front = np.abs(p[:, 0]), p[:, 1], p[:, 2] > 0
        v = (y - 1.6) * 0.21
        c[front & (x < v + 0.04)] = lin('#fbfaf5')
        c[front & (x < v)] = lin(SKIN)
        c[(~front) & (y > 2.15)] = lin('#fbfaf5')
        return c
    marks = []
    for s in (1, -1):
        for sg in (1, -1):
            marks += fan(top, (s * 0.17, 1.6), [(s * 0.06, 1.72), (s * 0.1, 1.84)], 0.016, sg) + fan(top, (s * 0.21, 1.96), [(s * 0.12, 1.8)], 0.018, sg)
    top.add(m, 'robe', skin, color=paint, n=128, rows=64, subdiv=1, post=folds(marks, (1.9, 1.85, 2.3)))
    # the two collars as raised edges: white under-robe inside, black robe outside
    for s in (1, -1):
        ys = np.linspace(1.62, 2.14, 24)
        for off, mat, r in ((0.0, 'white', 0.007), (0.04, 'sleeve', 0.008)):
            x = (ys - 1.6) * 0.21 + off
            m.add('body', pipe(np.stack([s * x, ys, top.z(s * x, ys, 1, 0.009)], axis=1), r, 6, False), mat, skin)
    # sash and knot
    sash = Body([(1.4, 0.228, 0.168, 0.0), (1.5, 0.215, 0.156, 0.0), (1.6, 0.212, 0.152, 0.0)])
    sash.add(m, 'white', skin, n=48, rows=6, caps=(False, False), subdiv=1, inflate=0.006)
    m.add('body', ball((0.07, 1.48, 0.17), 1, 14, 8, (0.055, 0.04, 0.03)), 'white', skin)
    for dx, ln in ((0.05, 0.26), (0.1, 0.2)):
        m.add('body', tube([((dx, 1.47, 0.18), 0.022, 0.008), ((dx + 0.01, 1.47 - ln * 0.5, 0.2), 0.026, 0.008), ((dx + 0.025, 1.47 - ln, 0.21), 0.03, 0.006)], 10, 8), 'white',
              with_sway(skin, 'sway_hakama', 1.45, 1.25))
    # koshi-ita: the stiff board at the back of the hakama
    m.add('body', box((0, 1.5, -0.165), (0.2, 0.13, 0.035)), 'sleeve', skin, subdiv=0, smooth_shade=False)
    hak = Body([(0.16, 0.37, 0.27, 0.0), (0.7, 0.32, 0.24, 0.0), (1.2, 0.25, 0.185, 0.0), (1.46, 0.215, 0.155, 0.0)])
    hak.add(m, 'robe', with_sway(skin, 'sway_hakama', 1.3, 0.7), color=lambda p: np.tile(lin(ROBE), (len(p), 1)), n=112, rows=30, caps=(True, False), subdiv=1, ripple=(14, 0.06))
    for s in (1, -1):
        n = 'L' if s > 0 else 'R'
        A.arm(m, b, s, skin='sleeve', r=(0.1, 0.1, 0.112, 0.125))
        A.arm(m, b, s)
        A.hand(m, b, s, 'fist' if s < 0 else 'relaxed')
        # the white under-robe shows at the cuffs
        wr, dd = j['wrist'] * [s, 1, 1], j['dir'] * [s, 1, 1]
        a = np.linspace(0, math.tau, 28, endpoint=False)
        ux = np.cross(dd, [0, 0, 1.0])
        cuff = wr - dd * 0.01 + np.outer(np.cos(a), ux) * 0.112 + np.outer(np.sin(a), [0, 0, 1.0]) * 0.112
        m.add('body', pipe(cuff, 0.013, 6), 'white', rigid(f'forearm_{n}'))
        A.leg(m, b, s, mat='white', r=(0.118, 0.1, 0.073, 0.082, 0.056), top=b['ankle'] + 0.25, bottom=b['ankle'] - 0.02)
        at = np.array([s * j['ankle'][0], 0.0, j['ankle'][2]])
        yaw = (0, s * 0.14, 0)
        foot = rigid(f'foot_{n}')
        v, fc = A.shoe_shape(0.33, 0.095, 0.15, -0.11, y0=0.03, toe_h=0.42)
        m.add('body', (transform(v, at, yaw), fc), 'white', foot, subdiv=2)
        v, fc = A.shoe_shape(0.36, 0.1, 0.15, -0.125, inflate=0.012, top=0.16)
        m.add('body', (transform(v, at, yaw), fc), 'straw', foot, subdiv=1)
        for side in (1, -1):
            strap = np.array([[0.0, 0.085, 0.16], [side * 0.05, 0.1, 0.1], [side * 0.085, 0.075, 0.0], [side * 0.09, 0.03, -0.03]])
            m.add('body', pipe(transform(A.curve(strap, 10), at, yaw), 0.011, 6, False), 'straw', foot)


def sword(m):
    """Zangetsu: an oversized cleaver without a guard, slung across the back on a red strap."""
    hilt, tip = np.array([-0.5, 2.92, -0.25]), np.array([0.52, 0.62, -0.25])
    d = norm(tip - hilt)
    side = norm(np.cross(d, [0, 0, 1.0]))
    length = np.linalg.norm(tip - hilt)
    m.bone('prop', hilt + d * length * 0.5, 'chest')
    skin = rigid('prop')
    t = np.concatenate([[0.2, 0.215], np.linspace(0.23, 0.86, 10), np.linspace(0.88, 1.0, 8)])
    rings = []
    for q in t:
        w = 0.24 * (1 if q < 0.86 else max(0.02, 1 - ((q - 0.86) / 0.14) ** 1.6))
        if q < 0.215:
            w = 0.09
        # the spine stays straight, the edge sweeps up to the point
        c = hilt + d * length * q + side * (0.12 - w / 2)
        rings.append([c + side * w / 2, c + [0, 0, 0.016], c - side * w / 2, c - [0, 0, 0.016]])
    rings = np.array(rings)

    def paint(p):
        e = (p - hilt) @ side
        c = np.tile(lin('#2c2c38'), (len(p), 1))
        c[e > 0.045] = lin('#eef3fa')
        return c
    m.add('prop', loft(rings), 'steel', skin, color=paint, subdiv=0, smooth_shade=False)
    m.add('prop', tube([(hilt + d * length * q + side * 0.12, 0.034, 0.03) for q in (0.0, 0.07, 0.14, 0.205)], 12, 14), 'white', skin)
    for q in np.linspace(0.02, 0.19, 7):
        c = hilt + d * length * q + side * 0.12
        a = np.linspace(0, math.tau, 12, endpoint=False)
        m.add('prop', pipe(c + np.outer(np.cos(a), side) * 0.037 + np.outer(np.sin(a), [0, 0, 1.0]) * 0.033 + np.outer(np.cos(a), d) * 0.012, 0.006, 5), 'sleeve', skin)
    # trailing wrap
    end = hilt + side * 0.12
    m.add('prop', tube([(end, 0.02, 0.005), (end + [-0.06, 0.05, -0.02], 0.02, 0.005), (end + [-0.15, 0.0, -0.03], 0.018, 0.005), (end + [-0.2, -0.1, -0.02], 0.012, 0.004)], 8, 12), 'white', skin)
    # strap across the chest
    a = np.linspace(0, math.tau, 56, endpoint=False)
    u = norm(np.array([-0.42, 0.54, 0.0]))
    loop = np.array([0.0, 1.83, 0.0]) + np.outer(np.cos(a), u) * 0.36 + np.outer(np.sin(a), [0, 0, 1.0]) * 0.2
    loop[:, 2] = np.where(loop[:, 2] < 0, loop[:, 2] * 1.1, loop[:, 2])
    m.add('body', pipe(loop, 0.022), 'red', A_skin)


A_skin = rigid('chest')
