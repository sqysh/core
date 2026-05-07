import { Reducer, createSlice } from '@reduxjs/toolkit'

export interface AdminStatePayload {
  loading: boolean
  manageMembersDrawer: boolean
  addMemberDrawer: boolean
  selectedTimeframe: string
  selectedPage: string
  isActionsOpen: boolean
  isDrawerOpen: boolean
}

const initialAdminState: AdminStatePayload = {
  loading: false,
  manageMembersDrawer: false,
  addMemberDrawer: false,
  selectedTimeframe: 'week',
  selectedPage: 'dashboard',
  isActionsOpen: false,
  isDrawerOpen: false
}

export const adminSlice = createSlice({
  name: 'admin',
  initialState: initialAdminState,
  reducers: {
    setSelectedTimeframe: (state, action) => {
      state.selectedTimeframe = action.payload
    },
    setSelectedPage: (state, action) => {
      state.selectedPage = action.payload
    },
    toggleActionsDropdown: (state) => {
      state.isActionsOpen = !state.isActionsOpen
    },
    closeActionsDropdown: (state) => {
      state.isActionsOpen = false
    },
    openActionsDropdown: (state) => {
      state.isActionsOpen = true
    },
    toggleNavigationDrawer: (state) => {
      state.isDrawerOpen = !state.isDrawerOpen
    },
    openNavigationDrawer: (state) => {
      state.isDrawerOpen = true
    },
    closeNavigationDrawer: (state) => {
      state.isDrawerOpen = false
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    }
  }
})

export const adminReducer = adminSlice.reducer as Reducer<AdminStatePayload>

export const {
  setSelectedTimeframe,
  setSelectedPage,
  toggleActionsDropdown,
  closeActionsDropdown,
  openActionsDropdown,
  toggleNavigationDrawer,
  openNavigationDrawer,
  closeNavigationDrawer,
  setLoading
} = adminSlice.actions
