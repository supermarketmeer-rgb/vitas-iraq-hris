import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  Building2,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Filter,
  Sparkles,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';

// Interfaces
export interface DirectSupervisorRecord {
  id?: number;
  badge_no: string;
  supervisor_name: string;
  supervisor_position: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceExceptionRecord {
  id?: number;
  badge_no: string;
  employee_code?: string;
  office_name: string;
  job_title: string;
  loan_officer_name: string;
  arrival_time: string;
  reason: string;
  timesheet_rule: string;
  name_en?: string;
  job_title_en?: string;
  system_id?: string;
  notes?: string;
  is_active?: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HODRecord {
  id?: number;
  badge_no: string;
  office_name: string;
  hod_name: string;
  hod_position: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  employees?: any[];
  onBackToDirectory?: () => void;
}

export const EmployeeManagementTables: React.FC<Props> = ({ employees = [], onBackToDirectory }) => {
  const { theme, language } = useApp();
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'supervisors' | 'exceptions' | 'hods'>('supervisors');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [officeFilter, setOfficeFilter] = useState('All');

  // Data States
  const [supervisors, setSupervisors] = useState<DirectSupervisorRecord[]>([]);
  const [exceptions, setExceptions] = useState<AttendanceExceptionRecord[]>([]);
  const [hods, setHods] = useState<HODRecord[]>([]);

  // Loading & Action States
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<DirectSupervisorRecord | null>(null);

  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<AttendanceExceptionRecord | null>(null);

  const [isHodModalOpen, setIsHodModalOpen] = useState(false);
  const [editingHod, setEditingHod] = useState<HODRecord | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'supervisor' | 'exception' | 'hod';
    id: number;
    title: string;
  } | null>(null);

  // Form states with auto-fill
  const [supervisorForm, setSupervisorForm] = useState({
    badge_no: '',
    supervisor_name: '',
    supervisor_position: ''
  });

  const [exceptionForm, setExceptionForm] = useState({
    badge_no: '',
    employee_code: '',
    office_name: '',
    job_title: '',
    loan_officer_name: '',
    arrival_time: '',
    reason: '',
    timesheet_rule: '',
    name_en: '',
    job_title_en: '',
    system_id: '',
    notes: '',
    is_active: 1
  });

  const [hodForm, setHodForm] = useState({
    badge_no: '',
    office_name: '',
    hod_name: '',
    hod_position: ''
  });

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all tables data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [supRes, excRes, hodRes] = await Promise.all([
        fetch('/api/direct-supervisors').catch(() => null),
        fetch('/api/attendance-exceptions').catch(() => null),
        fetch('/api/department-heads').catch(() => null)
      ]);

      if (supRes && supRes.ok) {
        const supData = await supRes.json();
        setSupervisors(Array.isArray(supData) ? supData : []);
      }
      if (excRes && excRes.ok) {
        const excData = await excRes.json();
        setExceptions(Array.isArray(excData) ? excData : []);
      }
      if (hodRes && hodRes.ok) {
        const hodData = await hodRes.json();
        setHods(Array.isArray(hodData) ? hodData : []);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
      showToast(t('حدث خطأ في تحميل البيانات من الخادم', 'Error loading data from server'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Find employee by Badge No or Name
  const findEmployeeByBadge = (badge: string) => {
    if (!badge || !employees.length) return null;
    const cleanBadge = badge.trim().toLowerCase();
    return employees.find(
      e =>
        (e.badgeNo && e.badgeNo.toLowerCase() === cleanBadge) ||
        (e.badge_no && e.badge_no.toLowerCase() === cleanBadge) ||
        (e.employeeId && e.employeeId.toLowerCase() === cleanBadge) ||
        (e.employee_id && e.employee_id.toLowerCase() === cleanBadge) ||
        (e.name && e.name.toLowerCase() === cleanBadge)
    );
  };

  // Auto-fill Supervisor Form on Badge Change
  const handleSupervisorBadgeChange = (val: string) => {
    const emp = findEmployeeByBadge(val);
    if (emp) {
      setSupervisorForm({
        badge_no: emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id || val,
        supervisor_name: emp.name || emp.full_name_ar || emp.full_name_en || '',
        supervisor_position: emp.jobTitle || emp.job_title || emp.position_ar || emp.position || ''
      });
      showToast(t(`تم ملء بيانات المشرف تلقائياً للموظف: ${emp.name || emp.full_name_ar}`, 'Auto-filled supervisor details successfully!'));
    } else {
      setSupervisorForm(prev => ({ ...prev, badge_no: val }));
    }
  };

  // Auto-fill Exception Form on Badge Change
  const handleExceptionBadgeChange = (val: string) => {
    const emp = findEmployeeByBadge(val);
    if (emp) {
      setExceptionForm(prev => ({
        ...prev,
        badge_no: emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id || val,
        employee_code: emp.employeeId || emp.employee_id || emp.waid || emp.badgeNo || emp.badge_no || '',
        office_name: emp.branch || emp.branch_en || emp.location || emp.location_ar || '',
        job_title: emp.jobTitle || emp.job_title || emp.position_ar || emp.position || '',
        loan_officer_name: emp.full_name_ar || emp.name || '',
        name_en: emp.full_name_en || '',
        job_title_en: emp.position_en || emp.jobTitle || '',
        system_id: emp.employeeId || emp.employee_id || emp.waid || ''
      }));
      showToast(t(`تم ملء بيانات الاستثناء تلقائياً للموظف: ${emp.name || emp.full_name_ar}`, 'Auto-filled exception employee details successfully!'));
    } else {
      setExceptionForm(prev => ({ ...prev, badge_no: val }));
    }
  };

  // Auto-fill HOD Form on Badge Change
  const handleHodBadgeChange = (val: string) => {
    const emp = findEmployeeByBadge(val);
    if (emp) {
      setHodForm({
        badge_no: emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id || val,
        office_name: emp.branch || emp.branch_en || emp.location || emp.location_ar || '',
        hod_name: emp.full_name_ar || emp.name || emp.full_name_en || '',
        hod_position: emp.jobTitle || emp.job_title || emp.position_ar || emp.position || ''
      });
      showToast(t(`تم ملء بيانات رئيس القسم تلقائياً: ${emp.name || emp.full_name_ar}`, 'Auto-filled HOD details successfully!'));
    } else {
      setHodForm(prev => ({ ...prev, badge_no: val }));
    }
  };

  // Save Supervisor (Add / Edit)
  const handleSaveSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorForm.badge_no.trim() || !supervisorForm.supervisor_name.trim()) {
      showToast(t('يرجى إدخال رقم الباج واسم المشرف المباشر', 'Badge number and supervisor name are required'), 'error');
      return;
    }

    try {
      const url = editingSupervisor ? `/api/direct-supervisors/${editingSupervisor.id}` : '/api/direct-supervisors';
      const method = editingSupervisor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supervisorForm)
      });

      if (!res.ok) throw new Error('Failed to save');

      showToast(
        editingSupervisor
          ? t('تم تحديث بيانات المشرف المباشر بنجاح', 'Direct supervisor updated successfully')
          : t('تمت إضافة المشرف المباشر بنجاح', 'Direct supervisor added successfully')
      );
      setIsSupervisorModalOpen(false);
      setEditingSupervisor(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || t('فشل حفظ البيانات', 'Failed to save data'), 'error');
    }
  };

  // Save Exception (Add / Edit)
  const handleSaveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionForm.badge_no.trim()) {
      showToast(t('يرجى إدخال رقم الباج (Badge No)', 'Badge number is required'), 'error');
      return;
    }

    try {
      const url = editingException ? `/api/attendance-exceptions/${editingException.id}` : '/api/attendance-exceptions';
      const method = editingException ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exceptionForm)
      });

      if (!res.ok) throw new Error('Failed to save');

      showToast(
        editingException
          ? t('تم تحديث استثناء الدوام بنجاح', 'Attendance exception updated successfully')
          : t('تمت إضافة استثناء الدوام بنجاح', 'Attendance exception added successfully')
      );
      setIsExceptionModalOpen(false);
      setEditingException(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || t('فشل حفظ البيانات', 'Failed to save data'), 'error');
    }
  };

  // Save HOD (Add / Edit)
  const handleSaveHod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hodForm.badge_no.trim() || !hodForm.hod_name.trim()) {
      showToast(t('يرجى إدخال رقم الباج واسم الـ HOD', 'Badge number and HOD name are required'), 'error');
      return;
    }

    try {
      const url = editingHod ? `/api/department-heads/${editingHod.id}` : '/api/department-heads';
      const method = editingHod ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hodForm)
      });

      if (!res.ok) throw new Error('Failed to save');

      showToast(
        editingHod
          ? t('تم تحديث بيانات الـ HOD بنجاح', 'HOD updated successfully')
          : t('تمت إضافة الـ HOD بنجاح', 'HOD added successfully')
      );
      setIsHodModalOpen(false);
      setEditingHod(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || t('فشل حفظ البيانات', 'Failed to save data'), 'error');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      let endpoint = '';
      if (deleteConfirmation.type === 'supervisor') endpoint = `/api/direct-supervisors/${deleteConfirmation.id}`;
      else if (deleteConfirmation.type === 'exception') endpoint = `/api/attendance-exceptions/${deleteConfirmation.id}`;
      else if (deleteConfirmation.type === 'hod') endpoint = `/api/department-heads/${deleteConfirmation.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      showToast(t('تم الحذف بنجاح', 'Record deleted successfully'));
      setDeleteConfirmation(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || t('فشل الحذف', 'Delete failed'), 'error');
    }
  };

  // Filtered lists
  const filteredSupervisors = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return supervisors.filter(s =>
      (s.supervisor_name || '').toLowerCase().includes(q) ||
      (s.supervisor_position || '').toLowerCase().includes(q) ||
      (s.badge_no || '').toLowerCase().includes(q)
    );
  }, [supervisors, searchTerm]);

  const filteredExceptions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return exceptions.filter(exc => {
      const matchSearch =
        (exc.badge_no || '').toLowerCase().includes(q) ||
        (exc.employee_code || '').toLowerCase().includes(q) ||
        (exc.office_name || '').toLowerCase().includes(q) ||
        (exc.loan_officer_name || '').toLowerCase().includes(q) ||
        (exc.name_en || '').toLowerCase().includes(q) ||
        (exc.job_title || '').toLowerCase().includes(q) ||
        (exc.reason || '').toLowerCase().includes(q) ||
        (exc.timesheet_rule || '').toLowerCase().includes(q);

      const matchOffice = officeFilter === 'All' || exc.office_name === officeFilter;
      return matchSearch && matchOffice;
    });
  }, [exceptions, searchTerm, officeFilter]);

  const filteredHods = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return hods.filter(h => {
      const matchSearch =
        (h.badge_no || '').toLowerCase().includes(q) ||
        (h.office_name || '').toLowerCase().includes(q) ||
        (h.hod_name || '').toLowerCase().includes(q) ||
        (h.hod_position || '').toLowerCase().includes(q);

      const matchOffice = officeFilter === 'All' || h.office_name === officeFilter;
      return matchSearch && matchOffice;
    });
  }, [hods, searchTerm, officeFilter]);

  // Unique Offices for filtering
  const uniqueOffices = useMemo(() => {
    const set = new Set<string>();
    exceptions.forEach(e => e.office_name && set.add(e.office_name));
    hods.forEach(h => h.office_name && set.add(h.office_name));
    employees.forEach(emp => {
      const b = emp.branch || emp.branch_en;
      if (b) set.add(b);
    });
    return ['All', ...Array.from(set).sort()];
  }, [exceptions, hods, employees]);

  // Export Table to Excel
  const exportToExcel = (type: 'supervisors' | 'exceptions' | 'hods') => {
    const wb = XLSX.utils.book_new();
    if (type === 'supervisors') {
      const data = filteredSupervisors.map(s => ({
        'Badge No': s.badge_no,
        'Direct supervisor Name': s.supervisor_name,
        'Direct supervisor position name': s.supervisor_position
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Direct Supervisors');
      XLSX.writeFile(wb, 'direct_supervisors.xlsx');
    } else if (type === 'exceptions') {
      const data = filteredExceptions.map(e => ({
        'Badge No': e.badge_no,
        'Employee Code': e.employee_code || '',
        'المكتب': e.office_name,
        'العنوان الوظيفي': e.job_title,
        'مسؤول القرض / الاسم': e.loan_officer_name,
        'وقت الحضور الى المكتب': e.arrival_time,
        'اسباب عدم الحضور في الوقت المحدد': e.reason,
        'القاعدة لنظام تايم شيت': e.timesheet_rule,
        'الاسم (EN)': e.name_en,
        'العنوان الوظيفي (EN)': e.job_title_en,
        'رقم الهوية المعرف بالنظام': e.system_id
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Exceptions');
      XLSX.writeFile(wb, 'attendance_exceptions.xlsx');
    } else if (type === 'hods') {
      const data = filteredHods.map(h => ({
        'Badge No': h.badge_no,
        'Office Name': h.office_name,
        'HOD Name': h.hod_name,
        'HOD Position': h.hod_position
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'HODs');
      XLSX.writeFile(wb, 'department_heads_hods.xlsx');
    }
  };

  return (
    <div className={`p-4 sm:p-6 space-y-6 min-h-screen ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border border-emerald-400/40'
              : 'bg-rose-600 text-white border border-rose-400/40'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner - High contrast & crisp in both Light & Dark modes */}
      <div
        className={`rounded-2xl p-6 border relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0f172a] border-slate-800 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
        style={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a'
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                  isDark
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                    : 'bg-teal-100 text-teal-900 border-teal-300'
                }`}
                style={{
                  backgroundColor: isDark ? 'rgba(20, 184, 166, 0.2)' : '#ccfbf1',
                  color: isDark ? '#5eead4' : '#0f766e',
                  borderColor: isDark ? 'rgba(20, 184, 166, 0.4)' : '#5eead4'
                }}
              >
                {t('إدارة الموارد البشرية والدوام', 'HR & Attendance Management')}
              </span>
              {onBackToDirectory && (
                <button
                  type="button"
                  onClick={onBackToDirectory}
                  className={`flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-teal-300' : 'text-slate-600 hover:text-teal-800'
                  }`}
                  style={{ color: isDark ? '#94a3b8' : '#475569' }}
                >
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{t('العودة إلى دليل الموظفين', 'Back to Employee Directory')}</span>
                </button>
              )}
            </div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
            >
              {t('جداول المشرفين المباشرين، الاستثناءات، ورؤساء الأقسام (HODs)', 'Direct Supervisors, Exceptions & HODs Management')}
            </h1>
            <p
              className={`text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
              style={{ color: isDark ? '#cbd5e1' : '#334155' }}
            >
              {t(
                'صفحة مركزية موحدة تتيح إضافة وتعديل وحذف المشرفين المباشرين، استثناءات سياسة الدوام والتايمشيت، ورؤساء الأقسام، مع ميزة التعبئة التلقائية الذكية عبر رقم الباج (Badge No).',
                'Centralized management for Direct Supervisors, Timesheet Exceptions, and HODs with smart auto-fill from Badge No.'
              )}
            </p>
          </div>

          {/* Quick Counter Cards */}
          <div className="flex items-center gap-3">
            {/* Card 1: Supervisors */}
            <div
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-800'
                }`}
                style={{
                  backgroundColor: isDark ? 'rgba(20, 184, 166, 0.2)' : '#ccfbf1',
                  color: isDark ? '#5eead4' : '#0f766e'
                }}
              >
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                >
                  {t('المشرفين المباشرين', 'Supervisors')}
                </p>
                <p
                  className={`text-lg font-black ${isDark ? 'text-teal-300' : 'text-teal-800'}`}
                  style={{ color: isDark ? '#5eead4' : '#0f766e' }}
                >
                  {supervisors.length}
                </p>
              </div>
            </div>

            {/* Card 2: Exceptions */}
            <div
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}
                style={{
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                  color: isDark ? '#fcd34d' : '#b45309'
                }}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                >
                  {t('استثناءات الدوام', 'Exceptions')}
                </p>
                <p
                  className={`text-lg font-black ${isDark ? 'text-amber-300' : 'text-amber-800'}`}
                  style={{ color: isDark ? '#fcd34d' : '#b45309' }}
                >
                  {exceptions.length}
                </p>
              </div>
            </div>

            {/* Card 3: HODs */}
            <div
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                }`}
                style={{
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                  color: isDark ? '#a5b4fc' : '#4338ca'
                }}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                >
                  {t('رؤساء الأقسام HODs', 'HODs')}
                </p>
                <p
                  className={`text-lg font-black ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}
                  style={{ color: isDark ? '#a5b4fc' : '#4338ca' }}
                >
                  {hods.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Main Tabs Nav with strong contrast and clear text */}
        <div className={`flex items-center gap-2.5 mt-6 border-t pt-4 overflow-x-auto ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {/* Tab 1 Button */}
          <button
            type="button"
            onClick={() => setActiveTab('supervisors')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer ${
              activeTab === 'supervisors'
                ? 'bg-teal-700 text-white shadow-lg shadow-teal-700/30 ring-2 ring-teal-600'
                : isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
            }`}
            style={{
              backgroundColor: activeTab === 'supervisors' ? '#0f766e' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'supervisors' ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a'),
              borderColor: activeTab === 'supervisors' ? '#0d9488' : (isDark ? '#334155' : '#cbd5e1')
            }}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span style={{ color: activeTab === 'supervisors' ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a') }}>
              {t('1. جدول المشرفين المباشرين', '1. Direct Supervisors')}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-black ${
                activeTab === 'supervisors'
                  ? 'bg-white text-teal-900'
                  : isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-200 text-slate-900 border border-slate-300'
              }`}
              style={{
                backgroundColor: activeTab === 'supervisors' ? '#ffffff' : (isDark ? '#334155' : '#e2e8f0'),
                color: activeTab === 'supervisors' ? '#0f766e' : (isDark ? '#f1f5f9' : '#0f172a')
              }}
            >
              {supervisors.length}
            </span>
          </button>

          {/* Tab 2 Button */}
          <button
            type="button"
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer ${
              activeTab === 'exceptions'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-500'
                : isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
            }`}
            style={{
              backgroundColor: activeTab === 'exceptions' ? '#d97706' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'exceptions' ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a'),
              borderColor: activeTab === 'exceptions' ? '#b45309' : (isDark ? '#334155' : '#cbd5e1')
            }}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span style={{ color: activeTab === 'exceptions' ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a') }}>
              {t('2. جدول الاستثناءات (الدوام والتايمشيت)', '2. Attendance Exceptions')}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-black ${
                activeTab === 'exceptions'
                  ? 'bg-white text-amber-900'
                  : isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-200 text-slate-900 border border-slate-300'
              }`}
              style={{
                backgroundColor: activeTab === 'exceptions' ? '#ffffff' : (isDark ? '#334155' : '#e2e8f0'),
                color: activeTab === 'exceptions' ? '#b45309' : (isDark ? '#f1f5f9' : '#0f172a')
              }}
            >
              {exceptions.length}
            </span>
          </button>

          {/* Tab 3 Button */}
          <button
            type="button"
            onClick={() => setActiveTab('hods')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer ${
              activeTab === 'hods'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500'
                : isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
            }`}
            style={{
              backgroundColor: activeTab === 'hods' ? '#4f46e5' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'hods' ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a'),
              borderColor: activeTab === 'hods' ? '#4338ca' : (isDark ? '#334155' : '#cbd5e1')
            }}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span style={{ color: activeTab === 'hods' ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a') }}>
              {t('3. جدول الـ HODs (رؤساء الأقسام)', '3. HODs (Heads of Depts)')}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-black ${
                activeTab === 'hods'
                  ? 'bg-white text-indigo-900'
                  : isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-200 text-slate-900 border border-slate-300'
              }`}
              style={{
                backgroundColor: activeTab === 'hods' ? '#ffffff' : (isDark ? '#334155' : '#e2e8f0'),
                color: activeTab === 'hods' ? '#4338ca' : (isDark ? '#f1f5f9' : '#0f172a')
              }}
            >
              {hods.length}
            </span>
          </button>
        </div>
      </div>

      {/* Action Bar (Search, Office Filter, Add Button, Export) */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 rtl:left-auto text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('البحث بالاسم، رقم الباج (Badge No)، العنوان أو المكتب...', 'Search by name, Badge No, title, or office...')}
              className={`w-full rounded-xl pl-3 pr-9 py-2 text-xs sm:text-sm border font-medium transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:bg-white'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-3 rtl:right-auto text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Office Filter for Exceptions & HODs */}
          {(activeTab === 'exceptions' || activeTab === 'hods') && (
            <div className="flex items-center gap-1.5 min-w-[160px]">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={officeFilter}
                onChange={e => setOfficeFilter(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {uniqueOffices.map(off => (
                  <option key={off} value={off}>
                    {off === 'All' ? t('جميع المكاتب والفروع', 'All Offices & Branches') : off}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
            }`}
            title={t('تحديث البيانات', 'Refresh data')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Export to Excel */}
          <button
            onClick={() => exportToExcel(activeTab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-emerald-400'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('تصدير إكسل', 'Export Excel')}</span>
          </button>

          {/* Add New Record Button */}
          {activeTab === 'supervisors' && (
            <button
              onClick={() => {
                setEditingSupervisor(null);
                setSupervisorForm({ badge_no: '', supervisor_name: '', supervisor_position: '' });
                setIsSupervisorModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-700/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('إضافة مشرف مباشر', 'Add Supervisor')}</span>
            </button>
          )}

          {activeTab === 'exceptions' && (
            <button
              onClick={() => {
                setEditingException(null);
                setExceptionForm({
                  badge_no: '',
                  employee_code: '',
                  office_name: '',
                  job_title: '',
                  loan_officer_name: '',
                  arrival_time: '',
                  reason: '',
                  timesheet_rule: 'يحسب وقت الحضور مع الاجازات و يعتبر الفرق الغير مبرر كله كعمل خارج المكتب',
                  name_en: '',
                  job_title_en: '',
                  system_id: '',
                  notes: '',
                  is_active: 1
                });
                setIsExceptionModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('إضافة استثناء دوام', 'Add Exception')}</span>
            </button>
          )}

          {activeTab === 'hods' && (
            <button
              onClick={() => {
                setEditingHod(null);
                setHodForm({ badge_no: '', office_name: '', hod_name: '', hod_position: '' });
                setIsHodModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('إضافة رئيس قسم (HOD)', 'Add HOD')}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Direct Supervisors Table */}
      {activeTab === 'supervisors' && (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
              <thead className={`border-b font-bold ${
                isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}>
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Badge No</th>
                  <th className="py-3.5 px-4">Direct supervisor Name</th>
                  <th className="py-3.5 px-4">Direct supervisor position name</th>
                  <th className="py-3.5 px-4 text-center">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                      <span>{t('جاري تحميل بيانات المشرفين المباشرين...', 'Loading direct supervisors...')}</span>
                    </td>
                  </tr>
                ) : filteredSupervisors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50 text-teal-600" />
                      <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {t('لا توجد بيانات مشرفين مباشرين مسجلة', 'No direct supervisors found')}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('اضغط على "إضافة مشرف مباشر" وسيقوم النظام بتعبئة الاسم والمنصب تلقائياً عند إدخال رقم الباج.', 'Click "Add Supervisor" to add. Entering Badge No auto-fills details.')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSupervisors.map((s, idx) => (
                    <tr
                      key={s.id || idx}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${
                          isDark ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {s.badge_no}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {s.supervisor_name.charAt(0)}
                        </div>
                        <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>{s.supervisor_name}</span>
                      </td>
                      <td className={`py-3.5 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {s.supervisor_position || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupervisor(s);
                              setSupervisorForm({
                                badge_no: s.badge_no,
                                supervisor_name: s.supervisor_name,
                                supervisor_position: s.supervisor_position
                              });
                              setIsSupervisorModalOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs border hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe',
                              borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#7dd3fc',
                              color: isDark ? '#38bdf8' : '#0369a1'
                            }}
                            title={t('تعديل المشرف المباشر', 'Edit Direct Supervisor')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (s.id) {
                                setDeleteConfirmation({
                                  isOpen: true,
                                  type: 'supervisor',
                                  id: s.id,
                                  title: `${s.supervisor_name} (${s.badge_no})`
                                });
                              }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs border hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6',
                              borderColor: isDark ? 'rgba(251, 113, 133, 0.4)' : '#fca5a5',
                              color: isDark ? '#fb7185' : '#be123c'
                            }}
                            title={t('حذف المشرف المباشر', 'Delete Direct Supervisor')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Attendance Exceptions Table */}
      {activeTab === 'exceptions' && (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
              <thead className={`border-b font-bold ${
                isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}>
                <tr>
                  <th className="py-3.5 px-3">#</th>
                  <th className="py-3.5 px-3">Badge No</th>
                  <th className="py-3.5 px-3">Employee Code</th>
                  <th className="py-3.5 px-3">{t('المكتب', 'Office')}</th>
                  <th className="py-3.5 px-3">{t('العنوان الوظيفي', 'Job Title')}</th>
                  <th className="py-3.5 px-3">{t('مسؤول القرض / الاسم', 'Loan Officer / Name')}</th>
                  <th className="py-3.5 px-3">{t('وقت الحضور الى المكتب', 'Arrival Time')}</th>
                  <th className="py-3.5 px-3">{t('اسباب عدم الحضور في الوقت المحدد', 'Reason')}</th>
                  <th className="py-3.5 px-3">{t('القاعدة لنظام تايم شيت', 'Timesheet Rule')}</th>
                  <th className="py-3.5 px-3">{t('رقم الهوية بالنظام', 'System ID')}</th>
                  <th className="py-3.5 px-3 text-center">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      <span>{t('جاري تحميل جدول الاستثناءات...', 'Loading attendance exceptions...')}</span>
                    </td>
                  </tr>
                ) : filteredExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 text-amber-600" />
                      <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {t('جدول الاستثناءات فارغ ومجهز للإدخال', 'Attendance exceptions table is empty and ready for data entry')}
                      </p>
                      <p className={`text-xs mt-1 max-w-lg mx-auto font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t(
                          'تم إنشاء الجدول بأعمدته المطلوبة وربطه بنظام الدوام والتايمشيت. عند إضافة Badge No سيتم سحب اسم الموظف وعنوانه وفرعه ورقم الهوية تلقائياً.',
                          'Table schema is created and linked to timesheet code. Adding a Badge No auto-populates employee data.'
                        )}
                      </p>
                      <button
                        onClick={() => {
                          setEditingException(null);
                          setExceptionForm({
                            badge_no: '',
                            office_name: '',
                            job_title: '',
                            loan_officer_name: '',
                            arrival_time: '',
                            reason: '',
                            timesheet_rule: 'يحسب وقت الحضور مع الاجازات و يعتبر الفرق الغير مبرر كله كعمل خارج المكتب',
                            name_en: '',
                            job_title_en: '',
                            system_id: '',
                            notes: '',
                            is_active: 1
                          });
                          setIsExceptionModalOpen(true);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t('إضافة أول استثناء دوام', 'Add First Exception')}</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredExceptions.map((exc, idx) => (
                    <tr
                      key={exc.id || idx}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${
                          isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {exc.badge_no}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {exc.employee_code || '—'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{exc.office_name || '—'}</td>
                      <td className={`py-3 px-3 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{exc.job_title || '—'}</td>
                      <td className="py-3 px-3">
                        <div className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{exc.loan_officer_name || '—'}</div>
                        {exc.name_en && <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{exc.name_en}</div>}
                      </td>
                      <td className={`py-3 px-3 font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{exc.arrival_time || '—'}</td>
                      <td className={`py-3 px-3 max-w-[200px] truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title={exc.reason}>
                        {exc.reason || '—'}
                      </td>
                      <td className="py-3 px-3 max-w-[220px]">
                        <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold border block truncate ${
                          isDark ? 'bg-slate-800 text-teal-300 border-slate-700' : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`} title={exc.timesheet_rule}>
                          {exc.timesheet_rule || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-xs text-slate-500">{exc.system_id || '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingException(exc);
                              setExceptionForm({
                                badge_no: exc.badge_no,
                                employee_code: exc.employee_code || '',
                                office_name: exc.office_name || '',
                                job_title: exc.job_title || '',
                                loan_officer_name: exc.loan_officer_name || '',
                                arrival_time: exc.arrival_time || '',
                                reason: exc.reason || '',
                                timesheet_rule: exc.timesheet_rule || '',
                                name_en: exc.name_en || '',
                                job_title_en: exc.job_title_en || '',
                                system_id: exc.system_id || '',
                                notes: exc.notes || '',
                                is_active: exc.is_active ? 1 : 0
                              });
                              setIsExceptionModalOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs border hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe',
                              borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#7dd3fc',
                              color: isDark ? '#38bdf8' : '#0369a1'
                            }}
                            title={t('تعديل استثناء الدوام', 'Edit Attendance Exception')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (exc.id) {
                                setDeleteConfirmation({
                                  isOpen: true,
                                  type: 'exception',
                                  id: exc.id,
                                  title: `${exc.loan_officer_name || exc.badge_no} (${exc.office_name})`
                                });
                              }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs border hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6',
                              borderColor: isDark ? 'rgba(251, 113, 133, 0.4)' : '#fca5a5',
                              color: isDark ? '#fb7185' : '#be123c'
                            }}
                            title={t('حذف استثناء الدوام', 'Delete Attendance Exception')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HODs Table */}
      {activeTab === 'hods' && (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
              <thead className={`border-b font-bold ${
                isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}>
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Badge No</th>
                  <th className="py-3.5 px-4">Office Name</th>
                  <th className="py-3.5 px-4">HOD Name</th>
                  <th className="py-3.5 px-4">HOD Position</th>
                  <th className="py-3.5 px-4 text-center">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>{t('جاري تحميل جدول الـ HODs...', 'Loading HODs...')}</span>
                    </td>
                  </tr>
                ) : filteredHods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-indigo-600" />
                      <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {t('لا توجد سجلات لرؤساء الأقسام (HODs)', 'No HOD records found')}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('اضغط على "إضافة رئيس قسم" لإضافة رئيس قسم جديد مع التعبئة التلقائية عند إدخال رقم الباج.', 'Click "Add HOD" to register a department head.')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHods.map((h, idx) => (
                    <tr
                      key={h.id || idx}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {h.badge_no}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{h.office_name || '—'}</td>
                      <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {h.hod_name.charAt(0)}
                        </div>
                        <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>{h.hod_name}</span>
                      </td>
                      <td className={`py-3.5 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{h.hod_position || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHod(h);
                              setHodForm({
                                badge_no: h.badge_no,
                                office_name: h.office_name,
                                hod_name: h.hod_name,
                                hod_position: h.hod_position
                              });
                              setIsHodModalOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs border hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe',
                              borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#7dd3fc',
                              color: isDark ? '#38bdf8' : '#0369a1'
                            }}
                            title={t('تعديل رئيس القسم', 'Edit HOD')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (h.id) {
                                setDeleteConfirmation({
                                  isOpen: true,
                                  type: 'hod',
                                  id: h.id,
                                  title: `${h.hod_name} (${h.office_name})`
                                });
                              }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs border hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6',
                              borderColor: isDark ? 'rgba(251, 113, 133, 0.4)' : '#fca5a5',
                              color: isDark ? '#fb7185' : '#be123c'
                            }}
                            title={t('حذف رئيس القسم', 'Delete HOD')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── MODALS ────────────────── */}

      {/* 1. Modal: Add/Edit Direct Supervisor */}
      {isSupervisorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header: fixed */}
            <div className={`shrink-0 flex items-center justify-between p-4 sm:p-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-800'
                }`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingSupervisor
                      ? t('تعديل المشرف المباشر', 'Edit Direct Supervisor')
                      : t('إضافة مشرف مباشر جديد', 'Add New Direct Supervisor')}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('أدخل رقم الباج ليتم جلب الاسم والمنصب تلقائياً', 'Enter Badge No to auto-fill name & position')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupervisorModalOpen(false)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupervisor} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 profile-scrollbar">
                {/* Badge No with Auto-complete list */}
                <div>
                  <label className="block text-xs font-bold mb-1 flex items-center justify-between">
                    <span>Badge No (رقم الباج) *</span>
                    <span className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                      <Sparkles className="w-3 h-3" />
                      {t('تعبئة تلقائية ذكية', 'Smart Auto-Fill')}
                    </span>
                  </label>
                  <input
                    type="text"
                    list="employees-badge-list"
                    value={supervisorForm.badge_no}
                    onChange={e => handleSupervisorBadgeChange(e.target.value)}
                    placeholder="e.g. V132 or Wehda-LO-V647"
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border font-mono font-bold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                  <datalist id="employees-badge-list">
                    {employees.map((emp, i) => (
                      <option key={emp.id || i} value={emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id}>
                        {emp.name || emp.full_name_ar} - {emp.jobTitle || emp.position_ar} ({emp.branch})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Direct Supervisor Name */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Direct supervisor Name (اسم المشرف المباشر) *
                  </label>
                  <input
                    type="text"
                    value={supervisorForm.supervisor_name}
                    onChange={e => setSupervisorForm(prev => ({ ...prev, supervisor_name: e.target.value }))}
                    placeholder={t('اسم المشرف الكامل', 'Full Supervisor Name')}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                {/* Direct supervisor position name */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Direct supervisor position name (العنوان الوظيفي للمشرف) *
                  </label>
                  <input
                    type="text"
                    value={supervisorForm.supervisor_position}
                    onChange={e => setSupervisorForm(prev => ({ ...prev, supervisor_position: e.target.value }))}
                    placeholder="e.g. Credit Manager, Branch Manager, Loan Supervisor"
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Footer: fixed */}
              <div className={`shrink-0 flex items-center justify-end gap-2.5 p-4 border-t ${
                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsSupervisorModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md cursor-pointer transition-all hover:scale-102 active:scale-98"
                >
                  {editingSupervisor ? t('حفظ التعديلات', 'Save Changes') : t('إضافة المشرف', 'Add Supervisor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Add/Edit Attendance Exception */}
      {isExceptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header: fixed at top */}
            <div className={`shrink-0 flex items-center justify-between p-4 sm:p-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingException
                      ? t('تعديل استثناء الدوام والتايمشيت', 'Edit Attendance Exception')
                      : t('إضافة استثناء دوام جديد', 'Add New Attendance Exception')}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('يخضع كود التايمشيت للاستثناءات المسجلة في هذا الجدول تلقائياً', 'Timesheet code will apply exception rules defined here')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExceptionModalOpen(false)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveException} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 profile-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Badge No with Auto-complete */}
                  <div>
                    <label className="block text-xs font-bold mb-1 flex items-center justify-between">
                      <span>Badge No (رقم الباج) *</span>
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        <Sparkles className="w-3 h-3" />
                        {t('سحب البيانات تلقائياً', 'Auto-fills')}
                      </span>
                    </label>
                    <input
                      type="text"
                      list="employees-badge-list"
                      value={exceptionForm.badge_no}
                      onChange={e => handleExceptionBadgeChange(e.target.value)}
                      placeholder="e.g. V134 or Mansour-LO-V1360"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-mono font-bold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                      required
                    />
                  </div>

                  {/* Employee Code / كود الموظف لنظام الحضور */}
                  <div>
                    <label className="block text-xs font-bold mb-1 flex items-center justify-between">
                      <span>Employee Code (كود الموظف بنظام الحضور)</span>
                      <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('للربط مع التايمشيت', 'For Timesheet Link')}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={exceptionForm.employee_code}
                      onChange={e => setExceptionForm(prev => ({ ...prev, employee_code: e.target.value }))}
                      placeholder="e.g. V152 or V647"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-mono font-bold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Office Name / المكتب */}
                  <div>
                    <label className="block text-xs font-bold mb-1">المكتب (Office Name)</label>
                    <input
                      type="text"
                      value={exceptionForm.office_name}
                      onChange={e => setExceptionForm(prev => ({ ...prev, office_name: e.target.value }))}
                      placeholder="e.g. المنصور, الوحده, الناصريه, الحله"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Loan Officer Name / مسوؤل القرض / الاسم */}
                  <div>
                    <label className="block text-xs font-bold mb-1">مسؤول القرض / الاسم (العربي)</label>
                    <input
                      type="text"
                      value={exceptionForm.loan_officer_name}
                      onChange={e => setExceptionForm(prev => ({ ...prev, loan_officer_name: e.target.value }))}
                      placeholder="e.g. حسام صباح غضب"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Name EN */}
                  <div>
                    <label className="block text-xs font-bold mb-1">الاسم بالإنكليزية (Name EN)</label>
                    <input
                      type="text"
                      value={exceptionForm.name_en}
                      onChange={e => setExceptionForm(prev => ({ ...prev, name_en: e.target.value }))}
                      placeholder="e.g. Hussam Sabah Ghadab"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Job Title / العنوان الوظيفي */}
                  <div>
                    <label className="block text-xs font-bold mb-1">العنوان الوظيفي (Job Title)</label>
                    <input
                      type="text"
                      value={exceptionForm.job_title}
                      onChange={e => setExceptionForm(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="e.g. مسؤول القروض, مسؤول استحصال"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* System ID / رقم الهوية المعرف بالنظام */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold mb-1">رقم الهوية المعرف بالنظام (System ID)</label>
                    <input
                      type="text"
                      value={exceptionForm.system_id}
                      onChange={e => setExceptionForm(prev => ({ ...prev, system_id: e.target.value }))}
                      placeholder="e.g. Wehda-LO-V647 or VIT-0002"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border font-mono font-bold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Arrival Time / وقت الحضور الى المكتب */}
                <div>
                  <label className="block text-xs font-bold mb-1">وقت الحضور الى المكتب</label>
                  <input
                    type="text"
                    value={exceptionForm.arrival_time}
                    onChange={e => setExceptionForm(prev => ({ ...prev, arrival_time: e.target.value }))}
                    placeholder="e.g. الصباح دوام كامل - الاثنين والاربعاء حظور كامل / بصمة الدخول الصباحي فقط"
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Reason / اسباب عدم الحضور في الوقت المحدد */}
                <div>
                  <label className="block text-xs font-bold mb-1">اسباب عدم الحضور في الوقت المحدد</label>
                  <textarea
                    rows={2}
                    value={exceptionForm.reason}
                    onChange={e => setExceptionForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. بعد منزله عن المكتب وباقي ايام الاسبوع صباحا فقط / عمل خارج المكتب..."
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border font-medium ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Timesheet Rule / القاعدة لنظام تايم شيت */}
                <div>
                  <label className="block text-xs font-bold mb-1 flex items-center justify-between">
                    <span>القاعدة لنظام تايم شيت (Timesheet Rule)</span>
                    <span className={`text-[11px] font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>{t('اختر أو اكتب صيغة القاعدة', 'Select preset or type rule')}</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'يحسب وقت الحضور مع الاجازات و يعتبر الفرق الغير مبرر كله كعمل خارج المكتب',
                      'دوام كامل عمل خارج المكتب - لعدم وجود جهاز البصمة في الفرع',
                      'النظام العادي مع احتساب ساعة يوميا كإجازات أخرى (ساعة رضاعة)',
                      'بصمة الدخول الصباحي فقط - لبعد سكنه خارج بغداد/المحافظة',
                      'اعتماد استمارة الدوام اليدوي',
                      'عدم اعتماد خصومات فقط لهذا الشهر'
                    ].map(rule => (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => setExceptionForm(prev => ({ ...prev, timesheet_rule: rule }))}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        }`}
                      >
                        {rule.slice(0, 35)}...
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={exceptionForm.timesheet_rule}
                    onChange={e => setExceptionForm(prev => ({ ...prev, timesheet_rule: e.target.value }))}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Modal Footer (Fixed at bottom) */}
              <div className={`shrink-0 flex items-center justify-end gap-2.5 p-4 border-t ${
                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsExceptionModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30 cursor-pointer transition-all hover:scale-102 active:scale-98"
                >
                  {editingException ? t('حفظ التعديلات', 'Save Changes') : t('إضافة الاستثناء', 'Add Exception')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Add/Edit HOD */}
      {isHodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingHod
                      ? t('تعديل رئيس القسم (HOD)', 'Edit Head of Department')
                      : t('إضافة رئيس قسم جديد (HOD)', 'Add New Head of Department')}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('أدخل رقم الباج لجلب الاسم والفرع والمنصب تلقائياً', 'Enter Badge No to auto-fill details')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHodModalOpen(false)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHod} className="mt-5 space-y-4">
              {/* Badge No with Auto-complete */}
              <div>
                <label className="block text-xs font-bold mb-1 flex items-center justify-between">
                  <span>Badge No (رقم الباج) *</span>
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                    <Sparkles className="w-3 h-3" />
                    {t('تعبئة تلقائية ذكية', 'Smart Auto-Fill')}
                  </span>
                </label>
                <input
                  type="text"
                  list="employees-badge-list"
                  value={hodForm.badge_no}
                  onChange={e => handleHodBadgeChange(e.target.value)}
                  placeholder="e.g. V133"
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border font-mono font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              {/* Office Name */}
              <div>
                <label className="block text-xs font-bold mb-1">
                  Office Name (اسم المكتب / الفرع) *
                </label>
                <input
                  type="text"
                  value={hodForm.office_name}
                  onChange={e => setHodForm(prev => ({ ...prev, office_name: e.target.value }))}
                  placeholder="e.g. المكتب الرئيسي - بغداد, فرع البصرة, فرع أربيل"
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              {/* HOD Name */}
              <div>
                <label className="block text-xs font-bold mb-1">
                  HOD Name (اسم رئيس القسم) *
                </label>
                <input
                  type="text"
                  value={hodForm.hod_name}
                  onChange={e => setHodForm(prev => ({ ...prev, hod_name: e.target.value }))}
                  placeholder={t('اسم رئيس القسم الكامل', 'Full HOD Name')}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              {/* HOD Position */}
              <div>
                <label className="block text-xs font-bold mb-1">
                  HOD Position (المنصب الوظيفي للـ HOD) *
                </label>
                <input
                  type="text"
                  value={hodForm.hod_position}
                  onChange={e => setHodForm(prev => ({ ...prev, hod_position: e.target.value }))}
                  placeholder="e.g. Head of Operations, Credit Director, HR Manager"
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsHodModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                >
                  {editingHod ? t('حفظ التعديلات', 'Save Changes') : t('إضافة الـ HOD', 'Add HOD')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">{t('تأكيد عملية الحذف', 'Confirm Deletion')}</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟', 'Are you sure you want to delete this record?')}
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border mb-5 font-bold text-xs sm:text-sm ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              {deleteConfirmation.title}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                {t('تأكيد الحذف', 'Delete Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
