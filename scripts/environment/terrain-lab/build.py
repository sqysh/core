# The terrain lab's island, built in Blender from island.json:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/environment/terrain-lab/build.py -- [--preview DIR]
#
# 1. foundation: the island as one signed distance field (fields.py): the coast, terraces extruded from their regions
#    with rounded edges, their walls cut into stacked stone blocks (Voronoi columns, staggered courses, each block
#    jutting a little differently, at the scale of the Meshy kit's blocks), a stepped path cut and filled up the
#    terraces, and loose blocks round the shore. Meshed from the field (OpenVDB), so it's one closed surface.
# 2. hybrid: the Meshy kit pieces placed on it (island.json "meshy"), each turned into a distance field of its own
#    (OpenVDB, from its triangles) and joined to the foundation by a smooth union: one surface, the joins filleted.
# 3. baked: the foundation's own paint (a procedural material in the Meshy palette, from the field's curvature, the
#    terraces and the path) and, where the surface is a Meshy piece's, that piece's own texture and normals, blended
#    by distance from the piece, with contact shading in the joins.
#
# It runs in stages, each in its own Blender process, each leaving its results in work/ (git-ignored), so a failure
# resumes where it stopped instead of starting again. A stage is done when its stamp in work/ matches island.json; a
# changed design reruns them all. Before each stage and each bake, the free disk space is checked.
#
#   (no stage)          every stage that isn't done, in order
#   --stage NAME        just that one (geometry, bake-foundation, bake-hybrid-paint, bake-hybrid-pieces, compose)
#   --from NAME         that stage and every one after it, done or not
#   --status            what's done, and the free space; changes nothing
#   --preview DIR       the foundation and hybrid meshes with a quick vertex-colour paint, rendered; for shaping
#   --veg-debug DIR     each piece split into what joins the terrain and what stays as vegetation, rendered
#
# The originals are only read; the GLBs and report are written to public/models/environment-derived/terrain-lab.

import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import time

import bmesh
import bpy
import numpy as np
import openvdb as vdb
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fields as fx  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'public', 'models', 'environment-derived', 'terrain-lab')
WORK = os.path.join(HERE, 'work')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else None


PREVIEW = arg('--preview')

F = np.float32
t0 = time.time()


def log(*a):
    print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)


with open(os.path.join(HERE, 'island.json')) as f:
    D = json.load(f)

V = D['voxel']
# the grid: integer voxel coordinates, so OpenVDB's index space is the world over the voxel size
I0 = [int(math.floor(D['grid'][a][0] / V)) for a in 'xyz']
I1 = [int(math.ceil(D['grid'][a][1] / V)) for a in 'xyz']
SHAPE = tuple(b - a + 1 for a, b in zip(I0, I1))
XS = (np.arange(SHAPE[0]) + I0[0]).astype(F) * V
YS = (np.arange(SHAPE[1]) + I0[1]).astype(F) * V
ZS = (np.arange(SHAPE[2]) + I0[2]).astype(F) * V
ORIGIN = (XS[0], YS[0], ZS[0])
X2, Z2 = np.meshgrid(XS, ZS, indexing='ij')
log('grid', SHAPE, f'{np.prod(SHAPE) / 1e6:.0f}M voxels at {V} u')


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------------------------------------------------------- 2D
def coast_field():
    c = D['coast']
    s = fx.polygon(X2, Z2, c['polygon'])
    p = c['peninsula']
    s = fx.smin(s, fx.capsule(X2, Z2, p['from'], p['to'], p['radius']), p['blend'])
    cv = c['cove']
    bay = fx.circle(X2, Z2, cv['centre'], cv['radius'])
    if 'mouth' in cv:
        bay = fx.smin(bay, fx.capsule(X2, Z2, cv['centre'], cv['mouth']['to'], cv['mouth']['radius']), 1.0)
    s = fx.smax(s, -bay, cv['blend'])
    n = c['noise']
    s = s + fx.fbm(X2, Z2, n['scale'], n['seed']) * n['amplitude']
    return fx.blur2(s, c['round'] / V)


def level_fields(coast, path):
    out = []
    for lv in D['levels']:
        if 'polygon' in lv:
            s = fx.polygon(X2, Z2, lv['polygon'])
            n = lv['noise']
            s = s + fx.fbm(X2, Z2, n['scale'], n['seed']) * n['amplitude']
            s = fx.blur2(s, 1.0 / V)
        else:
            s = coast + lv['inset']
            if 'insetNoise' in lv:
                n = lv['insetNoise']
                s = s + np.maximum(fx.fbm(X2, Z2, n['scale'], n['seed']) * n['amplitude'], 0.3 - lv['inset'])
        top = np.full_like(s, lv['height'])
        # gently rolling ground, kept flat where something will stand
        if lv.get('undulate'):
            roll = fx.fbm(X2, Z2, 9, 101 + len(out)) * lv['undulate']
            if 'flat' in lv:
                fl = lv['flat']
                roll = roll * smoothstep(fl['radius'], fl['radius'] + 3, np.hypot(X2 - fl['centre'][0], Z2 - fl['centre'][1]))
            top = top + roll
        # the path's corridor cut out of any level above it: a smooth max, so a sliver of level left between the
        # corridor and the level's own edge merges into the cut instead of standing as a fin
        s = np.where(path['top'] < top - 0.15, fx.smax(s, -(path['s'] - 0.3), 0.9), s)
        out.append({'name': lv['name'], 's': s, 'top': top})
    return out


