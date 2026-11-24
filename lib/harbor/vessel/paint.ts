// True black, as boats are painted with it. Real black paint still reflects a few percent of the light, which is what
// lets you see a black hull's shape; a surface at zero reflects nothing and renders as a flat silhouette. So black is
// drawn at about that real-paint level, everywhere a colour becomes paint (enamel, the hull's painted texture, cushions,
// sailcloth, flags). The colour a member saves stays exactly #000000.

export const isBlack = (hex: string) => /^#0{6}$/i.test(hex)
export const paintFill = (hex: string) => (isBlack(hex) ? '#1c1c1e' : hex)
