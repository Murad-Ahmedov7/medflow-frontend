import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { SkeletonCard } from '../components/ui/SkeletonCard';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t('nav.dashboard')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Welcome back, <span className="font-medium text-cyan-600">{user?.fullName}</span>
        </p>
      </div>

      {/* Placeholder stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
