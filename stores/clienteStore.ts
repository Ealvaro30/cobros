import { create } from 'zustand';

interface ClienteState {
  selectedClienteId: string | null;
  isModalOpen: boolean;
  isTimelineOpen: boolean;
  searchQuery: string;
  filterBucket: number | null;
  filterEstado: string | null;
  filterAgente: string | null;
  setSelectedCliente: (id: string | null) => void;
  openModal: (id?: string) => void;
  closeModal: () => void;
  openTimeline: (id: string) => void;
  closeTimeline: () => void;
  setSearchQuery: (query: string) => void;
  setFilterBucket: (bucket: number | null) => void;
  setFilterEstado: (estado: string | null) => void;
  setFilterAgente: (agente: string | null) => void;
  resetFilters: () => void;
}

export const useClienteStore = create<ClienteState>((set) => ({
  selectedClienteId: null,
  isModalOpen: false,
  isTimelineOpen: false,
  searchQuery: '',
  filterBucket: null,
  filterEstado: null,
  filterAgente: null,
  setSelectedCliente: (id) => set({ selectedClienteId: id }),
  openModal: (id) => set({ isModalOpen: true, selectedClienteId: id || null }),
  closeModal: () => set({ isModalOpen: false, selectedClienteId: null }),
  openTimeline: (id) => set({ isTimelineOpen: true, selectedClienteId: id }),
  closeTimeline: () => set({ isTimelineOpen: false }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterBucket: (filterBucket) => set({ filterBucket }),
  setFilterEstado: (filterEstado) => set({ filterEstado }),
  setFilterAgente: (filterAgente) => set({ filterAgente }),
  resetFilters: () =>
    set({ searchQuery: '', filterBucket: null, filterEstado: null, filterAgente: null }),
}));
