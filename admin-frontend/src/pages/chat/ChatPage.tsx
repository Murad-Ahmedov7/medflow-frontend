import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, ChevronLeft, ChevronDown, Users, Clock, CheckCheck, Ban } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useMyChats, useChatMessages, useSendMessage, CHATS_KEY } from '../../hooks/useChats';
import { useAuthStore } from '../../store/authStore';
import { chatService } from '../../services/chat.service';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../api/config';
import type { ChatSummaryDto, MessageDto } from '../../types/chat.types';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function resolveAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function UserAvatar({ url, name, size = 10 }: { url?: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveAvatar(url);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sizeClass = `w-${size} h-${size}`;

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        className={cn(sizeClass, 'rounded-full object-cover')}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={cn(sizeClass, 'rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs shrink-0')}>
      {initials}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function isChatReadOnly(chat: ChatSummaryDto): boolean {
  return chat.type === 'Appointment' &&
    (chat.appointmentStatus === 'Completed' || chat.appointmentStatus === 'Cancelled');
}

function closedBannerKey(chat: ChatSummaryDto): string {
  if (chat.appointmentStatus === 'Completed') return 'chat.closedCompleted';
  if (chat.appointmentStatus === 'Cancelled') return 'chat.closedCancelled';
  return 'chat.closedDefault';
}

function ClosedChatBanner({ chat }: { chat: ChatSummaryDto }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-4 mb-3 flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3"
    >
      <Ban size={15} className="shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {t(closedBannerKey(chat))}
      </p>
    </motion.div>
  );
}

function useApptHelpers() {
  const { t } = useTranslation();
  function visitTypeLabel(type?: string | null): string {
    if (type === 'FirstVisit') return t('chat.firstVisit');
    if (type === 'FollowUpVisit') return t('chat.followUp');
    return '';
  }
  function statusLabel(status?: string | null): string {
    if (status === 'Waiting') return t('chat.statusWaiting');
    if (status === 'InProgress') return t('chat.statusInProgress');
    if (status === 'Completed') return t('chat.statusCompleted');
    if (status === 'Cancelled') return t('chat.statusCancelled');
    return '';
  }
  function formatApptDate(iso?: string | null): string {
    if (!iso) return '';
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }
  function apptMeta(chat: ChatSummaryDto): string {
    if (chat.type !== 'Appointment') return '';
    const parts: string[] = [];
    if (chat.appointmentDate) parts.push(formatApptDate(chat.appointmentDate));
    if (chat.appointmentStartTime) parts.push(chat.appointmentStartTime);
    return parts.join(' • ');
  }
  return { visitTypeLabel, statusLabel, apptMeta };
}

const STATUS_PILL: Record<string, string> = {
  Waiting:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  InProgress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Completed:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Cancelled:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

function getOtherParticipant(chat: ChatSummaryDto, myUserId: string) {
  return chat.participants.find(p => p.userId !== myUserId) ?? chat.participants[0];
}

// ── Participant grouping ───────────────────────────────────────────────────────

interface ParticipantGroup {
  participantId: string;
  participantName: string;
  participantAvatarUrl: string | null | undefined;
  totalUnread: number;
  chats: ChatSummaryDto[];
}

const STATUS_GROUP_ORDER = ['Waiting', 'InProgress', 'Completed', 'Cancelled'] as const;

const STATUS_DOT: Record<string, string> = {
  Waiting: 'bg-amber-400',
  InProgress: 'bg-cyan-400',
  Completed: 'bg-emerald-400',
  Cancelled: 'bg-rose-400',
};

function groupChatsByParticipant(chats: ChatSummaryDto[], myUserId: string): ParticipantGroup[] {
  const groups = new Map<string, ParticipantGroup>();
  for (const chat of chats) {
    const other = getOtherParticipant(chat, myUserId);
    const key = other.userId;
    let group = groups.get(key);
    if (!group) {
      group = { participantId: key, participantName: other.fullName, participantAvatarUrl: other.avatarUrl, totalUnread: 0, chats: [] };
      groups.set(key, group);
    }
    group.chats.push(chat);
    group.totalUnread += chat.unreadCount;
  }
  for (const group of groups.values()) {
    group.chats.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt ?? a.createdAt;
      const bTime = b.lastMessage?.sentAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }
  return Array.from(groups.values()).sort((a, b) => b.totalUnread - a.totalUnread || a.participantName.localeCompare(b.participantName));
}

function ParticipantGroupCard({ group, activeChatId, onSelectChat }: {
  group: ParticipantGroup; activeChatId: string | undefined; onSelectChat: (id: string) => void;
}) {
  const containsActive = group.chats.some(c => c.id === activeChatId);
  const [expanded, setExpanded] = useState(containsActive);

  useEffect(() => {
    if (containsActive) setExpanded(true);
  }, [containsActive]);

  const { statusLabel, apptMeta } = useApptHelpers();

  const statusBuckets = useMemo(() => {
    const buckets = new Map<string, ChatSummaryDto[]>();
    for (const chat of group.chats) {
      const status = chat.type === 'Appointment' ? (chat.appointmentStatus ?? 'Waiting') : 'Other';
      if (!buckets.has(status)) buckets.set(status, []);
      buckets.get(status)!.push(chat);
    }
    return buckets;
  }, [group.chats]);

  const orderedStatuses = [
    ...STATUS_GROUP_ORDER.filter(s => statusBuckets.has(s)),
    ...Array.from(statusBuckets.keys()).filter(s => !STATUS_GROUP_ORDER.includes(s as typeof STATUS_GROUP_ORDER[number])),
  ];

  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className={cn(
          'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors rounded-xl',
          containsActive ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar url={group.participantAvatarUrl} name={group.participantName} size={10} />
          {group.totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {group.totalUnread > 99 ? '99+' : group.totalUnread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{group.participantName}</span>
          <span className="text-xs text-slate-400 shrink-0">({group.chats.length})</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-1 pb-2 space-y-2">
              {orderedStatuses.map(status => (
                <div key={status}>
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-slate-400')} />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {status === 'Other' ? status : statusLabel(status)} ({statusBuckets.get(status)!.length})
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {statusBuckets.get(status)!.map(chat => {
                      const selected = chat.id === activeChatId;
                      return (
                        <button
                          key={chat.id}
                          onClick={() => onSelectChat(chat.id)}
                          className={cn(
                            'w-full text-left pl-3 pr-2 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors',
                            selected
                              ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                          )}
                        >
                          <span className="truncate">{apptMeta(chat) || 'Chat'}</span>
                          {chat.unreadCount > 0 && (
                            <span className="shrink-0 min-w-[16px] h-[16px] bg-cyan-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Grey ✓✓ = delivered (message saved, recipient will receive it on next open).
// Blue ✓✓ = read (recipient has opened the conversation and MarkMessagesRead ran).
function MessageTicks({ msg, myUserId }: { msg: MessageDto; myUserId: string }) {
  const isRead = msg.readBy.length > 0;
  return (
    <CheckCheck
      className={`inline w-3 h-3 ml-0.5 -mt-0.5 shrink-0 ${isRead ? 'text-cyan-400' : 'text-white/50'}`}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function ChatPage() {
  const { t } = useTranslation();
  const { visitTypeLabel, statusLabel, apptMeta } = useApptHelpers();
  const user = useAuthStore(s => s.user);
  const myUserId = user?.id ?? '';

  const [searchParams, setSearchParams] = useSearchParams();
  const { data: chats = [], isLoading } = useMyChats();
  const [activeChatId, setActiveChatId] = useState<string | undefined>(() => searchParams.get('open') ?? undefined);
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) {
      setActiveChatId(openId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const qc = useQueryClient();
  const { data: messages = [] } = useChatMessages(activeChatId);
  const sendMsg = useSendMessage(activeChatId ?? '');

  const activeChat = chats.find(c => c.id === activeChatId);
  const participantGroups = useMemo(() => groupChatsByParticipant(chats, myUserId), [chats, myUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark read whenever the chat is opened or a new inbound message arrives.
  const lastMsgIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!activeChatId) return;
    const lastId = messages[messages.length - 1]?.id;
    // Only fire when the last message changed and it's not from us (inbound).
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = lastId;
    chatService.markRead(activeChatId).then(() => {
      qc.invalidateQueries({ queryKey: CHATS_KEY });
    });
  }, [activeChatId, messages, qc]);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || !activeChatId) return;
    setBody('');
    sendMsg.mutate(trimmed);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">

      {/* ── Sidebar ── */}
      <div className={cn(
        'flex flex-col border-r border-slate-100 dark:border-slate-800',
        activeChatId ? 'hidden md:flex w-80' : 'flex w-full md:w-80',
      )}>
        <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-500" />
            {t('chat.title', 'Messages')}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400">
              <Users className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">{t('chat.noConversations', 'No conversations yet')}</p>
            </div>
          ) : (
            participantGroups.map(group => (
              <ParticipantGroupCard
                key={group.participantId}
                group={group}
                activeChatId={activeChatId}
                onSelectChat={id => setActiveChatId(id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Message pane ── */}
      <AnimatePresence mode="wait">
        {activeChatId && activeChat ? (
          <motion.div
            key={activeChatId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveChatId(undefined)}
                className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {(() => {
                const other = getOtherParticipant(activeChat, myUserId);
                const isAppt = activeChat.type === 'Appointment';
                const metaLine = isAppt
                  ? [visitTypeLabel(activeChat.appointmentType), apptMeta(activeChat)].filter(Boolean).join(' • ')
                  : `${activeChat.type} Chat`;
                return (
                  <>
                    <UserAvatar url={other.avatarUrl} name={other.fullName} size={9} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{other.fullName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs text-slate-400 truncate">{metaLine}</p>
                        {isAppt && activeChat.appointmentStatus && (
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', STATUS_PILL[activeChat.appointmentStatus] ?? STATUS_PILL.Waiting)}>
                            {statusLabel(activeChat.appointmentStatus)}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map(msg => {
                const isMine = msg.senderId === myUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('max-w-[70%]')}>
                      {!isMine && (
                        <p className="text-[11px] text-slate-400 mb-1 ml-1">{msg.senderName}</p>
                      )}
                      <div className={cn(
                        'px-3 py-2 rounded-2xl text-sm',
                        isMine
                          ? 'bg-cyan-500 text-white rounded-tr-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm',
                      )}>
                        {msg.body}
                      </div>
                      <p className={cn('text-[10px] text-slate-400 mt-1 flex items-center gap-0.5', isMine ? 'justify-end' : 'justify-start')}>
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        {formatTime(msg.sentAt)}
                        {isMine && <MessageTicks msg={msg} myUserId={myUserId} />}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {isChatReadOnly(activeChat) ? (
              <ClosedChatBanner chat={activeChat} />
            ) : (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <input
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={t('chat.messagePlaceholder', 'Type a message…')}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                <button
                  onClick={handleSend}
                  disabled={!body.trim() || sendMsg.isPending}
                  className="p-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-slate-400"
          >
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm">{t('chat.selectConversation', 'Select a conversation to start messaging')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
