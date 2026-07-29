'use client'

import { EileenListing } from '@/lib/actions/external/getEileenListings'
import { motion } from 'framer-motion'
import { ArrowUpRight, BedDouble, Bath, Maximize, MapPin } from 'lucide-react'

const SITE = 'https://www.jonahgroupre.com'

function formatAddress(l: EileenListing['listing']): string {
  const parts = [l.address?.streetNumber, l.address?.streetName, l.address?.streetSuffix].filter(Boolean).join(' ')
  return l.address?.unitNumber ? `${parts} #${l.address.unitNumber}` : parts
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

function imageUrl(path?: string): string | null {
  if (!path) return null
  return path.startsWith('http') ? path : `https://cdn.repliers.io/${path}`
}

export default function MemberListings({ listings }: { listings: EileenListing[] }) {
  if (listings.length === 0) return null

  return (
    <div>
      {/* Section label — matches "Other Members" treatment */}
      <div className="flex items-center gap-3 mb-5">
        <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
        <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
          Active Listings
        </p>
        <span className="font-mono text-f10 text-muted-light dark:text-muted-dark">{listings.length}</span>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 760:grid-cols-3 gap-2">
        {listings.map((item, i) => {
          const l = item.listing
          const address = formatAddress(l)
          const img = imageUrl(l.images?.[0])

          return (
            <motion.a
              key={item.mlsNumber}
              href={`${SITE}/listings/${item.mlsNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="group border border-border-light dark:border-border-dark flex flex-col hover:border-primary-light dark:hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              {/* Image */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-primary-light/5 dark:bg-primary-dark/5">
                {img ? (
                  <img
                    src={img}
                    alt={address}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-light/20 dark:text-primary-dark/20" aria-hidden="true" />
                  </div>
                )}

                {/* Price overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-primary-light dark:bg-button-dark px-3 py-2 flex items-center justify-between gap-2">
                  <p className="font-sora font-black text-[15px] text-white leading-none">
                    {formatPrice(item.listPrice)}
                  </p>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 text-white/70 group-hover:text-white shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="px-3 py-3 flex flex-col gap-2 flex-1">
                <div className="min-w-0">
                  <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight truncate">
                    {address}
                  </p>
                  <p className="font-nunito text-[12px] text-muted-light dark:text-muted-dark truncate">
                    {l.address?.city}, {l.address?.state}
                  </p>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-3 flex-wrap mt-auto pt-1">
                  {l.details?.numBedrooms != null && (
                    <span className="inline-flex items-center gap-1 font-mono text-f10 text-muted-light dark:text-muted-dark">
                      <BedDouble className="w-3 h-3 shrink-0" aria-hidden="true" />
                      {l.details.numBedrooms} bd
                    </span>
                  )}
                  {l.details?.numBathrooms != null && (
                    <span className="inline-flex items-center gap-1 font-mono text-f10 text-muted-light dark:text-muted-dark">
                      <Bath className="w-3 h-3 shrink-0" aria-hidden="true" />
                      {l.details.numBathrooms} ba
                    </span>
                  )}
                  {l.details?.sqft && (
                    <span className="inline-flex items-center gap-1 font-mono text-f10 text-muted-light dark:text-muted-dark">
                      <Maximize className="w-3 h-3 shrink-0" aria-hidden="true" />
                      {parseInt(l.details.sqft).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </motion.a>
          )
        })}
      </div>

      {/* View all */}
      <a
        href={`${SITE}/listings`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      >
        View All on jonahgroupre.com
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </div>
  )
}
