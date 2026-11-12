import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';
import { KpiCardData, Language } from '../types/hr';

interface KpiCardsProps {
  cards: KpiCardData[];
  language: Language;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ cards, language }) => {
  const isAr = language === 'ar';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card) => {
        // Evaluate trend color: if isPositive is true, up is green, down is red
        // if isPositive is false (e.g. turnover), down is green, up is red!
        const isUp = card.trend === 'up';
        const isDown = card.trend === 'down';
        
        let trendColor = 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
        if (isUp) {
          trendColor = card.isPositive 
            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400'
            : 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400';
        } else if (isDown) {
          trendColor = card.isPositive
            ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400'
            : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400';
        }

        return (
          <div
            key={card.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                {isAr ? card.titleAr : card.titleEn}
              </span>
              
              {/* Trend Pill */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${trendColor}`}>
                {isUp && <ArrowUpRight className="w-3 h-3" />}
                {isDown && <ArrowDownRight className="w-3 h-3" />}
                {!isUp && !isDown && <Minus className="w-3 h-3" />}
                <span>
                  {card.percentageChange !== undefined
                    ? `${Math.abs(card.percentageChange)}%`
                    : (isAr ? 'مستقر' : 'Stable')}
                </span>
              </div>
            </div>

            {/* Main Value */}
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight mb-1.5">
              {card.value}
            </div>

            {/* Subtitle / Comparison */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="line-clamp-1">
                {isAr ? card.descriptionAr : card.descriptionEn}
              </span>
              {card.comparisonValue && (
                <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0">
                  {card.comparisonValue}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
