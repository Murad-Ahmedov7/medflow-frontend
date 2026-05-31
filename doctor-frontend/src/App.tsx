import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppRouter } from './routes/AppRouter';
import { GlobalLoader } from './components/ui/GlobalLoader';
import { useTheme } from './hooks/useTheme';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function ThemeInitializer() { useTheme(); return null; }

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer />
        <GlobalLoader />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={5000}
          toastOptions={{
            style: { borderRadius: '12px', overflow: 'hidden', position: 'relative' },
          }}
        />
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
