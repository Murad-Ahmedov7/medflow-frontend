import { motion } from 'framer-motion';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import logoIcon from '../assets/branding/medflow_logo_only.png';

interface AuthLayoutProps { children: React.ReactNode; title: string; subtitle?: string; }

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <img src={logoIcon} alt="MedFlow" className="h-9 w-9 object-contain" />
          <span className="text-base font-semibold text-slate-700 dark:text-slate-200">MedFlow</span>
        </div>
        <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeSwitcher /></div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full max-w-md">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 p-8">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center mb-4">
                <img src={logoIcon} alt="MedFlow" className="h-14 w-14 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">© {new Date().getFullYear()} MedFlow. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  );
}
