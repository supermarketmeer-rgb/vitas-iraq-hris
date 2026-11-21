import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  CheckCircle2,
  X,
  FileJson,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Folder,
  FolderOpen,
  FolderCheck,
  HardDrive,
  Server,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';
import { DtmsStorage } from '../utils/storage';
import {
  fetchBackupInfo,
  fetchMySQLDumpSql,
  saveMySQLBackupToServerFolder,
  getMySQLBackupDownloadUrl,
  syncRestoreMySQLDump,
  hydrateDataFromMySQL,
  BackupInfo,
  BackupResult,
} from '../utils/apiSync';

interface BackupModalProps {
  onClose?: () => void;
  onRefreshData?: () => void;
  embedded?: boolean;
}

export const BackupModal: React.FC<BackupModalProps> = ({ onClose = () => undefined, onRefreshData, embedded = false }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [isSavingLocalFolder, setIsSavingLocalFolder] = useState(false);
  const [dbInfo, setDbInfo] = useState<BackupInfo | null>(null);
  const [serverFolder, setServerFolder] = useState<string>('C:\\xampp\\htdocs\\apps\\drivers_management_system\\backups');
  const [presetFolders, setPresetFolders] = useState<string[]>([
    'C:\\xampp\\htdocs\\apps\\drivers_management_system\\backups',
    'C:\\xampp\\mysql_backups',
    'D:\\DTMS_Backups',
  ]);
  const [lastSavedDetails, setLastSavedDetails] = useState<BackupResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usersCount = DtmsStorage.getUsers().length;
  const tripsCount = DtmsStorage.getTrips().length;
  const vehiclesCount = DtmsStorage.getVehicles().length;
  const driversCount = DtmsStorage.getDrivers().length;
  const officesCount = DtmsStorage.getOffices().length;
  const logsCount = DtmsStorage.getAuditLogs().length;

  useEffect(() => {
    let isMounted = true;
    fetchBackupInfo().then((info) => {
      if (isMounted && info) {
        setDbInfo(info);
        if (info.default_folder) {
          setServerFolder(info.default_folder);
        }
        if (info.server_presets && info.server_presets.length > 0) {
          setPresetFolders(info.server_presets);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. اختيار مجلد الحفظ المباشر على الجهاز عبر نافذة "حفظ باسم" (Save As)
  const handleSaveToLocalFolder = async () => {
    try {
      setIsSavingLocalFolder(true);
      setErrorMessage(null);

      // Fetch fresh, full MySQL dump from MySQL PDO backend
      const res = await fetchMySQLDumpSql();
      if (!res.success || !res.sql) {
        throw new Error(res.message || 'تعذر استخراج بيانات MySQL من السيرفر');
      }

      const sqlContent = res.sql;
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const defaultFilename = res.filename || `DTMS_MySQL_dtms_db_${dateStr}_${timeStr}.sql`;

      // Use showSaveFilePicker (Native OS "Save As..." dialog)
      // This completely avoids Chromium's showDirectoryPicker security restriction ("contains system files")
      // and allows the user to browse and pick ANY folder on ANY drive (C:, D:, Downloads, Desktop, etc.)
      if (typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const saveHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [
              {
                description: 'MySQL Database Dump (*.sql)',
                accept: { 'application/sql': ['.sql'] },
              },
            ],
          });

          const writable = await saveHandle.createWritable();
          await writable.write(sqlContent);
          await writable.close();

          DtmsStorage.logAction(
            'تعديل الإعدادات',
            `تم حفظ نسخة احتياطية MySQL في المجلد المختار: ${saveHandle.name}`,
            'backup',
            'admin'
          );

          setSuccessMessage(
            `تم بنجاح حفظ نسخة قاعدة بيانات MySQL في المجلد المختار باسم (${saveHandle.name}) بحجم (${res.size_formatted || ''}).`
          );
          setTimeout(() => setSuccessMessage(null), 8000);
          return;
        } catch (saveErr: any) {
          if (saveErr.name === 'AbortError') {
            // User cancelled the save dialog gracefully
            return;
          }
          console.warn('showSaveFilePicker error, falling back to download:', saveErr);
        }
      }

      // Fallback: Standard browser download if showSaveFilePicker is unsupported
      triggerBrowserDownload(sqlContent, defaultFilename);
      setSuccessMessage(`تم بنجاح تنزيل نسخة قاعدة بيانات MySQL (${defaultFilename}) على جهازك.`);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء حفظ النسخة: ' + (err.message || ''));
    } finally {
      setIsSavingLocalFolder(false);
    }
  };

  // 2. حفظ النسخة الاحتياطية في مجلد مخصص على السيرفر
  const handleSaveToServerFolder = async () => {
    if (!serverFolder.trim()) {
      setErrorMessage('يرجى كتابة أو اختيار مسار المجلد المطلوب لحفظ النسخة الاحتياطية.');
      return;
    }

    try {
      setIsSavingServer(true);
      setErrorMessage(null);
      setLastSavedDetails(null);

      const currentUser = DtmsStorage.getCurrentUser()?.name || 'مدير النظام';
      const result = await saveMySQLBackupToServerFolder(serverFolder.trim(), currentUser);

      if (result.success) {
        setLastSavedDetails(result);
        setSuccessMessage(
          `تم بنجاح حفظ نسخة قاعدة بيانات MySQL كاملة (${result.database || 'dtms_db'}) في المجلد:\n${result.file_path} (الحجم: ${result.size_formatted})`
        );
        DtmsStorage.logAction(
          'تعديل الإعدادات',
          `تم حفظ نسخة احتياطية MySQL في المجلد على السيرفر: ${result.file_path}`,
          'backup',
          'admin'
        );
      } else {
        setErrorMessage(result.message || 'فشلت عملية الحفظ في المجلد المحدد على السيرفر');
      }
    } catch (err: any) {
      setErrorMessage('خطأ أثناء حفظ النسخة الاحتياطية: ' + (err.message || ''));
    } finally {
      setIsSavingServer(false);
    }
  };

  // 3. تنزيل مباشر لملف SQL
  const handleDirectDownloadSQL = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const res = await fetchMySQLDumpSql();
      if (!res.success || !res.sql) {
        // Fallback to direct download endpoint link
        window.open(getMySQLBackupDownloadUrl(), '_blank');
        return;
      }

      const defaultFilename = res.filename || `DTMS_MySQL_dtms_db_${new Date().toISOString().split('T')[0]}.sql`;
      triggerBrowserDownload(res.sql, defaultFilename);

      DtmsStorage.logAction(
        'تعديل الإعدادات',
        `تم تنزيل نسخة احتياطية مباشرة لقاعدة بيانات MySQL: ${defaultFilename}`,
        'backup',
        'admin'
      );

      setSuccessMessage(`تم بنجاح تنزيل سكربت قاعدة بيانات MySQL الكامل (${defaultFilename}).`);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء تنزيل الملف: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerBrowserDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. تنزيل نسخة JSON شاملة
  const handleDownloadJSON = () => {
    try {
      setIsProcessing(true);
      const backupData = {
        system: 'DTMS - Driver & Transportation Management System',
        database: 'MySQL 8.x (dtms_db)',
        version: 'v2.5 Pro',
        exported_at: new Date().toISOString(),
        exported_by: DtmsStorage.getCurrentUser().name,
        data: {
          offices: DtmsStorage.getOffices(),
          users: DtmsStorage.getUsers(),
          drivers: DtmsStorage.getDrivers(),
          vehicles: DtmsStorage.getVehicles(),
          trips: DtmsStorage.getTrips(),
          odometer_records: DtmsStorage.getOdometerRecords(),
          ocr_results: DtmsStorage.getOCRResults(),
          vehicle_assignments: DtmsStorage.getAssignments(),
          vehicle_maintenance: DtmsStorage.getMaintenance(),
          audit_logs: DtmsStorage.getAuditLogs(),
          settings: DtmsStorage.getSettings(),
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `DTMS_Backup_${dateStr}_${timeStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      DtmsStorage.logAction(
        'تعديل الإعدادات',
        `تم تنزيل نسخة احتياطية كاملة للنظام (JSON): ${filename}`,
        'backup',
        'admin'
      );

      setSuccessMessage(`تم بنجاح تحميل النسخة الاحتياطية (${filename}) وحفظها.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء إنشاء ملف JSON: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. استعادة النسخة الاحتياطية (سواء ملف MySQL .sql أو ملف JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = (event.target?.result as string) || '';

        // Check if this is a MySQL .sql file!
        const isSqlFile =
          file.name.toLowerCase().endsWith('.sql') ||
          text.trim().startsWith('--') ||
          text.includes('CREATE TABLE') ||
          text.includes('INSERT INTO') ||
          text.includes('dtms_db');

        if (isSqlFile) {
          if (
            !window.confirm(
              `هل أنت متأكد من استعادة قاعدة بيانات MySQL من الملف:\n"${file.name}"؟\nسيتم استيراد وتحديث كافة الجداول والبيانات في قاعدة بيانات MySQL (dtms_db).`
            )
          ) {
            return;
          }

          setIsProcessing(true);
          setErrorMessage(null);
          const userName = DtmsStorage.getCurrentUser()?.name || 'مدير النظام';
          const res = await syncRestoreMySQLDump(text, userName);

          if (res.success) {
            DtmsStorage.logAction(
              'تعديل الإعدادات',
              `تم استعادة قاعدة بيانات MySQL بنجاح من ملف: ${file.name}`,
              'backup',
              'admin'
            );
            setSuccessMessage(
              `تم بنجاح استيراد واستعادة قاعدة بيانات MySQL من ملف (${file.name})! تم تحديث الجداول بنجاح.`
            );
            try {
              await hydrateDataFromMySQL();
            } catch {}
            if (onRefreshData) onRefreshData();
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setErrorMessage(res.message || 'فشلت استعادة قاعدة بيانات MySQL');
          }
          return;
        }

        // Otherwise parse as JSON
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          throw new Error('الملف غير صالح؛ يرجى التأكد من اختيار ملف سكربت قاعدة بيانات (.sql) أو ملف نسخة (.json)');
        }

        const data = parsed.data || parsed;
        if (!data.users && !data.vehicles && !data.trips && !data.offices) {
          throw new Error('محتوى ملف النسخة الاحتياطية غير مكتمل أو تالف');
        }

        if (
          window.confirm(
            `هل أنت متأكد من استعادة هذه النسخة الاحتياطية من ملف "${file.name}"؟ سيتم تحديث جداول النظام بالبيانات المستوردة.`
          )
        ) {
          if (data.offices) localStorage.setItem('dtms_offices_v2', JSON.stringify(data.offices));
          if (data.users) localStorage.setItem('dtms_users_v2', JSON.stringify(data.users));
          if (data.drivers) localStorage.setItem('dtms_drivers_v2', JSON.stringify(data.drivers));
          if (data.vehicles) localStorage.setItem('dtms_vehicles_v2', JSON.stringify(data.vehicles));
          if (data.trips) localStorage.setItem('dtms_trips_v2', JSON.stringify(data.trips));
          if (data.odometer_records) localStorage.setItem('dtms_odometer_v2', JSON.stringify(data.odometer_records));
          if (data.ocr_results) localStorage.setItem('dtms_ocr_results_v2', JSON.stringify(data.ocr_results));
          if (data.vehicle_assignments) localStorage.setItem('dtms_assignments_v2', JSON.stringify(data.vehicle_assignments));
          if (data.vehicle_maintenance) localStorage.setItem('dtms_maintenance_v2', JSON.stringify(data.vehicle_maintenance));
          if (data.audit_logs) localStorage.setItem('dtms_audit_logs_v2', JSON.stringify(data.audit_logs));
          if (data.settings) localStorage.setItem('dtms_settings_v2', JSON.stringify(data.settings));

          DtmsStorage.logAction(
            'تعديل الإعدادات',
            `تم استعادة نسخة احتياطية للنظام من ملف JSON: ${file.name}`,
            'backup',
            'admin'
          );

          setSuccessMessage('تم استعادة بيانات النسخة الاحتياطية بنجاح! سيتم تحديث الشاشة الآن.');
          if (onRefreshData) onRefreshData();
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      } catch (err: any) {
        setErrorMessage('فشل قراءة ملف النسخة الاحتياطية: ' + (err.message || ''));
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className={embedded ? "font-['Cairo',sans-serif]" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs font-['Cairo',sans-serif]"}>
      <div className={embedded ? "w-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col text-right" : "w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-right"}>
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-teal-800/20 bg-gradient-to-l from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-teal-700/60 border border-teal-500/30 text-teal-200 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">النسخ الاحتياطي لقاعدة بيانات MySQL</h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  قاعدة البيانات: {dbInfo?.database || 'dtms_db'}
                </span>
              </div>
              <p className="text-[11px] text-teal-200/80">
                تصدير وحفظ وتحديد مسار النسخة الاحتياطية الكاملة لـ MySQL مع كافة الجداول والبيانات
              </p>
            </div>
          </div>
          {!embedded && <button
            onClick={onClose}
            className="text-teal-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>}
        </div>

        {/* Content Body */}
        <div className={`p-4 sm:p-6 space-y-4 text-xs custom-scrollbar ${embedded ? '' : 'max-h-[82vh] overflow-y-auto'}`}>
          {/* Status / Alert Messages */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs block">تمت العملية بنجاح:</span>
                <span className="text-xs leading-relaxed whitespace-pre-line font-mono">{successMessage}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold text-xs leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Database Summary Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2 text-gray-700 dark:text-gray-200 font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>إحصائيات قاعدة البيانات الحالية ({dbInfo?.database || 'dtms_db'}):</span>
              </div>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800/50">
                {dbInfo?.tables_count || 15} جدول نشط
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 text-[10px] block">المستخدمين</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm font-mono">{usersCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 text-[10px] block">السائقين</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm font-mono">{driversCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 text-[10px] block">المركبات</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm font-mono">{vehiclesCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 text-[10px] block">الرحلات</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm font-mono">{tripsCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 text-[10px] block">المكاتب</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm font-mono">{officesCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 text-[10px] block">سجلات التدقيق</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm font-mono">{logsCount}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Choose Folder on Client PC (الميزة الرئيسية: اختيار المجلد وحفظ النسخة محلياً) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 dark:from-teal-950/30 dark:via-slate-800 dark:to-emerald-950/20 border-2 border-teal-500/40 dark:border-teal-500/30 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    حفظ باسم واختيار المجلد في جهازك (Save As...)
                  </h4>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  يفتح نافذة "حفظ باسم" الرسمية لويندوز لاختيار أي قرص أو مجلد تريده (C: أو D: أو التنزيلات أو سطح المكتب أو الفلاش ميموري) وحفظ ملف سكربت MySQL (.sql) فيه مباشرة وبدون أي قيود من المتصفح.
                </p>
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveToLocalFolder}
                disabled={isSavingLocalFolder}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingLocalFolder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ فتح نافذة الحفظ وتصدير قاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <FolderCheck className="w-4 h-4" />
                    <span>اختيار مجلد وحفظ النسخة (Save As...)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDirectDownloadSQL}
                disabled={isProcessing}
                title="تنزيل مباشر دون اختيار مجلد"
                className="py-3 px-4 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل مباشر</span>
              </button>
            </div>
          </div>

          {/* Section 2: Choose Destination Folder on the Server (حفظ في مجلد مخصص على السيرفر) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-500/30 dark:border-slate-700 hover:border-blue-500/60 transition-all space-y-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  تحديد مجلد الحفظ على السيرفر (Server Folder Destination)
                </h4>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                اكتب أو اختر مسار المجلد على السيرفر ليتم حفظ ملف النسخة الاحتياطية داخله تلقائياً مع إنشاء المجلد إن لم يكن موجوداً:
              </p>
            </div>

            {/* Folder Input & Presets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <HardDrive className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={serverFolder}
                    onChange={(e) => setServerFolder(e.target.value)}
                    placeholder="مثال: C:\xampp\htdocs\apps\drivers_management_system\backups"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-left dir-ltr"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveToServerFolder}
                  disabled={isSavingServer}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSavingServer ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ في هذا المجلد</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-gray-400 font-semibold">مجلدات مقترحة:</span>
                {presetFolders.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setServerFolder(preset)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer font-mono dir-ltr ${
                      serverFolder === preset
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300 font-bold'
                        : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.length > 40 ? '...' + preset.slice(-35) : preset}
                  </button>
                ))}
              </div>

              {/* Last Saved Details on Server */}
              {lastSavedDetails && lastSavedDetails.file_path && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>تم حفظ الملف بنجاح:</span>
                  </div>
                  <div className="font-mono text-[10px] break-all bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-200 dark:border-blue-900/60 dir-ltr text-left">
                    {lastSavedDetails.file_path}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-blue-700 dark:text-blue-300 pt-0.5">
                    <span>الحجم: {lastSavedDetails.size_formatted}</span>
                    <span>الجداول: {lastSavedDetails.tables_count}</span>
                    <span>الوقت: {lastSavedDetails.timestamp}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Extra Backups & Restore */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* JSON Backup */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900 dark:text-white">نسخة احتياطية JSON</h5>
                  <p className="text-[10px] text-gray-500">ملف بيانات النظام للتوافق</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadJSON}
                disabled={isProcessing}
                className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                تصدير JSON
              </button>
            </div>

            {/* Restore Backup */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900 dark:text-white">استعادة نسخة احتياطية</h5>
                  <p className="text-[10px] text-gray-500">استرجاع قاعدة البيانات من ملف (.sql) أو (.json)</p>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".sql,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                اختيار ملف (.sql / .json)
              </button>
            </div>
          </div>

          {/* Security & Audit Notice */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              قاعدة البيانات المعتمدة في النسخ هي <strong>MySQL ({dbInfo?.database || 'dtms_db'})</strong> متوافقة مع phpMyAdmin، ويتم توثيق كل عملية حفظ في سجل التدقيق الأمني (Audit Logs).
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
          <span className="text-[11px] text-gray-400 font-mono">
            MySQL 8.x • XAMPP • {dbInfo?.database || 'dtms_db'}
          </span>
          {!embedded && <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>}
        </div>
      </div>
    </div>
  );
};
