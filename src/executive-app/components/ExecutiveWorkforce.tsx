import React from 'react';
import { useExecutiveContext } from '../context/ExecutiveContext';
import { 
  Users, 
  UserCheck, 
  Award, 
  Briefcase, 
  PieChart, 
  TrendingUp, 
  ShieldCheck, 
  Mail, 
  PhoneCall,
  GraduationCap
} from 'lucide-react';

export const ExecutiveWorkforce: React.FC = () => {
  const { kpis, theme, language, t } = useExecutiveContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const departments = [
    { nameAr: 'إدارة الائتمان والعمليات الميدانية', nameEn: 'Credit & Field Operations', count: 820, pct: 55.3, color: 'bg-teal-500' },
    { nameAr: 'إدارات الفروع والمحافظات', nameEn: 'Branch Management & Regional Offices', count: 310, pct: 20.9, color: 'bg-amber-500' },
    { nameAr: 'الموارد البشرية والخدمات الإدارية', nameEn: 'Human Resources & General Services', count: 120, pct: 8.1, color: 'bg-sky-500' },
    { nameAr: 'المخاطر والالتزام والرقابة الشرعية', nameEn: 'Risk, Compliance & Governance', count: 85, pct: 5.7, color: 'bg-purple-500' },
    { nameAr: 'المالية والمحاسبة والمدفوعات', nameEn: 'Finance, Accounts & Disbursements', count: 82, pct: 5.5, color: 'bg-emerald-500' },
    { nameAr: 'تكنولوجيا المعلومات والتحول الرقمي', nameEn: 'IT, Cloud Infrastructure & Digital', count: 65, pct: 4.5, color: 'bg-rose-500' },
  ];

  const executiveTeam = [
    {
      nameAr: 'د. ياسمين خليل السامرائي',
      nameEn: 'Dr. Yasmeen K. Al-Samarrai',
      roleAr: 'مديرة إدارة الموارد البشرية والتوظيف',
      roleEn: 'HR & Talent Acquisition Director',
      phone: '+964 780 111 4455',
      email: 'hr.director@vitasiraq.org',
      status: 'على رأس العمل'
    },
    {
      nameAr: 'أ. طارق عبدالكريم العبيدي',
      nameEn: 'Tariq A. Al-Obaidi',
      roleAr: 'مدير إدارة العمليات والائتمان المركزي',
      roleEn: 'Chief Operations & Credit Officer',
      phone: '+964 781 222 5566',
      email: 'operations@vitasiraq.org',
      status: 'على رأس العمل'
    },
    {
      nameAr: 'أ. زينب مهدي الكعبي',
      nameEn: 'Zainab M. Al-Kaabi',
      roleAr: 'مديرة إدارة المخاطر والالتزام الرقابي',
      roleEn: 'Chief Risk & Compliance Officer',
      phone: '+964 782 333 6677',
      email: 'risk.compliance@vitasiraq.org',
      status: 'على رأس العمل'
    },
    {
      nameAr: 'م. سرمد فؤاد الجبوري',
      nameEn: 'Sarmad F. Al-Jubouri',
      roleAr: 'مدير البنية الرقمية وتكنولوجيا المعلومات',
      roleEn: 'Head of IT & Digital Transformation',
      phone: '+964 783 444 7788',
      email: 'it.infrastructure@vitasiraq.org',
      status: 'على رأس العمل'
    }
  ];

  return (
    <div className="p-3.5 space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          {t('القوى العاملة والهيكل الإداري', 'Workforce & Leadership Analytics')}
        </h2>
        <p className="text-xs text-slate-400">
          {t('التوزيع الديموغرافي، قيادات الإدارات، وكفاءة رأس المال البشري', 'Demographics, department leadership & human capital metrics')}
        </p>
      </div>

      {/* Top Diversity & Compliance Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400">{t('نسبة التوطين', 'Nationalization')}</div>
          <div className="text-base font-bold text-teal-400 mt-0.5">99.4%</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{t('كوادر عراقية', 'Iraqi Nationals')}</div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400">{t('العنصر النسائي', 'Female Ratio')}</div>
          <div className="text-base font-bold text-amber-400 mt-0.5">34.2%</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{t('507 موظفة', '507 females')}</div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400">{t('العقود الدائمية', 'Permanent')}</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">88.5%</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{t('استقرار وظيفي', 'High Retention')}</div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-1.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <PieChart className="w-4 h-4 text-amber-500" />
            <span>{t('توزيع الكادر حسب القطاعات التشغيلية', 'Staff by Operational Directorate')}</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">1,482 {t('موظف', 'total')}</span>
        </div>

        <div className="space-y-2.5">
          {departments.map((dept, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 dark:text-slate-200 light:text-slate-800 font-medium truncate max-w-[210px]" style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  {isAr ? dept.nameAr : dept.nameEn}
                </span>
                <span className="font-bold text-white dark:text-white light:text-slate-900 font-mono" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {dept.count} <span className="text-[10px] text-slate-400 font-normal">({dept.pct}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${dept.color}`} 
                  style={{ width: `${dept.pct}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Leadership Contacts */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-1.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          <Briefcase className="w-4 h-4 text-teal-400" />
          <span>{t('فريق القيادة التنفيذية المباشر', 'Executive Leadership Team')}</span>
        </h3>

        <div className="space-y-2">
          {executiveTeam.map((exec, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {isAr ? exec.nameAr : exec.nameEn}
                </h4>
                <p className="text-[10px] text-amber-400 truncate mt-0.5">
                  {isAr ? exec.roleAr : exec.roleEn}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>{exec.status}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${exec.phone}`}
                  className="p-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-500/30"
                  title={t('اتصال هاتفي', 'Phone Call')}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`mailto:${exec.email}`}
                  className="p-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30"
                  title={t('إرسال بريد إلكتروني', 'Send Email')}
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
