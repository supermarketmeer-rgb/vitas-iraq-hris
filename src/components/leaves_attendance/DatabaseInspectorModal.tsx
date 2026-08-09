import React, { useState } from 'react';
import { Language } from './types';
import { translations } from './translations';

interface DatabaseInspectorModalProps {
  lang: Language;
  onClose: () => void;
}

export const DatabaseInspectorModal: React.FC<DatabaseInspectorModalProps> = ({
  lang,
  onClose,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'architecture' | 'mysql_hris' | 'mssql_biometric'>('architecture');
  const [copied, setCopied] = useState(false);

  const mysqlHrisTables = [
    { name: 'attendance_records', rows: 8, engine: 'InnoDB', purpose_ar: 'سجلات الدوام المعالجة وحساب ساعات العمل والتأخير والغياب والإضافي', purpose_en: 'Processed daily attendance records with worked hours, late minutes & status' },
    { name: 'attendance_punches', rows: 24, engine: 'InnoDB', purpose_ar: 'حركات البصمة المعالجة المربوطة بسجل الدوام الرئيسي', purpose_en: 'Processed punches linked to attendance records' },
    { name: 'attendance_raw_logs', rows: 45, engine: 'InnoDB', purpose_ar: 'البصمات الخام المستوردة من SQL Server دون تعديل لضمان الأمان والتدقيق', purpose_en: 'Raw immutable biometric punch logs synced from MS SQL Server' },
    { name: 'biometric_server_settings', rows: 1, engine: 'InnoDB', purpose_ar: 'إعدادات اتصال سرفر البصمة MS SQL Server الديناميكية في MySQL', purpose_en: 'Dynamic MS SQL Server host, port (1433), credentials stored in MySQL' },
    { name: 'leave_requests', rows: 12, engine: 'InnoDB', purpose_ar: 'طلبات الإجازات ومراحل سير العمل والموافقات وسجل التدقيق', purpose_en: 'Leave applications with multi-stage approval workflow' },
    { name: 'leave_balances', rows: 16, engine: 'InnoDB', purpose_ar: 'أرصدة إجازات الموظفين (المستحق، المستهلك، المتاح، المعلق)', purpose_en: 'Employee leave balances (entitled, used, available, pending)' },
    { name: 'leave_types', rows: 6, engine: 'InnoDB', purpose_ar: 'أنواع الإجازات وسياسات الخصم والمدفوعة وغير المدفوعة', purpose_en: 'Leave types policies (paid, unpaid, max days)' },
    { name: 'employee_schedules', rows: 4, engine: 'InnoDB', purpose_ar: 'جداول الورديات وفترات السماح وساعات الاستراحة', purpose_en: 'Shift schedules with grace periods & breaks' },
    { name: 'attendance_corrections', rows: 3, engine: 'InnoDB', purpose_ar: 'طلبات تصحيح البصمات المفقودة الموجهة للمدير المباشر', purpose_en: 'Missing punch correction requests to direct managers' },
    { name: 'public_holidays', rows: 8, engine: 'InnoDB', purpose_ar: 'العطلات الرسمية المعتمدة في العراق لسنة 2026', purpose_en: 'Official public holidays in Iraq for 2026' },
  ];

  const mssqlBiometricTables = [
    { name: 'dbo.CHECKINOUT', rows: '3,420+', schema: 'T-SQL / MSSQL', purpose_ar: 'جدول حركات البصمة الأساسي على سرفر Microsoft SQL Server (USERID, CHECKTIME, CHECKTYPE, SENSORID)', purpose_en: 'Main punch log table in MS SQL Server (BioTime/BioStar/ZKAccess)' },
    { name: 'dbo.USERINFO', rows: '120+', schema: 'T-SQL / MSSQL', purpose_ar: 'بيانات الموظفين والبطاقات وبصمات الأصابع على سرفر البصمة (USERID, Badgenumber, Name, DEFAULTDEPTID)', purpose_en: 'Biometric users & enrolled templates in MS SQL Server' },
    { name: 'dbo.Machines', rows: '6 Devices', schema: 'T-SQL / MSSQL', purpose_ar: 'أجهزة البصمة المربوطة بالشبكة وعناوين الـ IP الخاصة بها (MachineNumber, IP, Port, Sn)', purpose_en: 'Enrolled biometric devices, IP addresses and serials' },
    { name: 'dbo.DEPARTMENTS', rows: '5 Depts', schema: 'T-SQL / MSSQL', purpose_ar: 'الأقسام المعرفة على برنامج البصمة (DEPTID, DEPTNAME)', purpose_en: 'Departments configured inside BioTime/BioStar server' },
  ];

  const mysqlSchemaCode = `-- HRIS Database Schema: vitasiraq_hris_db
CREATE DATABASE IF NOT EXISTS \`vitasiraq_hris_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`vitasiraq_hris_db\`;

-- 1. Biometric Server Settings
CREATE TABLE IF NOT EXISTS \`biometric_server_settings\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`server_name\` VARCHAR(100) NOT NULL DEFAULT 'MSSQL-BIOMETRIC-SRV',
  \`host\` VARCHAR(255) NOT NULL DEFAULT '192.168.1.100',
  \`port\` INT NOT NULL DEFAULT 1433,
  \`connection_type\` VARCHAR(50) NOT NULL DEFAULT 'sqlserver',
  \`db_name\` VARCHAR(100) DEFAULT 'BioTime8',
  \`username\` VARCHAR(100) DEFAULT 'biometric_user',
  \`password\` VARCHAR(255) DEFAULT NULL,
  \`auto_sync_interval_mins\` INT DEFAULT 15,
  \`last_sync_at\` DATETIME DEFAULT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Raw Attendance Logs
CREATE TABLE IF NOT EXISTS \`attendance_raw_logs\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`employee_biometric_id\` VARCHAR(50) NOT NULL,
  \`punch_datetime\` DATETIME NOT NULL,
  \`punch_type\` VARCHAR(50) NOT NULL,
  \`verify_mode\` VARCHAR(50) DEFAULT 'fingerprint',
  \`device_id\` VARCHAR(100) DEFAULT NULL,
  \`sync_batch_id\` VARCHAR(100) DEFAULT NULL,
  \`is_processed\` TINYINT(1) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">database</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.db_integration_title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.db_integration_subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0a0c10] text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">schema</span>
            <span>{lang === 'ar' ? 'معمارية الربط المزدوج' : 'Architecture'}</span>
          </button>
          <button
            onClick={() => setActiveTab('mysql_hris')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'mysql_hris'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">table_chart</span>
            <span>{lang === 'ar' ? 'جداول MySQL HRIS' : 'MySQL HRIS Schema'}</span>
          </button>
          <button
            onClick={() => setActiveTab('mssql_biometric')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'mssql_biometric'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">dns</span>
            <span>{lang === 'ar' ? 'سرفر البصمة MS SQL' : 'MS SQL Server'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-slate-800 dark:text-slate-200">
                <h3 className="font-bold text-sm text-teal-600 dark:text-teal-400 mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">sync_alt</span>
                  <span>{lang === 'ar' ? 'آلية الربط الديناميكي مع سرفر البصمة' : 'Dynamic Biometric Integration Engine'}</span>
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                  {lang === 'ar'
                    ? 'يحتوي نظام فيتاس العراق على محرك ربط مزدوج يقرأ حركات البصمة مباشرة من قاعدة بيانات BioTime/BioStar المصممة على MS SQL Server ثم يقوم بتخزينها وتدقيقها ومعالجتها داخل قاعدة بيانات vitasiraq_hris_db على MySQL.'
                    : 'The integration engine reads biometric logs directly from MS SQL Server and syncs into MySQL vitasiraq_hris_db.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-500">dns</span>
                    <span>1. MS SQL Server (BioStar / ZKAccess)</span>
                  </span>
                  <p className="text-slate-500 leading-relaxed">
                    {lang === 'ar'
                      ? 'يحتفظ بسجلات البصمة الخام عبر جدول dbo.CHECKINOUT بدون أي تعديل أو حظر.'
                      : 'Stores raw immutable logs in dbo.CHECKINOUT table on SQL Server.'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-500">storage</span>
                    <span>2. MySQL Database (vitasiraq_hris_db)</span>
                  </span>
                  <p className="text-slate-500 leading-relaxed">
                    {lang === 'ar'
                      ? 'يحتفظ بالسجلات المعالجة وأرصدة الإجازات وجداول الورديات وموافقات المدراء.'
                      : 'Stores processed attendance records, leave balances and manager workflow.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mysql_hris' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'قائمة جداول vitasiraq_hris_db في MySQL:' : 'MySQL HRIS Tables:'}
                </h3>
                <button
                  onClick={() => copyToClipboard(mysqlSchemaCode)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-teal-500 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ كود SQL' : 'Copy SQL')}</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-2.5 text-start">{t.col_emp_num}</th>
                      <th className="p-2.5 text-start">Table Name</th>
                      <th className="p-2.5 text-start">Engine</th>
                      <th className="p-2.5 text-start">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {mysqlHrisTables.map((tbl, i) => (
                      <tr key={tbl.name}>
                        <td className="p-2.5 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-teal-600 dark:text-teal-400">{tbl.name}</td>
                        <td className="p-2.5 font-mono">{tbl.engine}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {lang === 'ar' ? tbl.purpose_ar : tbl.purpose_en}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'mssql_biometric' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'جداول سرفر البصمة (MS SQL Server / BioStar):' : 'MS SQL Server Biometric Tables:'}
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-2.5 text-start">Table Name</th>
                      <th className="p-2.5 text-start">Driver / Schema</th>
                      <th className="p-2.5 text-start">Records</th>
                      <th className="p-2.5 text-start">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {mssqlBiometricTables.map((tbl) => (
                      <tr key={tbl.name}>
                        <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">{tbl.name}</td>
                        <td className="p-2.5 font-mono">{tbl.schema}</td>
                        <td className="p-2.5 font-mono">{tbl.rows}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {lang === 'ar' ? tbl.purpose_ar : tbl.purpose_en}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0a0c10] shrink-0 rounded-b-2xl">
          <span className="text-[11px] text-slate-500 font-mono">
            {lang === 'ar' ? 'قاعدة البيانات النشطة: vitasiraq_hris_db' : 'Active DB: vitasiraq_hris_db'}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
