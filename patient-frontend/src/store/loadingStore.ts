import { create } from 'zustand';

interface LoadingState {
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isGlobalLoading: false,
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
}));
