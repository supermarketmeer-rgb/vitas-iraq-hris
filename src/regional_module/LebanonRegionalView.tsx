import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export interface LebanonEmployee {
  id: string;
  employee_id: string;
  badge_no?: string;
  waid?: string;
  name: string;
  name_en?: string;
  email?: string;
  phone?: string;
  country: string;
  city: string;
  branch: string;
  department: string;
  job_title: string;
  job_title_en?: string;
  direct_manager_id?: string;
  is_supervisor?: boolean | number;
  can_supervise_iraq?: boolean | number;
  hire_date?: string;
  contract_type?: string;
  status: 'Active' | 'Inactive' | 'Terminated' | 'On_Leave';
  basic_salary: number;
  currency: string;
  social_security_nssf?: string;
  tax_id?: string;
  address?: string;
  notes?: string;
}

export interface LebanonContract {
  id: string;
  employee_id: string;
  employee_name?: string;
  contract_ref?: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  basic_salary_usd: number;
  transportation_allowance_usd: number;
  living_allowance_usd: number;
  probation_months: number;
  status: 'Active' | 'Expired' | 'Draft' | 'Terminated';
  notes?: string;
}

export interface LebanonPayroll {
  id: string;
  employee_id: string;
  employee_name?: string;
  month_year: string;
  basic_salary_usd: number;
  transportation_allowance_usd: number;
  living_allowance_usd: number;
  bonus_usd: number;
  gross_salary_usd: number;
  nssf_deduction_usd: number;
  tax_deduction_usd: number;
  other_deductions_usd: number;
  net_salary_usd: number;
  currency: string;
  status: 'Draft' | 'Approved' | 'Paid';
  payment_date?: string;
  notes?: string;
}

export interface LebanonLeave {
  id: string;
  employee_id: string;
  employee_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
}

export interface LebanonApproval {
  id: string;
  title: string;
  request_type: 'Contract' | 'Payroll' | 'Leave' | 'Expense' | 'Other';
  target_id?: string;
  requested_by: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  approved_by?: string;
  approved_at?: string;
}

