import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return { theme, toggleTheme, setTheme };
}
