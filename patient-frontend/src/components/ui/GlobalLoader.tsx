import { useLoadingStore } from '../../store/loadingStore';
import { Spinner } from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

export function GlobalLoader() {
  const { isGlobalLoading } = useLoadingStore();
  return (
    <AnimatePresence>
      {isGlobalLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
          <Spinner size="lg" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
