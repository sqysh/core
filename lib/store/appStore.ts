import { create } from 'zustand'

interface AppState {
  navigationDrawer: boolean
  isDark: boolean
  openNavigationDrawer: () => void
  closeNavigationDrawer: () => void
  setIsDark: (dark: boolean) => void
  membershipPaymentSetupModal: boolean
  openMembershipPaymentSetupModal: () => void
  closeMembershipPaymentSetupModal: () => void
}

export const useAppStore = create<AppState>((set) => ({
  navigationDrawer: false,
  isDark: false,
  membershipPaymentSetupModal: false,
  openNavigationDrawer: () => set({ navigationDrawer: true }),
  closeNavigationDrawer: () => set({ navigationDrawer: false }),
  setIsDark: (dark) => set({ isDark: dark }),
  openMembershipPaymentSetupModal: () => set({ membershipPaymentSetupModal: true }),
  closeMembershipPaymentSetupModal: () => set({ membershipPaymentSetupModal: false })
}))
