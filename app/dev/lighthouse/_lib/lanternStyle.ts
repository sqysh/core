import { createContext } from 'react'

/**
 * How a lighthouse's lantern room is built. 'classic' is the original: a solid lantern with glowing panes, as every
 * existing scene draws it. 'fresnel' glazes the lantern so a turning Fresnel lens with its beams shows inside (see
 * FresnelOptics). A scene opts in by wrapping its world in <LanternStyle.Provider value="fresnel">.
 */
export type LanternKind = 'classic' | 'fresnel'
export const LanternStyle = createContext<LanternKind>('classic')