def path_fields():
    P = D['path']
    pts = np.asarray(P['points'], F)
    dist, h, seg = fx.polyline(X2, Z2, pts)
    s = dist - P['width'] / 2 + fx.fbm(X2, Z2, 3, 77) * 0.15
    # ramps become stairs: each ramp's height quantised to whole steps from its lower end
    lo = np.minimum(pts[seg, 2], pts[seg + 1, 2])
    ramp = pts[seg, 2] != pts[seg + 1, 2]
    hq = np.where(ramp, lo + np.floor((h - lo) / P['step'] + 0.5) * P['step'], h)
    return {'s': s, 'top': fx.blur2(hq, 2, passes=1), 'h': h}


def block_fields():
    """The shared stone pattern: Voronoi columns (seen from above), each with its own jut, rim height and course phase"""
    B = D['blocks']
    edge, cid = fx.voronoi(X2, Z2, B['column'], B['seed'], jitter=1.0)
    # each column's own jut and rim height fade out into its joints, so neighbours meet without a step
    inner = smoothstep(0, B['grooveWidth'] * 1.3, edge)
    return {
        'groove': B['groove'] * (1 - smoothstep(0, B['grooveWidth'], edge)),
        'jut': (fx.id_hash(cid, 1) - 0.5) * 2 * B['jut'] * inner,
        'rim': (fx.id_hash(cid, 2) - 0.5) * 2 * B['rim'] * inner,
        'inner': inner,
        'phase': fx.id_hash(cid, 3) * B['course'],
        'cid': cid,
        'edge': edge,
    }


# ---------------------------------------------------------------------------------------------------------------- 3D
def stone_wall(s, top, blocks, sl, y):
    """A region's 2D distance (s) turned 3D, its walls cut into stacked stone blocks below its top; one x-slab (sl)"""
    B = D['blocks']
    s = s[sl][:, None, :]
    top = top[sl][:, None, :]
    groove = blocks['groove'][sl][:, None, :]
    jut = blocks['jut'][sl][:, None, :]
    phase = blocks['phase'][sl][:, None, :]
    cid = blocks['cid'][sl][:, None, :]
    yy = y[None, :, None]
    # courses: horizontal joints, each column's own phase, each block its own jut
    t = (yy - phase) / B['course']
    course = np.round(t)
    joint = np.abs(t - course) * B['course']
    wall = 1 - smoothstep(top - 0.9, top - 0.35, yy)
    course_groove = B['courseGroove'] * (1 - smoothstep(0, B['courseWidth'], joint)) * wall
    inner = blocks['inner'][sl][:, None, :] * smoothstep(0, B['courseWidth'] * 1.3, joint)
    block_jut = (fx.hash2(cid, course.astype(np.int64) + 1000, 3) - 0.5) * 2 * B['jut'] * 0.8 * wall * inner
    batter = B['batter'] * np.maximum(top - yy, 0)
    return s + groove - jut - block_jut + course_groove - batter


def stone_solid(s, top, blocks, sl, y):
    """A region (2D distance s, height top) as a solid whose walls are stacked stone blocks"""
    B = D['blocks']
    s3 = stone_wall(s, top, blocks, sl, y)
    # rim blocks stand a little proud or low, only along the edge
    rim = blocks['rim'][sl][:, None, :] * smoothstep(-2.0, -0.8, s[sl][:, None, :])
    return fx.rounded_extrude(s3, y[None, :, None], top[sl][:, None, :] + rim, B['round'])


def foundation_field(coast, levels, path, blocks):
    d = np.empty(SHAPE, F)
    step = 48
    for x0 in range(0, SHAPE[0], step):
        sl = slice(x0, min(SHAPE[0], x0 + step))
        part = None
        for lv in levels:
            di = stone_solid(lv['s'], lv['top'], blocks, sl, YS)
            part = di if part is None else np.minimum(part, di)
        # the path's own stepped solid (its corridor is already cut out of the levels above it)
        part = np.minimum(part, stone_solid(path['s'], path['top'], blocks, sl, YS))
        # the sea floor closes the bottom
        part = np.maximum(part, D['seaFloor'] - YS[None, :, None])
        d[sl] = part
    return d


def add_boulders(d, coast):
    """Loose stone blocks round the shore, partly under the water"""
    Bd = D['boulders']
    rng = np.random.default_rng(Bd['seed'])
    # candidate spots: at the foot of the coast's cliffs
    ring = np.argwhere((coast > -0.2) & (coast < 0.7))
    picks = ring[rng.choice(len(ring), size=Bd['count'] * 3, replace=False)]
    placed = []
    for i, k in picks:
        c = np.array([XS[i], 0, ZS[k]], F)
        if any(np.hypot(*(c[[0, 2]] - q[[0, 2]])) < 2.8 for q in placed):
            continue
        placed.append(c)
        if len(placed) >= Bd['count']:
            break
    for c in placed:
        hs = rng.uniform(*Bd['size'], size=3).astype(F)
        hs[1] *= rng.uniform(0.6, 1.1)
        c[1] = rng.uniform(-0.2, 0.45)
        yaw = rng.uniform(0, math.pi)
        r = float(np.max(hs)) * 1.6 + 0.3
        lo = [max(0, int((c[a] - r - ORIGIN[a]) / V)) for a in range(3)]
        hi = [min(SHAPE[a], int((c[a] + r - ORIGIN[a]) / V) + 2) for a in range(3)]
        x = XS[lo[0]:hi[0]][:, None, None]
        y = YS[lo[1]:hi[1]][None, :, None]
        z = ZS[lo[2]:hi[2]][None, None, :]
        b = fx.rounded_box(x, y, z, c, hs, yaw, float(min(hs)) * 0.45)
        sub = d[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]]
        d[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]] = fx.smin(sub, b, 0.25)
    return len(placed)


