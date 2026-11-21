'use client'

import { glassPane } from '@/components/_shared/LiquidGlass'
import { ACCESSORY_IDS, boatName, isLive, itemDef, ItemId } from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'
import { label } from '../_lib/styles'
import { AccessoryRow } from './AccessoryRow'
import { RoomMeters } from './RoomMeters'

const GROUPED = [
  { kind: 'effect', title: 'Performance · changes how she handles' },
  { kind: 'ability', title: 'Equipment · new things she can do' },
  { kind: 'cosmetic', title: 'Cosmetic · looks only' }
] as const
const kindOf = (id: ItemId) => (itemDef(id).effect ? 'effect' : itemDef(id).ability ? 'ability' : 'cosmetic')

/** Customize: accessories for her level and room */
export function CustomizeTab() {
  const { draft, heritage, stage, chosen, topLevel, owns } = useGarageContext()
  const available = ACCESSORY_IDS.filter((id) => (itemDef(id).custom!.level <= topLevel || owns(id)) && isLive(id))
  const future = ACCESSORY_IDS.filter((id) => !available.includes(id))

  if (heritage)
    return (
      <div className={`${glassPane} px-3.5 py-3 font-nunito text-[13px] text-white/75`}>
        Accessories go on the boat you build. Start building in the Vessel tab; your {boatName(draft)} stays yours.
      </div>
    )

  return (
    <div className="grid gap-3">
      <div className={`${glassPane} grid gap-2 px-3.5 py-3`}>
        <p className="m-0 font-nunito text-[12px] leading-snug text-white/75">
          Spend credits here or save them for the next upgrade: your choice. Accessories stay yours; fit and remove them
          as you like, wherever the deck has room.
        </p>
        <RoomMeters stage={stage} chosen={chosen} />
      </div>
      {GROUPED.map(({ kind, title }) => {
        const list = available.filter((id) => kindOf(id) === kind)
        return list.length ? (
          <section key={kind} className="grid gap-2">
            <p className={label}>{title}</p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {list.map((id) => (
                <AccessoryRow key={id} id={id} />
              ))}
            </ul>
          </section>
        ) : null
      })}
      <p className={`${label} mt-1`}>At higher levels and coming soon</p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {future.map((id) => (
          <AccessoryRow key={id} id={id} />
        ))}
      </ul>
    </div>
  )
}
