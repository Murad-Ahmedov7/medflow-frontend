export type FeedbackCategory = 'Complaint' | 'Suggestion';
export type FeedbackStatus = 'Open' | 'InReview' | 'Resolved';

export interface FeedbackResponse {
  id: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  adminResponse: string | null;
  adminRespondedAt: string | null;
}

export interface CreateFeedbackRequest {
  category: FeedbackCategory;
  subject: string;
  message: string;
}
