# Signed distance fields for the terrain lab, in numpy: negative inside the land, positive outside, in world units.
#
# 2D fields are on the (x, z) plane (arrays indexed [x, z]); 3D fields are indexed [x, y, z] with y up, the glTF axes.
# Noise and Voronoi are hashed, so the same seed always gives the same island.

import numpy as np

F = np.float32


def hash2(ix, iz, seed):
    """A value in [0, 1) for each integer lattice point"""
    h = (ix.astype(np.int64) * 374761393 + iz.astype(np.int64) * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(F) / F(0x1000000)


def value_noise(x, z, scale, seed):
    """Smooth value noise in [-1, 1], features about `scale` units across"""
    u = x / scale
    v = z / scale
    iu = np.floor(u)
    iv = np.floor(v)
    fu = u - iu
    fv = v - iv
    fu = fu * fu * (3 - 2 * fu)
    fv = fv * fv * (3 - 2 * fv)
    iu = iu.astype(np.int64)
    iv = iv.astype(np.int64)
    a = hash2(iu, iv, seed)
    b = hash2(iu + 1, iv, seed)
    c = hash2(iu, iv + 1, seed)
    d = hash2(iu + 1, iv + 1, seed)
    return ((a + (b - a) * fu) + ((c + (d - c) * fu) - (a + (b - a) * fu)) * fv) * 2 - 1


def fbm(x, z, scale, seed, octaves=3):
    out = np.zeros(np.broadcast(x, z).shape, F)
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        out += value_noise(x, z, scale / (2**o), seed + o * 17) * amp
        total += amp
        amp *= 0.5
    return out / total


def voronoi(x, z, cell, seed, jitter=0.85):
    """Jittered-grid Voronoi: distance to the nearest cell edge, and the nearest cell's id (two hashes in [0, 1))"""
    u = x / cell
    v = z / cell
    iu = np.floor(u).astype(np.int64)
    iv = np.floor(v).astype(np.int64)
    shape = np.broadcast(u, v).shape
    best = np.full(shape, np.inf, F)
    second = np.full(shape, np.inf, F)
    bx = np.zeros(shape, F)
    bz = np.zeros(shape, F)
    sx = np.zeros(shape, F)
    sz = np.zeros(shape, F)
    bid = np.zeros(shape, np.int64)
    for du in (-1, 0, 1):
        for dv in (-1, 0, 1):
            cu = iu + du
            cv = iv + dv
            px = cu + 0.5 + (hash2(cu, cv, seed) - 0.5) * jitter
            pz = cv + 0.5 + (hash2(cu, cv, seed + 7) - 0.5) * jitter
            d = (px - u) ** 2 + (pz - v) ** 2
            nearer = d < best
            # the old nearest becomes the second nearest
            sec = np.where(nearer, best, np.minimum(second, d))
            sx = np.where(nearer, bx, np.where(d < second, px, sx))
            sz = np.where(nearer, bz, np.where(d < second, pz, sz))
            second = sec
            best = np.where(nearer, d, best)
            bx = np.where(nearer, px, bx)
            bz = np.where(nearer, pz, bz)
            bid = np.where(nearer, cu * 73856093 + cv * 19349663, bid)
    # exact distance to the bisector between the nearest and second nearest points
    gap = np.sqrt((sx - bx) ** 2 + (sz - bz) ** 2) + 1e-6
    edge = (second - best) / (2 * gap) * cell
    return edge.astype(F), bid


def id_hash(bid, salt):
    return hash2(bid, np.full_like(bid, salt), 911)


def polygon(x, z, pts):
    """Exact signed distance to a closed polygon"""
    pts = np.asarray(pts, F)
    d = np.full(np.broadcast(x, z).shape, np.inf, F)
    inside = np.zeros(d.shape, bool)
    n = len(pts)
    for i in range(n):
        ax, az = pts[i]
        bx, bz = pts[(i + 1) % n]
        ex, ez = bx - ax, bz - az
        wx, wz = x - ax, z - az
        t = np.clip((wx * ex + wz * ez) / (ex * ex + ez * ez), 0, 1)
        d = np.minimum(d, (wx - ex * t) ** 2 + (wz - ez * t) ** 2)
        # crossing test for the sign
        c1 = az <= z
        c2 = bz > z
        c3 = ex * wz - ez * wx > 0
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        inside ^= flip
    return np.where(inside, -np.sqrt(d), np.sqrt(d)).astype(F)


def capsule(x, z, a, b, r):
    ax, az = a
    bx, bz = b
    ex, ez = bx - ax, bz - az
    wx, wz = x - ax, z - az
    t = np.clip((wx * ex + wz * ez) / (ex * ex + ez * ez), 0, 1)
    return (np.sqrt((wx - ex * t) ** 2 + (wz - ez * t) ** 2) - r).astype(F)


def circle(x, z, c, r):
    return (np.sqrt((x - c[0]) ** 2 + (z - c[1]) ** 2) - r).astype(F)


def polyline(x, z, pts):
    """Distance to a polyline of (x, z, h) points, and h interpolated at the nearest point, and the segment index"""
    pts = np.asarray(pts, F)
    shape = np.broadcast(x, z).shape
    best = np.full(shape, np.inf, F)
    h = np.zeros(shape, F)
    seg = np.zeros(shape, np.int32)
    for i in range(len(pts) - 1):
        ax, az, ah = pts[i]
        bx, bz, bh = pts[i + 1]
        ex, ez = bx - ax, bz - az
        wx, wz = x - ax, z - az
        t = np.clip((wx * ex + wz * ez) / (ex * ex + ez * ez), 0, 1)
        d = np.sqrt((wx - ex * t) ** 2 + (wz - ez * t) ** 2)
        nearer = d < best
        best = np.where(nearer, d, best)
        h = np.where(nearer, ah + (bh - ah) * t, h)
        seg = np.where(nearer, i, seg)
    return best, h, seg


def smin(a, b, k):
    """Smooth union: the two shapes joined with a fillet about k across"""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return (b + (a - b) * h - k * h * (1 - h)).astype(F)


def smax(a, b, k):
    return -smin(-a, -b, k)


def blur2(a, radius, passes=3):
    """Box blur, three passes (close to Gaussian), on a 2D field; `radius` in cells"""
    r = int(max(1, radius))
    out = a.astype(np.float64)
    for _ in range(passes):
        for axis in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (r + 1, r)
            p = np.pad(out, pad, mode='edge')
            c = np.cumsum(p, axis=axis)
            if axis == 0:
                out = (c[2 * r + 1:, :] - c[:-2 * r - 1, :]) / (2 * r + 1)
            else:
                out = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return out.astype(F)


def rounded_extrude(s, y, top, r):
    """A 2D region (signed distance s) as a solid up to height `top`, its top edge rounded to radius r"""
    qx = s + r
    qy = (y - top) + r
    return (np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - r).astype(F)


def rounded_box(x, y, z, c, half, yaw, r):
    """A box (half sizes) round centre c, turned about y, its edges rounded to r"""
    cs, sn = np.cos(yaw), np.sin(yaw)
    px, py, pz = x - c[0], y - c[1], z - c[2]
    lx = cs * px - sn * pz
    lz = sn * px + cs * pz
    qx = np.abs(lx) - half[0] + r
    qy = np.abs(py) - half[1] + r
    qz = np.abs(lz) - half[2] + r
    out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    return (out + np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0) - r).astype(F)


