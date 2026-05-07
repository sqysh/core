import { Reducer, createSlice } from '@reduxjs/toolkit'

export interface UserState {
  addUserDrawer: boolean
}

export const initialUserState: UserState = {
  addUserDrawer: false
}

export const userSlice = createSlice({
  name: 'user',
  initialState: initialUserState,
  reducers: {
    setOpenAddUserDrawer: (state) => {
      state.addUserDrawer = true
    },
    setCloseAddUserDrawer: (state) => {
      state.addUserDrawer = false
    }
  }
})

export const userReducer = userSlice.reducer as Reducer<UserState>

export const { setOpenAddUserDrawer, setCloseAddUserDrawer } = userSlice.actions
