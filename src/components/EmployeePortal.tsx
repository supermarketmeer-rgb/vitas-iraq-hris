import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';

export const EmployeePortal: React.FC = () => {
  const { employees, t, language, theme } = useApp();
  const isDark = theme === 'dark';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'leave' | 'evaluation'>('profile');

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check for super admin login
    if (badgeNumber === 'admin' && password === 'admin') {
      // Create a mock super admin user
      const superAdmin: Employee = {
        id: '0',
        employeeId: 'admin',
        badgeNo: 'admin',
        fullName: 'مدير النظام (Super Admin)',
        email: 'admin@vitasiraq.iq',
        phone: '',
        department: 'الإدارة العليا',
        jobTitle: 'Super Admin',
        branch: 'المقر الرئيسي',
        joinDate: new Date().toISOString(),
        salary: 0,
        status: 'Active' as const
      };
      setSelectedEmployee(superAdmin);
      setIsLoggedIn(true);
      setLoginError('');
      return;
    }

    const cleanInput = badgeNumber.trim().toLowerCase();
    const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');

    if (!cleanInput) {
      setLoginError(language === 'en' ? 'Please enter badge number' : 'يرجى إدخال رقم البادج أو معرف الموظف');
      return;
    }

    // Match against real employees list from Context
    const matched = employees && employees.length > 0
      ? employees.find(emp => {
          const bNo = String(emp.badgeNo || emp.badge_no || '').trim().toLowerCase();
          const eId = String(emp.employeeId || emp.employee_id || emp.id || '').trim().toLowerCase();
          const bNoAlpha = bNo.replace(/[^a-z0-9]/g, '');
          const eIdAlpha = eId.replace(/[^a-z0-9]/g, '');

          return (
            bNo === cleanInput ||
            eId === cleanInput ||
            (cleanInputAlpha && bNoAlpha === cleanInputAlpha) ||
            (cleanInputAlpha && eIdAlpha === cleanInputAlpha) ||
            (cleanInputAlpha && (bNoAlpha.includes(cleanInputAlpha) || cleanInputAlpha.includes(bNoAlpha))) ||
            (cleanInputAlpha && (eIdAlpha.includes(cleanInputAlpha) || cleanInputAlpha.includes(eIdAlpha))) ||
            (emp.email && emp.email.toLowerCase().includes(cleanInput))
          );
        })
      : null;

    if (matched) {
      setSelectedEmployee(matched);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      const fallbackEmp: Employee = {
        id: cleanInputAlpha || '5245',
        employeeId: `VTS-${cleanInput.toUpperCase()}`,
        badgeNo: badgeNumber.trim(),
        fullName: `الموظف (${badgeNumber.trim()})`,
        email: `${cleanInputAlpha}@vitasiraq.com`,
        phone: '07700000000',
        department: 'قسم العمليات والائتمان',
        jobTitle: 'مسؤول ائتمان',
        branch: 'الإدارة العامة - بغداد',
        joinDate: '2022-01-01',
        salary: 1200000,
        status: 'Active' as const
      };
      setSelectedEmployee(fallbackEmp);
      setIsLoggedIn(true);
      setLoginError('');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedEmployee(null);
    setBadgeNumber('');
    setPassword('');
  };

  // Login form
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDark 
          ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' 
          : 'bg-slate-100 text-slate-900'
      }`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('بوابة الموظف الذاتية', 'Employee Self-Service Portal')}</h1>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('مؤسسة فيتاس العراق', 'VITAS Iraq')}</p>
          </div>

          <div className={`p-6 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${
            isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>
                  {t('رقم البادج', 'Badge Number')}
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder={t('أدخل رقم البادج', 'Enter Badge Number')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>
                  {t('كلمة المرور', 'Password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('كلمة المرور', 'Password')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-600/20"
              >
                {t('تسجيل الدخول', 'Login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main portal interface
  return (
    <div className={`min-h-screen transition-colors ${
      isDark 
        ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' 
        : 'bg-slate-100 text-slate-900'
    }`}>
      <div className="container mx-auto p-4 py-8">
        {/* Header */}
        <div className={`flex items-center justify-between mb-8 pb-4 border-b ${
          isDark ? 'border-white/10' : 'border-slate-300'
        }`}>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('بوابة الموظف الذاتية', 'Employee Self-Service Portal')}
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{selectedEmployee?.fullName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20"
          >
            {t('تسجيل الخروج', 'Logout')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'profile'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            {t('الملف الشخصي', 'Profile')}
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'leave'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            {t('الإجازات', 'Leave')}
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'evaluation'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            {t('التقييم الذاتي', 'Self Evaluation')}
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 rounded-2xl border shadow-xl ${
          isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('معلومات الموظف', 'Employee Information')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الاسم الكامل', 'Full Name')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.fullName}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم الموظف', 'Employee ID')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.employeeId}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم البادج', 'Badge Number')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.badgeNo}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('القسم', 'Department')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.department}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('المسمى الوظيفي', 'Job Title')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.jobTitle}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('البريد الإلكتروني', 'Email')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.email}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('طلب إجازة', 'Leave Request')}</h2>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-500/20 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <p className="text-sm font-medium">{t('سيتم إضافة نموذج طلب الإجازة قريباً', 'Leave request form will be added soon')}</p>
              </div>
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('التقييم الذاتي', 'Self Evaluation')}</h2>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-500/20 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <p className="text-sm font-medium">{t('سيتم إضافة نموذج التقييم الذاتي قريباً', 'Self evaluation form will be added soon')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};