import { useEffect, useRef } from 'react'
import { getInitials } from '@/lib/utils/shared.utils'
import { ART_CENTER, ART_H, ART_LENGTH, ART_W, WATERLINE } from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import { PLATE_H, Point, lengthAt, pointAt, voyageProgress } from '@/app/(authenticated)/(active)/attendance/_lib/harborLayout'
import { FleetBoat, boatTop } from '@/app/(authenticated)/(active)/attendance/_hooks/useHarbor'

const PERIOD_S = 4.6

const r1 = (n: number) => Math.round(n * 10) / 10
const WAVE_SPEED = 260 // units a second the swell travels left to right, so bobbing ripples across the harbor

function boatTransform(p: Point, L: number) {
  const s = L / ART_LENGTH
  return `translate(${r1(p.x - ART_CENTER * s)}px, ${r1(p.y - WATERLINE * s)}px) scale(${Math.round(s * 1e4) / 1e4})`
}

function plateTransform(top: Point, w: number, h: number) {
  return `translate(${r1(top.x - w / 2)}px, ${r1(top.y - 18 - h)}px)`
}

/** The rope from the plate's bottom edge to the top of the boat */
function rope(plate: { x: number; y: number; w: number; h: number }, top: Point) {
  const dx = top.x - (plate.x + plate.w / 2)
  const dy = top.y - (plate.y + plate.h)
  return { length: r1(Math.max(0, Math.hypot(dx, dy) - 4)), angle: r1((Math.atan2(-dx, dy) * 180) / Math.PI) }
}

/** Foam left on the water behind a moving boat, added straight to the DOM so a wake never re-renders React */
function spawnPuff(layer: HTMLElement, at: Point, L: number) {
  const el = document.createElement('div')
  el.className = 'harbor-puff'
  const w = 0.5 * L
  const h = 0.1 * L
  el.style.cssText = `left:${at.x - w / 2}px;top:${at.y - h / 2}px;width:${w}px;height:${h}px;z-index:${Math.round(at.y) - 1}`
  el.addEventListener('animationend', () => el.remove(), { once: true })
  layer.appendChild(el)
}

interface HarborBoatProps {
  boat: FleetBoat
  /** The depth-sorted layer the boat lives in; wakes go here too */
  depthLayer: HTMLElement | null
  plateEl: HTMLDivElement | null
}

