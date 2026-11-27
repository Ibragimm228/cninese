"""blender -b -P tools/blender/build.py -- <character|all> [out_dir]"""
import importlib
import os
import sys

here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
names = ['kuroko', 'chrollo', 'ichigo', 'anya'] if not args or args[0] == 'all' else args[0].split(',')
out = args[1] if len(args) > 1 else os.path.join(here, '..', '..', 'public', 'models')
lods = [int(x) for x in (args[2].split(',') if len(args) > 2 else ['0', '1'])]
os.makedirs(out, exist_ok=True)
for name in names:
    mod = importlib.import_module(name)
    for lod in lods:
        path = os.path.join(out, f'{name}{"" if lod == 0 else "-lite"}.glb')
        tris = mod.build(lod).build(path)
        print(f'BUILT {name} lod{lod}: {tris} triangles, {os.path.getsize(path) / 1e6:.2f} MB')
