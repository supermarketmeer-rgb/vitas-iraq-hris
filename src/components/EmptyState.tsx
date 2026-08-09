import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox_customize',
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 my-6 bg-[#111827] border border-dashed border-white/10 rounded-3xl text-center max-w-2xl mx-auto shadow-inner">
      <div className="w-16 h-16 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4 shadow-lg shadow-teal-600/5">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              {actionText}
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 border border-white/10 font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