# ------------------------------------------------------------------------------------------------------------- meshy
def gltf_matrix(inst, scale):
    """An instance's transform in glTF axes: world = T(at, lift) · Ry(yaw) · S(scale) · native"""
    native, world = inst['align']
    lift = world - native * scale
    yaw = math.radians(inst['yaw'])
    c, s = math.cos(yaw), math.sin(yaw)
    return np.array([
        [c * scale, 0, s * scale, inst['at'][0]],
        [0, scale, 0, lift],
        [-s * scale, 0, c * scale, inst['at'][1]],
        [0, 0, 0, 1],
    ], np.float64)


# how thin a part of a piece has to be to count as vegetation (world units)
OPEN = 0.12
OPENED = {}

# glTF (x, y, z) ↔ Blender (x, -z, y)
C = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], np.float64)


def load_pieces():
    """Each kit piece once, as imported (its materials for baking), and its triangles in its own glTF axes"""
    M = D['meshy']
    pieces = {}
    for name in sorted({i['piece'] for i in M['instances']}):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, M['dir'], name + '.glb'), merge_vertices=True)
        new = [o for o in bpy.data.objects if o not in before]
        ob = [o for o in new if o.type == 'MESH'][0]
        for o in new:
            if o is not ob:
                bpy.data.objects.remove(o, do_unlink=True)
        ob.data.transform(ob.matrix_world)
        ob.matrix_world = Matrix.Identity(4)
        me = ob.data
        co = np.zeros(len(me.vertices) * 3, F)
        me.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        tri = np.zeros(len(me.loops), np.int32)
        me.loops.foreach_get('vertex_index', tri)
        assert len(me.loops) == 3 * len(me.polygons), f'{name}: not all triangles'
        pieces[name] = {'object': ob, 'points': np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1), 'tris': tri.reshape(-1, 3)}
        ob.hide_render = True
        ob.hide_set(True)
        log('piece', name, f'{len(tri) // 3:,} tris')
    return pieces


def open_piece(piece, scale):
    """A piece's solid without its thin parts (grass blades, flowers): its distance field eroded then dilated by OPEN
    (world units), as a mesh in its own axes; and which of its triangles lie outside that solid (its vegetation)"""
    vn = V / scale
    r = OPEN / scale
    hw = 8.0
    xf = vdb.createLinearTransform(voxelSize=vn)
    ls = vdb.FloatGrid.createLevelSetFromPolygons(piece['points'], triangles=piece['tris'].astype(np.uint32), transform=xf, halfWidth=hw)
    p, t, q = ls.convertToPolygons(isovalue=-r, adaptivity=0.0)
    eroded = vdb.FloatGrid.createLevelSetFromPolygons(p, triangles=t.astype(np.uint32), quads=q.astype(np.uint32), transform=xf, halfWidth=hw)
    p, t, q = eroded.convertToPolygons(isovalue=r, adaptivity=0.0)
    tris = np.concatenate([t.astype(np.int64), q[:, [0, 1, 2]].astype(np.int64), q[:, [0, 2, 3]].astype(np.int64)])
    opened = vdb.FloatGrid.createLevelSetFromPolygons(p, triangles=tris.astype(np.uint32), transform=xf, halfWidth=hw)
    # each original triangle's distance from the opened solid, at its centroid
    lo = np.floor(piece['points'].min(0) / vn).astype(int) - 10
    hi = np.ceil(piece['points'].max(0) / vn).astype(int) + 10
    dense = np.zeros(tuple(hi - lo + 1), F)
    opened.copyToArray(dense, ijk=tuple(int(v) for v in lo))
    cen = piece['points'][piece['tris']].mean(1)
    dist = fx.sample(dense, lo * vn, vn, cen) * scale
    veg = dist > 0.035
    return {'points': p.astype(F), 'tris': tris, 'veg': veg}


def place_instances(pieces, opened=True):
    """Every instance: a linked copy of its piece at its transform (for baking), and (opened) the world-space
    triangles of its solid without its vegetation"""
    M = D['meshy']
    out = []
    for inst in M['instances']:
        piece = pieces[inst['piece']]
        scale = inst.get('scale', M['scale'])
        m = gltf_matrix(inst, scale)
        ob = piece['object'].copy()
        ob.name = inst['id']
        bpy.context.scene.collection.objects.link(ob)
        ob.matrix_world = Matrix((C @ m @ np.linalg.inv(C)).tolist())
        ob.hide_render = False
        ob.hide_set(False)
        placed = {**inst, 'matrix': m, 'object': ob}
        if opened:
            key = (inst['piece'], scale)
            if key not in OPENED:
                OPENED[key] = open_piece(piece, scale)
                log('opened', inst['piece'], f"vegetation {OPENED[key]['veg'].sum():,} of {len(piece['tris']):,} tris")
            op = OPENED[key]
            placed.update(points=(op['points'] @ m[:3, :3].T + m[:3, 3]).astype(F), tris=op['tris'], veg=op['veg'])
        out.append(placed)
    return out


