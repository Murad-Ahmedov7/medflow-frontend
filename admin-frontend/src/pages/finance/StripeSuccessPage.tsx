import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowRight } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiResult } from '../../types/api.types';
import { PaymentSuccessModal } from '../../components/ui/PaymentSuccessModal';

interface SessionResult {
  paidAmount: number | null;
  currentBalance: number;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function StripeSuccessPage() {
  const { t }           = useTranslation();
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const qc              = useQueryClient();
  const sessionId       = params.get('session_id');

  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }

    let cancelled = false;

    async function run() {
      // Step 1 — ask backend to fulfill the session directly via Stripe API.
      // Idempotent: safe to call even if webhook already ran.
      try {
        const res = await axiosInstance.post<ApiResult<SessionResult>>(
          API_ENDPOINTS.balance.fulfillSession(sessionId),
        );
        if (!cancelled && res.data.isSuccess && res.data.data?.paidAmount != null) {
          setSession(res.data.data);
          setLoading(false);
          qc.invalidateQueries({ queryKey: ['admin-balance'] });
          qc.invalidateQueries({ queryKey: ['admin-balance-transactions'] });
          return;
        }
      } catch { /* fall through */ }

      // Step 2 — poll session endpoint up to 8 × 1 s for webhook-based confirm.
      for (let i = 0; i < 8; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 1000));
        try {
          const res = await axiosInstance.get<ApiResult<SessionResult>>(
            API_ENDPOINTS.balance.session(sessionId),
          );
          const data = res.data.data;
          if (!cancelled && data?.paidAmount != null) {
            setSession(data);
            setLoading(false);
            qc.invalidateQueries({ queryKey: ['admin-balance'] });
            qc.invalidateQueries({ queryKey: ['admin-balance-transactions'] });
            return;
          }
        } catch { /* keep polling */ }
      }

      // Timed out — show whatever balance is available now
      if (!cancelled) {
        try {
          const res = await axiosInstance.get<ApiResult<SessionResult>>(
            API_ENDPOINTS.balance.session(sessionId),
          );
          if (!cancelled) setSession(res.data.data ?? null);
        } catch { /* ignore */ }
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-navigate to /finance after 5 s once data is loaded
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => navigate('/finance'), 5000);
      return () => clearTimeout(t);
    }
  }, [loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl p-8 flex flex-col items-center text-center gap-5">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800">
            <Loader2 size={32} className="text-cyan-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('finance.success.verifying')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {t('finance.success.verifyingDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <PaymentSuccessModal
        open
        onClose={() => navigate('/finance')}
        message={t('finance.success.title')}
        description={t('finance.success.desc')}
        amount={session?.paidAmount ?? undefined}
        amountLabel={t('finance.success.amountAdded')}
        balance={session?.currentBalance ?? 0}
        balanceLabel={t('finance.success.newBalance')}
        ctaLabel={
          <span className="flex items-center gap-2">
            {t('finance.success.goToFinance')}
            <ArrowRight size={14} />
          </span>
        }
        onCta={() => navigate('/finance')}
      />
    </div>
  );
}
