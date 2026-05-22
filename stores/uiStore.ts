import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedCampanaId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedCampana: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedCampanaId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSelectedCampana: (selectedCampanaId) => set({ selectedCampanaId }),
}));
