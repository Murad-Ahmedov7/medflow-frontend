import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage } from '../utils/errorHandler';
import { showToast } from '../utils/toast';
import { parseJwt } from '../utils/token';
import i18n from '../i18n';
import type { SignInRequest, SignUpRequest } from '../types/auth.types';
import type { ForgotPasswordRequest, ResetPasswordRequest } from '../services/auth.service';

type SignInFormData = Pick<SignInRequest, 'email' | 'password'>;

export function useSignIn() {
  const { setTokens, setLoading } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignInFormData) =>
      authService.signIn({ ...data, requiredPortal: 'Patient' }),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (!result.isSuccess || !result.data) {
        showToast.signInFailed();
        return;
      }
      const payload = parseJwt(result.data.token);
      const role = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload?.role;
      if (role !== 'Patient') {
        showToast.signInFailed();
        return;
      }
      setTokens(result.data.token, result.data.refreshToken);
      showToast.signInSuccess();
      navigate('/');
    },
    onError: () => { showToast.signInFailed(); },
    onSettled: () => setLoading(false),
  });
}

export function useSignUp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignUpRequest) => authService.signUp(data),
    onSuccess: (result) => {
      if (!result.isSuccess) { showToast.signUpError(); return; }
      showToast.signUpSuccess();
      navigate('/sign-in');
    },
    onError: (error) => { showToast.apiError(extractErrorMessage(error)); },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    logout();
    showToast.logoutSuccess();
    navigate('/');
  };
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authService.forgotPassword(data),
    // Backend always returns success (even for unknown emails) — no error toast needed.
    // The caller checks result.isSuccess to transition to success state.
    onError: (error) => { showToast.apiError(extractErrorMessage(error)); },
  });
}

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authService.resetPassword(data),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        showToast.apiError(result.errors?.[0] ?? i18n.t('toast.resetFailed'));
        return;
      }
      showToast.resetPasswordSuccess();
      navigate('/sign-in');
    },
    onError: (error) => { showToast.apiError(extractErrorMessage(error)); },
  });
}
