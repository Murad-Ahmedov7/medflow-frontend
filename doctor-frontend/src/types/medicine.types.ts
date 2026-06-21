// GET /api/medicine — backend now returns strings for Form and Unit
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
}

export const MEDICINE_FORM_OPTIONS = [
  { value: 'Tablet',    label: 'Tablet',    color: 'bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-400' },
  { value: 'Capsule',   label: 'Capsule',   color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' },
  { value: 'Syrup',     label: 'Syrup',     color: 'bg-amber-50  text-amber-700  dark:bg-amber-900/20  dark:text-amber-400' },
  { value: 'Injection', label: 'Injection', color: 'bg-rose-50   text-rose-700   dark:bg-rose-900/20   dark:text-rose-400' },
  { value: 'Drops',     label: 'Drops',     color: 'bg-cyan-50   text-cyan-700   dark:bg-cyan-900/20   dark:text-cyan-400' },
  { value: 'Cream',     label: 'Cream',     color: 'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-400' },
  { value: 'Ointment',  label: 'Ointment',  color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
  { value: 'Spray',     label: 'Spray',     color: 'bg-teal-50   text-teal-700   dark:bg-teal-900/20   dark:text-teal-400' },
] as const;

export const FORM_BADGE_COLOR: Record<string, string> = Object.fromEntries(
  MEDICINE_FORM_OPTIONS.map(o => [o.value, o.color])
);

export function medicineLabel(m: MedicineResponse): string {
  return m.form ? `${m.name} · ${m.form}` : m.name;
}
