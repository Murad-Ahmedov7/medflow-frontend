import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 text-center px-4">
      <p className="text-8xl font-bold text-cyan-600">404</p>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('common.pageNotFound')}</h1>
      <p className="text-slate-500 dark:text-slate-400">{t('common.pageNotFoundDesc')}</p>
      <button
        onClick={() => navigate(-1)}
        className="mt-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
      >
        {t('common.goBack')}
      </button>
    </div>
  );
}
