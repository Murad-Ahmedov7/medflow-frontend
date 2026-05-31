import { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variants = {
  primary: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-500/20',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  outline: 'border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white transition-colors',
};

const sizes = { sm: 'px-3 py-1.5 text-sm rounded-lg', md: 'px-5 py-2.5 text-sm rounded-xl', lg: 'px-8 py-3.5 text-base rounded-xl' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => (
    <button ref={ref} disabled={disabled || isLoading}
      className={cn('inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-60 disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
      {...props}>
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
