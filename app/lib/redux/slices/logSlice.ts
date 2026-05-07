import { Reducer, createSlice } from '@reduxjs/toolkit'

export interface LogStatePayload {
  loading: boolean
  success: boolean
  error: { data: { message: string } }
  message: string | null
  logs: []
  log: object | any
}

const errorState = { data: { message: '' } }

export const initialLogState: LogStatePayload = {
  loading: true,
  success: false,
  error: errorState,
  message: '',
  logs: [],
  log: {}
}

export const logSlice = createSlice({
  name: 'log',
  initialState: initialLogState,
  reducers: {
    setLogs: (state, { payload }) => {
      state.logs = payload
    }
  }
})

export const logReducer = logSlice.reducer as Reducer<LogStatePayload>

export const { setLogs } = logSlice.actions
