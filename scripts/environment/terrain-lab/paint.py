# The terrain lab's paint and bake: what the foundation looks like where it isn't a Meshy piece, and how the island's
# one texture is made.
#
# The paint is a Cycles material on the full-resolution surface, in the Meshy kit's own palette (measured from its four
# textures): mauve granite, each block a little lighter or darker, its convex edges caught in the kit's pink highlight,
# its joints and hollows darker with olive moss, fine cracks; yellow-green grass on the level tops, inset from the
# rims with a ragged edge; terracotta paving on the path. It reads per-vertex fields worked out from the distance field
# (curvature, occlusion, where grass and path go, each block's tint), so it follows the stone the field made.
#
# The island is then reduced, unwrapped to one atlas, and the paint baked onto it (colour and normals). For the hybrid,
# the Meshy pieces' own colour and normals are baked too and blended in by distance from the pieces, with contact
# shading where the foundation and a piece meet.

import math
import os
import time

import bpy
import numpy as np

F = np.float32


def srgb(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)


# the kit's palette: luminance percentiles of its rock, grass and path texels
ROCK = {'p5': '#745160', 'p25': '#865e72', 'p50': '#926b7a', 'p75': '#a77786', 'p95': '#dd8e9c', 'p99': '#efabb4'}
GRASS = {'p5': '#768818', 'p25': '#84921a', 'p50': '#98a924', 'p75': '#b3c626', 'p95': '#c7dc32'}
PATH = {'p5': '#966d59', 'p25': '#ae7b64', 'p50': '#c2826c', 'p75': '#ce8a75', 'p95': '#e49b83'}
MOSS = '#8c9630'
DEEP = '#5c3f4e'


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def set_attr(me, name, values):
    a = me.attributes.get(name) or me.attributes.new(name, 'FLOAT', 'POINT')
    a.data.foreach_set('value', np.asarray(values, F))


# ------------------------------------------------------------------------------------------------------ attributes
def surface_fields(p, n, sample, sample2d, path_s, cells, noise):
    """The per-vertex fields the paint reads, from the distance field round each vertex (p, n in glTF axes)"""
    d0 = sample(p)
    out = {}
    # curvature: the field's Laplacian at two scales (convex edges positive, joints and hollows negative)
    for name, h in (('curv', 0.12), ('curvBroad', 0.4)):
        acc = -6 * d0
        for axis in range(3):
            e = np.zeros(3, F)
            e[axis] = h
            acc = acc + sample(p + e) + sample(p - e)
        out[name] = acc / (h * h)
    # occlusion: how far the field falls short of open space, stepping out along the normal
    occ = np.zeros(len(p), F)
    for i in range(1, 6):
        step = 0.22 * i
        occ += np.maximum(step - sample(p + n * step), 0) / (2 ** i)
    out['ao'] = np.clip(1 - 1.6 * occ, 0, 1)
    up = n[:, 1]
    flat = smoothstep(0.72, 0.9, up)
    # grass on level tops, kept back from the rims (convex at the broad scale) with a few bare patches
    rim = smoothstep(0.6, 2.2, out['curvBroad'])
    bare = smoothstep(0.35, 0.6, noise(p[:, 0], p[:, 2], 5.0, 301))
    out['grass'] = flat * (1 - rim) * (1 - bare * 0.85)
    on_path = smoothstep(0.1, -0.2, sample2d(path_s, p[:, 0], p[:, 2]))
    out['path'] = on_path * smoothstep(0.5, 0.75, up)
    out['grass'] = out['grass'] * (1 - on_path)
    # each block's own tint: its column and course
    out['tint'] = cells(p)
    return out