def meshy_field(instances):
    """The union of the instances' distance fields, on the grid (beyond their band: the band's width)"""
    band = D['meshy']['blend'] * 1.5 + 4 * V
    hw = band / V
    d = np.full(SHAPE, band, F)
    for inst in instances:
        ls = vdb.FloatGrid.createLevelSetFromPolygons(
            inst['points'], triangles=inst['tris'].astype(np.uint32), transform=vdb.createLinearTransform(voxelSize=V), halfWidth=hw
        )
        lo = np.floor(inst['points'].min(0) / V).astype(int) - int(hw) - 2
        hi = np.ceil(inst['points'].max(0) / V).astype(int) + int(hw) + 2
        lo = np.maximum(lo, I0)
        hi = np.minimum(hi, I1)
        sub = np.zeros(tuple(hi - lo + 1), F)
        ls.copyToArray(sub, ijk=tuple(int(v) for v in lo))
        a = lo - np.array(I0)
        b = a + sub.shape
        d[a[0]:b[0], a[1]:b[1], a[2]:b[2]] = np.minimum(d[a[0]:b[0], a[1]:b[1], a[2]:b[2]], np.clip(sub, -band, band))
        log('instance field', inst['id'])
    return d


# -------------------------------------------------------------------------------------------------------------- mesh
def mesh_from_field(d, band=None):
    """The zero surface of a field, as points (glTF world) and triangles"""
    band = band or 4 * V
    g = vdb.FloatGrid(background=band)
    g.copyFromArray(np.clip(d, -band, band), ijk=tuple(I0), tolerance=0)
    g.transform = vdb.createLinearTransform(voxelSize=V)
    g.gridClass = vdb.GridClass.LEVEL_SET
    pts, tris, quads = g.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    faces = np.concatenate([tris.astype(np.int64), quads[:, [0, 1, 2]].astype(np.int64), quads[:, [0, 2, 3]].astype(np.int64)])
    return pts.astype(F), faces


def to_blender(p):
    """glTF (x, y, z) → Blender (x, -z, y)"""
    return np.stack([p[:, 0], -p[:, 2], p[:, 1]], 1)


def blender_mesh(name, pts, faces):
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(pts))
    me.vertices.foreach_set('co', to_blender(pts).ravel())
    me.loops.add(faces.size)
    me.loops.foreach_set('vertex_index', faces.ravel().astype(np.int32))
    me.polygons.add(len(faces))
    me.polygons.foreach_set('loop_start', (np.arange(len(faces)) * 3).astype(np.int32))
    me.update(calc_edges=True)
    me.validate()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    # the surface should face out of the land: the top's normals point up
    n = np.zeros(len(me.polygons) * 3, F)
    me.polygons.foreach_get('normal', n)
    if n.reshape(-1, 3)[:, 2].mean() < 0:
        me.flip_normals()
    me.shade_smooth()
    return ob


def vertex_data(ob):
    me = ob.data
    co = np.zeros(len(me.vertices) * 3, F)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    no = np.zeros(len(me.vertices) * 3, F)
    me.vertices.foreach_get('normal', no)
    no = no.reshape(-1, 3)
    # back to glTF axes
    return np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1), np.stack([no[:, 0], no[:, 2], -no[:, 1]], 1)


# ----------------------------------------------------------------------------------------------------------- preview
def preview_paint(ob, d, path, d_meshy=None):
    p, n = vertex_data(ob)
    lap = laplacian(d)
    curv = fx.sample(lap, ORIGIN, V, p)
    up = n[:, 1]
    on_path = fx.sample2(path['s'], (XS[0], ZS[0]), V, p[:, 0], p[:, 2]) < 0
    rock = np.array([0.55, 0.42, 0.55], F)
    light = np.array([0.88, 0.70, 0.78], F)
    dark = np.array([0.36, 0.26, 0.38], F)
    grass = np.array([0.55, 0.72, 0.16], F)
    tile = np.array([0.80, 0.48, 0.40], F)
    c = rock + (light - rock) * np.clip(curv * 0.12, 0, 1)[:, None] + (dark - rock) * np.clip(-curv * 0.12, 0, 1)[:, None]
    flat = smoothstep(0.72, 0.85, up)[:, None]
    top = np.where(on_path[:, None], tile, grass)
    c = c + (top - c) * flat
    if d_meshy is not None:
        # where the surface is a Meshy piece's: tinted, to see what came from where
        m = 1 - smoothstep(0.05, 0.4, np.abs(fx.sample(d_meshy, ORIGIN, V, p)))
        c = c + (np.array([0.95, 0.55, 0.2], F) - c) * (m * 0.45)[:, None]
    c = np.clip(c, 0, 1)
    attr = ob.data.color_attributes.new('paint', 'FLOAT_COLOR', 'POINT')
    attr.data.foreach_set('color', np.concatenate([c, np.ones((len(c), 1), F)], 1).ravel())
    mat = bpy.data.materials.new('paint')
    mat.use_nodes = True
    nt = mat.node_tree
    a = nt.nodes.new('ShaderNodeVertexColor')
    a.layer_name = 'paint'
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.85
    nt.links.new(a.outputs['Color'], bsdf.inputs['Base Color'])
    ob.data.materials.append(mat)


def laplacian(d):
    out = np.zeros_like(d)
    out[1:-1, 1:-1, 1:-1] = (
        d[2:, 1:-1, 1:-1] + d[:-2, 1:-1, 1:-1] + d[1:-1, 2:, 1:-1] + d[1:-1, :-2, 1:-1] + d[1:-1, 1:-1, 2:] + d[1:-1, 1:-1, :-2]
        - 6 * d[1:-1, 1:-1, 1:-1]
    ) / (V * V)
    return out


