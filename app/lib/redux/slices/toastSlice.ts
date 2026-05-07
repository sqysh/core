// src/store/slices/toastSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ToastState {
  isVisible: boolean
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  description?: string
  duration?: number
}

const initialState: ToastState = {
  isVisible: false,
  type: 'success',
  message: '',
  description: '',
  duration: 7000
}

export const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<Omit<ToastState, 'isVisible'>>) => {
      state.isVisible = true
      state.type = action.payload.type
      state.message = action.payload.message
      state.description = action.payload.description
      state.duration = action.payload.duration || 7000
    },
    hideToast: (state) => {
      state.isVisible = false
    }
  }
})

export const { showToast, hideToast } = toastSlice.actions
export const toastReduer = toastSlice.reducer
