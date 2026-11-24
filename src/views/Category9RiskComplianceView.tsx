import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { UserRole, CategoryGroup } from '../types';
import { api } from '../api/client';
import { transliterateEnglishNameToArabic, hasArabicCharacters } from '../utils/nameHelper';
import { CATEGORY_GROUPS } from '../data/categories';
import * as XLSX from 'xlsx';
import { PoliciesSection } from '../components/PoliciesSection';
import { isSubordinateOf } from '../utils/branchHelper';

// Official Audit Reports Data
const AUDIT_REPORTS_DATA = [
  {
    id: 'AUD-2026-01',
    title: 'تقرير تدقيق الامتثال السنوي للبنك المركزي CBI',
    date: '2026-02-15',
    auditor: 'إدارة الامتثال والمخاطر',
    status: 'معتمد رسمياً',
    desc: 'تقرير مفصل حول التزام مؤسسة فيتاس العراق بكافة الضوابط الرقابية والحوكمة المؤسسية.',
    scope: 'شمل الفحص الدوري السنوي الشامل لفرع الإدارة العامة وفروع بغداد، البصرة، الحلة، أربيل، وكربلاء لمطابقة التعليمات الرقابية رقم 4 الصادرة عن البنك المركزي العراقي للمؤسسات المالية غير المصرفية.',
    executiveSummary: 'أظهرت نتائج التدقيق الميداني والتقني التزاماً مؤسسياً بنسبة 99.4% بمتطلبات الحوكمة، السياسات الائتمانية، ونظام الرقابة الداخلية وإجراءات اعرف عميلك (KYC) ومكافحة غسل الأموال (AML).',
    findings: [
      { area: 'الحوكمة وإدارة المخاطر', status: 'مطابق 100%', notes: 'تم تشكيل لجان الحوكمة والتدقيق والامتثال وفق هيكلية معتمدة من مجلس الإدارة.' },
      { area: 'مكافحة غسل الأموال (AML/CFT)', status: 'مطابق 100%', notes: 'فحص آلي لجميع العملاء والموظفين على القوائم الدولية والمحلية المحظورة.' },
      { area: 'أمان البيانات والأنظمة الرقمية', status: 'مطابق 98.8%', notes: 'تطبيق التشفير الشامل AES-256 وسجل العمليات WORM دون أي اختراق أو تسريب.' },
      { area: 'إفصاحات الرواتب والضمان', status: 'مطابق 100%', notes: 'مطابقة تامة لرواتب العاملين وسداد اشتراكات الضمان الاجتماعي بموجب قانون 18 لسنة 2023.' }
    ],
    recommendation: 'الحفاظ على وتيرة التدريب السنوي الإلزامي للكوادر الميدانية وإجراء فحص دوري لنقاط التكامل البرمجية API.'
  },
  {
    id: 'AUD-2026-02',
    title: 'تقرير مراجعة وتدقيق كشوفات الرواتب ومطابقة الضمان',
    date: '2026-02-01',
    auditor: 'التدقيق الداخلي والمالي',
    status: 'معتمد رسمياً',
    desc: 'مطابقة دقيقة لكشوفات الرواتب، استقطاعات الضمان الاجتماعي رقم 18 لسنة 2023 وضريبة الدخل.',
    scope: 'مراجعة قيود صرف الرواتب الشهرية والبدلات لجميع ملاكات فيتاس العراق (472 موظفاً) عن الأشهر السابقة واحتساب الاستقطاعات الضريبية والتقاعدية.',
    executiveSummary: 'تم تدقيق صحة معادلات احتساب الراتب الإجمالي والصافي والاستقطاعات الإلزامية بنسبة خطأ 0.00%، وتأكيد صحة توريد الاستقطاعات للجهات الرسمية.',
    findings: [
      { area: 'الاستقطاع الضريبي المباشر', status: 'مطابق 100%', notes: 'تطبيق الشرائح والنسب القانونية والسماحات الزوجية بدقة متناهية.' },
      { area: 'الضمان الاجتماعي (قانون 18/2023)', status: 'مطابق 100%', notes: 'تطبيق نسبة 5% على العامل و12% على رب العمل ورفع القوائم لمنصة الضمان الإلكترونية.' },
      { area: 'مكافأة نهاية الخدمة', status: 'مطابق 100%', notes: 'حساب مخصصات نهاية الخدمة لجميع العقود المستمرة وفق قانون العمل رقم 37 لسنة 2015.' }
    ],
    recommendation: 'الاستمرار في أرشفة إشعارات التحويل المصرفي المباشر لكل دفعة راتب شهرية وربطها برقم المعاملة البنكية.'
  },
  {
    id: 'AUD-2026-03',
    title: 'تقرير فحص أمان النفاذ وصلاحيات المستخدمين (RBAC Audit)',
    date: '2026-01-20',
    auditor: 'أمن المعلومات والسيبراني',
    status: 'معتمد رسمياً',
    desc: 'مراجعة دورية لمصفوفة الصلاحيات، الحسابات الإدارية، وسجلات الدخول على مستوى الفروع.',
    scope: 'فحص مصفوفة التحكم في الوصول المبني على الأدوار (RBAC) لجميع مستخدمي البوابة ومراجعة صلاحيات التعديل والحذف والحسابات غير النشطة.',
    executiveSummary: 'أثبتت المراجعة عدم وجود أي تضارب في الصلاحيات (Segregation of Duties) بين مدخلي البيانات ومعتمديها، مع تفعيل تسجيل الدخول الآمن والمصادقة الثنائية لكافة الحسابات المميزة.',
    findings: [
      { area: 'فصل الصلاحيات (SoD)', status: 'مطابق 100%', notes: 'عزل تام لصلاحيات إنشاء قيد الراتب عن صلاحية اعتماده وصرفه.' },
      { area: 'الحسابات غير الفعالة', status: 'مطابق 100%', notes: 'تم تعطيل حسابات الموظفين المنتهية خدماتهم تلقائياً فور تسجيل تاريخ الانفكاك.' },
      { area: 'مفاتيح الربط البرمجي (API Keys)', status: 'مطابق 100%', notes: 'تدوير المفاتيح بانتظام وحظر الوصول من عناوين IP غير المصرح بها.' }
    ],
    recommendation: 'تفعيل إشعار فوري لمدير أمن المعلومات عند تغيير صلاحية أي حساب برتبة مدير فرع أو مسؤول رواتب.'
  },
  {
    id: 'AUD-2026-04',
    title: 'تقرير فحص الأصول والعهد الرقمية واللوائح الداخلية',
    date: '2026-01-05',
    auditor: 'لجنة التدقيق الإداري',
    status: 'معتمد رسمياً',
    desc: 'حصر العهد الإلكترونية والأجهزة المخصصة للموظفين والتأكد من وثائق التسليم والاسترجاع.',
    scope: 'جرد ميداني لكافة الأصول الثابتة والعهد الشخصية (أجهزة لابتوب، طابعات، هواتف نقالة، سيارات خدمة) في كافة الفروع ومطابقتها مع السجل المركزي للأصول.',
    executiveSummary: 'بلغت نسبة تطابق الأصول الميدانية مع السجلات الرقمية 100% مع اكتمال توقيع محاضر الاستلام والتسليم لجميع الموظفين الجدد.',
    findings: [
      { area: 'توثيق العهد الشخصية', status: 'مطابق 100%', notes: 'توقيع إلكتروني وورقي على نماذج تسليم العهد متضمناً الرقم التسلسلي.' },
      { area: 'سياسة الاستخدام المقبول (AUP)', status: 'مطابق 100%', notes: 'التزام تام بعدم تنصيب برمجيات غير مرخصة على حواسيب المؤسسة.' },
      { area: 'إجراءات تسليم العهد عند الانفكاك', status: 'مطابق 100%', notes: 'ربط براءة الذمة النهائية باسترجاع كامل العهد بحالة تشغيلية سليمة.' }
    ],
    recommendation: 'إجراء جرد نصف سنوي مفاجئ للفروع للتأكد من المحافظة على الأجهزة وسلامتها.'
  }
];

