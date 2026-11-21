'use client'

import { createContext, useContext } from 'react'
import type { Garage } from './useGarage'

// The Garage's shared state (useGarage), for the menu's tabs and cards to read without passing it down by hand
const GarageContext = createContext<Garage | null>(null)

export const GarageProvider = GarageContext.Provider

export function useGarageContext() {
  const garage = useContext(GarageContext)
  if (!garage) throw new Error('useGarageContext must be used inside the Garage')
  return garage
}
