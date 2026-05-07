import { Reducer, createSlice } from '@reduxjs/toolkit'

export interface ReportStatePayload {
  reportSuspiciousActivity: boolean
}

const initialReportState: ReportStatePayload = {
  reportSuspiciousActivity: false
}

export const ReportSlice = createSlice({
  name: 'report',
  initialState: initialReportState,
  reducers: {
    setOpenReportSuspiciousActivityDrawer: (state) => {
      state.reportSuspiciousActivity = true
    },
    setCloseReportSuspiciousActivityDrawer: (state) => {
      state.reportSuspiciousActivity = false
    }
  }
})

export const { setOpenReportSuspiciousActivityDrawer, setCloseReportSuspiciousActivityDrawer } = ReportSlice.actions

export const reportReducer = ReportSlice.reducer as Reducer<ReportStatePayload>