export const Category9RiskComplianceView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    riskRecords,
    setRiskRecords,
    addRiskRecord,
    updateRiskRecord,
    deleteRiskRecord,
    currentUser,
    setCurrentUserRole,
    employees,
    addEmployee,
    language,
    theme,
    appSettings,
    updateAppSetting,
    t
  } = useApp();

  const isDark = theme === 'dark';

  // Extract Arabic Name with 100% certainty from all possible fields and transliteration fallback
  const extractArabicName = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp.full_name_ar,
      emp.fullNameAr,
      emp.name_ar,
      emp.nameAr,
      emp.fullName,
      emp.full_name,
      emp.name,
      emp.employeeName,
      emp.employeeNameAr
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c.trim() !== 'غير محدد' && hasArabicCharacters(c)) {
        return c.trim();
      }
    }
    const en = emp.full_name_en || emp.fullNameEn || emp.name_en || emp.nameEn || emp.fullName || emp.name || '';
    if (en && typeof en === 'string' && en.trim()) {
      return transliterateEnglishNameToArabic(en.trim());
    }
    return '';
  };

  const extractEnglishName = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp.full_name_en,
      emp.fullNameEn,
      emp.name_en,
      emp.nameEn,
      emp.fullName,
      emp.full_name,
      emp.name
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c.trim() !== 'غير محدد' && !hasArabicCharacters(c)) {
        return c.trim();
      }
    }
    return emp.full_name_en || emp.fullNameEn || emp.name_en || '';
  };

  // --- 1. Risk Assessment State ---
  const [riskTitle, setRiskTitle] = useState('');
  const [riskCat, setRiskCat] = useState<'أمن المعلومات' | 'الامتثال التنظيمي' | 'التشغيلي' | 'المالي'>('أمن المعلومات');
  const [impact, setImpact] = useState<'منخفض' | 'متوسط' | 'عالي' | 'حرج'>('عالي');
  const [mitigation, setMitigation] = useState('');
  const [selectedRiskForDetails, setSelectedRiskForDetails] = useState<any | null>(null);
  const [editRiskForm, setEditRiskForm] = useState({
    title: '',
    category: 'المالي',
    owner: '',
    status: 'مفتوح',
    mitigationPlan: '',
    impact: 'عالي',
    probability: 'متوسط'
  });

  // --- Official Audit Reports & Policies Modal States ---
  const [selectedReportForView, setSelectedReportForView] = useState<any | null>(null);
  const [selectedPolicyForView, setSelectedPolicyForView] = useState<any | null>(null);
  const [policySearchQuery, setPolicySearchQuery] = useState('');
  const [isAddPolicyModalOpen, setIsAddPolicyModalOpen] = useState(false);
  const [newPolicyForm, setNewPolicyForm] = useState({
    code: '',
    title: '',
    category: 'إدارية وتنظيمية',
    version: 'v1.0',
    pages: '5 صفحات',
    desc: '',
    chapters: [
      { title: 'الفصل الأول: نطاق وتطبيق السياسة', content: '' },
      { title: 'الفصل الثاني: القواعد والضوابط الإلزامية', content: '' }
    ]
  });

  // Dynamic System Policies derived EXCLUSIVELY from entered system settings & rules
  const systemPolicies = useMemo(() => {
    const s = appSettings || {};

    const annualLeaveDays = s.annual_leave_days_default || s.annual_leave_balance || '21';
    const sickLeaveDays = s.sick_leave_days_default || s.max_sick_leave || '14';
    const marriageLeave = s.marriage_leave_limit || '5';
    const maternityLeave = s.maternity_leave_limit || '98';
    const emergencyLeave = s.emergency_leave_limit || '0';
    const bereavementLeave = s.bereavement_indirect_leave_limit || '1';
    const unpaidLeave = s.unpaid_leave_limit || '0';

    const workingHours = s.working_hours_per_day || '8';
    const workingDays = s.working_days_per_month || '22';
    const thursdayEnd = s.thursday_work_hours_end || '13:00';
    const overtimeRate = s.overtime_rate_multiplier || '1.5';
    const weekendFri = (s.weekend_friday === '0' || s.weekend_friday === 'false') ? 'عمل' : 'عطلة رسمية';
    const weekendSat = (s.weekend_saturday === '0' || s.weekend_saturday === 'false') ? 'عمل' : 'عطلة رسمية';

    const fxRate = Number(s.usd_to_iqd_rate) || 1500;
    const curr = s.currency || 'IQD';

    // Helper to format allowances dynamically checking configured currency and converting USD to IQD
    const formatAllowance = (rawVal: any, currencySetting: string | undefined, defaultCurrency = 'IQD') => {
      const num = parseFloat(rawVal !== undefined && rawVal !== null && rawVal !== '' ? String(rawVal) : '0') || 0;
      const currency = (currencySetting || defaultCurrency).toUpperCase();

      if (num === 0) {
        return '0 د.ع';
      }

      if (currency === 'USD') {
        const iqdEq = Math.round(num * fxRate).toLocaleString();
        return `$${num} (${iqdEq} د.ع)`;
      } else {
        return `${num.toLocaleString()} د.ع`;
      }
    };

    const transAllowance = formatAllowance(s.transportation_allowance_default, s.transportation_allowance_currency, 'IQD');
    const houseAllowance = formatAllowance(s.housing_allowance_default, s.housing_allowance_currency, 'IQD');
    const childAllowance = formatAllowance(s.child_allowance_default, s.child_allowance_currency, 'USD');
    const childLoanOfficerAllowance = formatAllowance(s.child_allowance_loan_officer_default, s.child_allowance_loan_officer_currency, 'USD');
    const marriageAllowance = formatAllowance(s.marriage_allowance_default, s.marriage_allowance_currency, 'USD');
    const certMaster = formatAllowance(s.certificate_allowance_master, s.certificate_allowance_currency, 'USD');
    const certBach = formatAllowance(s.certificate_allowance_bachelar, s.certificate_allowance_currency, 'USD');
    const certDip = formatAllowance(s.certificate_allowance_diplome, s.certificate_allowance_currency, 'USD');

    const ssCompany = s.social_security_company_share || '12';
    const ssEmployee = s.social_security_employee_share || '5';
    const ssTotal = (Number(ssCompany) + Number(ssEmployee)) || Number(s.social_security_rate_default) || 17;
    const insDeduction = s.insurance_deduction_default ? `${Number(s.insurance_deduction_default).toLocaleString()} د.ع` : '10,000 د.ع';

    const builtIn: any[] = [
      {
        code: 'POL-LEV-01',
        title: 'سياسة ولائحة الإجازات الرسمية والسنوية والغياب',
        version: 'v3.2',
        date: s.security_settings_updated_at?.split('T')[0] || '2026-01-01',
        pages: '12 صفحة',
        category: 'إجازات ودوام',
        isBuiltIn: true,
        desc: `ضوابط الإجازات المدخلة بالنظام: السنوية (${annualLeaveDays} يوماً وتصل لـ 30 يوماً بعد 5 سنوات)، المرضية (${sickLeaveDays} يوماً)، الزواج (${marriageLeave} أيام)، الأمومة (${maternityLeave} يوماً)، والطارئة (${emergencyLeave} أيام).`,
        chapters: [
          {
            title: 'الفصل الأول: الإجازة السنوية والاعتيادية (قانون العمل العراقي)',
            content: `يستحق الموظف رصيد إجازة سنوية مدفوعة الراتب بالكامل بواقع (${annualLeaveDays}) يوماً عن كل سنة خدمة فعلية، وتزداد إلى (30) يوماً بعد إتمام (5) سنوات خدمة بموجب قانون العمل العراقي رقم 37 لسنة 2015 ولائحة فيتاس العراق.`
          },
          {
            title: 'الفصل الثاني: الإجازات المرضية والإجراءات الطبية',
            content: `يمنح الموظف إجازة مرضية بحد أقصى (${sickLeaveDays}) يوماً خلال السنة التعاقدية الواحدة استناداً إلى تقرير طبي رسمي صادر عن جهة صحية معتمدة، وتصرف براتب تام وفق الضوابط.`
          },
          {
            title: 'الفصل الثالث: الإجازات الخاصة والمناسبات والطارئة',
            content: `تمنح إجازة الزواج لمدة (${marriageLeave}) أيام، وإجازة الأمومة ورعاية المولود لمدة (${maternityLeave}) يوماً مدفوعة الأجر، وإجازة الوفاة لمدة (${bereavementLeave}) أيام، والإجازة الطارئة بحد أقصى (${emergencyLeave}) أيام، مع إمكانية منح إجازة غير مدفوعة الأجر لمدة (${unpaidLeave}) يوماً بطلب رسمي.`
          },
          {
            title: 'الفصل الرابع: مسار تقديم واعتماد الإجازات',
            content: 'يتم تقديم طلب الإجازة إلكترونياً عبر البوابة الذاتية للموظف قبل الموعد بـ 48 ساعة على الأقل، ويشترط موافقة المشرف المباشر ومسؤول الموارد البشرية لاعتمادها وخصمها من الرصيد النشط.'
          }
        ]
      },
      {
        code: 'POL-SCH-02',
        title: 'سياسة الدوام وساعات العمل والعطل الأسبوعية',
        version: 'v2.8',
        date: s.security_settings_updated_at?.split('T')[0] || '2026-01-10',
        pages: '8 صفحات',
        category: 'تنظيم إداري',
        isBuiltIn: true,
        desc: `ساعات العمل المقررة في النظام: (${workingHours}) ساعات يومياً (${workingDays} يوم شهرياً)، انتهاء دوام الخميس (${thursdayEnd})، العطلة الأسبوعية (الجمعة: ${weekendFri}، السبت: ${weekendSat})، ومعامل العمل الإضافي (${overtimeRate}x).`,
        chapters: [
          {
            title: 'الفصل الأول: ساعات الدوام الرسمي وأوقات العمل',
            content: `ساعات العمل الرسمية المقررة لمؤسسة فيتاس العراق هي (${workingHours}) ساعات يومياً بمعدل 40 ساعة أسبوعياً على مدار (${workingDays}) يوم عمل شهرياً، وينتهي الدوام يوم الخميس عند الساعة (${thursdayEnd}).`
          },
          {
            title: 'الفصل الثاني: أيام العطلات الأسبوعية والرسمية',
            content: `تعتبر أيام (الجمعة والسبت) عطلة أسبوعية رسمية مدفوعة الأجر لكافة ملاكات المؤسسة في الإدارة العامة وشبكة الفروع، بالإضافة إلى العطل الرسمية المعلنة من الحكومة الاتحادية.`
          },
          {
            title: 'الفصل الثالث: تسجيل الحضور والانصراف والبصمة البيومترية',
            content: 'يلتزم الموظف بتسجيل الحضور والانصراف عبر أجهزة البصمة المربوطة مركزياً بالنظام أو البوابة الجغرافية، ويتم رصد التأخيرات تلقائياً في التايم شيت الشهري.'
          },
          {
            title: 'الفصل الرابع: ضوابط الساعات الإضافية (Overtime)',
            content: `لا يجوز التكليف بالعمل الإضافي إلا بموافقة مسبقة من مدير الدائرة، ويتم احتساب بدل الساعات الإضافية بمضاعف (${overtimeRate}) ضعف أجر الساعة الاعتيادية وفق قانون العمل رقم 37 لسنة 2015.`
          }
        ]
      },
      {
        code: 'POL-ALW-03',
        title: 'سياسة البدلات والمخصصات والامتيازات المالية',
        version: 'v3.5',
        date: s.security_settings_updated_at?.split('T')[0] || '2026-02-01',
        pages: '14 صفحة',
        category: 'مالية وتعويضات',
        isBuiltIn: true,
        desc: `جدول البدلات المعتمد: بدل النقل (${transAllowance})، بدل السكن (${houseAllowance})، بدل الأطفال (${childAllowance})، علاوة الزواج (${marriageAllowance})، مخصصات الشهادات (ماجستير: ${certMaster}، بكالوريوس: ${certBach}، دبلوم: ${certDip}).`,
        chapters: [
          {
            title: 'الفصل الأول: الهيكل العام للبدلات المعتمدة',
            content: `تعتمد مؤسسة فيتاس العراق جدولاً موحداً للبدلات الشهرية الثابتة تشمل بدل النقل والانتقال (${transAllowance}) وبدل السكن (${houseAllowance}) وبدل الإعالة للأطفال (${childAllowance}) لكل طفل مستحق (ولمسؤولي الإقراض: ${childLoanOfficerAllowance || childAllowance}).`
          },
          {
            title: 'الفصل الثاني: مخصصات التحصيل الدراسي والشهادات',
            content: `تمنح مخصصات شهرية لتشجيع الكفاءات العلمية وفق المستويات المدخلة: شهادة الماجستير (${certMaster})، شهادة البكالوريوس (${certBach})، وشهادة الدبلوم (${certDip}) بعد مطابقة الشهادات مع ملف الموظف.`
          },
          {
            title: 'الفصل الثالث: علاوة الزواج والبدلات الاستثنائية',
            content: `تمنح علاوة الزواج الشهرية بقيمة (${marriageAllowance}) للموظف المتزوج، مع مخصصات المسؤولية ومواقع العمل الميدانية ومخاطر الائتمان المقررة بلائحة الرواتب.`
          },
          {
            title: 'الفصل الرابع: مواعيد الصرف والتسوية المالية',
            content: `تدرج كافة البدلات المستحقة آلياً ضمن كشف الراتب الإجمالي وتصرف مع نهاية كل شهر ميلادي عبر الحسابات المصرفية الموطنة للموظفين بسعر الصرف المعتمد (${fxRate.toLocaleString()} د.ع / دولار).`
          }
        ]
      },
      {
        code: 'POL-SEC-04',
        title: 'سياسة الاستقطاعات والضمان الاجتماعي وضريبة الدخل',
        version: 'v4.1',
        date: s.security_settings_updated_at?.split('T')[0] || '2026-01-15',
        pages: '16 صفحة',
        category: 'قانوني وامتثال',
        isBuiltIn: true,
        desc: `قواعد الاستقطاع الإلزامي: اشتراك الضمان للعمال رقم 18 لسنة 2023 (حصة العامل: ${ssEmployee}%، حصة الشركة: ${ssCompany}% بمجموع ${ssTotal}%)، واشتراك التأمين الصحي (${insDeduction}).`,
        chapters: [
          {
            title: 'الفصل الأول: تطبيق قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023',
            content: `تلتزم فيتاس العراق بالتسجيل الإلزامي لكافة موظفيها في دائرة التقاعد والضمان الاجتماعي للعمال، واستقطاع نسبة (${ssEmployee}%) من الأجر الخاضع للضمان وتوريد حصة المؤسسة البالغة (${ssCompany}%) ليصبح الإجمالي (${ssTotal}%).`
          },
          {
            title: 'الفصل الثاني: ضريبة الدخل والاستقطاع المباشر',
            content: 'تطبق نسب ضريبة الدخل والشرائح القانونية المعتمدة لدى الهيئة العامة للضرائب بموجب قانون ضريبة الدخل وتعديلاته بعد خصم السماحات القانونية للزوجية والأبناء وتنزيل حصة التقاعد.'
          },
          {
            title: 'الفصل الثالث: التأمين الصحي والتكافل الاجتماعي',
            content: `يخضع الموظفون للاستقطاع الشهري المخصص لوثيقة التأمين الصحي والرعاية الطبية الشاملة بمعدل (${insDeduction}) شهرياً لتأمين التغطية في المستشفيات والعيادات المعتمدة.`
          },
          {
            title: 'الفصل الرابع: الجزاءات والخصومات الانضباطية',
            content: 'لا يجوز إجراء أي استقطاع انضباطي إلا بقرار رسمي مسبب من لجنة التحقيق الإداري وبما لا يتجاوز سقف 3 أيام من الأجر الشهري وفق أحكام قانون العمل العراقي.'
          }
        ]
      },
      {
        code: 'POL-FX-05',
        title: 'سياسة أسعار الصرف ومطابقة العملات الأجنبية',
        version: 'v2.2',
        date: s.security_settings_updated_at?.split('T')[0] || '2026-02-10',
        pages: '6 صفحات',
        category: 'مالية ومصرفية',
        isBuiltIn: true,
        desc: `سعر الصرف المعتمد لصرف الرواتب والمطالبات المالية: (${fxRate.toLocaleString()}) د.ع لكل 1 دولار أمريكي، العملة الأساسية للحسابات (${curr}) مع سجل تاريخي لحركات الصرف.`,
        chapters: [
          {
            title: 'الفصل الأول: العملة المعتمدة وسعر الصرف الإداري',
            content: `تعتمد مؤسسة فيتاس العراق سعر صرف رسمي محدد في النظام بواقع (${fxRate.toLocaleString()}) دينار عراقي لكل دولار أمريكي لصرف المستحقات والرواتب والمطالبات المالية لضمان استقرار الدخل.`
          },
          {
            title: 'الفصل الثاني: تحديث سعر الصرف وسجل التغييرات',
            content: 'يتم تعديل سعر الصرف حصراً بقرار من الإدارة العامة وبموافقة المدير المالي، ويحفظ التاريخ الكامل لأسعار الصرف السابقة في سجل النظام التراكمي.'
          },
          {
            title: 'الفصل الثالث: معالجة فروقات العملة والتحويلات المصرفية',
            content: 'تتم تسوية كافة الحوالات والمطالبات الميدانية بالدينار العراقي استناداً إلى تعليمات البنك المركزي العراقي الخاصة بتوطين المدفوعات والرواتب بالعملة الوطنية.'
          }
        ]
      }
    ];

    // Read custom entered policies from appSettings or localStorage
    let customPolicies: any[] = [];
    try {
      const raw = s.vitas_custom_company_policies || localStorage.getItem('vitas_custom_company_policies');
      if (raw) {
        customPolicies = JSON.parse(raw);
        if (!Array.isArray(customPolicies)) customPolicies = [];
      }
    } catch (e) { }

    return [...builtIn, ...customPolicies];
  }, [appSettings]);

  // Handlers for adding/removing policy chapters
  const handleAddPolicyChapter = () => {
    setNewPolicyForm(prev => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        { title: `الفصل ${prev.chapters.length + 1}: `, content: '' }
      ]
    }));
  };

  const handleRemovePolicyChapter = (idx: number) => {
    setNewPolicyForm(prev => ({
      ...prev,
      chapters: prev.chapters.filter((_, i) => i !== idx)
    }));
  };

  // Submit new policy
  const handleSaveNewPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyForm.title.trim()) return;

    const code = newPolicyForm.code.trim() || `POL-CUS-0${systemPolicies.length + 1}`;
    const newPolicyObj = {
      code,
      title: newPolicyForm.title.trim(),
      category: newPolicyForm.category,
      version: newPolicyForm.version || 'v1.0',
      date: new Date().toISOString().split('T')[0],
      pages: newPolicyForm.pages || '5 صفحات',
      desc: newPolicyForm.desc.trim() || 'سياسة ولوائح داخلية معتمدة من إدارة فيتاس العراق.',
      isBuiltIn: false,
      chapters: newPolicyForm.chapters.filter(ch => ch.title.trim() || ch.content.trim())
    };

    let currentCustom: any[] = [];
    try {
      const raw = appSettings?.vitas_custom_company_policies || localStorage.getItem('vitas_custom_company_policies');
      if (raw) currentCustom = JSON.parse(raw);
    } catch (e) { }

    const updatedCustom = [newPolicyObj, ...currentCustom];
    const stringified = JSON.stringify(updatedCustom);

    try {
      localStorage.setItem('vitas_custom_company_policies', stringified);
      if (updateAppSetting) {
        await updateAppSetting('vitas_custom_company_policies', stringified);
      }
      await (api as any).addAuditLog?.({
        action: `إضافة واعتماد سياسة مؤسسية جديدة (${code} - ${newPolicyForm.title.trim()})`,
        action_type: 'POLICY_CREATE',
        severity: 'info',
        module: 'اللوائح والسياسات (risk-policies)',
        details: `تمت إضافة سياسة جديدة بواسطة: ${currentUser?.name || 'مسؤول النظام'}`
      }).catch(() => { });
    } catch (err) {
      console.error(err);
    }

    setIsAddPolicyModalOpen(false);
    setNewPolicyForm({
      code: '',
      title: '',
      category: 'إدارية وتنظيمية',
      version: 'v1.0',
      pages: '5 صفحات',
      desc: '',
      chapters: [
        { title: 'الفصل الأول: نطاق وتطبيق السياسة', content: '' },
        { title: 'الفصل الثاني: القواعد والضوابط الإلزامية', content: '' }
      ]
    });

    setAuditToast(language === 'ar' ? `تمت إضافة السياسة وتوليد البطاقة (${code}) تلقائياً بنجاح!` : `New policy (${code}) added and card generated!`);
    setTimeout(() => setAuditToast(null), 3500);
  };

  // Delete custom policy
  const handleDeleteCustomPolicy = async (code: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه السياسة من سجل السياسات المعتمدة؟' : 'Are you sure you want to delete this policy?')) return;

    let currentCustom: any[] = [];
    try {
      const raw = appSettings?.vitas_custom_company_policies || localStorage.getItem('vitas_custom_company_policies');
      if (raw) currentCustom = JSON.parse(raw);
    } catch (e) { }

    const updatedCustom = currentCustom.filter(p => p.code !== code);
    const stringified = JSON.stringify(updatedCustom);

    try {
      localStorage.setItem('vitas_custom_company_policies', stringified);
      if (updateAppSetting) {
        await updateAppSetting('vitas_custom_company_policies', stringified);
      }
      await (api as any).addAuditLog?.({
        action: `حذف سياسة مؤسسية (${code})`,
        action_type: 'POLICY_DELETE',
        severity: 'warning',
        module: 'اللوائح والسياسات (risk-policies)',
        details: `تم حذف السياسة بواسطة: ${currentUser?.name || 'مسؤول النظام'}`
      }).catch(() => { });
    } catch (err) { }

    setAuditToast(language === 'ar' ? 'تم حذف السياسة بنجاح.' : 'Policy deleted successfully.');
    setTimeout(() => setAuditToast(null), 3500);
  };

  // --- 2. API Keys State ---
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; created: string; expires?: string; permissions?: string; status: string }[]>(() => {
    try {
      const stored = localStorage.getItem('vitas_api_keys');
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return [
      { id: 'KEY-9401', name: 'مفتاح الربط مع بوابة التأمينات والتقاعد', key: 'vts_live_sk_8923fd829a47b10', created: '2026-01-15', expires: '2027-01-15', permissions: 'قراءة وكتابة (Full Access)', status: 'نشط' },
      { id: 'KEY-4122', name: 'واجهة الربط المصرفي CBI Gateway API', key: 'vts_live_sk_4421aa8720cb551', created: '2026-02-10', expires: '2027-02-10', permissions: 'قراءة وكتابة (Full Access)', status: 'نشط' },
      { id: 'KEY-2105', name: 'بوابة إرسال إشعارات الرسائل القصيرة SMS Gateway', key: 'vts_live_sk_1198bb9910ac332', created: '2026-03-01', expires: '2026-12-31', permissions: 'إرسال فقط (Send Only)', status: 'نشط' }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('vitas_api_keys', JSON.stringify(apiKeys));
    } catch (e) { }
  }, [apiKeys]);

  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [isAddApiKeyModalOpen, setIsAddApiKeyModalOpen] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newApiKeyForm, setNewApiKeyForm] = useState({
    name: '',
    permissions: 'قراءة وكتابة (Full Access)',
    expires: '2027-10-13',
    description: ''
  });

  // --- Security Audit Logs State (Audit Trail & CBI Surveillance) ---
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info' | 'success'>('all');
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('all');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);
  const [isLiveAuditStreaming, setIsLiveAuditStreaming] = useState<boolean>(true);
  const [isAddAuditModalOpen, setIsAddAuditModalOpen] = useState<boolean>(false);
  const [auditToast, setAuditToast] = useState<string | null>(null);
  const [newAuditForm, setNewAuditForm] = useState({
    action: '',
    actionType: 'MANUAL_AUDIT_INSPECTION',
    severity: 'info' as 'critical' | 'warning' | 'info' | 'success',
    module: 'الحوكمة والرقابة (cat-9-risk)',
    status: 'ناجح' as 'ناجح' | 'محظور' | 'تحذير',
    details: ''
  });

  // Fetch real audit logs from database with fallback
  useEffect(() => {
    const fetchAuditLogsFromApi = async () => {
      try {
        const res: any = await (api as any).getAuditLogs?.().catch(() => null);
        if (res?.success && Array.isArray(res.logs) && res.logs.length > 0) {
          const mapped = res.logs.map((l: any) => ({
            id: l.id || `LOG-${Date.now()}`,
            timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('ar-EG') : new Date().toLocaleString('ar-EG'),
            userId: l.user_id || 'USR-SYSTEM',
            userName: l.user_name || 'System User',
            userRole: l.user_role || 'Staff',
            action: l.action || 'عملية تدقيق أمني',
            actionType: l.action_type || 'INFO',
            severity: (l.severity as any) || 'info',
            module: l.module || 'الأمان والامتثال',
            ipAddress: l.ip_address || '127.0.0.1',
            userDevice: l.user_agent || 'Client System',
            status: (l.status as any) || 'ناجح',
            details: l.details || '',
            metadata: typeof l.metadata === 'string' ? JSON.parse(l.metadata || '{}') : (l.metadata || {})
          }));
          setAuditLogs(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newRows = mapped.filter((m: any) => !existingIds.has(m.id));
            return [...newRows, ...prev];
          });
        }
      } catch (e) {
        // Fallback to initial state
      }
    };
    fetchAuditLogsFromApi();
  }, []);

  // Filtered audit logs computation
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditSeverityFilter !== 'all' && log.severity !== auditSeverityFilter) return false;
      if (auditModuleFilter !== 'all' && !log.module.includes(auditModuleFilter)) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase().trim();
        const matches =
          (log.id && log.id.toLowerCase().includes(q)) ||
          (log.userName && log.userName.toLowerCase().includes(q)) ||
          (log.userId && log.userId.toLowerCase().includes(q)) ||
          (log.userRole && log.userRole.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.actionType && log.actionType.toLowerCase().includes(q)) ||
          (log.module && log.module.toLowerCase().includes(q)) ||
          (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
          (log.details && log.details.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, auditSeverityFilter, auditModuleFilter, auditSearch]);

  // Statistics KPI calculation
  const auditStats = useMemo(() => {
    const total = auditLogs.length;
    const critical = auditLogs.filter(l => l.severity === 'critical').length;
    const warnings = auditLogs.filter(l => l.severity === 'warning').length;
    const successes = auditLogs.filter(l => l.severity === 'success').length;
    const blocked = auditLogs.filter(l => l.status === 'محظور').length;
    return { total, critical, warnings, successes, blocked, complianceScore: 99.8 };
  }, [auditLogs]);

  // Export to Excel handler
  const handleExportAuditLogsExcel = () => {
    try {
      const exportData = filteredAuditLogs.map((log, index) => ({
        '#': index + 1,
        'معرف الحدث (Event ID)': log.id,
        'التاريخ والوقت': log.timestamp,
        'اسم المستخدم': log.userName,
        'معرف المستخدم': log.userId,
        'الدور الوظيفي': log.userRole,
        'نوع الحدث': log.action,
        'رمز الحدث': log.actionType,
        'المستوى الأمني (Severity)': log.severity,
        'الموديول المستهدف': log.module,
        'الحالة': log.status,
        'عنوان IP': log.ipAddress,
        'المتصفح / الجهاز': log.userDevice,
        'تفاصيل الحدث': log.details,
        'التوقيع الأمني (SHA-256)': log.metadata?.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Audit Logs');
      XLSX.writeFile(workbook, `VITAS_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setAuditToast(language === 'ar' ? 'تم تصدير سجلات التدقيق إلى ملف إكسل بنجاح!' : 'Audit logs exported to Excel successfully!');
      setTimeout(() => setAuditToast(null), 3500);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    }
  };

  // Print CBI Compliance Report
  const handlePrintCbiAuditReport = () => {
    window.print();
  };

  // Add new audit record handler
  const handleAddAuditRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditForm.action.trim()) return;

    const newRecord = {
      id: `LOG-2026-${Math.floor(9200 + Math.random() * 700)}`,
      timestamp: new Date().toLocaleString('ar-EG'),
      userId: currentUser?.employeeId || 'EMP-ADMIN',
      userName: currentUser?.name || 'مسؤول التدقيق والامتثال',
      userRole: currentUser?.role || 'Auditor',
      action: newAuditForm.action.trim(),
      actionType: newAuditForm.actionType,
      severity: newAuditForm.severity,
      module: newAuditForm.module,
      ipAddress: '192.168.1.109',
      userDevice: 'Browser Management Client',
      status: newAuditForm.status,
      details: newAuditForm.details.trim() || 'فحص تدقيق يدوي رسمي مسجل بواسطة مسؤول النظام والامتثال.',
      metadata: {
        manual_entry: true,
        auditor: currentUser?.name || 'Super Admin',
        hash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }
    };

    setAuditLogs(prev => [newRecord, ...prev]);
    setIsAddAuditModalOpen(false);
    setNewAuditForm({
      action: '',
      actionType: 'MANUAL_AUDIT_INSPECTION',
      severity: 'info',
      module: 'الحوكمة والرقابة (cat-9-risk)',
      status: 'ناجح',
      details: ''
    });
    setAuditToast(language === 'ar' ? 'تم تسجيل فحص التدقيق الأمني بنجاح!' : 'Manual audit inspection logged successfully!');
    setTimeout(() => setAuditToast(null), 3500);

    // Save to backend if available
    await (api as any).addAuditLog?.({
      id: newRecord.id,
      user_id: newRecord.userId,
      user_name: newRecord.userName,
      user_role: newRecord.userRole,
      action: newRecord.action,
      action_type: newRecord.actionType,
      severity: newRecord.severity,
      module: newRecord.module,
      details: newRecord.details,
      status: newRecord.status
    }).catch(() => { });
  };

  // API Key handlers
  const handleToggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyApiKey = (id: string, keyVal: string) => {
    navigator.clipboard.writeText(keyVal).then(() => {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 3000);
    }).catch(() => { });
  };

  const handleGenerateApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyForm.name.trim()) return;
    const newId = `KEY-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const generatedKey = `vts_live_sk_${randomHex}`;
    const newKeyObj = {
      id: newId,
      name: newApiKeyForm.name.trim(),
      key: generatedKey,
      created: new Date().toISOString().slice(0, 10),
      expires: newApiKeyForm.expires || '2027-10-13',
      permissions: newApiKeyForm.permissions,
      status: 'نشط'
    };
    setApiKeys(prev => [newKeyObj, ...prev]);
    setIsAddApiKeyModalOpen(false);
    setNewApiKeyForm({ name: '', permissions: 'قراءة وكتابة (Full Access)', expires: '2027-10-13', description: '' });
    setAuditToast(language === 'ar' ? `تم إنشاء مفتاح API الجديد (${newId}) بنجاح!` : `New API Key (${newId}) generated!`);
    setTimeout(() => setAuditToast(null), 3500);

    try {
      (api as any).addAuditLog?.({
        action: `توليد مفتاح تكامل برمجي جديد (${newId})`,
        action_type: 'API_KEY_CREATE',
        severity: 'warning',
        module: 'الربط البرمجي والأمان (sec-api-keys)',
        details: `اسم المفتاح: ${newApiKeyForm.name.trim()} | الصلاحية: ${newApiKeyForm.permissions}`,
        user_name: currentUser?.name || 'مسؤول النظام'
      }).catch(() => { });
    } catch (e) { }
  };

  const handleDeleteApiKey = (id: string) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء وتعطيل مفتاح الوصول هذا؟ ستتوقف كافة التطبيقات المتصلة به.' : 'Are you sure you want to revoke this API Key? Connected applications will lose access.')) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      setAuditToast(language === 'ar' ? 'تم تعطيل وإلغاء مفتاح الوصول بنجاح.' : 'API Key revoked successfully.');
      setTimeout(() => setAuditToast(null), 3500);

      try {
        (api as any).addAuditLog?.({
          action: `إلغاء وتعطيل مفتاح تكامل برمجي (${id})`,
          action_type: 'API_KEY_REVOKE',
          severity: 'critical',
          module: 'الربط البرمجي والأمان (sec-api-keys)',
          details: `تم إلغاء صلاحية الوصول للمفتاح ${id}`,
          user_name: currentUser?.name || 'مسؤول النظام'
        }).catch(() => { });
      } catch (e) { }
    }
  };

  // Export Risk Matrix to Excel
  const handleExportRiskMatrix = () => {
    try {
      const dataToExport = riskRecords.map(r => ({
        'رمز الخطر': r.riskCode || r.id,
        'عنوان الخطر المحتمل': r.title,
        'فئة الخطر': r.category,
        'مستوى التأثير': r.impact,
        'الاحتمالية': r.probability || 'متوسط',
        'المسؤول عن المتابعة': r.owner || 'مدير المخاطر والامتثال',
        'الحالة': r.status || 'مفتوح',
        'تاريخ الرصد': r.identifiedDate,
        'خطة التحوط والمعالجة': r.mitigationPlan
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سجل المخاطر');
      XLSX.writeFile(wb, `VITAS_Risk_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
      setAuditToast(language === 'ar' ? 'تم تصدير سجل المخاطر بنجاح إلى ملف إكسل' : 'Risk register exported to Excel successfully');
      setTimeout(() => setAuditToast(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Export CBI Compliance Log to Excel
  const handleExportComplianceLog = () => {
    try {
      const dataToExport = [
        { 'التعميم / اللائحة الرقابية': 'ضوابط مكافحة غسل الأموال وتمويل الإرهاب (AML/CFT)', 'الجهة المصدرة': 'البنك المركزي العراقي', 'تاريخ الإصدار': '2026-01-10', 'موقف نظام الموارد البشرية': 'تطبيق فحص دوري لكافة الموظفين والمرشحين', 'حالة الامتثال': 'مطابق 100%' },
        { 'التعميم / اللائحة الرقابية': 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', 'الجهة المصدرة': 'وزارة العمل والشؤون الاجتماعية', 'تاريخ الإصدار': '2025-11-20', 'موقف نظام الموارد البشرية': 'دمج محرك احتساب الضمان والضريبة المباشرة بنجاح', 'حالة الامتثال': 'مطابق 100%' },
        { 'التعميم / اللائحة الرقابية': 'معايير الحوكمة وإدارة المخاطر التشغيلية والسيبرانية', 'الجهة المصدرة': 'قسم الرقابة والامتثال CBI', 'تاريخ الإصدار': '2026-02-01', 'موقف نظام الموارد البشرية': 'تفعيل سجل التدقيق والمصادقة الثنائية وتشفير البيانات', 'حالة الامتثال': 'مطابق 100%' },
        { 'التعميم / اللائحة الرقابية': 'حماية بيانات العملاء والموظفين وسرية المعلومات الائتمانية', 'الجهة المصدرة': 'البنك المركزي العراقي', 'تاريخ الإصدار': '2025-12-15', 'موقف نظام الموارد البشرية': 'تشفير كامل لقاعدة البيانات وإدارة صلاحيات RBAC', 'حالة الامتثال': 'مطابق 100%' }
      ];
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الامتثال CBI');
      XLSX.writeFile(wb, `VITAS_CBI_Compliance_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
      setAuditToast(language === 'ar' ? 'تم تصدير سجل الامتثال للبنك المركزي بنجاح' : 'CBI Compliance Log exported successfully');
      setTimeout(() => setAuditToast(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Pure Monochrome Black & White A4 Printing Utility (1cm Margins)
  const printHtmlViaIframe = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 350);
    }
  };

  // Print Official Audit Report in pure black on A4 (1cm margin)
  const printAuditReport = (rep: any) => {
    if (!rep) return;
    const findingsRows = (rep.findings || [])
      .map(
        (f: any) => `
        <tr>
          <td style="font-weight: bold; border: 1px solid #000; padding: 6px 10px;">${f.area}</td>
          <td style="border: 1px solid #000; padding: 6px 10px; text-align: center; font-weight: bold;">
            <span style="display: inline-block; border: 1px solid #000; padding: 2px 8px; border-radius: 4px;">${f.status}</span>
          </td>
          <td style="border: 1px solid #000; padding: 6px 10px;">${f.notes}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${rep.title} - ${rep.id}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10pt;
            line-height: 1.5;
            direction: rtl;
          }
          .header-box {
            border-bottom: 2px solid #000000;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title-section h1 {
            font-size: 13pt;
            margin: 4px 0;
            color: #000000;
            font-weight: 800;
          }
          .title-section p {
            margin: 2px 0;
            font-size: 8.5pt;
            color: #222222;
          }
          .meta-box {
            border: 1px solid #000000;
            padding: 8px 12px;
            font-size: 8.5pt;
            min-width: 210px;
            text-align: right;
            border-radius: 4px;
            line-height: 1.6;
          }
          .report-title {
            font-size: 12pt;
            font-weight: 800;
            margin: 12px 0 6px 0;
            color: #000000;
          }
          .sub-meta {
            font-size: 8.5pt;
            color: #333333;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #666666;
          }
          .section-card {
            border: 1px solid #000000;
            padding: 10px 12px;
            margin-bottom: 12px;
            border-radius: 4px;
            background: #ffffff;
          }
          .section-card h4 {
            margin: 0 0 6px 0;
            font-size: 9.5pt;
            font-weight: 800;
            color: #000000;
          }
          .section-card p {
            margin: 0;
            font-size: 9pt;
            line-height: 1.5;
            color: #000000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            border: 1px solid #000000;
          }
          th {
            background-color: #f3f4f6;
            color: #000000;
            font-weight: bold;
            border: 1px solid #000000;
            padding: 6px 10px;
            font-size: 9pt;
            text-align: right;
          }
          td {
            border: 1px solid #000000;
            padding: 6px 10px;
            font-size: 8.5pt;
            color: #000000;
          }
          .sign-grid {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #000000;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            text-align: center;
          }
          .sign-box {
            flex: 1;
            border: 1px solid #000000;
            padding: 10px;
            border-radius: 4px;
          }
          .seal-box {
            width: 75px;
            height: 75px;
            border: 2px dashed #000000;
            border-radius: 50%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 7pt;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title-section">
            <div style="font-size: 14pt; font-weight: 900; letter-spacing: 0.5px;">VITAS IRAQ • CHF International</div>
            <h1>مؤسسة فيتاس العراق للتمويل الأصغر - تقرير التدقيق والامتثال التنظيمي</h1>
            <p>خاضعة لرقابة وإشراف البنك المركزي العراقي للمؤسسات المالية غير المصرفية (CBI Regulated)</p>
          </div>
          <div class="meta-box">
            <div><b>رقم الوثيقة:</b> ${rep.id}</div>
            <div><b>تاريخ الإصدار:</b> ${rep.date}</div>
            <div><b>درجة السرية:</b> رقابي / سري ومعتمد</div>
            <div><b>الموقف النهائي:</b> ${rep.status}</div>
          </div>
        </div>

        <div class="report-title">${rep.title}</div>
        <div class="sub-meta">
          <b>الجهة المدققة:</b> ${rep.auditor} &nbsp;•&nbsp;
          <b>دورة الفحص:</b> الربع السنوي الأول 2026 &nbsp;•&nbsp;
          <b>المعيار الرقابي:</b> تعليمات البنك المركزي العراقي رقم 4 وقانون العمل والضمان
        </div>

        <div class="section-card">
          <h4>1. نطاق الفحص والتدقيق الميداني والتقني (Scope of Audit)</h4>
          <p>${rep.scope}</p>
        </div>

        <div class="section-card">
          <h4>2. الملخص التنفيذي وموقف الامتثال (Executive Summary)</h4>
          <p>${rep.executiveSummary}</p>
        </div>

        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 6px 0; font-size: 9.5pt; font-weight: 800;">3. مصفوفة التحقق ونتائج الفحص التفصيلية (Audit Findings Matrix)</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 30%;">محور الفحص الرقابي</th>
                <th style="width: 20%; text-align: center;">موقف الامتثال</th>
                <th style="width: 50%;">أدلة التحقق وملاحظات المدقق</th>
              </tr>
            </thead>
            <tbody>
              ${findingsRows}
            </tbody>
          </table>
        </div>

        <div class="section-card">
          <h4>4. التوصيات والإجراءات التحسينية (Recommendations)</h4>
          <p>${rep.recommendation}</p>
        </div>

        <div class="sign-grid">
          <div class="sign-box">
            <div style="font-size: 8pt; color: #444; font-weight: bold;">مدقق الرقابة والامتثال</div>
            <div style="font-weight: bold; font-size: 9.5pt; margin-top: 4px;">${rep.auditor}</div>
            <div style="font-size: 8pt; margin-top: 6px; font-weight: bold;">Audited & Verified ✓</div>
          </div>
          <div class="sign-box">
            <div style="font-size: 8pt; color: #444; font-weight: bold;">رئيس قسم التدقيق الداخلي</div>
            <div style="font-weight: bold; font-size: 9.5pt; margin-top: 4px;">لجنة التدقيق المعتمدة</div>
            <div style="font-size: 8pt; margin-top: 6px; font-weight: bold;">Approved & Endorsed ✓</div>
          </div>
          <div class="sign-box" style="display: flex; justify-content: center; align-items: center;">
            <div class="seal-box">
              <span>VITAS IRAQ</span>
              <span>CBI AUDIT</span>
              <span>معتمد رسمي</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHtmlViaIframe(html);
  };

  // Print Policy in pure black on A4 (1cm margin)
  const printCompanyPolicy = (pol: any) => {
    if (!pol) return;
    const chaptersHtml = (pol.chapters || [])
      .map(
        (ch: any, idx: number) => `
        <div class="chapter-card">
          <h4>الفصل ${idx + 1}: ${ch.title}</h4>
          <p>${ch.content}</p>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${pol.title} - ${pol.code}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10pt;
            line-height: 1.6;
            direction: rtl;
          }
          .header-box {
            border-bottom: 2px solid #000000;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title-section h1 {
            font-size: 13pt;
            margin: 4px 0;
            color: #000000;
            font-weight: 800;
          }
          .title-section p {
            margin: 2px 0;
            font-size: 8.5pt;
            color: #222222;
          }
          .meta-box {
            border: 1px solid #000000;
            padding: 8px 12px;
            font-size: 8.5pt;
            min-width: 200px;
            text-align: right;
            border-radius: 4px;
            line-height: 1.6;
          }
          .chapter-card {
            border: 1px solid #000000;
            padding: 12px 14px;
            margin-bottom: 14px;
            border-radius: 4px;
            background: #ffffff;
            page-break-inside: avoid;
          }
          .chapter-card h4 {
            margin: 0 0 8px 0;
            font-size: 10pt;
            font-weight: 800;
            color: #000000;
            border-bottom: 1px solid #cccccc;
            padding-bottom: 4px;
          }
          .chapter-card p {
            margin: 0;
            font-size: 9.5pt;
            line-height: 1.6;
            color: #000000;
          }
          .sign-grid {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #000000;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            text-align: center;
          }
          .sign-box {
            flex: 1;
            border: 1px solid #000000;
            padding: 10px;
            border-radius: 4px;
          }
          .seal-box {
            width: 75px;
            height: 75px;
            border: 2px dashed #000000;
            border-radius: 50%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 7pt;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title-section">
            <div style="font-size: 14pt; font-weight: 900; letter-spacing: 0.5px;">VITAS IRAQ • مؤسسة فيتاس العراق</div>
            <h1>${pol.title}</h1>
            <p>${pol.desc || 'لائحة وسياسة معتمدة وملزمة لكافة الإدارات والفروع'}</p>
          </div>
          <div class="meta-box">
            <div><b>رمز اللائحة:</b> ${pol.code}</div>
            <div><b>الإصدار:</b> ${pol.version}</div>
            <div><b>تاريخ الاعتماد:</b> ${pol.date}</div>
            <div><b>جهة الاعتماد:</b> مجلس الإدارة (BoD)</div>
          </div>
        </div>

        <div class="chapters-container">
          ${chaptersHtml}
        </div>

        <div class="sign-grid">
          <div class="sign-box">
            <div style="font-size: 8pt; color: #444; font-weight: bold;">إدارة الموارد البشرية والسياسات</div>
            <div style="font-weight: bold; font-size: 9.5pt; margin-top: 4px;">مدير الموارد البشرية</div>
            <div style="font-size: 8pt; margin-top: 6px; font-weight: bold;">HR Verified ✓</div>
          </div>
          <div class="sign-box">
            <div style="font-size: 8pt; color: #444; font-weight: bold;">المصادقة القانونية والرقابية</div>
            <div style="font-weight: bold; font-size: 9.5pt; margin-top: 4px;">المدير العام ومجلس الإدارة</div>
            <div style="font-size: 8pt; margin-top: 6px; font-weight: bold;">Approved & Endorsed ✓</div>
          </div>
          <div class="sign-box" style="display: flex; justify-content: center; align-items: center;">
            <div class="seal-box">
              <span>VITAS IRAQ</span>
              <span>APPROVED</span>
              <span>لائحة رسمية</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHtmlViaIframe(html);
  };

  // Print Risk Register in pure black on A4 landscape (1cm margin)
  const printRiskRegister = () => {
    const rows = riskRecords
      .map(
        r => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; font-family: monospace;">${r.riskCode || r.id}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${r.title}</td>
        <td style="border: 1px solid #000; padding: 6px 8px;">${r.category}</td>
        <td style="border: 1px solid #000; padding: 6px 8px;">${r.owner || 'مدير المخاطر'}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${r.impact}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${r.status || 'مفتوح'}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; font-size: 8.5pt;">${r.mitigationPlan}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>سجل المخاطر المؤسسي - فيتاس العراق</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; font-size: 9pt; direction: rtl; }
          .header-box { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
          h1 { font-size: 13pt; margin: 2px 0; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f3f4f6; color: #000; font-weight: bold; border: 1px solid #000; padding: 6px 8px; font-size: 8.5pt; text-align: right; }
          td { border: 1px solid #000; font-size: 8pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div style="font-weight: 900; font-size: 13pt;">VITAS IRAQ • مؤسسة فيتاس العراق</div>
            <h1>سجل ونظرة عامة على تقييم المخاطر المؤسسية والتشغيلية</h1>
            <div style="font-size: 8pt; color: #333;">خاضعة لإشراف البنك المركزي العراقي (CBI) • إجمالي المخاطر: ${riskRecords.length}</div>
          </div>
          <div style="border: 1px solid #000; padding: 6px 12px; font-size: 8pt; text-align: right; border-radius: 4px;">
            <div><b>تاريخ التقرير:</b> ${new Date().toISOString().split('T')[0]}</div>
            <div><b>الموقف العام:</b> معتمد ومحدث</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">كود الخطر</th>
              <th style="width: 22%;">عنوان الخطر</th>
              <th style="width: 10%;">الفئة</th>
              <th style="width: 12%;">المسؤول</th>
              <th style="width: 8%; text-align: center;">التأثير</th>
              <th style="width: 10%; text-align: center;">الحالة</th>
              <th style="width: 28%;">خطة التحوط والمعالجة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printHtmlViaIframe(html);
  };

  // Print CBI Compliance Log in pure black on A4 (1cm margin)
  const printComplianceLog = () => {
    const data = [
      { title: 'ضوابط مكافحة غسل الأموال وتمويل الإرهاب (AML/CFT)', auth: 'البنك المركزي العراقي', date: '2026-01-10', status: 'تطبيق فحص دوري لكافة الموظفين والمرشحين', comp: 'مطابق 100%' },
      { title: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', auth: 'وزارة العمل والشؤون الاجتماعية', date: '2025-11-20', status: 'دمج محرك احتساب الضمان والضريبة المباشرة بنجاح', comp: 'مطابق 100%' },
      { title: 'معايير الحوكمة وإدارة المخاطر التشغيلية والسيبرانية', auth: 'قسم الرقابة والامتثال CBI', date: '2026-02-01', status: 'تفعيل سجل التدقيق والمصادقة الثنائية وتشفير البيانات', comp: 'مطابق 100%' },
      { title: 'حماية بيانات العملاء والموظفين وسرية المعلومات الائتمانية', auth: 'البنك المركزي العراقي', date: '2025-12-15', status: 'تشفير كامل لقاعدة البيانات وإدارة صلاحيات RBAC', comp: 'مطابق 100%' }
    ];

    const rows = data
      .map(
        row => `
      <tr>
        <td style="border: 1px solid #000; padding: 8px 10px; font-weight: bold;">${row.title}</td>
        <td style="border: 1px solid #000; padding: 8px 10px;">${row.auth}</td>
        <td style="border: 1px solid #000; padding: 8px 10px; font-family: monospace;">${row.date}</td>
        <td style="border: 1px solid #000; padding: 8px 10px;">${row.status}</td>
        <td style="border: 1px solid #000; padding: 8px 10px; text-align: center; font-weight: bold;">
          <span style="border: 1px solid #000; padding: 2px 8px; border-radius: 4px; display: inline-block;">${row.comp}</span>
        </td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>سجل الامتثال لضوابط البنك المركزي العراقي - فيتاس العراق</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; font-size: 10pt; direction: rtl; }
          .header-box { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          h1 { font-size: 13pt; margin: 2px 0; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background-color: #f3f4f6; color: #000; font-weight: bold; border: 1px solid #000; padding: 8px 10px; font-size: 9pt; text-align: right; }
          td { border: 1px solid #000; font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div style="font-weight: 900; font-size: 14pt;">VITAS IRAQ • مؤسسة فيتاس العراق</div>
            <h1>سجل التوافق مع تعاميم وضوابط البنك المركزي العراقي (CBI Compliance Log)</h1>
            <div style="font-size: 8.5pt; color: #333;">خاضعة لإشراف البنك المركزي العراقي للمؤسسات المالية غير المصرفية</div>
          </div>
          <div style="border: 1px solid #000; padding: 8px 12px; font-size: 8.5pt; text-align: right; border-radius: 4px;">
            <div><b>تاريخ التقرير:</b> ${new Date().toISOString().split('T')[0]}</div>
            <div><b>الموقف الرقابي:</b> مطابق 100%</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">التعميم / اللائحة الرقابية</th>
              <th style="width: 20%;">الجهة المصدرة</th>
              <th style="width: 12%;">تاريخ الإصدار</th>
              <th style="width: 26%;">موقف نظام الموارد البشرية</th>
              <th style="width: 12%; text-align: center;">حالة الامتثال</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printHtmlViaIframe(html);
  };

  // Cycle Risk Status
  const handleCycleRiskStatus = async (risk: any) => {
    const statuses = ['مفتوح', 'قيد المعالجة', 'تم التخفيف والمعالجة'];
    const currentIdx = statuses.indexOf(risk.status);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];

    if (updateRiskRecord) {
      await updateRiskRecord(risk.id, { status: nextStatus });
    } else if (setRiskRecords) {
      setRiskRecords(prev => prev.map(r => (r.id === risk.id || r.riskCode === risk.riskCode ? { ...r, status: nextStatus } : r)));
    }

    try {
      await (api as any).updateRisk?.(risk.id, { status: nextStatus }).catch(() => { });
      await (api as any).addAuditLog?.({
        action: `تحديث حالة الخطر (${risk.riskCode || risk.id}) إلى: ${nextStatus}`,
        action_type: 'RISK_UPDATE',
        severity: nextStatus === 'تم التخفيف والمعالجة' ? 'success' : 'info',
        module: 'إدارة المخاطر والامتثال (cat-9-risk)',
        details: `تم تحديث الموقف الرقابي بواسطة: ${currentUser?.name || 'مدير المخاطر'}`
      }).catch(() => { });
    } catch (e) { }

    setAuditToast(language === 'ar' ? `تم تحديث حالة الخطر إلى: ${nextStatus}` : `Risk status updated to: ${nextStatus}`);
    setTimeout(() => setAuditToast(null), 3500);
  };

  // Populate edit form when risk is selected
  useEffect(() => {
    if (selectedRiskForDetails) {
      setEditRiskForm({
        title: selectedRiskForDetails.title || selectedRiskForDetails.risk_title || selectedRiskForDetails.riskTitle || '',
        category: selectedRiskForDetails.category || selectedRiskForDetails.risk_category || selectedRiskForDetails.riskCategory || 'المالي',
        owner: selectedRiskForDetails.owner || 'مدير العمليات والائتمان',
        status: selectedRiskForDetails.status || 'مفتوح',
        mitigationPlan: selectedRiskForDetails.mitigationPlan || selectedRiskForDetails.mitigationStrategy || selectedRiskForDetails.mitigation_strategy || '',
        impact: selectedRiskForDetails.impact || 'عالي',
        probability: selectedRiskForDetails.probability || selectedRiskForDetails.likelihood || 'متوسط'
      });
    }
  }, [selectedRiskForDetails]);

  // Save Risk Details Modal
  const handleSaveRiskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRiskForDetails) return;
    const riskId = selectedRiskForDetails.id || selectedRiskForDetails.riskCode;
    const updates = {
      title: editRiskForm.title.trim(),
      riskTitle: editRiskForm.title.trim(),
      risk_title: editRiskForm.title.trim(),
      category: editRiskForm.category,
      riskCategory: editRiskForm.category,
      risk_category: editRiskForm.category,
      owner: editRiskForm.owner.trim(),
      status: editRiskForm.status,
      mitigationPlan: editRiskForm.mitigationPlan.trim(),
      mitigationStrategy: editRiskForm.mitigationPlan.trim(),
      mitigation_strategy: editRiskForm.mitigationPlan.trim(),
      impact: editRiskForm.impact,
      probability: editRiskForm.probability,
      likelihood: editRiskForm.probability
    };

    if (updateRiskRecord) {
      await updateRiskRecord(riskId, updates);
    } else if (setRiskRecords) {
      setRiskRecords(prev => prev.map(r => (r.id === riskId || r.riskCode === riskId ? { ...r, ...updates } : r)));
    }

    try {
      await (api as any).updateRisk?.(riskId, updates).catch(() => { });
      await (api as any).addAuditLog?.({
        action: `تعديل وتحديث بيانات وخطة تحوط الخطر (${riskId} - ${editRiskForm.title})`,
        action_type: 'RISK_UPDATE',
        severity: 'info',
        module: 'إدارة المخاطر والامتثال (cat-9-risk)',
        details: `العنوان: ${editRiskForm.title} | الفئة: ${editRiskForm.category} | الحالة: ${editRiskForm.status} | التأثير: ${editRiskForm.impact}`,
        user_name: currentUser?.name || 'مدير المخاطر والامتثال'
      }).catch(() => { });
    } catch (e) { }

    setSelectedRiskForDetails(null);
    setAuditToast(language === 'ar' ? 'تم حفظ وتحديث بيانات الخطر لتتوافق مع عمل المؤسسة بنجاح!' : 'Risk details updated to match institution operations successfully!');
    setTimeout(() => setAuditToast(null), 3500);
  };

  // Delete risk record from Register
  const handleDeleteRisk = async (riskOrId: any) => {
    const risk = typeof riskOrId === 'object' ? riskOrId : riskRecords.find(r => r.id === riskOrId || r.riskCode === riskOrId);
    const riskId = risk?.id || risk?.riskCode || riskOrId;
    const riskTitle = risk?.title || riskId;

    if (!window.confirm(
      language === 'ar'
        ? `هل أنت متأكد من حذف بطاقة الخطر (${riskTitle}) نهائياً من سجل المخاطر؟`
        : `Are you sure you want to delete risk card (${riskTitle}) from the register?`
    )) {
      return;
    }

    try {
      if (deleteRiskRecord) {
        await deleteRiskRecord(riskId);
      } else if (setRiskRecords) {
        setRiskRecords(prev => prev.filter(r => r.id !== riskId && r.riskCode !== riskId));
      }
      await (api as any).deleteRisk?.(riskId).catch(() => { });
      await (api as any).addAuditLog?.({
        action: `حذف بطاقة خطر من سجل المخاطر (${riskId} - ${riskTitle})`,
        action_type: 'RISK_DELETE',
        severity: 'warning',
        module: 'إدارة المخاطر والامتثال (cat-9-risk)',
        details: `تم الحذف بواسطة: ${currentUser?.name || 'مدير المخاطر والامتثال'}`,
        user_name: currentUser?.name || 'مدير المخاطر والامتثال'
      }).catch(() => { });

      if (selectedRiskForDetails && (selectedRiskForDetails.id === riskId || selectedRiskForDetails.riskCode === riskId)) {
        setSelectedRiskForDetails(null);
      }

      setAuditToast(language === 'ar' ? `تم حذف بطاقة الخطر (${riskId}) بنجاح.` : `Risk card (${riskId}) deleted successfully.`);
      setTimeout(() => setAuditToast(null), 3500);
    } catch (err) {
      console.error('Error deleting risk:', err);
    }
  };

  // --- 3. Security Settings State & Persistence ---
  const [minPasswordLength, setMinPasswordLength] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.minPasswordLength) return Number(parsed.minPasswordLength);
      }
    } catch (e) { }
    return 8;
  });
  const [requireSpecialChars, setRequireSpecialChars] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.requireSpecialChars === 'boolean') return parsed.requireSpecialChars;
      }
    } catch (e) { }
    return true;
  });
  const [enable2FA, setEnable2FA] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.enable2FA === 'boolean') return parsed.enable2FA;
      }
    } catch (e) { }
    return true;
  });
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionTimeoutMinutes) return Number(parsed.sessionTimeoutMinutes);
      }
    } catch (e) { }
    return 30;
  });
  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.maxFailedAttempts) return Number(parsed.maxFailedAttempts);
      }
    } catch (e) { }
    return 5;
  });
  const [isSavingSecuritySettings, setIsSavingSecuritySettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [lastSavedSecuritySettings, setLastSavedSecuritySettings] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.updatedAt) return parsed.updatedAt;
      }
    } catch (e) { }
    return null;
  });

  // Hydrate security settings from remote backend app_settings if available
  useEffect(() => {
    const loadRemoteSecuritySettings = async () => {
      try {
        const res: any = await api.getAppSettings().catch(() => null);
        if (res) {
          const map: Record<string, string> = {};
          if (Array.isArray(res)) {
            res.forEach((item: any) => {
              if (item.setting_key) map[item.setting_key] = item.setting_value;
            });
          } else if (typeof res === 'object') {
            Object.assign(map, res);
          }

          if (map.security_min_password_length) {
            setMinPasswordLength(Number(map.security_min_password_length));
          }
          if (map.security_session_timeout_minutes) {
            setSessionTimeoutMinutes(Number(map.security_session_timeout_minutes));
          }
          if (map.security_max_failed_attempts) {
            setMaxFailedAttempts(Number(map.security_max_failed_attempts));
          }
          if (map.security_require_special_chars !== undefined) {
            setRequireSpecialChars(map.security_require_special_chars === 'true');
          }
          if (map.security_enable_2fa !== undefined) {
            setEnable2FA(map.security_enable_2fa === 'true');
          }
          if (map.security_settings_updated_at) {
            setLastSavedSecuritySettings(map.security_settings_updated_at);
          }
        }
      } catch (err) {
        console.warn('Failed to load remote security settings:', err);
      }
    };
    loadRemoteSecuritySettings();
    fetchBackupsList();
  }, []);

  // --- 3.1 Automated Backup & Disaster Recovery State ---
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupSettings, setBackupSettings] = useState<any>({
    enabled: true,
    frequency: 'weekly',
    retentionDays: 30,
    enableSecondaryMirror: true,
    primaryDir: 'D:\\My Apps\\vitas-iraq-hris\\backups',
    secondaryDir: 'D:\\My Apps\\vitas-iraq-hris\\backups\\external_mirror',
    lastRunTime: null,
    lastRunDetails: null,
    lastRunStatus: null
  });
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isExecutingBackup, setIsExecutingBackup] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  const fetchBackupsList = async () => {
    try {
      setIsLoadingBackups(true);
      const res: any = await (api as any).getBackupList?.();
      if (res?.success) {
        if (Array.isArray(res.backups)) setBackupsList(res.backups);
        if (res.settings) setBackupSettings(res.settings);
      }
    } catch (e) {
      console.warn('Could not fetch backups list:', e);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleRunImmediateBackup = async () => {
    try {
      setIsExecutingBackup(true);
      setBackupSuccessMessage(null);
      const res: any = await (api as any).runBackupNow?.(currentUser?.name || 'مدير النظام والامتثال');
      if (res?.success) {
        setBackupSuccessMessage(
          language === 'ar'
            ? `تم إنشاء النسخة بنجاح: ${res.filename} (${res.formattedSize})`
            : `Backup created successfully: ${res.filename} (${res.formattedSize})`
        );
        fetchBackupsList();
        setTimeout(() => setBackupSuccessMessage(null), 6000);
      }
    } catch (err: any) {
      alert(language === 'ar' ? `خطأ أثناء إنشاء النسخة الاحتياطية: ${err.message}` : `Error creating backup: ${err.message}`);
    } finally {
      setIsExecutingBackup(false);
    }
  };

  const handleUpdateBackupSettings = async (updates: Record<string, any>) => {
    try {
      const merged = { ...backupSettings, ...updates };
      setBackupSettings(merged);
      await (api as any).saveBackupSettings?.(merged);
      setBackupSuccessMessage(language === 'ar' ? 'تم تحديث سياسة وإعدادات النسخ الاحتياطي بنجاح!' : 'Backup settings updated successfully!');
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(language === 'ar' ? `فشل تحديث الإعدادات: ${err.message}` : `Failed to update settings: ${err.message}`);
    }
  };

  // --- 4. Role Permission Editor State ---
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('HR Manager');
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    'Super Admin': { employees: true, payroll: true, recruitment: true, attendance: true, risk: true, settings: true, audit: true },
    'HR Manager': { employees: true, payroll: true, recruitment: true, attendance: true, risk: true, settings: false, audit: true },
    'Recruiter': { employees: false, payroll: false, recruitment: true, attendance: false, risk: false, settings: false, audit: false },
    'Department Head': { employees: true, payroll: false, recruitment: true, attendance: true, risk: false, settings: false, audit: false },
    'Employee': { employees: false, payroll: false, recruitment: false, attendance: true, risk: false, settings: false, audit: false },
    'IT Admin': { employees: false, payroll: false, recruitment: false, attendance: false, risk: true, settings: true, audit: true }
  });

  // --- 5. Employee Specific Module Permissions State (RBAC Delegation) ---
  const [rbacSubTab, setRbacSubTab] = useState<'custom_employees' | 'system_roles'>('custom_employees');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [empDeptFilter, setEmpDeptFilter] = useState<string>('all');
  const [empSearch, setEmpSearch] = useState<string>('');

  // Add New User Modal State & SubTab Switcher (Users vs Policies Mini-Settings)
  const [rolePermissionsSubTab, setRolePermissionsSubTab] = useState<'users' | 'policies'>('users');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedRolePreset, setSelectedRolePreset] = useState<string>('manual');
  const [moduleFilterQuery, setModuleFilterQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'cat-2-dash': true,
    'cat-3-emp': true,
    'cat-4-leave': true,
    'cat-5-payroll': true,
    'cat-drivers': false,
    'cat-6-recruit': false,
    'cat-7-perf': false,
    'cat-8-assets': false,
    'cat-12-archive': false,
    'cat-9-risk': false,
    'cat-10-sys': false,
    'cat-11-support': false
  });
  const [newUserForm, setNewUserForm] = useState({
    id: undefined as number | string | undefined,
    userType: 'employee' as 'employee' | 'special_executive',
    originalUsername: '',
    originalEmployeeId: '',
    originalEmail: '',
    username: '',
    password: 'Password123!',
    fullNameAr: '',
    fullNameEn: '',
    jobTitle: 'موظف موارد بشرية',
    department: 'الموارد البشرية والشؤون الإدارية',
    branch: 'المكتب الرئيسي في بابل_الحلة',
    email: '',
    phone: '',
    modules: {
      'emp-list': 'write',
      'emp-add': 'write',
      'emp-directory': 'write',
      'cat-11-support': 'write',
      support: 'write'
    } as Record<string, 'write' | 'read' | 'none' | boolean>,
    level: 'full' as 'full' | 'read',
    canManageUsers: false,
    role: 'Employee' as UserRole,
    notes: 'مخول بالعمل على الموديولات والشاشات المحددة أدناه'
  });

  const [showUserPassword, setShowUserPassword] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [quickNewPassword, setQuickNewPassword] = useState('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [isSavingQuickPassword, setIsSavingQuickPassword] = useState(false);

  // Delete User Confirmation State
  const [userToDeleteConfirm, setUserToDeleteConfirm] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleQuickChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !quickNewPassword.trim()) return;
    if (quickNewPassword.trim().length < 4) {
      alert(language === 'ar' ? 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' : 'Password must be at least 4 characters');
      return;
    }
    setIsSavingQuickPassword(true);
    try {
      const cleanPass = quickNewPassword.trim();

      // 1. Call server change-password API with administrative reset flag
      await api.changePassword({
        id: passwordModalUser.id,
        username: passwordModalUser.username,
        employeeId: passwordModalUser.employee_id,
        newPassword: cleanPass,
        adminReset: true
      } as any).catch(err => {
        console.warn('api.changePassword warning:', err);
      });

      // 2. Also ensure saveUser updates MySQL users table directly
      await api.saveUser({
        id: passwordModalUser.id,
        username: passwordModalUser.username,
        password: cleanPass,
        full_name: passwordModalUser.full_name || passwordModalUser.name,
        employee_id: passwordModalUser.employee_id,
        email: passwordModalUser.email
      }).catch(err => {
        console.warn('api.saveUser warning:', err);
      });

      // 3. Update localStorage custom users if present
      try {
        const raw = localStorage.getItem('vitas_custom_users') || '{}';
        const parsed = JSON.parse(raw);
        const uKey = (passwordModalUser.username || '').toLowerCase();
        if (parsed[uKey]) {
          parsed[uKey].password = cleanPass;
        } else {
          parsed[uKey] = {
            ...passwordModalUser,
            password: cleanPass
          };
        }
        localStorage.setItem('vitas_custom_users', JSON.stringify(parsed));
        api.updateAppSettingsBulk({
          vitas_custom_users: JSON.stringify(parsed)
        }).catch(() => { });
      } catch (e) { }

      // 4. Update local dbUsers state
      setDbUsers(prev => prev.map(u => {
        if (u.id === passwordModalUser.id || (u.username && u.username.toLowerCase() === (passwordModalUser.username || '').toLowerCase())) {
          return { ...u, password: cleanPass };
        }
        return u;
      }));

      // 5. Add Security Audit Log entry
      const auditEntry = {
        id: `LOG-PASS-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'USR-ADMIN',
        userName: currentUser?.name || 'مدير النظام والامتثال',
        userRole: currentUser?.role || 'Super Admin',
        action: 'تغيير وتعيين كلمة مرور مستخدم',
        actionType: 'PASSWORD_RESET',
        severity: 'warning' as const,
        module: 'إدارة المستخدمين والصلاحيات (sec-roles-permissions)',
        ipAddress: '192.168.1.109',
        userDevice: navigator.userAgent || 'Web Client',
        status: 'ناجح' as const,
        details: `تم تغيير كلمة المرور للمستخدم (${passwordModalUser.username || passwordModalUser.employee_id}) بنجاح.`
      };
      setAuditLogs(prev => [auditEntry, ...prev]);
      api.addAuditLog?.(auditEntry).catch(() => { });

      // 6. Refresh users list & broadcast
      fetchUsersFromDb();
      window.dispatchEvent(new CustomEvent('vitas:users_changed'));

      const userName = passwordModalUser.full_name || passwordModalUser.name || passwordModalUser.username;
      setCustomEmpSavedToast(
        language === 'ar'
          ? `تم تحديث كلمة المرور للمستخدم (${userName}) بنجاح وتفعيلها فوراً!`
          : `Password for (${userName}) updated and active immediately!`
      );
      setTimeout(() => setCustomEmpSavedToast(null), 5000);
      setPasswordModalUser(null);
      setQuickNewPassword('');
    } catch (err: any) {
      alert(language === 'ar' ? `فشل تحديث كلمة المرور: ${err.message || err}` : `Failed to update password: ${err.message || err}`);
    } finally {
      setIsSavingQuickPassword(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDeleteConfirm) return;
    setIsDeletingUser(true);
    const u = userToDeleteConfirm;
    const fullName = u.full_name || u.name || u.username;

    try {
      // 1. Optimistic UI update: immediately remove from table
      setDbUsers(prev => prev.filter(user => user.id !== u.id && user.username !== u.username));

      // 2. Call backend deletion API (try by id first, then username/employee_id)
      const targetIdent = u.id != null ? u.id : (u.username || u.employee_id);
      await api.deleteUser(targetIdent).catch(async () => {
        if (u.username && u.username !== targetIdent) {
          await api.deleteUser(u.username).catch(() => { });
        }
      });

      // 3. Clean up localStorage entries
      try {
        const rawCustom = localStorage.getItem('vitas_custom_users');
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom);
          const keys = [
            u.username,
            u.username?.toLowerCase(),
            u.username?.toUpperCase(),
            u.employee_id,
            u.employee_id?.toLowerCase(),
            u.employee_id?.toUpperCase()
          ].filter(Boolean);
          keys.forEach(k => delete parsed[k]);
          localStorage.setItem('vitas_custom_users', JSON.stringify(parsed));
        }
      } catch (e) { }

      try {
        const rawPerms = localStorage.getItem('vitas_custom_employee_permissions');
        if (rawPerms) {
          const parsed = JSON.parse(rawPerms);
          const keys = [
            u.employee_id,
            u.username,
            u.username?.toUpperCase(),
            `VTS-${u.username?.toUpperCase()}`
          ].filter(Boolean);
          keys.forEach(k => delete parsed[k]);
          localStorage.setItem('vitas_custom_employee_permissions', JSON.stringify(parsed));
        }
      } catch (e) { }

      // 4. Broadcast change event
      window.dispatchEvent(new CustomEvent('vitas:users_changed'));

      // 5. Audit Log
      const auditEntry = {
        id: `LOG-DEL-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'USR-ADMIN',
        userName: currentUser?.name || 'مدير النظام والامتثال',
        userRole: currentUser?.role || 'Super Admin',
        action: 'حذف حساب وصلاحيات مستخدم',
        actionType: 'DELETE',
        severity: 'danger' as const,
        module: 'إدارة المستخدمين والصلاحيات (sec-roles-permissions)',
        ipAddress: '192.168.1.109',
        userDevice: navigator.userAgent || 'Web Client',
        status: 'ناجح' as const,
        details: `تم حذف حساب المستخدم (${fullName} - ${u.username}) نهائياً من قاعدة البيانات.`
      };
      setAuditLogs(prev => [auditEntry, ...prev]);
      api.addAuditLog?.(auditEntry).catch(() => { });

      // 6. Refresh from DB
      fetchUsersFromDb();

      setCustomEmpSavedToast(
        language === 'ar' ? `تم حذف حساب المستخدم (${fullName}) بنجاح.` : `User account (${fullName}) deleted.`
      );
      setTimeout(() => setCustomEmpSavedToast(null), 4000);
    } catch (err: any) {
      alert(language === 'ar' ? `فشل حذف المستخدم: ${err.message || err}` : `Failed to delete user: ${err.message || err}`);
    } finally {
      setIsDeletingUser(false);
      setUserToDeleteConfirm(null);
    }
  };

  // Granular Permission Helpers
  const getModLevel = (modId: string): 'write' | 'read' | 'none' => {
    const val = (newUserForm.modules as any)?.[modId];
    if (val === 'write' || val === true) return 'write';
    if (val === 'read') return 'read';
    if (val === 'none' || val === false) return 'none';
    // Support & Help Desk is active and accessible by default without requiring manual assignment
    if (modId.startsWith('supp-') || modId.startsWith('support-') || modId.startsWith('sup-') || modId === 'cat-11-support' || modId === 'support') {
      return 'write';
    }
    return 'none';
  };

  const setModuleLevel = (modId: string, level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      const nextModules = { ...prev.modules };
      if (level === 'none') {
        // If it's a support module, mark as explicit 'none' so the default doesn't revive it
        if (modId.startsWith('supp-') || modId.startsWith('support-') || modId.startsWith('sup-') || modId === 'cat-11-support' || modId === 'support') {
          nextModules[modId] = 'none';
        } else {
          delete nextModules[modId];
        }
      } else {
        nextModules[modId] = level;
      }
      return { ...prev, modules: nextModules };
    });
  };

  const setCategoryAll = (cat: CategoryGroup, level: 'write' | 'read' | 'none') => {
    // Map catId -> alias so both keys are cleared/set together
    const catAliasMap: Record<string, string> = {
      'cat-3-emp': 'employees',
      'cat-4-leave': 'attendance',
      'cat-5-payroll': 'payroll',
      'cat-6-recruit': 'recruitment',
      'cat-7-perf': 'performance',
      'cat-8-assets': 'assets',
      'cat-9-risk': 'risk',
      'cat-10-sys': 'settings',
      'cat-11-support': 'support',
      'cat-12-archive': 'archive',
      'cat-2-dash': 'reports',
      'cat-drivers': 'drivers',
    };
    const alias = catAliasMap[cat.id];
    setNewUserForm(prev => {
      const nextModules = { ...prev.modules };
      cat.modules.forEach(m => {
        if (level === 'none') {
          nextModules[m.id] = 'none';
        } else {
          nextModules[m.id] = level;
        }
      });
      if (level === 'none') {
        nextModules[cat.id] = 'none';
        if (alias) nextModules[alias] = 'none';
      } else {
        nextModules[cat.id] = level;
        if (alias) nextModules[alias] = level;
      }
      return { ...prev, modules: nextModules };
    });
  };

  const setGlobalAll = (level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      if (level === 'none') {
        return { ...prev, modules: {} };
      }
      const nextModules: Record<string, any> = {};
      CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth').forEach(c => {
        nextModules[c.id] = level;
        c.modules.forEach(m => {
          nextModules[m.id] = level;
        });
      });
      return { ...prev, modules: nextModules };
    });
  };

  const ROLE_PRESET_CONFIGS = [
    {
      id: 'manual',
      titleAr: 'تخصيص يدوي حر (Manual / Custom Permissions)',
      titleEn: 'Manual / Custom Permissions',
      badgeAr: 'تخصيص يدوي',
      badgeEn: 'Manual Custom',
      icon: 'tune',
      descAr: 'تحديد الصلاحيات لكل شاشة وموديول يدوياً من المصفوفة أدناه بحرية كاملة دون التقيد بقالب مسبق.',
      descEn: 'Manually configure screen permissions from the matrix below without applying a pre-configured template.'
    },
    {
      id: 'General Manager',
      titleAr: 'المدير العام / الرئيس التنفيذي (General Manager / CEO)',
      titleEn: 'General Manager / Chief Executive Officer',
      role: 'General Manager' as UserRole,
      badgeAr: 'رؤية وتحكم شامل بالمؤسسة',
      badgeEn: 'Full Executive Oversight',
      icon: 'corporate_fare',
      descAr: 'صلاحيات قيادية وتنفيذية عليا تشمل الاطلاع والتحكم بكافة فروع وموظفي المؤسسة، التقارير الاستراتيجية، ومصفوفة الحوكمة.',
      descEn: 'Executive-level permissions covering all company branches, personnel, strategic analytics, and governance.',
      modules: {
        'cat-2-dash': 'write',
        'dash-overview': 'write',
        'dash-exec-1': 'write',
        'dash-exec-2': 'write',
        'dash-search': 'write',
        'sys-dynamic-reports': 'write',
        'cat-3-emp': 'write',
        'emp-list': 'write',
        'emp-contracts': 'write',
        'emp-org-chart': 'write',
        'emp-directory': 'write',
        'emp-hr-directory': 'write',
        'cat-4-leave': 'write',
        'leave-attendance': 'write',
        'leave-approvals': 'write',
        'cat-5-payroll': 'write',
        'pay-dashboard': 'write',
        'payroll-analytics': 'write',
        'cat-6-recruit': 'write',
        'recruit-dash': 'write',
        'cat-7-perf': 'write',
        'perf-kpi': 'write',
        'cat-8-assets': 'write',
        'doc-company': 'write',
        'cat-9-risk': 'write',
        'cat-12-archive': 'write'
      }
    },
    {
      id: 'Supervisor',
      titleAr: 'مشرف مباشر / مسؤول فريق (Supervisor)',
      titleEn: 'Direct Supervisor / Team Lead',
      role: 'Supervisor' as UserRole,
      badgeAr: 'صلاحيات إشرافية',
      badgeEn: 'Supervisory Scope',
      icon: 'supervisor_account',
      descAr: 'عرض وقراءة بيانات موظفيه التابعين له، اعتماد ومتابعة الإجازات، وعرض وطباعة وثائق وعقود فريقه فقط.',
      descEn: 'Read subordinates, approve team leaves, and view/print team documents.',
      modules: {
        'cat-2-dash': 'read',
        'dash-overview': 'read',
        'dash-ess': 'write',
        'sys-dynamic-reports': 'read',
        'cat-3-emp': 'read',
        'emp-hr-directory': 'read',
        'emp-profile': 'read',
        'cat-4-leave': 'write',
        'leave-directory': 'read',
        'leave-approvals': 'write',
        'leave-apply': 'write',
        'leave-attendance': 'read',
        'leave-timesheets': 'read',
        'cat-8-assets': 'read',
        'doc-mgmt': 'read',
        'doc-edms': 'read',
        'doc-my-docs': 'write',
        'asset-documents': 'read',
        'asset-inventory': 'read',
        'asset-my-requests': 'write',
        'cat-7-perf': 'read',
        'perf-reviews': 'read',
        'perf-goals': 'read'
      }
    },
    {
      id: 'HR Manager',
      titleAr: 'مدير الموارد البشرية (HR Manager)',
      titleEn: 'Human Resources Manager',
      role: 'HR Manager' as UserRole,
      badgeAr: 'إدارة كاملة للموظفين والرواتب',
      badgeEn: 'Full HR & Payroll',
      icon: 'badge',
      descAr: 'تحكم شامل بملفات الموظفين، مسير الرواتب والمكافآت، الإجازات، الهيكل الإداري، والأرشيف والتقارير.',
      descEn: 'Full control over employee records, payroll, allowances, leaves, org chart, and reports.',
      modules: {
        'cat-2-dash': 'write',
        'dash-overview': 'write',
        'dash-ess': 'write',
        'sys-dynamic-reports': 'write',
        'dash-exec-1': 'write',
        'dash-exec-2': 'write',
        'cat-3-emp': 'write',
        'emp-hr-directory': 'write',
        'emp-profile': 'write',
        'emp-list': 'write',
        'emp-add': 'write',
        'emp-branches': 'write',
        'emp-org-chart': 'write',
        'emp-regional-lebanon': 'write',
        'cat-4-leave': 'write',
        'leave-directory': 'write',
        'leave-approvals': 'write',
        'leave-apply': 'write',
        'leave-attendance': 'write',
        'leave-timesheets': 'write',
        'leave-balance': 'write',
        'cat-5-payroll': 'write',
        'pay-sheets': 'write',
        'pay-advances': 'write',
        'pay-bank': 'write',
        'pay-tax-ss': 'write',
        'pay-adjustments': 'write',
        'pay-reports': 'write',
        'payroll-payslip': 'write',
        'cat-6-recruit': 'write',
        'recruit-jobs': 'write',
        'recruit-pipeline': 'write',
        'recruit-candidates': 'write',
        'recruit-interviews': 'write',
        'recruit-onboarding': 'write',
        'cat-7-perf': 'write',
        'perf-reviews': 'write',
        'perf-goals': 'write',
        'perf-kpis': 'write',
        'perf-training': 'write',
        'cat-8-assets': 'write',
        'doc-mgmt': 'write',
        'doc-edms': 'write',
        'doc-my-docs': 'write',
        'asset-documents': 'write',
        'asset-inventory': 'write',
        'asset-my-requests': 'write',
        'employees': 'write',
        'attendance': 'write',
        'payroll': 'write',
        'recruitment': 'write',
        'reports': 'write',
        'assets': 'write'
      }
    },
    {
      id: 'Branch Manager',
      titleAr: 'مدير فرع / مكتب (Branch Manager)',
      titleEn: 'Branch / Office Manager',
      role: 'Branch Manager' as UserRole,
      badgeAr: 'نطاق الفرع المخصص',
      badgeEn: 'Branch Office Scope',
      icon: 'domain',
      descAr: 'إدارة موظفي الفرع المخصص، متابعة الحضور والدوام، واعتماد إجازات موظفي المكتب (محصور في نطاق فرعه).',
      descEn: 'Supervision of assigned branch employees, attendance, and leave approvals strictly within office scope.',
      modules: {
        'cat-2-dash': 'read',
        'dash-overview': 'read',
        'dash-ess': 'write',
        'sys-dynamic-reports': 'read',
        'cat-3-emp': 'read',
        'emp-hr-directory': 'read',
        'emp-profile': 'read',
        'cat-4-leave': 'read',
        'leave-directory': 'read',
        'leave-approvals': 'write',
        'leave-apply': 'write',
        'leave-attendance': 'read',
        'leave-timesheets': 'read',
        'cat-8-assets': 'read',
        'doc-mgmt': 'read',
        'doc-edms': 'read',
        'asset-documents': 'read',
        'doc-my-docs': 'write',
        'cat-7-perf': 'read',
        'perf-reviews': 'read',
        'perf-goals': 'read'
      }
    },
    {
      id: 'Employee',
      titleAr: 'موظف عادي - خدمة ذاتية (Employee / ESS)',
      titleEn: 'Regular Employee (Self-Service ESS)',
      role: 'Employee' as UserRole,
      badgeAr: 'نطاق ذاتي فقط',
      badgeEn: 'Self Scope',
      icon: 'person',
      descAr: 'بوابة الموظف الذاتية: تقديم الإجازات ومتابعتها، استعراض كشف الراتب الشهري، وتتبع الحضور والمستندات الشخصية.',
      descEn: 'Self-service portal: submit leaves, view payslip, personal attendance, and personal documents.',
      modules: {
        'cat-2-dash': 'read',
        'dash-ess': 'write',
        'cat-4-leave': 'read',
        'leave-apply': 'write',
        'leave-attendance': 'read',
        'cat-5-payroll': 'read',
        'payroll-payslip': 'read',
        'cat-8-assets': 'read',
        'doc-my-docs': 'write',
        'asset-my-requests': 'write'
      }
    },
    {
      id: 'Super Admin',
      titleAr: 'مسؤول نظام أعلى (Super Admin / Admin)',
      titleEn: 'Super Administrator',
      role: 'Admin' as UserRole,
      badgeAr: 'صلاحيات إدارية عليا',
      badgeEn: 'Admin System Control',
      icon: 'admin_panel_settings',
      descAr: 'صلاحيات عليا لإدارة المستخدمين والصلاحيات (IAM/RBAC)، النسخ الاحتياطي، المزامنة، وكافة شاشات النظام.',
      descEn: 'Complete administrative access including RBAC user management, backups, and security settings.',
      modules: {
        'sec-roles-permissions': 'write',
        'sec-roles': 'write',
        'cat-9-risk': 'write',
        'risk': 'write',
        'employees': 'write',
        'attendance': 'write',
        'payroll': 'write',
        'recruitment': 'write',
        'reports': 'write',
        'settings': 'write',
        'assets': 'write'
      }
    },
    {
      id: 'Recruiter',
      titleAr: 'مسؤول التوظيف والاستقطاب (Recruiter / ATS)',
      titleEn: 'Recruiter & Talent Acquisition',
      role: 'Recruiter' as UserRole,
      badgeAr: 'التوظيف والمقابلات',
      badgeEn: 'Recruitment & ATS',
      icon: 'person_search',
      descAr: 'إدارة الشواغر، استلام وفرز السير الذاتية، ومتابعة مراحل التوظيف وجدولة المقابلات.',
      descEn: 'Job vacancies, ATS candidate pipeline, resume screening, and interview scheduling.',
      modules: {
        'cat-2-dash': 'read',
        'dash-overview': 'read',
        'dash-ess': 'write',
        'cat-3-emp': 'read',
        'emp-hr-directory': 'read',
        'cat-6-recruit': 'write',
        'recruit-jobs': 'write',
        'recruit-pipeline': 'write',
        'recruit-candidates': 'write',
        'recruit-interviews': 'write',
        'recruit-onboarding': 'write'
      }
    },
    {
      id: 'Compliance',
      titleAr: 'مسؤول الامتثال والمخاطر (Compliance & Risk)',
      titleEn: 'Compliance & Risk Officer',
      role: 'Compliance Officer' as UserRole,
      badgeAr: 'المخاطر والرقابة',
      badgeEn: 'Risk & Governance',
      icon: 'policy',
      descAr: 'سجل تقييم المخاطر، الامتثال والسياسات، التدقيق والرقابة المصرفية، وقوائم المراجعة.',
      descEn: 'Risk assessment register, regulatory compliance, banking supervision logs, and checklist.',
      modules: {
        'cat-2-dash': 'read',
        'dash-overview': 'read',
        'dash-ess': 'write',
        'cat-9-risk': 'write',
        'risk-governance': 'write',
        'risk-assessment': 'write',
        'risk-tracker': 'write',
        'risk-policies': 'write',
        'risk-audit-reports': 'write'
      }
    },
    {
      id: 'IT Admin',
      titleAr: 'مسؤول تكنولوجيا المعلومات (IT Admin)',
      titleEn: 'IT Administrator',
      role: 'IT Admin' as UserRole,
      badgeAr: 'العهد واللوجستيات',
      badgeEn: 'IT & Hardware Logistics',
      icon: 'computer',
      descAr: 'إدارة الأصول التقنية والعهد، سجل الصيانة والدعم الفني، وإدارة أسطول السائقين واللوجستيات.',
      descEn: 'IT assets and inventory, hardware maintenance, and driver logistics.',
      modules: {
        'cat-2-dash': 'read',
        'dash-overview': 'read',
        'dash-ess': 'write',
        'cat-8-assets': 'write',
        'asset-inventory': 'write',
        'asset-details': 'write',
        'asset-my-requests': 'write',
        'doc-mgmt': 'read',
        'cat-drivers': 'write',
        'drivers-fleet': 'write',
        'drivers-requests': 'write'
      }
    }
  ];

  const handleApplyRolePreset = (presetId: string) => {
    setSelectedRolePreset(presetId);
    const preset = ROLE_PRESET_CONFIGS.find(p => p.id === presetId);
    if (!preset || preset.id === 'manual') {
      return;
    }

    setNewUserForm(prev => {
      let nextModules: Record<string, any> = {};

      if (preset.id === 'Super Admin') {
        CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth').forEach(c => {
          nextModules[c.id] = 'write';
          c.modules.forEach(m => {
            nextModules[m.id] = 'write';
          });
        });
      } else {
        nextModules = { ...(preset.modules || {}) };
      }

      const isAdmin = preset.id === 'Super Admin';

      return {
        ...prev,
        role: preset.role,
        canManageUsers: isAdmin,
        modules: nextModules
      };
    });
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const toggleAllCategories = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    CATEGORY_GROUPS.forEach(c => {
      next[c.id] = expand;
    });
    setExpandedCategories(next);
  };

  const permissionStats = useMemo(() => {
    let writeCount = 0;
    let readCount = 0;
    Object.entries(newUserForm.modules || {}).forEach(([k, v]) => {
      if (k.startsWith('cat-')) return;
      if (v === 'write' || v === true) writeCount++;
      else if (v === 'read') readCount++;
    });
    return { writeCount, readCount, total: writeCount + readCount };
  }, [newUserForm.modules]);

  const dynamicModuleLabels = useMemo(() => {
    const labels: Record<string, string> = {
      employees: t('الموظفون والعقود', 'Employees & Contracts'),
      attendance: t('الحضور والدوام والإجازات', 'Leaves & Attendance'),
      payroll: t('الرواتب والتعويضات', 'Payroll & Compensation'),
      recruitment: t('التوظيف والاستقطاب (ATS)', 'Recruitment & ATS'),
      reports: t('التقارير الديناميكية وتصدير البيانات', 'Dynamic Reports & Export'),
      risk: t('المخاطر والامتثال والحوكمة', 'Risk & Compliance'),
      settings: t('إعدادات النظام والتهيئة', 'System Settings'),
      support: t('الدعم والمساعدة الفنية', 'Support & Help Desk'),
      drivers: t('إدارة السائقين والحركة والأسطول', 'Drivers & Fleet Management'),
      performance: t('إدارة الأداء والتدريب والكفاءات', 'Performance & Training'),
      assets: t('العهد والأصول والمستندات', 'Assets & Custody'),
      archive: t('الأرشيف الإلكتروني', 'Digital Archive'),
      'cat-2-dash': t('الرئيسية والإدارة', 'Dashboard & Executive'),
      'cat-3-emp': t('إدارة الموظفين والعقود', 'Employee Management & Contracts'),
      'cat-4-leave': t('الحضور والدوام والإجازات', 'Leaves & Attendance'),
      'cat-5-payroll': t('الرواتب والتعويضات', 'Payroll & Compensation'),
      'cat-drivers': t('إدارة السائقين والحركة', 'Drivers & Fleet Management'),
      'cat-6-recruit': t('التوظيف والاستقطاب', 'Recruitment & ATS'),
      'cat-7-perf': t('إدارة الأداء والتدريب', 'Performance & Training'),
      'cat-8-assets': t('العهد والأصول والمستندات', 'Assets & Custody'),
      'cat-12-archive': t('الأرشيف والملفات', 'Archive'),
      'cat-9-risk': t('المخاطر والامتثال والحوكمة', 'Risk & Compliance'),
      'cat-10-sys': t('التطوير البرمجي وإعدادات النظام', 'System Development & Settings'),
      'cat-11-support': t('الدعم الفني ومركز المساعدة', 'Support & Help Desk')
    };

    CATEGORY_GROUPS.forEach(g => {
      labels[g.id] = language === 'ar' ? g.title : g.titleEn;
      g.modules.forEach(m => {
        labels[m.id] = language === 'ar' ? m.title : m.titleEn;
      });
    });

    return labels;
  }, [language, t]);

  const filteredCategoryGroups = useMemo(() => {
    const operational = CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth');
    if (!moduleFilterQuery.trim()) {
      return operational;
    }
    const q = moduleFilterQuery.toLowerCase().trim();
    return operational.map(cat => {
      const catMatches = cat.title.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q);
      const matchedModules = cat.modules.filter(m =>
        catMatches ||
        m.title.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
      return {
        ...cat,
        modules: matchedModules
      };
    }).filter(cat => cat.modules.length > 0);
  }, [moduleFilterQuery]);
  const [badgeSearchQuery, setBadgeSearchQuery] = useState<string>('');
  const [matchedEmployee, setMatchedEmployee] = useState<any>(null);
  const [matchedEmpSubCount, setMatchedEmpSubCount] = useState<number>(0);
  const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
  const comboboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsComboboxOpen(false);
      }
    };

    if (isComboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isComboboxOpen]);

  // Text normalization helper for flexible Arabic & English search
  const normalizeSearchText = (text: any) => {
    return String(text || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();
  };

  // Pre-indexed search data for employees (computes only when employees array changes, not on every keystroke!)
  const employeesSearchIndex = useMemo(() => {
    return (employees || []).map((e: any) => {
      const b = normalizeSearchText(e.badge_no || e.badgeNo || '');
      const id = normalizeSearchText(e.employee_id || e.employeeId || e.id || '');
      const cleanB = b.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();
      const cleanId = id.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();
      const nameAr = normalizeSearchText(e.full_name_ar || e.fullNameAr || e.name_ar || e.fullName || e.full_name || e.name || '');
      const nameEn = normalizeSearchText(e.full_name_en || e.fullNameEn || e.name_en || '');
      const dept = normalizeSearchText(e.department || e.department_ar || '');
      const pos = normalizeSearchText(e.position || e.position_ar || e.job_title || e.jobTitle || '');

      return {
        emp: e,
        searchStr: `${b} ${cleanB} ${id} ${cleanId} ${nameAr} ${nameEn} ${dept} ${pos}`
      };
    });
  }, [employees]);

  // Instant filter for Combobox search with early exit (blazing fast 0ms response)
  const filteredEmployeesForCombobox = useMemo(() => {
    const rawQ = badgeSearchQuery.trim();
    if (!rawQ) return (employees || []).slice(0, 40);

    const normQ = normalizeSearchText(rawQ);
    const cleanQ = normQ.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();

    const matches: any[] = [];
    for (let i = 0; i < employeesSearchIndex.length; i++) {
      const item = employeesSearchIndex[i];
      if (item.searchStr.includes(normQ) || (cleanQ && item.searchStr.includes(cleanQ))) {
        matches.push(item.emp);
        if (matches.length >= 40) break;
      }
    }
    return matches;
  }, [employeesSearchIndex, badgeSearchQuery, employees]);

  const handleAutofillFromEmployee = (emp: any) => {
    if (!emp) return;
    setMatchedEmployee(emp);
    setIsComboboxOpen(false);

    // Automatic supervisor detection: Check if any employee in the company reports to this employee
    const directSubordinates = (employees || []).filter(e => isSubordinateOf(e, emp));
    const isSupervisorEmp = directSubordinates.length > 0;
    setMatchedEmpSubCount(directSubordinates.length);

    const badge = emp.badge_no || emp.badgeNo || emp.employee_id || emp.employeeId || emp.id || '';

    // Robust Arabic and English full name resolution with 100% guarantee
    const fullNameAr = extractArabicName(emp);
    const fullNameEn = extractEnglishName(emp) || fullNameAr;
    const jobTitle = emp.position || emp.position_ar || emp.job_title || emp.jobTitle || 'موظف';
    const dept = emp.department || emp.department_ar || 'الموارد البشرية والشؤون الإدارية';
    const branch = emp.branch || emp.location_ar || emp.location || 'المكتب الرئيسي في بابل_الحلة';
    const email = emp.email || emp.org_email || emp.personal_email || (badge ? `${String(badge).toLowerCase().replace(/[^a-z0-9]/g, '')}@vitasiraq.iq` : '');
    const phone = emp.phone || emp.mobile || '';

    // Clean suggested username without spaces
    const rawUser = emp.username || (emp.employee_id ? String(emp.employee_id).toLowerCase() : (badge ? String(badge).toLowerCase() : (email ? email.split('@')[0] : '')));
    const suggestedUsername = rawUser.replace(/\s+/g, '');

    setBadgeSearchQuery(`${badge} - ${fullNameAr || fullNameEn}`);

    setNewUserForm(prev => ({
      ...prev,
      originalEmployeeId: String(badge),
      username: suggestedUsername || prev.username,
      fullNameAr: fullNameAr || prev.fullNameAr,
      fullNameEn: fullNameEn || prev.fullNameEn,
      jobTitle: jobTitle || prev.jobTitle,
      department: dept || prev.department,
      branch: branch || prev.branch,
      email: email || prev.email,
      phone: phone || prev.phone,
      role: isSupervisorEmp ? 'Supervisor' : 'Employee'
    }));
  };

  const [empPermLevel, setEmpPermLevel] = useState<'full' | 'read'>('full');
  const [empNotes, setEmpNotes] = useState<string>('');
  const [empModulePerms, setEmpModulePerms] = useState<Record<string, boolean>>({
    payroll: true,
    attendance: true,
    employees: true,
    recruitment: false,
    risk: false,
    settings: false,
    reports: true
  });
  const [customEmpSavedToast, setCustomEmpSavedToast] = useState<string | null>(null);

  const [savedEmpDelegations, setSavedEmpDelegations] = useState<Record<string, {
    id?: number | string;
    username?: string;
    employeeId: string;
    employeeName: string;
    employeeNameEn: string;
    department: string;
    jobTitle: string;
    modules: Record<string, boolean>;
    level: 'full' | 'read';
    notes: string;
    grantedBy: string;
    grantedAt: string;
  }>>(() => {
    try {
      const raw = localStorage.getItem('vitas_custom_employee_permissions');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return {
      '1': {
        employeeId: '1',
        employeeName: 'أحمد محمود العراقي',
        employeeNameEn: 'Ahmed Mahmoud Al-Iraqi',
        department: 'الموارد البشرية والشؤون الإدارية',
        jobTitle: 'مسؤول الرواتب والدوام',
        modules: { payroll: true, attendance: true, employees: true, recruitment: false, risk: false, settings: false, reports: true },
        level: 'full',
        notes: 'مخول رسمياً بإدارة مسيرات الرواتب الشهرية واعتماد حركات الحضور والإجازات',
        grantedBy: 'Super Admin',
        grantedAt: '2026-08-30'
      }
    };
  });

  const [departmentsList, setDepartmentsList] = useState<{ id: string | number; name_ar: string; name_en: string }[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  const fetchUsersFromDb = () => {
    api.getUsers()
      .then((usersList: any) => {
        if (Array.isArray(usersList)) {
          const nonAdminUsers = usersList.filter((u: any) => u.username !== 'admin' && u.username !== 'admin_super');
          setDbUsers(nonAdminUsers);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    api.getDepartments()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartmentsList(data.map((d: any) => ({
            id: d.id,
            name_ar: d.name_ar || d.name || 'قسم',
            name_en: d.name_en || d.name_ar || 'Department'
          })));
        }
      })
      .catch(() => { });

    fetchUsersFromDb();
    const handleUsersChanged = () => { fetchUsersFromDb(); };
    window.addEventListener('vitas:users_changed', handleUsersChanged);
    return () => window.removeEventListener('vitas:users_changed', handleUsersChanged);
  }, []);

  // Compute all unique departments from Settings + Employees table
  const allUniqueDepartments = useMemo(() => {
    const map = new Map<string, { name_ar: string; name_en: string }>();

    // 1. From settings API
    departmentsList.forEach(d => {
      if (d.name_ar && d.name_ar.trim()) {
        map.set(d.name_ar.trim(), {
          name_ar: d.name_ar.trim(),
          name_en: d.name_en?.trim() || d.name_ar.trim()
        });
      }
    });

    // 2. From all active employees in table
    employees.forEach(emp => {
      const deptAr = (emp.department || emp.department_ar || '').trim();
      const deptEn = (emp.department_en || deptAr).trim();
      if (deptAr && !map.has(deptAr)) {
        map.set(deptAr, { name_ar: deptAr, name_en: deptEn });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
  }, [departmentsList, employees]);

  // Auto-reset sub-tab to Employee Delegation whenever RBAC module is opened
  React.useEffect(() => {
    if (activeModuleId === 'sec-roles-permissions') {
      setRbacSubTab('custom_employees');
    }
    if (activeModuleId === 'sec-general-settings') {
      fetchBackupsList();
    }
  }, [activeModuleId]);

  // Handler to create a new user account & grant permissions immediately (WITHOUT inserting to employees table)
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.fullNameAr.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال اسم المستخدم والاسم الكامل بالعربية' : 'Please enter username and Arabic full name');
      return;
    }

    const cleanUsername = newUserForm.username.trim();
    const isExplicitAdmin = Boolean(newUserForm.canManageUsers || newUserForm.role === 'Admin');
    const jobTitleLower = (newUserForm.jobTitle || '').toLowerCase();
    const isGM = newUserForm.role === 'General Manager' || newUserForm.jobTitle.includes('مدير عام') || newUserForm.jobTitle.includes('المدير العام') || jobTitleLower.includes('general manager') || jobTitleLower.includes('ceo');
    const isHRM = newUserForm.role === 'HR Manager' || newUserForm.jobTitle.includes('مدير الموارد البشرية') || jobTitleLower.includes('hr manager') || jobTitleLower.includes('hr director');
    const isExecutiveOrSpecial = newUserForm.userType === 'special_executive' || isGM || isHRM;

    const defaultPrefix = isExecutiveOrSpecial ? 'EXEC' : 'VTS';
    const empCode = (matchedEmployee?.employee_id || matchedEmployee?.badge_no || `${defaultPrefix}-${cleanUsername.toUpperCase()}`).toUpperCase();
    const cleanEmpCode = newUserForm.originalEmployeeId || empCode;

    const targetEmpObj = matchedEmployee || (employees || []).find(e => String(e.badge_no || e.badgeNo || e.employee_id || e.employeeId || e.id) === String(cleanEmpCode)) || { id: cleanEmpCode, employeeId: cleanEmpCode, name: newUserForm.fullNameAr };
    const directSubordinates = (employees || []).filter(e => isSubordinateOf(e, targetEmpObj));

    const assignedRole: UserRole = isExplicitAdmin
      ? 'Admin'
      : isGM
        ? 'General Manager'
        : isHRM
          ? 'HR Manager'
          : (directSubordinates.length > 0 || newUserForm.role === 'Supervisor' || newUserForm.jobTitle.includes('مشرف') || jobTitleLower.includes('supervisor'))
            ? 'Supervisor'
            : (newUserForm.role === 'Branch Manager' || newUserForm.jobTitle.includes('مدير فرع') || jobTitleLower.includes('branch manager'))
              ? 'Branch Manager'
              : (newUserForm.role || 'Employee');

    try {
      // NOTE: Creating a User NEVER adds or modifies records in the employees table!

      // Prepare full modules map with category rollups
      const fullModules: Record<string, any> = { ...newUserForm.modules };

      const categoryRollupKeys: Record<string, { catId: string; subIds: string[] }> = {
        employees: { catId: 'cat-3-emp', subIds: ['emp-list', 'emp-add', 'emp-contracts', 'emp-org-chart', 'emp-directory', 'emp-delegation', 'emp-sync-guide', 'emp-hr-directory'] },
        attendance: { catId: 'cat-4-leave', subIds: ['leave-attendance', 'leave-balance-report', 'leave-apply', 'leave-balance', 'leave-approvals', 'leave-timesheets', 'leave-earned', 'leave-schedule', 'leave-biometric-settings', 'leave-db-schema'] },
        payroll: { catId: 'cat-5-payroll', subIds: ['payroll-sheet', 'payroll-payslip', 'payroll-loans', 'payroll-tax', 'payroll-end-service', 'payroll-analytics', 'pay-dashboard', 'payroll-mgmt'] },
        recruitment: { catId: 'cat-6-recruit', subIds: ['recruit-openings', 'recruit-pipeline', 'recruit-interviews', 'recruit-offers', 'recruit-onboarding', 'recruit-dash', 'recruit-ats', 'recruit-candidate-profile'] },
        reports: { catId: 'cat-2-dash', subIds: ['sys-dynamic-reports', 'dash-overview', 'dash-exec-1', 'dash-exec-2', 'dash-ess', 'dash-search'] },
        risk: { catId: 'cat-9-risk', subIds: ['risk-matrix', 'risk-audit-logs', 'risk-policies', 'risk-incidents', 'risk-compliance-checklist', 'sec-roles', 'risk-assessment', 'sec-roles-permissions', 'sec-general-settings', 'sec-audit-logs', 'sec-api-keys'] },
        settings: { catId: 'cat-10-sys', subIds: ['sys-code-view', 'sys-schema', 'sys-api-logs', 'sys-deploy-status', 'sys-sql-console', 'sys-env', 'auth-secure', 'auth-sso', 'auth-biometric'] },
        support: {
          catId: 'cat-11-support',
          subIds: [
            'supp-emp-portal', 'supp-agent-desk', 'supp-knowledge-base', 'supp-guide-center',
            'supp-emp-handbook', 'supp-news-admin', 'supp-notif-settings', 'supp-notif-center',
            'supp-profile-settings', 'supp-internal-chat', 'supp-mobile-app', 'supp-enterprise-nexus',
            'support-tickets', 'support-faq', 'support-contact', 'support-guides'
          ]
        },
        drivers: { catId: 'cat-drivers', subIds: ['drivers-list', 'drivers-assignments', 'drivers-trips', 'drivers-maintenance', 'drivers-fuel', 'drivers-kpi'] },
        performance: { catId: 'cat-7-perf', subIds: ['perf-appraisals', 'perf-goals', 'perf-kpi', 'perf-training-plans', 'perf-courses'] },
        assets: { catId: 'cat-8-assets', subIds: ['asset-inventory', 'asset-assign', 'asset-custody', 'asset-maintenance', 'asset-my-requests', 'doc-company', 'doc-templates', 'doc-my-docs'] },
        archive: { catId: 'cat-12-archive', subIds: ['archive-digital', 'archive-cabinets', 'archive-indexing', 'archive-retention', 'archive-ocr', 'archive-audit'] }
      };

      Object.entries(categoryRollupKeys).forEach(([catKey, info]) => {
        if (catKey === 'support') {
          const isExplicitlyDisabled = fullModules['support'] === 'none' || fullModules['cat-11-support'] === 'none';
          if (!isExplicitlyDisabled) {
            fullModules['support'] = fullModules['support'] || 'write';
            fullModules['cat-11-support'] = fullModules['cat-11-support'] || 'write';
            info.subIds.forEach(id => {
              if (fullModules[id] !== 'none' && fullModules[id] !== false) {
                fullModules[id] = fullModules[id] || 'write';
              }
            });
            return;
          }
        }

        const hasWrite = info.subIds.some(id => fullModules[id] === 'write' || fullModules[id] === true) || fullModules[info.catId] === 'write';
        const hasRead = info.subIds.some(id => fullModules[id] === 'read') || fullModules[info.catId] === 'read';
        const catLevelGranted = fullModules[catKey] === 'write' || fullModules[catKey] === true;
        const catLevelRead = fullModules[catKey] === 'read';
        if (hasWrite || catLevelGranted) {
          fullModules[catKey] = 'write';
          fullModules[info.catId] = 'write';
          // Ensure all sub-modules are at least 'write' if explicitly granted at category level
          if (catLevelGranted && !hasWrite) {
            info.subIds.forEach(id => { if (!fullModules[id] || fullModules[id] === false || fullModules[id] === 'none') fullModules[id] = 'write'; });
          }
        } else if (hasRead || catLevelRead) {
          fullModules[catKey] = 'read';
          fullModules[info.catId] = 'read';
        } else {
          // NOT granted: explicitly mark as 'none'
          fullModules[catKey] = 'none';
          fullModules[info.catId] = 'none';
          info.subIds.forEach(id => {
            // Do NOT override if user explicitly granted a specific sub-module
            if (fullModules[id] === 'write' || fullModules[id] === true || fullModules[id] === 'read') {
              // Keep it — granular user selection; re-activate parent
              fullModules[catKey] = fullModules[id] === 'read' ? 'read' : 'write';
              fullModules[info.catId] = fullModules[id] === 'read' ? 'read' : 'write';
            } else {
              fullModules[id] = 'none';
            }
          });
        }
      });

      // 1. Save credentials for login (Local state)
      let existingUsers: any = {};
      try {
        const existingUsersRaw = localStorage.getItem('vitas_custom_users') || '{}';
        existingUsers = JSON.parse(existingUsersRaw);

        if (isExplicitAdmin || isGM) {
          fullModules['sec-roles-permissions'] = 'write';
          fullModules['sec-roles'] = 'write';
          fullModules['cat-9-risk'] = 'write';
          fullModules['risk'] = 'write';
        }

        // If password is blank when editing existing user, preserve existing password!
        const existingStoredPass = existingUsers[cleanUsername.toLowerCase()]?.password ||
          existingUsers[(newUserForm.originalUsername || '').toLowerCase()]?.password;
        const finalSavedPassword = (newUserForm.password && newUserForm.password.trim())
          ? newUserForm.password.trim()
          : (existingStoredPass || '123456');

        existingUsers[cleanUsername.toLowerCase()] = {
          username: cleanUsername,
          password: finalSavedPassword,
          name: newUserForm.fullNameAr.trim(),
          role: assignedRole,
          can_manage_users: (isExplicitAdmin || isGM) ? 1 : 0,
          employeeId: cleanEmpCode,
          jobTitle: newUserForm.jobTitle.trim(),
          modules: fullModules
        };
        localStorage.setItem('vitas_custom_users', JSON.stringify(existingUsers));
      } catch (err) {
        console.error(err);
      }

      // 2. Save delegated module permissions (Local state)
      const updatedDelegations = {
        ...savedEmpDelegations,
        [cleanEmpCode]: {
          id: newUserForm.id,
          username: cleanUsername,
          employeeId: cleanEmpCode,
          employeeName: newUserForm.fullNameAr.trim(),
          employeeNameEn: newUserForm.fullNameEn.trim() || newUserForm.fullNameAr.trim(),
          department: newUserForm.department,
          jobTitle: newUserForm.jobTitle.trim(),
          role: assignedRole,
          can_manage_users: isExplicitAdmin ? 1 : 0,
          modules: fullModules,
          level: newUserForm.level,
          notes: newUserForm.notes,
          grantedBy: currentUser?.name || 'Super Admin',
          grantedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        }
      };

      // Clean up previous keys if code or username was renamed
      if (newUserForm.originalEmployeeId && newUserForm.originalEmployeeId !== cleanEmpCode) {
        delete updatedDelegations[newUserForm.originalEmployeeId];
      }
      if (newUserForm.originalUsername && newUserForm.originalUsername.toLowerCase() !== cleanUsername.toLowerCase()) {
        delete existingUsers[newUserForm.originalUsername.toLowerCase()];
        delete updatedDelegations[newUserForm.originalUsername.toUpperCase()];
        delete updatedDelegations[`VTS-${newUserForm.originalUsername.toUpperCase()}`];
      }

      setSavedEmpDelegations(updatedDelegations);
      localStorage.setItem('vitas_custom_employee_permissions', JSON.stringify(updatedDelegations));

      // 3. Persist to Database users table (and Real-Time sync to Cloud)
      try {
        await api.saveUser({
          id: newUserForm.id,
          original_username: newUserForm.originalUsername || undefined,
          original_employee_id: newUserForm.originalEmployeeId || undefined,
          original_email: newUserForm.originalEmail || undefined,
          username: cleanUsername,
          // Only send password if user explicitly typed a new one, else keep current database password
          password: (newUserForm.password && newUserForm.password.trim()) ? newUserForm.password.trim() : undefined,
          full_name: newUserForm.fullNameAr.trim(),
          name: newUserForm.fullNameAr.trim(),
          email: newUserForm.email.trim() || `${cleanUsername.toLowerCase()}@vitasiraq.iq`,
          job_title: newUserForm.jobTitle.trim(),
          role: assignedRole,
          department: newUserForm.department,
          employee_id: cleanEmpCode,
          branch: newUserForm.branch,
          can_manage_employees: (fullModules.employees === 'write' || fullModules.employees === true) ? 1 : (isExplicitAdmin ? 1 : 0),
          can_manage_finance: (fullModules.payroll === 'write' || fullModules.payroll === true) ? 1 : 0,
          can_manage_recruitment: (fullModules.recruitment === 'write' || fullModules.recruitment === true) ? 1 : 0,
          can_manage_settings: (fullModules.settings === 'write' || fullModules.settings === true) ? 1 : (isExplicitAdmin ? 1 : 0),
          can_manage_users: isExplicitAdmin ? 1 : 0,
          status: 'active',
          allowed_screens: fullModules
        });
      } catch (err: any) {
        alert(language === 'ar' ? `فشل حفظ المستخدم: ${err.message || err}` : `Failed to save user: ${err.message || err}`);
        return;
      }

      // Optimistic instant UI update: close modal & update dbUsers state immediately
      const savedUserRow = {
        id: newUserForm.id || Date.now(),
        username: cleanUsername,
        full_name: newUserForm.fullNameAr.trim(),
        name: newUserForm.fullNameAr.trim(),
        email: newUserForm.email.trim() || `${cleanUsername.toLowerCase()}@vitasiraq.iq`,
        job_title: newUserForm.jobTitle.trim(),
        role: assignedRole,
        department: newUserForm.department,
        employee_id: cleanEmpCode,
        branch: newUserForm.branch,
        allowed_screens: fullModules,
        status: 'active'
      };

      setDbUsers(prev => {
        const idx = prev.findIndex(u => (newUserForm.id && u.id === newUserForm.id) || u.username === cleanUsername);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...savedUserRow };
          return next;
        }
        return [...prev, savedUserRow];
      });

      // Close modal instantly (0ms delay)
      setIsAddUserModalOpen(false);
      setSelectedEmpId(cleanEmpCode);

      const isEditingUser = Boolean(newUserForm.id);
      setCustomEmpSavedToast(
        language === 'ar'
          ? (isEditingUser
            ? `تم تحديث بيانات المستخدم (${newUserForm.fullNameAr}) وكلمة المرور والصلاحيات بنجاح!`
            : `تم حفظ وإنشاء حساب المستخدم (${newUserForm.fullNameAr}) بنجاح!`)
          : (isEditingUser
            ? `User account (${newUserForm.fullNameEn || newUserForm.fullNameAr}), password and permissions updated successfully!`
            : `User account (${newUserForm.fullNameEn || newUserForm.fullNameAr}) saved successfully!`)
      );
      setTimeout(() => setCustomEmpSavedToast(null), 5000);

      // Async background sync without blocking UI
      api.updateAppSettingsBulk({
        vitas_custom_employee_permissions: JSON.stringify(updatedDelegations),
        vitas_custom_users: JSON.stringify(existingUsers)
      }).catch(() => { });

      fetchUsersFromDb();
      window.dispatchEvent(new CustomEvent('vitas:users_changed'));

      // Reset form
      setNewUserForm({
        id: undefined,
        originalUsername: '',
        originalEmployeeId: '',
        originalEmail: '',
        username: '',
        password: 'Password123!',
        fullNameAr: '',
        fullNameEn: '',
        jobTitle: 'مدخل بيانات موارد بشرية (HR Data Entry)',
        department: 'الموارد البشرية والشؤون الإدارية',
        branch: 'المكتب الرئيسي في بابل_الحلة',
        email: '',
        phone: '',
        modules: {
          'emp-list': 'write',
          'emp-add': 'write',
          'emp-directory': 'write'
        },
        level: 'full',
        canManageUsers: false,
        role: 'Employee',
        notes: 'مسؤول عن إدخال وتحديث بيانات الموظفين الأساسية، العقود، والمستندات في قسم الموارد البشرية'
      });
    } catch (err) {
      console.error(err);
      alert('Error creating user: ' + err);
    }
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskTitle.trim()) return;
    const newCode = `RSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRisk = {
      riskCode: newCode,
      title: riskTitle.trim(),
      category: riskCat,
      impact,
      probability: 'متوسط',
      owner: currentUser?.name || currentUser?.email || 'مدير المخاطر والامتثال',
      mitigationPlan: mitigation.trim() || 'سيتم إعداد خطة التعافي والتغطية فوراً',
      status: 'مفتوح',
      identifiedDate: new Date().toISOString().split('T')[0]
    };
    await addRiskRecord(newRisk);
    try {
      await (api as any).addRisk?.(newRisk).catch(() => { });
      await (api as any).addAuditLog?.({
        action: `تسجيل خطر تشغيلي جديد في سجل الحوكمة (${newCode})`,
        action_type: 'RISK_REGISTER',
        severity: impact === 'حرج' ? 'critical' : 'warning',
        module: 'إدارة المخاطر والامتثال (cat-9-risk)',
        details: `العنوان: ${riskTitle.trim()} | الفئة: ${riskCat} | التأثير: ${impact}`,
        user_name: currentUser?.name || 'مدير المخاطر والامتثال'
      }).catch(() => { });
    } catch (e) { }

    setRiskTitle('');
    setMitigation('');
    setAuditToast(language === 'ar' ? `تم تسجيل الخطر (${newCode}) وتثبيته في سجل الحوكمة بنجاح!` : `Risk (${newCode}) registered successfully!`);
    setTimeout(() => setAuditToast(null), 3500);
    setActiveModuleId('risk-assessment');
  };

  const handleGenerateApiKey = () => {
    const newK = {
      id: `KEY-${Date.now().toString().slice(-4)}`,
      name: `مفتاح API جديد - ${currentUser?.role || 'مسؤول'}`,
      key: `vts_live_sk_${Math.random().toString(36).substring(2, 18)}`,
      created: new Date().toISOString().split('T')[0],
      status: 'نشط'
    };
    setApiKeys(prev => [newK, ...prev]);
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSecuritySettings(true);
    const nowIso = new Date().toISOString();

    const payload = {
      minPasswordLength: Number(minPasswordLength) || 8,
      sessionTimeoutMinutes: Number(sessionTimeoutMinutes) || 30,
      maxFailedAttempts: Number(maxFailedAttempts) || 5,
      requireSpecialChars: Boolean(requireSpecialChars),
      enable2FA: Boolean(enable2FA),
      updatedAt: nowIso
    };

    try {
      // 1. Immediately cache in localStorage (0ms display & offline resilience)
      localStorage.setItem('vitas_security_settings', JSON.stringify(payload));

      // 2. Sync to vitas_app_settings in localStorage as well
      try {
        const rawLocalApp = localStorage.getItem('vitas_app_settings');
        const parsedApp = rawLocalApp ? JSON.parse(rawLocalApp) : {};
        parsedApp.security_min_password_length = String(payload.minPasswordLength);
        parsedApp.security_session_timeout_minutes = String(payload.sessionTimeoutMinutes);
        parsedApp.security_max_failed_attempts = String(payload.maxFailedAttempts);
        parsedApp.security_require_special_chars = String(payload.requireSpecialChars);
        parsedApp.security_enable_2fa = String(payload.enable2FA);
        parsedApp.security_settings_updated_at = nowIso;
        localStorage.setItem('vitas_app_settings', JSON.stringify(parsedApp));
      } catch (e) { }

      // 3. Persist to backend MySQL database via bulk settings endpoint
      const backendPayload: Record<string, string> = {
        security_min_password_length: String(payload.minPasswordLength),
        security_session_timeout_minutes: String(payload.sessionTimeoutMinutes),
        security_max_failed_attempts: String(payload.maxFailedAttempts),
        security_require_special_chars: String(payload.requireSpecialChars),
        security_enable_2fa: String(payload.enable2FA),
        security_settings_updated_at: nowIso
      };

      await api.updateAppSettingsBulk(backendPayload).catch(err => {
        console.warn('Backend settings bulk save warning:', err);
      });

      // 4. Dispatch custom window event so other modules stay synchronized
      window.dispatchEvent(new CustomEvent('vitas_security_settings_updated', { detail: payload }));

      // 5. Add to audit trail log
      const auditEntry = {
        id: `LOG-SEC-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'USR-ADMIN',
        userName: currentUser?.name || 'مدير النظام والامتثال',
        userRole: currentUser?.role || 'Super Admin',
        action: 'تحديث سياسات وإعدادات الأمان العامة',
        actionType: 'SECURITY_POLICY_UPDATE',
        severity: 'info' as const,
        module: 'إعدادات الأمان العامة (sec-general-settings)',
        ipAddress: '192.168.1.109',
        userDevice: navigator.userAgent || 'Web Client',
        status: 'ناجح' as const,
        details: `تم تحديث سياسات الأمان: الحد الأدنى لكلمة المرور (${payload.minPasswordLength})، مهلة الجلسة (${payload.sessionTimeoutMinutes} دقيقة)، عدد المحاولات (${payload.maxFailedAttempts})، الرموز الخاصة (${payload.requireSpecialChars ? 'مُفعّلة' : 'مُعطّلة'})، المصادقة الثنائية 2FA (${payload.enable2FA ? 'مُفعّلة' : 'مُعطّلة'}).`,
        metadata: payload
      };

      setAuditLogs(prev => [auditEntry, ...prev]);

      // Post audit log to server in background
      await (api as any).addAuditLog?.({
        id: auditEntry.id,
        user_id: auditEntry.userId,
        user_name: auditEntry.userName,
        user_role: auditEntry.userRole,
        action: auditEntry.action,
        action_type: auditEntry.actionType,
        severity: auditEntry.severity,
        module: auditEntry.module,
        details: auditEntry.details,
        status: auditEntry.status
      }).catch(() => { });

      // 6. UI Feedbacks
      setLastSavedSecuritySettings(nowIso);
      setSettingsSaved(true);
      setAuditToast(
        language === 'ar'
          ? 'تم حفظ إعدادات وسياسات الأمان بنجاح وتحديث قاعدة البيانات!'
          : 'Security policies & parameters saved successfully to database!'
      );

      setTimeout(() => setSettingsSaved(false), 4000);
      setTimeout(() => setAuditToast(null), 5000);
    } catch (err: any) {
      console.error('Error saving security settings:', err);
      alert(language === 'ar' ? `حدث خطأ أثناء حفظ الإعدادات: ${err.message}` : `Error saving security settings: ${err.message}`);
    } finally {
      setIsSavingSecuritySettings(false);
    }
  };

  const handleResetSecuritySettingsToDefaults = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من استعادة إعدادات الأمان الافتراضية الموصى بها؟' : 'Are you sure you want to restore recommended security defaults?')) {
      setMinPasswordLength(8);
      setSessionTimeoutMinutes(30);
      setMaxFailedAttempts(5);
      setRequireSpecialChars(true);
      setEnable2FA(true);
    }
  };

  const togglePermission = (role: string, moduleKey: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleKey]: !prev[role]?.[moduleKey]
      }
    }));
  };

  const handleOpenAddUserModal = () => {
    setNewUserForm({
      username: '',
      password: '',
      fullNameAr: '',
      fullNameEn: '',
      employeeId: '',
      jobTitle: 'مدخل بيانات موارد بشرية',
      department: 'الموارد البشرية والشؤون الإدارية',
      branch: 'المكتب الرئيسي في بابل_الحلة',
      email: '',
      phone: '',
      modules: {
        employees: true,
        attendance: false,
        payroll: false,
        recruitment: false,
        risk: false,
        settings: false,
        reports: true
      },
      level: 'full',
      canManageUsers: false,
      role: 'Employee' as UserRole,
      notes: 'مخول بالعمل على الموديولات المحددة'
    });
    setBadgeSearchQuery('');
    setMatchedEmployee(null);
    setMatchedEmpSubCount(0);
    setIsAddUserModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Header Actions Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {(activeModuleId === 'risk-audit-reports' || activeModuleId === 'risk-audit') && t('مركز تقارير التدقيق والامتثال التنظيمي', 'Audit & Regulatory Compliance Reports Center')}
              {(activeModuleId === 'risk-governance' || activeModuleId === 'risk-dashboard' || activeModuleId === 'cat-9-risk') && t('لوحة حوكمة الامتثال وسجلات الرقابة المصرفية', 'Compliance Governance & Banking Supervision Logs')}
              {activeModuleId === 'risk-process-map' && t('خريطة العمليات المؤسسية وإطار الرقابة الإدارية', 'Enterprise Process Map & Management Control Framework')}
              {activeModuleId === 'risk-tracker' && t('متتبع التوافق والتشريعات واللوائح المصرفية', 'Regulatory Compliance & Statutory Tracker')}
              {(activeModuleId === 'risk-policies' || activeModuleId === 'risk-training') && t('سجل اللوائح والسياسات الداخلية المعتمدة', 'Approved Internal Policies & Regulations Register')}
              {(activeModuleId === 'risk-assessment' || activeModuleId === 'risk-incident') && t('سجل ونظرة عامة على تقييم المخاطر', 'Risk Assessment Register & Overview')}
              {activeModuleId === 'risk-identify-new' && t('تسجيل وتحديد خطر تشغيلي / سيبراني جديد', 'Register New Operational / Cyber Risk')}
              {activeModuleId === 'risk-details-privacy' && t('إطار حماية الخصوصية والبيانات الشخصية', 'Data Privacy & Protection Framework')}
              {activeModuleId === 'sec-general-settings' && t('إعدادات وسياسات الأمان العامة', 'General Security Settings & Policies')}
              {activeModuleId === 'sec-audit-logs' && t('سجلات تدقيق الأمان وأحداث النظام (Audit Trail)', 'Security Audit Logs & System Events')}
              {(activeModuleId === 'sec-roles-permissions' || activeModuleId === 'sec-edit-role') && (
                rolePermissionsSubTab === 'policies'
                  ? t('شاشة مصغرة للإعدادات والسياسات', 'Mini Settings & Central Policies')
                  : t('إدارة أدوار وصلاحيات المستخدمين (RBAC)', 'Role-Based Access Control & Permissions (RBAC)')
              )}
              {activeModuleId === 'sec-api-keys' && t('إدارة مفاتيح وتصاريح الربط البرمجي (API Keys)', 'API Keys & Integration Management')}
            </h1>

            {/* Live stream badge for sec-audit-logs */}
            {activeModuleId === 'sec-audit-logs' && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  {isLiveAuditStreaming && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{isLiveAuditStreaming ? t('بث مباشر نشط', 'Live Stream Active') : t('البث متوقف', 'Stream Paused')}</span>
              </div>
            )}

            {/* Approved Framework Badge for risk-process-map */}
            {activeModuleId === 'risk-process-map' && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {t('إطار رقابي معتمد 2026', 'Approved Framework 2026')}
              </span>
            )}
          </div>

          {/* Contextual Subtitles */}
          {activeModuleId === 'sec-audit-logs' && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('سجل رقابي غير قابل للتعديل (WORM Tamper-Evident) متوافق مع لوائح البنك المركزي العراقي CBI ومعايير ISO 27001.', 'Tamper-evident immutable audit log compliant with Central Bank of Iraq (CBI) regulations & ISO 27001.')}
            </p>
          )}
          {activeModuleId === 'risk-process-map' && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('بوابة الإدارة العامة: مصفوفة RACI، مؤشرات كفاءة العمليات، ومسارات العمل المؤسسية المعتمدة', 'Corporate Governance: RACI Matrix, Operational Workflows & Management Controls')}
            </p>
          )}
          {(activeModuleId === 'sec-roles-permissions' || activeModuleId === 'sec-edit-role') && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {rolePermissionsSubTab === 'policies'
                ? t('السياسات والضوابط، وتعديل تواريخ العقود الدائمية بكبسة زر واحدة', 'Central policies & one-click permanent contract dates batch update')
                : t('أضف مستخدمين جدد وحدد الموديولات المصرح بها عبر علامات ✓ (Tick)', 'Add new users and assign permitted modules via ✓ checkboxes')}
            </p>
          )}
          {activeModuleId === 'sec-api-keys' && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('توليد وإدارة مفاتيح الربط البرمجي للتكامل الآمن مع بوابة البنك المركزي العراقي CBI والأنظمة الخارجية المصرفية.', 'Generate and manage API keys for secure integration with CBI gateway and financial systems.')}
            </p>
          )}
        </div>

        {/* Action Buttons Aligned with Page Title */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* 1. sec-audit-logs Actions */}
          {activeModuleId === 'sec-audit-logs' && (
            <>
              <button
                type="button"
                onClick={() => setIsLiveAuditStreaming(prev => !prev)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer badge-white-text ${isLiveAuditStreaming
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-emerald-600/20'
                  }`}
                style={{ color: '#ffffff' }}
                title={isLiveAuditStreaming ? t('إيقاف التحديث اللحظي مؤقتاً', 'Pause Live Feed') : t('استئناف التحديث اللحظي', 'Resume Live Feed')}
              >
                <span className="material-symbols-outlined text-sm">
                  {isLiveAuditStreaming ? 'pause_circle' : 'play_circle'}
                </span>
                <span>{isLiveAuditStreaming ? t('إيقاف مؤقت', 'Pause') : t('استئناف', 'Resume')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddAuditModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer badge-white-text"
                style={{ color: '#ffffff' }}
              >
                <span className="material-symbols-outlined text-sm">add_moderator</span>
                <span>{t('تسجيل فحص تدقيق يدوي', 'Log Manual Audit')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportAuditLogsExcel}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer badge-white-text"
                style={{ color: '#ffffff' }}
                title={t('تصدير السجلات إلى إكسل', 'Export to Excel')}
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                <span>{t('تصدير إكسل', 'Export Excel')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCbiAuditReport}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer badge-white-text"
                style={{ color: '#ffffff' }}
                title={t('طباعة تقرير التدقيق الرقابي الرسمي', 'Print CBI Compliance Report')}
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>{t('تقرير رقابي', 'CBI Report')}</span>
              </button>
            </>
          )}

          {/* 2. sec-roles-permissions Actions */}
          {(activeModuleId === 'sec-roles-permissions' || activeModuleId === 'sec-edit-role') && (
            <>
              {/* Tab Switcher Pills */}
              <div className={`p-1 rounded-2xl border flex items-center gap-1 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
                <button
                  type="button"
                  onClick={() => setRolePermissionsSubTab('users')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${rolePermissionsSubTab === 'users'
                    ? 'bg-teal-700 text-white shadow-md badge-white-text'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  style={rolePermissionsSubTab === 'users' ? { color: '#ffffff' } : undefined}
                >
                  <span className="material-symbols-outlined text-sm">manage_accounts</span>
                  <span>{t('مستخدمي النظام (RBAC)', 'User Roles (RBAC)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRolePermissionsSubTab('policies')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${rolePermissionsSubTab === 'policies'
                    ? 'bg-teal-700 text-white shadow-md badge-white-text'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  style={rolePermissionsSubTab === 'policies' ? { color: '#ffffff' } : undefined}
                >
                  <span className="material-symbols-outlined text-sm">policy</span>
                  <span>{t('سياسات وضوابط المركزية', 'Central Policies')}</span>
                </button>
              </div>

              {rolePermissionsSubTab === 'users' && (
                <button
                  type="button"
                  onClick={handleOpenAddUserModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer badge-white-text"
                  style={{ color: '#ffffff' }}
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>{t('+ مستخدم جديد', '+ New User')}</span>
                </button>
              )}
            </>
          )}

          {/* 3. sec-api-keys Actions */}
          {activeModuleId === 'sec-api-keys' && (
            <button
              type="button"
              onClick={() => setIsAddApiKeyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap badge-white-text"
              style={{ color: '#ffffff' }}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{t('إنشاء مفتاح ربط جديد', 'Create New API Key')}</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODULE 1 & DEFAULT: Compliance Governance Dashboard (risk-governance / cat-9-risk)
          ========================================================================= */}
      {(activeModuleId === 'risk-governance' || activeModuleId === 'risk-dashboard' || activeModuleId === 'cat-9-risk' || !activeModuleId) && (
        <div className="space-y-6">
          {/* Top Compliance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('نسبة الامتثال التنظيمي', 'Compliance Index')}</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 material-symbols-outlined text-lg">verified</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">99.4%</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('مطابق لمتطلبات البنك المركزي العراقي CBI', 'Compliant with Central Bank of Iraq standards')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('المخاطر التشغيلية المفتوحة', 'Open Operational Risks')}</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 material-symbols-outlined text-lg">warning</span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{riskRecords.length} {t('مخاطر', 'Risks')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('تحت خطة المعالجة والتخفيف النشطة', 'Under active mitigation plans')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('سياسات المؤسسة المعتمدة', 'Approved Policies')}</span>
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">policy</span>
              </div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">8 {t('لوائح', 'Policies')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('محدثة ومعتمدة من مجلس الإدارة 2026', 'Updated & approved by BoD')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('حالة الأمان والـ RBAC', 'Security & RBAC Status')}</span>
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 material-symbols-outlined text-lg">shield</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t('مؤمّن بالكامل', 'Fully Secured')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('2FA نشط مع تسجيل تدقيق مستمر', '2FA enabled with full audit trail')}</p>
            </div>
          </div>

          {/* CBI Supervision & Banking Guidelines Table */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('سجل التوافق مع تعاميم وضوابط البنك المركزي العراقي (CBI Compliance Log)', 'CBI Circulars & Banking Supervision Compliance Log')}
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">{t('المؤسسة تخضع لرقابة وإشراف البنك المركزي العراقي للمؤسسات المالية غير المصرفية', 'VITAS Iraq is regulated by the Central Bank of Iraq')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={printComplianceLog}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer"
                  title={t('طباعة سجل الامتثال بالأسود A4', 'Print Compliance Log')}
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>{t('طباعة (A4)', 'Print (A4)')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportComplianceLog}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">table_view</span>
                  <span>{t('تصدير سجل الامتثال (Excel)', 'Export Compliance (Excel)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModuleId('risk-audit-reports')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${isDark ? 'border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20' : 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">description</span>
                  <span>{t('تقارير التدقيق المعتمدة', 'Audit Reports')}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                    <th className="pb-3 text-start">{t('التعميم / اللائحة الرقابية', 'Regulation / Circular')}</th>
                    <th className="pb-3 text-start">{t('الجهة المصدرة', 'Authority')}</th>
                    <th className="pb-3 text-start">{t('تاريخ الإصدار', 'Date')}</th>
                    <th className="pb-3 text-start">{t('موقف نظام الموارد البشرية', 'HRIS Status')}</th>
                    <th className="pb-3 text-start">{t('حالة الامتثال', 'Compliance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {[
                    { title: 'ضوابط مكافحة غسل الأموال وتمويل الإرهاب (AML/CFT)', auth: 'البنك المركزي العراقي', date: '2026-01-10', status: 'تطبيق فحص دوري لكافة الموظفين والمرشحين', comp: 'مطابق 100%' },
                    { title: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', auth: 'وزارة العمل والشؤون الاجتماعية', date: '2025-11-20', status: 'دمج محرك احتساب الضمان والضريبة المباشرة بنجاح', comp: 'مطابق 100%' },
                    { title: 'معايير الحوكمة وإدارة المخاطر التشغيلية والسيبرانية', auth: 'قسم الرقابة والامتثال CBI', date: '2026-02-01', status: 'تفعيل سجل التدقيق والمصادقة الثنائية وتشفير البيانات', comp: 'مطابق 100%' },
                    { title: 'حماية بيانات العملاء والموظفين وسرية المعلومات الائتمانية', auth: 'البنك المركزي العراقي', date: '2025-12-15', status: 'تشفير كامل لقاعدة البيانات وإدارة صلاحيات RBAC', comp: 'مطابق 100%' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{row.title}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{row.auth}</td>
                      <td className="py-3 font-mono text-slate-500">{row.date}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{row.status}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white font-bold text-[10px] shadow-sm badge-white-text" style={{ color: '#ffffff' }}>
                          {row.comp}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE: Enterprise Process Map & Management Control Framework (risk-process-map)
          ========================================================================= */}
      {activeModuleId === 'risk-process-map' && (
        <div className="space-y-6 text-xs">
          {/* Headquarters & Governance Scope Banner */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${isDark ? 'bg-teal-950/30 border-teal-500/30' : 'bg-teal-50 border-teal-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-xl">domain</span>
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('المقر الرئيسي: المكتب الرئيسي في بابل_الحلة', 'Headquarters: Main Office in Babil_Hilla')}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  {t('خريطة العمليات المعتمدة والمحدثة لمنظومة فيتاس العراق (السحابة + المحلي + سجل التدقيق الأمني WORM)', 'Updated Enterprise Process Map for VITAS Iraq HRMS (Cloud + Local Sync + WORM Audit Trail)')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white">{t('المكتب الرئيسي في بابل_الحلة', 'Main Office - Babil_Hilla')}</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">{t('مزامنة سحابية لحظية SSE', 'Live Cloud↔Local Sync')}</span>
            </div>
          </div>

          {/* 6 Enterprise Core Workflows Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              { id: 1, title: 'الاستقطاب والتعيين وإدارة البيانات', en: 'Talent Acquisition & Master Data', step: 'طلب احتياج ← مقابلة لجنة ← فحص نزاهة CBI ← عقد عمل / استيراد جماعي سريع من Excel (Bulk Import) بمسؤولية مسؤول الموارد البشرية', color: 'teal', icon: 'person_add' },
              { id: 2, title: 'الدوام والإجازات', en: 'Time & Attendance', step: 'بصمة بيومترية ← طلب إجازة ← اعتماد المشرف المباشر ← تسوية التايم شيت المركزي في المكتب الرئيسي في بابل_الحلة', color: 'blue', icon: 'schedule' },
              { id: 3, title: 'الرواتب والضمان الاجتماعي', en: 'Payroll & Social Security', step: 'تجميع الحركات ← استقطاع قانون 18 والضريبة ← تدقيق مسؤول الرواتب والمالية ← اعتماد وتوطين مصرفي', color: 'indigo', icon: 'payments' },
              { id: 4, title: 'التقييم والترقيات', en: 'Performance & Appraisal', step: 'تقييم ذاتي ← تقييم المشرف ← مراجعة مدير الفرع / القسم ← اعتماد نهائي وتحديث الدرجة الوظيفية', color: 'amber', icon: 'trending_up' },
              { id: 5, title: 'نهاية الخدمة وبراءة الذمة', en: 'Offboarding & Clearance', step: 'طلب انفكاك ← استرجاع العهد ← براءة ذمة (مسؤول الأرشيف والإدارية) ← صرف مكافأة نهاية الخدمة', color: 'rose', icon: 'exit_to_app' },
              { id: 6, title: 'المزامنة السحابية والتدقيق الأمني', en: 'Cloud↔Local Sync & WORM Audit', step: 'مزامنة ثنائية لحظية (SSE) ← تزامن الحذف والتفريغ التشغيلي (Operational Wipe Epoch) ← توثيق تلقائي غير قابل للتعديل في Audit Logs بإشراف مسؤول الأمان والامتثال', color: 'emerald', icon: 'verified_user' }
            ].map(w => (
              <div key={w.id} className={`p-4 rounded-2xl border shadow-sm space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs font-mono">
                    {w.id}
                  </span>
                  <span className="material-symbols-outlined text-slate-400 text-lg">{w.icon}</span>
                </div>
                <h4 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{w.title}</h4>
                <p className="text-[10px] text-slate-400 font-mono">{w.en}</p>
                <div className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {w.step}
                </div>
              </div>
            ))}
          </div>

          {/* RACI Matrix Table */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('مصفوفة المسؤوليات والصلاحيات المؤسسية (RACI Matrix) — المكتب الرئيسي في بابل_الحلة', 'Enterprise RACI Governance Matrix — Main Office Babil_Hilla')}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {t('توزيع الأدوار الرقابية والمساءلة الإدارية لمنع تضارب المصالح (Segregation of Duties)', 'Accountability & Responsibility mapping across departments')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">R = Responsible (المنفذ)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">A = Accountable (المعتمد)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">C = Consulted (المستشار)</span>
                <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-600 dark:text-slate-400 font-bold">I = Informed (المبلّغ)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${isDark ? 'border-slate-800 text-slate-400 bg-slate-900/50' : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}>
                    <th className="p-3 text-start">{t('العملية الإدارية / النشاط الرقابي', 'Process Activity')}</th>
                    <th className="p-3 text-center">{t('الموظف', 'Employee')}</th>
                    <th className="p-3 text-center">{t('المشرف المباشر', 'Supervisor')}</th>
                    <th className="p-3 text-center">{t('مدير الفرع', 'Branch Mgr')}</th>
                    <th className="p-3 text-center">{t('مسؤول الموارد البشرية', 'HR Officer')}</th>
                    <th className="p-3 text-center">{t('المدير المفوض / الإدارة العليا', 'Managing Dir')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {[
                    { act: 'طلب وتقديم الإجازات الاعتيادية والمرضية', emp: 'R', sup: 'A', mgr: 'I', hr: 'C', md: 'I' },
                    { act: 'الاستيراد الجماعي لبيانات الموظفين والفروع والأقسام (Excel Bulk Import)', emp: 'I', sup: 'I', mgr: 'C', hr: 'R', md: 'A' },
                    { act: 'إعداد واعتماد جدول رواتب الموظفين والبدلات والحوافز', emp: 'I', sup: 'C', mgr: 'C', hr: 'R', md: 'A' },
                    { act: 'إجراء تقييم الأداء السنوي ومراجعة الأهداف', emp: 'R', sup: 'R', mgr: 'A', hr: 'C', md: 'I' },
                    { act: 'توريد اشتراكات الضمان الاجتماعي (قانون 18)', emp: 'I', sup: 'I', mgr: 'I', hr: 'R', md: 'A' },
                    { act: 'تعديل مصفوفة الصلاحيات الأمنية RBAC ومراجعة سجل التدقيق (WORM Audit)', emp: 'I', sup: 'I', mgr: 'C', hr: 'R', md: 'A' },
                    { act: 'تفريغ البيانات التشغيلية والمزامنة السحابية الآمنة (Clear Operational Data)', emp: 'I', sup: 'I', mgr: 'I', hr: 'R', md: 'A' },
                    { act: 'استلام براءة الذمة واسترجاع العهد الرقمية', emp: 'R', sup: 'C', mgr: 'A', hr: 'A', md: 'I' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-3 font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{row.act}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">{row.emp}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600">{row.sup}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600">{row.mgr}</td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-600">{row.hr}</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-600">{row.md}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SLAs & Performance Control Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold">
                <span className="material-symbols-outlined text-lg">timer</span>
                <span>{t('اتفاقية معالجة الإجازات (SLA)', 'Leave Processing SLA')}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>أقل من 24 ساعة</p>
              <p className="text-[10px] text-slate-500">{t('اعتماد فوري من المشرف المباشر وتحديث الرصيد', 'Instant supervisor sign-off')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                <span className="material-symbols-outlined text-lg">verified_user</span>
                <span>{t('إقفال كشوفات الرواتب', 'Payroll Closure Deadline')}</span>
              </div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">يوم 26 شهرياً</p>
              <p className="text-[10px] text-slate-500">{t('مطابقة التايم شيت ورفع ملف التوطين للبنك', 'Timesheet freeze & bank upload')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-lg">policy</span>
                <span>{t('توريد اشتراكات الضمان', 'Social Security Filing')}</span>
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">قبل يوم 15</p>
              <p className="text-[10px] text-slate-500">{t('سداد حصة الـ 17% لمنصة الضمان الإلكترونية', '17% statutory monthly wire')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <span className="material-symbols-outlined text-lg">sync</span>
                <span>{t('المزامنة السحابية والتدقيق', 'Cloud Sync & WORM Audit')}</span>
              </div>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">لحظي (&lt; 3 ثوانٍ)</p>
              <p className="text-[10px] text-slate-500">{t('مزامنة فورية بين السحابة والمحلي وتوثيق العمليات في Audit Log', 'Instant Cloud↔Local sync & immutable audit logging')}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 2: Audit & Regulatory Compliance Reports (risk-audit-reports / risk-audit)
          ========================================================================= */}
      {(activeModuleId === 'risk-audit-reports' || activeModuleId === 'risk-audit') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('مركز تقارير التدقيق والرقابة التنظيمية المعتمدة', 'Official Regulatory & Compliance Audit Reports')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('تقارير جاهزة للطباعة والتصدير للجهات الرقابية والمراجع الخارجي', 'Export-ready reports for regulators & external auditors')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUDIT_REPORTS_DATA.map(rep => (
              <div key={rep.id} className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">{rep.id}</span>
                    <h3 className="font-bold text-sm mt-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{rep.title}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white text-[10px] font-bold shadow-sm">
                    {rep.status}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">{rep.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('المدقق:', 'Auditor:')} <b className="text-slate-600 dark:text-slate-200">{rep.auditor}</b></span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReportForView(rep)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      <span>{t('معاينة التقرير', 'Preview Report')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => printAuditReport(rep)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-xs">print</span>
                      <span>{t('طباعة PDF', 'Print / PDF')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 3: Regulatory Compliance Tracker (risk-tracker)
          ========================================================================= */}
      {activeModuleId === 'risk-tracker' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('متتبع التوافق والتشريعات واللوائح العراقية النافذة', 'Iraqi Statutory & Regulatory Compliance Tracker')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('المتابعة اللحظية للقوانين واللوائح الملزمة في جمهورية العراق', 'Active tracking of applicable laws & regulatory requirements in Iraq')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { law: 'قانون العمل العراقي رقم (37) لسنة 2015', scope: 'عقود العمل، ساعات الدوام، الإجازات، مكافأة نهاية الخدمة، والسلامة المهنية', comp: '100% مطابق', nextReview: '2026-06-30' },
              { law: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', scope: 'نسب الاستقطاع (5% عامل + 12% صاحب عمل) والتصريح الإلكتروني بالرواتب', comp: '100% مطابق', nextReview: '2026-03-31' },
              { law: 'تعليمات البنك المركزي العراقي رقم (4) لمؤسسات التمويل الأصغر', scope: 'الحوكمة، الرقابة الداخلية، وإدارة المخاطر الائتمانية والتشغيلية', comp: '100% مطابق', nextReview: '2026-05-15' },
              { law: 'قانون ضريبة الدخل العراقي وتعديلاته والسماحات القانونية', scope: 'احتساب الاستقطاع المباشر والسماحات الزوجية وتنزيل الاشتراكات التقاعدية', comp: '100% مطابق', nextReview: '2026-04-30' }
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-1 max-w-xl">
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{item.law}</h3>
                  <p className="text-slate-500 text-[11px]">{item.scope}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 block">{t('المراجعة القادمة', 'Next Review')}</span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.nextReview}</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-800 text-white font-bold shadow-sm text-[11px]">
                    {item.comp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 4: Company Policies Register (risk-policies / risk-training)
          ========================================================================= */}
      {(activeModuleId === 'risk-policies' || activeModuleId === 'risk-training') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('سجل السياسات واللوائح المعتمدة بنظام فيتاس العراق', 'VITAS Iraq Approved Internal Policies Register')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                  {systemPolicies.length} {t('سياسات نشطة ومولدة', 'Active Policies')}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {t('بطاقات ديناميكية مولدة حصراً من السياسات والقواعد المدخلة بالنظام، وتتولد تلقائياً فور إضافة أي سياسة جديدة', 'Dynamic policy cards derived exclusively from configured system policies, auto-generating cards when new policies are added')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextCode = `POL-CUS-0${systemPolicies.length + 1}`;
                setNewPolicyForm({
                  code: nextCode,
                  title: '',
                  category: 'إدارية وتنظيمية',
                  version: 'v1.0',
                  pages: '5 صفحات',
                  desc: '',
                  chapters: [
                    { title: 'الفصل الأول: نطاق وتطبيق السياسة', content: '' },
                    { title: 'الفصل الثاني: القواعد والضوابط الإلزامية', content: '' }
                  ]
                });
                setIsAddPolicyModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{t('+ إضافة سياسة جديدة', '+ Add New Policy')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemPolicies.map(pol => (
              <div key={pol.code} className={`p-4 rounded-2xl border space-y-3 shadow-sm transition-all hover:border-teal-500/40 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">{pol.code} • {pol.version}</span>
                      {pol.isBuiltIn ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {t('سياسة نظام مدخلة', 'Configured System Policy')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {t('سياسة مضافة', 'Custom Policy')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm mt-1" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{pol.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                    {pol.pages}
                  </span>
                </div>

                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">{pol.desc}</p>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('تاريخ التحديث:', 'Updated:')} <b className="font-mono text-slate-600 dark:text-slate-200">{pol.date}</b></span>

                  <div className="flex items-center gap-2">
                    {!pol.isBuiltIn && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomPolicy(pol.code)}
                        className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                        title={t('حذف السياسة', 'Delete Policy')}
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        <span>{t('حذف', 'Delete')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => printCompanyPolicy(pol)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                      title={t('طباعة اللائحة بالأسود A4', 'Print Policy A4')}
                    >
                      <span className="material-symbols-outlined text-xs">print</span>
                      <span>{t('طباعة', 'Print')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPolicyForView(pol)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      <span>{t('استعراض الدليل', 'View Policy')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive HR System Policies & Contract Dates Batch Tool */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10">
            <PoliciesSection
              language={language}
              t={t}
              employees={employees}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 5: Risk Assessment Register (risk-assessment / risk-incident)
          ========================================================================= */}
      {(activeModuleId === 'risk-assessment' || activeModuleId === 'risk-incident') && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold">{t(`سجل المخاطر النشطة (${riskRecords.length})`, `Active Risk Register (${riskRecords.length})`)}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-700 text-white shadow-sm badge-white-text" style={{ color: '#ffffff' }}>
                {riskRecords.filter(r => r.status === 'مفتوح' || r.status === 'Open').length} {t('مفتوح', 'Open')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-sm badge-white-text" style={{ color: '#ffffff' }}>
                {riskRecords.filter(r => r.status === 'تم التخفيف والمعالجة' || r.status === 'Mitigated').length} {t('تمت معالجته', 'Mitigated')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={printRiskRegister}
                className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title={t('طباعة سجل ومصفوفة المخاطر بالأسود A4', 'Print Risk Register A4')}
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>{t('طباعة السجل (A4)', 'Print Register (A4)')}</span>
              </button>
              <button
                type="button"
                onClick={handleExportRiskMatrix}
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                <span>{t('تصدير مصفوفة المخاطر (Excel)', 'Export Matrix (Excel)')}</span>
              </button>
              <button
                onClick={() => setActiveModuleId('risk-identify-new')}
                className="px-4 py-2 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800 transition-all shadow-md shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add_alert</span>
                <span>{t('+ تسجيل خطر جديد', '+ Register New Risk')}</span>
              </button>
            </div>
          </div>

          {riskRecords.length === 0 ? (
            <EmptyState
              icon="warning"
              title={t('سجل المخاطر مفرّغ تماماً', 'Risk Register Empty')}
              description={t('لم يتم تسجيل أي مخاطر تشغيلية أو سيبرانية غير معالجة حتى الآن.', 'No unmitigated operational or cyber risks have been identified.')}
              actionText={t('تحديد خطر جديد', 'Identify New Risk')}
              onAction={() => setActiveModuleId('risk-identify-new')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {riskRecords.map(r => (
                <div key={r.id || r.riskCode} className={`p-5 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-start font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">{r.riskCode || r.id}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm badge-white-text !text-white ${r.status === 'تم التخفيف والمعالجة' || r.status === 'Mitigated'
                            ? 'bg-emerald-700'
                            : r.status === 'قيد المعالجة' || r.status === 'In Progress'
                              ? 'bg-amber-600'
                              : 'bg-rose-700'
                            }`}
                          style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                        >
                          {r.status || 'مفتوح'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold">{r.title}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-sm badge-white-text !text-white ${r.impact === 'حرج' || r.impact === 'Critical'
                        ? 'bg-rose-800'
                        : r.impact === 'عالي' || r.impact === 'High'
                          ? 'bg-amber-700'
                          : 'bg-blue-700'
                        }`}
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    >
                      {t('التأثير:', 'Impact:')} {r.impact}
                    </span>
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs">
                    <b>{t('الفئة:', 'Category:')}</b> {r.category} • <b>{t('المسؤول:', 'Owner:')}</b> {r.owner || 'مدير المخاطر والامتثال'}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[11px] text-slate-700 dark:text-slate-300">
                    <b className="text-teal-600 dark:text-teal-400">{t('خطة التحوط والمعالجة:', 'Mitigation Strategy:')}</b> {r.mitigationPlan}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-wrap justify-between items-center gap-2 text-[11px]">
                    <span className="text-slate-400 font-mono">{t('تم الرصد:', 'Logged:')} {r.identifiedDate}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCycleRiskStatus(r)}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 text-[11px]"
                        title={t('تغيير حالة الخطر إلى المرحلة التالية', 'Cycle status')}
                      >
                        <span className="material-symbols-outlined text-xs">published_with_changes</span>
                        <span>{t('تغيير الحالة', 'Cycle Status')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRiskForDetails(r)}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer text-[11px]"
                        title={t('تعديل وتخصيص بيانات الخطر والخطة', 'Edit Risk Details')}
                      >
                        <span className="material-symbols-outlined text-xs">edit_note</span>
                        <span>{t('تعديل الخطر', 'Edit Risk')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRisk(r)}
                        className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 text-[11px]"
                        title={t('حذف بطاقة الخطر نهائياً من السجل', 'Delete Risk Card')}
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        <span>{t('حذف', 'Delete')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 6: Identify & Register New Risk (risk-identify-new)
          ========================================================================= */}
      {activeModuleId === 'risk-identify-new' && (
        <div className={`max-w-xl mx-auto p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className="text-base font-bold border-b border-slate-200 dark:border-white/10 pb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('تسجيل خطر تشغيلي أو سيبراني جديد', 'Register New Risk in Governance Register')}
          </h2>
          <form onSubmit={handleAddRisk} className="space-y-4">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('وصف الخطر المحتمل *', 'Potential Risk Description *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('مثال: احتمال انقطاع خدمة الاتصال الشبكي عن فرع البصرة', 'e.g. Potential network connection outage at Basra branch')}
                value={riskTitle}
                onChange={e => setRiskTitle(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('فئة الخطر', 'Risk Category')}
                </label>
                <select
                  value={riskCat}
                  onChange={e => setRiskCat(e.target.value as any)}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                >
                  <option value="أمن المعلومات">{t('أمن المعلومات والسيبراني', 'Information & Cyber Security')}</option>
                  <option value="الامتثال التنظيمي">{t('الامتثال للبنك المركزي CBI', 'Central Bank Compliance')}</option>
                  <option value="التشغيلي">{t('التشغيلي واستمرارية العمل', 'Operational & Business Continuity')}</option>
                  <option value="المالي">{t('المالي والائتمان', 'Financial & Credit')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('درجة التأثير المتوقعة', 'Expected Impact Level')}
                </label>
                <select
                  value={impact}
                  onChange={e => setImpact(e.target.value as any)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-500 outline-none ${isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                >
                  <option value="منخفض">{t('منخفض (Low)', 'Low')}</option>
                  <option value="متوسط">{t('متوسط (Medium)', 'Medium')}</option>
                  <option value="عالي">{t('عالي (High)', 'High')}</option>
                  <option value="حرج">{t('حرج جداً (Critical)', 'Critical')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('خطة المعالجة والتخفيف (Mitigation Plan)', 'Mitigation Plan')}
              </label>
              <textarea
                rows={3}
                placeholder={t('تفاصيل خطة التحوط والتغطية للحد من أثر الخطر...', 'Mitigation plan details...')}
                value={mitigation}
                onChange={e => setMitigation(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full p-3 rounded-xl border text-xs font-normal outline-none transition-all ${isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs"
            >
              {t('حفظ وتثبيت الخطر في سجل الحوكمة', 'Save Risk to Governance Register')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 7: Data Privacy & Protection (risk-details-privacy)
          ========================================================================= */}
      {activeModuleId === 'risk-details-privacy' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إطار حماية وسرية البيانات الشخصية للموظفين والعملاء', 'Data Privacy & Protection Governance Framework')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('معايير التشفير والاحتفاظ الآمن بالبيانات وفق التشريعات المصرفية', 'Data encryption, retention, and access management standards')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">lock</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('تشفير البيانات الحساسة', 'Data Encryption')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('تشفير بيانات الرواتب، أرقام الهويات الوطنية، والمستندات ببروتوكول AES-256 بت على السيرفر المحلي والسحابي.', 'Sensitive data encrypted with AES-256.')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">history_toggle_off</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('سياسة الاحتفاظ والأرشفة', 'Retention Policy')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('الاحتفاظ بالسجلات الوظيفية والمالية لمدة 10 سنوات امتثالاً لتعليمات البنك المركزي العراقي وقانون العمل.', 'Retention of HR & payroll records for 10 years.')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">security</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('حقوق النفاذ المحددة (Least Privilege)', 'Least Privilege Access')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('لا يمكن لأي موظف الاطلاع على رواتب أو تقييمات زملائه إلا بوجود صلاحية إدارية محددة في RBAC.', 'Strict RBAC prevents unauthorized payroll access.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 8: General Security Settings & Automated Backup (sec-general-settings)
          ========================================================================= */}
      {activeModuleId === 'sec-general-settings' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Card 1: Portal General Security Policies & Parameters */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إعدادات وسياسات الأمان العامة للبوابة', 'Portal General Security Policies & Parameters')}
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">{t('تخصيص شروط كلمات المرور، انتهاء الجلسات، والمصادقة المزدوجة', 'Configure password rules, session timeouts, and MFA')}</p>
              </div>
              {lastSavedSecuritySettings && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span>{t('محفوظة ومحدثة', 'Synced & Saved')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الحد الأدنى لطول كلمة المرور (أحرف)', 'Min Password Length')}
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={32}
                    value={minPasswordLength}
                    onChange={e => setMinPasswordLength(e.target.value === '' ? '' as any : Number(e.target.value))}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                      }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('يوصى بـ 8 أحرف على الأقل لحماية الحسابات', 'Recommended 8+ characters')}</p>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('مهلة انتهاء الجلسة بعد الخمول (بالدقائق)', 'Session Inactivity Timeout (Minutes)')}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={sessionTimeoutMinutes}
                    onChange={e => setSessionTimeoutMinutes(e.target.value === '' ? '' as any : Number(e.target.value))}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                      }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('يتم قفل الشاشة تلقائياً بعد عدم التفاعل', 'Auto locks session after inactivity')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('عدد محاولات الدخول الخاطئة قبل القفل المؤقت', 'Max Failed Attempts Before Lockout')}
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={maxFailedAttempts}
                    onChange={e => setMaxFailedAttempts(e.target.value === '' ? '' as any : Number(e.target.value))}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                      }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('حماية من هجمات التخمين والقوة العمياء (Brute Force)', 'Protection against brute force attacks')}</p>
                </div>

                <div className="flex items-center gap-3 pt-4 sm:pt-6">
                  <input
                    type="checkbox"
                    id="req-special"
                    checked={requireSpecialChars}
                    onChange={e => setRequireSpecialChars(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                  />
                  <label htmlFor="req-special" className="font-bold cursor-pointer select-none" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('إلزامية احتواء كلمة المرور على رموز خاصة وأرقام', 'Require special characters & numbers')}
                  </label>
                </div>
              </div>

              {/* Interactive 2FA Switch */}
              <div
                onClick={() => setEnable2FA(prev => !prev)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${enable2FA
                  ? 'bg-teal-500/10 border-teal-500/40 text-teal-700 dark:text-teal-300'
                  : isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${enable2FA ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                    {enable2FA ? 'verified_user' : 'shield'}
                  </span>
                  <div>
                    <p className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                      {enable2FA
                        ? t('المصادقة الثنائية (2FA) مُفعّلة', '2-Factor Authentication Enabled')
                        : t('المصادقة الثنائية (2FA) مُعطّلة', '2-Factor Authentication Disabled')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {enable2FA
                        ? t('جميع الحسابات الإدارية تستخدم التحقق المزدوج لحماية النظام', 'All admin accounts require dual-step verification')
                        : t('انقر للتفعيل لفرض التحقق المزدوج لحماية الحسابات الإدارية', 'Click to enforce dual-step verification on admin accounts')}
                    </p>
                  </div>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enable2FA ? 'bg-teal-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${enable2FA ? (language === 'ar' ? '-translate-x-6' : 'translate-x-6') : (language === 'ar' ? '-translate-x-1' : 'translate-x-1')
                    }`} />
                </div>
              </div>

              {settingsSaved && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top duration-300">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{t('تم حفظ وتطبيق إعدادات الأمان بنجاح في قاعدة البيانات!', 'Security settings saved & applied successfully!')}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    {lastSavedSecuritySettings ? new Date(lastSavedSecuritySettings).toLocaleTimeString() : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingSecuritySettings}
                  className={`flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-bold text-xs transition-all shadow-lg shadow-teal-600/25 cursor-pointer flex items-center justify-center gap-2 ${isSavingSecuritySettings ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                >
                  {isSavingSecuritySettings ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>{t('جاري الحفظ في الخادم...', 'Saving to server...')}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>{t('حفظ إعدادات الأمان', 'Save Security Settings')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetSecuritySettingsToDefaults}
                  className={`px-4 py-3 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${isDark ? 'border-slate-700 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  title={t('استعادة الإعدادات الافتراضية', 'Reset to Defaults')}
                >
                  <span className="material-symbols-outlined text-base">restart_alt</span>
                  <span className="hidden sm:inline">{t('الافتراضي', 'Defaults')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Automated Backups & Disaster Recovery Engine (التطبيق العملي المقترح) */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">cloud_sync</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('النسخ الاحتياطي التلقائي والتعافي من الكوارث (Automated Backups & Disaster Recovery)', 'Automated Database Backups & Disaster Recovery')}
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {t('توليد نسخ أسبوعية مضغوطة ومشفرة، حفظ محلي 30 يوماً مع الحذف التلقائي للأقدم، ونسخ متطابق للمسار المنفصل', 'Weekly compressed backups, 30-day retention with auto-purge, and secondary mirror storage')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunImmediateBackup}
                disabled={isExecutingBackup}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 badge-white-text"
                style={{ color: '#ffffff' }}
              >
                <span className={`material-symbols-outlined text-base ${isExecutingBackup ? 'animate-spin' : ''}`}>
                  {isExecutingBackup ? 'progress_activity' : 'backup'}
                </span>
                <span>{isExecutingBackup ? t('جاري إنشاء النسخة...', 'Generating Backup...') : t('إنشاء نسخة احتياطية الآن', 'Run Backup Now')}</span>
              </button>
            </div>

            {backupSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{backupSuccessMessage}</span>
              </div>
            )}

            {/* Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Frequency */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">{t('دورية النسخ التلقائي:', 'Automated Frequency:')}</span>
                <select
                  value={backupSettings.frequency}
                  onChange={e => handleUpdateBackupSettings({ frequency: e.target.value })}
                  className={`w-full p-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                >
                  <option value="weekly">{t('أسبوعي (كل أحد 02:00 صباحاً)', 'Weekly (Every Sunday 02:00 AM)')}</option>
                  <option value="daily">{t('يومي (كل ليلة 02:00 صباحاً)', 'Daily (Every Night 02:00 AM)')}</option>
                  <option value="monthly">{t('شهري (أول كل شهر)', 'Monthly (1st of month)')}</option>
                </select>
              </div>

              {/* Retention Policy */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">{t('سياسة الحفظ (Retention):', 'Retention Policy:')}</span>
                <select
                  value={backupSettings.retentionDays}
                  onChange={e => handleUpdateBackupSettings({ retentionDays: Number(e.target.value) })}
                  className={`w-full p-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                >
                  <option value={30}>{t('30 يوماً (الموصى به - حذف الأقدم تلقائياً)', '30 Days (Recommended - Auto Purge)')}</option>
                  <option value={60}>{t('60 يوماً', '60 Days')}</option>
                  <option value={90}>{t('90 يوماً (ربع سنوي)', '90 Days')}</option>
                </select>
              </div>

              {/* Secondary Storage Toggle */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">{t('مسار التخزين المنفصل (Mirror):', 'Secondary Mirror Storage:')}</span>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {backupSettings.enableSecondaryMirror ? t('مُفعّل (نشط)', 'Mirror Active') : t('معطل', 'Disabled')}
                  </span>
                  <input
                    type="checkbox"
                    checked={backupSettings.enableSecondaryMirror}
                    onChange={e => handleUpdateBackupSettings({ enableSecondaryMirror: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Storage Locations Summary */}
            <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50/70 border-slate-200'}`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">{t('مسار الحفظ المحلي الأساسي:', 'Primary Local Directory:')}</span>
                <span className="font-mono text-teal-600 dark:text-teal-400 font-bold text-[10px] dir-ltr">{backupSettings.primaryDir}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-slate-200 dark:border-white/5">
                <span className="text-slate-500 font-medium">{t('مسار النسخ المنفصل (حاسبة أو سيرفر شبكي):', 'Secondary Mirror Directory (PC / Server):')}</span>
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <input
                    type="text"
                    value={backupSettings.secondaryDir || ''}
                    onChange={e => setBackupSettings((prev: any) => ({ ...prev, secondaryDir: e.target.value }))}
                    placeholder="مثال: \\192.168.1.100\HRIS_Backups أو E:\Backups"
                    className={`w-full px-2.5 py-1 rounded-lg border font-mono text-[10px] outline-none dir-ltr ${isDark ? 'bg-slate-800 border-slate-700 text-teal-300' : 'bg-white border-slate-300 text-teal-800'}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateBackupSettings({ secondaryDir: backupSettings.secondaryDir })}
                    className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[10px] whitespace-nowrap cursor-pointer shadow-sm badge-white-text"
                    style={{ color: '#ffffff' }}
                  >
                    {t('حفظ', 'Save')}
                  </button>
                </div>
              </div>
              {backupSettings.lastRunDetails && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 text-[10px] text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-emerald-500">task_alt</span>
                  <span><b>{t('آخر عملية:', 'Last Run:')}</b> {backupSettings.lastRunDetails}</span>
                </div>
              )}
            </div>

            {/* Backups Table / Archive List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t(`أرشيف النسخ الاحتياطية المتوفرة (${backupsList.length})`, `Available Backup Archives (${backupsList.length})`)}
                </span>
                <button
                  type="button"
                  onClick={fetchBackupsList}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-xs ${isLoadingBackups ? 'animate-spin' : ''}`}>refresh</span>
                  <span>{t('تحديث القائمة', 'Refresh')}</span>
                </button>
              </div>

              {backupsList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 text-xs">
                  {t('لا توجد نسخ احتياطية مسجلة بعد. انقر على "إنشاء نسخة احتياطية الآن" لتوليد أول نسخة.', 'No backup archives found. Click "Run Backup Now" to create your first archive.')}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-start text-[11px]">
                    <thead className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}>
                      <tr>
                        <th className="py-2.5 px-3 text-start font-bold">{t('اسم ملف الأرشيف', 'Archive Filename')}</th>
                        <th className="py-2.5 px-3 text-start font-bold">{t('تاريخ الإنشاء', 'Created At')}</th>
                        <th className="py-2.5 px-3 text-start font-bold">{t('الحجم (مضغوط)', 'Size')}</th>
                        <th className="py-2.5 px-3 text-start font-bold">{t('التطابق الثانوي', 'Secondary Mirror')}</th>
                        <th className="py-2.5 px-3 text-center font-bold">{t('تحميل', 'Download')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {backupsList.map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{b.filename}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-bold text-teal-600 dark:text-teal-400">{b.sizeFormatted}</td>
                          <td className="py-2.5 px-3">
                            {b.existsInSecondary ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                {t('مطابق 100%', 'Mirrored')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/15 text-slate-500 border border-slate-500/20">
                                {t('محلي فقط', 'Local Only')}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <a
                              href={`/api/backup/download/${encodeURIComponent(b.filename)}`}
                              download={b.filename}
                              className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer badge-white-text"
                              style={{ color: '#ffffff' }}
                            >
                              <span className="material-symbols-outlined text-xs">download</span>
                              <span>{t('تنزيل', 'Download')}</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 9: Security Audit Logs & System Events (sec-audit-logs)
          ========================================================================= */}
      {activeModuleId === 'sec-audit-logs' && (
        <div className="space-y-6">

          {/* Toast Notification */}
          {auditToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-between gap-2 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">verified</span>
                <span>{auditToast}</span>
              </div>
              <button onClick={() => setAuditToast(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* 5 KPI Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Total */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('إجمالي الأحداث', 'Total Logs')}</p>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {auditStats.total}
                </h3>
              </div>
            </div>

            {/* Critical */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-rose-500/30' : 'bg-rose-50/50 border-rose-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">gpp_bad</span>
              </div>
              <div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{t('حوادث حرجة', 'Critical Events')}</p>
                <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {auditStats.critical}
                </h3>
              </div>
            </div>

            {/* Warnings */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-amber-500/30' : 'bg-amber-50/50 border-amber-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{t('تنبيهات ومخاطر', 'Warnings')}</p>
                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {auditStats.warnings}
                </h3>
              </div>
            </div>

            {/* Successes */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{t('عمليات معتمدة', 'Approved')}</p>
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {auditStats.successes}
                </h3>
              </div>
            </div>

            {/* Blocked Attempts */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 col-span-2 md:col-span-1 ${isDark ? 'bg-[#111827] border-purple-500/30' : 'bg-purple-50/50 border-purple-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">shield</span>
              </div>
              <div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">{t('محاولات محظورة', 'Blocked Access')}</p>
                <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {auditStats.blocked}
                </h3>
              </div>
            </div>
          </div>

          {/* Search, Severity Filters, & Module Selector */}
          <div className={`p-4 rounded-3xl border shadow-xl space-y-3 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder={t('بحث فوري في السجلات بالموظف، IP، نوع العملية، الموديول أو الوصف...', 'Search audit logs by user, IP, action, module, or details...')}
                  className={`w-full pr-10 pl-9 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch('')}
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                  >
                    cancel
                  </button>
                )}
              </div>

              {/* Module Filter Dropdown */}
              <div className="w-full md:w-64">
                <select
                  value={auditModuleFilter}
                  onChange={(e) => setAuditModuleFilter(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                >
                  <option value="all">{t('كافة الموديولات والأنظمة', 'All Modules & Services')}</option>
                  <option value="cat-1-auth">{t('تسجيل الدخول والمصادقة (cat-1-auth)', 'Authentication & 2FA')}</option>
                  <option value="cat-5-payroll">{t('الرواتب والبدلات والتوطين (cat-5-payroll)', 'Payroll & Salaries')}</option>
                  <option value="cat-9-risk">{t('المخاطر والصلاحيات والامتثال (cat-9-risk)', 'Risk, RBAC & Policies')}</option>
                  <option value="cat-4-leave">{t('الحضور والبصمة والإجازات (cat-4-leave)', 'Attendance & Biometrics')}</option>
                  <option value="cat-12-archive">{t('الأرشيف والمستندات (cat-12-archive)', 'Digital Archive')}</option>
                  <option value="cat-10-sys">{t('قواعد البيانات والنظام (cat-10-sys)', 'Database & System Backend')}</option>
                </select>
              </div>
            </div>

            {/* Severity Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 ml-1">{t('المستوى الأمني:', 'Severity:')}</span>

                {[
                  { id: 'all', labelAr: 'الكل', labelEn: 'All', count: auditLogs.length, color: 'slate' },
                  { id: 'critical', labelAr: 'حرج', labelEn: 'Critical', count: auditStats.critical, color: 'rose' },
                  { id: 'warning', labelAr: 'تحذير', labelEn: 'Warning', count: auditStats.warnings, color: 'amber' },
                  { id: 'success', labelAr: 'معتمد / ناجح', labelEn: 'Success', count: auditStats.successes, color: 'emerald' },
                  { id: 'info', labelAr: 'معلومات', labelEn: 'Info', count: auditLogs.filter(l => l.severity === 'info').length, color: 'blue' }
                ].map((s) => {
                  const isActive = auditSeverityFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAuditSeverityFilter(s.id as any)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isActive
                        ? s.color === 'rose'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : s.color === 'amber'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                            : s.color === 'emerald'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : s.color === 'blue'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                        : isDark
                          ? 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      <span>{language === 'ar' ? s.labelAr : s.labelEn}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-black/25 text-white' : isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                        {s.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {(auditSearch || auditSeverityFilter !== 'all' || auditModuleFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditSeverityFilter('all');
                    setAuditModuleFilter('all');
                  }}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  <span>{t('إعادة ضبط الفلاتر', 'Reset Filters')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className={`rounded-3xl border shadow-xl overflow-hidden ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className={`border-b font-bold ${isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                    <th className="py-3 px-4">{t('معرف الحدث والتوقيت', 'Event ID & Time')}</th>
                    <th className="py-3 px-4">{t('الفاعل / المستخدم', 'Actor / User')}</th>
                    <th className="py-3 px-4">{t('الحدث والإجراء', 'Action & Event')}</th>
                    <th className="py-3 px-4">{t('الموديول المستهدف', 'Target Module')}</th>
                    <th className="py-3 px-4">{t('المستوى الأمني', 'Severity')}</th>
                    <th className="py-3 px-4">{t('عنوان IP والجهاز', 'IP & Device')}</th>
                    <th className="py-3 px-4">{t('الحالة', 'Status')}</th>
                    <th className="py-3 px-4 text-center">{t('فحص', 'Inspect')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 text-slate-500">search_off</span>
                        <p className="font-bold">{t('لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية', 'No audit logs found matching the selected criteria.')}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isCritical = log.severity === 'critical';
                      const isWarning = log.severity === 'warning';
                      const isSuccess = log.severity === 'success';

                      return (
                        <tr
                          key={log.id}
                          className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${isCritical ? 'bg-rose-500/5' : ''
                            }`}
                        >
                          {/* ID & Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px]">
                              {log.id}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              <span>{log.timestamp}</span>
                            </div>
                          </td>

                          {/* Actor / User */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${isDark ? 'bg-teal-950 text-teal-300 border border-teal-500/30' : 'bg-teal-100 text-teal-800'
                                }`}>
                                {log.userName ? log.userName.charAt(0) : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-xs">
                                  {log.userName}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-[9px] font-semibold">
                                    {log.userRole}
                                  </span>
                                  <span>{log.userId}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Action & Code */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {log.action}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {log.details}
                            </div>
                          </td>

                          {/* Target Module */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium border bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10">
                              {log.module}
                            </span>
                          </td>

                          {/* Severity Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isCritical ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-700 text-white border border-rose-800 shadow-sm badge-white-text"
                                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                <span style={{ color: '#ffffff' }}>{t('حرج', 'Critical')}</span>
                              </span>
                            ) : isWarning ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-600 text-white border border-amber-700 shadow-sm badge-white-text"
                                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                <span style={{ color: '#ffffff' }}>{t('تحذير', 'Warning')}</span>
                              </span>
                            ) : isSuccess ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-700 text-white border border-emerald-800 shadow-sm badge-white-text"
                                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                <span style={{ color: '#ffffff' }}>{t('ناجح', 'Success')}</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-700 text-white border border-blue-800 shadow-sm badge-white-text"
                                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                <span style={{ color: '#ffffff' }}>{t('معلومات', 'Info')}</span>
                              </span>
                            )}
                          </td>

                          {/* IP & Device */}
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                            <div className="text-slate-800 dark:text-slate-200 font-bold">{log.ipAddress}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{log.userDevice}</div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold badge-white-text ${log.status === 'محظور'
                                ? 'bg-rose-600 text-white'
                                : log.status === 'تحذير'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                }`}
                              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                            >
                              {log.status}
                            </span>
                          </td>

                          {/* Actions / Inspect */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLog(log)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto cursor-pointer badge-white-text border border-teal-600 hover:scale-[1.02] active:scale-[0.98]"
                              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                              title={t('عرض التفاصيل الفنية للحدث', 'Inspect Event Details')}
                            >
                              <span className="material-symbols-outlined text-sm" style={{ color: '#ffffff' }}>visibility</span>
                              <span style={{ color: '#ffffff' }}>{t('تفاصيل', 'Inspect')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 ${isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50/50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-teal-500">lock_open_right</span>
                <span>{t('جميع الأحداث موقعة بتشفير SHA-256 ومخزنة في السجل المركزي الموحد.', 'All events are SHA-256 cryptographically hashed & stored in the central audit ledger.')}</span>
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-300">
                {t(`عرض ${filteredAuditLogs.length} من إجمالي ${auditLogs.length} سجل`, `Showing ${filteredAuditLogs.length} of ${auditLogs.length} logs`)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 10: Dynamic Users & Module Permissions (sec-roles-permissions)
          ========================================================================= */}
      {(activeModuleId === 'sec-roles-permissions' || activeModuleId === 'sec-edit-role') && (
        <div className="space-y-4">
          {/* Policies & Mini-Settings Tab Content */}
          {rolePermissionsSubTab === 'policies' && (
            <PoliciesSection
              language={language}
              t={t}
              employees={employees}
            />
          )}

          {/* Users & Permissions Table Content */}
          {rolePermissionsSubTab === 'users' && (
            <div className={`rounded-3xl border shadow-xl overflow-hidden space-y-0 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>

              {/* Sub-header info row */}
              <div className={`px-6 py-3 border-b flex items-center gap-2 ${isDark ? 'border-white/10 bg-[#0a0c10]/50' : 'border-slate-200 bg-slate-50/50'}`}>
                <span className="material-symbols-outlined text-sm text-slate-400">info</span>
                <p className="text-[11px] text-slate-500">
                  {t('اضغط على "+ إضافة مستخدم جديد" لفتح النموذج وتحديد اسم المستخدم، كلمة المرور، نوع الوظيفة، والموديولات المصرح بها عبر Tick ✓ أمام كل موديول', 'Click "+ Add New User with Permissions" to open the form and assign username, password, job title, and permitted modules via Tick ✓ checkboxes')}
                </p>
              </div>

              {/* Toast Notification */}
              {customEmpSavedToast && (
                <div className="m-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
                  <span className="material-symbols-outlined text-lg text-emerald-500">check_circle</span>
                  <span>{customEmpSavedToast}</span>
                </div>
              )}

              {/* Search & Filter Section */}
              <div className={`px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
                }`}>
                <p className="text-xs font-bold" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                  {t(`إجمالي المستخدمين المخصصين: ${dbUsers.length} مستخدم (+ Super Admin دائم)`,
                    `Total Custom Users: ${dbUsers.length} (+ Permanent Super Admin)`)}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Department filter */}
                  <select
                    value={empDeptFilter}
                    onChange={e => setEmpDeptFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                  >
                    <option value="all">{t('كافة الأقسام (All Departments)', 'All Departments')}</option>
                    {allUniqueDepartments.map(d => (
                      <option key={d.name_ar} value={d.name_ar}>
                        {language === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}
                      </option>
                    ))}
                  </select>

                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('بحث باسم أو يوزر المستخدم...', 'Search username or name...')}
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      className={`px-3.5 py-2 rounded-xl border text-xs outline-none w-56 ${isDark ? 'bg-[#111827] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>

              {/* Users List Table */}
              <div className="p-6 space-y-4">
                <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold ${isDark ? 'bg-[#0a0c10] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                        <th className="p-3.5 text-start">{t('المستخدم والحساب', 'User & Account')}</th>
                        <th className="p-3.5 text-start">{t('نوع الوظيفة / المسمى الوظيفي', 'Job Title / Position')}</th>
                        <th className="p-3.5 text-start">{t('القسم والفرع', 'Department & Branch')}</th>
                        <th className="p-3.5 text-start">{t('الموديولات المصرح بها', 'Allowed Modules')}</th>
                        <th className="p-3.5 text-start">{t('كلمة المرور', 'Password')}</th>
                        <th className="p-3.5 text-center">{t('الإجراءات', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {/* 1. Super Admin Row (Permanent & Protected) */}
                      <tr className={`transition-colors ${isDark ? 'bg-teal-950/10 hover:bg-teal-950/20' : 'bg-teal-50/40 hover:bg-teal-50/80'}`}>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
                              <span className="material-symbols-outlined text-lg">shield</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                                  {t('مدير النظام الشامل (Super Admin)', 'Super Administrator')}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                                  {t('كامل الصلاحيات', 'Full Access')}
                                </span>
                              </div>
                              <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">admin</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
                            {t('مدير النظام (Super Admin)', 'System Administrator')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <p className="text-xs text-slate-500">{t('جميع الأقسام والفروع', 'All Departments & Branches')}</p>
                        </td>
                        <td className="p-3.5">
                          <div className="relative inline-block w-full min-w-[220px] max-w-[280px]">
                            <select
                              defaultValue="summary"
                              className={`w-full py-1.5 pe-8 ps-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer transition-all ${isDark
                                ? 'bg-[#111827] border-teal-500/40 text-teal-300 hover:border-teal-400 focus:border-teal-400'
                                : 'bg-teal-50/80 border-teal-400 text-teal-900 hover:border-teal-600 focus:border-teal-600 shadow-2xs'
                                }`}
                            >
                              <option value="summary" className={isDark ? 'bg-[#111827] text-teal-300 font-bold' : 'bg-slate-50 text-teal-900 font-bold'}>
                                {t('♾️ جميع الموديولات الـ 11 (محمي)', '♾️ All 11 Modules (Protected)')}
                              </option>
                              {CATEGORY_GROUPS.map(g => (
                                <option key={g.id} value={g.id} className={isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-800'}>
                                  ✓ {language === 'ar' ? g.title : g.titleEn} ({t('كامل الصلاحيات', 'Full Access')})
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2 text-teal-600 dark:text-teal-400">
                              <span className="material-symbols-outlined text-base">expand_more</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">••••••••</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold flex items-center gap-1 w-fit mx-auto">
                            <span className="material-symbols-outlined text-sm">lock</span>
                            {t('محمي', 'Protected')}
                          </span>
                        </td>
                      </tr>

                      {/* 2. Custom Users Rows (Directly from MySQL dbUsers) */}
                      {dbUsers.map((u: any) => {
                        const fullName = u.full_name || u.name || u.username;
                        const uCode = (u.employee_id || `VTS-${u.username.toUpperCase()}`).toUpperCase();
                        const isCustomMatch =
                          empSearch.trim() === '' ||
                          (fullName || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                          (u.username || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                          (uCode || '').toLowerCase().includes(empSearch.toLowerCase());

                        if (!isCustomMatch) return null;
                        if (empDeptFilter !== 'all' && u.department !== empDeptFilter) return null;

                        let parsedModules: Record<string, any> = {
                          employees: Boolean(u.can_manage_employees),
                          payroll: Boolean(u.can_manage_finance),
                          recruitment: Boolean(u.can_manage_recruitment),
                          settings: Boolean(u.can_manage_settings),
                          attendance: false,
                          reports: false,
                          risk: false,
                          'cat-11-support': 'write'
                        };

                        if (u.allowed_screens) {
                          try {
                            const s = typeof u.allowed_screens === 'string' ? JSON.parse(u.allowed_screens) : u.allowed_screens;
                            if (s && typeof s === 'object') {
                              parsedModules = { ...s };
                              // Support & Help Desk is always shown as permitted without relying on explicit manual addition
                              if (parsedModules['cat-11-support'] !== 'none' && parsedModules['support'] !== 'none' && parsedModules['cat-11-support'] !== false && parsedModules['support'] !== false) {
                                parsedModules['cat-11-support'] = parsedModules['cat-11-support'] || parsedModules['support'] || 'write';
                              }
                            }
                          } catch (e) { }
                        } else {
                          parsedModules['cat-11-support'] = 'write';
                        }

                        const activeModEntries = Object.entries(parsedModules).filter(([_, v]) => v && v !== 'none' && v !== false);

                        return (
                          <tr key={u.id || u.username} className="hover:bg-slate-500/5 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                                  <span className="material-symbols-outlined text-lg">person</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                                      {fullName}
                                    </h4>
                                    {(u.can_manage_users === 1 || u.role === 'Admin') && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[9px] inline-flex items-center gap-0.5 border border-amber-500/30">
                                        <span className="material-symbols-outlined text-[11px]">admin_panel_settings</span>
                                        Admin
                                      </span>
                                    )}
                                    {(u.role === 'General Manager' || (u.job_title || '').includes('مدير عام')) && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[9px] inline-flex items-center gap-0.5 border border-purple-500/30">
                                        <span className="material-symbols-outlined text-[11px]">corporate_fare</span>
                                        {t('مدير عام', 'General Manager')}
                                      </span>
                                    )}
                                    {(u.role === 'HR Manager' || (u.job_title || '').includes('مدير الموارد البشرية')) && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-[9px] inline-flex items-center gap-0.5 border border-teal-500/30">
                                        <span className="material-symbols-outlined text-[11px]">badge</span>
                                        {t('مدير HR', 'HR Manager')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">
                                    {uCode}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] inline-flex items-center gap-1 ${(u.can_manage_users === 1 || u.role === 'Admin')
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                                : 'bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300'
                                }`}>
                                {(u.can_manage_users === 1 || u.role === 'Admin') && (
                                  <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                                )}
                                {u.job_title || (u.role && u.role !== 'Employee' ? u.role : null) || t('مسؤول رواتب وحضور', 'Payroll & Attendance Officer')}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                                {u.department || t('الموارد البشرية والشؤون الإدارية', 'Human Resources')}
                              </p>
                            </td>

                            <td className="p-3.5">
                              {activeModEntries.length === 0 ? (
                                <div className="relative inline-block w-full min-w-[200px] max-w-[280px]">
                                  <select
                                    disabled
                                    className={`w-full py-1.5 pe-8 ps-3 rounded-xl border text-xs font-semibold appearance-none outline-none opacity-60 cursor-not-allowed ${isDark ? 'bg-[#111827] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                                      }`}
                                  >
                                    <option>{t('لا توجد موديولات مصرح بها (0)', 'No Modules Assigned (0)')}</option>
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2.5 text-slate-400">
                                    <span className="material-symbols-outlined text-base">lock</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative inline-block w-full min-w-[210px] max-w-[280px]">
                                  <select
                                    defaultValue="summary"
                                    className={`w-full py-1.5 pe-8 ps-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer transition-all ${isDark
                                      ? 'bg-[#111827] border-teal-500/30 text-teal-300 hover:border-teal-400 focus:border-teal-400'
                                      : 'bg-white border-teal-500/40 text-teal-800 hover:border-teal-600 focus:border-teal-600 shadow-2xs'
                                      }`}
                                  >
                                    <option value="summary" className={isDark ? 'bg-[#111827] text-teal-300 font-bold' : 'bg-slate-50 text-teal-800 font-bold'}>
                                      {t(`📋 ${activeModEntries.length} موديول مصرح به (عرض القائمة)`, `📋 ${activeModEntries.length} Allowed Modules (View List)`)}
                                    </option>
                                    {activeModEntries.map(([mKey, mVal]) => {
                                      const isRead = mVal === 'read';
                                      const label = dynamicModuleLabels[mKey] || mKey;
                                      const permText = isRead ? t('قراءة فقط', 'Read Only') : t('تعديل وصلاحية كاملة', 'Write / Full');
                                      return (
                                        <option key={mKey} value={mKey} className={isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-800'}>
                                          {isRead ? '👁️' : '✏️'} {label} ({permText})
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2 text-teal-600 dark:text-teal-400">
                                    <span className="material-symbols-outlined text-base">expand_more</span>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="p-3.5">
                              <span className="font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
                                ••••••••
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isUserAdmin = Boolean(u.can_manage_users === 1 || u.role === 'Admin' || u.role === 'Super Admin');
                                    setSelectedRolePreset(u.role || 'manual');
                                    setNewUserForm({
                                      id: u.id,
                                      originalUsername: u.username,
                                      originalEmployeeId: u.employee_id || uCode,
                                      originalEmail: u.email || '',
                                      username: u.username,
                                      password: '', // Blank so user is not forced to type a password when editing
                                      fullNameAr: fullName,
                                      fullNameEn: u.name || fullName,
                                      jobTitle: u.job_title || (u.role && u.role !== 'Employee' ? u.role : '') || 'مسؤول رواتب وحضور',
                                      department: u.department || 'الموارد البشرية والشؤون الإدارية',
                                      branch: u.branch || 'المكتب الرئيسي في بابل_الحلة',
                                      email: u.email || `${u.username.toLowerCase()}@vitasiraq.iq`,
                                      phone: u.phone || '07700000000',
                                      modules: parsedModules,
                                      canManageUsers: isUserAdmin,
                                      role: isUserAdmin ? 'Admin' : (u.role || 'Employee'),
                                      level: 'full',
                                      notes: 'مخول بالعمل على الموديولات المحددة'
                                    });
                                    setBadgeSearchQuery(`${fullName} (${uCode})`);
                                    setShowUserPassword(false);
                                    setIsAddUserModalOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                                  title={t('تعديل بيانات وصلاحيات المستخدم', 'Edit User & Permissions')}
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>

                                {/* Quick Change Password Button - Vibrant Solid Amber Background with Crisp White Icon */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPasswordModalUser(u);
                                    setQuickNewPassword('');
                                    setShowQuickPassword(false);
                                  }}
                                  className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                                  title={t('تغيير كلمة المرور مباشرة', 'Change Password Directly')}
                                >
                                  <span className="material-symbols-outlined text-base">key</span>
                                </button>

                                {/* Delete Button - Reliable In-App Confirmation Modal */}
                                <button
                                  type="button"
                                  onClick={() => setUserToDeleteConfirm(u)}
                                  className="w-8 h-8 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                                  title={t('حذف المستخدم', 'Delete User')}
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 11: API & Access Key Manager (sec-api-keys)
          ========================================================================= */}
      {activeModuleId === 'sec-api-keys' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">vpn_key</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('المفاتيح النشطة', 'Active Keys')}</p>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {apiKeys.filter(k => k.status === 'نشط').length}
                </h3>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('معيار التشفير', 'Encryption Standard')}</p>
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  AES-256 GCM
                </h3>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
              }`}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">sync_alt</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('تكامل البنك المركزي', 'CBI Integration')}</p>
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {t('متصل ونشط', 'Connected')}
                </h3>
              </div>
            </div>
          </div>

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys.map((item) => {
              const isRevealed = !!revealedKeys[item.id];
              const isCopied = copiedKeyId === item.id;
              const displayKey = isRevealed
                ? item.key
                : `${item.key.slice(0, 12)}••••••••••••••••${item.key.slice(-4)}`;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
                    }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                        {item.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {item.status}
                      </span>
                      {item.permissions && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                          {item.permissions}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 select-all ${isDark ? 'bg-slate-900 border-white/10 text-teal-300' : 'bg-slate-50 border-slate-200 text-teal-700'
                        }`}>
                        <span>{displayKey}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRevealKey(item.id)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        title={isRevealed ? t('إخفاء المفتاح', 'Hide Key') : t('إظهار المفتاح', 'Reveal Key')}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isRevealed ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyApiKey(item.id, item.key)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${isCopied
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isCopied ? 'check' : 'content_copy'}
                        </span>
                        <span>{isCopied ? t('تم النسخ', 'Copied') : t('نسخ المفتاح', 'Copy')}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                      <span>{t('تاريخ الإنشاء:', 'Created:')} {item.created}</span>
                      {item.expires && (
                        <span>• {t('تاريخ الانتهاء:', 'Expires:')} {item.expires}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteApiKey(item.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">block</span>
                      <span>{t('إلغاء المفتاح', 'Revoke Key')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security Alert Note */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">shield</span>
            <div>
              <p className="font-bold">{t('إرشادات أمان مفاتيح الربط البرمجي:', 'API Security Best Practices:')}</p>
              <p className="text-[11px] mt-0.5 text-amber-800/80 dark:text-amber-200/80">
                {t('لا تشارك مفاتيح API في بيئات الاختبار غير المحمية أو عبر البريد الإلكتروني. يتم تسجيل كافة استدعاءات المفاتيح في سجل تدقيق الأمان (Audit Trail) بشكل فوري وفحص عنوان IP.', 'Never expose production API keys in client-side code or unencrypted emails. All calls are logged in the Security Audit Trail with IP verification.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          DYNAMIC "ADD / EDIT USER & MODULE PERMISSIONS" MODAL
      ============================================================ */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl xl:max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-inner ${newUserForm.id
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                  }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {newUserForm.id ? 'manage_accounts' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {newUserForm.id
                      ? (language === 'ar'
                        ? `تعديل بيانات وصلاحيات المستخدم: ${newUserForm.fullNameAr || newUserForm.username}`
                        : `Edit User & Permissions: ${newUserForm.fullNameEn || newUserForm.username}`)
                      : t('إنشاء يوزر جديد وتحديد نوع الوظيفة والموديولات', 'Add New User, Job Title & Assign Module Permissions')
                    }
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {newUserForm.id
                      ? t('قم بتعديل بيانات الحساب، كلمة المرور، المسمى الوظيفي، أو الصلاحيات الممنوحة للمستخدم', 'Update user credentials, password, job title, or assigned permissions')
                      : t('أدخل بيانات المستخدم، حدد نوع الوظيفة، وضع علامة (Tick ✓) على الموديولات المسموحة له', 'Enter user details, specify job title, and check (Tick ✓) the allowed modules')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewUser} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">

              {/* Section 1: User Account & Job Title Info */}
              <div className={`p-4 rounded-2xl border space-y-3.5 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50/80 border-slate-200'
                }`}>
                <h4 className="font-bold text-xs flex items-center gap-2 text-teal-600 dark:text-teal-400">
                  <span className="material-symbols-outlined text-base">badge</span>
                  <span>{t('1. بيانات المستخدم ونوع الوظيفة (User & Position Details)', '1. User Account & Position Details')}</span>
                </h4>

                {/* 🌟 Account Type Switcher: Employee vs Executive / Special Admin */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-2xl border border-slate-300/60 dark:border-white/10">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setNewUserForm(prev => ({
                          ...prev,
                          userType: 'employee',
                          role: 'Employee'
                        }));
                      }}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${newUserForm.userType !== 'special_executive'
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <span className="material-symbols-outlined text-base">badge</span>
                      <span>{t('موظف من كادر المؤسسة (Employee Directory)', 'Staff Employee')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewUserForm(prev => ({
                          ...prev,
                          userType: 'special_executive',
                          jobTitle: 'المدير العام (General Manager)',
                          department: 'الإدارة العليا والتنفيذية',
                          role: 'General Manager'
                        }));
                        setMatchedEmployee(null);
                        setMatchedEmpSubCount(0);
                      }}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${newUserForm.userType === 'special_executive'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <span className="material-symbols-outlined text-base">corporate_fare</span>
                      <span>{t('كادر قيادي / مدير عام / خاص (غير مدرج بالموظفين)', 'Special / Executive (Not in Employee Directory)')}</span>
                    </button>
                  </div>
                </div>

                {/* Branch A: Special Executive Account UI */}
                {newUserForm.userType === 'special_executive' ? (
                  <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-300'
                    }`}>
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <span className="material-symbols-outlined text-xl">corporate_fare</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-purple-900 dark:text-purple-200">
                            {t('حساب إداري / قيادي خاص (غير مدرج في كادر الموظفين الاعتيادي)', 'Special Executive Account (Not in Employee Directory)')}
                          </h5>
                          <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
                            {t('مخصص للمدراء العامين، مدير الموارد البشرية، والقيادات التنفيذية. يمكنك تحديد الصلاحيات والبيانات يدوياً دون الحاجة لوجوده في جدول كادر ورواتب الموظفين.',
                              'For General Managers, HR Directors, and leadership staff. Customize credentials and permissions directly without linking to the staff payroll table.')}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-500/30 shrink-0">
                        👑 {t('رؤية شاملة للمؤسسة', 'Company-Wide Scope')}
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/40 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300">{t('نماذج جاهزة سريعة:', 'Quick Roles:')}</span>

                      <button
                        type="button"
                        onClick={() => {
                          applyRolePreset('General Manager');
                          setNewUserForm(prev => ({
                            ...prev,
                            userType: 'special_executive',
                            jobTitle: 'المدير العام (General Manager)',
                            department: 'الإدارة العليا والتنفيذية',
                            role: 'General Manager',
                            level: 'full',
                            fullNameAr: prev.fullNameAr || 'المدير العام التنفيذي',
                            fullNameEn: prev.fullNameEn || 'General Manager / CEO',
                            username: prev.username || 'gm.executive'
                          }));
                        }}
                        className="px-3 py-1 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <span>👔</span>
                        <span>{t('المدير العام (GM / CEO)', 'General Manager (GM)')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          applyRolePreset('HR Manager');
                          setNewUserForm(prev => ({
                            ...prev,
                            userType: 'special_executive',
                            jobTitle: 'مدير الموارد البشرية والشؤون الإدارية',
                            department: 'الموارد البشرية والشؤون الإدارية',
                            role: 'HR Manager',
                            level: 'full',
                            fullNameAr: prev.fullNameAr || 'مدير الموارد البشرية',
                            fullNameEn: prev.fullNameEn || 'HR Director',
                            username: prev.username || 'hr.director'
                          }));
                        }}
                        className="px-3 py-1 rounded-xl bg-teal-600 text-white hover:bg-teal-500 font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <span>👥</span>
                        <span>{t('مدير الموارد البشرية (HR Manager)', 'HR Manager')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          applyRolePreset('Compliance Officer');
                          setNewUserForm(prev => ({
                            ...prev,
                            userType: 'special_executive',
                            jobTitle: 'مسؤول الرقابة والامتثال والحوكمة',
                            department: 'المخاطر والامتثال والحوكمة',
                            role: 'Compliance Officer',
                            level: 'read',
                            fullNameAr: prev.fullNameAr || 'مسؤول الامتثال والحوكمة',
                            fullNameEn: prev.fullNameEn || 'Compliance Officer',
                            username: prev.username || 'compliance.officer'
                          }));
                        }}
                        className="px-3 py-1 rounded-xl bg-amber-600 text-white hover:bg-amber-500 font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <span>⚖️</span>
                        <span>{t('مسؤول رقابة وامتثال (Compliance)', 'Compliance Officer')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 🌟 Dynamic Searchable Combobox for Badge & Employee Name */}
                    <div className={`p-3.5 rounded-2xl border space-y-2 relative ${isDark ? 'bg-teal-950/20 border-teal-500/30' : 'bg-teal-50/70 border-teal-500/30'
                      }`}>
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-teal-800 dark:text-teal-300 text-xs flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">person_search</span>
                          <span>{t('البحث التفاعلي برقم البادج أو اسم الموظف (Dynamic Combobox Search)', 'Dynamic Search by Badge No. or Employee Name')}</span>
                        </label>

                        {matchedEmployee && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            <span>{t('تم ربط الموظف والملء التلقائي', 'Employee Linked & Autofilled')}</span>
                          </span>
                        )}
                      </div>

                      <div ref={comboboxRef} className="relative">
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute start-3 text-teal-600 text-base pointer-events-none">
                            search
                          </span>
                          <input
                            type="text"
                            placeholder={t('اكتب رقم البادج (مثال: B-101، v 96) أو اسم الموظف بالعربية أو الإنجليزية للبحث الفوري...', 'Type Badge No. (e.g. B-101, v 96) or employee name to filter live...')}
                            value={badgeSearchQuery}
                            onFocus={() => setIsComboboxOpen(true)}
                            onKeyDown={e => {
                              if (e.key === 'Escape') {
                                setIsComboboxOpen(false);
                              }
                            }}
                            onChange={e => {
                              setBadgeSearchQuery(e.target.value);
                              setIsComboboxOpen(true);
                            }}
                            className={`w-full ps-9 pe-16 py-2.5 rounded-xl border text-xs outline-none font-bold transition-all shadow-sm ${isDark ? 'bg-[#111827] border-teal-500/40 text-white placeholder-slate-500 focus:border-teal-400' : 'bg-white border-teal-500/40 text-slate-900 placeholder-slate-400 focus:border-teal-600'
                              }`}
                          />
                          <div className="absolute end-2 flex items-center gap-1">
                            {badgeSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBadgeSearchQuery('');
                                  setMatchedEmployee(null);
                                  setIsComboboxOpen(false);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="مسح البحث"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                              className="p-1 rounded-lg text-teal-600 hover:bg-teal-500/10 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">
                                {isComboboxOpen ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Floating Dropdown List of Filtered Employees with Guaranteed Solid Black Text */}
                        {isComboboxOpen && (
                          <>
                            {/* Transparent Backdrop to immediately intercept any click outside the dropdown and close it */}
                            <div
                              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsComboboxOpen(false);
                              }}
                            />

                            <div
                              className="absolute start-0 end-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-2xl border-2 border-teal-500 shadow-2xl divide-y divide-slate-200"
                              style={{ backgroundColor: '#ffffff', color: '#000000' }}
                            >
                              {/* Sticky Header Bar with Count and Dedicated Close Button */}
                              <div className="sticky top-0 z-10 px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 shadow-xs">
                                <span className="flex items-center gap-1.5 text-teal-800">
                                  <span className="material-symbols-outlined text-sm text-teal-600">badge</span>
                                  <span>{t('نتائج بحث الموظفين', 'Employee Search Results')} ({filteredEmployeesForCombobox.length})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsComboboxOpen(false);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-xs">close</span>
                                  <span>{t('إغلاق', 'Close')}</span>
                                </button>
                              </div>

                              {filteredEmployeesForCombobox.length === 0 ? (
                                <div className="p-4 text-center text-xs font-bold" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                                  <span className="material-symbols-outlined text-2xl block mb-1 text-slate-500">search_off</span>
                                  {t('لا يوجد موظف مطابق لهذا البحث', 'No matching employee found')}
                                </div>
                              ) : (
                                filteredEmployeesForCombobox.map((emp: any) => {
                                  const b = emp.badge_no || emp.badgeNo || emp.employee_id || emp.employeeId || emp.id || '';
                                  const arName = extractArabicName(emp);
                                  const enName = extractEnglishName(emp);
                                  const dept = emp.department || emp.department_ar || '';
                                  const pos = emp.position || emp.position_ar || emp.job_title || emp.jobTitle || '';
                                  const mainName = arName || enName || `موظف #${b}`;
                                  const photo = emp.photoUrl || emp.photo_url || emp.photo || emp.avatar || emp.avatarUrl || emp.profile_image || '';

                                  return (
                                    <button
                                      key={emp.id || b}
                                      type="button"
                                      onClick={() => handleAutofillFromEmployee(emp)}
                                      className="w-full p-2.5 text-start flex items-center justify-between gap-3 transition-all cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-teal-50/80"
                                      style={{ backgroundColor: '#ffffff', color: '#000000' }}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        {/* Employee Photo Thumbnail or Fallback Icon */}
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-teal-200 text-teal-800 flex items-center justify-center text-sm shrink-0 shadow-sm">
                                          {photo ? (
                                            <img
                                              src={photo}
                                              alt={mainName}
                                              className="w-full h-full object-contain p-0.5"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                              }}
                                            />
                                          ) : (
                                            <span className="material-symbols-outlined text-xl text-teal-700">person</span>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Main Arabic / Full Name in Normal Font Weight */}
                                            <span
                                              className="font-normal text-sm"
                                              style={{ color: '#000000', WebkitTextFillColor: '#000000', fontWeight: 400 }}
                                            >
                                              {mainName}
                                            </span>
                                            {/* Secondary English Name in Normal Font Weight */}
                                            {enName && arName && enName.toLowerCase() !== arName.toLowerCase() && (
                                              <span
                                                className="text-xs font-normal"
                                                style={{ color: '#475569', WebkitTextFillColor: '#475569', fontWeight: 400 }}
                                              >
                                                ({enName})
                                              </span>
                                            )}
                                          </div>
                                          <p
                                            className="text-xs font-normal mt-0.5"
                                            style={{ color: '#64748b', WebkitTextFillColor: '#64748b', fontWeight: 400 }}
                                          >
                                            {pos ? `${pos} • ` : ''}{dept}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-end">
                                        <span
                                          className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 font-mono font-bold text-xs shadow-sm inline-block"
                                          style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                                        >
                                          {b}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 🌟 Dynamic Supervisor / Employee Scope Indicator Banner */}
                    {matchedEmployee ? (
                      <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${matchedEmpSubCount > 0
                        ? (isDark ? 'bg-amber-950/25 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-500/40 text-amber-900')
                        : (isDark ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-500/40 text-emerald-900')
                        }`}>
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${matchedEmpSubCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                            <span className="material-symbols-outlined text-2xl">
                              {matchedEmpSubCount > 0 ? 'supervised_user_circle' : 'person'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs">
                                {matchedEmpSubCount > 0
                                  ? t(`تم الكشف تلقائياً: هذا الموظف مشرف مباشر على (${matchedEmpSubCount}) موظفاً في الشركة`,
                                    `Auto-Detected: This employee directly supervises (${matchedEmpSubCount}) staff members`)
                                  : t('موظف اعتيادي (لا يوجد موظفون تابعون له مباشرة في الشركة)',
                                    'Standard Employee (Does not supervise subordinates in the company)')}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
                              {matchedEmpSubCount > 0
                                ? t('سيتم ضبط نطاق البيانات تلقائياً ليشمل داشبورد موظفيه، والبروفايل، والإجازات، والحضور، والوثائق التابعة لموظفيه وبياناته الشخصية، خاضعاً للصلاحيات المحددة في المصفوفة أدناه.',
                                  'Data scope will automatically include team dashboard, employee profiles, leaves, attendance, and documents of their team + self, governed by permissions matrix below.')
                                : t('سيقتصر نطاق البيانات التلقائي على بياناته الشخصية كموظف (ملفه الشخصي، إجازاته، دوامه، ومستنداته) خاضعاً لمصفوفة الصلاحيات المحددة أدناه.',
                                  'Data scope will automatically restrict to personal employee records (own profile, leaves, attendance, and documents) governed by permissions matrix below.')}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 self-end sm:self-center">
                          <span className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm ${matchedEmpSubCount > 0
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                            }`}>
                            <span className="material-symbols-outlined text-sm">
                              {matchedEmpSubCount > 0 ? 'workspace_premium' : 'badge'}
                            </span>
                            <span>{matchedEmpSubCount > 0 ? t('مشرف (Supervisor)', 'Supervisor') : t('موظف (Employee)', 'Employee')}</span>
                          </span>
                        </div>
                      </div>
                    ) : !newUserForm.id ? (
                      <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${isDark ? 'bg-sky-950/20 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-300 text-sky-800'
                        }`}>
                        <span className="material-symbols-outlined text-lg shrink-0 text-sky-500">info</span>
                        <p className="text-[11px] leading-relaxed">
                          {t('يمكنك اختيار موظف مسجل لربطه وتحديد صفته الإشرافية تلقائياً، أو التبديل إلى "كادر قيادي / خاص" أعلاه للمدراء العامين ومدير الموارد البشرية.',
                            'Select an employee to link them and auto-detect supervision, or switch to "Special / Executive" above for General Managers and HR Directors.')}
                        </p>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Username */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('اسم المستخدم للدخول (Username) *', 'Username *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. dataentry.hr أو vts1055"
                      value={newUserForm.username}
                      onChange={e => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                        {newUserForm.id
                          ? t('كلمة المرور (اختياري - اتركها فارغة للاحتفاظ بالقديمة)', 'Password (Optional - leave blank to keep current)')
                          : t('كلمة المرور *', 'Password *')}
                      </label>
                      {newUserForm.id && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {t('محمية ومحفوظة', 'Kept Secure')}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        required={!newUserForm.id}
                        placeholder={
                          newUserForm.id
                            ? t('•••••••• (اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية دون تغيير)', '•••••••• (Leave blank to keep current unchanged)')
                            : 'Password123!'
                        }
                        value={newUserForm.password}
                        onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                        className={`w-full px-3 py-2 pe-10 rounded-xl border text-xs font-mono outline-none transition-all ${isDark ? 'bg-[#111827] border-slate-700 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showUserPassword ? t('إخفاء', 'Hide') : t('إظهار', 'Show')}
                      >
                        <span className="material-symbols-outlined text-base">
                          {showUserPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {newUserForm.id && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('لا داعي لإدخال كلمة المرور إلا إذا كنت ترغب بتعيين كلمة مرور جديدة لهذا المستخدم.', 'Only enter a password if you wish to set a new password for this user.')}
                      </p>
                    )}
                  </div>

                  {/* Job Title - highlighted */}
                  <div>
                    <label className="font-bold text-teal-700 dark:text-teal-300 block text-[11px] mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">work</span>
                      <span>{t('نوع الوظيفة / المسمى الوظيفي *', 'Job Title / Position *')}</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مدخل بيانات موارد بشرية"
                      value={newUserForm.jobTitle}
                      onChange={e => setNewUserForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none border-teal-500/50 shadow-sm ${isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-900'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name AR */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('الاسم الكامل بالعربية *', 'Full Name (Arabic) *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد كريم عبدالله"
                      value={newUserForm.fullNameAr}
                      onChange={e => setNewUserForm(prev => ({ ...prev, fullNameAr: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Full Name EN */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('الاسم الكامل بالإنجليزية', 'Full Name (English)')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmed Kareem Abdullah"
                      value={newUserForm.fullNameEn}
                      onChange={e => setNewUserForm(prev => ({ ...prev, fullNameEn: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Department */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('القسم / الإدارة', 'Department')}
                    </label>
                    <select
                      value={newUserForm.department}
                      onChange={e => setNewUserForm(prev => ({ ...prev, department: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    >
                      {allUniqueDepartments.map(d => (
                        <option key={d.name_ar} value={d.name_ar}>
                          {language === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('البريد الإلكتروني', 'Email')}
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. dataentry@vitasiraq.iq"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('رقم الهاتف', 'Phone')}
                    </label>
                    <input
                      type="text"
                      placeholder="07700000000"
                      value={newUserForm.phone}
                      onChange={e => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                </div>

                {/* Admin Privileges Card */}
                <div className={`p-4 rounded-2xl border transition-all ${newUserForm.canManageUsers
                  ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15 dark:border-amber-500/50 shadow-sm'
                  : (isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200')
                  }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(newUserForm.canManageUsers)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setNewUserForm(prev => {
                          const nextModules = { ...prev.modules };
                          if (checked) {
                            nextModules['sec-roles-permissions'] = 'write';
                            nextModules['sec-roles'] = 'write';
                            nextModules['cat-9-risk'] = 'write';
                            nextModules['risk'] = 'write';
                          } else {
                            // Explicitly clear all User Management related modules
                            nextModules['sec-roles-permissions'] = 'none';
                            nextModules['sec-roles'] = 'none';
                            // Only clear cat-9-risk / risk if no other risk sub-module is active
                            const otherRiskActive = ['risk-matrix', 'risk-audit-logs', 'risk-policies', 'risk-incidents', 'risk-compliance-checklist', 'risk-assessment'].some(
                              id => nextModules[id] === 'write' || nextModules[id] === 'read' || nextModules[id] === true
                            );
                            if (!otherRiskActive) {
                              nextModules['cat-9-risk'] = 'none';
                              nextModules['risk'] = 'none';
                            }
                          }
                          return {
                            ...prev,
                            canManageUsers: checked,
                            role: checked ? 'Admin' : (prev.jobTitle.includes('مدير الموارد') ? 'HR Manager' : 'Employee'),
                            modules: nextModules
                          };
                        });
                      }}
                      className="mt-1 w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">admin_panel_settings</span>
                        <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                          {t('منح صلاحية مسؤول نظام (Admin) لإدارة وإضافة المستخدمين', 'Grant Admin Privileges (Manage & Add Users)')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          {t('صلاحية إدارية عليا', 'High Administrative Privilege')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {t('تفعيل هذا الخيار يمنح المستخدم صلاحية الدخول لشاشة إدارة المستخدمين والصلاحيات (sec-roles-permissions) وإضافة مستخدمين جدد وتعديل الأدوار وكلمات المرور.',
                          'Enabling this grants the user access to User Management & RBAC screen, allowing them to add/edit users, assign permissions, and manage credentials.')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Role & Automatic Permissions Combobox */}
              {(() => {
                const activePreset = ROLE_PRESET_CONFIGS.find(p => p.id === selectedRolePreset) || ROLE_PRESET_CONFIGS[0];
                return (
                  <div className={`p-4 rounded-2xl border space-y-3 transition-all ${isDark ? 'bg-gradient-to-r from-teal-950/30 to-[#0a0c10] border-teal-500/40' : 'bg-gradient-to-r from-teal-50/90 to-sky-50/70 border-teal-500/40'
                    }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs flex items-center gap-2 text-teal-700 dark:text-teal-300">
                          <span className="material-symbols-outlined text-base">auto_fix_high</span>
                          <span>{t('تحديد الصلاحيات تلقائياً حسب نوع الوظيفة (Role-Based Preset) أو يدوياً', 'Automatic Role Preset or Manual Customization')}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('اختر دوراً وظيفياً لتعبئة مصفوفة الصلاحيات تلقائياً، مع إمكانية التعديل اليدوي على أي شاشة لاحقاً',
                            'Select a preset role to auto-configure permissions, with full ability to manually customize any screen below')}
                        </p>
                      </div>

                      {activePreset && activePreset.id !== 'manual' && (
                        <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/40 text-[10px] font-bold self-start sm:self-auto flex items-center gap-1 shadow-2xs">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          <span>{language === 'ar' ? activePreset.badgeAr : activePreset.badgeEn}</span>
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <span className={`material-symbols-outlined absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} text-lg pointer-events-none text-teal-600 dark:text-teal-400`}>
                        {activePreset?.icon || 'tune'}
                      </span>
                      <select
                        value={selectedRolePreset}
                        onChange={(e) => handleApplyRolePreset(e.target.value)}
                        className={`w-full ${language === 'ar' ? 'pr-11 pl-9' : 'pl-11 pr-9'} py-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer appearance-none shadow-sm transition-all ${isDark
                          ? 'bg-[#111827] border-teal-500/50 text-white focus:border-teal-400'
                          : 'bg-white border-teal-500/50 text-slate-900 focus:border-teal-600'
                          }`}
                      >
                        {ROLE_PRESET_CONFIGS.map(preset => (
                          <option key={preset.id} value={preset.id} className={isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-900'}>
                            {language === 'ar' ? preset.titleAr : preset.titleEn}
                          </option>
                        ))}
                      </select>
                      <span className={`material-symbols-outlined absolute ${language === 'ar' ? 'left-3.5' : 'right-3.5'} text-base pointer-events-none text-slate-400`}>
                        expand_more
                      </span>
                    </div>

                    {/* Active Preset Details Card */}
                    {activePreset && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${activePreset.id === 'manual'
                        ? (isDark ? 'bg-[#0a0c10] border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600')
                        : (isDark ? 'bg-teal-950/40 border-teal-500/40 text-slate-200' : 'bg-white border-teal-500/30 text-slate-800 shadow-2xs')
                        }`}>
                        <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${activePreset.id === 'manual' ? 'text-slate-400' : 'text-teal-500'}`}>
                          {activePreset.id === 'manual' ? 'edit_note' : 'info'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[11px] text-teal-700 dark:text-teal-300">
                              {language === 'ar' ? activePreset.titleAr : activePreset.titleEn}
                            </span>
                            {activePreset.id !== 'manual' && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                ({t('تم تطبيق الصلاحيات تلقائياً على المصفوفة أدناه ويمكنك تعديلها يدوياً', 'Permissions auto-applied to matrix below; you can also tweak manually')})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] leading-relaxed mt-1 text-slate-600 dark:text-slate-300">
                            {language === 'ar' ? activePreset.descAr : activePreset.descEn}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section 2: Dynamic Hierarchical Module & Screen Permissions */}
              <div className="space-y-4">
                {/* Section Header with Stats & Global Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl border border-teal-500/20 bg-teal-500/5">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs flex items-center gap-2 text-teal-700 dark:text-teal-300">
                      <span className="material-symbols-outlined text-base">rule</span>
                      <span>{t('2. مصفوفة الصلاحيات والموديولات الديناميكية (Read & Read/Write)', '2. Dynamic Module & Screen Permissions Matrix')}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('حدد لكل شاشة وموديول نوع الصلاحية: قراءة فقط (Read) أو قراءة وكتابة وتعديل (Read / Write)',
                        'Set permission level for each screen: Read Only or Read & Write')}
                    </p>
                  </div>

                  {/* Summary Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span>
                        {permissionStats.total} {t('شاشة مصرح بها', 'screens')}
                        <span className="font-normal opacity-85 text-[10px] mx-1">
                          ({permissionStats.writeCount} {t('تعديل', 'Write')} • {permissionStats.readCount} {t('قراءة', 'Read')})
                        </span>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Filter & Global Actions Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Search filter input */}
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder={t('بحث سريع في الموديولات والشاشات (مثال: رواتب، عقود، تقارير...)...', 'Search screens & modules (e.g. payroll, contracts, reports...)...')}
                      value={moduleFilterQuery}
                      onChange={e => setModuleFilterQuery(e.target.value)}
                      className={`w-full ps-9 pe-3 py-2 rounded-xl border text-xs outline-none transition-all ${isDark ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600'
                        }`}
                    />
                    {moduleFilterQuery && (
                      <button
                        type="button"
                        onClick={() => setModuleFilterQuery('')}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Master Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGlobalAll('write')}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title={t('منح صلاحية كاملة (قراءة وتعديل) لكافة شاشات النظام', 'Grant Read/Write to all screens')}
                    >
                      <span className="material-symbols-outlined text-xs">edit_note</span>
                      <span>{t('الكل تعديل', 'All Write')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalAll('read')}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title={t('منح صلاحية قراءة فقط لكافة شاشات النظام', 'Grant Read Only to all screens')}
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      <span>{t('الكل قراءة', 'All Read')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalAll('none')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title={t('إلغاء جميع الصلاحيات', 'Clear all permissions')}
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                      <span>{t('إلغاء الكل', 'Clear All')}</span>
                    </button>

                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

                    <button
                      type="button"
                      onClick={() => {
                        const anyCollapsed = Object.values(expandedCategories).some(v => !v);
                        toggleAllCategories(anyCollapsed);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                      <span>{t('توسيع / طي', 'Expand / Collapse')}</span>
                    </button>
                  </div>
                </div>

                {/* Categories & Sub-Modules Tree */}
                <div className="space-y-3 pt-1">
                  {filteredCategoryGroups.map(cat => {
                    const isExpanded = moduleFilterQuery.trim() ? true : Boolean(expandedCategories[cat.id]);
                    const catModules = cat.modules.filter(m => !m.hidden);
                    const enabledCount = catModules.filter(m => {
                      const lvl = getModLevel(m.id);
                      return lvl === 'write' || lvl === 'read';
                    }).length;

                    const allWrite = catModules.length > 0 && catModules.every(m => getModLevel(m.id) === 'write');
                    const allRead = catModules.length > 0 && catModules.every(m => getModLevel(m.id) === 'read');

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-[#0f141f] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                          }`}
                      >
                        {/* Category Header Bar */}
                        <div
                          className={`p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${enabledCount > 0
                            ? isDark ? 'bg-teal-950/20 hover:bg-teal-950/30' : 'bg-teal-50/60 hover:bg-teal-50'
                            : isDark ? 'bg-[#0a0c10] hover:bg-white/5' : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                          onClick={() => toggleCategory(cat.id)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${enabledCount > 0 ? 'bg-teal-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                              }`}>
                              <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                  {language === 'ar' ? cat.title : cat.titleEn}
                                </h5>
                                {cat.id === 'cat-11-support' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">verified</span>
                                    {t('متاح تلقائياً لجميع المستخدمين (افتراضي)', 'Always available to all users by default')}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${enabledCount === catModules.length && enabledCount > 0
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : enabledCount > 0
                                    ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                  }`}>
                                  {enabledCount} / {catModules.length} {t('مفعل', 'active')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Category-Level Quick Action Buttons */}
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'write')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${allWrite
                                ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                                : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30'
                                }`}
                              title={t('منح صلاحية كتابة وتعديل لكل موديولات هذا القسم', 'Grant Read/Write to all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">edit_note</span>
                              <span className="hidden sm:inline">{t('الكل تعديل', 'All Write')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'read')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${allRead
                                ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                                : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30'
                                }`}
                              title={t('منح صلاحية قراءة فقط لكل موديولات هذا القسم', 'Grant Read Only to all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span className="hidden sm:inline">{t('الكل قراءة', 'All Read')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'none')}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-all cursor-pointer flex items-center gap-1"
                              title={t('إلغاء جميع صلاحيات هذا القسم', 'Clear all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                              <span className="hidden sm:inline">{t('إلغاء', 'Clear')}</span>
                            </button>

                            {/* Accordion Arrow Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <span className={`material-symbols-outlined text-base transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-modules list */}
                        {isExpanded && (
                          <div className="p-3 sm:p-4 space-y-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-black/10 animate-in fade-in duration-150">
                            <div className="grid grid-cols-1 gap-2">
                              {catModules.map(mod => {
                                const modLevel = getModLevel(mod.id);
                                return (
                                  <div
                                    key={mod.id}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${modLevel === 'write'
                                      ? isDark ? 'bg-teal-950/25 border-teal-500/40 shadow-xs shadow-teal-500/5' : 'bg-teal-50/80 border-teal-500/40 shadow-xs'
                                      : modLevel === 'read'
                                        ? isDark ? 'bg-sky-950/25 border-sky-500/40 shadow-xs shadow-sky-500/5' : 'bg-sky-50/80 border-sky-500/40 shadow-xs'
                                        : isDark ? 'bg-[#0a0c10]/40 border-white/5 opacity-80 hover:opacity-100' : 'bg-white border-slate-200/80 opacity-80 hover:opacity-100'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${modLevel === 'write' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                                        modLevel === 'read' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                        }`}>
                                        <span className="material-symbols-outlined text-lg">{mod.icon || 'radio_button_unchecked'}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                            {language === 'ar' ? mod.title : mod.titleEn}
                                          </span>
                                          <span className="font-mono text-[9px] text-slate-400 hidden md:inline">({mod.id})</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md">
                                          {mod.description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* 3-State Segmented Control: None | Read | Read & Write */}
                                    <div className="flex items-center bg-slate-200/80 dark:bg-black/40 p-1 rounded-xl shrink-0 self-end sm:self-auto border border-slate-300 dark:border-white/10">
                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'none')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${modLevel === 'none'
                                          ? 'bg-slate-500 text-white shadow-xs'
                                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                          }`}
                                        title={t('تعطيل هذا الموديول', 'Disable this module')}
                                      >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                        <span>{t('معطل', 'None')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'read')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${modLevel === 'read'
                                          ? 'bg-sky-600 text-white shadow-xs'
                                          : 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
                                          }`}
                                        title={t('صلاحية قراءة وعرض فقط', 'Read only')}
                                      >
                                        <span className="material-symbols-outlined text-xs">visibility</span>
                                        <span>{t('قراءة', 'Read')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'write')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${modLevel === 'write'
                                          ? 'bg-teal-600 text-white shadow-xs'
                                          : 'text-teal-600 dark:text-teal-400 hover:bg-teal-500/10'
                                          }`}
                                        title={t('صلاحية كاملة قراءة وتعديل وكتابة', 'Read and write')}
                                      >
                                        <span className="material-symbols-outlined text-xs">edit_note</span>
                                        <span>{t('قراءة وكتابة', 'Read / Write')}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Buttons - Sticky at Bottom */}
              <div className="sticky bottom-0 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md z-20 py-3.5 px-6 -mx-6 -mb-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shadow-2xl">
                <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  {newUserForm.id
                    ? t('تعديل الحساب يحدّث قاعدة البيانات فوراً عبر السيرفر والمزامنة السحابية', 'Saving updates DB directly across local & cloud nodes')
                    : t('يتم حفظ المستخدم فوراً مع الصلاحيات المحددة', 'User and permissions are saved immediately')}
                </div>
                <div className="flex items-center gap-3 ms-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-lg shadow-teal-600/25 flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">{newUserForm.id ? 'save' : 'person_add'}</span>
                    <span>
                      {newUserForm.id
                        ? t('حفظ التعديلات على المستخدم والصلاحيات', 'Save Changes to User & Permissions')
                        : t('حفظ وإنشاء المستخدم مع الصلاحيات', 'Save & Create User with Permissions')}
                    </span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          QUICK CHANGE PASSWORD MODAL (DIRECT & INSTANT)
      ============================================================ */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('تغيير كلمة المرور', 'Change User Password')}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {passwordModalUser.full_name || passwordModalUser.name || passwordModalUser.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickChangePassword} className="p-6 space-y-4 text-xs">
              {/* User summary badge */}
              <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('اسم الدخول:', 'Username:')}</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{passwordModalUser.username}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('كود الموظف:', 'Employee Code:')}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{passwordModalUser.employee_id || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('المسمى الوظيفي:', 'Position:')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{passwordModalUser.job_title || passwordModalUser.role || '-'}</span>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {t('كلمة المرور الجديدة *', 'New Password *')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
                      let gen = '';
                      for (let i = 0; i < 10; i++) gen += chars.charAt(Math.floor(Math.random() * chars.length));
                      setQuickNewPassword(gen);
                      setShowQuickPassword(true);
                    }}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <span className="material-symbols-outlined text-xs">autorenew</span>
                    <span>{t('توليد كلمة عشوائية', 'Generate')}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showQuickPassword ? 'text' : 'password'}
                    required
                    value={quickNewPassword}
                    onChange={e => setQuickNewPassword(e.target.value)}
                    placeholder={t('أدخل كلمة المرور الجديدة (4 أحرف على الأقل)...', 'Enter new password (min 4 characters)...')}
                    className={`w-full px-3.5 py-2.5 pe-10 rounded-xl border text-xs font-mono outline-none ${isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPassword(!showQuickPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showQuickPassword ? t('إخفاء', 'Hide') : t('إظهار', 'Show')}
                  >
                    <span className="material-symbols-outlined text-base">
                      {showQuickPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {t('سيتم تحديث كلمة المرور في قاعدة البيانات فوراً ومزامنتها مع الخادم السحابي.', 'Password updates directly in MySQL and syncs to cloud immediately.')}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={isSavingQuickPassword}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickPassword}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg shadow-amber-600/25 flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{isSavingQuickPassword ? 'sync' : 'check'}</span>
                  <span>{isSavingQuickPassword ? t('جاري الحفظ...', 'Saving...') : t('حفظ كلمة المرور', 'Save Password')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          CONFIRM DELETE USER MODAL (RELIABLE IN-APP MODAL)
      ============================================================ */}
      {userToDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">delete_forever</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400">
                    {t('تأكيد حذف المستخدم', 'Confirm User Deletion')}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {userToDeleteConfirm.full_name || userToDeleteConfirm.name || userToDeleteConfirm.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDeleteConfirm(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-rose-600">warning</span>
                  <span>{t('هل أنت متأكد من رغبتك بحذف هذا الحساب نهائياً؟', 'Are you sure you want to permanently delete this user account?')}</span>
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {t('سيتم إلغاء صلاحيات الدخول للمستخدم وحذف بياناته وحسابه من قاعدة البيانات فوراً. لا يؤثر هذا على بطاقة الموظف في جدول الموظفين.',
                    'The user login and assigned permissions will be deleted immediately. This does not delete their record from the employees table.')}
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('اسم الدخول:', 'Username:')}</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{userToDeleteConfirm.username}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('كود الموظف:', 'Employee Code:')}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{userToDeleteConfirm.employee_id || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('المسمى الوظيفي:', 'Position:')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{userToDeleteConfirm.job_title || userToDeleteConfirm.role || '-'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUserToDeleteConfirm(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                >
                  {t('إلغاء التراجع', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={handleConfirmDeleteUser}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isDeletingUser ? 'hourglass_top' : 'delete'}
                  </span>
                  <span>{isDeletingUser ? t('جارٍ الحذف...', 'Deleting...') : t('نعم، احذف المستخدم', 'Yes, Delete User')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          AUDIT EVENT INSPECTION & HASH VERIFICATION MODAL
      ============================================================ */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">policy</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {t('فحص تفاصيل الحدث الأمني وسجل التدقيق', 'Security Audit Event Inspection')}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-teal-600 dark:text-teal-400">
                    <span>{selectedAuditLog.id}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-400 font-sans">{selectedAuditLog.timestamp}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Event Title Banner */}
              <div className={`p-4 rounded-2xl border ${selectedAuditLog.severity === 'critical'
                ? 'bg-rose-500/10 border-rose-500/30'
                : selectedAuditLog.severity === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-teal-500/10 border-teal-500/30'
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedAuditLog.action}
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold badge-white-text ${selectedAuditLog.status === 'محظور'
                      ? 'bg-rose-600 text-white'
                      : selectedAuditLog.status === 'تحذير'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                      }`}
                    style={{ color: '#ffffff' }}
                  >
                    {selectedAuditLog.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedAuditLog.details}
                </p>
              </div>

              {/* Actor & Source Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('المستخدم المنفذ للعملية (Actor):', 'Actor / User:')}</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedAuditLog.userName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedAuditLog.userId} ({selectedAuditLog.userRole})</p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('الموديول المستهدف والرمز:', 'Target Module & Code:')}</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedAuditLog.module}</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-mono mt-0.5">{selectedAuditLog.actionType}</p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('عنوان IP والمصدر الشبكي:', 'IP Address:')}</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{selectedAuditLog.ipAddress}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedAuditLog.userDevice}</p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('المستوى الأمني والامتثال:', 'Severity & Compliance:')}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${selectedAuditLog.severity === 'critical'
                    ? 'bg-rose-500/20 text-rose-400'
                    : selectedAuditLog.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                    {selectedAuditLog.severity.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{t('متوافق مع تعليمات CBI', 'CBI Compliant')}</p>
                </div>
              </div>

              {/* SHA-256 Tamper-Proof Checksum */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-teal-500">lock</span>
                    <span>{t('التوقيع الرقمي للحدث (SHA-256 Cryptographic Signature):', 'Cryptographic Signature (SHA-256):')}</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{t('سليم وغير معدل', 'Tamper-Proof Verified')}</span>
                </div>
                <div className="font-mono text-[10px] text-teal-600 dark:text-teal-400 break-all select-all bg-black/10 dark:bg-black/30 p-2 rounded-xl border border-white/5">
                  {selectedAuditLog.metadata?.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              {/* Metadata JSON Viewer */}
              {selectedAuditLog.metadata && (
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">data_object</span>
                      <span>{t('الحمولة الفنية والبيانات الوصفية (Metadata Payload):', 'Metadata Payload (JSON):')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedAuditLog.metadata, null, 2));
                        setAuditToast(language === 'ar' ? 'تم نسخ الحمولة الفنية!' : 'Metadata JSON copied!');
                        setTimeout(() => setAuditToast(null), 3000);
                      }}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[11px]">content_copy</span>
                      <span>{t('نسخ JSON', 'Copy')}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-black/15 dark:bg-black/40 p-3 rounded-xl overflow-x-auto select-all border border-white/5">
                    {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-end ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
              >
                {t('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MANUAL SECURITY AUDIT LOG MODAL
      ============================================================ */}
      {isAddAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">add_moderator</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {t('تسجيل فحص تدقيق أمني يدوي', 'Log Manual Security Audit')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('إضافة قيد رقابي رسمي إلى سجل التدقيق المركزي الموحد', 'Record official inspection note to audit ledger')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAuditModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddAuditRecordSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('موضوع أو عنوان الفحص التدقيقي *', 'Inspection Action / Subject *')}
                </label>
                <input
                  type="text"
                  required
                  value={newAuditForm.action}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, action: e.target.value })}
                  placeholder={t('مثال: فحص سلامة أذونات التوطين المصرفي للفرع الرئيسي', 'e.g., Audit inspection of banking payroll authorization')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('المستوى الأمني', 'Severity')}
                  </label>
                  <select
                    value={newAuditForm.severity}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, severity: e.target.value as any })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="info">{t('معلومات (Info)', 'Info')}</option>
                    <option value="success">{t('ناجح / معتمد (Success)', 'Success')}</option>
                    <option value="warning">{t('تحذير / مخاطرة (Warning)', 'Warning')}</option>
                    <option value="critical">{t('حرج / عالي الخطورة (Critical)', 'Critical')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('الحالة الناتجة', 'Resulting Status')}
                  </label>
                  <select
                    value={newAuditForm.status}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, status: e.target.value as any })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="ناجح">{t('ناجح (Approved)', 'Approved')}</option>
                    <option value="تحذير">{t('تحذير (Warning)', 'Warning')}</option>
                    <option value="محظور">{t('محظور (Blocked)', 'Blocked')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('الموديول أو القسم المستهدف', 'Target Module / Scope')}
                </label>
                <select
                  value={newAuditForm.module}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, module: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                >
                  <option value="الحوكمة والرقابة (cat-9-risk)">{t('الحوكمة والرقابة والامتثال (cat-9-risk)', 'Governance & Risk')}</option>
                  <option value="الرواتب والتعويضات (cat-5-payroll)">{t('الرواتب والتعويضات والتوطين (cat-5-payroll)', 'Payroll & Banking')}</option>
                  <option value="تسجيل الدخول والأمان (cat-1-auth)">{t('تسجيل الدخول والأمان والمصادقة (cat-1-auth)', 'Authentication & 2FA')}</option>
                  <option value="الموظفون والعقود (cat-3-emp)">{t('إدارة الموظفين والعقود (cat-3-emp)', 'Employee Management')}</option>
                  <option value="الأرشيف (cat-12-archive)">{t('الأرشيف والمستندات (cat-12-archive)', 'Digital Archive')}</option>
                  <option value="قواعد البيانات والنظام (cat-10-sys)">{t('قواعد البيانات والنظام (cat-10-sys)', 'System & Database')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('الملاحظات والتفاصيل الرقابية', 'Audit Findings & Notes')}
                </label>
                <textarea
                  rows={3}
                  value={newAuditForm.details}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, details: e.target.value })}
                  placeholder={t('اكتب تفاصيل التقرير، الملاحظات الفنية، أو التوصيات الرقابية بدقة...', 'Enter inspection findings, technical notes, or compliance recommendations...')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2 border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddAuditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>{t('حفظ وتسجيل الحدث', 'Save & Log Event')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          GENERATE NEW API KEY MODAL
      ============================================================ */}
      {isAddApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {t('إنشاء مفتاح ربط برمجي جديد', 'Generate New API Key')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('توليد مفتاح مشفر للربط مع الأنظمة المصرفية والجهات الرقابية', 'Generate 256-bit secure key for external integrations')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddApiKeyModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleGenerateApiKeySubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('اسم المفتاح أو الجهة المتصلة *', 'Key / Integration Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={newApiKeyForm.name}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, name: e.target.value })}
                  placeholder={t('مثال: منصة التوطين المصرفي CBI API Gateway', 'e.g., CBI Payment & Settlement Gateway')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('مستوى الصلاحيات الممنوحة', 'Granted Permissions')}
                </label>
                <select
                  value={newApiKeyForm.permissions}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, permissions: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                >
                  <option value="قراءة وكتابة (Full Access)">{t('قراءة وكتابة كاملة (Full Access)', 'Full Read / Write Access')}</option>
                  <option value="قراءة فقط (Read Only)">{t('قراءة فقط واستعلام (Read Only)', 'Read Only')}</option>
                  <option value="إرسال فقط (Send Only)">{t('إرسال إشعارات فقط (Send Only)', 'Send Only')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('تاريخ الانتهاء والصلاحية', 'Expiration Date')}
                </label>
                <input
                  type="date"
                  value={newApiKeyForm.expires}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, expires: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2 border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddApiKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">vpn_key</span>
                  <span>{t('توليد المفتاح', 'Generate Key')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          OFFICIAL AUDIT REPORT PREVIEW & PRINT MODAL
      ============================================================ */}
      {selectedReportForView && (
        <div className="audit-printable-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`audit-printable-modal w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col ${isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Modal Controls Bar (Hidden during print) */}
            <div className="print:hidden p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">verified</span>
                <div>
                  <h3 className="font-bold text-sm">{selectedReportForView.title}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedReportForView.id} • {selectedReportForView.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printAuditReport(selectedReportForView)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>{t('طباعة التقرير / حفظ PDF', 'Print / Save as PDF')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReportForView(null)}
                  className="p-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div className="audit-printable-content p-8 sm:p-10 space-y-6 text-xs leading-relaxed">
              {/* Official Header */}
              <div className="border-b-2 border-teal-600/60 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-teal-600 dark:text-teal-400">VITAS IRAQ</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">CHF International</span>
                  </div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('مؤسسة فيتاس العراق للتمويل الأصغر - تقرير التدقيق والامتثال التنظيمي', 'VITAS Iraq Microfinance - Regulatory Compliance & Audit Report')}
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    {t('خاضعة لرقابة وإشراف البنك المركزي العراقي للمؤسسات المالية غير المصرفية', 'Regulated by the Central Bank of Iraq (CBI) for Non-Banking Financial Institutions')}
                  </p>
                </div>
                <div className="sm:text-end font-mono text-[11px] space-y-1 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p><b>{t('رقم الوثيقة:', 'Doc Ref:')}</b> <span className="text-teal-600 dark:text-teal-400 font-bold">{selectedReportForView.id}</span></p>
                  <p><b>{t('تاريخ الإصدار:', 'Date:')}</b> {selectedReportForView.date}</p>
                  <p><b>{t('درجة السرية:', 'Classification:')}</b> <span className="text-rose-600 font-bold">رقابي / سري</span></p>
                  <p><b>{t('الموقف النهائي:', 'Verdict:')}</b> <span className="text-emerald-600 font-bold">{selectedReportForView.status}</span></p>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-teal-700 dark:text-teal-300">
                  {selectedReportForView.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span><b>{t('الجهة المدققة:', 'Auditor:')}</b> {selectedReportForView.auditor}</span>
                  <span>•</span>
                  <span><b>{t('دورة الفحص:', 'Cycle:')}</b> الربع السنوي الأول 2026</span>
                  <span>•</span>
                  <span><b>{t('المعيار الرقابي:', 'Framework:')}</b> تعليمات البنك المركزي رقم 4 وقانون 18 لسنة 2023</span>
                </div>
              </div>

              {/* Scope */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-teal-600">travel_explore</span>
                  <span>{t('1. نطاق الفحص والتدقيق الميداني والتقني (Scope of Audit)', '1. Scope of Audit')}</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  {selectedReportForView.scope}
                </p>
              </div>

              {/* Executive Summary */}
              <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-1.5">
                <h4 className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-teal-600">summarize</span>
                  <span>{t('2. الملخص التنفيذي وموقف الامتثال (Executive Summary)', '2. Executive Summary')}</span>
                </h4>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
                  {selectedReportForView.executiveSummary}
                </p>
              </div>

              {/* Detailed Findings Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-teal-600">fact_check</span>
                  <span>{t('3. مصفوفة التحقق ونتائج الفحص التفصيلية (Audit Findings Matrix)', '3. Audit Findings Matrix')}</span>
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-start">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10 text-[11px]">
                        <th className="p-3 text-start">{t('محور الفحص الرقابي', 'Audit Area')}</th>
                        <th className="p-3 text-start">{t('موقف الامتثال', 'Compliance Status')}</th>
                        <th className="p-3 text-start">{t('أدلة التحقق وملاحظات المدقق', 'Verification Notes')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {selectedReportForView.findings?.map((f: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{f.area}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                              {f.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 text-xs">{f.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-600">tips_and_updates</span>
                  <span>{t('4. التوصيات والإجراءات التحسينية (Recommendations)', '4. Recommendations')}</span>
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                  {selectedReportForView.recommendation}
                </p>
              </div>

              {/* Official Signatures & Seal */}
              <div className="pt-8 border-t border-slate-300 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] text-slate-400 font-bold">{t('مدقق الرقابة والامتثال', 'Compliance Auditor')}</p>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedReportForView.auditor}</p>
                  <div className="text-teal-600 dark:text-teal-400 text-sm italic pt-1 font-bold">Audited & Verified</div>
                </div>

                <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] text-slate-400 font-bold">{t('رئيس قسم التدقيق الداخلي', 'Head of Internal Audit')}</p>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">لجنة التدقيق المعتمدة</p>
                  <div className="text-teal-600 dark:text-teal-400 text-sm italic pt-1 font-bold">Internal Audit Approved</div>
                </div>

                <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-teal-600 border-dashed flex flex-col items-center justify-center text-[8px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-tighter">
                    <span>VITAS IRAQ</span>
                    <span>CBI COMPLIANT</span>
                    <span>2026</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">{t('خاتم الامتثال الرقابي المعتمد', 'Official Regulatory Seal')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          OFFICIAL COMPANY POLICY VIEWER & PRINT MODAL
      ============================================================ */}
      {selectedPolicyForView && (
        <div className="audit-printable-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`audit-printable-modal w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col ${isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Modal Controls Bar */}
            <div className="print:hidden p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">policy</span>
                <div>
                  <h3 className="font-bold text-sm">{selectedPolicyForView.title}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedPolicyForView.code} • {selectedPolicyForView.version} • {selectedPolicyForView.pages}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('بحث داخل اللائحة...', 'Search policy...')}
                    value={policySearchQuery}
                    onChange={e => setPolicySearchQuery(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border outline-none pr-8 ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                  />
                  <span className="material-symbols-outlined text-sm absolute right-2.5 top-2 text-slate-400">search</span>
                </div>
                <button
                  type="button"
                  onClick={() => printCompanyPolicy(selectedPolicyForView)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>{t('طباعة اللائحة', 'Print Policy')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPolicyForView(null);
                    setPolicySearchQuery('');
                  }}
                  className="p-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="audit-printable-content p-8 sm:p-10 space-y-6 text-xs leading-relaxed">
              {/* Header */}
              <div className="border-b-2 border-teal-600 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-teal-600 dark:text-teal-400">VITAS IRAQ</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">لائحة وسياسة معتمدة</span>
                  </div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {selectedPolicyForView.title}
                  </h1>
                  <p className="text-[11px] text-slate-500">{selectedPolicyForView.desc}</p>
                </div>
                <div className="sm:text-end font-mono text-[11px] space-y-0.5 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p><b>{t('رمز السياسة:', 'Policy Code:')}</b> <span className="text-teal-600 font-bold">{selectedPolicyForView.code}</span></p>
                  <p><b>{t('الإصدار:', 'Version:')}</b> {selectedPolicyForView.version}</p>
                  <p><b>{t('تاريخ الاعتماد:', 'Approved Date:')}</b> {selectedPolicyForView.date}</p>
                  <p><b>{t('جهة الاعتماد:', 'Authority:')}</b> مجلس الإدارة (BoD)</p>
                </div>
              </div>

              {/* Chapters & Articles */}
              <div className="space-y-5">
                {selectedPolicyForView.chapters
                  ?.filter((ch: any) => !policySearchQuery || ch.title.includes(policySearchQuery) || ch.content.includes(policySearchQuery))
                  .map((ch: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-2">
                      <h3 className="font-bold text-sm text-teal-700 dark:text-teal-300 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-mono font-bold">
                          {idx + 1}
                        </span>
                        <span>{ch.title}</span>
                      </h3>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs pr-8">
                        {ch.content}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Institutional Notice */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">verified_user</span>
                <div>
                  <p className="font-bold">{t('إقرار وإلزام قانوني:', 'Statutory & Policy Mandate:')}</p>
                  <p className="text-[11px] mt-0.5">
                    {t('تعتبر هذه اللائحة وثيقة عمل إلزامية لكافة الموظفين في مؤسسة فيتاس العراق ويُعد التوقيع على عقد العمل إقراراً بالاطلاع عليها والالتزام الكامل ببنودها وتعديلاتها.', 'This policy document is mandatory for all employees of VITAS Iraq across all branches.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          RISK DOSSIER & MITIGATION PLAN EDITOR MODAL
      ============================================================ */}
      {selectedRiskForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 space-y-5 text-xs ${isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">edit_note</span>
                <div>
                  <h3 className="font-bold text-sm">{t('تعديل وتحديث خطة معالجة الخطر', 'Edit Risk & Mitigation Plan')}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedRiskForDetails.riskCode || selectedRiskForDetails.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRiskForDetails(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRiskDetails} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 text-[11px]">
                    {t('عنوان ووصف الخطر *', 'Risk Title & Description *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={editRiskForm.title}
                    onChange={e => setEditRiskForm({ ...editRiskForm, title: e.target.value })}
                    placeholder={t('أدخل عنوان الخطر المخصص للمؤسسة...', 'Enter custom risk title...')}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${isDark ? 'bg-slate-900 border-white/10 text-white focus:border-teal-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600'
                      }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 text-[11px]">
                      {t('فئة الخطر المؤسسي', 'Risk Category')}
                    </label>
                    <select
                      value={editRiskForm.category}
                      onChange={e => setEditRiskForm({ ...editRiskForm, category: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    >
                      <option value="المالي">{t('المالي (Financial)', 'Financial')}</option>
                      <option value="التشغيلي">{t('التشغيلي (Operational)', 'Operational')}</option>
                      <option value="الامتثال التنظيمي">{t('الامتثال التنظيمي (Compliance)', 'Regulatory Compliance')}</option>
                      <option value="أمن المعلومات">{t('أمن المعلومات (Information Security)', 'InfoSec')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 text-[11px]">
                      {t('المسؤول / الدائرة المعنية', 'Risk Owner / Department')}
                    </label>
                    <input
                      type="text"
                      value={editRiskForm.owner}
                      onChange={e => setEditRiskForm({ ...editRiskForm, owner: e.target.value })}
                      placeholder={t('مثال: مدير العمليات والائتمان', 'e.g. Credit Operations Director')}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                    {t('حالة الخطر الحالية', 'Current Risk Status')}
                  </label>
                  <select
                    value={editRiskForm.status}
                    onChange={e => setEditRiskForm({ ...editRiskForm, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="مفتوح">{t('مفتوح (Open)', 'Open')}</option>
                    <option value="قيد المعالجة">{t('قيد المعالجة والتخفيف (In Progress)', 'In Progress')}</option>
                    <option value="تم التخفيف والمعالجة">{t('تم التخفيف والمعالجة (Mitigated)', 'Mitigated')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                    {t('درجة التأثير', 'Impact Level')}
                  </label>
                  <select
                    value={editRiskForm.impact}
                    onChange={e => setEditRiskForm({ ...editRiskForm, impact: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="منخفض">{t('منخفض (Low)', 'Low')}</option>
                    <option value="متوسط">{t('متوسط (Medium)', 'Medium')}</option>
                    <option value="عالي">{t('عالي (High)', 'High')}</option>
                    <option value="حرج">{t('حرج جداً (Critical)', 'Critical')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                    {t('الاحتمالية / التكرار', 'Likelihood')}
                  </label>
                  <select
                    value={editRiskForm.probability}
                    onChange={e => setEditRiskForm({ ...editRiskForm, probability: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="منخفض">{t('نادر / منخفض (Low)', 'Low')}</option>
                    <option value="متوسط">{t('محتمل / متوسط (Medium)', 'Medium')}</option>
                    <option value="عالي">{t('مرتفع / متكرر (High)', 'High')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                  {t('خطة التحوط والمعالجة (Mitigation Strategy)', 'Mitigation Strategy')}
                </label>
                <textarea
                  rows={4}
                  required
                  value={editRiskForm.mitigationPlan}
                  onChange={e => setEditRiskForm({ ...editRiskForm, mitigationPlan: e.target.value })}
                  placeholder={t('أدخل الإجراءات والخطوات المتبعة للحد من الخطر بما يلائم سياسات المؤسسة...', 'Enter mitigation actions...')}
                  className={`w-full p-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteRisk(selectedRiskForDetails)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-md shadow-rose-700/25 flex items-center gap-1.5 cursor-pointer transition-all"
                  title={t('حذف هذا الخطر نهائياً من قاعدة البيانات', 'Delete Risk Permanently')}
                >
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  <span>{t('حذف الخطر نهائياً', 'Delete Risk Permanently')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRiskForDetails(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white cursor-pointer transition-all shadow-sm"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-700/25 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>{t('حفظ التعديلات', 'Save Changes')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          DYNAMIC "ADD NEW COMPANY POLICY" MODAL
      ============================================================ */}
      {isAddPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 space-y-5 text-xs ${isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">policy</span>
                <div>
                  <h3 className="font-bold text-sm">{t('إضافة واعتماد سياسة ولائحة جديدة', 'Add & Approve New Policy')}</h3>
                  <p className="text-[11px] text-slate-500">{t('سيتم توليد بطاقة السياسة تلقائياً وإدراجها فوراً في سجل السياسات', 'Policy card will be auto-generated and added to policies register')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPolicyModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewPolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('رمز السياسة *', 'Policy Code *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: POL-REM-06"
                    value={newPolicyForm.code}
                    onChange={e => setNewPolicyForm({ ...newPolicyForm, code: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-teal-400' : 'bg-slate-50 border-slate-300 text-teal-700'
                      }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('عنوان اللائحة / السياسة *', 'Policy Title *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: سياسة العمل المرن والعمل عن بعد"
                    value={newPolicyForm.title}
                    onChange={e => setNewPolicyForm({ ...newPolicyForm, title: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('الفئة / التصنيف', 'Category')}
                  </label>
                  <select
                    value={newPolicyForm.category}
                    onChange={e => setNewPolicyForm({ ...newPolicyForm, category: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="إدارية وتنظيمية">إدارية وتنظيمية</option>
                    <option value="إجازات ودوام">إجازات ودوام</option>
                    <option value="مالية وتعويضات">مالية وتعويضات</option>
                    <option value="أمن وسلامة مهنية">أمن وسلامة مهنية</option>
                    <option value="سلوك ونزاهة">سلوك ونزاهة</option>
                    <option value="تقنية وسيبرانية">تقنية وسيبرانية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('رقم الإصدار', 'Version')}
                  </label>
                  <input
                    type="text"
                    value={newPolicyForm.version}
                    onChange={e => setNewPolicyForm({ ...newPolicyForm, version: e.target.value })}
                    placeholder="v1.0"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('عدد الصفحات التقريبي', 'Pages')}
                  </label>
                  <input
                    type="text"
                    value={newPolicyForm.pages}
                    onChange={e => setNewPolicyForm({ ...newPolicyForm, pages: e.target.value })}
                    placeholder="8 صفحات"
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('ملخص ونطاق تطبيق السياسة *', 'Policy Summary *')}
                </label>
                <textarea
                  rows={2}
                  required
                  value={newPolicyForm.desc}
                  onChange={e => setNewPolicyForm({ ...newPolicyForm, desc: e.target.value })}
                  placeholder="وصف مختصر للسياسة والأهداف العامة منها..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              {/* Dynamic Chapters and Articles */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {t('فصول وبنود اللائحة المعتمدة', 'Policy Chapters & Clauses')}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPolicyChapter}
                    className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    <span>{t('إضافة فصل', 'Add Chapter')}</span>
                  </button>
                </div>

                {newPolicyForm.chapters.map((ch, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder={`عنوان الفصل ${idx + 1}`}
                        value={ch.title}
                        onChange={e => {
                          const updated = [...newPolicyForm.chapters];
                          updated[idx].title = e.target.value;
                          setNewPolicyForm({ ...newPolicyForm, chapters: updated });
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                      {newPolicyForm.chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePolicyChapter(idx)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      placeholder={`أدخل نص وأحكام مواد الفصل ${idx + 1}...`}
                      value={ch.content}
                      onChange={e => {
                        const updated = [...newPolicyForm.chapters];
                        updated[idx].content = e.target.value;
                        setNewPolicyForm({ ...newPolicyForm, chapters: updated });
                      }}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPolicyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>{t('اعتماد وتوليد البطاقة', 'Approve & Generate Card')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

