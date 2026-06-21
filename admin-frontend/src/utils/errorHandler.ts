import { AxiosError } from 'axios';
import type { ApiError } from '../types/api.types';
import i18n from '../i18n';

// Backend phrases get rewritten to these exact, business-friendly messages.
// Matching is case-insensitive substring so backend wording can drift slightly
// without silently falling through to a generic status-code message.
const PHARMACY_MESSAGE_OVERRIDES: Array<{ match: string; key: string }> = [
  { match: 'out of stock', key: 'medicineOrders.errors.outOfStock' },
  { match: 'unavailable in the hospital pharmacy', key: 'medicineOrders.errors.unavailable' },
  { match: 'too low to purchase this prescription', key: 'medicineOrders.errors.insufficientBalancePrescription' },
  { match: 'wallet balance is too low', key: 'medicineOrders.errors.insufficientBalance' },
  { match: 'wallet balance', key: 'medicineOrders.errors.insufficientBalance' },
  { match: 'prescription could not be found', key: 'medicineOrders.errors.itemNotFound' },
  { match: "isn't part of one of your prescriptions", key: 'medicineOrders.errors.itemNotFound' },
  { match: 'is already cancelled', key: 'medicineOrders.errors.alreadyCancelled' },
];

// Backend whole-prescription validation failures list affected medicine names after
// a colon, e.g. "...not available in the hospital pharmacy: Amoxicillin, Paracetamol."
// We keep those names but otherwise show our own friendly sentence.
function extractMedicineList(message: string): string | null {
  const match = message.match(/:\s*([^.]+)\.?$/);
  return match ? match[1].trim() : null;
}

// A message is "safe to show as-is" only if it reads like a short business
// sentence — not a stack trace, exception type name, or validation payload dump.
function looksLikeRawError(message: string): boolean {
  if (!message) return true;
  if (message.length > 200) return true;
  if (/exception/i.test(message)) return true;
  if (/\bat\s+\S+\.\S+\(/.test(message)) return true; // stack trace frame, e.g. "at Foo.Bar()"
  if (/[{}[\]]/.test(message)) return true; // raw JSON/object leaking through
  if (message.includes('\n')) return true;
  return false;
}

function statusFallback(status: number): string {
  switch (status) {
    case 400: return i18n.t('toast.badRequest');
    case 401: return i18n.t('toast.sessionExpired');
    case 403: return i18n.t('toast.forbidden');
    case 404: return i18n.t('toast.notFound');
    case 409: return i18n.t('toast.conflict');
    case 422: return i18n.t('toast.validationError');
    case 500: return i18n.t('toast.serverError');
    default: return i18n.t('toast.unexpectedError');
  }
}

function applyOverrides(message: string): string {
  const lower = message.toLowerCase();
  for (const { match, key } of PHARMACY_MESSAGE_OVERRIDES) {
    if (lower.includes(match.toLowerCase())) {
      const friendly = i18n.t(key);
      const medicines = extractMedicineList(message);
      return medicines ? `${friendly} (${medicines})` : friendly;
    }
  }
  return message;
}

// Backend may respond with HttpErrorResponse[] (exception middleware) or with
// a Result<T> envelope ({ isSuccess, errors, data }) depending on the endpoint.
function extractBackendMessage(data: unknown): string | null {
  if (Array.isArray(data) && data.length > 0) {
    return (data as ApiError[]).map((e) => e.message).join(' ');
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      return (obj.errors as string[]).join(' ');
    }
    if (typeof obj.message === 'string') return obj.message;
  }
  return null;
}

// For in-band business failures — a 200 OK response carrying { isSuccess: false, errors }.
// Use this instead of showing result.errors?.[0] directly so backend wording still
// gets cleaned up / overridden with friendly text, and a missing message never
// surfaces a blank or raw fallback string.
export function sanitizeApiMessage(message: string | null | undefined): string {
  if (!message || looksLikeRawError(message)) return i18n.t('toast.validationError');
  return applyOverrides(message);
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) return i18n.t('toast.networkError');

    const status = error.response.status;
    if (status === 401) return i18n.t('toast.sessionExpired');
    if (status === 403) return i18n.t('toast.unauthorized');

    const backendMessage = extractBackendMessage(error.response.data);

    if (backendMessage && !looksLikeRawError(backendMessage)) {
      return applyOverrides(backendMessage);
    }

    return statusFallback(status);
  }
  if (error instanceof Error) {
    if (!looksLikeRawError(error.message)) return applyOverrides(error.message);
    return i18n.t('toast.unexpectedError');
  }
  return i18n.t('toast.unexpectedError');
}
