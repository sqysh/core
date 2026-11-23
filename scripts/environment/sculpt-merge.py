# Merges two Meshy granite cliffs into one continuous formation, in Blender:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/environment/sculpt-merge.py
#
# The two cliffs are set side by side exactly as the harbor builder sets them in the world (scaled to their world
# size, sunk the same share of their height under the water) and overlapping, then made one piece of rock:
#
#   1. fused: both are remeshed together as one volume (voxel remesh), so where they overlap there is no longer two
#      surfaces passing through each other but one surface round the union of both
#   2. cut: everything below the sea floor goes (the painted water plates and the hidden base)
#   3. sculpted: the crease where the two rock masses meet is filleted, a weighted smoothing that pulls the junction
#      into one continuous slope of rock instead of a hard V, fading out away from it
#   4. reduced: decimated to a game budget, then unwrapped (one UV atlas for the whole formation)
#   5. baked: colour, roughness and normals are baked from the original two cliffs (Cycles, selected to active), so the
#      Meshy texture, its matte granite colours and the surface detail the remesh and decimation smoothed away carry
#      over onto the new surface
#
# The originals are only read. The result goes to public/models/environment-derived/sculpted/, with a report.

import bmesh
import bpy
import json
import math
import os
import sys
import time
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'public', 'models', 'environment', 'terrain')
OUT_DIR = os.path.join(ROOT, 'public', 'models', 'environment-derived', 'sculpted')
OUT = os.path.join(OUT_DIR, 'back-cliffs-merged-01.glb')

# The pair, as the harbor builder places land (glTF axes, world units): each scaled so its wider side is `size` units,
# its box's middle over (x, z), sunk so `sink` of its height is under the water (y = 0)
PAIR = [
    {'file': 'granite-cliff-stepped-tall-01.glb', 'size': 11.0, 'x': -5.0, 'z': 0.0, 'sink': 0.22},
    {'file': 'sheer-granite-cliff-tall-01.glb', 'size': 12.0, 'x': 5.3, 'z': 0.3, 'sink': 0.22},
]
VOXEL = 0.03          # world units: about the original models' own triangle size at world scale
SEA_FLOOR = -0.6      # cut here: the floor of the harbor's shallows, so the cut edge sits in the sand under the water
FILLET = 0.9          # how far either side of the junction the fillet reaches (world units)
FILLET_PASSES = 24
TARGET_TRIS = 500_000
ATLAS = 4096          # colour and normals; roughness at half
ROUGH = 2048

t0 = time.time()
def log(*a):
    print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Blender is Z-up: glTF (x, y, z) is Blender (x, -z, y)
def to_blender(x, y, z):
    return Vector((x, -z, y))

def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    assert len(meshes) == 1, f'{path}: {len(meshes)} meshes'
    obj = meshes[0]
    # bake its import transform into its data, so the object sits at the origin with identity transform
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    for o in new:
        if o is not obj:
            bpy.data.objects.remove(o, do_unlink=True)
    return obj

# 1. the two cliffs, set as the builder sets them
sources = []
for p in PAIR:
    obj = import_glb(os.path.join(SRC, p['file']))
    vs = [v.co for v in obj.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    size = hi - lo
    # glTF width = max(x, z) = Blender max(x, y); glTF height = Blender z
    s = p['size'] / max(size.x, size.y)
    height = size.z * s
    centre = (lo + hi) / 2
    target = to_blender(p['x'], -lo.z * s - height * p['sink'], p['z'])
    m = Matrix.Translation(Vector((target.x - centre.x * s, target.y - centre.y * s, target.z))) @ Matrix.Diagonal((s, s, s, 1))
    obj.data.transform(m)
    obj.data.update()
    obj.name = p['file'].replace('.glb', '')
    p['scale'] = s
    p['height'] = height
    p['triangles'] = sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
    sources.append(obj)
    log('placed', obj.name, f'scale {s:.3f}, height {height:.2f}, {p["triangles"]:,} tris')

# 2. fused: one volume round both
bm = bmesh.new()
for o in sources:
    bm.from_mesh(o.data)
fused_mesh = bpy.data.meshes.new('formation')
bm.to_mesh(fused_mesh)
bm.free()
formation = bpy.data.objects.new('back-cliffs-merged', fused_mesh)
scene.collection.objects.link(formation)
remesh = formation.modifiers.new('fuse', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = VOXEL
remesh.adaptivity = 0
remesh.use_smooth_shade = True
depsgraph = bpy.context.evaluated_depsgraph_get()
fused = bpy.data.meshes.new_from_object(formation.evaluated_get(depsgraph))
formation.modifiers.clear()
old = formation.data
formation.data = fused
bpy.data.meshes.remove(old)
log('fused by voxel remesh:', f'{len(fused.polygons):,} faces')

# 3. cut at the sea floor
bm = bmesh.new()
bm.from_mesh(fused)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, SEA_FLOOR), plane_no=(0, 0, 1), clear_inner=True)

# 4. the fillet: vertices near both cliffs' surfaces are the junction; smooth them, fading out over FILLET
trees = []
for o in sources:
    sbm = bmesh.new()
    sbm.from_mesh(o.data)
    trees.append(BVHTree.FromBMesh(sbm))
    sbm.free()
