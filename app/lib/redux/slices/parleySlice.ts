import { createSlice } from '@reduxjs/toolkit'

export interface ParleyStatePayload {
  parleyDrawer: boolean
}

const initialParleyState: ParleyStatePayload = {
  parleyDrawer: false
}

export const parleySlice = createSlice({
  name: 'parley',
  initialState: initialParleyState,
  reducers: {
    setOpenParleyDrawer: (state) => {
      state.parleyDrawer = true
    },
    setCloseParleyDrawer: (state) => {
      state.parleyDrawer = false
    }
  }
})

export const { setOpenParleyDrawer, setCloseParleyDrawer } = parleySlice.actions

export const parleyReducer = parleySlice.reducer
