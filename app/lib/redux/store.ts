'use client'

import { combineReducers } from 'redux'
import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { formReducer } from './slices/formSlice'
import { logReducer } from './slices/logSlice'
import { adminReducer } from './slices/adminSlice'
import { parleyReducer } from './slices/parleySlice'
import { userReducer } from './slices/userSlice'
import { toastReduer } from './slices/toastSlice'
import { settingsReducer } from './slices/settingsSlice'
import { appReducer } from './slices/appSlice'
import { anchorReducer } from './slices/anchorSlice'
import { treasureMapReducer } from './slices/treasureMapSlice'
import { dashboardReducer } from './slices/dashboardSlice'
import { reportReducer } from './slices/reportSlice'

const rootReducer = combineReducers({
  form: formReducer,
  user: userReducer,
  log: logReducer,
  admin: adminReducer,
  parley: parleyReducer,
  toast: toastReduer,
  settings: settingsReducer,
  app: appReducer,
  anchor: anchorReducer,
  treasureMap: treasureMapReducer,
  dashboard: dashboardReducer,
  report: reportReducer
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false
    })
})

export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export type AppSelector = typeof store.getState

export const useAppDispatch: () => AppDispatch = useDispatch

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const useUserSelector = () => useAppSelector((state) => state.user)
export const useAdminSelector = () => useAppSelector((state) => state.admin)
export const useToastSelector = () => useAppSelector((state) => state.toast)
export const useSettingsSelector = () => useAppSelector((state) => state.settings)
export const useParleySelector = () => useAppSelector((state) => state.parley)
export const useFormSelector = () => useAppSelector((state) => state.form)
export const useAnchorSelector = () => useAppSelector((state) => state.anchor)
export const useTreasureMapSelector = () => useAppSelector((state) => state.treasureMap)
export const useDashboardSelector = () => useAppSelector((state) => state.dashboard)
export const useApplicationSelector = () => useAppSelector((state) => state.app)
export const useReportSlice = () => useAppSelector((state) => state.report)
