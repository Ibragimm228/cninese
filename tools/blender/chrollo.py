"""Chrollo Lucilfer — swept-back hair, cross tattoo, fur-collared coat, open book."""
import math

import numpy as np

import anatomy as A
from lib import ball, lin, merge, rigid, transform, tube
from outfit import Body, back_hair, box, fan, folds, pipe, tufts, with_sway

SKIN, SKIN_SHADE = '#fbe7dc', '#e6b5a6'
HAIR, HAIR_TIP, HAIR_DARK = '#3a3a52', '#5a5a7c', '#26263a'
COAT, TRIM, SHIRT = '#34305a', '#8d86c9', '#17171f'


def build(lod=0):
    m = Model('chrollo', lod)
    b = dict(A.BUILD)
    A.skeleton(m, b)
    m.bone('sway_coat', (0, 1.3, 0), 'hips')
    m.material('skin', SKIN, shade=SKIN_SHADE, tint='#ffd3c8')
    m.material('skin_shade', SKIN_SHADE, tint='#ffd3c8')
    m.material('hair', '#ffffff', shade=HAIR_DARK, gloss=0.6)
    m.material('coat', '#ffffff')
    m.material('sleeve', COAT)
    m.material('fur', '#f6f2ea')
    m.material('trim', TRIM)
    m.material('black', '#1c1c24')
    m.material('gem', '#3fc1d6')
    m.material('gold', '#e8b84a')
    m.material('cover', '#8a2334')
    m.material('paper', '#fbf3dd')
    m.material('print', '#f6f2ea', kind='unlit', outline=False)
    to_world, tree = A.build_head(m, b)
    face = A.Face(m, to_world, tree)
    eye = dict(x=0.125, y=-0.05, w=0.136, up=0.05, lo=0.04, pu=2.6, qu=2.0, pl=2.4, ql=1.8, skew=0.08, slant=0.04,
               lash='#1c1c28', lash_w=0.016, wing=(0.022, 0.004), lower=0.4,
               iris=dict(rx=0.04, ry=0.047, dy=0.002, top='#22222e', mid='#4a4a62', low='#9c9cba', ring='#15151d', glow='#c9c9e2', pupil=0.42, pupil_color='#0c0c12'))
    A.draw_eyes(face, eye)
    A.draw_brows(face, eye, dict(len=0.115, gap=0.03, w=0.011, color='#2c2c3c', arch=0.008, in_y=-0.006, out_y=0.0))
    A.draw_mouth(face, dict(y=-0.243, w=0.06, bend=0.004, color='#9a524c'))
    A.draw_nose(face)
    # cross tattoo on the forehead
    ink = lin('#3d2f7a')
    face.line('face', np.array([[0, 0.2], [0, 0.105]]), 0.014, ink, 2, n=8, taper=(1, 1))
    face.line('face', np.array([[-0.034, 0.165], [0.034, 0.165]]), 0.014, ink, 2, n=8, taper=(1, 1))
    hair(m, to_world)
    for s in (1, -1):
        m.add('body', ball(to_world((s * 0.31, -0.2, 0.0)), 0.038, 16, 10), 'gem', rigid('head'))
    outfit(m, b)
    book(m, b)
    return m