def render_views(obs, out_dir, tag):
    sc = bpy.context.scene
    if sc.camera is None:
        stage()
    cam = sc.camera
    sea = bpy.data.objects['sea']
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and ob is not sea:
            ob.hide_render = ob not in obs
    for name, az, el, scale, target in VIEWS:
        cam.data.ortho_scale = scale
        # glTF azimuth 45 (camera at +x, +z) is Blender (+x, -y)
        tx, ty, tz = target
        tb = Vector((tx, -tz, ty))
        dir_ = Vector((math.cos(math.radians(el)) * math.sin(math.radians(az)), -math.cos(math.radians(el)) * math.cos(math.radians(az)), math.sin(math.radians(el))))
        cam.location = tb + dir_ * 100
        cam.rotation_euler = (-dir_).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out_dir, f'{tag}-{name}.png')
        bpy.ops.render.render(write_still=True)


VIEWS = (
    ('top', 0, 89.5, 56, (-1, 0, 1)),
    ('iso', 45, 35, 58, (0, 0, 0)),
    ('back', 225, 35, 58, (0, 0, 0)),
    ('west', 315, 30, 58, (0, 0, 0)),
    ('close', 45, 35, 20, (5, 2, 3)),
)


def stage():
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.16, 0.42, 0.6, 1)
    bg.inputs[1].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(48), 0, math.radians(35))
    sc.collection.objects.link(sun)
    sea = bpy.data.objects.new('sea', bpy.data.meshes.new('sea'))
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=80)
    bm.to_mesh(sea.data)
    bm.free()
    sm = bpy.data.materials.new('sea')
    sm.use_nodes = True
    sm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.1, 0.45, 0.55, 1)
    sm.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.75
    sea.data.materials.append(sm)
    sc.collection.objects.link(sea)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.clip_end = 300


def veg_debug(g, out_dir):
    """Each piece split in two, side by side: what joins the terrain (left) and what stays as vegetation (right)"""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    for (name, scale), op in OPENED.items():
        src = g['pieces'][name]['object']
        for keep_veg, dx in ((False, -1.1), (True, 1.1)):
            ob = src.copy()
            ob.data = src.data.copy()
            sc.collection.objects.link(ob)
            bm = bmesh.new()
            bm.from_mesh(ob.data)
            bm.faces.ensure_lookup_table()
            gone = [f for f, v in zip(bm.faces, op['veg']) if bool(v) != keep_veg]
            bmesh.ops.delete(bm, geom=gone, context='FACES')
            bm.to_mesh(ob.data)
            bm.free()
            ob.location = (dx, 0, 0)
            ob.hide_render = False
            ob.hide_set(False)
            ob['debug'] = name
    for ob in bpy.data.objects:
        if ob.type == 'MESH':
            ob.hide_render = ob.get('debug') is None
    stage()
    cam = sc.camera
    cam.data.ortho_scale = 4.6
    sc.render.resolution_x, sc.render.resolution_y = 1400, 700
    bpy.data.objects['sea'].hide_render = True
    for name in sorted({n for n, _ in OPENED}):
        for ob in bpy.data.objects:
            if ob.get('debug') is not None:
                ob.hide_render = ob['debug'] != name
        d = Vector((0.6, -0.6, 0.55)).normalized()
        cam.location = d * 20
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out_dir, f'{name}.png')
        bpy.ops.render.render(write_still=True)