# ------------------------------------------------------------------------------------------------------- material
def procedural_material():
    """The foundation's paint, as a Cycles material reading the per-vertex fields"""
    mat = bpy.data.materials.new('terrain-paint')
    mat.use_nodes = True
    nt = mat.node_tree
    N = nt.nodes
    L = nt.links
    for n in list(N):
        if n.type != 'OUTPUT_MATERIAL':
            N.remove(n)
    out = N['Material Output']
    bsdf = N.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.9
    L.new(bsdf.outputs[0], out.inputs['Surface'])

    def attr(name):
        a = N.new('ShaderNodeAttribute')
        a.attribute_name = name
        a.attribute_type = 'GEOMETRY'
        return a.outputs['Fac']

    def rgb(hex_):
        c = N.new('ShaderNodeRGB')
        c.outputs[0].default_value = srgb(hex_)
        return c.outputs[0]

    def mix(a, b, fac, blend='MIX'):
        m = N.new('ShaderNodeMix')
        m.data_type = 'RGBA'
        m.blend_type = blend
        L.new(fac, m.inputs['Factor'])
        L.new(a, m.inputs[6])
        L.new(b, m.inputs[7])
        return m.outputs[2]

    def math_(op, a, b=None, clamp=False):
        m = N.new('ShaderNodeMath')
        m.operation = op
        m.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                m.inputs[i].default_value = v
            else:
                L.new(v, m.inputs[i])
        return m.outputs[0]

    def ramp(x, lo, hi):
        """smoothstep(lo, hi, x)"""
        m = N.new('ShaderNodeMapRange')
        m.interpolation_type = 'SMOOTHSTEP'
        m.inputs['From Min'].default_value = lo
        m.inputs['From Max'].default_value = hi
        L.new(x, m.inputs['Value'])
        return m.outputs['Result']

    pos = N.new('ShaderNodeNewGeometry').outputs['Position']

    def noise(scale, detail=3.0, roughness=0.55):
        t = N.new('ShaderNodeTexNoise')
        t.inputs['Scale'].default_value = scale
        t.inputs['Detail'].default_value = detail
        t.inputs['Roughness'].default_value = roughness
        L.new(pos, t.inputs['Vector'])
        return t.outputs['Fac']

    curv = attr('curv')
    curv_b = attr('curvBroad')
    ao = attr('ao')
    grass = attr('grass')
    path = attr('path')
    tint = attr('tint')

    # granite: each block's tint between the kit's darker and lighter mauve, a soft painterly mottle across it
    rock = mix(rgb(ROCK['p25']), rgb(ROCK['p75']), tint)
    rock = mix(rock, rgb(ROCK['p50']), math_('MULTIPLY', noise(0.7, 2.0), 0.6))
    # convex edges catch the kit's pink highlight (fine edges strongly, broad shoulders a little)
    edge = math_('MAXIMUM', ramp(curv, 1.5, 6.0), math_('MULTIPLY', ramp(curv_b, 0.8, 3.0), 0.5))
    rock = mix(rock, rgb(ROCK['p95']), math_('MULTIPLY', edge, 0.85))
    rock = mix(rock, rgb(ROCK['p99']), math_('MULTIPLY', ramp(curv, 5.0, 10.0), 0.6))
    # joints and hollows: darker, with olive moss in some of them
    hollow = math_('MAXIMUM', ramp(math_('MULTIPLY', curv, -1.0), 1.0, 6.0), math_('SUBTRACT', 1.0, ao))
    rock = mix(rock, rgb(ROCK['p5']), math_('MULTIPLY', hollow, 0.8))
    rock = mix(rock, rgb(DEEP), math_('MULTIPLY', ramp(math_('MULTIPLY', curv, -1.0), 5.0, 12.0), 0.7))
    moss = math_('MULTIPLY', ramp(hollow, 0.35, 0.8), ramp(noise(1.1, 3.0), 0.48, 0.62))
    rock = mix(rock, rgb(MOSS), math_('MULTIPLY', moss, 0.55))
    # fine cracks: thin dark lines along Voronoi cell edges, here and there
    vor = N.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 0.75
    L.new(pos, vor.inputs['Vector'])
    crack = math_('MULTIPLY', math_('SUBTRACT', 1.0, ramp(vor.outputs['Distance'], 0.0, 0.035)), ramp(noise(0.5, 1.0), 0.5, 0.62))
    rock = mix(rock, rgb(ROCK['p5']), math_('MULTIPLY', crack, 0.6))

    # grass: the kit's yellow-greens, lighter in drifts, darker in hollows; a ragged edge where it meets stone
    g = mix(rgb(GRASS['p25']), rgb(GRASS['p75']), ramp(noise(0.45, 2.0), 0.3, 0.7))
    g = mix(g, rgb(GRASS['p95']), math_('MULTIPLY', ramp(noise(1.6, 4.0), 0.55, 0.75), 0.6))
    g = mix(g, rgb(GRASS['p5']), math_('MULTIPLY', math_('SUBTRACT', 1.0, ao), 1.2, clamp=True))
    ragged = math_('ADD', grass, math_('MULTIPLY', math_('SUBTRACT', noise(2.2, 4.0), 0.5), 0.9))
    gm = ramp(ragged, 0.42, 0.56)

    # paving: terracotta setts on the path, their joints darker
    brick = N.new('ShaderNodeTexBrick')
    brick.offset = 0.5
    brick.inputs['Scale'].default_value = 1.4
    brick.inputs['Mortar Size'].default_value = 0.035
    brick.inputs['Mortar Smooth'].default_value = 0.6
    brick.inputs['Brick Width'].default_value = 0.9
    brick.inputs['Row Height'].default_value = 0.55
    L.new(pos, brick.inputs['Vector'])
    L.new(rgb(PATH['p25']), brick.inputs['Color1'])
    L.new(rgb(PATH['p75']), brick.inputs['Color2'])
    L.new(rgb(PATH['p5']), brick.inputs['Mortar'])
    pave = mix(brick.outputs['Color'], rgb(PATH['p95']), math_('MULTIPLY', ramp(noise(1.3, 3.0), 0.6, 0.8), 0.4))

    col = mix(rock, g, gm)
    col = mix(col, pave, ramp(path, 0.3, 0.6))
    L.new(col, bsdf.inputs['Base Color'])

    # surface relief for the normal bake: the cracks and the paving joints, a little grain
    height = math_('ADD', math_('MULTIPLY', crack, -1.0), math_('MULTIPLY', brick.outputs['Fac'], math_('MULTIPLY', ramp(path, 0.3, 0.6), -1.0)))
    height = math_('ADD', height, math_('MULTIPLY', noise(6.0, 2.0), 0.15))
    bump = N.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.03
    L.new(height, bump.inputs['Height'])
    L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


