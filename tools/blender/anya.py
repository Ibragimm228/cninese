"""Anya Forger — pink bob with horn ornaments, black dress with gold trim, a peanut."""
import math

import numpy as np

import anatomy as A
from lib import Model, ball, lin, merge, rigid, transform, tube
from outfit import Body, fan, folds, pipe, with_sway

SKIN, SKIN_SHADE = '#ffe6d8', '#f4b9a8'
HAIR, HAIR_TIP, HAIR_DARK = '#f6a3c2', '#ffcfe0', '#de7ba4'
DRESS, GOLD = '#26242e', '#f0c14a'


def build(lod=0):
    m = Model('anya', lod)
    b = dict(A.BUILD, ankle=0.12, knee=0.56, hip=1.03, waist=1.23, chest=1.5, shoulder=1.7, neck=1.8, head=2.3,
             hip_x=0.092, shoulder_x=0.235, upper=0.34, fore=0.31, head_scale=1.1)
    A.skeleton(m, b)
    m.bone('sway_skirt', (0, 1.05, 0), 'hips')
    m.material('skin', SKIN, shade=SKIN_SHADE, tint='#ffd3c8')
    m.material('skin_shade', SKIN_SHADE, tint='#ffd3c8')
    m.material('hair', '#ffffff', shade=HAIR_DARK, gloss=0.6)
    m.material('dress', '#ffffff')
    m.material('white', '#fdfcf8')
    m.material('black', '#22202a')
    m.material('gold', GOLD)
    m.material('nut', '#d9a968')
    to_world, tree = A.build_head(m, b)
    face = A.Face(m, to_world, tree, b['head_scale'])
    eye = dict(x=0.132, y=-0.07, w=0.168, up=0.088, lo=0.072, pu=2.2, qu=2.0, pl=2.2, ql=2.0, skew=0.03, slant=-0.03,
               lash='#5a2f3c', lash_w=0.018, wing=(0.02, 0.0), lower=0.5, lashes=[(0.55, 0.03, 0.9), (0.8, 0.028, 1.2)],
               iris=dict(rx=0.062, ry=0.076, dy=0.004, top='#1f7d5c', mid='#4cc48f', low='#c8f7d8', ring='#145a42', glow='#e6fff0', pupil=0.4, pupil_color='#0f4532',
                         lights=[(-0.36, 0.42, 0.3, 0.85), (0.42, -0.42, 0.15, 1.0), (0.1, 0.62, 0.08, 1.0)]))
    A.draw_eyes(face, eye)
    A.draw_brows(face, eye, dict(len=0.08, gap=0.04, w=0.011, color='#d77a9f', arch=0.008, in_y=0.0, out_y=-0.004))
    A.draw_mouth(face, dict(y=-0.25, w=0.045, bend=0.007, color='#b0554f', open_h=0.07))
    A.draw_nose(face, y=-0.185)
    A.draw_blush(face, 0.185, -0.185, 0.06, 0.032)
    A.fringe_shadow(face, FRINGE, SKIN, drop=0.04)
    hair(m, to_world)
    outfit(m, b)
    return m


FRINGE = [(-56, 14, 0.16), (-42, 17, 0.16), (-28, 19, 0.16), (-14, 21, 0.15), (-2, 26, 0.12), (10, 21, 0.15), (24, 19, 0.16), (38, 17, 0.16), (52, 14, 0.16)]


