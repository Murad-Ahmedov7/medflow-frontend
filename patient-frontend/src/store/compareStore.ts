import { create } from 'zustand';

export interface CompareDoctor {
  id: string;
  fullName: string;
  specialty: string;
  departmentName: string;
  imageUrl?: string;
  yearsOfExperience: number;
  consultationFee: number;
  isActive: boolean;
}

interface CompareState {
  doctors: CompareDoctor[];
  add:    (doctor: CompareDoctor) => void;
  remove: (id: string) => void;
  toggle: (doctor: CompareDoctor) => void;
  clear:  () => void;
}

export const MAX_COMPARE = 3;

export const useCompareStore = create<CompareState>()((set, get) => ({
  doctors: [],

  add: (doctor) => {
    const prev = get().doctors;
    if (prev.some((d) => d.id === doctor.id)) return;
    if (prev.length >= MAX_COMPARE) return;
    set({ doctors: [...prev, doctor] });
  },

  remove: (id) => {
    set({ doctors: get().doctors.filter((d) => d.id !== id) });
  },

  toggle: (doctor) => {
    const prev = get().doctors;
    if (prev.some((d) => d.id === doctor.id)) {
      set({ doctors: prev.filter((d) => d.id !== doctor.id) });
    } else {
      if (prev.length >= MAX_COMPARE) return;
      set({ doctors: [...prev, doctor] });
    }
  },

  clear: () => set({ doctors: [] }),
}));
