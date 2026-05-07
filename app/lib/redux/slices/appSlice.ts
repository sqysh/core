import { Reducer, createSlice } from '@reduxjs/toolkit'

export interface AppStatePayload {
  handbookDrawer: boolean
  mobileNavigation: boolean
  navigationDrawer: boolean
  isNavigationCollapsed: boolean
  actionDropdown: boolean
  itemAction: string | null
  isDark: boolean
}

const initialAppState: AppStatePayload = {
  handbookDrawer: false,
  mobileNavigation: false,
  navigationDrawer: false,
  isNavigationCollapsed: false,
  actionDropdown: false,
  itemAction: null,
  isDark: false
}

export const appSlice = createSlice({
  name: 'app',
  initialState: initialAppState,
  reducers: {
    setOpenHandbookDrawer: (state) => {
      state.handbookDrawer = true
    },
    setCloseHandbookDrawer: (state) => {
      state.handbookDrawer = false
    },
    setOpenMobileNavigation: (state) => {
      state.mobileNavigation = true
    },
    setCloseMobileNavigation: (state) => {
      state.mobileNavigation = false
    },
    setOpenNavigationDrawer: (state) => {
      state.navigationDrawer = true
    },
    setCloseNavigationDrawer: (state) => {
      state.navigationDrawer = false
    },
    setIsNavigationCollapsed: (state, payload) => {
      state.isNavigationCollapsed = !payload
    },
    setOpenActionDropdown: (state) => {
      state.actionDropdown = true
    },
    setCloseActionDropdown: (state) => {
      state.actionDropdown = false
    },
    setToggleActionDropdown: (state, { payload }) => {
      state.actionDropdown = !payload
    },
    setOpenActionDropdownSubmenu: (state, { payload }) => {
      state.itemAction = payload
    },
    setCloseActionDropdownSubmenu: (state) => {
      state.itemAction = null
    },
    setIsDark: (state, { payload }) => {
      state.isDark = payload
    }
  }
})

export const appReducer = appSlice.reducer as Reducer<AppStatePayload>

export const {
  setOpenHandbookDrawer,
  setCloseHandbookDrawer,
  setOpenMobileNavigation,
  setCloseMobileNavigation,
  setOpenNavigationDrawer,
  setCloseNavigationDrawer,
  setIsNavigationCollapsed,
  setOpenActionDropdown,
  setCloseActionDropdown,
  setOpenActionDropdownSubmenu,
  setCloseActionDropdownSubmenu,
  setToggleActionDropdown,
  setIsDark
} = appSlice.actions
