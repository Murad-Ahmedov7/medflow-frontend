import { toast } from 'sonner';
import i18n from '../i18n';

function t(key: string): string {
  return i18n.t(key);
}

export const showToast = {
  signInSuccess:      () => toast.success(t('toast.signInSuccess'),      { id: 'sign-in-success' }),
  signInError:        () => toast.error(t('toast.signInError'),          { id: 'sign-in-error' }),
  signInFailed:       () => toast.error(t('toast.signInFailed'),         { id: 'sign-in-failed' }),
  signUpSuccess:      () => toast.success(t('toast.signUpSuccess'),      { id: 'sign-up-success' }),
  signUpError:        () => toast.error(t('toast.signUpError'),          { id: 'sign-up-error' }),
  logoutSuccess:      () => toast.success(t('toast.logoutSuccess'),      { id: 'logout-success' }),
  sessionExpired:     () => toast.error(t('toast.sessionExpired'),       { id: 'session-expired' }),
  unauthorized:       () => toast.error(t('toast.unauthorized'),         { id: 'unauthorized' }),
  networkError:       () => toast.error(t('toast.networkError'),         { id: 'network-error' }),
  unexpectedError:    () => toast.error(t('toast.unexpectedError'),      { id: 'unexpected-error' }),
  tokenRefreshFailed: () => toast.error(t('toast.tokenRefreshFailed'),   { id: 'token-refresh-failed' }),
  wrongRole:          () => toast.error(t('toast.wrongRole'),             { id: 'wrong-role' }),
  resetPasswordSuccess: () => toast.success(t('toast.resetPasswordSuccess'), { id: 'reset-password-success' }),
  profileSaved: () => toast.success(t('toast.profileSaved'), { id: 'profile-saved' }),
  photoUploaded: () => toast.success(t('toast.photoUploaded'), { id: 'photo-uploaded' }),
  apiError: (message: string) => toast.error(message, { id: `api-error:${message}` }),
};
