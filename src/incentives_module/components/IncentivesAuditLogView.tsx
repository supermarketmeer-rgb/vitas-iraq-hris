import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { AuditLog } from '../types';
import { ShieldCheck, Search, Filter, History, Clock } from 'lucide-react';

interface AuditLogViewProps {
  isDark?: boolean;
}

export const IncentivesAuditLogView: React.FC<AuditLogViewProps> = ({ isDark = false }) => {
  const [logs, setLogs] = useState<AuditLog[]>(StorageService.getAuditLogs());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase())) ||
      (l.affectedEntityId && l.affectedEntityId.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || l.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'AUTH':
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">AUTH</span>;
      case 'EMPLOYEES':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">EMPLOYEES</span>;
      case 'VARIABLES':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">VARIABLES</span>;
      case 'FORMULAS':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">FORMULAS</span>;
      case 'IMPORT':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">IMPORT</span>;
      case 'CALCULATION':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">CALCULATION</span>;
      case 'APPROVAL':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">APPROVAL</span>;
      case 'BACKUP':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">BACKUP</span>;
      default:
        return <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-mono">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">security</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              FINANCIAL AUDIT TRAIL & LOGS
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            سجل التدقيق والأمان المالي (Audit Trail)
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            تسجيل موثق لكافة عمليات استيراد الملفات، تعديل الموظفين، تغيير المعادلات، احتساب المستحقات، والاعتماد الإداري
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl">
          <Clock className="w-4 h-4" />
          <span>{filteredLogs.length} سجلات تدقيق</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      } flex flex-col md:flex-row gap-3 items-center justify-between text-xs`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالعملية، المستخدم، أو المعرف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pr-10 pl-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
              isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-bold">الفئة:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`rounded-xl border px-3 py-1.5 focus:outline-none focus:border-teal-500 font-medium ${
              isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <option value="all">كافة الفئات</option>
            <option value="IMPORT">استيراد الملفات (IMPORT)</option>
            <option value="CALCULATION">احتساب المستحقات (CALCULATION)</option>
            <option value="APPROVAL">الاعتمادات والقفل (APPROVAL)</option>
            <option value="FORMULAS">إعداد المعادلات (FORMULAS)</option>
            <option value="EMPLOYEES">الموظفين (EMPLOYEES)</option>
            <option value="BACKUP">النسخ الاحتياطي (BACKUP)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} border-b font-bold`}>
              <tr>
                <th className="p-3.5 w-44">التاريخ والوقت</th>
                <th className="p-3.5 w-48">المستخدم والدور</th>
                <th className="p-3.5 w-28 text-center">الفئة</th>
                <th className="p-3.5">تفاصيل العملية / الحدث المالي</th>
                <th className="p-3.5 w-36 font-mono">المعرف المتأثر</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
              {filteredLogs.map((l) => (
                <tr key={l.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                  <td className="p-3.5 font-mono text-slate-400">
                    {new Date(l.timestamp).toLocaleString('ar-IQ')}
                  </td>
                  <td className="p-3.5 font-bold">
                    <div>{l.userName}</div>
                    <div className="text-[10px] text-teal-400 font-mono font-normal">{l.userRole}</div>
                  </td>
                  <td className="p-3.5 text-center">{getCategoryBadge(l.category)}</td>
                  <td className="p-3.5 text-slate-300 dark:text-slate-300 text-slate-700 font-medium">
                    {l.action}
                  </td>
                  <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                    {l.affectedEntityId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