def hair(m, to_world):
    rnd = np.random.RandomState(5)
    A.scalp(m, to_world, lambda a: 0.2 - 0.4 * A.smooth(0.5, 1.5, abs(math.remainder(a, math.tau))), color=lin(HAIR))
    cols = (HAIR, HAIR_TIP)
    # blunt fringe, parted a little off-centre
    for yaw, tip, wd in FRINGE:
        A.lock(m, 'hair', to_world, [(yaw * 0.5, 76, 1.06), (yaw * 0.85, 54, 1.14), (yaw, 34, 1.14), (yaw + rnd.uniform(-2, 2), tip, 1.09)], wd, 0.045, colors=cols, tip_p=3.0)
    # the bob: long clumps from the crown to the jaw, tips tucking under
    for i, yaw in enumerate(np.linspace(60, 300, 19)):
        back = max(0.0, -math.cos(math.radians(yaw)))
        end = -52 - 8 * back + rnd.uniform(-3, 3)
        A.lock(m, 'hair', to_world, [(yaw * 0.97 + 5, 86, 1.05), (yaw, 58, 1.19), (yaw, 20, 1.24), (yaw, -22, 1.26), (yaw + rnd.uniform(-3, 3), end, 1.12)],
               0.25, 0.06, colors=cols, n=26, tip_p=2.6)
    # face-framing locks, longer, curving in to the chin
    for s in (1, -1):
        A.lock(m, 'hair', to_world, [(s * 58, 60, 1.1), (s * 68, 26, 1.17), (s * 70, -14, 1.14), (s * 62, -50, 1.06)], 0.15, 0.045, colors=cols, n=22, tip_p=2.2)
        A.lock(m, 'hair', to_world, [(s * 70, 62, 1.12), (s * 82, 24, 1.22), (s * 84, -20, 1.22), (s * 78, -56, 1.12)], 0.2, 0.05, colors=cols, n=22, tip_p=2.4)
        # horn ornaments: black cones with a gold band
        base, tip = A.shell(to_world, np.array([s * 52.0]), np.array([58.0]), np.array([1.1]))[0], A.shell(to_world, np.array([s * 60.0]), np.array([64.0]), np.array([1.62]))[0]
        d = tip - base
        m.add('hair', tube([(base, 0.058, 0.058), (base + d * 0.3, 0.05, 0.05), (base + d * 0.75, 0.026, 0.026), (tip, 0.004, 0.004)], 16, 12), 'black', rigid('head'))
        a = np.linspace(0, math.tau, 20, endpoint=False)
        ref = np.cross(d, [0, 0, 1.0])
        ref = ref / np.linalg.norm(ref)
        up = np.cross(ref, d / np.linalg.norm(d))
        for q, r in ((0.08, 0.06), (0.4, 0.047)):
            m.add('hair', pipe(base + d * q + np.outer(np.cos(a), ref) * r + np.outer(np.sin(a), up) * r, 0.009, 6), 'gold', rigid('head'))
    # ahoge
    A.lock(m, 'hair', to_world, [(0, 88, 1.05), (10, 84, 1.3), (30, 70, 1.42), (48, 58, 1.36)], 0.06, 0.02, colors=cols, n=14, k=8)


