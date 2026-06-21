export interface FavoriteDoctorResponse {
  doctorId: string;
  fullName: string;
  specialty: string;
  departmentName: string;
  imageUrl: string | null;
  yearsOfExperience: number;
  consultationFee: number;
  isActive: boolean;
  favoritedAt: string;
}

export interface ToggleFavoriteResult {
  isFavorited: boolean;
}
