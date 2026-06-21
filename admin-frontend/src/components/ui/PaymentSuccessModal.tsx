import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Wallet } from 'lucide-react';
import { fmt } from '../../utils/currency';

interface PaymentSuccessModalProps {
  open: boolean;
  /** Headline shown under the checkmark, e.g. "Medicine purchased successfully." */
  message: string;
  /** Optional supporting line under the headline */
  description?: string;
  /** Amount line shown in a highlight row — omit if not applicable */
  amount?: number;
  amountLabel?: string;
  /** 'credit' shows "+amount" (e.g. top-up), 'debit' shows "-amount" (e.g. a purchase charge). Defaults to 'credit'. */
  amountSign?: 'credit' | 'debit';
  /** New balance line — omit if not applicable */
  balance?: number;
  balanceLabel?: string;
  /** Primary CTA content — omit to render no button */
  ctaLabel?: React.ReactNode;
  onCta?: () => void;
  onClose: () => void;
}

// Shared visual identity for every payment-success moment in the admin portal (wallet
// top-up, supplier medicine purchase, etc.) — same spring-in checkmark, same card, same
// colors, so every successful financial transaction feels like the same product moment.
export function PaymentSuccessModal({
  open, message, description, amount, amountLabel, amountSign = 'credit', balance, balanceLabel, ctaLabel, onCta, onClose,
}: PaymentSuccessModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-sm"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl p-8 flex flex-col items-center text-center gap-5">

              {/* Icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/25"
              >
                <CheckCircle2 size={40} className="text-emerald-500" />
              </motion.div>

              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{message}</h2>
                {description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              {/* Amount + balance */}
              {(amount != null || balance != null) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="w-full space-y-2.5"
                >
                  {amount != null && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {amountLabel}
                      </span>
                      <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {amountSign === 'debit' ? '-' : '+'}{fmt(amount)}
                      </span>
                    </div>
                  )}

                  {balance != null && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Wallet size={13} />
                        {balanceLabel}
                      </div>
                      <span className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                        {fmt(balance)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* CTA */}
              {ctaLabel && (
                <button
                  onClick={onCta ?? onClose}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                >
                  {ctaLabel}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
