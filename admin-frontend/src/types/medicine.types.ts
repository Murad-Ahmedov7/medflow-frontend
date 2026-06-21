import type { SupplierSummaryResponse } from './supplier.types';

export interface MedicineResponse {
  id: string;
  name: string;
  genericName?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  strength?: string | null;
  sellingPrice: number;
  form: string;
  unit: string;
  isAvailableInHospital: boolean;
  prescriptionCount: number;
  createdAt: string;
  suppliers: SupplierSummaryResponse[];
  stockQuantity?: number | null;
}

export interface CreateMedicineRequest {
  name: string;
  genericName?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  strength?: string | null;
  sellingPrice: number;
  form: number;
  unit: number;
  isAvailableInHospital: boolean;
}

export interface UpdateMedicineRequest {
  name: string;
  genericName?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  strength?: string | null;
  sellingPrice: number;
  form: number;
  unit: number;
  isAvailableInHospital: boolean;
}

export const MEDICINE_FORM_OPTIONS = [
  { value: 1, label: 'Tablet' },
  { value: 2, label: 'Capsule' },
  { value: 3, label: 'Syrup' },
  { value: 4, label: 'Injection' },
  { value: 5, label: 'Drops' },
  { value: 6, label: 'Cream' },
  { value: 7, label: 'Ointment' },
  { value: 8, label: 'Spray' },
] as const;

export const MEDICINE_UNIT_OPTIONS = [
  { value: 1, label: 'mg' },
  { value: 2, label: 'ml' },
  { value: 3, label: 'tab' },
  { value: 4, label: 'cap' },
  { value: 5, label: 'drop' },
] as const;

export const MEDICINE_FORM_NUM: Record<string, number> = {
  Tablet: 1, Capsule: 2, Syrup: 3, Injection: 4,
  Drops: 5, Cream: 6, Ointment: 7, Spray: 8,
};

export const MEDICINE_UNIT_NUM: Record<string, number> = {
  Mg: 1, Ml: 2, Tablet: 3, Capsule: 4, Drop: 5,
};

export const MEDICINE_FORM_BADGE: Record<string, string> = {
  Tablet:    'bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-400',
  Capsule:   'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  Syrup:     'bg-amber-50  text-amber-700  dark:bg-amber-900/20  dark:text-amber-400',
  Injection: 'bg-rose-50   text-rose-700   dark:bg-rose-900/20   dark:text-rose-400',
  Drops:     'bg-cyan-50   text-cyan-700   dark:bg-cyan-900/20   dark:text-cyan-400',
  Cream:     'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-400',
  Ointment:  'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  Spray:     'bg-teal-50   text-teal-700   dark:bg-teal-900/20   dark:text-teal-400',
};

export type MedicineSortBy = 'name' | 'price' | 'createdAt' | 'prescribed' | 'quantity';
