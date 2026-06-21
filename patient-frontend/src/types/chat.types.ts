export type ChatType = 'Appointment' | 'Support' | 'Internal';

export interface ChatParticipantDto {
  userId: string;
  fullName: string;
  unreadCount: number;
  avatarUrl?: string | null;
}

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  sentAt: string;
  readBy: string[]; // user IDs who have read this message (excludes sender)
}

export interface ChatSummaryDto {
  id: string;
  type: ChatType;
  appointmentId?: string | null;
  appointmentStatus?: string | null;    // 'Waiting'|'InProgress'|'Completed'|'Cancelled'; null for non-Appointment chats
  appointmentDate?: string | null;      // "2026-06-15" (ISO date); null for non-Appointment chats
  appointmentStartTime?: string | null; // "HH:mm" e.g. "10:30"; null for non-Appointment chats
  appointmentType?: string | null;      // 'FirstVisit'|'FollowUpVisit'; null for non-Appointment chats
  participants: ChatParticipantDto[];
  lastMessage?: MessageDto | null;
  unreadCount: number;
  createdAt: string;
}

export interface SendMessageRequest {
  body: string;
}

export interface GetOrCreateChatRequest {
  appointmentId?: string | null;
  otherUserId?: string | null;
  type: number; // 1=Appointment, 2=Support, 3=Internal
}
