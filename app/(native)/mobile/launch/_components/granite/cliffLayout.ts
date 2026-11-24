import { at } from '@/lib/lighthouse/world'

// Where the granite dresses the island: the back face of the lighthouse shelf, under the tower, facing the inlet
// behind the island (the cliff the sign-in camera looks at), with sand at its foot. Everything is laid out in the
// cliff's own frame: x runs along the face (toward the cottage), z points straight out of it, y is height above the
// water. The face was measured from the shelf's own rock: near-vertical up to the shelf top at ~2.5, the sand meeting
// it at ~0.2; toward the cottage (x past ~0.6) it turns sharply back into a corner.

const [ox, oz] = at(-0.45, -4.5)

export const CLIFF = {
  position: [ox, 0, oz] as [number, number, number],
  /** Out of the shelf's back face, turned to lie along it */
  rotationY: (-3 * Math.PI) / 4 + 0.173
}
