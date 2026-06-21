import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Mail, MessageCircle, LogIn, ChevronDown, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useOpenSupportChat } from '../hooks/useChats';
import { cn } from '../utils/cn';

// ── FAQ accordion item ─────────────────────────────────────────────────────────

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors',
          open
            ? 'bg-slate-50 dark:bg-slate-800/80'
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80',
        )}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
          {question}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ContactPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const openSupport = useOpenSupportChat();

  const handleStartChat = () => {
    openSupport.mutate(undefined, {
      onSuccess: (res) => {
        if (res.isSuccess && res.data) navigate(`/chat?open=${res.data.id}`);
      },
    });
  };

  const faqItems = t('contact.faq', { returnObjects: true }) as Array<{ q: string; a: string }>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('nav.contact')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-12">We're here to help. Reach out anytime.</p>

      {/* ── Contact info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: MapPin, title: 'Address', value: '123 Medical Center Dr, Baku, AZ 1000' },
          { icon: Phone,  title: 'Phone',   value: '+994 12 345 67 89' },
          { icon: Mail,   title: 'Email',   value: 'contact@medflow.az' },
        ].map(({ icon: Icon, title, value }) => (
          <div key={title} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <Icon size={18} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{title}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Support Chat section ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="mt-8 rounded-2xl border border-cyan-100 dark:border-cyan-800/40 bg-linear-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-white dark:bg-slate-800 border border-cyan-100 dark:border-cyan-800/40 flex items-center justify-center shadow-sm">
            <MessageCircle size={26} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('contact.supportChatTitle')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('contact.supportChatDesc')}
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            {isAuthenticated ? (
              <button
                onClick={handleStartChat}
                disabled={openSupport.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <MessageCircle size={15} className="shrink-0" />
                {openSupport.isPending ? t('contact.starting') : t('contact.startChat')}
              </button>
            ) : (
              <div className="flex flex-col items-start sm:items-end gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-48 sm:text-right">
                  {t('contact.signInToChatDesc')}
                </p>
                <Link
                  to="/sign-in"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <LogIn size={14} className="shrink-0" />
                  {t('contact.signInToChat')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── FAQ section ── */}
      <div className="mt-16">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <HelpCircle size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('contact.faqTitle')}
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-8 ml-12">
          {t('contact.faqSubtitle')}
        </p>

        <div className="space-y-2">
          {Array.isArray(faqItems) && faqItems.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
