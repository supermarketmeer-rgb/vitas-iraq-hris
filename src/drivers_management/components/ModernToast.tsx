import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Loader2, X, Info } from 'lucide-react';
import { SoundEffects } from '../utils/soundEffects';

export interface ToastState {
  type: 'loading' | 'success' | 'error' | 'info';
  title: string;
  message?: string;
  timestamp?: number;
}

interface ModernToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export const ModernToast: React.FC<ModernToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast || toast.type === 'loading') return;
    // Play distinctive sound effect on alert/notification
    SoundEffects.play(toast.type === 'error' ? 'error' : toast.type === 'success' ? 'success' : 'info');

    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-md px-4">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.timestamp || toast.title}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto w-full rounded-2xl shadow-2xl border p-4 backdrop-blur-md transition-all overflow-hidden relative bg-white/95 dark:bg-slate-900/95 border-gray-200 dark:border-slate-800"
          >
            {/* Status indicator bar */}
            <div
              className={`absolute top-0 right-0 left-0 h-1 ${
                toast.type === 'loading'
                  ? 'bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-600 animate-pulse'
                  : toast.type === 'success'
                  ? 'bg-emerald-500'
                  : toast.type === 'error'
                  ? 'bg-rose-500'
                  : 'bg-teal-500'
              }`}
            />

            <div className="flex items-start gap-3 mt-0.5">
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  toast.type === 'loading'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                    : toast.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : toast.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                }`}
              >
                {toast.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {toast.title}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      toast.type === 'loading'
                        ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                        : toast.type === 'success'
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                        : toast.type === 'error'
                        ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {toast.type === 'loading'
                      ? 'قيد المعالجة'
                      : toast.type === 'success'
                      ? 'تم بنجاح'
                      : toast.type === 'error'
                      ? 'تنبيه'
                      : 'إشعار'}
                  </span>
                </div>
                {toast.message && (
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>

              {/* Close Button */}
              {toast.type !== 'loading' && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
