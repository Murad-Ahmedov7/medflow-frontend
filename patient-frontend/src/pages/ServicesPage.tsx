import { useTranslation } from 'react-i18next';

export function ServicesPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('nav.services')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-12">Comprehensive medical services across all departments.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
            <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700 mb-4" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-600 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
