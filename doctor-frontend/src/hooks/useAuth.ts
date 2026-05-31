import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../utils/toast';
import { parseJwt } from '../utils/token';
import type { SignInRequest } from '../types/auth.types';

type SignInFormData = Pick<SignInRequest, 'email' | 'password'>;

export function useSignIn() {
  const { setTokens, setLoading } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignInFormData) =>
      authService.signIn({ ...data, requiredPortal: 'Doctor' }),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (!result.isSuccess || !result.data) {
        showToast.signInFailed();
        return;
      }
      const payload = parseJwt(result.data.token);
      const role = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload?.role;
      if (role !== 'Doctor') {
        showToast.signInFailed();
        return;
      }
      setTokens(result.data.token, result.data.refreshToken);
      showToast.signInSuccess();
      navigate('/');
    },
    onError: () => {
      showToast.signInFailed();
    },
    onSettled: () => setLoading(false),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    logout();
    showToast.logoutSuccess();
    navigate('/sign-in');
  };
}