def hair(m, to_world):
    rnd = np.random.RandomState(3)
    A.scalp(m, to_world, lambda a: 0.25 - 0.36 * A.smooth(0.5, 1.6, abs(math.remainder(a, math.tau))), color=lin(HAIR))
    cols = (HAIR, HAIR_TIP)
    # combed straight back from the hairline, over the crown and down the back of the head
    for i, yaw in enumerate(np.linspace(-78, 78, 17)):
        y2 = 180 - yaw * 0.8
        A.lock(m, 'hair', to_world, [(yaw, 47, 1.05), (yaw, 66, 1.17), (yaw * 0.7, 86, 1.21), (y2, 62, 1.2), (y2 + rnd.uniform(-6, 6), 22 + rnd.uniform(-8, 8), 1.18 + 0.1 * (i % 2))],
               0.2, 0.05, colors=cols, n=24)
    # temples sweep back above the ears
    for s in (1, -1):
        for k, (p0, p1) in enumerate([(34, 18), (20, 0), (6, -16)]):
            A.lock(m, 'hair', to_world, [(s * 76, p0, 1.07), (s * 104, p0 - 4, 1.15), (s * 140, p1 + 6, 1.17), (s * 166, p1 - 8, 1.2 + 0.06 * k)], 0.17, 0.045, colors=cols, n=20)
    back_hair(m, A, to_world, rnd, HAIR_DARK, HAIR, low=-26, drop=30)
    # two loose strands over the forehead
    A.lock(m, 'hair', to_world, [(-16, 50, 1.07), (-22, 40, 1.16), (-27, 26, 1.15), (-25, 12, 1.1)], 0.05, 0.02, colors=cols, n=14, k=8)
    A.lock(m, 'hair', to_world, [(24, 50, 1.07), (31, 42, 1.15), (37, 30, 1.14), (36, 18, 1.1)], 0.045, 0.02, colors=cols, n=14, k=8)


def outfit(m, b):
    j = A.joints(b)
    coat = Body([(0.46, 0.36, 0.29, 0.0), (0.9, 0.3, 0.235, 0.0), (1.33, 0.24, 0.175, 0.0), (1.56, 0.205, 0.145, 0.0), (1.88, 0.238, 0.158, 0.006),
                 (2.02, 0.258, 0.142, 0.0), (2.09, 0.268, 0.124, -0.004), (2.15, 0.2, 0.102, -0.008), (2.2, 0.122, 0.096, -0.01)])
    skin = with_sway(A.torso_skin(b), 'sway_coat', 1.3, 0.8)

    def paint(p):
        c = np.tile(lin(COAT), (len(p), 1))
        x, y, front = np.abs(p[:, 0]), p[:, 1], p[:, 2] > 0
        gap = np.where(y > 1.56, 0.012 + (y - 1.56) * 0.17, 0.012 + (1.56 - y) * 0.1)
        c[front & (x < gap + 0.022)] = lin(TRIM)
        c[front & (x < gap)] = lin(SHIRT)
        c[y < 0.5] = lin(TRIM)
        c[(y > 1.5) & (y < 1.58)] = lin('#1c1c24')
        return c
    marks = []
    for s in (1, -1):
        for sg in (1, -1):
            marks += fan(coat, (s * 0.15, 1.5), [(s * 0.2, 1.05), (s * 0.1, 1.15), (s * 0.24, 1.25)], 0.02, sg)
            marks += fan(coat, (s * 0.17, 1.6), [(s * 0.08, 1.72), (s * 0.1, 1.62)], 0.016, sg)
            marks += fan(coat, (s * 0.2, 1.95), [(s * 0.11, 1.8), (s * 0.16, 1.74)], 0.018, sg)
            marks += fan(coat, (s * 0.26, 0.52), [(s * 0.24, 0.8)], 0.022, sg) + fan(coat, (s * 0.12, 0.52), [(s * 0.13, 0.74)], 0.018, sg)
    coat.add(m, 'coat', skin, color=paint, n=128, rows=72, subdiv=1, ripple=(8, 0.045), post=folds(marks))
    # raised edging down both sides of the opening
    for s in (1, -1):
        ys = np.linspace(0.5, 2.06, 40)
        gap = np.where(ys > 1.56, 0.012 + (ys - 1.56) * 0.17, 0.012 + (1.56 - ys) * 0.1) + 0.024
        m.add('body', pipe(np.stack([s * gap, ys, coat.z(s * gap, ys, 1, 0.003)], axis=1), 0.008, 6, False), 'trim', skin)
    coat.decal(m, -0.04, 0.04, 1.495, 1.585, 'gold', skin, off=0.012, nx=4, ny=4)
    zb = float(coat.z(np.array([0.0]), np.array([1.54]), 1, 0.016)[0])
    m.add('body', pipe(np.array([[-0.046, 1.49, zb], [0.046, 1.49, zb], [0.046, 1.59, zb], [-0.046, 1.59, zb]]), 0.008, 6), 'gold', skin, subdiv=0)
    m.add('body', pipe(np.array([[0.0, 1.492, zb + 0.004], [0.0, 1.588, zb + 0.004]]), 0.006, 6, False), 'gold', skin, subdiv=0)
    # inverted cross on the back
    coat.decal(m, -0.03, 0.03, 1.2, 1.95, 'print', skin, sign=-1, nx=4, ny=14)
    coat.decal(m, -0.14, 0.14, 1.36, 1.43, 'print', skin, sign=-1, nx=10, ny=3)
    # fur collar, dipping at the front
    ring = coat.loop(2.14, 26, 0.03, dip=lambda a: 0.11 * np.clip(np.cos(a), 0, 1) ** 2)
    m.add('body', tufts(ring, 0.085, 5), 'fur', A.torso_skin(b), subdiv=1)
    for s in (1, -1):
        n = 'L' if s > 0 else 'R'
        f = np.array([s, 1, 1])
        A.arm(m, b, s, skin='sleeve', r=(0.098, 0.088, 0.084, 0.078))
        A.hand(m, b, s, 'open' if s > 0 else 'relaxed')
        wr, d = j['wrist'] * f, j['dir'] * f
        a = np.linspace(0, math.tau, 11)[:-1]
        cuff = wr - d * 0.03 + np.stack([0.075 * np.cos(a), 0 * a, 0.075 * np.sin(a)], axis=1)
        m.add('body', tufts(cuff, 0.045, 9 + s), 'fur', rigid(f'forearm_{n}'), subdiv=1)
        A.leg(m, b, s, mat='black', r=(0.118, 0.104, 0.082, 0.09, 0.07))
        at = np.array([s * j['ankle'][0], 0.0, j['ankle'][2]])
        v, fc = A.shoe_shape(0.37, 0.108, 0.2, -0.12, y0=0.02)
        m.add('body', (transform(v, at, (0, s * 0.14, 0)), fc), 'black', rigid(f'foot_{n}'), subdiv=2)
        v, fc = A.shoe_shape(0.38, 0.108, 0.2, -0.125, inflate=0.01, top=0.12)
        m.add('body', (transform(v, at, (0, s * 0.14, 0)), fc), 'coat', rigid(f'foot_{n}'), color=lambda p: np.tile(lin('#55506e'), (len(p), 1)), subdiv=1)
        for y in (0.3, 0.42):
            a = np.linspace(0, math.tau, 24, endpoint=False)
            strap = at + np.stack([0.088 * np.sin(a), y + 0 * a, -0.005 + 0.094 * np.cos(a)], axis=1)
            m.add('body', pipe(strap, 0.014), 'gold', rigid(f'shin_{n}'))