# ----------------------------------------------------------------------------------------------------- reduce, UVs
def low_poly(src, name, target_tris):
    """A reduced copy of a surface, unwrapped to one atlas"""
    ob = src.copy()
    ob.data = src.data.copy()
    ob.name = name
    ob.data.name = name
    bpy.context.scene.collection.objects.link(ob)
    for a in list(ob.data.attributes):
        if a.name in ('curv', 'curvBroad', 'ao', 'grass', 'path', 'tint') or a.name == 'paint':
            ob.data.attributes.remove(a)
    ob.data.materials.clear()
    tris = len(ob.data.polygons)
    dec = ob.modifiers.new('reduce', 'DECIMATE')
    dec.decimate_type = 'COLLAPSE'
    dec.ratio = min(1.0, target_tris / tris)
    dec.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    old = ob.data
    ob.data = me
    bpy.data.meshes.remove(old)
    me.name = name
    me.shade_smooth()
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0012, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


# ------------------------------------------------------------------------------------------------------------ bake
def cycles(log):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
        log('baking on', [d.name for d in prefs.devices if d.use])
    except Exception as e:  # the CPU is fine, only slower
        log('baking on the CPU:', e)
    sc.cycles.samples = 2
    # one tile in memory: large bakes otherwise spill tiles to disk
    sc.cycles.use_auto_tile = False
    sc.render.bake.margin = 8
    sc.render.bake.use_clear = True


def bake(target, sources, kind, size, name, log, colour=True, extrusion=0.1, reach=0.35, **kw):
    """Bakes `kind` from sources onto target's atlas (or from target itself, with no sources) into a new image"""
    sc = bpy.context.scene
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    mat = target.data.materials[0]
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = img
    for n in mat.node_tree.nodes:
        n.select = False
    node.select = True
    mat.node_tree.nodes.active = node
    bpy.ops.object.select_all(action='DESELECT')
    for o in sources:
        o.hide_set(False)
        o.hide_render = False
        o.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    sc.render.bake.use_selected_to_active = bool(sources)
    sc.render.bake.cage_extrusion = extrusion
    sc.render.bake.max_ray_distance = reach
    started = time.time()
    bpy.ops.object.bake(type=kind, **kw)
    mat.node_tree.nodes.remove(node)
    log('baked', name, f'{time.time() - started:.0f}s')
    return img


def pixels(img):
    a = np.empty(img.size[0] * img.size[1] * 4, F)
    img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)


def put(img, a):
    img.pixels.foreach_set(np.ascontiguousarray(a, F).ravel())
    img.update()


def emission_material(name, attribute):
    """A material that shows one per-vertex field as its emission, for baking that field to the atlas"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    a = nt.nodes.new('ShaderNodeAttribute')
    a.attribute_name = attribute
    a.attribute_type = 'GEOMETRY'
    e = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(a.outputs['Fac'], e.inputs['Color'])
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return mat


def final_material(name, colour, normal):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.88
    bsdf.inputs['Metallic'].default_value = 0.0
    c = nt.nodes.new('ShaderNodeTexImage')
    c.image = colour
    nt.links.new(c.outputs['Color'], bsdf.inputs['Base Color'])
    nimg = nt.nodes.new('ShaderNodeTexImage')
    nimg.image = normal
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(nimg.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def export(objects, path, log):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_texcoords=True,
        export_materials='EXPORT',
        export_image_format='JPEG',
        export_jpeg_quality=88,
        export_attributes=False,
    )
    log('wrote', os.path.relpath(path), f'{os.path.getsize(path) / 1048576:.1f} MB')
