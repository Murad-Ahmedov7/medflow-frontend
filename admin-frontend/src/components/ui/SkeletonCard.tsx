import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
