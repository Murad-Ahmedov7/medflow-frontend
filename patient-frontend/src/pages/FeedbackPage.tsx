import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, ChevronDown, Clock, Search, MessageCircleReply, ChevronRight, LogIn } from 'lucide-react';
import { cn } from '../utils/cn';
import { useMyFeedback, useSubmitFeedback } from '../hooks/useFeedback';
import { useFeedbackHub } from '../hooks/useFeedbackHub';
import { useMyPatientProfile } from '../hooks/usePatientProfile';
import { useAuthStore } from '../store/authStore';
import type { FeedbackCategory, FeedbackResponse, FeedbackStatus } from '../types/feedback.types';

// ── Schema ────────────────────────────────────────────────────────────────────

const feedbackSchema = z.object({
  category: z.enum(['Complaint', 'Suggestion'], { required_error: 'Category is required.' }),
  subject: z.string().min(1, 'Subject is required.').max(200),
  message: z.string().min(1, 'Message is required.').max(2000),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status: FeedbackStatus, t: (key: string) => string) {
  const map: Record<FeedbackStatus, { label: string; cls: string }> = {
    Open:     { label: t('feedback.statusOpen'),     cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800/40' },
    InReview: { label: t('feedback.statusInReview'), cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-800/40' },
    Resolved: { label: t('feedback.statusResolved'), cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/40' },
  };
  const { label, cls } = map[status] ?? map.Open;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', cls)}>
      {label}
    </span>
  );
}

function categoryLabel(category: FeedbackCategory, t: (key: string) => string) {
  return category === 'Complaint' ? t('feedback.categoryComplaint') : t('feedback.categorySuggestion');
}

// ── Feedback item with expandable admin response ───────────────────────────────

function FeedbackItem({ item, t }: { item: FeedbackResponse; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const hasResponse = !!item.adminResponse;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden"
    >
      {/* Main row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className={cn(
          'w-full text-left px-5 py-4 flex items-start gap-4 transition-colors',
          'hover:bg-slate-50 dark:hover:bg-slate-800/60',
          expanded && 'bg-slate-50 dark:bg-slate-800/60',
        )}
      >
        {/* Category + subject */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {categoryLabel(item.category, t)}
            </span>
            {hasResponse && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <MessageCircleReply size={11} />
                {t('feedback.hasResponse')}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {item.subject}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {fmtDate(item.createdAt)}
          </p>
        </div>

        {/* Status + expand icon */}
        <div className="flex items-center gap-3 shrink-0">
          {statusBadge(item.status, t)}
          <ChevronRight
            size={15}
            className={cn(
              'text-slate-400 dark:text-slate-500 transition-transform duration-200',
              expanded && 'rotate-90',
            )}
          />
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-700">

              {/* Patient's message */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  {t('feedback.yourMessage')}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>
              </div>

              {/* Admin response */}
              {hasResponse ? (
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircleReply size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('feedback.adminResponseLabel')}
                    </p>
                    {item.adminRespondedAt && (
                      <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 ml-auto">
                        {fmtDate(item.adminRespondedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap">
                    {item.adminResponse}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.status === 'Resolved'
                        ? t('feedback.noResponseResolved')
                        : t('feedback.awaitingResponse')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FeedbackPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const { data: profile } = useMyPatientProfile();
  useFeedbackHub(isAuthenticated ? profile?.id : undefined);

  const { data: myFeedback, isLoading: listLoading } = useMyFeedback();
  const submitFeedback = useSubmitFeedback();

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    register,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
  });

  const selectedCategory = watch('category');

  const onSubmit = (values: FeedbackFormValues) => {
    submitFeedback.mutate(values, {
      onSuccess: (result) => {
        if (!result.isSuccess) return;
        reset();
        setSubmitted(true);
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          {t('feedback.pageTitle')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-12">
          {t('feedback.pageSubtitle')}
        </p>
      </motion.div>

      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
          className="max-w-md mx-auto mt-4"
        >
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 flex flex-col items-center text-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <LogIn size={26} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                {t('feedback.signInRequired')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('feedback.signInRequiredDesc')}
              </p>
            </div>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <LogIn size={15} />
              {t('auth.signIn')}
            </Link>
          </div>
        </motion.div>
      )}

      {isAuthenticated && <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Left: Form ── */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        >
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                <MessageSquare size={18} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {t('feedback.formTitle')}
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center py-8 gap-4"
                >
                  <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle size={28} className="text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                      {t('feedback.successTitle')}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t('feedback.successDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    {t('feedback.submitAnother')}
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('feedback.category')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Complaint', 'Suggestion'] as FeedbackCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setValue('category', cat, { shouldValidate: true })}
                          className={cn(
                            'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150',
                            selectedCategory === cat
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600',
                          )}
                        >
                          {cat === 'Complaint' ? t('feedback.categoryComplaint') : t('feedback.categorySuggestion')}
                        </button>
                      ))}
                    </div>
                    {errors.category && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.category.message}</p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('feedback.subject')}
                    </label>
                    <input
                      {...register('subject')}
                      placeholder={t('feedback.subjectPlaceholder')}
                      className={cn(
                        'w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all',
                        'focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 dark:focus:border-cyan-500',
                        errors.subject ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700',
                      )}
                    />
                    {errors.subject && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.subject.message}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('feedback.message')}
                    </label>
                    <textarea
                      {...register('message')}
                      rows={5}
                      placeholder={t('feedback.messagePlaceholder')}
                      className={cn(
                        'w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all resize-none',
                        'focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 dark:focus:border-cyan-500',
                        errors.message ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700',
                      )}
                    />
                    {errors.message && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.message.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitFeedback.isPending}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {submitFeedback.isPending ? t('feedback.submitting') : t('feedback.submit')}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Right: My Feedback ── */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Clock size={16} className="text-slate-500 dark:text-slate-400" />
              </div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {t('feedback.myFeedbackTitle')}
              </h2>
              {myFeedback && myFeedback.length > 0 && (
                <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500">
                  {t('feedback.tapToExpand')}
                </span>
              )}
            </div>

            {listLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
                ))}
              </div>
            ) : !myFeedback || myFeedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Search size={20} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t('feedback.noFeedback')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t('feedback.noFeedbackDesc')}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {myFeedback.map((item) => (
                  <FeedbackItem key={item.id} item={item} t={t} />
                ))}
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <ChevronDown size={15} className="text-slate-400 mt-0.5 shrink-0 -rotate-90" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('feedback.reviewNote')}
            </p>
          </div>
        </motion.div>
      </div>}
    </div>
  );
}
