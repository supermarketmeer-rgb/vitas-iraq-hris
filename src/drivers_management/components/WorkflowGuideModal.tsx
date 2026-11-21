import React, { useState, useRef } from 'react';
import {
  X,
  HelpCircle,
  Building2,
  UserCheck,
  Car,
  ClipboardCheck,
  Navigation,
  Camera,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  FileBarChart,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Check,
  Info,
  Layers,
  ArrowRight,
  Smartphone,
  Gauge
} from 'lucide-react';

interface WorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WorkflowStep {
  stepNumber: number;
  title: string;
  role: 'مدير النظام' | 'مسؤول السائقين' | 'السائق الميداني' | 'النظام التلقائي';
  roleColor: string;
  icon: React.ElementType;
  iconBg: string;
  summary: string;
  inputs: string[];
  actions: string[];
  systemImpact: string;
  tip?: string;
  moduleLink?: string;
}

export const WorkflowGuideModal: React.FC<WorkflowGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'supervisor' | 'driver' | 'ai_ocr'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const quickScrollRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const workflowSteps: WorkflowStep[] = [
    {
      stepNumber: 1,
      title: 'إدخال وتعريف المكاتب والفروع (Offices Setup)',
      role: 'مدير النظام',
      roleColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      icon: Building2,
      iconBg: 'bg-purple-500 text-white',
      summary: 'الخطوة الأولى والأساس الهيكلي للنظام؛ يتم فيها تأسيس الفروع والمقار الإدارية للمؤسسة في المحافظات لتكون نقاط انطلاق ووصول للرحلات.',
      inputs: [
        'اسم المكتب أو الفرع (مثل: المقر العام - بغداد، فرع البصرة، فرع كركوك...) ومحافظته.',
        'العنوان الدقيق وتفاصيل التواصل واسم مدير الفرع.',
        'الإحداثيات الجغرافية (خط العرض وخط الطول) للمقر لتحديد الموقع بدقة على الخريطة.',
      ],
      actions: [
        'الدخول إلى شاشة "إدارة المكاتب والفروع" من القائمة الجانبية.',
        'الضغط على زر "+ إضافة مكتب جديد" وتعبئة البيانات.',
        'حفظ وتفعيل المكتب ليصبح متاحاً فوراً للاستخدام في تخصيص المركبات والرحلات.',
      ],
      systemImpact: 'يصبح الفرع مرجعاً جغرافياً وإدارياً ترتبط به سيارات وسائقو المحافظة وأوامر المهام.',
      tip: 'تأكد من إدخال إحداثيات GPS الصحيحة للمكتب لتسهيل احتساب مسافات الذهاب والعودة بدقة.',
    },
    {
      stepNumber: 2,
      title: 'إدخال وتسجيل السائقين وحساباتهم (Drivers & Users Registration)',
      role: 'مدير النظام',
      roleColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      icon: UserCheck,
      iconBg: 'bg-blue-500 text-white',
      summary: 'تسجيل الكادر البشري المعتمد لقيادة مركبات المؤسسة، وإنشاء حسابات دخول إلكترونية خاصة بهم.',
      inputs: [
        'الاسم الثلاثي، الرقم الوظيفي، ورقم الهاتف الشخصي.',
        'رقم رخصة القيادة، فئتها وتاريخ انتهاء الصلاحية.',
        'المكتب/الفرع التابع له السائق، وحالته التشغيلية الأولية (متاح للعمل).',
        'إنشاء بريد إلكتروني وكلمة مرور مرتبطة بدور "سائق ميداني" للدخول لتطبيق الموبايل.',
      ],
      actions: [
        'التوجه لشاشة "إدارة السائقين" والنقر على "+ إضافة سائق جديد".',
        'ربط السائق بالمكتب التابع له وتوثيق بيانات رخصته.',
        'التأكد من إنشاء مستخدم في شاشة "المستخدمين" وتعيين الصلاحية "Driver".',
      ],
      systemImpact: 'يتمكن السائق من تسجيل الدخول إلى تطبيقه الميداني عبر الموبايل لتلقي الرحلات والمهام.',
      tip: 'يراقب النظام تواريخ انتهاء رخص القيادة ويرسل تنبيهات مسبقة قبل نفادها.',
    },
    {
      stepNumber: 3,
      title: 'إدخال وتعريف أسطول السيارات والمركبات (Vehicles Fleet Setup)',
      role: 'مدير النظام',
      roleColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800',
      icon: Car,
      iconBg: 'bg-teal-600 text-white',
      summary: 'إدخال بيانات سيارات الأسطول (سواء كانت مملوكة للمؤسسة أو سيارات تابعة للسائقين) وتجهيزها للاستخدام.',
      inputs: [
        'رقم اللوحة، المحافظة، ونوع التسجيل (خصوصي / عمومي / حكومي).',
        'نوع المركبة (بيك آب، صالون، باص...)، الطراز وسنة الصنع واللون.',
        'نوع الوقود ومعدل الاستهلاك القياسي لكل 100 كم.',
        'قراءة عداد الكيلومترات الافتتاحية الحالية (Initial Odometer Reading).',
        'ربط المركبة بالمكتب وتخصيص سائق دائم لها إن وجد.',
      ],
      actions: [
        'فتح شاشة "سيارات ومركبات السائقين" والضغط على "+ إضافة مركبة جديدة".',
        'إدخال كافة البيانات الفنية وتاريخ الفحص الدوري والتأمين وقراءة العداد الدقيقة.',
        'حفظ المركبة لتصبح حالتها "متاحة (Available)".',
      ],
      systemImpact: 'تصبح السيارة مسجلة ضمن عهدة المكتب وجاهزة للإسناد في الرحلات وجداول الصيانة الدورية.',
      tip: 'تأكد من مطابقة قراءة العداد الأولية مع الواقع، لأنها نقطة انطلاق تراكم المسافات وحسابات الصيانة.',
    },
    {
      stepNumber: 4,
      title: 'فحص واستلام المركبة ومحضر العهدة (Vehicle Inspection & Handover)',
      role: 'مسؤول السائقين',
      roleColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      icon: ClipboardCheck,
      iconBg: 'bg-amber-500 text-white',
      summary: 'إجراء محضر تسليم رسمي وتوثيق الحالة الفنية للمركبة بالصور لحفظ حقوق المؤسسة والسائق.',
      inputs: [
        'التقاط 4 صور رقمية واضحة للسيارة من الزوايا الأربع (أمامي، خلفي، يمين، يسار).',
        'قراءة العداد المسجلة لحظة التسليم.',
        'ملاحظات الحالة العامة وهل توجد خدوش أو صدمات سابقة.',
      ],
      actions: [
        'إجراء فحص ميداني مشترك بين مسؤول السائقين والسائق.',
        'توثيق محضر التسليم وتوقيع الطرفين إلكترونياً داخل النظام.',
      ],
      systemImpact: 'تثبيت محضر رسمي مشفر يمنع الخلافات مستقبلاً حول أي أضرار فنية أو كيلومترات غير موثقة.',
      tip: 'يمكن إعادة هذا الفحص دورياً أو عند انتهاء تكليف السائق بالمركبة (استلام / تسليم).',
    },
    {
      stepNumber: 5,
      title: 'إنشاء وإسناد أمر المهمة / الرحلة (Trip Creation & Assignment)',
      role: 'مسؤول السائقين',
      roleColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
      icon: Navigation,
      iconBg: 'bg-indigo-600 text-white',
      summary: 'إصدار أمر مهمة رسمية لتحرك المركبة لإنجاز واجب إداري أو ميداني محدد.',
      inputs: [
        'نوع الرحلة: داخلية (ضمن المحافظة) أو خارجية (بين المحافظات).',
        'الجهة والمحافظة ومكان الزيارة التفصيلي والغرض الرسمي من المهمة.',
        'تاريخ ووقت التحرك المخطط وأسماء الموظفين المرافقين في الرحلة.',
        'اختيار السائق المتاح والسيارة المخصصة له من القوائم الذكية.',
      ],
      actions: [
        'الدخول إلى "إدارة الرحلات" والضغط على "+ إنشاء رحلة جديدة".',
        'تعبئة التفاصيل والملاحظات التوجيهية للسائق ثم الضغط على "حفظ وإسناد الرحلة".',
      ],
      systemImpact: 'توليد رقم رحلة تسلسلي رسمي (مثل TRP-2026-001) وإرسال إشعار فوري وتنبيه صوتي لتطبيق السائق، وتتحول حالة السائق والسيارة إلى "مكلف بمهمة".',
      tip: 'يتيح النظام تحديد جهة الوصول ونقطة الانطلاق ليقوم بحساب المسافة المتوقعة آلياً.',
    },
    {
      stepNumber: 6,
      title: 'بدء الرحلة وقراءة العداد بالذكاء الاصطناعي (Start Trip & AI/OCR)',
      role: 'السائق الميداني',
      roleColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      icon: Camera,
      iconBg: 'bg-emerald-600 text-white',
      summary: 'يبدأ السائق المهمة من هاتفه بالتقاط صورة حية لعداد الكيلومترات مع التحقق الصارم من التلاعب والموقع.',
      inputs: [
        'صورة حية لعداد السيارة (Odometer) ملتقطة مباشرة من كاميرا الهاتف.',
        'موقع السائق الجغرافي اللحظي عبر الـ GPS لتأكيد الانطلاق من النقطة الصحيحة.',
      ],
      actions: [
        'يفتح السائق تطبيقه وينقر على الرحلة المسندة إليه ثم يضغط "بدء الرحلة".',
        'التقاط صورة العداد؛ يقوم محرك الذكاء الاصطناعي (AI & OCR) بمعالجة الصورة واستخراج الرقم بدقة في أجزاء من الثانية.',
        'يقوم السائق بمراجعة الرقم المستخرج وتأكيد الانطلاق.',
      ],
      systemImpact: 'يتم تطبيق علامة مائية رقمية أمنية على الصورة، ويتم تسجيل قراءة البداية ووقت وتاريخ الانطلاق، وتبدأ حالة الرحلة كـ "قيد التنفيذ (In Progress)".',
      tip: 'يمنع النظام رفع صور قديمة من المعرض عند تفعيل سياسة الأمان الميداني الصارمة.',
    },
    {
      stepNumber: 7,
      title: 'التتبع المباشر ومراقبة المسار والسرعة (Live GPS Tracking)',
      role: 'النظام التلقائي',
      roleColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-800',
      icon: MapPin,
      iconBg: 'bg-sky-600 text-white',
      summary: 'تسجيل مسار تحرك المركبة وسرعتها وإحداثياتها طوال فترة الرحلة لضمان الانضباط والسلامة.',
      inputs: [
        'نقاط الإحداثيات المتتابعة (Latitude & Longitude) التي يرسلها هاتف السائق دورياً.',
        'سرعة المركبة واتجاه الحركة والوقت الزمني الدقيق لكل نقطة.',
      ],
      actions: [
        'يقوم هاتف السائق ببث نقاط التتبع في الخلفية مع كل تحرك.',
        'يمكن لمدير النظام أو مسؤول السائقين فتح "شاشة التتبع المباشر" لمشاهدة مسار الرحلة على خريطة OpenStreetMap التفاعلية.',
      ],
      systemImpact: 'احتساب المسافة المقطوعة فعلياً عبر مسار الـ GPS وتخزين السجل الجغرافي الكامل للمهمة.',
      tip: 'يعمل التتبع وفق الضوابط واللوائح المعتمدة للحفاظ على سلامة الكادر وحماية أصول المؤسسة.',
    },
    {
      stepNumber: 8,
      title: 'إنهاء الرحلة وتوثيق قراءة العداد وحساب الفوارق (Trip Completion & Diff Calculation)',
      role: 'السائق الميداني',
      roleColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      icon: Gauge,
      iconBg: 'bg-rose-600 text-white',
      summary: 'عند الوصول وإتمام المهمة، يوثق السائق نهاية الرحلة بصورة عداد الوصول ليقوم النظام بمقارنة المسافات فوراً.',
      inputs: [
        'صورة حية لعداد السيارة عند التوقف النهائي.',
        'موقع وإحداثيات نقطة الوصول وملاحظات السائق إن وجدت.',
      ],
      actions: [
        'يضغط السائق على "إنهاء الرحلة" ويلتقط صورة العداد النهائي.',
        'يستخرج الـ OCR القراءة النهائية ويحسب النظام فورياً:',
        '1. مسافة العداد الفعلية = العداد النهائي - عداد البداية.',
        '2. مسافة التتبع الجغرافي (GPS Distance).',
        '3. فارق المسافة وتقييم المطابقة (طبيعي / يتطلب مراجعة / تنبيه وتجاوز).',
      ],
      systemImpact: 'إغلاق مسار التتبع وإرسال الرحلة مع كافة الأدلة إلى مرحلة "بانتظار الاعتماد (Pending Approval)" وإشعار المشرف فوراً.',
      tip: 'إذا كان الفارق بين العداد والـ GPS صغيراً (أقل من 5 كم)، يعتبر النظام النتيجة طبيعية تلقائياً.',
    },
    {
      stepNumber: 9,
      title: 'التدقيق والاعتماد الإداري وإغلاق الرحلة (Audit, Review & Approval)',
      role: 'مسؤول السائقين',
      roleColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border-violet-300 dark:border-violet-800',
      icon: ShieldCheck,
      iconBg: 'bg-violet-600 text-white',
      summary: 'المرحلة الرقابية الحاسمة؛ يقوم المشرف أو المدير بمطابقة الصور والمسافات واعتماد الرحلة رسمياً.',
      inputs: [
        'صورتي العداد (البداية والنهاية) والقراءات الرقمية المستخرجة.',
        'مقارنة المسافة المقطوعة بين عداد السيارة والـ GPS وتقييم الفارق.',
        'مسار الخريطة ووقت استغراق المهمة وملاحظات السائق.',
      ],
      actions: [
        'يفتح المشرف نافذة "اعتماد الرحلة (Trip Approval Modal)" عند تلقي الإشعار.',
        'فحص الصور والتأكد من وضوح الأرقام وعدم وجود أي شبهة تلاعب.',
        'اتخاذ القرار: (اعتماد الرحلة Approve / طلب مراجعة وتعديل / رفض الرحلة Rejection مع ذكر الأسباب).',
      ],
      systemImpact: 'عند الاعتماد: يتم تحديث عداد المركبة في قاعدة البيانات لتثبيت القراءة الجديدة، وإضافة الكيلومترات إلى رصيد السائق، وتصبح السيارة والسائق بحالة "متاح" لمهام جديدة.',
      tip: 'لا يمكن تعديل قراءات الرحلة بعد اعتمادها نهائياً لضمان النزاهة المحاسبية.',
    },
    {
      stepNumber: 10,
      title: 'الصيانة الدورية ومراقبة الكيلومترات (Fleet Maintenance & Alerts)',
      role: 'مسؤول السائقين',
      roleColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      icon: Wrench,
      iconBg: 'bg-amber-600 text-white',
      summary: 'متابعة الحالة الميكانيكية للأسطول بناءً على الكيلومترات المعتمدة بعد كل رحلة.',
      inputs: [
        'قراءة عداد السيارة المحدثة تلقائياً بعد كل رحلة معتمدة.',
        'فترات الخدمة المقررة (تبديل زيت المحرك، الفلاتر، الإطارات، الفحص الدوري).',
      ],
      actions: [
        'متابعة بطاقة الصيانة لكل سيارة داخل شاشة المركبات.',
        'استقبال تنبيهات الصيانة الاستباقية عندما تقترب السيارة من الحد المسموح (مثلاً قبل 500 كم).',
        'تسجيل فواتير وتكاليف الصيانة الدورية وتصفير العداد للخدمة القادمة.',
      ],
      systemImpact: 'الحفاظ على جاهزية الأسطول وتفادي الأعطال المفاجئة وترشيد نفقات الصيانة.',
      tip: 'يحتسب النظام استهلاك الوقود التقديري بناءً على الكيلومترات المقطوعة ونوع المحرك.',
    },
    {
      stepNumber: 11,
      title: 'التقارير الشاملة وسجل العمليات الأمني (Reports & Audit Trail)',
      role: 'مدير النظام',
      roleColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      icon: FileBarChart,
      iconBg: 'bg-emerald-700 text-white',
      summary: 'التحليل الاستراتيجي والرقابة العليا؛ استخراج تقارير الأداء وتوثيق كامل لأي حركة في النظام.',
      inputs: [
        'سجلات الرحلات المعتمدة والملغاة خلال الفترات الزمنية المحددة.',
        'سجل العمليات الأمني الشامل (Audit Logs) لكل مستخدم مع عنوان الـ IP والوقت.',
      ],
      actions: [
        'الدخول لشاشة "التقارير الشاملة" لفلترة البيانات حسب الفرع أو السائق أو المركبة.',
        'تصدير وطباعة تقارير الكيلومترات، استهلاك الوقود، وتكاليف التشغيل (PDF / Excel).',
        'مراجعة شاشة "سجل العمليات" لمتابعة حركات الدخول والتعديلات والاعتمادات للتحقق الرقابي.',
      ],
      systemImpact: 'توفير شفافية مطلقة للإدارة العليا وتقييم كفاءة كل مكتب وسائق بدقة رياضية موثقة.',
      tip: 'سجل العمليات الأمني غير قابل للتعديل أو الحذف اليدوي لضمان الامتثال للمعايير المؤسسية.',
    },
  ];

  // Filtering steps
  const filteredSteps = workflowSteps.filter((step) => {
    // Tab filter
    if (activeTab === 'supervisor' && step.role !== 'مسؤول السائقين' && step.role !== 'مدير النظام') {
      return false;
    }
    if (activeTab === 'driver' && step.role !== 'السائق الميداني') {
      return false;
    }
    if (activeTab === 'ai_ocr' && step.stepNumber !== 6 && step.stepNumber !== 7 && step.stepNumber !== 8 && step.stepNumber !== 9) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = step.title.toLowerCase().includes(q);
      const matchSummary = step.summary.toLowerCase().includes(q);
      const matchInputs = step.inputs.some((i) => i.toLowerCase().includes(q));
      const matchActions = step.actions.some((a) => a.toLowerCase().includes(q));
      return matchTitle || matchSummary || matchInputs || matchActions;
    }

    return true;
  });

  const handleCopySummary = () => {
    const text = workflowSteps
      .map(
        (s) =>
          `${s.stepNumber}. ${s.title} [${s.role}]\n- ${s.summary}\n- الإجراءات: ${s.actions.join(' | ')}\n`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToStep = (stepNumber: number) => {
    setActiveTab('all');
    setTimeout(() => {
      const el = document.getElementById(`workflow-step-${stepNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-teal-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-teal-500'), 1500);
      }
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all">
        
        {/* Header Section */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-gray-200 dark:border-slate-800 bg-linear-to-r from-teal-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  دليل دورة وطريقة العمل بنظام DTMS
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                  <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  تسلسل العمليات القياسي
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                خارطة تفصيلية تبدأ من إدخال المكتب، ثم السائق، ثم السيارة، وحتى تنفيذ الرحلة بالـ OCR والاعتماد النهائي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              title="نسخ ملخص دورة العمل للحافظة"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الملخص</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              title="طباعة الدليل"
              className="hidden sm:flex p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Lifecycle Banner Summary - Hidden scrollbars & fully visible clickable buttons */}
        <div className="relative bg-slate-50 dark:bg-slate-950/60 border-b border-gray-200 dark:border-slate-800">
          <div
            ref={quickScrollRef}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 overflow-x-auto overflow-y-hidden no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
          >
            <span className="text-teal-700 dark:text-teal-400 font-extrabold flex items-center gap-1 text-xs shrink-0 pl-1">
              <Layers className="w-3.5 h-3.5" /> التسلسل السريع:
            </span>
            {[
              { num: 1, label: 'المكتب', bg: 'bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950/80 dark:hover:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
              { num: 2, label: 'السائق', bg: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950/80 dark:hover:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
              { num: 3, label: 'السيارة', bg: 'bg-teal-100 hover:bg-teal-200 text-teal-800 dark:bg-teal-950/80 dark:hover:bg-teal-900 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
              { num: 4, label: 'فحص الاستلام', bg: 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/80 dark:hover:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
              { num: 5, label: 'إنشاء المهمة', bg: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
              { num: 6, label: 'بدء الرحلة + OCR', bg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
              { num: 7, label: 'التتبع GPS', bg: 'bg-sky-100 hover:bg-sky-200 text-sky-800 dark:bg-sky-950/80 dark:hover:bg-sky-900 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
              { num: 8, label: 'إنهاء العداد', bg: 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
              { num: 9, label: 'التدقيق والاعتماد', bg: 'bg-violet-100 hover:bg-violet-200 text-violet-800 dark:bg-violet-950/80 dark:hover:bg-violet-900 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
              { num: 10, label: 'الصيانة', bg: 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/80 dark:hover:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
              { num: 11, label: 'التقارير', bg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                {idx > 0 && <ChevronLeft className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                <button
                  type="button"
                  onClick={() => scrollToStep(step.num)}
                  title={`انتقل مباشرة إلى خطوة: ${step.num}. ${step.label}`}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 border transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap leading-none ${step.bg}`}
                >
                  {step.num}. {step.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Filter Controls & Search Bar - No scrollbar on buttons window */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto overflow-y-hidden no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              كامل دورة العمل ({workflowSteps.length} خطوات)
            </button>
            <button
              onClick={() => setActiveTab('supervisor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'supervisor'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              مهام المشرف والمدير
            </button>
            <button
              onClick={() => setActiveTab('driver')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'driver'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              خطوات السائق الميداني
            </button>
            <button
              onClick={() => setActiveTab('ai_ocr')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'ai_ocr'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              تقنيات الذكاء والـ OCR
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن خطوة، عداد، مكتب..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>
        </div>

        {/* Content Body: Steps List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {filteredSteps.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <HelpCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-bold">لا توجد خطوات مطابقة لبحثك</p>
              <p className="text-xs mt-1">جرّب البحث بكلمة أخرى مثل (مكتب، سائق، عداد، رحلة، صيانة)</p>
            </div>
          ) : (
            filteredSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.stepNumber}
                  id={`workflow-step-${step.stepNumber}`}
                  className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Number Badge & Icon */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs shadow-xs">
                        {step.stepNumber}
                      </div>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-2xl ${step.iconBg} shadow-sm`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {step.title}
                        </h3>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${step.roleColor}`}>
                          المسؤول: {step.role}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                        {step.summary}
                      </p>

                      {/* Inputs & Actions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {/* Inputs Card */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800">
                          <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            المدخلات والبيانات المطلوبة:
                          </p>
                          <ul className="space-y-1">
                            {step.inputs.map((inp, idx) => (
                              <li key={idx} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0">•</span>
                                <span>{inp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Actions Card */}
                        <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/50">
                          <p className="text-[11px] font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            الإجراءات وطريقة التنفيذ:
                          </p>
                          <ul className="space-y-1">
                            {step.actions.map((act, idx) => (
                              <li key={idx} className="text-[11px] text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Impact & Tip */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <span className="font-bold text-teal-700 dark:text-teal-400 shrink-0">الأثر البرمجي:</span>
                          <span className="text-gray-600 dark:text-gray-400">{step.systemImpact}</span>
                        </div>

                        {step.tip && (
                          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg shrink-0 border border-amber-200 dark:border-amber-800/60">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px] font-medium">{step.tip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Info className="w-4 h-4 text-teal-600" />
            <span>يمكنك دائماً الرجوع لهذا الدليل بالنقر على أيقونة علامة الاستفهام (?) في الشريط العلوي</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            إغلاق ومتابعة العمل
          </button>
        </div>
      </div>
    </div>
  );
};