def sample(grid, origin, voxel, pts):
    """Trilinear samples of a 3D grid ([x, y, z]) at world points (N x 3)"""
    g = (pts - np.asarray(origin, F)) / voxel
    i0 = np.floor(g).astype(np.int64)
    f = (g - i0).astype(F)
    n = np.array(grid.shape) - 2
    i0 = np.clip(i0, 0, n)
    out = np.zeros(len(pts), F)
    for dx in (0, 1):
        wx = f[:, 0] if dx else 1 - f[:, 0]
        for dy in (0, 1):
            wy = f[:, 1] if dy else 1 - f[:, 1]
            for dz in (0, 1):
                wz = f[:, 2] if dz else 1 - f[:, 2]
                out += grid[i0[:, 0] + dx, i0[:, 1] + dy, i0[:, 2] + dz] * wx * wy * wz
    return out


def sample2(grid, origin, voxel, x, z):
    """Bilinear samples of a 2D grid ([x, z]) at world points"""
    gx = (x - origin[0]) / voxel
    gz = (z - origin[1]) / voxel
    i0 = np.clip(np.floor(gx).astype(np.int64), 0, grid.shape[0] - 2)
    k0 = np.clip(np.floor(gz).astype(np.int64), 0, grid.shape[1] - 2)
    fx = np.clip(gx - i0, 0, 1).astype(F)
    fz = np.clip(gz - k0, 0, 1).astype(F)
    a = grid[i0, k0] * (1 - fx) + grid[i0 + 1, k0] * fx
    b = grid[i0, k0 + 1] * (1 - fx) + grid[i0 + 1, k0 + 1] * fx
    return a * (1 - fz) + b * fz