def preview(g, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    preview_paint(g['found'], g['d_found'], g['path'])
    preview_paint(g['hybrid'], g['d_hybrid'], g['path'], g['d_meshy'])
    for i in g['instances']:
        i['object'].hide_render = True
    render_views([g['found']], out_dir, 'foundation')
    render_views([g['hybrid']], out_dir, 'hybrid')
    render_views([g['found']] + [i['object'] for i in g['instances']], out_dir, 'pieces')
    log('preview rendered to', out_dir)


# ------------------------------------------------------------------------------------------------------ stages
STAGES = ['geometry', 'bake-foundation', 'bake-hybrid-pieces', 'bake-hybrid-paint', 'compose']
# free space each stage wants before it starts (GB): its own outputs, Cycles' scratch, and room for the system to swap
NEEDS = {'geometry': 4, 'bake-foundation': 5, 'bake-hybrid-paint': 5, 'bake-hybrid-pieces': 6, 'compose': 4}
TARGET = {'foundation': 420_000, 'hybrid': 480_000}
FOLIAGE_RATIO = 0.35
ATLAS = 4096
DESIGN = hashlib.sha256(open(os.path.join(HERE, 'island.json'), 'rb').read()).hexdigest()[:16]


def free_gb():
    return shutil.disk_usage(ROOT).free / 1e9


def need_space(gb, what):
    """Stops cleanly (exit 3, nothing more written) if the disk has less than gb free"""
    free = free_gb()
    if free < gb:
        log(f'STOPPED before {what}: {free:.1f} GB free, {gb} GB wanted. Free some space and run again; finished stages are kept.')
        sys.exit(3)
    log(f'{free:.1f} GB free ({gb} GB wanted for {what})')


def stamp(stage):
    return os.path.join(WORK, f'{stage}.done')


def done(stage):
    try:
        return open(stamp(stage)).read().strip() == DESIGN
    except OSError:
        return False


def mark(stage):
    with open(stamp(stage), 'w') as f:
        f.write(DESIGN)


def work(name):
    return os.path.join(WORK, name)


def save_image(img, name):
    img.filepath_raw = work(name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def load_image(name, colour):
    img = bpy.data.images.load(work(name + '.png'))
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    return img


def build_geometry():
    """The fields, the foundation and hybrid surfaces (full resolution), and the pieces placed"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    g = {}
    g['coast'] = coast_field()
    g['path'] = path_fields()
    g['levels'] = level_fields(g['coast'], g['path'])
    g['blocks'] = block_fields()
    log('2D fields')
    g['d_found'] = foundation_field(g['coast'], g['levels'], g['path'], g['blocks'])
    log('foundation field')
    log('boulders', add_boulders(g['d_found'], g['coast']))
    pts, faces = mesh_from_field(g['d_found'])
    log('foundation mesh', f'{len(faces):,} tris')
    g['found'] = blender_mesh('foundation', pts, faces)
    g['pieces'] = load_pieces()
    g['instances'] = place_instances(g['pieces'])
    return g


def add_hybrid(g):
    g['d_meshy'] = meshy_field(g['instances'])
    g['d_hybrid'] = fx.smin(g['d_found'], g['d_meshy'], D['meshy']['blend'])
    log('hybrid field')
    pts, faces = mesh_from_field(g['d_hybrid'])
    log('hybrid mesh', f'{len(faces):,} tris')
    g['hybrid'] = blender_mesh('hybrid', pts, faces)


def placeholder(ob):
    m = bpy.data.materials.new(ob.name + '-bake')
    m.use_nodes = True
    ob.data.materials.clear()
    ob.data.materials.append(m)


def stage_geometry():
    """The surfaces, their paint fields, the reduced and unwrapped meshes and their blend fields, and where foliage
    may go: work/geometry.blend (no pieces: later stages import them again) and work/geometry.npz"""
    import paint

    B = D['blocks']
    g = build_geometry()
    add_hybrid(g)

    def cells(p):
        """Each block's tint: a hash of its column and its course"""
        _, cid = fx.voronoi(p[:, 0], p[:, 2], B['column'], B['seed'], jitter=1.0)
        phase = fx.id_hash(cid, 3) * B['course']
        course = np.round((p[:, 1] - phase) / B['course']).astype(np.int64)
        return fx.hash2(cid, course + 500, 9)

    def noise01(x, z, scale, seed):
        return fx.fbm(x, z, scale, seed) * 0.5 + 0.5

    def sample2d(grid, x, z):
        return fx.sample2(grid, (XS[0], ZS[0]), V, x, z)

    fields = {}
    for ob, d in ((g['found'], g['d_found']), (g['hybrid'], g['d_hybrid'])):
        p, n = vertex_data(ob)
        f = paint.surface_fields(p, n, lambda q, d=d: fx.sample(d, ORIGIN, V, q.astype(F)), sample2d, g['path']['s'], cells, noise01)
        for k, v in f.items():
            paint.set_attr(ob.data, k, v)
        fields[ob.name] = (p, f)
    log('paint fields')
    proc = paint.procedural_material()
    for ob in (g['found'], g['hybrid']):
        ob.data.materials.clear()
        ob.data.materials.append(proc)
    low_f = paint.low_poly(g['found'], 'terrain-foundation', TARGET['foundation'])
    placeholder(low_f)
    log('foundation reduced', f'{len(low_f.data.polygons):,} tris')
    low_h = paint.low_poly(g['hybrid'], 'terrain-hybrid', TARGET['hybrid'])
    placeholder(low_h)
    log('hybrid reduced', f'{len(low_h.data.polygons):,} tris')
    # the blend: a piece's texture where the surface is that piece's, fading over the fillet; contact shade in the joins
    lp, _ = vertex_data(low_h)
    dm = fx.sample(g['d_meshy'], ORIGIN, V, lp)
    df = fx.sample(g['d_found'], ORIGIN, V, lp)
    paint.set_attr(low_h.data, 'meshy', 1 - paint.smoothstep(0.05, 0.28, np.abs(dm)))
    paint.set_attr(low_h.data, 'crease', paint.smoothstep(0.02, 0.14, np.minimum(df, dm)))
    # where foliage may be scattered: the hybrid's grass, well away from the pieces, spread out
    hp, hf = fields['hybrid']
    far = np.abs(fx.sample(g['d_meshy'], ORIGIN, V, hp)) > 0.8
    cand = np.flatnonzero((hf['grass'] > 0.85) & far & (hf['ao'] > 0.8))
    rng = np.random.default_rng(7)
    rng.shuffle(cand)
    spots = []
    for i in cand:
        q = hp[i]
        if any(np.hypot(q[0] - s[0], q[2] - s[2]) < 1.9 for s in spots):
            continue
        spots.append(q)
        if len(spots) >= 120:
            break
    np.savez_compressed(
        work('geometry.npz'),
        spots=np.array(spots, F),
        **{f'veg::{name}::{scale}': op['veg'] for (name, scale), op in OPENED.items()},
    )
    with open(work('geometry.json'), 'w') as f:
        json.dump({k: len(g[k].data.polygons) for k in ('found', 'hybrid')} | {'low_f': len(low_f.data.polygons), 'low_h': len(low_h.data.polygons)}, f)
    # the pieces leave: later stages import them again from the originals
    for inst in g['instances']:
        bpy.data.objects.remove(inst['object'], do_unlink=True)
    for piece in g['pieces'].values():
        bpy.data.objects.remove(piece['object'], do_unlink=True)
    bpy.data.orphans_purge(do_recursive=True)
    need_space(2, 'saving geometry.blend')
    bpy.ops.wm.save_as_mainfile(filepath=work('geometry.blend'), compress=True)
    log('saved geometry.blend', f"{os.path.getsize(work('geometry.blend')) / 1e6:.0f} MB")


def open_geometry():
    bpy.ops.wm.open_mainfile(filepath=work('geometry.blend'))
    return {n: bpy.data.objects[n] for n in ('foundation', 'hybrid', 'terrain-foundation', 'terrain-hybrid')}


def drop(*obs):
    for ob in obs:
        bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.orphans_purge(do_recursive=True)


def baking(name, low, sources, kind, colour, **kw):
    import paint

    need_space(NEEDS['bake-foundation'], 'baking ' + name)
    img = paint.bake(low, sources, kind, ATLAS, name, log, colour=colour, **kw)
    save_image(img, name)
    bpy.data.images.remove(img)


def stage_bake_foundation():
    import paint

    o = open_geometry()
    drop(o['hybrid'], o['terrain-hybrid'])
    paint.cycles(log)
    low, high = o['terrain-foundation'], o['foundation']
    baking('foundation-color', low, [high], 'DIFFUSE', True, pass_filter={'COLOR'}, extrusion=0.08, reach=0.25)
    baking('foundation-normal', low, [high], 'NORMAL', False, extrusion=0.08, reach=0.25, normal_space='TANGENT')


def stage_bake_hybrid_paint():
    import paint

    o = open_geometry()
    drop(o['foundation'], o['terrain-foundation'])
    paint.cycles(log)
    low, high = o['terrain-hybrid'], o['hybrid']
    baking('hybrid-paint-color', low, [high], 'DIFFUSE', True, pass_filter={'COLOR'}, extrusion=0.08, reach=0.25)
    baking('hybrid-paint-normal', low, [high], 'NORMAL', False, extrusion=0.08, reach=0.25, normal_space='TANGENT')
    drop(high)
    for name in ('meshy', 'crease'):
        low.data.materials.clear()
        low.data.materials.append(paint.emission_material('show-' + name, name))
        baking('hybrid-' + name, low, [], 'EMIT', False)


def stage_bake_hybrid_pieces():
    import paint

    o = open_geometry()
    drop(o['foundation'], o['terrain-foundation'], o['hybrid'])
    pieces = load_pieces()
    instances = place_instances(pieces, opened=False)
    paint.cycles(log)
    obs = [i['object'] for i in instances]
    low = o['terrain-hybrid']
    baking('hybrid-meshy-color', low, obs, 'DIFFUSE', True, pass_filter={'COLOR'}, extrusion=0.12, reach=0.45)
    baking('hybrid-meshy-normal', low, obs, 'NORMAL', False, extrusion=0.12, reach=0.45, normal_space='TANGENT')


def stage_compose():
    """The textures blended and the GLBs written: the foundation, the hybrid, the hybrid's foliage; and the report"""
    import foliage as fol
    import paint

    M = D['meshy']
    geo = json.load(open(work('geometry.json')))
    npz = np.load(work('geometry.npz'))
    o = open_geometry()
    drop(o['foundation'], o['hybrid'])
    os.makedirs(OUT, exist_ok=True)

    def finish(low, colour, normal):
        colour.pack()
        normal.pack()
        low.data.materials.clear()
        low.data.materials.append(paint.final_material(low.name, colour, normal))

    finish(o['terrain-foundation'], load_image('foundation-color', True), load_image('foundation-normal', False))

    # the hybrid: a texel takes the pieces' texture where the surface is theirs and their bake hit something
    meshy = paint.pixels(load_image('hybrid-meshy', False))[..., 0]
    crease = paint.pixels(load_image('hybrid-crease', False))[..., 0]
    a = paint.pixels(load_image('hybrid-meshy-color', True))
    b = paint.pixels(load_image('hybrid-paint-color', True))
    w = (meshy * (a[..., :3].sum(-1) > 1e-4))[..., None]
    colour = b * (1 - w) + a * w
    del a, b
    colour[..., :3] *= 1 - 0.22 * crease[..., None]
    colour[..., 3] = 1
    hc = bpy.data.images.new('hybrid-color', ATLAS, ATLAS, alpha=False)
    paint.put(hc, colour)
    del colour
    a = paint.pixels(load_image('hybrid-meshy-normal', False))[..., :3] * 2 - 1
    b = paint.pixels(load_image('hybrid-paint-normal', False))[..., :3] * 2 - 1
    nrm = b * (1 - w) + a * w
    del a, b
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True) + 1e-6
    hn = bpy.data.images.new('hybrid-normal', ATLAS, ATLAS, alpha=False)
    hn.colorspace_settings.name = 'Non-Color'
    paint.put(hn, np.concatenate([nrm * 0.5 + 0.5, np.ones(nrm.shape[:2] + (1,), F)], -1))
    del nrm
    finish(o['terrain-hybrid'], hc, hn)
    from_pieces = float((meshy > 0.5).mean())
    log('blended', f'{from_pieces * 100:.0f}% of the atlas from the pieces')

    # vegetation: each piece's tufts and flowers with its instances, and scattered over the foundation's grass
    pieces = load_pieces()
    instances = place_instances(pieces, opened=False)
    for i in instances:
        i['object'].hide_render = True
        i['object'].hide_set(True)
    protos = {}
    parts_by_piece = {}
    for name, piece in pieces.items():
        scale = next(i.get('scale', M['scale']) for i in M['instances'] if i['piece'] == name)
        fob, parts = fol.piece_foliage(piece, npz[f'veg::{name}::{scale}'], scale, log)
        fob.data.materials.clear()
        fob.data.materials.append(fol.foliage_material(piece['object'].data.materials[0], name + '-foliage'))
        fob.hide_render = True
        protos[name] = fob
        parts_by_piece[name] = (piece['object'], parts)
    foliage_obs = []
    for inst in instances:
        ob = protos[inst['piece']].copy()
        ob.name = inst['id'] + '-foliage'
        bpy.context.scene.collection.objects.link(ob)
        ob.matrix_world = Matrix((C @ inst['matrix'] @ np.linalg.inv(C)).tolist())
        foliage_obs.append(ob)
    rng = np.random.default_rng(7)
    names = [n for n, (_, parts) in parts_by_piece.items() if parts]
    spots = [{'at': q, 'piece': names[rng.integers(len(names))], 'flower': rng.random() < 0.22} for q in npz['spots']]
    scattered = fol.scatter(parts_by_piece, spots, lambda name: M['scale'], rng, C, log)
    for ob in scattered:
        ob.data.materials.clear()
        ob.data.materials.append(protos[ob.name.replace('-scatter', '')].data.materials[0])
    foliage_obs += scattered
    by_mat = {}
    for ob in foliage_obs:
        by_mat.setdefault(ob.data.materials[0].name, []).append(ob)
    joined = []
    for mat_name, obs in by_mat.items():
        ob = fol.join(obs, mat_name)
        # Meshy's blades are far denser than they need to be at this size: reduced on export
        dec = ob.modifiers.new('reduce', 'DECIMATE')
        dec.decimate_type = 'COLLAPSE'
        dec.ratio = FOLIAGE_RATIO
        joined.append(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    foliage_tris = sum(len(o.evaluated_get(dg).data.polygons) for o in joined)
    log('foliage', f'{foliage_tris:,} tris')

    need_space(NEEDS['compose'], 'writing the GLBs')
    paint.export([o['terrain-foundation']], os.path.join(OUT, 'foundation.glb'), log)
    paint.export([o['terrain-hybrid']], os.path.join(OUT, 'hybrid.glb'), log)
    paint.export(joined, os.path.join(OUT, 'hybrid-foliage.glb'), log)

    def placement(inst):
        native, world = inst['align']
        s = inst.get('scale', M['scale'])
        return {
            'id': inst['id'],
            'file': '/' + os.path.relpath(os.path.join(ROOT, M['dir'], inst['piece'] + '.glb'), os.path.join(ROOT, 'public')),
            'position': [inst['at'][0], world - native * s, inst['at'][1]],
            'yaw': inst['yaw'],
            'scale': s,
        }

    report = {
        'design': 'scripts/environment/terrain-lab/island.json',
        'voxel': V,
        'grid': list(SHAPE),
        'foundation': {'highTriangles': geo['found'], 'triangles': geo['low_f'], 'file': 'foundation.glb'},
        'hybrid': {
            'highTriangles': geo['hybrid'],
            'triangles': geo['low_h'],
            'file': 'hybrid.glb',
            'foliage': 'hybrid-foliage.glb',
            'foliageTriangles': foliage_tris,
            'scattered': len(spots),
            'blend': M['blend'],
            'fromPieces': round(from_pieces, 3),
        },
        'atlas': ATLAS,
        'pieces': [placement(i) for i in M['instances']],
    }
    with open(os.path.join(OUT, 'report.json'), 'w') as f:
        json.dump(report, f, indent=2)


RUN = {
    'geometry': stage_geometry,
    'bake-foundation': stage_bake_foundation,
    'bake-hybrid-paint': stage_bake_hybrid_paint,
    'bake-hybrid-pieces': stage_bake_hybrid_pieces,
    'compose': stage_compose,
}


def status():
    for st in STAGES:
        log(f"{st:20s} {'done' if done(st) else 'to do'}")
    log(f'{free_gb():.1f} GB free; work/ holds {sum(os.path.getsize(work(f)) for f in os.listdir(WORK)) / 1e9 if os.path.isdir(WORK) else 0:.2f} GB')


# -------------------------------------------------------------------------------------------------------------- main
os.makedirs(WORK, exist_ok=True)
if '--status' in ARGS:
    status()
elif PREVIEW or '--veg-debug' in ARGS:
    g = build_geometry()
    if '--veg-debug' in ARGS:
        veg_debug(g, arg('--veg-debug'))
    else:
        add_hybrid(g)
        preview(g, PREVIEW)
elif arg('--stage'):
    # one stage, in this process
    st = arg('--stage')
    need_space(NEEDS[st], st)
    RUN[st]()
    mark(st)
    log(st, 'done')
else:
    # every stage that isn't done (or from --from on), each in a Blender of its own
    start = STAGES.index(arg('--from')) if arg('--from') else None
    for i, st in enumerate(STAGES):
        if (start is None and done(st)) or (start is not None and i < start):
            log(st, 'already done')
            continue
        need_space(NEEDS[st], st)
        log('stage', st)
        r = subprocess.run([bpy.app.binary_path, '-b', '--factory-startup', '--python', __file__, '--', '--stage', st])
        if r.returncode != 0:
            log(f'stage {st} stopped (exit {r.returncode}); finished stages are kept, run again to resume')
            sys.exit(r.returncode)
    log('all stages done')
