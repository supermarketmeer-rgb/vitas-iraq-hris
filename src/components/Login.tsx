import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import vitasLogo from '../../assets/VitasLogo.jpeg';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, theme, setCurrentUserRole, setCurrentUser, employees } = useApp();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanUser = username.trim().toLowerCase();
      if (!cleanUser) {
        setError(language === 'ar' ? 'يرجى إدخال اسم المستخدم' : 'Please enter username');
        setIsLoading(false);
        return;
      }

      // 1. Check for Super Admin
      if (cleanUser === 'admin') {
        const superAdmin: UserProfile = {
          id: '0',
          name: 'مدير النظام (Super Admin)',
          email: 'admin@vitasiraq.iq',
          role: 'Super Admin',
          avatar: '',
          department: 'الإدارة العليا',
          employeeId: 'admin',
          branch: 'المقر الرئيسي',
          can_manage_employees: 1,
          can_manage_finance: 1,
          can_manage_recruitment: 1,
          can_manage_settings: 1,
          can_manage_users: 1
        };
        
        localStorage.setItem('vitas_current_user', JSON.stringify(superAdmin));
        localStorage.setItem('vitas_user_role', 'Super Admin');
        setCurrentUserRole('Super Admin');
        setCurrentUser(superAdmin);
        console.log('Login successful - Super Admin', superAdmin);
        setTimeout(() => navigate('/'), 100);
        return;
      }

      // 2. Check for HR Manager
      if (cleanUser === 'hrmanager' || cleanUser === 'hr') {
        const hrManager: UserProfile = {
          id: '1',
          name: 'مدير الموارد البشرية',
          email: 'hr@vitasiraq.iq',
          role: 'HR Manager',
          avatar: '',
          department: 'الموارد البشرية',
          employeeId: 'HR-001',
          branch: 'المقر الرئيسي',
          can_manage_employees: 1,
          can_manage_finance: 1,
          can_manage_recruitment: 1,
          can_manage_settings: 1,
          can_manage_users: 0
        };
        
        localStorage.setItem('vitas_current_user', JSON.stringify(hrManager));
        localStorage.setItem('vitas_user_role', 'HR Manager');
        setCurrentUserRole('HR Manager');
        setCurrentUser(hrManager);
        console.log('Login successful - HR Manager', hrManager);
        setTimeout(() => navigate('/'), 100);
        return;
      }

      // 3. Check for Department / Branch Manager
      if (cleanUser === 'manager' || cleanUser === 'deptmanager') {
        const deptManager: UserProfile = {
          id: '2',
          name: 'مدير قسم (Department Head)',
          email: 'manager@vitasiraq.iq',
          role: 'Department Head',
          avatar: '',
          department: 'قسم العمليات والائتمان',
          employeeId: 'MGR-002',
          branch: 'الإدارة العامة - بغداد',
          can_manage_employees: 0,
          can_manage_finance: 0,
          can_manage_recruitment: 0,
          can_manage_settings: 0,
          can_manage_users: 0
        };
        
        localStorage.setItem('vitas_current_user', JSON.stringify(deptManager));
        localStorage.setItem('vitas_user_role', 'Department Head');
        setCurrentUserRole('Department Head');
        setCurrentUser(deptManager);
        console.log('Login successful - Department Head', deptManager);
        setTimeout(() => navigate('/'), 100);
        return;
      }

      // 4. Check for Recruiter
      if (cleanUser === 'recruiter' || cleanUser === 'recruit' || cleanUser === 'recruitment') {
        const recruiterUser: UserProfile = {
          id: '3',
          name: 'مسؤول التوظيف والاستقطاب (Recruiter)',
          email: 'recruitment@vitasiraq.iq',
          role: 'Recruiter',
          avatar: '',
          department: 'قسم التوظيف والمواهب',
          employeeId: 'REC-003',
          branch: 'المقر الرئيسي - بغداد',
          can_manage_employees: 1,
          can_manage_finance: 0,
          can_manage_recruitment: 1,
          can_manage_settings: 0,
          can_manage_users: 0
        };
        
        localStorage.setItem('vitas_current_user', JSON.stringify(recruiterUser));
        localStorage.setItem('vitas_user_role', 'Recruiter');
        setCurrentUserRole('Recruiter');
        setCurrentUser(recruiterUser);
        console.log('Login successful - Recruiter', recruiterUser);
        setTimeout(() => navigate('/'), 100);
        return;
      }

      // 5. Check for IT Admin
      if (cleanUser === 'itadmin' || cleanUser === 'it' || cleanUser === 'sysadmin') {
        const itAdminUser: UserProfile = {
          id: '4',
          name: 'مسؤول النظم والتقنية (IT Admin)',
          email: 'it@vitasiraq.iq',
          role: 'IT Admin',
          avatar: '',
          department: 'قسم تكنولوجيا المعلومات',
          employeeId: 'IT-004',
          branch: 'المقر الرئيسي - بغداد',
          can_manage_employees: 0,
          can_manage_finance: 0,
          can_manage_recruitment: 0,
          can_manage_settings: 1,
          can_manage_users: 1
        };
        
        localStorage.setItem('vitas_current_user', JSON.stringify(itAdminUser));
        localStorage.setItem('vitas_user_role', 'IT Admin');
        setCurrentUserRole('IT Admin');
        setCurrentUser(itAdminUser);
        console.log('Login successful - IT Admin', itAdminUser);
        setTimeout(() => navigate('/'), 100);
        return;
      }

      // 4. Employee Login (Matches any employee code like v1264, VTS-1264, 1264, or any employee ID)
      const matchedEmp = employees && employees.length > 0
        ? employees.find(emp => {
            const empCode = String(emp.employeeId || emp.badgeNo || emp.id || '').toLowerCase();
            const cleanEmpCode = empCode.replace(/[^a-z0-9]/g, '');
            const cleanInput = cleanUser.replace(/[^a-z0-9]/g, '');
            const emailPart = (emp.email || '').toLowerCase().split('@')[0];

            return (
              empCode === cleanUser ||
              cleanEmpCode === cleanInput ||
              (cleanInput && cleanEmpCode.includes(cleanInput)) ||
              (cleanInput && cleanInput.includes(cleanEmpCode)) ||
              emailPart === cleanUser ||
              (emp.email && emp.email.toLowerCase() === cleanUser) ||
              (emp.fullNameEn && emp.fullNameEn.toLowerCase().includes(cleanUser)) ||
              (emp.fullNameAr && emp.fullNameAr.includes(cleanUser))
            );
          })
        : null;

      const employeeUser: UserProfile = matchedEmp ? {
        id: String(matchedEmp.id),
        name: matchedEmp.fullNameAr || matchedEmp.fullNameEn || `الموظف (${username.toUpperCase()})`,
        email: matchedEmp.email || `${cleanUser}@vitasiraq.com`,
        role: 'Employee',
        avatar: matchedEmp.photoUrl || '',
        department: matchedEmp.department || 'الموارد البشرية والشؤون الإدارية',
        employeeId: matchedEmp.employeeId || `VTS-${cleanUser.toUpperCase()}`,
        branch: matchedEmp.branch || matchedEmp.location || 'الإدارة العامة - بغداد',
        can_manage_employees: 0,
        can_manage_finance: 0,
        can_manage_recruitment: 0,
        can_manage_settings: 0,
        can_manage_users: 0,
      } : {
        id: '1264',
        name: `الموظف (${username.toUpperCase()})`,
        email: `${cleanUser}@vitasiraq.com`,
        role: 'Employee',
        avatar: '',
        department: 'الموارد البشرية والشؤون الإدارية',
        employeeId: username.toUpperCase().startsWith('VTS') ? username.toUpperCase() : `VTS-${username.toUpperCase()}`,
        branch: 'الإدارة العامة - بغداد',
        can_manage_employees: 0,
        can_manage_finance: 0,
        can_manage_recruitment: 0,
        can_manage_settings: 0,
        can_manage_users: 0,
      };

      localStorage.setItem('vitas_current_user', JSON.stringify(employeeUser));
      localStorage.setItem('vitas_user_role', 'Employee');
      setCurrentUserRole('Employee');
      setCurrentUser(employeeUser);

      console.log('Login successful - Employee', employeeUser);

      setTimeout(() => {
        navigate('/');
      }, 100);
      return;

    } catch (err) {
      setError(language === 'en' ? 'Login failed. Please try again.' : 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  // Language toggle
  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    localStorage.setItem('vitas_language', newLang);
    window.location.reload();
  };

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('vitas_theme', newTheme);
    window.location.reload();
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 text-white relative overflow-hidden ${
      // Always use dark theme for outer background regardless of isDark
      'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]'
    }`}>
      {/* Animated Orbs - Always visible since outer background is always dark */}
      <>
        <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-600 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-700 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </>

      <div className="relative z-10 w-full max-w-md">
        {/* Language & Theme Toggle */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={toggleLanguage}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              isDark 
                ? 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700 text-slate-300' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            {language === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              isDark 
                ? 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700 text-slate-300' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            {isDark ? '☀' : '🌙'}
          </button>
        </div>

        {/* Login Card */}
        <div className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl w-[calc(40vw-38px)] max-w-md ${
          isDark 
            ? 'bg-[#0a0c10] border-white/10 text-white' 
            : 'bg-[#e8ebef] border-slate-300 text-slate-900'
        }`}>
          {/* Logo */}
          <div className="text-center mb-2">
            <div className="inline-block mb-4">
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-2xl shadow-teal-500/40 animate-[logoBreathe_3s_ease-in-out_infinite] border-4 border-teal-500/30 backdrop-blur-sm">
                <img 
                  src={vitasLogo} 
                  alt="VITAS Iraq Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-teal-400' : 'text-slate-900'}`}>{t('مؤسسة فيتاس العراق', 'VITAS Iraq')}</h1>
            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-700'}`}>{t('مؤسسة الاسكان التعاونية CHF', 'Cooperative Housing Foundation CHF')}</p>
            <p className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('نظام إدارة الموارد البشرية', 'HRMS System')}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('اسم المستخدم', 'Username')}
              </label>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-lg ${isDark ? 'text-teal-400' : 'text-slate-700'}`}>person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                  style={{
                    backgroundColor: isDark ? '#0a0c10' : '#d8e0e8',
                    color: isDark ? '#ffffff' : '#000000',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1'
                  }}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                    isDark 
                      ? 'bg-[#0a0c10] border-white/15 text-white placeholder-slate-400' 
                      : 'bg-[#d8e0e8] border-slate-300 text-slate-900 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('كلمة المرور', 'Password')}
              </label>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-lg ${isDark ? 'text-teal-400' : 'text-slate-700'}`}>lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                  style={{
                    backgroundColor: isDark ? '#0a0c10' : '#d8e0e8',
                    color: isDark ? '#ffffff' : '#000000',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1'
                  }}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                    isDark 
                      ? 'bg-[#0a0c10] border-white/15 text-white placeholder-slate-400' 
                      : 'bg-[#d8e0e8] border-slate-300 text-slate-900 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-sm transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  {t('جاري تسجيل الدخول...', 'Logging in...')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  {t('تسجيل الدخول', 'Login')}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className={`mt-6 text-center text-xs ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
            <p>© 2026 {t('مؤسسة فيتاس العراق', 'VITAS Iraq')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};