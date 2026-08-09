import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeLoginProps {
  onLogin: (employeeData: any) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ onLogin }) => {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useEmployeeContext();
  const isDark = theme === 'dark';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockEmployees = [
        {
          id: 'EMP001',
          badgeNo: '1001',
          password: '123456',
          fullName: 'أحمد محمد علي',
          fullNameEn: 'Ahmed Mohammed Ali',
          email: 'ahmed.mohammed@vitasiraq.iq',
          phone: '07701234567',
          department: 'إدارة الموارد البشرية',
          departmentEn: 'Human Resources',
          position: 'مسؤول موارد بشرية',
          positionEn: 'HR Officer',
          branch: 'المقر الرئيسي',
          branchEn: 'Headquarters',
          employeeId: 'VIT-2023-001',
          joinDate: '2023-01-15',
          salary: 1500000,
          avatar: '',
          role: 'Employee'
        },
        {
          id: 'EMP002',
          badgeNo: '1002',
          password: '123456',
          fullName: 'فاطمة حسين خليل',
          fullNameEn: 'Fatima Hussein Khalil',
          email: 'fatima.hussein@vitasiraq.iq',
          phone: '07801234567',
          department: 'المالية والمحاسبة',
          departmentEn: 'Finance & Accounting',
          position: 'محاسب',
          positionEn: 'Accountant',
          branch: 'بغداد',
          branchEn: 'Baghdad',
          employeeId: 'VIT-2023-002',
          joinDate: '2023-03-20',
          salary: 1350000,
          avatar: '',
          role: 'Employee'
        },
        {
          id: 'EMP003',
          badgeNo: '1003',
          password: '123456',
          fullName: 'علي جاسم كريم',
          fullNameEn: 'Ali Jassim Kareem',
          email: 'ali.jassim@vitasiraq.iq',
          phone: '07901234567',
          department: 'تكنولوجيا المعلومات',
          departmentEn: 'Information Technology',
          position: 'مسؤول IT',
          positionEn: 'IT Officer',
          branch: 'المقر الرئيسي',
          branchEn: 'Headquarters',
          employeeId: 'VIT-2023-003',
          joinDate: '2023-06-10',
          salary: 1600000,
          avatar: '',
          role: 'Employee'
        }
      ];

      const cleanInput = badgeNumber.trim().toLowerCase();
      const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');

      if (!cleanInput) {
        setError('يرجى إدخال رقم البادج أو معرف الموظف');
        setIsLoading(false);
        return;
      }

      const allEmployees = [...mockEmployees];
      const matched = allEmployees.find((emp: any) => {
        const bNo = String(emp.badgeNo || '').trim().toLowerCase();
        const eId = String(emp.employeeId || '').trim().toLowerCase();
        return bNo === cleanInput || eId === cleanInput;
      });

      const badgeNameMap: Record<string, { ar: string; en: string }> = {
        '1001': { ar: 'أحمد محمد علي', en: 'Ahmed Mohammed Ali' },
        '1002': { ar: 'فاطمة حسين خليل', en: 'Fatima Hussein Khalil' },
        '1003': { ar: 'علي جاسم كريم', en: 'Ali Jassim Kareem' },
        '1004': { ar: 'مصطفى حسن كاظم', en: 'Mustafa Hassan Kadhim' },
        '1005': { ar: 'زينب عبد الجبار', en: 'Zainab Abdul-Jabbar' },
        '1006': { ar: 'حيدر جاسم الفتلاوي', en: 'Haidar Jassim' },
        '1007': { ar: 'مريم عادل طارق', en: 'Maryam Adel' },
        '1008': { ar: 'عمر فاروق عبد الله', en: 'Omar Farooq' },
      };

      const bKey = badgeNumber.trim();
      const defaultName = badgeNameMap[bKey] || { ar: 'أحمد محمد علي', en: 'Ahmed Mohammed Ali' };

      const loggedInUser = matched ? {
        ...matched
      } : {
        id: 'EMP-TEMP',
        badgeNo: badgeNumber.trim(),
        employeeId: `VTS-${cleanInput.toUpperCase()}`,
        fullName: defaultName.ar,
        fullNameEn: defaultName.en,
        email: `${cleanInputAlpha}@vitasiraq.com`,
        phone: '07700000000',
        department: 'قسم العمليات والائتمان',
        departmentEn: 'Operations & Credit',
        position: 'مسؤول ائتمان',
        positionEn: 'Credit Officer',
        branch: 'بغداد',
        joinDate: '2022-01-01',
        salary: 1200000,
        avatar: '',
        role: 'Employee'
      };

      onLogin(loggedInUser);
      navigate('/employee-app/');
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 flex flex-col items-center justify-center min-h-[750px] relative">
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-bold text-slate-400">VITAS Iraq Employee Portal</span>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
            isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-slate-700 shadow-xs'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* Brand Icon & Welcome */}
      <div className="text-center space-y-2">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-xl shadow-teal-500/20 text-white">
          <span className="material-symbols-outlined text-4xl">fingerprint</span>
        </div>
        <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
          تطبيق الهاتف الذكي للموظف
        </h1>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          بوابة فيتاس العراق الموحدة للموارد البشرية
        </p>
      </div>

      {/* Login Card */}
      <div className={`w-full p-5 rounded-3xl border shadow-xl space-y-4 ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-teal-400">
              رقم البادج / معرف الموظف *
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-1/2 transform -translate-y-1/2 text-lg text-teal-400">
                badge
              </span>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="أدخل رقم البادج (مثال: 1001)"
                className={`w-full pr-10 pl-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-teal-400">
              كلمة المرور السرية *
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-1/2 transform -translate-y-1/2 text-lg text-teal-400">
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور (الافتراضية: 123456)"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  color: isDark ? '#ffffff' : '#0f172a',
                  borderColor: isDark ? '#334155' : '#cbd5e1'
                }}
                className={`w-full pr-10 pl-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? 'جاري التحقق والدخول...' : 'تسجيل الدخول للتطبيق'}
          </button>
        </form>

        {/* Biometric Quick Login Button */}
        <div className="pt-2 border-t border-slate-700/40 text-center space-y-2">
          <button
            onClick={() => {
              setBadgeNumber('1001');
              setPassword('123456');
              setTimeout(() => {
                onLogin({
                  id: 'EMP001',
                  badgeNo: '1001',
                  fullName: 'أحمد محمد علي',
                  email: 'ahmed.mohammed@vitasiraq.iq',
                  phone: '07701234567',
                  department: 'إدارة الموارد البشرية',
                  position: 'مسؤول موارد بشرية',
                  branch: 'المقر الرئيسي',
                  employeeId: 'VIT-2023-001',
                  joinDate: '2023-01-15',
                  salary: 1500000,
                  role: 'Employee'
                });
                navigate('/employee-app/');
              }, 400);
            }}
            className={`w-full py-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              isDark 
                ? 'bg-slate-800/80 border-teal-500/30 text-teal-400 hover:bg-slate-700' 
                : 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100 shadow-xs'
            }`}
          >
            <span className="material-symbols-outlined text-lg text-teal-400">fingerprint</span>
            <span>دخول سريع بالبصمة الحيوية (Demo Touch ID)</span>
          </button>
        </div>

        {/* Demo Accounts Chips */}
        <div className="pt-2">
          <p className="text-[10px] text-center text-slate-400 font-bold mb-1.5">اختر حساباً للتجربة السريعة:</p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setBadgeNumber('1001'); setPassword('123456'); }}
              className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-[10px] font-bold border border-teal-500/20 hover:bg-teal-500/20"
            >
              1001 - أحمد (HR)
            </button>
            <button
              onClick={() => { setBadgeNumber('1002'); setPassword('123456'); }}
              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 hover:bg-blue-500/20"
            >
              1002 - فاطمة (مالية)
            </button>
            <button
              onClick={() => { setBadgeNumber('1003'); setPassword('123456'); }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              1003 - علي (IT)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};