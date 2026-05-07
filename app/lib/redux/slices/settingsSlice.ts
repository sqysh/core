import { createSlice } from '@reduxjs/toolkit'

interface SettingsState {
  loading: boolean
  error: string | null
  settings: {
    name: string
    location: string
    meetingDay: string
    meetingTime: string
    meetingFrequency: string
    hasUnlockedGrog: boolean
    hasUnlockedMuster: boolean
    hasUnlockedBooty: boolean
  }
}

const initialState: SettingsState = {
  loading: false,
  error: null,
  settings: {
    name: '',
    location: '',
    meetingDay: '',
    meetingTime: '',
    meetingFrequency: 'WEEKKLY',
    hasUnlockedGrog: false,
    hasUnlockedMuster: false,
    hasUnlockedBooty: false
  }
}

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    resetSettingsError: (state) => {
      state.error = null
    },
    setChapter: (state, { payload }) => {
      state.settings = payload
    }
  }
})

export const { resetSettingsError, setChapter } = settingsSlice.actions
export const settingsReducer = settingsSlice.reducer
