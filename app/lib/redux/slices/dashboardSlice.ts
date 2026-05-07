import { createSlice } from '@reduxjs/toolkit'

interface DashboardState {
  parleys: any
  loading: boolean
  error: string | null
  totalMembers: number
  totalMembersChange: number
  totalRevenue: number
  totalRevenueChange: number
  conversionRate: number
  conversionChangePercent: number
  chapterHealth: number
  healthChangePercent: number
  totalParleys: number
  parleysChangePercent: number
  totalTreasureMaps: number
  treasureMapsChangePercent: number
  totalAnchors: number
  anchorsChangePercent: number
  memberRetention: number
  retentionChangePercent: number
  weeklyActivity: any[]
  industrySlots: any[]
  capacityPercent: number
  activeUsersCount: number
  participationPercent: number
  buckets: any[]
  topPerformers: any[]
  newApplicationsCount: number
  parleyRequestsCount: number
}

const initialState: DashboardState = {
  loading: true,
  error: null,
  totalMembers: 0,
  totalMembersChange: 0,
  totalRevenue: 0,
  totalRevenueChange: 0,
  conversionRate: 0,
  conversionChangePercent: 0,
  chapterHealth: 0,
  healthChangePercent: 0,
  totalParleys: 0,
  parleysChangePercent: 0,
  totalTreasureMaps: 0,
  treasureMapsChangePercent: 0,
  totalAnchors: 0,
  anchorsChangePercent: 0,
  memberRetention: 0,
  retentionChangePercent: 0,
  weeklyActivity: [],
  industrySlots: [],
  capacityPercent: 0,
  activeUsersCount: 0,
  participationPercent: 0,
  buckets: [],
  topPerformers: [],
  newApplicationsCount: 0,
  parleyRequestsCount: 0,
  parleys: []
}

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {}
})

export const {} = dashboardSlice.actions
export const dashboardReducer = dashboardSlice.reducer
