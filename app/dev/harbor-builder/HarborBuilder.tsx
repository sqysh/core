'use client'

import CompareView from './CompareView'
import HarborEditor from './HarborEditor'

// The harbor builder: the harbor editor, or (?compare=1) the terrain comparison from the cliff-merging experiment.
export default function HarborBuilder() {
  return new URLSearchParams(window.location.search).get('compare') === '1' ? <CompareView /> : <HarborEditor />
}
