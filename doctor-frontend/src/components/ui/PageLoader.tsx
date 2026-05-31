import { Spinner } from './Spinner';

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">MedFlow</span>
        </div>
        <Spinner size="md" />
      </div>
    </div>
  );
}
