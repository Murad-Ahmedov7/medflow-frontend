export type FeedbackCategory = 'Complaint' | 'Suggestion';
export type FeedbackStatus = 'Open' | 'InReview' | 'Resolved';

export interface AdminFeedbackResponse {
  id: string;
  patientFullName: string;
  patientEmail: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  adminResponse: string | null;
  adminRespondedAt: string | null;
}

export interface UpdateFeedbackRequest {
  status: FeedbackStatus;
  adminResponse?: string | null;
}
