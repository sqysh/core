import { InstancedMesh, Material, Mesh, Object3D, Raycaster, Sphere, Vector3 } from 'three'

// Helpers for things that grow on, or are set into, real geometry: find the solid meshes near a spot, then cast
// rays at them. Used by the vines (to creep along rock faces and cottage walls) and by the QR niche (to find the
// actual stone face it is recessed into). Only solid, ordinary meshes count: no instanced plants, no transparent
// water or glass, nothing huge like the ground.

export function solidsNear(root: Object3D, center: Vector3, radius: number, only?: (m: Mesh) => boolean): Mesh[] {
  root.updateMatrixWorld(true)
  const out: Mesh[] = []
  const s = new Sphere()
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || (m as InstancedMesh).isInstancedMesh || m.userData.noCling) return
    const mat = m.material as Material | Material[]
    if (!Array.isArray(mat) && mat.transparent) return
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
    s.copy(m.geometry.boundingSphere!).applyMatrix4(m.matrixWorld)
    if (s.radius > 12 || s.center.distanceTo(center) > radius + s.radius) return
    if (only && !only(m)) return
    out.push(m)
  })
  return out
}

/** A projector that pulls a point onto the nearest surface facing `normal`, a hair off it */
export function clingProjector(targets: Mesh[], normal: Vector3, offset = 0.03) {
  const rc = new Raycaster()
  const dir = normal.clone().negate()
  const from = new Vector3()
  return (p: Vector3) => {
    rc.set(from.copy(p).addScaledVector(normal, 1.0), dir)
    rc.far = 2.4
    const hit = rc.intersectObjects(targets, false)[0]
    return hit ? hit.point.clone().addScaledVector(normal, offset) : p
  }
}

/** Distance along `dir` from `from` to the first surface, or null */
export function castTo(targets: Mesh[], from: Vector3, dir: Vector3, far = 20): { point: Vector3; t: number } | null {
  const rc = new Raycaster(from, dir, 0, far)
  const hit = rc.intersectObjects(targets, false)[0]
  return hit ? { point: hit.point.clone(), t: hit.distance } : null
}