export function HarborBoat({ boat, depthLayer, plateEl }: HarborBoatProps) {
  const el = useRef<HTMLDivElement>(null)
  const { voyage, kind, palette, berth, L, facing } = boat
  const start = voyage ? voyage.points[0] : berth
  const startL = voyage ? lengthAt(start.y) * kind.size : L

  useEffect(() => {
    const node = el.current
    if (!voyage || !node) return
    let raf = 0
    let lastPuff = 0
    const { points, duration } = voyage

    function place(p: Point) {
      const len = lengthAt(p.y) * kind.size
      node!.style.transform = boatTransform(p, len)
      node!.style.zIndex = String(Math.round(p.y))
      if (plateEl) plateEl.style.transform = plateTransform(boatTop(kind, p, len), boat.plate.w, boat.plate.h)
      return len
    }

    function frame(now: number) {
      const t = Math.min(1, Math.max(0, (now - boat.launchAt) / (duration * 1000)))
      const p = pointAt(points, voyageProgress(t))
      const len = place(p)
      if (depthLayer && t > 0 && t < 0.96 && now - lastPuff > 110) {
        lastPuff = now
        spawnPuff(depthLayer, { x: p.x - facing * 0.46 * len, y: p.y }, len)
      }
      if (t < 1) raf = requestAnimationFrame(frame)
      else settle()
    }

    // Moored: the plate glides off to its own spot and the rope pays out to reach it
    function settle() {
      if (!plateEl) return
      plateEl.classList.add('harbor-settle')
      plateEl.style.transform = `translate(${boat.plate.x}px, ${boat.plate.y}px)`
      const r = rope(boat.plate, boat.top)
      const ropeEl = plateEl.querySelector<HTMLElement>('.harbor-rope')
      if (ropeEl) {
        ropeEl.style.height = `${r.length}px`
        ropeEl.style.transform = `rotate(${r.angle}deg)`
      }
    }

    place(points[0])
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [voyage, boat, kind, facing, depthLayer, plateEl])

  // Bob in step with a swell rolling left to right across the harbor
  const bobDelay = -r1((berth.x / WAVE_SPEED) % PERIOD_S)

  return (
    <div
      ref={el}
      className="absolute left-0 top-0 will-change-transform"
      style={{
        width: ART_W,
        height: ART_H,
        transformOrigin: '0 0',
        transform: boatTransform(start, startL),
        zIndex: Math.round(start.y)
      }}
    >
      <div
        className="harbor-bob"
        style={{ animationDelay: `${bobDelay}s`, transformOrigin: `${ART_CENTER}px ${WATERLINE}px` }}
      >
        <svg
          width={ART_W}
          height={ART_H}
          viewBox={`0 0 ${ART_W} ${ART_H}`}
          className="block overflow-visible"
          style={{ transform: facing < 0 ? 'scaleX(-1)' : undefined, transformOrigin: `${ART_CENTER}px 0` }}
          role="img"
          aria-label={`${boat.member.name}'s ${kind.label}`}
        >
          <ellipse cx={ART_CENTER} cy={WATERLINE + 5} rx={106} ry={8} fill="#0a3f86" opacity="0.28" />
          <g clipPath="url(#harbor-above-water)">{kind.art(palette)}</g>
          <ellipse
            className="harbor-ripple"
            style={{ animationDelay: `${bobDelay}s` }}
            cx={ART_CENTER}
            cy={WATERLINE + 1}
            rx={110}
            ry={4.5}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          />
        </svg>
      </div>
    </div>
  )
}

interface NameplateProps {
  boat: FleetBoat
  register: (id: string, el: HTMLDivElement | null) => void
}

// A navy pill with a cream rope border, tied to the boat with a rope
export function Nameplate({ boat, register }: NameplateProps) {
  const { plate, member, label, voyage, top } = boat
  const moored = !voyage
  const r = rope(plate, top)
  const startTop = voyage ? boatTop(boat.kind, voyage.points[0], lengthAt(voyage.points[0].y) * boat.kind.size) : top

  return (
    <div
      ref={(node) => register(boat.id, node)}
      className="absolute left-0 top-0 will-change-transform"
      style={{
        width: plate.w,
        height: plate.h,
        transform: moored ? `translate(${plate.x}px, ${plate.y}px)` : plateTransform(startTop, plate.w, plate.h)
      }}
    >
      <div
        className="harbor-rope absolute left-1/2 top-full"
        style={{
          width: 3,
          marginLeft: -1.5,
          height: moored ? r.length : 14,
          transformOrigin: 'top center',
          transform: moored ? `rotate(${r.angle}deg)` : 'rotate(0deg)',
          backgroundImage: 'repeating-linear-gradient(to bottom, #f6ecd2 0 7px, rgba(246,236,210,0.35) 7px 11px)'
        }}
      />
      <div
        className="flex items-center gap-3 rounded-full pl-2 pr-6"
        style={{
          width: plate.w / boat.plateScale,
          height: PLATE_H,
          transform: `scale(${boat.plateScale})`,
          transformOrigin: '0 0',
          background: 'linear-gradient(to bottom, #2a4d8c, #1d3767)',
          border: '3px solid #f6ecd2',
          boxShadow: 'inset 0 0 0 4px #1d3767, inset 0 0 0 6px rgba(246,236,210,0.45), 0 6px 14px rgba(10,40,90,0.35)'
        }}
      >
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ width: 40, height: 40, background: '#f6ecd2', boxShadow: '0 0 0 2px #f6ecd2' }}
        >
          {member.profileImage ? (
            <img src={member.profileImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-sora font-black" style={{ fontSize: 16, color: '#1d3767' }}>
              {getInitials(member.name)}
            </span>
          )}
        </div>
        <span
          className="whitespace-nowrap font-sora font-extrabold"
          style={{ fontSize: 29, color: '#f6ecd2', letterSpacing: '0.01em' }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
