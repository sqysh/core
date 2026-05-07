import { createSlice } from '@reduxjs/toolkit'

// Redux state interface
interface TreasureMapState {
  treasureMapDrawer: boolean
}

// Initial Redux state
const initialTreasureMapState: TreasureMapState = {
  treasureMapDrawer: false
}

export const treasureMapSlice = createSlice({
  name: 'treasureMap',
  initialState: initialTreasureMapState,
  reducers: {
    setOpenTreasureMapDrawer: (state) => {
      state.treasureMapDrawer = true
    },
    setCloseTreasureMapDrawer: (state) => {
      state.treasureMapDrawer = false
    }
  }
})

export const { setOpenTreasureMapDrawer, setCloseTreasureMapDrawer } = treasureMapSlice.actions

export const treasureMapReducer = treasureMapSlice.reducer
