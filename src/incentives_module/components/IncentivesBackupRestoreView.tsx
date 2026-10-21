import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Shield,
  FileCode,
  HardDrive
} from 'lucide-react';

interface BackupRestoreViewProps {
  isDark?: boolean;
}

export const IncentivesBackupRestoreView: React.FC<BackupRestoreViewProps> = ({ isDark = false }) => {
  const [restoreStatus, setRestoreStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<string>('');

  const settings = StorageService.getSettings();

  const handleExportBackup = () => {
    const data = StorageService.createBackupData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VITAS_Iraq_Incentives_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPendingRestoreData(content);
      setIsConfirmModalOpen(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    const res = StorageService.restoreBackupData(pendingRestoreData);
    setRestoreStatus(res);
    setIsConfirmModalOpen(false);
    setPendingRestoreData('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">backup</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              BACKUP & DISASTER RECOVERY
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            النسخ الاحتياطي واستعادة البيانات
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            تصدير واستعادة نسخة احتياطية شاملة لكافة بيانات التطبيق، الموظفين، المتغيرات، إصدارات المعادلات، والنتائج المعتمدة
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl">
          <HardDrive className="w-4 h-4" />
          <span>قاعدة البيانات: {settings.databaseName}</span>
        </div>
      </div>

      {restoreStatus && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
            restoreStatus.success
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}
        >
          {restoreStatus.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{restoreStatus.message}</span>
        </div>
      )}

      {/* Two Action Panels: Export vs Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Export */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div>
            <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">تصدير نسخة احتياطية كاملة (Full JSON Snapshot)</h3>
            <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ينشئ ملفاً موحداً بصيغة JSON عالي الدقة يحتوي على:
            </p>
            <ul className="mt-3 space-y-2 text-xs list-disc list-inside text-slate-400">
              <li>سجل الموظفين والمشرفين وعلاقات التبعية</li>
              <li>إعدادات المتغيرات العشرة ومسمياتها المخصصة</li>
              <li>كافة إصدارات المعادلات وصيغ الـ AST النشطة والتاريخية</li>
              <li>سجلات الدفعات المستوردة ونتائج الاحتساب المعتمدة</li>
              <li>سجل التدقيق والأمان المالي بالكامل</li>
            </ul>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل ملف النسخة الاحتياطية (.json)</span>
          </button>
        </div>

        {/* Panel 2: Restore */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">استعادة البيانات من نسخة سابقة</h3>
            <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              استرجاع منظومة الحوافز بالكامل من ملف JSON تم تصديره مسبقاً.
            </p>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs mt-4 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                تنبيه أمان: استعادة النسخة الاحتياطية ستقوم بتحديث وتجاوز البيانات الحالية ومطابقة الجداول المسترجعة.
              </span>
            </div>
          </div>

          <label className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>تحديد ملف النسخة للاستعادة</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">تأكيد عملية الاستعادة</h3>
                  <p className="text-xs text-slate-400">فحص الملف وتطبيق الجداول المسترجعة</p>
                </div>
              </div>

              <p className="text-slate-300">
                هل أنت متأكد من رغبتك في استعادة هذه النسخة؟ سيتم تحديث الجداول فوراً بما يطابق الملف.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmRestore}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-teal-600/30"
                >
                  تأكيد واستعادة الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
