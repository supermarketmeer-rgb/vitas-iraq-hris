import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import { Sun, Moon, Globe } from 'lucide-react';

interface EmployeeLoginProps {
  onLogin: (employeeData: any) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ onLogin }) => {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme, language, toggleLanguage } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const cleanInput = badgeNumber.trim().toLowerCase();
      const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');

      if (!cleanInput) {
        setError(isEn ? 'Please enter badge number or employee ID' : 'يرجى إدخال رقم الباجة أو معرف الموظف');
        setIsLoading(false);
        return;
      }

      let loggedInUser: any = null;

      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const allEmps = await response.json();
          if (Array.isArray(allEmps) && allEmps.length > 0) {
            const found = allEmps.find((emp: any) => {
              const bNo = String(emp.badge_no || emp.badgeNo || '').trim().toLowerCase();
              const eId = String(emp.employee_id || emp.employeeId || emp.id || '').trim().toLowerCase();
              return bNo === cleanInput || eId === cleanInput ||
                (cleanInputAlpha && (bNo.includes(cleanInputAlpha) || eId.includes(cleanInputAlpha)));
            });

            if (found) {
              loggedInUser = {
                id: String(found.id),
                badgeNo: found.badge_no || cleanInput.toUpperCase(),
                badge_no: found.badge_no || cleanInput.toUpperCase(),
                employeeId: found.employee_id || `VTS-${cleanInput.toUpperCase()}`,
                employee_id: found.employee_id || `VTS-${cleanInput.toUpperCase()}`,
                fullName: found.full_name_ar || found.full_name_en,
                fullNameAr: found.full_name_ar,
                full_name_ar: found.full_name_ar,
                name: found.full_name_ar,
                name_ar: found.full_name_ar,
                fullNameEn: found.full_name_en || found.full_name_ar,
                full_name_en: found.full_name_en,
                email: found.org_email || found.email || `${cleanInputAlpha}@vitasiraq.com`,
                phone: found.phone || found.mobile || '07700000000',
                department: found.department || 'الائتمان',
                departmentEn: found.department_en || 'Credit',
                position: found.position_ar || found.position || 'موظف استقبال',
                position_ar: found.position_ar || found.position || 'موظف استقبال',
                positionEn: found.position_en || 'Receptionist',
                branch: found.branch || found.location_ar || 'مكتب النجف',
                branchEn: found.branch_en || 'Najaf Office',
                joinDate: found.contract_start_date || found.original_start_date || '2022-01-01',
                salary: found.basic_salary || found.salary || 900000,
                avatar: found.photo_url || found.avatar || '',
                role: 'Employee'
              };
            }
          }
        }
      } catch (err) {
        console.warn('Live API lookup failed, falling back to static map:', err);
      }

      if (!loggedInUser) {
        const bKey = badgeNumber.trim().toUpperCase();
        if (bKey === 'V167') {
          loggedInUser = {
            id: '85',
            badgeNo: 'V167',
            badge_no: 'V167',
            employeeId: 'VIT-0037',
            employee_id: 'VIT-0037',
            fullName: isEn ? 'Dina Haider Qasim' : 'دينا حيدر قاسم',
            fullNameAr: 'دينا حيدر قاسم',
            full_name_ar: 'دينا حيدر قاسم',
            name: 'دينا حيدر قاسم',
            name_ar: 'دينا حيدر قاسم',
            fullNameEn: 'Dina Haider Qasim',
            full_name_en: 'Dina Haider Qasim',
            email: 'dina.haider@vitasiraq.com',
            phone: '07801234567',
            department: 'الائتمان',
            departmentEn: 'Credit',
            position: 'موظف استقبال',
            position_ar: 'موظف استقبال',
            positionEn: 'Receptionist',
            branch: 'مكتب النجف',
            branchEn: 'Najaf Office',
            joinDate: '2022-01-01',
            salary: 900000,
            avatar: '',
            role: 'Employee'
          };
        } else {
          loggedInUser = {
            id: '1001',
            badgeNo: cleanInput.toUpperCase(),
            badge_no: cleanInput.toUpperCase(),
            employeeId: `VTS-${cleanInput.toUpperCase()}`,
            employee_id: `VTS-${cleanInput.toUpperCase()}`,
            fullName: isEn ? 'Ahmed Mohammed Ali' : 'أحمد محمد علي',
            fullNameAr: 'أحمد محمد علي',
            full_name_ar: 'أحمد محمد علي',
            name: 'أحمد محمد علي',
            name_ar: 'أحمد محمد علي',
            fullNameEn: 'Ahmed Mohammed Ali',
            full_name_en: 'Ahmed Mohammed Ali',
            email: `${cleanInputAlpha}@vitasiraq.com`,
            phone: '07701234567',
            department: 'الموارد البشرية',
            departmentEn: 'Human Resources',
            position: 'مسؤول موارد بشرية',
            position_ar: 'مسؤول موارد بشرية',
            positionEn: 'HR Officer',
            branch: 'المقر الرئيسي',
            branchEn: 'Headquarters',
            joinDate: '2023-01-15',
            salary: 1500000,
            avatar: '',
            role: 'Employee'
          };
        }
      }

      onLogin(loggedInUser);
      navigate('/employee-app/');
    } catch {
      setError(isEn ? 'Failed to log in. Please try again.' : 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة ثانية.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (bNo: string) => {
    setBadgeNumber(bNo);
    setPassword('123456');
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 flex flex-col items-center justify-center min-h-[750px] relative">
      {/* Top Header Controls with Language and Theme */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-bold text-slate-400">
            {isEn ? 'VITAS Iraq • ESS Portal' : 'فيتاس العراق • بوابة الموظف'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
              isDark ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-teal-700 hover:bg-slate-100'
            }`}
            title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'العربية' : 'English'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
              isDark ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title={isDark ? (isEn ? 'Switch to Light Mode' : 'التحويل للوضع النهاري') : (isEn ? 'Switch to Dark Mode' : 'التحويل للوضع الليلي')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Brand Icon & Welcome */}
      <div className="text-center space-y-2">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-xl shadow-teal-500/20 text-white">
          <span className="material-symbols-outlined text-4xl">fingerprint</span>
        </div>
        <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {isEn ? 'Employee Mobile Portal' : 'تطبيق الهاتف الذكي للموظف'}
        </h1>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isEn ? 'VITAS Iraq Unified HRMS Enterprise' : 'بوابة فيتاس العراق الموحدة للموارد البشرية'}
        </p>
      </div>

      {/* Login Card */}
      <div className={`w-full p-5 rounded-3xl border shadow-xl space-y-4 ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-teal-400">
              {isEn ? 'Badge Number / Employee ID *' : 'رقم الباجة / معرف الموظف *'}
            </label>
            <div className="relative">
              <span className={`material-symbols-outlined absolute top-1/2 -translate-y-1/2 text-lg text-teal-400 ${
                isEn ? 'left-3' : 'right-3'
              }`}>
                badge
              </span>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder={isEn ? 'Enter badge ID (e.g. V167 or 1001)' : 'أدخل رقم الباجة (مثال: V167 أو 1001)'}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isEn ? 'pl-10 pr-3' : 'pr-10 pl-3'
                } ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-teal-400">
              {isEn ? 'Secret Password *' : 'كلمة المرور السرية *'}
            </label>
            <div className="relative">
              <span className={`material-symbols-outlined absolute top-1/2 -translate-y-1/2 text-lg text-teal-400 ${
                isEn ? 'left-3' : 'right-3'
              }`}>
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEn ? 'Enter password (default: 123456)' : 'أدخل كلمة المرور (الافتراضية: 123456)'}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isEn ? 'pl-10 pr-3' : 'pr-10 pl-3'
                } ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading 
              ? (isEn ? 'Authenticating & Signing in...' : 'جاري التحقق والدخول...') 
              : (isEn ? 'Sign In to Employee App' : 'تسجيل الدخول للتطبيق')}
          </button>
        </form>

        {/* Demo Quick Touch ID */}
        <div className="pt-2 border-t border-slate-700/40 text-center space-y-2">
          <button
            onClick={() => handleQuickDemo('V167')}
            className={`w-full py-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-800/80 border-teal-500/30 text-teal-400 hover:bg-slate-700' 
                : 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100 shadow-xs'
            }`}
          >
            <span className="material-symbols-outlined text-lg text-teal-400">fingerprint</span>
            <span>{isEn ? 'Quick Biometric Sign In (Dina - V167)' : 'دخول سريع بالبصمة الحيوية (دينا - V167)'}</span>
          </button>
        </div>

        {/* Demo Accounts Chips */}
        <div className="pt-1 text-center">
          <p className="text-[10px] text-slate-400 font-bold mb-1.5">
            {isEn ? 'Quick Demo Accounts:' : 'حسابات للتجربة السريعة:'}
          </p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleQuickDemo('V167')}
              className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-[10px] font-bold border border-teal-600 shadow-sm transition-all cursor-pointer"
            >
              {isEn ? 'V167 - Dina (Credit)' : 'V167 - دينا (الائتمان)'}
            </button>
            <button
              onClick={() => handleQuickDemo('1001')}
              className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold border border-blue-600 shadow-sm transition-all cursor-pointer"
            >
              {isEn ? '1001 - Ahmed (HR)' : '1001 - أحمد (الموارد البشرية)'}
            </button>
            <button
              onClick={() => handleQuickDemo('1002')}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold border border-emerald-600 shadow-sm transition-all cursor-pointer"
            >
              {isEn ? '1002 - Fatima (Finance)' : '1002 - فاطمة (المالية)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};