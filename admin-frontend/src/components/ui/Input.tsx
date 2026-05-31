import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-400 focus:ring-red-400/40 focus:border-red-400',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