export const LebanonRegionalView: React.FC = () => {
  const { theme, language, t, currentUser } = useApp();
  const isDark = theme === 'dark';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'contracts' | 'payroll' | 'leaves' | 'approvals' | 'access'>('overview');

  // Office & Stats
  const [officeData, setOfficeData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data lists
  const [employees, setEmployees] = useState<LebanonEmployee[]>([]);
  const [contracts, setContracts] = useState<LebanonContract[]>([]);
  const [payroll, setPayroll] = useState<LebanonPayroll[]>([]);
  const [leaves, setLeaves] = useState<LebanonLeave[]>([]);
  const [approvals, setApprovals] = useState<LebanonApproval[]>([]);

  // Search & Filters
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  
  // Modals
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<LebanonEmployee | null>(null);
  const [officeForm, setOfficeForm] = useState({
    name: 'مكتب بيروت - لبنان',
    name_en: 'Beirut Regional Office - Lebanon',
    city: 'Beirut (Downtown)',
    country: 'Lebanon',
    address: 'Downtown Beirut, Banking District, Building 4',
    phone: '+961 1 987654',
    email: 'beirut.office@vitaslebanon.com',
    currency: 'USD ($)'
  });
  const [empForm, setEmpForm] = useState({
    name: '',
    name_en: '',
    email: '',
    phone: '',
    badge_no: '',
    waid: '',
    department: 'الإدارة الإقليمية',
    job_title: 'مدير إقليمي / مشرف',
    job_title_en: 'Regional Manager / Supervisor',
    basic_salary: 3500,
    contract_type: 'عقد دوام كامل',
    is_supervisor: true,
    can_supervise_iraq: true,
    social_security_nssf: '',
    tax_id: '',
    address: 'بيروت - الحمرا',
    status: 'Active' as const
  });

  // Role Access Management State
  const [adminRoles, setAdminRoles] = useState({
    hrDirector: 'مدير الموارد البشرية العام (HR Director) - يرى مكاتب العراق ولبنان',
    iraqAdmin: 'آدمن العراق (Iraq Admin) - يرى مكاتب العراق فقط',
    lebanonAdmin: 'آدمن لبنان (Lebanon Admin) - يرى مكتب لبنان فقط'
  });

  // Helper Translation Functions for complete bilingual support
  const getEmpName = (emp: { name: string; name_en?: string }) => {
    if (language === 'en') {
      return {
        primary: emp.name_en || emp.name,
        secondary: emp.name_en && emp.name_en !== emp.name ? emp.name : undefined
      };
    }
    return {
      primary: emp.name,
      secondary: emp.name_en && emp.name_en !== emp.name ? emp.name_en : undefined
    };
  };

  const getJobTitle = (title?: string, titleEn?: string) => {
    if (!title && !titleEn) return '-';
    if (language === 'en') {
      if (titleEn) return titleEn;
      if (title?.includes('مدير الموارد البشرية')) return 'HR Director';
      if (title?.includes('مدير العمليات الإقليمي')) return 'Regional Operations Director / General Supervisor';
      if (title?.includes('مدير إقليمي')) return 'Regional Manager / Supervisor';
      if (title?.includes('موظف إقليمي')) return 'Regional Staff';
      if (title?.includes('مدير عام')) return 'General Manager';
      if (title?.includes('مشرف')) return 'Supervisor';
      if (title?.includes('محاسب')) return 'Accountant';
      return title;
    }
    return title || titleEn || '-';
  };

  const getDept = (dept?: string) => {
    if (!dept) return '-';
    if (language === 'en') {
      if (dept.includes('الإدارة الإقليمية')) return 'Regional Management';
      if (dept.includes('العمليات')) return 'Regional Operations';
      if (dept.includes('الموارد البشرية')) return 'Human Resources';
      if (dept.includes('المالية')) return 'Finance & Accounts';
      if (dept.includes('تكنولوجيا')) return 'Information Technology';
      return dept;
    }
    return dept;
  };

  const getContractType = (type?: string) => {
    if (!type) return '-';
    if (language === 'en') {
      if (type.includes('دوام كامل')) return 'Full-time Contract';
      if (type.includes('محدد المدة')) return 'Fixed-term Contract';
      if (type.includes('استشاري')) return 'Consultancy Contract';
      if (type.includes('جزئي')) return 'Part-time Contract';
      return type;
    }
    return type;
  };

  const getStatusText = (status?: string) => {
    if (!status) return '-';
    if (language === 'ar') {
      switch (status) {
        case 'Active': return 'نشط';
        case 'Draft': return 'مسودة';
        case 'Approved': return 'معتمد';
        case 'Paid': return 'مدفوع';
        case 'Pending': return 'معلق';
        case 'Rejected': return 'مرفوض';
        case 'Expired': return 'منتهي';
        case 'Terminated': return 'منهي';
        default: return status;
      }
    }
    return status;
  };

  const getLeaveType = (type?: string) => {
    if (!type) return '-';
    if (language === 'en') {
      if (type.includes('سنوية')) return 'Annual Leave';
      if (type.includes('مرضية')) return 'Sick Leave';
      if (type.includes('طارئة')) return 'Emergency Leave';
      if (type.includes('غير مدفوعة')) return 'Unpaid Leave';
      return type;
    }
    return type;
  };

  // Fetch all module data
  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, empRes, ctrRes, payRes, lvRes, appRes] = await Promise.all([
        fetch('/api/regional/lebanon/overview').then(r => r.json()).catch(() => null),
        fetch('/api/regional/lebanon/employees').then(r => r.json()).catch(() => []),
        fetch('/api/regional/lebanon/contracts').then(r => r.json()).catch(() => []),
        fetch('/api/regional/lebanon/payroll').then(r => r.json()).catch(() => []),
        fetch('/api/regional/lebanon/leaves').then(r => r.json()).catch(() => []),
        fetch('/api/regional/lebanon/approvals').then(r => r.json()).catch(() => [])
      ]);

      if (ovRes) {
        setOfficeData(ovRes.office);
        setStats(ovRes.stats);
      }
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setContracts(Array.isArray(ctrRes) ? ctrRes : []);
      setPayroll(Array.isArray(payRes) ? payRes : []);
      setLeaves(Array.isArray(lvRes) ? lvRes : []);
      setApprovals(Array.isArray(appRes) ? appRes : []);
    } catch (e) {
      console.error('Failed to load Lebanon regional data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save / Update Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...empForm,
        id: editingEmp ? editingEmp.id : undefined,
        employee_id: editingEmp ? editingEmp.employee_id : undefined
      };

      const url = editingEmp 
        ? `/api/regional/lebanon/employees/${editingEmp.id}`
        : '/api/regional/lebanon/employees';
      const method = editingEmp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEmpModal(false);
        setEditingEmp(null);
        await loadData();
        alert(language === 'ar' ? 'تم حفظ بيانات الموظف بنجاح' : 'Employee saved successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save employee');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleEditEmployee = (emp: LebanonEmployee) => {
    setEditingEmp(emp);
    setEmpForm({
      name: emp.name || '',
      name_en: emp.name_en || '',
      email: emp.email || '',
      phone: emp.phone || '',
      badge_no: emp.badge_no || '',
      waid: emp.waid || '',
      department: emp.department || 'الإدارة الإقليمية',
      job_title: emp.job_title || 'موظف إقليمي',
      job_title_en: emp.job_title_en || 'Regional Staff',
      basic_salary: Number(emp.basic_salary) || 0,
      contract_type: emp.contract_type || 'عقد دوام كامل',
      is_supervisor: Boolean(emp.is_supervisor),
      can_supervise_iraq: Boolean(emp.can_supervise_iraq),
      social_security_nssf: emp.social_security_nssf || '',
      tax_id: emp.tax_id || '',
      address: emp.address || '',
      status: emp.status || 'Active'
    });
    setShowEmpModal(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?')) return;
    try {
      const res = await fetch(`/api/regional/lebanon/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Office Details
  const handleSaveOfficeInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/regional/lebanon/office', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(officeForm)
      });
      if (res.ok) {
        setShowOfficeModal(false);
        await loadData();
        alert(language === 'ar' ? 'تم تحديث بيانات المكتب بنجاح!' : 'Office details updated successfully!');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || (language === 'ar' ? 'فشل تحديث بيانات المكتب' : 'Failed to update office info'));
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const q = empSearchQuery.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.name_en && emp.name_en.toLowerCase().includes(q)) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(q)) ||
      (emp.job_title && emp.job_title.toLowerCase().includes(q)) ||
      (emp.waid && emp.waid.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`min-h-screen p-4 sm:p-6 transition-colors duration-200 ${
      isDark ? 'bg-[#06080d] text-slate-100' : 'bg-[#f4f7fb] text-slate-900'
    }`}>
      {/* Header Banner */}
      <div className={`p-5 rounded-3xl border mb-6 relative overflow-hidden backdrop-blur-md shadow-xl ${
        isDark ? 'bg-gradient-to-r from-[#0d1527] to-[#121e36] border-white/10' : 'bg-gradient-to-r from-white to-slate-50 border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-3xl shadow-inner">
              🇱🇧
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  <span>{t('المكتب الإقليمي (لبنان - بيروت)', 'Regional Office (Lebanon - Beirut)')}</span>
                </h1>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-600 !text-white border border-teal-500/40 font-mono shadow-sm"
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                >
                  USD Module
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t(
                  'إدارة مكتب بيروت الخارجي: الموظفين، عقود العمل، مسير رواتب USD، الحضور والموافقات مع إمكانية الإشراف على موظفي العراق.',
                  'Beirut Regional Office Management: Staff, USD Payroll, Contracts, Attendance & Iraq Supervision linkage.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 bg-teal-600 !text-white border-teal-500/40 shadow-sm"
              style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
            >
              <span className="material-symbols-outlined text-sm !text-white" style={{ color: '#ffffff' }}>shield_person</span>
              <span style={{ color: '#ffffff' }}>{t('صلاحية الإدارة العليا: وصول كامل', 'HR Director: Full Dual-Country Access')}</span>
            </span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="text-[11px] text-slate-400">{t('إجمالي موظفي لبنان', 'Lebanon Staff')}</div>
            <div className="text-lg font-bold font-mono text-teal-400 mt-0.5">{stats?.totalEmployees ?? employees.length}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="text-[11px] text-slate-400">{t('مشرفون على العراق', 'Cross-Border Supervisors')}</div>
            <div className="text-lg font-bold font-mono text-teal-400 mt-0.5">
              {employees.filter(e => e.is_supervisor || e.can_supervise_iraq).length}
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="text-[11px] text-slate-400">{t('عقود سارية', 'Active Contracts')}</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{contracts.filter(c => c.status === 'Active').length}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="text-[11px] text-slate-400">{t('كتلة الرواتب (USD)', 'Total Monthly USD')}</div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
              ${stats?.totalSalariesUsd?.toLocaleString() || '7,300'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 select-none no-scrollbar">
        {[
          { id: 'overview', label: t('نظرة عامة والمكتب', 'Office Overview'), icon: 'location_city' },
          { id: 'employees', label: t('دليل الموظفين', 'Employees Directory'), icon: 'group' },
          { id: 'contracts', label: t('عقود العمل', 'Contracts'), icon: 'history_edu' },
          { id: 'payroll', label: t('مسير الرواتب (USD)', 'Payroll (USD)'), icon: 'payments' },
          { id: 'leaves', label: t('الحضور والإجازات', 'Attendance & Leaves'), icon: 'event_available' },
          { id: 'approvals', label: t('مسار الاعتمادات', 'Approvals Workflow'), icon: 'task_alt' },
          { id: 'access', label: t('صلاحيات المدراء', 'Admin Roles Access'), icon: 'admin_panel_settings' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? (isDark ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25 border border-teal-500/40' : 'bg-teal-600 text-white shadow-md')
                : (isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200')
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OFFICE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className={`md:col-span-2 p-5 rounded-3xl border ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-teal-400">
                <span className="material-symbols-outlined text-lg">pin_drop</span>
                <span>{t('معلومات المكتب الإقليمي - بيروت', 'Beirut Regional Office Information')}</span>
              </h3>
              <button
                onClick={() => {
                  setOfficeForm({
                    name: officeData?.name || 'مكتب بيروت - لبنان',
                    name_en: officeData?.name_en || 'Beirut Regional Office - Lebanon',
                    city: officeData?.city || 'Beirut (Downtown)',
                    country: officeData?.country || 'Lebanon',
                    address: officeData?.address || 'Downtown Beirut, Banking District, Building 4',
                    phone: officeData?.phone || '+961 1 987654',
                    email: officeData?.email || 'beirut.office@vitaslebanon.com',
                    currency: officeData?.currency || 'USD ($)'
                  });
                  setShowOfficeModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-teal-500/40"
                style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                title={t('تعديل معلومات المكتب', 'Edit Office Info')}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: '#ffffff' }}>edit</span>
                <span style={{ color: '#ffffff' }}>{t('تعديل بيانات المكتب', 'Edit Office')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">{t('اسم المكتب (عربي):', 'Office Name (AR):')}</span>
                <p className="font-bold">{officeData?.name || 'مكتب بيروت - لبنان'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">{t('اسم المكتب (إنجليزي):', 'Office Name (EN):')}</span>
                <p className="font-bold">{officeData?.name_en || 'Beirut Regional Office - Lebanon'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">{t('الدولة والمدينة:', 'Country & City:')}</span>
                <p className="font-bold">
                  {language === 'en' 
                    ? `${officeData?.country || 'Lebanon'} / ${officeData?.city || 'Beirut (Downtown)'}`
                    : `${officeData?.country === 'Lebanon' ? 'لبنان' : (officeData?.country || 'لبنان')} / ${officeData?.city === 'Beirut (Downtown)' ? 'بيروت (وسط المدينة)' : (officeData?.city || 'بيروت')}`
                  }
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">{t('عملة التشغيل:', 'Operating Currency:')}</span>
                <p className="font-bold font-mono text-emerald-400">{officeData?.currency || 'USD ($)'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">{t('العنوان التفصيلي:', 'Address:')}</span>
                <p className="font-bold">{officeData?.address || 'Downtown Beirut, Banking District, Building 4'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">{t('الهاتف والبريد:', 'Phone & Email:')}</span>
                <p className="font-bold font-mono">{officeData?.phone || '+961 1 987654'} | {officeData?.email || 'beirut.office@vitaslebanon.com'}</p>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs">
              <div className="font-bold text-teal-300 flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-sm">hub</span>
                <span>{t('خاصية الإشراف المتبادل مع العراق (Cross-Border Supervision)', 'Cross-Border Supervision Feature')}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {t(
                  'الموظفون المسجلون في هذا المكتب ومصنفون كمشرفين (Supervisors) يتاح اختيارهم كمسؤولين مباشرين (Direct Managers) للموظفين في العراق، ويظهرون على هيكلية المؤسسة (Organizational Diagram) بإطار مميز ومغاير مع شارة دولة لبنان.',
                  'Lebanon supervisors can be selected as direct managers for Iraq staff and appear in the Org Chart with a distinct glowing border and Lebanese badge.'
                )}
              </p>
            </div>
          </div>

          <div className={`p-5 rounded-3xl border space-y-4 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-sm text-teal-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">supervisor_account</span>
              <span>{t('المشرفون الإقليميون على العراق', 'Supervisors for Iraq')}</span>
            </h3>

            {employees.filter(e => e.is_supervisor || e.can_supervise_iraq).map(sup => {
              const nameInfo = getEmpName(sup);
              return (
                <div key={sup.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-100">{nameInfo.primary}</div>
                    <div className="text-[11px] text-slate-400">
                      {getJobTitle(sup.job_title, sup.job_title_en)}
                      {nameInfo.secondary && ` • ${nameInfo.secondary}`}
                    </div>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
                    style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                  >
                    {t('مشرف معتمد', 'Supervisor')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LEBANON EMPLOYEES DIRECTORY (Identical to Iraq Table) */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                value={empSearchQuery}
                onChange={e => setEmpSearchQuery(e.target.value)}
                placeholder={t('بحث بالاسم، الكود، WAID، المنصب...', 'Search by Name, Code, WAID, Position...')}
                className={`w-full pr-10 pl-4 py-2 text-xs rounded-xl border outline-none font-bold ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-600'
                }`}
              />
            </div>

            <button
              onClick={() => {
                setEditingEmp(null);
                setEmpForm({
                  name: '',
                  name_en: '',
                  email: '',
                  phone: '',
                  badge_no: '',
                  waid: '',
                  department: 'الإدارة الإقليمية',
                  job_title: 'موظف إقليمي',
                  job_title_en: 'Regional Staff',
                  basic_salary: 3000,
                  contract_type: 'عقد دوام كامل',
                  is_supervisor: false,
                  can_supervise_iraq: false,
                  social_security_nssf: '',
                  tax_id: '',
                  address: 'بيروت',
                  status: 'Active'
                });
                setShowEmpModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/25 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>{t('إضافة موظف في مكتب لبنان', 'Add Lebanon Employee')}</span>
            </button>
          </div>

          {/* Table */}
          <div className={`overflow-x-auto rounded-2xl border ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse`}>
              <thead className={`border-b select-none ${
                isDark ? 'bg-[#06080d] text-slate-300 border-white/10' : 'bg-[#e2e8f0] text-slate-900 border-slate-300 font-bold'
              }`}>
                <tr>
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-3">{t('كود الموظف', 'Emp ID')}</th>
                  <th className="py-3 px-3 text-center">{t('معرف الحوافز (WAID)', 'WAID')}</th>
                  <th className="py-3 px-4">{t('الموظف', 'Employee')}</th>
                  <th className="py-3 px-3">{t('القسم والمنصب', 'Dept & Position')}</th>
                  <th className="py-3 px-3 text-center">{t('سوبرفايزر للعراق', 'Supervises Iraq')}</th>
                  <th className="py-3 px-3 text-center">{t('الراتب الأساسي', 'Basic Salary')}</th>
                  <th className="py-3 px-3 text-center">{t('الحالة', 'Status')}</th>
                  <th className="py-3 px-3 text-center">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-teal-400">{emp.employee_id}</td>
                    <td className="py-3 px-3 text-center font-mono">
                      {emp.waid ? (
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/25 font-bold">
                          {emp.waid}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const nameInfo = getEmpName(emp);
                        return (
                          <div>
                            <div className="font-bold text-slate-100">{nameInfo.primary}</div>
                            {nameInfo.secondary && (
                              <div className="text-[11px] text-slate-400 font-sans">{nameInfo.secondary}</div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold">{getJobTitle(emp.job_title, emp.job_title_en)}</div>
                      <div className="text-[11px] text-slate-400">{getDept(emp.department)}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {emp.is_supervisor || emp.can_supervise_iraq ? (
                        <span 
                          className="badge-teal-white inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] shadow-sm select-none"
                          style={{ backgroundColor: '#0d9488', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                        >
                          <span 
                            className="lb-tag text-[10px] font-black px-1.5 py-0.5 rounded tracking-wider" 
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                          >
                            LB
                          </span>
                          <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: 700 }}>
                            {language === 'en' ? 'Yes (Supervisor)' : 'نعم (مشرف معتمد)'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                      ${Number(emp.basic_salary).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span 
                        className="badge-teal-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm inline-block"
                        style={{ backgroundColor: '#0d9488', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                      >
                        <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                          {getStatusText(emp.status)}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditEmployee(emp)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:scale-125 transition-all cursor-pointer"
                          title={t('تعديل', 'Edit')}
                        >
                          <span className="material-symbols-outlined text-lg">edit_note</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:scale-125 transition-all cursor-pointer"
                          title={t('حذف', 'Delete')}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-teal-400 flex items-center gap-2">
              <span className="material-symbols-outlined">history_edu</span>
              <span>{t('عقود موظفي مكتب لبنان (Contracts in USD)', 'Lebanon Staff Contracts')}</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse`}>
              <thead className="border-b border-white/10 text-slate-400 font-bold">
                <tr>
                  <th className="py-2.5 px-3">{t('رقم العقد', 'Contract Ref')}</th>
                  <th className="py-2.5 px-3">{t('الموظف', 'Employee')}</th>
                  <th className="py-2.5 px-3">{t('نوع العقد', 'Contract Type')}</th>
                  <th className="py-2.5 px-3 text-center">{t('الراتب الأساسي (USD)', 'Basic Salary (USD)')}</th>
                  <th className="py-2.5 px-3 text-center">{t('بدل النقل', 'Transport Allowance')}</th>
                  <th className="py-2.5 px-3 text-center">{t('بدل غلاء المعيشة', 'Cost of Living')}</th>
                  <th className="py-2.5 px-3 text-center">{t('تاريخ البدء', 'Start Date')}</th>
                  <th className="py-2.5 px-3 text-center">{t('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {contracts.map(c => {
                  const matchedEmp = employees.find(e => e.employee_id === c.employee_id || e.id === c.employee_id);
                  const empDisplay = matchedEmp ? getEmpName(matchedEmp).primary : (c.employee_name || c.employee_id);
                  return (
                    <tr key={c.id}>
                      <td className="py-3 px-3 font-mono font-bold text-teal-400">{c.contract_ref}</td>
                      <td className="py-3 px-3 font-bold">{empDisplay}</td>
                      <td className="py-3 px-3">{getContractType(c.contract_type)}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">${Number(c.basic_salary_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-mono">${Number(c.transportation_allowance_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-mono">${Number(c.living_allowance_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-mono">{c.start_date ? c.start_date.split('T')[0] : '-'}</td>
                      <td className="py-3 px-3 text-center">
                        <span 
                          className="badge-teal-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm inline-block"
                          style={{ backgroundColor: '#0d9488', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                        >
                          <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                            {getStatusText(c.status)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYROLL (Tailored Columns for Lebanon USD) */}
      {activeTab === 'payroll' && (
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <span className="material-symbols-outlined">payments</span>
                <span>{t('مسير رواتب موظفي لبنان المخصص (Lebanon Custom USD Payroll)', 'Lebanon Payroll')}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('جدول مالي مخصص بالدولار يشمل بدلات النقل والمعيشة واستقطاعات الضمان NSSF الخاصة بلبنان', 'Custom USD payroll with Lebanon allowances and NSSF deductions')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse`}>
              <thead className="border-b border-white/10 text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-3">{t('الشهر', 'Month')}</th>
                  <th className="py-3 px-3">{t('الموظف', 'Employee')}</th>
                  <th className="py-3 px-3 text-center">{t('الأساسي ($)', 'Basic ($)')}</th>
                  <th className="py-3 px-3 text-center">{t('بدل النقل ($)', 'Transport ($)')}</th>
                  <th className="py-3 px-3 text-center">{t('غلاء معيشة ($)', 'Living Allowance ($)')}</th>
                  <th className="py-3 px-3 text-center">{t('مكافأة ($)', 'Bonus ($)')}</th>
                  <th className="py-3 px-3 text-center text-cyan-300">{t('الإجمالي ($)', 'Gross ($)')}</th>
                  <th className="py-3 px-3 text-center text-rose-300">{t('ضمان NSSF ($)', 'NSSF ($)')}</th>
                  <th className="py-3 px-3 text-center text-rose-300">{t('ضريبة ($)', 'Tax ($)')}</th>
                  <th className="py-3 px-3 text-center text-emerald-400 font-bold">{t('الصافي المستحق ($)', 'Net Salary ($)')}</th>
                  <th className="py-3 px-3 text-center">{t('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {payroll.map(p => {
                  const matchedEmp = employees.find(e => e.employee_id === p.employee_id || e.id === p.employee_id);
                  const empDisplay = matchedEmp ? getEmpName(matchedEmp).primary : (p.employee_name || p.employee_id);
                  return (
                    <tr key={p.id}>
                      <td className="py-3 px-3 font-bold text-teal-400">{p.month_year}</td>
                      <td className="py-3 px-3 font-sans font-bold text-slate-100">{empDisplay}</td>
                      <td className="py-3 px-3 text-center">${Number(p.basic_salary_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">${Number(p.transportation_allowance_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">${Number(p.living_allowance_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">${Number(p.bonus_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-cyan-400">${Number(p.gross_salary_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center text-rose-400">-${Number(p.nssf_deduction_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center text-rose-400">-${Number(p.tax_deduction_usd).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400 text-sm">
                        ${Number(p.net_salary_usd).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span 
                          className="badge-teal-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm inline-block"
                          style={{ backgroundColor: '#0d9488', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                        >
                          <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                            {getStatusText(p.status)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LEAVES & ATTENDANCE */}
      {activeTab === 'leaves' && (
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
          <h3 className="font-bold text-sm text-cyan-400 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">event_available</span>
            <span>{t('الحضور والإجازات لمكتب بيروت', 'Beirut Leaves & Attendance')}</span>
          </h3>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse`}>
              <thead className="border-b border-white/10 text-slate-400 font-bold">
                <tr>
                  <th className="py-2.5 px-3">{t('الموظف', 'Employee')}</th>
                  <th className="py-2.5 px-3">{t('نوع الإجازة', 'Leave Type')}</th>
                  <th className="py-2.5 px-3 text-center">{t('تاريخ البدء', 'Start Date')}</th>
                  <th className="py-2.5 px-3 text-center">{t('تاريخ الانتهاء', 'End Date')}</th>
                  <th className="py-2.5 px-3 text-center">{t('الأيام', 'Days')}</th>
                  <th className="py-2.5 px-3">{t('السبب', 'Reason')}</th>
                  <th className="py-2.5 px-3 text-center">{t('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      {t('لا توجد طلبات إجازة حالية', 'No leave requests recorded yet')}
                    </td>
                  </tr>
                ) : (
                  leaves.map(lv => {
                    const matchedEmp = employees.find(e => e.employee_id === lv.employee_id || e.id === lv.employee_id);
                    const empDisplay = matchedEmp ? getEmpName(matchedEmp).primary : (lv.employee_name || lv.employee_id);
                    return (
                      <tr key={lv.id}>
                        <td className="py-3 px-3 font-bold">{empDisplay}</td>
                        <td className="py-3 px-3">{getLeaveType(lv.leave_type)}</td>
                        <td className="py-3 px-3 text-center font-mono">{lv.start_date}</td>
                        <td className="py-3 px-3 text-center font-mono">{lv.end_date}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold">{lv.days_count}</td>
                        <td className="py-3 px-3 text-slate-400">{lv.reason || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <span 
                            className="badge-teal-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm inline-block"
                            style={{ backgroundColor: '#0d9488', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                          >
                            <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                              {getStatusText(lv.status)}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: APPROVALS WORKFLOW */}
      {activeTab === 'approvals' && (
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
          <h3 className="font-bold text-sm text-purple-400 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">task_alt</span>
            <span>{t('عمليات الإرسال وسجل الموافقات (Approvals Workflow)', 'Approvals Workflow')}</span>
          </h3>

          <div className="space-y-3">
            {approvals.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {t('لا توجد معاملات معلقة للموافقة', 'No pending approvals')}
              </div>
            ) : (
              approvals.map(app => (
                <div key={app.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-100">{app.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {app.request_type} • {t('طالب المعاملة:', 'Requested by:')} {app.requested_by}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="badge-teal-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm inline-block"
                      style={{ backgroundColor: '#0d9488', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    >
                      <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                        {getStatusText(app.status)}
                      </span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: ADMIN ROLES & SCOPING (Requirements Alignment) */}
      {activeTab === 'access' && (
        <div className={`p-6 rounded-3xl border space-y-5 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
          <div>
            <h3 className="font-bold text-sm text-teal-400 flex items-center gap-2">
              <span className="material-symbols-outlined">admin_panel_settings</span>
              <span>{t('إدارة صلاحيات ورؤية مدراء الدولتين (Country Scoping Permissions)', 'Admin Country Scoping')}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t(
                'وفق المتطلبات: مدير الموارد البشرية العام فقط له صلاحية رؤية مكاتب وموظفي كلا الدولتين (العراق ولبنان). وله الصلاحية بتعيين وتخصيص الآدمن بحيث يقتصر نطاق كل آدمن على دولته.',
                'Per requirements: Only HR Director has full visibility to both Iraq & Lebanon. Iraq Admin is restricted to Iraq, and Lebanon Admin is restricted to Lebanon.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* HR Director */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-teal-500/10 to-transparent border border-teal-500/30 space-y-2">
              <div className="font-bold text-teal-300 flex items-center gap-1.5 text-sm">
                <span>👑</span>
                <span>{t('مدير الموارد البشرية (HR Director)', 'HR Director (Supreme Access)')}</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {t(
                  'الصلاحية العليا والمطلقة لرؤية مكاتب كلا الدولتين، التبديل بينهما، وتعيين صلاحيات الآدمن لكل دولة.',
                  'Supreme full visibility to inspect both country offices, switch seamlessly, and assign admin scopes.'
                )}
              </p>
              <div className="pt-2">
                <span 
                  className="px-2.5 py-1 rounded-lg font-bold text-[10px] inline-block shadow-sm"
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                >
                  {t('العراق 🇮🇶 + لبنان 🇱🇧 (وصول كامل)', 'Iraq 🇮🇶 + Lebanon 🇱🇧 (Full Access)')}
                </span>
              </div>
            </div>

            {/* Iraq Admin */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="font-bold text-teal-300 flex items-center gap-1.5 text-sm">
                <span>🇮🇶</span>
                <span>{t('آدمن العراق (Iraq Admin)', 'Iraq Country Admin')}</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {t(
                  'يقتصر ظهوره وعمله على الفروع والمكاتب والموظفين داخل جمهورية العراق فقط.',
                  'Restricted strictly to branches, offices, and personnel located inside Iraq.'
                )}
              </p>
              <div className="pt-2">
                <span 
                  className="px-2.5 py-1 rounded-lg font-bold text-[10px] inline-block shadow-sm"
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                >
                  {t('مكاتب العراق فقط', 'Iraq Offices Only')}
                </span>
              </div>
            </div>

            {/* Lebanon Admin */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="font-bold text-teal-400 flex items-center gap-1.5 text-sm">
                <span>🇱🇧</span>
                <span>{t('آدمن لبنان (Lebanon Admin)', 'Lebanon Country Admin')}</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {t(
                  'يقتصر ظهوره وعمله على مكتب وموظفي لبنان فقط دون الوصول إلى مكاتب العراق.',
                  'Restricted strictly to Lebanon office staff and operations without access to Iraq data.'
                )}
              </p>
              <div className="pt-2">
                <span 
                  className="px-2.5 py-1 rounded-lg font-bold text-[10px] inline-block shadow-sm"
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                >
                  {t('مكتب لبنان فقط', 'Lebanon Office Only')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="font-bold text-base text-teal-400 flex items-center gap-2">
                <span className="material-symbols-outlined">person</span>
                <span>{editingEmp ? t('تعديل موظف مكتب لبنان', 'Edit Lebanon Employee') : t('إضافة موظف جديد في مكتب لبنان', 'Add Lebanon Employee')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEmpModal(false)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('الاسم الكامل (عربي) *', 'Full Name (Arabic) *')}</label>
                  <input
                    type="text"
                    required
                    value={empForm.name}
                    onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('الاسم الكامل (إنجليزي)', 'Full Name (English)')}</label>
                  <input
                    type="text"
                    value={empForm.name_en}
                    onChange={e => setEmpForm({ ...empForm, name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('رقم الهاتف (لبنان)', 'Phone Number (Lebanon)')}</label>
                  <input
                    type="text"
                    value={empForm.phone}
                    onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                    placeholder="+961 70 000000"
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('معرف الحوافز (WAID)', 'WAID Identifier')}</label>
                  <input
                    type="text"
                    value={empForm.waid}
                    onChange={e => setEmpForm({ ...empForm, waid: e.target.value })}
                    placeholder="WA-LBN01"
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('المسمى الوظيفي', 'Job Title')}</label>
                  <input
                    type="text"
                    value={empForm.job_title}
                    onChange={e => setEmpForm({ ...empForm, job_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('الراتب الأساسي (USD $)', 'Basic Salary (USD $)')}</label>
                  <input
                    type="number"
                    value={empForm.basic_salary}
                    onChange={e => setEmpForm({ ...empForm, basic_salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-300">
                  <input
                    type="checkbox"
                    checked={empForm.can_supervise_iraq}
                    onChange={e => setEmpForm({ ...empForm, can_supervise_iraq: e.target.checked, is_supervisor: e.target.checked })}
                    className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                  />
                  <span>{t('يمكن لهذا الموظف أن يكون مشرفاً/سوبرفايزر لموظفي العراق', 'Can supervise staff in Iraq (Cross-Border Supervisor)')}</span>
                </label>
                <p className="text-[11px] text-slate-300">
                  {t(
                    'عند تفعيل هذا الخيار، سيظهر هذا الموظف في قائمة المسؤول المباشر للموظفين في العراق، وسيتم إبرازه في هيكل المؤسسة (Org Chart) بإطار ذهبي مغاير.',
                    'When enabled, this supervisor will be eligible as a Direct Manager for Iraq employees and highlighted in the Org Chart.'
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer font-bold"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer transition-all shadow-md"
                >
                  {t('حفظ البيانات', 'Save Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Office Info Modal */}
      {showOfficeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="font-bold text-base text-teal-400 flex items-center gap-2">
                <span className="material-symbols-outlined">edit_location_alt</span>
                <span>{t('تعديل بيانات المكتب الإقليمي - بيروت', 'Edit Beirut Regional Office Info')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOfficeModal(false)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveOfficeInfo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('اسم المكتب (عربي) *', 'Office Name (Arabic) *')}</label>
                  <input
                    type="text"
                    required
                    value={officeForm.name}
                    onChange={e => setOfficeForm({ ...officeForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('اسم المكتب (إنجليزي)', 'Office Name (English)')}</label>
                  <input
                    type="text"
                    value={officeForm.name_en}
                    onChange={e => setOfficeForm({ ...officeForm, name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('الدولة', 'Country')}</label>
                  <input
                    type="text"
                    value={officeForm.country}
                    onChange={e => setOfficeForm({ ...officeForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('المدينة / المنطقة', 'City / District')}</label>
                  <input
                    type="text"
                    value={officeForm.city}
                    onChange={e => setOfficeForm({ ...officeForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('رقم الهاتف', 'Phone Number')}</label>
                  <input
                    type="text"
                    value={officeForm.phone}
                    onChange={e => setOfficeForm({ ...officeForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('البريد الإلكتروني', 'Email Address')}</label>
                  <input
                    type="email"
                    value={officeForm.email}
                    onChange={e => setOfficeForm({ ...officeForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">{t('العنوان التفصيلي', 'Detailed Address')}</label>
                  <input
                    type="text"
                    value={officeForm.address}
                    onChange={e => setOfficeForm({ ...officeForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{t('عملة التشغيل', 'Operating Currency')}</label>
                  <input
                    type="text"
                    value={officeForm.currency}
                    onChange={e => setOfficeForm({ ...officeForm, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/20 border border-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOfficeModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer font-bold"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer transition-all shadow-md"
                >
                  {t('حفظ التعديلات', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LebanonRegionalView;
