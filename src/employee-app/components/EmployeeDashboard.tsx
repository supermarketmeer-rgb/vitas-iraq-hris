import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  Bell, 
  Sun, 
  Moon, 
  Globe, 
  User, 
  Clock, 
  CreditCard, 
  Calendar, 
  Award,
  History,
  CheckCircle2,
  FileText,
  Newspaper,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface EmployeeDashboardProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee: propEmployee, onLogout }) => {
  const { employee: contextEmployee, theme, toggleTheme, language, toggleLanguage, unreadNotifications, notifications } = useEmployeeContext();
  const employee = contextEmployee || propEmployee;
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [currentDate] = useState(new Date());
  const [latestNews, setLatestNews] = useState<any>(null);

  // Fetch latest published company news
  useEffect(() => {
    fetch('/api/news?status=published')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setLatestNews(data[0]);
        }
      })
      .catch(() => {
        // Fallback default announcement
        setLatestNews({
          title_ar: 'تعميم إداري: إطلاق نظام الموارد البشرية وبوابة الموظف المحدثة',
          title_en: 'Official Circular: Launch of Updated ESS Employee Mobile Portal',
          content_ar: 'ترحب إدارة مؤسسة فيتاس العراق بجميع الموظفين في بوابة الخدمات الذاتية المحدثة للرواتب والإجازات وكشوفات الدوام.',
          content_en: 'VITAS Iraq administration welcomes all staff to the upgraded ESS portal for payroll, leaves, and attendance.',
          publish_date: '2026-08-15',
          priority: 'urgent',
          category: 'circular'
        });
      });
  }, []);

  const employeePhoto = employee?.photoUrl || 
                        employee?.photo_url || 
                        employee?.avatar || 
                        employee?.photo || 
                        (String(employee?.badgeNo || employee?.badge_no || '').trim().toUpperCase() === 'V167' ? '/uploads/dina_haider.jpg' : null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-IQ', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const getFirstName = (empObj: any) => {
    const bNo = String(empObj?.badgeNo || empObj?.badge_no || '').trim().toUpperCase();

    if (isEn) {
      if (bNo === 'V167') return 'Dina';
      if (empObj?.fullNameEn) return empObj.fullNameEn.split(' ')[0];
      const enMap: Record<string, string> = {
        '1001': 'Ahmed',
        '1002': 'Fatima',
        '1003': 'Ali',
        'V167': 'Dina'
      };
      if (bNo && enMap[bNo]) return enMap[bNo];
      return 'Employee';
    }

    if (bNo === 'V167') return 'دينا';

    const fullNameAr = empObj?.full_name_ar || 
                       empObj?.fullNameAr || 
                       empObj?.fullName || 
                       empObj?.name_ar || 
                       empObj?.nameAr || 
                       empObj?.name || 
                       '';

    let cleaned = String(fullNameAr)
      .replace(/^الموظف\s+/gi, '')
      .replace(/^السيد\s+/gi, '')
      .replace(/^السيدة\s+/gi, '')
      .replace(/^الآنسة\s+/gi, '')
      .replace(/[\(\)\d\_\-\.]/g, '')
      .trim();

    if (cleaned && !/^\d+$/.test(cleaned)) {
      return cleaned.split(/\s+/)[0];
    }

    const arMap: Record<string, string> = {
      '1001': 'أحمد',
      '1002': 'فاطمة',
      '1003': 'علي',
      'V167': 'دينا'
    };
    if (bNo && arMap[bNo]) return arMap[bNo];
    return 'الموظف';
  };

  const firstName = getFirstName(employee);
  const positionTitle = isEn 
    ? (employee?.positionEn || employee?.position_en || 'Receptionist')
    : (employee?.position_ar || employee?.position || 'موظف استقبال');

  const branchTitle = isEn
    ? (employee?.branchEn || employee?.branch_en || 'Najaf Office')
    : (employee?.branch || employee?.location_ar || 'مكتب النجف');

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-20 animate-in fade-in">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer shrink-0" onClick={() => navigate('/employee-app/profile')}>
            {employeePhoto ? (
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-teal-500/50 shadow-md shadow-teal-500/20 overflow-hidden flex items-center justify-center p-0.5">
                <img 
                  src={employeePhoto} 
                  alt={firstName} 
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 items-center justify-center text-white font-black text-lg shadow-md shadow-teal-500/20 ${employeePhoto ? 'hidden' : 'flex'}`}>
              {firstName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                isDark ? 'text-teal-400 bg-teal-500/10' : 'text-teal-800 bg-teal-100'
              }`}>
                {positionTitle}
              </span>
            </div>
            <h1 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? `Welcome, ${firstName} 👋` : `مرحباً، ${firstName} 👋`}
            </h1>
            <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              {formatDate(currentDate)}
            </p>
          </div>
        </div>

        {/* Global Action Icons: Notifications, Language, Theme */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/employee-app/notifications')}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-xs'
            }`}
            title={isEn ? 'Notifications' : 'التنبيهات'}
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={toggleLanguage}
            className={`p-2 rounded-2xl border transition-all text-xs font-bold cursor-pointer ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-teal-400 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-teal-800 hover:bg-slate-50 shadow-xs'
            }`}
            title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
          >
            <Globe className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-amber-400 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-xs'
            }`}
            title={isDark ? (isEn ? 'Switch to Light Mode' : 'التحويل للوضع النهاري') : (isEn ? 'Switch to Dark Mode' : 'التحويل للوضع الليلي')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-800" />}
          </button>
        </div>
      </div>

      {/* Official Routed Document Priority Banner */}
      {notifications.filter(n => !n.read && n.documentType).map(n => (
        <div 
          key={n.id}
          onClick={() => navigate('/employee-app/notifications')}
          className="p-4 rounded-3xl bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white shadow-xl shadow-teal-700/25 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all border border-white/20 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  {isEn ? 'New Official Document' : 'مستند رسمي جديد'}
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
              </div>
              <p className="text-xs font-black mt-1 truncate text-white">{n.title}</p>
              <p className="text-[10px] text-slate-200 truncate">{n.message}</p>
            </div>
          </div>
          <span className="text-xs bg-white text-teal-900 font-black px-3 py-1.5 rounded-xl shrink-0 shadow-xs">
            {isEn ? 'Preview' : 'معاينة'}
          </span>
        </div>
      ))}

      {/* Employee Identity & Profile Overview Card */}
      <div className={`p-5 rounded-3xl border transition-all relative overflow-hidden shadow-lg ${
        isDark 
          ? 'bg-gradient-to-br from-[#131b2e] via-[#0f172a] to-[#0b1120] border-slate-700/80 text-white shadow-teal-950/20' 
          : 'bg-white border-slate-300 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 cursor-pointer group" onClick={() => navigate('/employee-app/profile')}>
            {employeePhoto ? (
              <div className="w-20 h-26 rounded-2xl bg-white dark:bg-slate-800 border-2 border-teal-500 shadow-md shadow-teal-500/25 overflow-hidden flex items-center justify-center p-0.5">
                <img 
                  src={employeePhoto} 
                  alt={firstName} 
                  className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
            <div className={`w-20 h-26 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 items-center justify-center text-white font-black text-2xl shadow-md shadow-teal-500/20 ${employeePhoto ? 'hidden' : 'flex'}`}>
              {firstName.charAt(0)}
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs"></span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono ${
                isDark ? 'text-teal-400 bg-teal-500/10' : 'text-teal-900 bg-teal-100'
              }`}>
                {employee?.badgeNo || employee?.badge_no || employee?.employeeId || employee?.employee_id || 'V167'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-800 bg-emerald-100'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isEn ? 'Active' : 'نشط'}</span>
              </span>
            </div>

            <h2 className={`text-base font-black truncate leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn 
                ? (employee?.fullNameEn || 'Dina Haider Qasim') 
                : (employee?.full_name_ar || employee?.fullNameAr || employee?.fullName || employee?.name || 'دينا حيدر قاسم')}
            </h2>

            <p className={`text-xs font-black truncate mt-0.5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
              {positionTitle}
            </p>

            <p className={`text-[11px] font-bold truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              {branchTitle} • {isEn ? (employee?.departmentEn || 'Credit Department') : (employee?.department || 'قسم الائتمان')}
            </p>
          </div>
        </div>

        {/* Quick Profile Footer Links */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <button
            onClick={() => navigate('/employee-app/profile')}
            className={`flex items-center gap-1.5 font-black cursor-pointer transition-colors ${
              isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-700 hover:text-teal-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm">badge</span>
            <span>{isEn ? 'View Job Profile' : 'عرض الملف الوظيفي'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/payroll')}
            className={`px-3 py-1 rounded-xl text-[11px] font-black transition-colors cursor-pointer border ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white' 
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            {isEn ? 'Monthly Payslip' : 'قسيمة الراتب'}
          </button>
        </div>
      </div>

      {/* LIVE COMPANY NEWS & ANNOUNCEMENTS BANNER (Answers User Question on How News Reaches Employee) */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-teal-950/40 via-slate-900 to-[#131b2e] border-teal-500/30 text-white' 
          : 'bg-white border-teal-300 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-teal-500/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Newspaper className="w-4 h-4" />
            </div>
            <h3 className={`text-xs font-black ${isDark ? 'text-teal-300' : 'text-teal-900'}`}>
              {isEn ? 'Company News & Circulars' : 'أخبار المؤسسة والتعميمات الرسمية'}
            </h3>
          </div>

          <button
            onClick={() => navigate('/employee-app/news')}
            className={`text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors ${
              isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-700 hover:text-teal-950'
            }`}
          >
            <span>{isEn ? 'All News' : 'كافة الأخبار'}</span>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>

        {latestNews ? (
          <div 
            onClick={() => navigate('/employee-app/news')}
            className="cursor-pointer group space-y-1 pt-1"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                {isEn ? 'Latest Circular' : 'أحدث تعميم'}
              </span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {latestNews.publish_date ? latestNews.publish_date.split('T')[0] : '2026-08-15'}
              </span>
            </div>
            <h4 className={`text-xs font-black group-hover:text-teal-600 transition-colors line-clamp-1 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {isEn ? (latestNews.title_en || latestNews.title_ar) : latestNews.title_ar}
            </h4>
            <p className={`text-[11px] line-clamp-2 leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-700 font-medium'
            }`}>
              {isEn ? (latestNews.content_en || latestNews.content_ar) : latestNews.content_ar}
            </p>
          </div>
        ) : (
          <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEn ? 'Loading latest announcements...' : 'جاري تحميل التعميمات الرسمية...'}
          </p>
        )}
      </div>

      {/* Quick Action Grid (6 ESS Sections with Zero Language Mixing) */}
      <div>
        <h2 className={`text-xs font-black mb-2.5 px-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
          {isEn ? 'ESS Portal Services' : 'خدمات بوابة الموظف الذاتية'}
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate('/employee-app/profile')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-teal-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5">
              <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-[11px] font-black">{isEn ? 'Profile' : 'الملف الشخصي'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/attendance')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-teal-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] font-black">{isEn ? 'Attendance' : 'سجل الدوام'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/payroll')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-teal-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] font-black">{isEn ? 'Payroll' : 'الرواتب'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/leave')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-teal-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-[11px] font-black">{isEn ? 'Leave' : 'الإجازات'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/evaluation')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-teal-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[11px] font-black">{isEn ? 'Self Evaluation' : 'التقييم الذاتي'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/news')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer relative ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-teal-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5">
              <Newspaper className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[11px] font-black">{isEn ? 'Company News' : 'أخبار المؤسسة'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-3xl border transition-all ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 shadow-xs text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-emerald-600 text-xl">event_available</span>
            <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {isEn ? 'Available' : 'متاح'}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{isEn ? '18 Days' : '18 يوم'}</p>
          <p className={`text-[11px] mt-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Annual Leave Balance' : 'رصيد الإجازة السنوية'}
          </p>
        </div>

        <div className={`p-4 rounded-3xl border transition-all ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 shadow-xs text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-blue-600 text-xl">schedule</span>
            <span className="text-blue-700 dark:text-blue-400 text-[11px] font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
              {isEn ? 'This Month' : 'هذا الشهر'}
            </span>
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{isEn ? '22 Days' : '22 يوم'}</p>
          <p className={`text-[11px] mt-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Logged Attendance Days' : 'أيام الحضور المسجلة'}
          </p>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className={`p-4 rounded-3xl border ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{isEn ? 'Recent Activity & Records' : 'النشاط والتحديثات الأخيرة'}</span>
          </h3>
          <button 
            onClick={() => navigate('/employee-app/notifications')}
            className={`text-[11px] font-black hover:underline cursor-pointer ${
              isDark ? 'text-teal-400' : 'text-teal-700'
            }`}
          >
            {isEn ? 'View All' : 'عرض الكل'}
          </button>
        </div>

        <div className="space-y-2.5">
          {notifications && notifications.length > 0 ? (
            notifications.slice(0, 4).map(notif => (
              <div
                key={notif.id}
                onClick={() => navigate('/employee-app/notifications')}
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  !notif.read
                    ? (isDark ? 'bg-teal-950/40 border-teal-500/40 text-white' : 'bg-teal-50/90 border-teal-300 text-slate-900')
                    : (isDark ? 'bg-[#0b1120] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800')
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.documentType === 'employment_contract' || notif.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>}
                    <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{notif.title}</p>
                  </div>
                  <p className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {notif.message}
                  </p>
                </div>
                <span className={`text-[10px] font-mono shrink-0 font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {notif.timestamp ? new Date(notif.timestamp).toLocaleDateString(isEn ? 'en-US' : 'ar-IQ') : ''}
                </span>
              </div>
            ))
          ) : (
            <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
              isDark ? 'bg-[#0b1120] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate text-slate-900 dark:text-white">{isEn ? 'Welcome to your employee self-service portal' : 'مرحباً بك في بوابتك الوظيفية الذاتية'}</p>
                <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {isEn ? 'All employee records are up to date' : 'جميع بيانات وسجلات الموظف محدثة'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};