def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
weights = {}
for v in bm.verts:
    d = []
    for tree in trees:
        hit = tree.find_nearest(v.co, FILLET * 2)
        d.append(hit[3] if hit[0] is not None else FILLET * 2)
    # on the junction both cliffs are near; away from it, the farther one is far
    w = 1 - smoothstep(0, FILLET, max(d))
    if w > 0.01:
        weights[v] = w
log('fillet: junction vertices', f'{len(weights):,}')
moved = 0.0
for _ in range(FILLET_PASSES):
    target = {}
    for v, w in weights.items():
        ns = [e.other_vert(v).co for e in v.link_edges]
        if not ns:
            continue
        avg = sum(ns, Vector()) / len(ns)
        target[v] = v.co.lerp(avg, 0.5 * w)
    for v, co in target.items():
        moved = max(moved, (co - v.co).length)
        v.co = co
bm.normal_update()
bm.to_mesh(fused)
bm.free()
fused.update()
log('fillet done')

# 5. reduced to the budget, then unwrapped
tris_now = sum(len(p.vertices) - 2 for p in fused.polygons)
dec = formation.modifiers.new('reduce', 'DECIMATE')
dec.decimate_type = 'COLLAPSE'
dec.ratio = min(1.0, TARGET_TRIS / tris_now)
dec.use_collapse_triangulate = True
depsgraph = bpy.context.evaluated_depsgraph_get()
reduced = bpy.data.meshes.new_from_object(formation.evaluated_get(depsgraph))
formation.modifiers.clear()
old = formation.data
formation.data = reduced
bpy.data.meshes.remove(old)
for poly in reduced.polygons:
    poly.use_smooth = True
result_tris = sum(len(p.vertices) - 2 for p in reduced.polygons)
log('decimated', f'{tris_now:,} → {result_tris:,} tris')

bpy.ops.object.select_all(action='DESELECT')
formation.select_set(True)
bpy.context.view_layer.objects.active = formation
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0015, area_weight=0.0, scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
log('unwrapped')

# 6. baked from the originals
scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = 'GPU'
    log('baking on', [d.name for d in prefs.devices if d.use])
except Exception as e:  # CPU is fine, only slower
    log('baking on the CPU:', e)
scene.cycles.samples = 1
scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = 0.06
scene.render.bake.max_ray_distance = 0.6
scene.render.bake.margin = 12

mat = bpy.data.materials.new('back-cliffs-merged')
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
bsdf = nodes.get('Principled BSDF')
bsdf.inputs['Metallic'].default_value = 0.0
def image_node(name, size, colour):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    n = nodes.new('ShaderNodeTexImage')
    n.image = img
    return n
base = image_node('back-cliffs-merged-color', ATLAS, True)
normal = image_node('back-cliffs-merged-normal', ATLAS, False)
rough = image_node('back-cliffs-merged-roughness', ROUGH, False)
formation.data.materials.append(mat)

def bake(node, kind, **kw):
    for n in nodes:
        n.select = False
    node.select = True
    nodes.active = node
    bpy.ops.object.select_all(action='DESELECT')
    for o in sources:
        o.select_set(True)
    formation.select_set(True)
    bpy.context.view_layer.objects.active = formation
    started = time.time()
    bpy.ops.object.bake(type=kind, **kw)
    log('baked', kind, f'{time.time() - started:.0f}s')

bake(base, 'DIFFUSE', pass_filter={'COLOR'})
bake(normal, 'NORMAL', normal_space='TANGENT')
bake(rough, 'ROUGHNESS')

links.new(base.outputs['Color'], bsdf.inputs['Base Color'])
links.new(rough.outputs['Color'], bsdf.inputs['Roughness'])
nmap = nodes.new('ShaderNodeNormalMap')
links.new(normal.outputs['Color'], nmap.inputs['Color'])
links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])

# export just the formation
for o in sources:
    bpy.data.objects.remove(o, do_unlink=True)
os.makedirs(OUT_DIR, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
formation.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_texcoords=True,
    export_materials='EXPORT',
    export_image_format='JPEG',
    export_jpeg_quality=90,
)
report = {
    'output': os.path.relpath(OUT, ROOT),
    'sources': [{k: p[k] for k in ('file', 'size', 'x', 'z', 'sink', 'scale', 'height', 'triangles')} for p in PAIR],
    'voxelSize': VOXEL,
    'seaFloorCut': SEA_FLOOR,
    'fillet': {'reach': FILLET, 'passes': FILLET_PASSES, 'vertices': len(weights)},
    'trianglesBeforeDecimation': tris_now,
    'triangles': result_tris,
    'atlas': {'color': ATLAS, 'normal': ATLAS, 'roughness': ROUGH},
    'bytes': os.path.getsize(OUT),
    'seconds': round(time.time() - t0),
}
with open(os.path.join(OUT_DIR, 'back-cliffs-merged-01.json'), 'w') as f:
    json.dump(report, f, indent=2)
log('wrote', report['output'], f"{report['bytes'] / 1048576:.1f} MB")
