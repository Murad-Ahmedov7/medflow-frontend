import { toast } from 'sonner';
import i18n from '../i18n';

function t(key: string): string {
  return i18n.t(key);
}

// Passing a stable id per message prevents duplicate toasts.
// Sonner updates the existing toast when the same id is fired again.
export const showToast = {
  signInSuccess:      () => toast.success(t('toast.signInSuccess'),      { id: 'sign-in-success' }),
  signInError:        () => toast.error(t('toast.signInError'),          { id: 'sign-in-error' }),
  signInFailed:       () => toast.error(t('toast.signInFailed'),         { id: 'sign-in-failed' }),
  logoutSuccess:      () => toast.success(t('toast.logoutSuccess'),      { id: 'logout-success' }),
  sessionExpired:     () => toast.error(t('toast.sessionExpired'),       { id: 'session-expired' }),
  unauthorized:       () => toast.error(t('toast.unauthorized'),         { id: 'unauthorized' }),
  networkError:       () => toast.error(t('toast.networkError'),         { id: 'network-error' }),
  unexpectedError:    () => toast.error(t('toast.unexpectedError'),      { id: 'unexpected-error' }),
  tokenRefreshFailed: () => toast.error(t('toast.tokenRefreshFailed'),   { id: 'token-refresh-failed' }),
  // API errors use the message as the id so identical server errors deduplicate
  wrongRole:          () => toast.error(t('toast.wrongRole'),             { id: 'wrong-role' }),
  apiError: (message: string) => toast.error(message, { id: `api-error:${message}` }),
};
