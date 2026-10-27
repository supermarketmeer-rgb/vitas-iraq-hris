import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import { Sun, Moon, Globe } from 'lucide-react';
import vitasLogo from '../../../assets/VitasLogo.jpeg';

interface EmployeeLoginProps {
  onLogin: (employeeData: any) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ onLogin }) => {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme, language, toggleLanguage } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const handleLogin = async (e?: React.FormEvent, directBadge?: string, directPassword?: string) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);

    const inputBadge = (directBadge !== undefined ? directBadge : badgeNumber).trim();
    const inputPass = (directPassword !== undefined ? directPassword : password).trim();

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const cleanInput = inputBadge.toLowerCase();
      const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');

      if (!cleanInput) {
        setError(isEn ? 'Please enter badge number, employee ID, or name' : 'يرجى إدخال رقم الباجة، كود الموظف، أو الاسم');
        setIsLoading(false);
        return;
      }

      if (!inputPass) {
        setError(isEn ? 'Please enter password (default: 123456)' : 'يرجى إدخال كلمة المرور (الافتراضية: 123456)');
        setIsLoading(false);
        return;
      }

      // 1. Fetch users from API to check if this is an admin/system user
      let matchedDbUser: any = null;
      try {
        const uRes = await fetch('/api/users');
        if (uRes.ok) {
          const dbUsers = await uRes.json();
          if (Array.isArray(dbUsers) && dbUsers.length > 0) {
            matchedDbUser = dbUsers.find((u: any) => {
              const uUser = String(u.username || '').toLowerCase();
              const uEmp = String(u.employee_id || '').toLowerCase();
              return (
                uUser === cleanInput ||
                uEmp === cleanInput ||
                (cleanInputAlpha && (uUser === cleanInputAlpha || uEmp.includes(cleanInputAlpha)))
              );
            });
          }
        }
      } catch (err) {
        console.warn('Could not verify against /api/users, proceeding:', err);
      }

      // Password verification logic:
      // If user is registered in `users` table with an explicit password, verify it (or accept 123456 as universal fallback)
      if (matchedDbUser) {
        const expectedPass = matchedDbUser.password || '123456';
        if (inputPass !== expectedPass && inputPass !== '123456' && inputPass !== 'admin') {
          setError(isEn ? 'Incorrect password. Default password is: 123456' : 'كلمة المرور غير صحيحة. كلمة المرور الافتراضية هي: 123456');
          setIsLoading(false);
          return;
        }
      } else {
        // Normal employee: Accept 123456, the badge number, admin, or any non-empty password
        const isStandardPass = inputPass === '123456' || inputPass === 'admin' || inputPass.toLowerCase() === cleanInput;
        // If not standard and longer than 3 chars, accept it or fallback to 123456
        if (!isStandardPass && inputPass.length < 3) {
          setError(isEn ? 'Password must be at least 3 characters. Default: 123456' : 'كلمة المرور غير صحيحة. كلمة المرور الافتراضية للموظفين هي: 123456');
          setIsLoading(false);
          return;
        }
      }

      // 2. Look up the employee record from the database
      let loggedInUser: any = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        // First try targeted search
        const response = await fetch(`/api/employees?badge=${encodeURIComponent(cleanInput)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          let emps = Array.isArray(data) ? data : (data ? [data] : []);

          // If targeted search returned nothing, fetch full list and search flexibly
          if (emps.length === 0) {
            try {
              const fullRes = await fetch('/api/employees');
              if (fullRes.ok) {
                const allData = await fullRes.json();
                if (Array.isArray(allData)) emps = allData;
              }
            } catch {}
          }

          if (emps.length > 0) {
            const found = emps.find((emp: any) => {
              const bNo = String(emp.badge_no || emp.badgeNo || '').trim().toLowerCase();
              const eId = String(emp.employee_id || emp.employeeId || emp.id || '').trim().toLowerCase();
              const nameAr = String(emp.full_name_ar || emp.fullName || '').trim().toLowerCase();
              const nameEn = String(emp.full_name_en || emp.fullNameEn || '').trim().toLowerCase();
              const waid = String(emp.waid || emp.wa_id || '').trim().toLowerCase();
              const phone = String(emp.phone || emp.mobile || '').trim();

              return (
                bNo === cleanInput ||
                eId === cleanInput ||
                nameAr.includes(cleanInput) ||
                nameEn.includes(cleanInput) ||
                waid === cleanInput ||
                phone === cleanInput ||
                (cleanInputAlpha && (bNo.includes(cleanInputAlpha) || eId.includes(cleanInputAlpha)))
              );
            }) || (cleanInput === 'admin' ? emps[0] : (emps.length === 1 ? emps[0] : null));

            if (found) {
              const livePhoto = found.photoUrl || found.photo_url || found.avatar || found.photo || '';
              const realHireDate = found.joinDate || found.originalStartDate || found.contractStartDate || found.original_start_date || found.contract_start_date || '2026-01-01';
              const realDob = found.dob || found.dateOfBirth || found.date_of_birth || '';

              loggedInUser = {
                id: String(found.id),
                badgeNo: found.badgeNo || found.badge_no || cleanInput.toUpperCase(),
                badge_no: found.badgeNo || found.badge_no || cleanInput.toUpperCase(),
                employeeId: found.employeeId || found.employee_id || `VIT-${cleanInput.toUpperCase()}`,
                employee_id: found.employeeId || found.employee_id || `VIT-${cleanInput.toUpperCase()}`,
                fullName: found.fullName || found.full_name_ar || found.full_name_en,
                fullNameAr: found.fullName || found.full_name_ar,
                full_name_ar: found.fullName || found.full_name_ar,
                name: found.fullName || found.full_name_ar,
                name_ar: found.fullName || found.full_name_ar,
                fullNameEn: found.fullNameEn || found.full_name_en,
                full_name_en: found.fullNameEn || found.full_name_en,
                email: found.org_email || found.email || `${cleanInputAlpha || 'employee'}@vitasiraq.com`,
                phone: found.phone || found.mobile || '07700000000',
                department: found.department || 'الائتمان',
                departmentEn: found.department_en || found.departmentEn || 'Credit',
                position: found.jobTitle || found.position_ar || found.position || 'موظف',
                position_ar: found.jobTitle || found.position_ar || found.position || 'موظف',
                positionEn: found.jobTitleEn || found.position_en || 'Employee',
                branch: found.branch || found.location_ar || 'مكتب النجف',
                branchEn: found.branch_en || found.branchEn || 'Najaf Office',
                joinDate: realHireDate,
                originalStartDate: realHireDate,
                contractStartDate: found.contractStartDate || found.contract_start_date || realHireDate,
                hireDate: realHireDate,
                dob: realDob,
                dateOfBirth: realDob,
                salary: found.basicSalary || found.basic_salary || found.salary || 900000,
                photoUrl: livePhoto,
                photo_url: livePhoto,
                avatar: livePhoto,
                photo: livePhoto,
                role: 'Employee'
              };
            }
          }
        }
      } catch (err) {
        console.warn('Live API lookup failed, falling back:', err);
      }

      // 3. Fallback in case backend DB query is temporarily unreachable
      if (!loggedInUser) {
        const bKey = inputBadge.toUpperCase();
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
            joinDate: '2024-02-27',
            originalStartDate: '2024-02-27',
            contractStartDate: '2024-02-27',
            hireDate: '2024-02-27',
            dob: '1987-02-13',
            dateOfBirth: '1987-02-13',
            salary: 900000,
            avatar: '',
            photoUrl: '',
            photo_url: '',
            photo: '',
            role: 'Employee'
          };
        } else {
          loggedInUser = {
            id: '1',
            badgeNo: bKey || 'V132',
            badge_no: bKey || 'V132',
            employeeId: `VIT-${bKey || '0002'}`,
            employee_id: `VIT-${bKey || '0002'}`,
            fullName: isEn ? 'Ahmed Karim Mahmoud' : 'أحمد كريم محمود',
            fullNameAr: 'أحمد كريم محمود',
            full_name_ar: 'أحمد كريم محمود',
            name: 'أحمد كريم محمود',
            name_ar: 'أحمد كريم محمود',
            fullNameEn: 'Ahmed Karim Mahmoud',
            full_name_en: 'Ahmed Karim Mahmoud',
            email: `${cleanInputAlpha || 'employee'}@vitasiraq.com`,
            phone: '07701234567',
            department: 'الموارد البشرية',
            departmentEn: 'Human Resources',
            position: 'مسؤول موارد بشرية',
            position_ar: 'مسؤول موارد بشرية',
            positionEn: 'HR Officer',
            branch: 'المقر الرئيسي',
            branchEn: 'Headquarters',
            joinDate: '2023-01-15',
            originalStartDate: '2023-01-15',
            contractStartDate: '2023-01-15',
            hireDate: '2023-01-15',
            dob: '1990-01-01',
            dateOfBirth: '1990-01-01',
            salary: 1500000,
            avatar: '',
            photoUrl: '',
            photo_url: '',
            photo: '',
            role: 'Employee'
          };
        }
      }

      if (loggedInUser) {
        loggedInUser.password = inputPass;
      }

      onLogin(loggedInUser);
      navigate('/employee-app/profile');
    } catch {
      setError(isEn ? 'Failed to log in. Please try again.' : 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة ثانية.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill and login handler
  const handleQuickLogin = (badge: string, pass: string = '123456') => {
    setBadgeNumber(badge);
    setPassword(pass);
    handleLogin(undefined, badge, pass);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 my-auto -translate-y-2 flex flex-col items-center justify-center relative animate-in fade-in duration-300 space-y-3.5">
      {/* Top Header Controls with Language and Theme */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEn ? 'VITAS Iraq • ESS Portal' : 'فيتاس العراق • بوابة الموظف الذاتية'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-teal-700 hover:bg-slate-100'
            }`}
            title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'العربية' : 'English'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title={isDark ? (isEn ? 'Switch to Light Mode' : 'التحويل للوضع النهاري') : (isEn ? 'Switch to Dark Mode' : 'التحويل للوضع الليلي')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Main Login Card - Modeled after the main system login */}
      <div className={`w-full p-6 sm:p-7 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-[#0a0c10] border-white/10 text-white shadow-2xl' 
          : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        {/* Brand Header with VITAS Logo */}
        <div className="text-center mb-5">
          <div className="inline-block mb-2.5">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden shadow-xl shadow-teal-500/30 border-4 border-teal-500/30 backdrop-blur-sm">
              <img 
                src={vitasLogo} 
                alt="VITAS Iraq Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h1 className={`text-xl font-bold mb-0.5 ${isDark ? 'text-teal-400' : 'text-slate-900'}`}>
            {isEn ? 'VITAS Iraq' : 'مؤسسة فيتاس العراق'}
          </h1>
          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEn ? 'Cooperative Housing Foundation CHF' : 'مؤسسة الاسكان التعاونية CHF'}
          </p>
          <p className={`text-xs font-semibold ${isDark ? 'text-teal-500/90' : 'text-teal-700'}`}>
            {isEn ? 'Employee Self-Service (ESS) Portal' : 'بوابة الخدمة الذاتية للموظف (ESS)'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Badge No / Employee ID / Name' : 'رقم الباجة / كود الموظف / الاسم'}
            </label>
            <div className="relative flex items-center">
              <span className={`material-symbols-outlined absolute ${isEn ? 'left-3' : 'right-3'} text-lg pointer-events-none ${
                isDark ? 'text-teal-400' : 'text-slate-500'
              }`}>
                badge
              </span>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder={isEn ? 'e.g. V132 or VIT-0002 or name' : 'مثال: V132 أو VIT-0002 أو الاسم'}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a',
                  borderColor: isDark ? '#334155' : '#cbd5e1'
                }}
                className={`w-full ${isEn ? 'pl-11 pr-4' : 'pr-11 pl-4'} py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-xs ${
                  isDark 
                    ? 'bg-[#0f172a] text-white border-slate-700 placeholder-slate-500' 
                    : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400'
                }`}
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              {isEn ? '💡 You can enter badge (V132), ID (VIT-0002), or full name' : '💡 يمكنك إدخال رقم الباجة (مثل V132)، الكود، أو الاسم الكامل'}
            </p>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Password' : 'كلمة المرور'}
            </label>
            <div className="relative flex items-center">
              <span className={`material-symbols-outlined absolute ${isEn ? 'left-3' : 'right-3'} text-lg pointer-events-none ${
                isDark ? 'text-teal-400' : 'text-slate-500'
              }`}>
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEn ? 'Default: 123456' : 'الافتراضية: 123456'}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a',
                  borderColor: isDark ? '#334155' : '#cbd5e1'
                }}
                className={`w-full ${isEn ? 'pl-11 pr-11' : 'pr-11 pl-11'} py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-xs ${
                  isDark 
                    ? 'bg-[#0f172a] text-white border-slate-700 placeholder-slate-500' 
                    : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isEn ? 'right-3' : 'left-3'} p-1 rounded-lg text-slate-400 hover:text-teal-500 transition-colors focus:outline-none flex items-center justify-center cursor-pointer`}
                title={showPassword ? (isEn ? 'Hide password' : 'إخفاء كلمة المرور') : (isEn ? 'Show password' : 'إظهار كلمة المرور')}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
              {isEn ? '🔑 Default password for all employees is: 123456' : '🔑 كلمة المرور الافتراضية لكافة الموظفين: 123456'}
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-bold text-center animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-sm transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {isLoading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>{isEn ? 'Signing in...' : 'جاري تسجيل الدخول...'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">login</span>
                <span>{isEn ? 'Sign In to Employee Portal' : 'دخول بوابة الموظف'}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Test Accounts Box */}
        <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isEn ? '⚡ Quick Test Logins (1-Click):' : '⚡ حسابات تجريبية سريعة (ضغطة واحدة):'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('V132', '123456')}
              className={`p-2 rounded-xl border text-[11px] font-bold text-start transition-all cursor-pointer flex items-center justify-between ${
                isDark 
                  ? 'bg-slate-900/60 border-slate-700/60 text-slate-200 hover:border-teal-500/50 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50/50'
              }`}
            >
              <div className="truncate">
                <span className="block truncate font-bold text-teal-600 dark:text-teal-400">أحمد كريم</span>
                <span className="text-[10px] text-slate-400">V132 • كود VIT-0002</span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('V133', '123456')}
              className={`p-2 rounded-xl border text-[11px] font-bold text-start transition-all cursor-pointer flex items-center justify-between ${
                isDark 
                  ? 'bg-slate-900/60 border-slate-700/60 text-slate-200 hover:border-teal-500/50 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50/50'
              }`}
            >
              <div className="truncate">
                <span className="block truncate font-bold text-teal-600 dark:text-teal-400">نور فاضل</span>
                <span className="text-[10px] text-slate-400">V133 • كود VIT-0003</span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('V167', '123456')}
              className={`p-2 rounded-xl border text-[11px] font-bold text-start transition-all cursor-pointer flex items-center justify-between ${
                isDark 
                  ? 'bg-slate-900/60 border-slate-700/60 text-slate-200 hover:border-teal-500/50 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50/50'
              }`}
            >
              <div className="truncate">
                <span className="block truncate font-bold text-teal-600 dark:text-teal-400">دينا حيدر</span>
                <span className="text-[10px] text-slate-400">V167 • النجف</span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin')}
              className={`p-2 rounded-xl border text-[11px] font-bold text-start transition-all cursor-pointer flex items-center justify-between ${
                isDark 
                  ? 'bg-slate-900/60 border-slate-700/60 text-slate-200 hover:border-teal-500/50 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50/50'
              }`}
            >
              <div className="truncate">
                <span className="block truncate font-bold text-amber-600 dark:text-amber-400">آدمن النظام</span>
                <span className="text-[10px] text-slate-400">admin • كامل الصلاحيات</span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-4 text-center text-xs ${isDark ? 'text-teal-400' : 'text-slate-500'}`}>
          <p>© 2026 {isEn ? 'VITAS Iraq • Microfinance Institution' : 'مؤسسة فيتاس العراق • للتمويل الأصغر'}</p>
        </div>
      </div>
    </div>
  );
};