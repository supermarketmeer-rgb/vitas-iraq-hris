import React, { useState } from 'react';
import { Camera, Lock, CheckCircle2, Calendar, FileText, ArrowDownToLine, X, Plus } from 'lucide-react';
import { Language, MonthlySnapshotRecord } from '../types/hr';
import { getSavedMonthlySnapshots, saveMonthlySnapshot, formatCurrencyIQD } from '../services/reportingEngine';

interface SnapshotArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentMonth: string;
}

export const SnapshotArchiveModal: React.FC<SnapshotArchiveModalProps> = ({
  isOpen,
  onClose,
  language,
  currentMonth
}) => {
  const isAr = language === 'ar';
  const [snapshots, setSnapshots] = useState<MonthlySnapshotRecord[]>(getSavedMonthlySnapshots());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<MonthlySnapshotRecord | null>(snapshots[0] || null);

  if (!isOpen) return null;

  const handleCreateSnapshot = () => {
    setIsSaving(true);
    const snap = saveMonthlySnapshot(currentMonth, notes);
    setSnapshots(getSavedMonthlySnapshots());
    setSelectedSnapshot(snap);
    setNotes('');
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'أرشيف النسخ الشهرية المجمدة (Monthly Snapshots)' : 'Approved Monthly Snapshots & Archive'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'تجميد وحفظ نتائج كل شهر لمنع تغيير التقارير التاريخية عند تحديث ملفات Excel' : 'Freeze official monthly closings so historical numbers never drift upon new Excel updates'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Snapshot Callout */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? `اعتماد وتجميد تقرير شهر: ${currentMonth}` : `Approve & Freeze Monthly Closing: ${currentMonth}`}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {isAr ? 'إغلاق معتمد' : 'Audit Locked'}
            </span>
          </div>

          <div className="flex gap-2 text-xs">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'ملاحظة اعتماد الإغلاق الشهري (اختياري)...' : 'Audit sign-off notes (e.g. Approved by GM & HR Director)...'}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleCreateSnapshot}
              disabled={isSaving}
              className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ النسخة' : 'Freeze Snapshot'}</span>
            </button>
          </div>
        </div>

        {/* List of Snapshots */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {isAr ? 'النسخ المعتمدة السابقة' : 'Historical Frozen Closings'}
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            {snapshots.map((s) => {
              const isSelected = selectedSnapshot?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSnapshot(s)}
                  className={`p-3.5 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-teal-50/50 dark:bg-teal-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">{s.month}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600">
                          {s.approvedBy}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{s.notes}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px]">{isAr ? 'الكادر' : 'Staff'}</span>
                      <span className="font-bold">{s.totalHeadcount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">{isAr ? 'الرواتب' : 'Payroll'}</span>
                      <span className="font-bold">{formatCurrencyIQD(s.totalPayroll)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">{isAr ? 'الحوافز' : 'Incentives'}</span>
                      <span className="font-bold">{formatCurrencyIQD(s.totalIncentives)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400">
            {isAr ? 'يتم حفظ النسخ في الذاكرة المشفرة الآمنة' : 'Snapshots preserved with immutability guarantees'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