def outfit(m, b):
    j = A.joints(b)
    dress = Body([(0.86, 0.36, 0.33, 0.0), (1.03, 0.27, 0.24, 0.0), (1.23, 0.168, 0.128, 0.0), (1.5, 0.19, 0.134, 0.004), (1.63, 0.208, 0.12, 0.0),
                  (1.7, 0.212, 0.104, -0.004), (1.76, 0.16, 0.09, -0.008), (1.8, 0.1, 0.086, -0.01)])
    skin = with_sway(A.torso_skin(b), 'sway_skirt', 1.15, 0.9)

    def paint(p):
        c = np.tile(lin(DRESS), (len(p), 1))
        y = p[:, 1]
        c[(y < 0.9)] = lin(GOLD)
        c[(y > 1.2) & (y < 1.25)] = lin(GOLD)
        return c
    marks = []
    for s in (1, -1):
        for sg in (1, -1):
            marks += fan(dress, (s * 0.13, 1.27), [(s * 0.05, 1.36), (s * 0.08, 1.44)], 0.013, sg) + fan(dress, (s * 0.16, 1.6), [(s * 0.09, 1.5)], 0.014, sg)
    dress.add(m, 'dress', skin, color=paint, n=128, rows=56, subdiv=1, ripple=(12, 0.07), post=folds(marks, (1.9, 1.85, 2.3)))
    # petticoat peeking out under the hem
    under = Body([(0.82, 0.34, 0.31, 0.0), (1.0, 0.25, 0.22, 0.0)])
    under.add(m, 'white', skin, n=96, rows=8, caps=(True, False), subdiv=1, ripple=(12, 0.05))
    # white collar, gold buttons and chest emblem
    col = dress.loop(1.775, 40, 0.012, dip=lambda a: 0.05 * np.clip(np.cos(a), 0, 1) ** 2)
    m.add('body', pipe(col, 0.022), 'white', skin)
    # gold piping down the front, either side of the buttons
    for s in (1, -1):
        ys = np.linspace(1.27, 1.72, 24)
        xs = np.full_like(ys, s * 0.05)
        m.add('body', pipe(np.stack([xs, ys, dress.z(xs, ys, 1, 0.004)], axis=1), 0.006, 6, False), 'gold', skin)
    for y in (1.36, 1.46, 1.56):
        z = dress.z(np.array([0.0]), np.array([y]))[0]
        m.add('body', ball((0, y, z), 0.02, 12, 8), 'gold', skin)
    m.add('body', pipe(np.array([[0.0, 1.68, 0.115]]) + np.stack([0.03 * np.cos(np.linspace(0, math.tau, 12, endpoint=False)), 0.03 * np.sin(np.linspace(0, math.tau, 12, endpoint=False)), np.zeros(12)], axis=1), 0.008, 5), 'gold', skin)
    for s in (1, -1):
        n = 'L' if s > 0 else 'R'
        f = np.array([s, 1, 1])
        A.arm(m, b, s, skin='dress', r=(0.074, 0.062, 0.058, 0.052))
        A.hand(m, b, s, 'grip' if s < 0 else 'relaxed', scale=0.84)
        wr, d = j['wrist'] * f, j['dir'] * f
        m.add('body', tube([(wr - d * 0.07, 0.05, 0.05), (wr - d * 0.06, 0.06, 0.06), (wr - d * 0.015, 0.058, 0.058), (wr - d * 0.005, 0.045, 0.045)], 20, 8), 'white', rigid(f'forearm_{n}'))
        a = np.linspace(0, math.tau, 24, endpoint=False)
        ux = np.cross(d, [0, 0, 1.0])
        m.add('body', pipe(wr - d * 0.062 + np.outer(np.cos(a), ux) * 0.061 + np.outer(np.sin(a), [0, 0, 1.0]) * 0.061, 0.007, 6), 'gold', rigid(f'forearm_{n}'))
        A.leg(m, b, s, mat='white', r=(0.098, 0.084, 0.064, 0.068, 0.046))
        at = np.array([s * j['ankle'][0], 0.0, j['ankle'][2]])
        yaw = (0, s * 0.12, 0)
        foot = rigid(f'foot_{n}')
        v, fc = A.shoe_shape(0.3, 0.092, 0.15, -0.1, y0=0.02, toe_h=0.6)
        m.add('body', (transform(v, at, yaw), fc), 'white', foot, subdiv=2)
        v, fc = A.shoe_shape(0.31, 0.092, 0.15, -0.105, inflate=0.01, top=0.52)
        m.add('body', (transform(v, at, yaw), fc), 'black', foot, subdiv=2)
        strap = np.array([[-0.07, 0.07, 0.02], [-0.045, 0.125, 0.03], [0.0, 0.142, 0.035], [0.045, 0.125, 0.03], [0.07, 0.07, 0.02]])
        m.add('body', pipe(transform(A.curve(strap, 12), at, yaw), 0.012, 6, False), 'black', foot)
        m.add('body', ball(transform(np.array([[s * 0.066, 0.1, 0.027]]), at, yaw)[0], 0.014, 10, 6), 'gold', foot)
    # peanut in the right hand
    c = j['wrist'] * [-1, 1, 1] + j['dir'] * [-1, 1, 1] * 0.1 + np.array([0.05, 0, 0.02])
    m.bone('prop', c, 'hand_R')
    nut = merge(ball(c + [0, 0.035, 0], 1, 16, 10, (0.04, 0.045, 0.04)), ball(c - [0, 0.035, 0], 1, 16, 10, (0.036, 0.042, 0.036)))
    m.add('prop', nut, 'nut', rigid('prop'), subdiv=1)
