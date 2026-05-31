import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className={cn('flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800', className)}>
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
