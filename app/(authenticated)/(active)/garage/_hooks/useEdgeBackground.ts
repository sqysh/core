import { useEffect } from 'react'

/**
 * What the page behind the Garage looks like at its left and right edges, sampled from the rendered scene (sand and
 * shallows down the left, turquoise water down the right), top to bottom. On an iPhone held sideways the browser can
 * inset the page by its safe areas (44px a side), and those side strips are not part of the page: nothing positioned,
 * a canvas included, can draw there. Only the root background reaches them, so it is made to continue the water.
 */
const EDGE_COLOURS = {
  left: ['#e7cb98', '#e6cc9f', '#d2c0a9', '#dcc091', '#eef7d6', '#9edeb0', '#85cea7', '#85cea9', '#7dc1a2', '#7bb598'],
  right: ['#63ac97', '#5eaf9b', '#66c0aa', '#97bfa9', '#b4aa9e', '#7e8d85', '#77cdb8', '#6ec7b1', '#69bcaa', '#65b6a9']
}
/**
 * Each side's strip is one tile, half the width, anchored to the bottom. The tile is taller than the page by the bottom
 * safe area: the root background paints the whole screen, but a tile exactly as tall as <html> leaves the home
 * indicator's strip below it bare (the thin solid bar along the bottom held sideways). Anchored to the bottom, the
 * extra height runs off the top, and the ocean's last colours carry on to the very edge.
 */
const edgeGradient = (cs: string[], side: 'left' | 'right') =>
  `linear-gradient(to bottom, ${cs.map((c, i) => `${c} ${5 + i * 10}%`).join(', ')}) ${side} bottom / 50% calc(100% + env(safe-area-inset-bottom, 0px)) no-repeat`

/** While the Garage is open, the page's root background carries the scene's edges into any side strips; restored on leaving */
export function useEdgeBackground() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const before = { html: html.style.cssText, body: body.style.cssText }
    html.style.background = `${edgeGradient(EDGE_COLOURS.left, 'left')}, ${edgeGradient(EDGE_COLOURS.right, 'right')}, #6fbfae`
    html.style.height = '100dvh'
    body.style.background = 'transparent'
    return () => {
      html.style.cssText = before.html
      body.style.cssText = before.body
    }
  }, [])
}
