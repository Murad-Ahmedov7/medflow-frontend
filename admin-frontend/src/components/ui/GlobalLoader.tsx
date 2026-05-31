import { useLoadingStore } from '../../store/loadingStore';
import { Spinner } from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

export function GlobalLoader() {
  const { isGlobalLoading } = useLoadingStore();

  return (
    <AnimatePresence>
      {isGlobalLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Loading...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