def book(m, b):
    j = A.joints(b)
    wr, d = j['wrist'], j['dir']
    c = wr + d * 0.12 + np.array([-0.05, 0, 0.0])
    m.bone('prop', c, 'hand_L')
    skin = rigid('prop')
    # the book lies on the palm (-x); its halves rise towards the fore-edges like an open V
    for s in (1, -1):
        m.add('prop', box(c + [-0.012 - 0.022, 0, s * 0.082], (0.012, 0.25, 0.17), s * 0.22), 'cover', skin, subdiv=0, smooth_shade=False)
        m.add('prop', box(c + [-0.03 - 0.022, 0, s * 0.08], (0.03, 0.23, 0.155), s * 0.22), 'paper', skin, subdiv=0, smooth_shade=False)
        for k in range(5):
            m.add('prop', box(c + [-0.047 - 0.022 - s * 0.0, 0.07 - k * 0.035, s * 0.08], (0.003, 0.008, 0.11), s * 0.22), 'black', skin, subdiv=0, smooth_shade=False)
    m.add('prop', box(c + [-0.012, 0, 0], (0.02, 0.25, 0.03)), 'cover', skin, subdiv=0, smooth_shade=False)
    m.add('prop', tube([(c + [-0.05, -0.1, 0.01], 0.006, 0.003), (c + [-0.05, -0.17, 0.012], 0.006, 0.003), (c + [-0.045, -0.2, 0.016], 0.005, 0.003)], 6, 6), 'gold', skin, subdiv=0)


from lib import Model  # noqa: E402
