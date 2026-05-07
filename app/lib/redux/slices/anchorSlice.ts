import { createSlice } from '@reduxjs/toolkit'

interface AnchorState {
  anchorDrawer: boolean
}

const initialState: AnchorState = {
  anchorDrawer: false
}
export const anchorSlice = createSlice({
  name: 'anchor',
  initialState,
  reducers: {
    setOpenAnchorDrawer: (state) => {
      state.anchorDrawer = true
    },
    setCloseAnchorDrawer: (state) => {
      state.anchorDrawer = false
    }
  }
})

export const { setOpenAnchorDrawer, setCloseAnchorDrawer } = anchorSlice.actions

export const anchorReducer = anchorSlice.reducer
