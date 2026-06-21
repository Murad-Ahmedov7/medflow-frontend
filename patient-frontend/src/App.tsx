import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppRouter } from './routes/AppRouter';
import { GlobalLoader } from './components/ui/GlobalLoader';
import { PaymentSuccessModal } from './components/ui/PaymentSuccessModal';
import { useTheme } from './hooks/useTheme';
import { useMyPatientProfile } from './hooks/usePatientProfile';
import { usePatientHub } from './hooks/usePatientHub';
import { useChatHub } from './hooks/useChatHub';
import { useAuthStore } from './store/authStore';
import { useRefundStore } from './store/refundStore';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function ThemeInitializer() { useTheme(); return null; }

// Mounts the SignalR hub for authenticated patients so notifications
// are delivered on any page without requiring a manual subscription.
function PatientHubInitializer() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data: profile } = useMyPatientProfile(isAuthenticated);
  usePatientHub(profile?.id);
  return null;
}

// Keeps the chat SignalR connection alive for the full authenticated session
// so NewMessage events are received on any page, not only on /chat.
function ChatHubInitializer() {
  const user = useAuthStore(s => s.user);
  useChatHub(user?.id);
  return null;
}

// Renders the same payment-success animation used for charges (top-up, consultation
// fee, prescription purchase) for refunds too — set globally via usePatientHub so it
// appears immediately on whichever page the patient happens to be on.
function RefundSuccessModal() {
  const { t } = useTranslation();
  const pendingRefund = useRefundStore(s => s.pendingRefund);
  const clearPendingRefund = useRefundStore(s => s.clearPendingRefund);

  return (
    <PaymentSuccessModal
      open={!!pendingRefund}
      onClose={clearPendingRefund}
      message={t('notifications.refundSuccessTitle')}
      amount={pendingRefund?.amount}
      amountLabel={t('notifications.amountRefunded')}
      amountSign="credit"
      balance={pendingRefund?.newBalance}
      balanceLabel={t('wallet.success.newBalance')}
      ctaLabel={t('common.close')}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer />
        <PatientHubInitializer />
        <ChatHubInitializer />
        <GlobalLoader />
        <RefundSuccessModal />
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
