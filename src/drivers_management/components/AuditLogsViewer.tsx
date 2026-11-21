import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Database } from 'lucide-react';
import { AuditLog } from '../types';
import { DtmsStorage } from '../utils/storage';
import { fetchAuditLogsFromMySQL } from '../utils/apiSync';
import { getLang, tr } from '../utils/i18n';

export const AuditLogsViewer: React.FC = () => {
  const isEnglish = getLang() === 'en';
  const [logs, setLogs] = useState<AuditLog[]>(DtmsStorage.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const remoteLogs = await fetchAuditLogsFromMySQL();
      if (remoteLogs && remoteLogs.length > 0) {
        const formatted: AuditLog[] = remoteLogs.map((l: any) => ({
          id: String(l.id),
          user_name: l.user_name || tr('مستخدم النظام', 'System User'),
          user_role: l.user_role || tr('مسؤول', 'Administrator'),
          ip_address: l.ip_address || '127.0.0.1',
          action_type: l.action_type || l.action || tr('إجراء نظام', 'System Action'),
          action: l.action_type || l.action || tr('إجراء نظام', 'System Action'),
          description: l.description || l.details || '',
          details: l.description || l.details || '',
          entity: l.entity || l.table_name || 'global',
          table_name: l.entity || l.table_name || 'global',
          entity_id: String(l.entity_id || '1'),
          timestamp: l.timestamp || '',
          created_at: l.timestamp || '',
        }));
        setLogs(formatted);
        localStorage.setItem('dtms_audit_logs_v2', JSON.stringify(formatted));
      } else {
        const local = DtmsStorage.getAuditLogs();
        setLogs(local);
      }
    } catch (err) {
      setLogs(DtmsStorage.getAuditLogs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const normalizeAction = (action?: string) => {
    switch (action) {
      case 'إنشاء رحلة': return 'create';
      case 'تعديل رحلة':
      case 'تعديل الإعدادات': return 'update';
      case 'حذف': return 'delete';
      case 'اعتماد رحلة': return 'approval';
      case 'رفض رحلة': return 'rejection';
      case 'بدء رحلة': return 'start_trip';
      case 'قراءة عداد': return 'odometer';
      case 'تتبع GPS': return 'gps_tracking';
      default: return action || 'info';
    }
  };

  const filteredLogs = logs.filter((log) => {
    const targetText = (log.user_name || '') + ' ' + (log.table_name || log.entity || '') + ' ' + (log.details || log.description || '');
    const matchesSearch = targetText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'all' || normalizeAction(log.action || log.action_type) === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action?: string) => {
    const act = normalizeAction(action);
    switch (act) {
      case 'create':
        return { label: tr('إنشاء جديد', 'Create'), style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'update':
        return { label: tr('تعديل', 'Update'), style: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' };
      case 'delete':
        return { label: tr('حذف', 'Delete'), style: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
      case 'approval':
        return { label: tr('تأييد واعتماد', 'Approve & Endorse'), style: 'bg-teal-600 text-white font-bold' };
      case 'rejection':
        return { label: tr('رفض', 'Reject'), style: 'bg-rose-600 text-white' };
      case 'start_trip':
        return { label: tr('بدء رحلة', 'Start Trip'), style: 'bg-teal-700 text-white' };
      case 'odometer':
        return { label: tr('قراءة عداد', 'Odometer Reading'), style: 'bg-teal-700 text-white' };
      case 'gps_tracking':
        return { label: tr('تتبع GPS', 'GPS Tracking'), style: 'bg-teal-700 text-white' };
      default:
        return { label: act, style: 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200' };
    }
  };

  return (
    <div className="space-y-5 pb-16" dir={isEnglish ? 'ltr' : 'rtl'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            <span>{tr('سجل تدقيق ورقابة العمليات', 'Audit Logs')}</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {tr('سجل تدقيق لجميع العمليات المتزامنة مع قاعدة بيانات MySQL', 'An audit trail of all operations synchronized with the MySQL database')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 text-xs font-semibold transition"
            title={tr('تحديث البيانات من MySQL', 'Refresh data from MySQL')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>{tr('تحديث', 'Refresh')}</span>
          </button>

          <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold">
            <Database className="w-3.5 h-3.5 text-teal-600" />
            {tr('إجمالي العمليات الموثقة:', 'Total logged operations:')} {logs.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className={`w-4 h-4 text-gray-400 absolute ${isEnglish ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2`} />
          <input
            type="text"
            placeholder={tr('ابحث باسم المستخدم، الجدول، أو تفاصيل العملية...', 'Search by user, table, or operation details...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${isEnglish ? 'pl-9 pr-3' : 'pr-9 pl-3'} py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white`}
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="all">{tr('جميع أنواع الإجراءات', 'All Action Types')}</option>
          <option value="create">{tr('إنشاء', 'Create')}</option>
          <option value="update">{tr('تعديل', 'Update')}</option>
          <option value="delete">{tr('حذف', 'Delete')}</option>
          <option value="approval">{tr('تأييد واعتماد', 'Approve & Endorse')}</option>
          <option value="rejection">{tr('رفض', 'Reject')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${isEnglish ? 'text-left' : 'text-right'} text-xs`}>
            <thead className="bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-b border-gray-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="p-3.5">{tr('الوقت والتاريخ', 'Date and Time')}</th>
                <th className="p-3.5">{tr('القائم بالعملية', 'Performed By')}</th>
                <th className="p-3.5">{tr('نوع الإجراء', 'Action')}</th>
                <th className="p-3.5">{tr('الجدول المستهدف', 'Target Entity')}</th>
                <th className="p-3.5">{tr('تفاصيل التغيير', 'Change Details')}</th>
                <th className="p-3.5">{tr('عنوان IP', 'IP Address')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">{tr('لا توجد سجلات مطابقة', 'No matching audit records.')}</td></tr>
              ) : filteredLogs.map((log) => {
                const badge = getActionBadge(log.action || log.action_type);
                return (
                  <tr key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                    <td className="p-3.5 font-mono text-[11px] text-gray-500">
                      {log.created_at || log.timestamp || '2026-09-20'}
                    </td>

                    <td className="p-3.5 font-bold text-gray-900 dark:text-white">
                      {log.user_name}
                    </td>

                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.style}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-teal-700 dark:text-teal-400">
                      {log.table_name || log.entity || tr('نظام', 'System')}
                    </td>

                    <td className="p-3.5 text-gray-700 dark:text-gray-300 max-w-md">
                      {log.details || log.description || tr('عملية مسجلة', 'Logged operation')}
                    </td>

                    <td className="p-3.5 font-mono text-[10px] text-gray-400">
                      {log.ip_address}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
