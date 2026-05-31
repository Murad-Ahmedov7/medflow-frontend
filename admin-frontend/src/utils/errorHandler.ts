import { AxiosError } from 'axios';
import type { ApiError } from '../types/api.types';
import i18n from '../i18n';

export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) return i18n.t('toast.networkError');
    if (error.response.status === 401) return i18n.t('toast.sessionExpired');
    if (error.response.status === 403) return i18n.t('toast.unauthorized');

    const data = error.response.data;
    if (Array.isArray(data) && data.length > 0) {
      return (data as ApiError[]).map((e) => e.message).join(' ');
    }
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return i18n.t('toast.unexpectedError');
}
