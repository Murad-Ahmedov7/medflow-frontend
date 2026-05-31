import { useTranslation } from 'react-i18next';

export function DoctorsPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('nav.doctors')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-12">Our team of certified medical professionals.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
            <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-2" />
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-600 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
