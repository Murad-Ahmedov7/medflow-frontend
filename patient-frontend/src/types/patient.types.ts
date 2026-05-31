export type Gender = 'Male' | 'Female';

export type BloodGroup =
  | 'Unknown'
  | 'OPlus'
  | 'OMinus'
  | 'APlus'
  | 'AMinus'
  | 'BPlus'
  | 'BMinus'
  | 'ABPlus'
  | 'ABMinus';

export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  Unknown: '',           // placeholder text comes from i18n key profile.bloodGroupSelect
  OPlus:   'I (O) Rh+',
  OMinus:  'I (O) Rh−',
  APlus:   'II (A) Rh+',
  AMinus:  'II (A) Rh−',
  BPlus:   'III (B) Rh+',
  BMinus:  'III (B) Rh−',
  ABPlus:  'IV (AB) Rh+',
  ABMinus: 'IV (AB) Rh−',
};

export interface MyPatientProfileResponse {
  id?: string;
  fullName: string;     // User.FullName — kept in sync with firstName + lastName
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
  fin?: string;
  address?: string;
  birthDate?: string;   // ISO date string, nullable
  gender?: Gender;
  bloodGroup: BloodGroup;
  allergies?: string;
  profileCompletionPercentage: number;
  isProfileComplete: boolean;
  missingFields: string[];
}

export interface UpdateMyPatientProfileRequest {
  fin?: string;
  address?: string;
  birthDate?: string;   // ISO date string
  gender?: Gender | null;
  bloodGroup: BloodGroup;
  allergies?: string;
}
