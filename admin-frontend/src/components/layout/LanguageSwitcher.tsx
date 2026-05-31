import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const languages = [
  { code: 'en', label: 'English',    flag: 'gb' },
  { code: 'az', label: 'Azərbaycan', flag: 'az' },
  { code: 'ru', label: 'Русский',    flag: 'ru' },
];

function Flag({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn('fi shrink-0 rounded-sm', `fi-${code}`, className)}
      style={{ width: '1.25rem', height: '0.9375rem' }}
    />
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === i18n.language) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-md text-sm font-medium transition-colors duration-150 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
      >
        <Flag code={current.flag} />
        <span className="hidden sm:block">{current.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-slate-100 bg-white shadow-lg shadow-slate-200/60 dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/40 overflow-hidden py-1"
          >
            {languages.map((lang) => {
              const active = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-100',
                    active
                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60',
                  )}
                >
                  <Flag code={lang.flag} />
                  <span className="flex-1 text-left font-medium">{lang.label}</span>
                  {active && <Check size={13} className="shrink-0 text-cyan-600 dark:text-cyan-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
