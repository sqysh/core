# The Meshy pieces' grass tufts and flower clumps, kept as the pieces' own geometry rather than fused into the terrain
# (blades far thinner than the terrain's voxels would melt into blobs). Each piece's vegetation (its triangles outside
# its opened solid, see build.py) is split into loose parts; parts that are mostly green in the piece's texture are
# kept (tufts, flower clumps), the rest (a few slivers of thin rock edge) dropped. The kept parts go with every
# instance of their piece, and are scattered over the foundation's own grass, so grass looks the same everywhere.

import math

import bpy
import numpy as np
from mathutils import Matrix

F = np.float32


def components(tris, n_verts):
    """Connected parts of a triangle set: a label per triangle"""
    label = np.arange(n_verts)
    while True:
        m = np.minimum(np.minimum(label[tris[:, 0]], label[tris[:, 1]]), label[tris[:, 2]])
        new = label.copy()
        for k in range(3):
            np.minimum.at(new, tris[:, k], m)
        new = new[new]
        if np.array_equal(new, label):
            break
        label = new
    return label[tris[:, 0]]


def base_image(mat):
    """The image feeding a material's base colour"""
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = bsdf.inputs['Base Color'].links[0].from_node
    while node.type != 'TEX_IMAGE':
        node = next(i.links[0].from_node for i in node.inputs if i.is_linked)
    return node.image


def texture_hues(ob):
    """Per-loop colour of the piece's base-colour texture, at the loop's UV"""
    me = ob.data
    img = base_image(me.materials[0])
    w, h = img.size
    px = np.empty(w * h * 4, F)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    uv = np.empty(len(me.loops) * 2, F)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    x = np.clip((uv[:, 0] % 1) * w, 0, w - 1).astype(int)
    y = np.clip((uv[:, 1] % 1) * h, 0, h - 1).astype(int)
    return px[y, x, :3]


def is_green(rgb):
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    return (g > r * 1.05) & (g > b * 1.4)


def piece_foliage(piece, veg, scale, log):
    """The piece's kept vegetation as an object (its own axes, Blender), and its loose parts for scattering"""
    src = piece['object']
    me = src.data
    tris = piece['tris']
    vidx = np.flatnonzero(veg)
    label = components(tris[vidx], len(me.vertices))
    green = is_green(texture_hues(src)).reshape(-1, 3).mean(1)[vidx]
    keep = np.zeros(len(tris), bool)
    parts = []
    for lab in np.unique(label):
        sel = vidx[label == lab]
        if len(sel) < 30:
            continue
        g = green[label == lab].mean()
        if g < 0.3:
            continue
        keep[sel] = True
        pts = piece['points'][tris[sel].ravel()]
        size = (pts.max(0) - pts.min(0)) * scale
        if 0.35 < max(size[0], size[2]) < 2.8:
            parts.append({'faces': sel, 'flower': g < 0.75, 'points': pts})
    ob = subset(src, keep, f'{src.name}-foliage')
    log('foliage', src.name, f'{keep.sum():,} tris kept in {len(parts)} scatterable parts')
    return ob, parts


def subset(src, faces_mask, name):
    """A new object with only some of a triangle mesh's faces (positions, UVs, material)"""
    me = src.data
    tri = np.empty(len(me.loops), np.int64)
    me.loops.foreach_get('vertex_index', tri)
    tri = tri.reshape(-1, 3)
    sel = np.flatnonzero(faces_mask)
    used, inv = np.unique(tri[sel].ravel(), return_inverse=True)
    co = np.empty(len(me.vertices) * 3, F)
    me.vertices.foreach_get('co', co)
    uv = np.empty(len(me.loops) * 2, F)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 3, 2)[sel]
    out = bpy.data.meshes.new(name)
    out.vertices.add(len(used))
    out.vertices.foreach_set('co', co.reshape(-1, 3)[used].ravel())
    out.loops.add(len(sel) * 3)
    out.loops.foreach_set('vertex_index', inv.astype(np.int32))
    out.polygons.add(len(sel))
    out.polygons.foreach_set('loop_start', (np.arange(len(sel)) * 3).astype(np.int32))
    out.update(calc_edges=True)
    out.uv_layers.new(name='UVMap').data.foreach_set('uv', uv.ravel())
    out.materials.append(me.materials[0])
    out.shade_smooth()
    ob = bpy.data.objects.new(name, out)
    bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = src.matrix_world
    return ob


def foliage_material(src_mat, name):
    """The piece's colour texture alone, matte (the vegetation needs no normal or roughness maps)"""
    img = base_image(src_mat)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.85
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def scatter(parts_by_piece, spots, scale_of, rng, C, log):
    """Copies of the scatterable parts at the given ground spots (glTF points), one object per piece (material)"""
    out = []
    for name, (src, parts) in parts_by_piece.items():
        mine = [s for s in spots if s['piece'] == name]
        if not mine or not parts:
            continue
        # each part once as its own object; every spot a copy of one of them
        for part in parts:
            if 'object' not in part:
                part['object'] = subset(src, np.isin(np.arange(len(src.data.polygons)), part['faces']), f'{src.name}-part')
                part['object'].matrix_world = Matrix.Identity(4)
                part['object'].hide_render = True
        tufts = [p for p in parts if not p['flower']] or parts
        flowers = [p for p in parts if p['flower']] or parts
        merged = []
        for s in mine:
            part = (flowers if s['flower'] else tufts)[rng.integers(len(flowers if s['flower'] else tufts))]
            pts = part['points']
            # its base: the middle of its lowest tenth
            low = pts[pts[:, 1] <= np.quantile(pts[:, 1], 0.1)]
            base = low.mean(0)
            k = scale_of(name) * rng.uniform(0.75, 1.15)
            yaw = rng.uniform(0, 2 * math.pi)
            c, sn = math.cos(yaw), math.sin(yaw)
            R = np.array([[c, 0, sn], [0, 1, 0], [-sn, 0, c]], F) * k
            m = np.eye(4)
            m[:3, :3] = R
            m[:3, 3] = s['at'] - R @ base
            m[1, 3] -= 0.04
            ob = part['object'].copy()
            bpy.context.scene.collection.objects.link(ob)
            ob.hide_render = False
            ob.matrix_world = Matrix((C @ m @ np.linalg.inv(C)).tolist())
            merged.append(ob)
        out.append(join(merged, f'{name}-scatter'))
        log('scattered', len(mine), 'from', name)
    return out


def join(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        # copies share their part's mesh: each its own before joining and applying transforms
        if o.data.users > 1:
            o.data = o.data.copy()
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob
