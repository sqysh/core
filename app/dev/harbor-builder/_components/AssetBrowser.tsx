'use client'

import { useEffect, useMemo, useState } from 'react'
import { KINDS, ModelDef, ModelKind, MODELS } from '../_lib/catalog'
import type { LoadedModel } from '../_lib/models'
import { getThumbnail, renderThumbnail } from '../_lib/thumbnails'
import { chip, label, mb } from './ui'

type AssetMeta = { fileBytes: number; cleanedBytes: number; hasClean: boolean; discovered: boolean }

interface Props {
  /** Currently loaded models, keyed by model id */
  models: Record<string, LoadedModel | undefined>
  onAdd: (id: string) => void
  onClose: () => void
}

const KIND_BG: Record<ModelKind, string> = {
  land: '#2a4a65',
  islet: '#1f5a3a',
  path: '#5a4a20',
  structure: '#4a2a6a',
  prop: '#6a3a1a',
  tree: '#1a5a1a',
  plant: '#3a6a1a',
}

export function AssetBrowser({ models, onAdd, onClose }: Props) {
  const [kindFilter, setKindFilter] = useState<ModelKind | 'all'>('all')
  const [search, setSearch] = useState('')
  const [meta, setMeta] = useState<Record<string, AssetMeta>>({})

  // Fetch file metadata from the assets discovery API once on mount
  useEffect(() => {
    fetch('/dev/harbor-builder/api/assets')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { entries?: Array<{ id: string } & AssetMeta> } | null) => {
        if (!data?.entries) return
        const map: Record<string, AssetMeta> = {}
        for (const e of data.entries) {
          map[e.id] = { fileBytes: e.fileBytes, cleanedBytes: e.cleanedBytes, hasClean: e.hasClean, discovered: e.discovered }
        }
        setMeta(map)
      })
      .catch(() => {})
  }, [])

  // Thumbnails of the loaded models: each is rendered once (renderThumbnail caches by id), so a model that loads later
  // is the only one that costs anything
  const thumbs = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [id, model] of Object.entries(models)) {
      if (!model) continue
      const url = getThumbnail(id) ?? renderThumbnail(id, model)
      if (url) out[id] = url
    }
    return out
  }, [models])

  const filtered = MODELS.filter(
    (d) =>
      (kindFilter === 'all' || d.kind === kindFilter) &&
      (!search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        (d.group ?? '').toLowerCase().includes(search.toLowerCase())),
  )

  // listed by kind, then by the section (group) each model belongs to, in the catalog's order
  const sections = KINDS.flatMap((k) => {
    const inKind = filtered.filter((d) => d.kind === k.kind)
    return [...new Set(inKind.map((d) => d.group ?? ''))].map((group) => ({
      key: `${k.kind}:${group}`,
      title: kindFilter === 'all' ? (group ? `${k.name} · ${group}` : k.name) : group,
      items: inKind.filter((d) => (d.group ?? '') === group),
    }))
  })

  const counts = KINDS.map((k) => ({
    ...k,
    n: MODELS.filter((d) => d.kind === k.kind).length,
  }))

  const card = (d: ModelDef) => {
          const loaded = !!models[d.id]
          const thumb = thumbs[d.id]
          const m = meta[d.id]
          const bg = KIND_BG[d.kind]

          return (
            <button
              key={d.id}
              onClick={() => onAdd(d.id)}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left transition-colors hover:border-sky-300/40 hover:bg-sky-400/10"
              title={`Add ${d.name}`}
            >
              {/* Thumbnail */}
              <div
                className="relative flex h-[72px] w-full items-center justify-center overflow-hidden"
                style={{ background: `${bg}cc` }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={d.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[9px] text-white/35">
                    {loaded ? 'rendering…' : 'click to load'}
                  </span>
                )}
                {!loaded && <div className="absolute inset-0 bg-black/25" />}
              </div>

              {/* Label */}
              <div className="p-1.5">
                <p className="line-clamp-2 text-[10px] font-medium leading-tight text-white/85">{d.name}</p>
                <p className="mt-0.5 text-[9px] text-white/35">
                  {m?.fileBytes ? mb(m.fileBytes) : '—'}
                  {m?.hasClean ? ' · cleaned' : ''}
                </p>
              </div>
            </button>
          )
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3">
        <p className="flex-1 text-sm font-semibold text-white">
          Asset library <span className="font-normal text-white/40 text-xs">({MODELS.length})</span>
        </p>
        <button className="text-sm text-white/40 hover:text-white" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search models…"
        className="mb-2 w-full rounded-md border border-white/10 bg-black/25 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-sky-300/60"
      />

      {/* Kind filter tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        <button className={`${chip(kindFilter === 'all')} text-[10px]`} onClick={() => setKindFilter('all')}>
          All {MODELS.length}
        </button>
        {counts.map(({ kind, name, n }) => (
          <button
            key={kind}
            className={`${chip(kindFilter === kind)} text-[10px]`}
            onClick={() => setKindFilter(kind)}
          >
            {name.split(' ')[0]} {n}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3 overflow-y-auto pb-2">
        {sections.map((sec) => (
          <div key={sec.key}>
            {sec.title && <p className={`${label} mb-1.5`}>{sec.title}</p>}
            <div className="grid grid-cols-2 gap-2">{sec.items.map((d) => card(d))}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className={`${label} mt-1 shrink-0`}>
        {filtered.length} of {MODELS.length} · {Object.values(models).filter(Boolean).length} loaded
      </p>
    </div>
  )
}
