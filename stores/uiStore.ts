import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedCampanaId: string | null;
  pendingCallClientId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedCampana: (id: string | null) => void;
  setPendingCallClientId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedCampanaId: null,
  pendingCallClientId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSelectedCampana: (selectedCampanaId) => set({ selectedCampanaId }),
  setPendingCallClientId: (pendingCallClientId) => set({ pendingCallClientId }),
}));
