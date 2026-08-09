import { CategoryGroup } from '../types';

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'cat-1-auth',
    title: 'تسجيل الدخول والأمان',
    titleEn: 'Authentication & Security',
    icon: 'lock',
    modules: [
      {
        id: 'auth-secure',
        title: 'تسجيل الدخول الآمن وتوجيه الأدوار',
        titleEn: 'Secure Login & Role Routing',
        icon: 'login',
        description: 'تسجيل دخول آمن وتوجيه ذكي حسب دور المستخدِم'
      },
      {
        id: 'auth-sso',
        title: 'تسجيل الدخول المؤسسي',
        titleEn: 'Corporate SSO Login',
        icon: 'shield_person',
        description: 'بوابة الدخول الموحد للمؤسسات (SAML / OAuth2 / Active Directory)'
      },
      {
        id: 'auth-biometric',
        title: 'تسجيل الدخول البيومتري',
        titleEn: 'Biometric Authentication',
        icon: 'fingerprint',
        description: 'مصادقة البصمة والوجه لأمان عالي للعمليات الحساسة'
      }
    ]
  },
  {
    id: 'cat-2-dash',
    title: 'الرئيسية والإدارة',
    titleEn: 'Dashboard & Executive',
    icon: 'dashboard',
    modules: [
      {
        id: 'dash-overview',
        title: 'نظرة عامة على النظام',
        titleEn: 'System Overview',
        icon: 'space_dashboard',
        description: 'ملخص البنية والمؤشرات الرئيسية لبوابة الموارد البشرية'
      },
      {
        id: 'dash-exec-1',
        title: 'لوحة المعلومات التنفيذية 1',
        titleEn: 'Executive Dashboard 1',
        icon: 'analytics',
        description: 'تحليلات الموارد البشرية الاستراتيجية للإدارة العليا'
      },
      {
        id: 'dash-exec-2',
        title: 'لوحة المعلومات التنفيذية 2',
        titleEn: 'Executive Dashboard 2',
        icon: 'query_stats',
        description: 'مؤشرات القوى العاملة وتوزيع التكاليف المتقدمة'
      },
      {
        id: 'dash-ess',
        title: 'لوحة الخدمة الذاتية للموظف',
        titleEn: 'Employee Self-Service (ESS)',
        icon: 'badge',
        description: 'خدمات الموظف الذاتية: الطلبات، المستندات والبيانات الشخصية'
      },
      {
        id: 'dash-search',
        title: 'مركز البحث الشامل',
        titleEn: 'Global Search Center',
        icon: 'manage_search',
        description: 'محرك بحث متقدم باللغتين العربية والإنجليزية لجميع عناصر النظام'
      },
      {
        id: 'sys-dynamic-reports',
        title: 'منشئ التقارير الديناميكية (Query Builder)',
        titleEn: 'Dynamic Report Builder & Excel Engine',
        icon: 'table_chart',
        description: 'بناء تقارير مخصصة، اختيار الجداول والحقول، التصفية المتقدمة، التحديث التلقائي وتصدير إكسل'
      }
    ]
  },
  {
    id: 'cat-3-emp',
    title: 'إدارة الموظفين',
    titleEn: 'Employee Management',
    icon: 'group',
    modules: [
      {
        id: 'emp-directory',
        title: 'دليل الموظفين',
        titleEn: 'Employee Directory',
        icon: 'contacts',
        description: 'دليل الموظفين التفاعلي والبحث بالسجل',
        hidden: true
      },
      {
        id: 'emp-hr-directory',
        title: 'دليل الموظفين - الموارد البشرية',
        titleEn: 'HR Employee Directory',
        icon: 'recent_actors',
        description: 'دليل شامل لإدارة بيانات وسجلات الموظفين من قبل HR'
      },
      {
        id: 'emp-add',
        title: 'إضافة موظف جديد',
        titleEn: 'Add New Employee',
        icon: 'person_add',
        description: 'نموذج تسجيل موظف جديد وتعيين الهيكل الوظيفي',
        hidden: true
      },
      {
        id: 'emp-profile',
        title: 'ملف الموظفين - HR',
        titleEn: 'HR Employees Profiles',
        icon: 'account_box',
        description: 'السجل الكامل والتفاصيل الوظيفية والشخصية للموظف'
      },
      {
        id: 'emp-branches',
        title: 'الفروع والمواقع',
        titleEn: 'Branches & Locations',
        icon: 'location_city',
        description: 'إدارة فروع المؤسسة ومواقع العمل الجغرافية في العراق'
      },
      {
        id: 'emp-company-profile',
        title: 'إعدادات ملف المؤسسة',
        titleEn: 'Company Profile Settings',
        icon: 'domain',
        description: 'بيانات مؤسسة فيتاس العراق، الهيكل التنظيمي والمعلومات الرسمية'
      },
      {
        id: 'emp-calendar',
        title: 'تقويم المؤسسة والفعاليات',
        titleEn: 'Company Calendar & Events',
        icon: 'event',
        description: 'جدول العطل الرسمية، المناسبات والأنشطة المؤسسية'
      },
      {
        id: 'emp-news',
        title: 'أخبار المؤسسة',
        titleEn: 'Company News',
        icon: 'newspaper',
        description: 'الإعلانات الداخلية والأخبار الرسمية لمؤسسة فيتاس العراق'
      }
    ]
  },
  {
    id: 'cat-4-leave',
    title: 'الإجازات والدوام',
    titleEn: 'Leave & Attendance',
    icon: 'event_available',
    modules: [
      {
        id: 'leave-dashboard',
        title: 'لوحة التحكم',
        titleEn: 'Dashboard',
        icon: 'grid_view',
        description: 'مؤشرات الحضور والبصمة اليومية وأرصدة الإجازات'
      },
      {
        id: 'leave-attendance',
        title: 'حركات الحضور والدوام',
        titleEn: 'Attendance',
        icon: 'calendar_today',
        description: 'سجل الحضور والدوام المعالج وحركات البصمة التفصيلية'
      },
      {
        id: 'leave-timesheets',
        title: 'سجلات التايم شيت',
        titleEn: 'Timesheets',
        icon: 'schedule',
        description: 'سجلات ساعات العمل اليومية والشهرية والمصادقة للرواتب'
      },
      {
        id: 'leave-apply',
        title: 'تقديم طلب إجازة',
        titleEn: 'Apply for Leave',
        icon: 'post_add',
        description: 'تقديم طلب إجازة جديدة بمختلف الأنواع والمدد'
      },
      {
        id: 'leave-directory',
        title: 'دليل طلبات الإجازة',
        titleEn: 'Leave Requests Directory',
        icon: 'history_edu',
        description: 'سجل وتتبع كافة طلبات الإجازات المقدمة بالحالات'
      },
      {
        id: 'leave-schedule',
        title: 'جدولي والورديات',
        titleEn: 'My Schedule',
        icon: 'calendar_month',
        description: 'جدول ورديات العمل والعطل الرسمية'
      },
      {
        id: 'leave-approvals',
        title: 'موافقات المدير',
        titleEn: 'Manager Approvals',
        icon: 'done_all',
        description: 'لوحة اعتماد وإدارة طلبات الإجازات وتصحيح البصمة'
      },
      {
        id: 'leave-biometric-settings',
        title: 'إعدادات الموديول والبصمة',
        titleEn: 'Module & Biometric Settings',
        icon: 'settings',
        description: 'إعدادات الربط المباشر مع Microsoft SQL Server لسرفر البصمة'
      },
      {
        id: 'leave-db-schema',
        title: 'قواعد البيانات و PHP/SQL',
        titleEn: 'Database & PHP/SQL',
        icon: 'database',
        description: 'فاحص الهيكل البرمجي وجداول HRIS والـ SQL Server'
      }
    ]
  },
  {
    id: 'cat-5-payroll',
    title: 'الرواتب والتعويضات',
    titleEn: 'Payroll & Compensation',
    icon: 'payments',
    modules: [
      {
        id: 'payroll-mgmt',
        title: 'إدارة الرواتب والمسيرات',
        titleEn: 'Payroll Dashboard & Management',
        icon: 'account_balance_wallet',
        description: 'إعداد وسجلات مسيرات الرواتب الشهرية والبدلات والاستقطاعات'
      },
      {
        id: 'payroll-payslip',
        title: 'كشف وقسيمة الراتب الشهري',
        titleEn: 'Monthly Payslip Generator',
        icon: 'receipt_long',
        description: 'عرض واستخراج قسائم الرواتب الفردية الموثقة للموظفين'
      },
      {
        id: 'payroll-approvals',
        title: 'مركز الاعتمادات والموافقات',
        titleEn: 'Financial Approvals Hub',
        icon: 'verified',
        description: 'سجل الطلبات والموافقات المالية للرواتب والبدلات والمكافآت',
        hidden: true
      },
      {
        id: 'payroll-claims',
        title: 'طلبات الاعتماد والتعويضات',
        titleEn: 'Approval Requests & Claims Details',
        icon: 'fact_check',
        description: 'استعراض ومراجعة تفاصيل المطالبات المالية والتعويضات',
        hidden: true
      },
      {
        id: 'payroll-social-tax-engine',
        title: 'محرك الضمان والضريبة',
        titleEn: 'Social Security & Tax Engine',
        icon: 'policy',
        description: 'إدارة وقواعد الضمان الاجتماعي (قانون 18) وضريبة الدخل (قانون 113) وتتبع المحاكاة'
      }
    ]
  },
  {
    id: 'cat-6-recruit',
    title: 'التوظيف والاستقطاب',
    titleEn: 'Recruitment & ATS',
    icon: 'work_history',
    modules: [
      {
        id: 'recruit-dash',
        title: 'إدارة الوظائف الشاغرة',
        titleEn: 'Job Openings Management',
        icon: 'work',
        description: 'إضافة، تعديل وحذف الوظائف الشاغرة مع إمكانية التصفية حسب الحالة'
      },
      {
        id: 'recruit-ats',
        title: 'خط أنابيب المرشحين (ATS Pipeline)',
        titleEn: 'ATS Candidate Pipeline',
        icon: 'view_kanban',
        description: 'لوحة كانبان لمتابعة مراحل تتبع المتقدمين للوظائف'
      },
      {
        id: 'recruit-candidate-profile',
        title: 'ملف المرشح',
        titleEn: 'Candidate Profile',
        icon: 'person_search',
        description: 'استعراض بيانات ووثائق وسير المرشحين الذاتية'
      },
      {
        id: 'recruit-candidate-portal',
        title: 'بوابة المتقدمين للوظائف',
        titleEn: 'Candidate Portal',
        icon: 'how_to_reg',
        description: 'بوابة عامة للمتقدمين لتقديم طلبات التوظيف وعرض الوظائف الشاغرة'
      }
    ]
  },
  {
    id: 'cat-7-perf',
    title: 'إدارة الأداء والتدريب',
    titleEn: 'Performance & Training',
    icon: 'atr',
    modules: [
      {
        id: 'perf-mgmt',
        title: 'إدارة الأداء',
        titleEn: 'Performance Management',
        icon: 'moving',
        description: 'تحديد الأهداف وتقييم الكفاءات الدورية'
      },
      {
        id: 'perf-self-appraisal',
        title: 'التقييم الذاتي',
        titleEn: 'Self Appraisal',
        icon: 'rate_review',
        description: 'نموذج تقييم الموظف لأدائه السنوي ونقاط القوة'
      },
      {
        id: 'perf-review',
        title: 'مراجعة الأداء',
        titleEn: 'Performance Review',
        icon: 'assignment_turned_in',
        description: 'جلسات مراجعة الأداء واعتماد التقييم النهائي من المدير'
      },
      {
        id: 'train-my-learning',
        title: 'لوحة التعلم الخاصة بي',
        titleEn: 'My Learning Dashboard',
        icon: 'school',
        description: 'مسارات التدريب والشهادات المهنية المتاحة للموظف'
      },
      {
        id: 'train-courses-analytics',
        title: 'إدارة الدورات والتحليلات',
        titleEn: 'Course Management & Analytics',
        icon: 'model_training',
        description: 'إنشاء البرامج التدريبية ومتابعة تحليلات إنجاز الفرق'
      }
    ]
  },
  {
    id: 'cat-8-assets',
    title: 'الأصول والمستندات',
    titleEn: 'Assets & Documents',
    icon: 'folder_copy',
    modules: [
      {
        id: 'asset-inventory',
        title: 'إدارة مخزون الأصول',
        titleEn: 'Asset Inventory Management',
        icon: 'inventory_2',
        description: 'تتبع العهد والأجهزة والأصول المملوكة للمؤسسة'
      },
      {
        id: 'asset-my-requests',
        title: 'طلبات الأصول الخاصة بي',
        titleEn: 'My Asset Requests',
        icon: 'devices',
        description: 'تقديم وتسجيل طلبات الأجهزة والمعدات المكتبية'
      },
      {
        id: 'asset-details',
        title: 'تفاصيل الأصل',
        titleEn: 'Asset Detail View',
        icon: 'info',
        description: 'بيانات الأصل التفصيلية، حالة الصيانة وسجل التخصيص'
      },
      {
        id: 'doc-mgmt',
        title: 'إدارة المستندات',
        titleEn: 'Document Management System',
        icon: 'folder_shared',
        description: 'نظام حفظ وتصنيف المستندات والوثائق المؤسسية'
      },
      {
        id: 'doc-edms',
        title: 'بوابة إدارة الوثائق (EDMS)',
        titleEn: 'EDMS Portal',
        icon: 'cloud_upload',
        description: 'بوابة إلكترونية متقدمة لأرشفة ومعالجة العقود والسياسات'
      },
      {
        id: 'doc-my-docs',
        title: 'مستنداتي',
        titleEn: 'My Personal Documents',
        icon: 'folder_zip',
        description: 'المستندات الخاصة بالموظف (الهويات، العقود، الشهادات)'
      }
    ]
  },
  {
    id: 'cat-12-archive',
    title: 'موديول الأرشفة الذكي',
    titleEn: 'Smart Archive Module',
    icon: 'archive',
    modules: [
      {
        id: 'archive-employees',
        title: 'الملفات الإلكترونية للموظفين',
        titleEn: 'Employee Digital Files',
        icon: 'badge',
        description: 'إدارة الملفات الرقمية الشاملة للموظفين'
      },
      {
        id: 'archive-upload',
        title: 'مركز الرفع والمسح الذكي',
        titleEn: 'Upload & OCR Center',
        icon: 'upload_file',
        description: 'رفع الوثائق مع المسح الضوئي الذكي (OCR)'
      },
      {
        id: 'archive-search',
        title: 'محرك البحث المتقدم',
        titleEn: 'Advanced Search',
        icon: 'search',
        description: 'بحث متقدم في جميع الوثائق والمستندات'
      },
      {
        id: 'archive-expiry',
        title: 'إدارة الانتهاء والتنبيهات',
        titleEn: 'Expiry Management',
        icon: 'event_available',
        description: 'متابعة تواريخ انتهاء الوثائق وإرسال التنبيهات'
      },
      {
        id: 'archive-workflows',
        title: 'مسارات العمل والـ n8n',
        titleEn: 'Workflows & n8n',
        icon: 'account_tree',
        description: 'إدارة سير العمل المتقدم للوثائق'
      },
      {
        id: 'archive-reports',
        title: 'التقارير والإحصائيات',
        titleEn: 'Reports & Analytics',
        icon: 'analytics',
        description: 'تقارير شاملة وإحصائيات عن الوثائق'
      },
      {
        id: 'archive-audit',
        title: 'سجل التدقيق والصلاحيات',
        titleEn: 'Audit Logs & RBAC',
        icon: 'security',
        description: 'سجل العمليات وإدارة الصلاحيات'
      },
      {
        id: 'archive-settings',
        title: 'التصنيفات وتثبيت النظام',
        titleEn: 'Categories & System',
        icon: 'settings',
        description: 'إدارة تصنيفات الوثائق وإعدادات النظام'
      }
    ]
  },
  {
    id: 'cat-9-risk',
    title: 'المخاطر والامتثال والأمان',
    titleEn: 'Risk, Compliance & Security',
    icon: 'gavel',
    modules: [
      {
        id: 'risk-audit-reports',
        title: 'مركز تقارير التدقيق والامتثال',
        titleEn: 'Audit & Compliance Center',
        icon: 'assessment',
        description: 'تقارير الامتثال التنظيمي للبنك المركزي والجهات الرقابية'
      },
      {
        id: 'risk-governance',
        title: 'لوحة حوكمة الامتثال',
        titleEn: 'Compliance Governance Dashboard',
        icon: 'balance',
        description: 'متابعة مؤشرات الحوكمة وسجلات الامتثال المؤسسي'
      },
      {
        id: 'risk-tracker',
        title: 'متتبع التوافق التنظيمي',
        titleEn: 'Regulatory Compliance Tracker',
        icon: 'rule_folder',
        description: 'متابعة المتطلبات التشريعية واللوائح المصرفية في العراق'
      },
      {
        id: 'risk-policies',
        title: 'سجل سياسات المؤسسة',
        titleEn: 'Company Policies Register',
        icon: 'policy',
        description: 'دليل السياسات واللوائح الداخلي المعتمد بالمؤسسة'
      },
      {
        id: 'risk-assessment',
        title: 'نظرة عامة على تقييم المخاطر',
        titleEn: 'Risk Assessment Overview',
        icon: 'warning',
        description: 'سجل المخاطر التشغيلية والسيبرانية وتقييم التأثير'
      },
      {
        id: 'risk-identify-new',
        title: 'تحديد خطر جديد',
        titleEn: 'Identify New Risk',
        icon: 'add_alert',
        description: 'نموذج تسجيل وتقييم مخاطر جديدة داخل النظام'
      },
      {
        id: 'risk-details-privacy',
        title: 'تفاصيل الخطر (خصوصية البيانات)',
        titleEn: 'Risk Details (Data Privacy)',
        icon: 'privacy_tip',
        description: 'تحليل مخاطر حماية البيانات الشخصية والسرية'
      },
      {
        id: 'sec-general-settings',
        title: 'إعدادات الأمان العامة',
        titleEn: 'General Security Settings',
        icon: 'security',
        description: 'سياسات كلمة المرور، المصادقة الثنائية وانتهاء الجلسات'
      },
      {
        id: 'sec-audit-logs',
        title: 'سجلات تدقيق الأمان',
        titleEn: 'Security Audit Logs',
        icon: 'history',
        description: 'سجل العمليات، الأحداث وتتبع نشاط المستخدمين'
      },
      {
        id: 'sec-roles-permissions',
        title: 'أدوار المستخدمين والصلاحيات',
        titleEn: 'User Roles & Permissions',
        icon: 'admin_panel_settings',
        description: 'تعريف الأدوار وتوزيع الصلاحيات البرمجية'
      },
      {
        id: 'sec-edit-role',
        title: 'تعديل صلاحيات الدور',
        titleEn: 'Role Permission Editor',
        icon: 'manage_accounts',
        description: 'تخصيص وإضافة الصلاحيات للأدوار المحددة'
      },
      {
        id: 'sec-api-keys',
        title: 'إدارة مفاتيح الوصول',
        titleEn: 'API & Access Key Manager',
        icon: 'key',
        description: 'إنشاء وتدوير مفاتيح API للتكامل الخارجي'
      }
    ]
  },
  {
    id: 'cat-10-sys',
    title: 'النظام والمطورين',
    titleEn: 'System & Developer Tools',
    icon: 'developer_board',
    modules: [
      {
        id: 'sys-health-monitor',
        title: 'مراقبة صحة النظام',
        titleEn: 'System Health Monitor',
        icon: 'monitor_heart',
        description: 'حالة الخوادم، استخدام الذاكرة والاستجابة الفعلية'
      },
      {
        id: 'sys-health-config',
        title: 'تهيئة صحة النظام',
        titleEn: 'System Health Config',
        icon: 'tune',
        description: 'إعداد حدود التنبيهات وقواعد الفحص التلقائي'
      },
      {
        id: 'sys-endpoint-perf',
        title: 'مراقب أداء نقاط النهاية',
        titleEn: 'Endpoint Performance Monitor',
        icon: 'speed',
        description: 'تحليلات أداء ومعدلات أخطاء API Endpoints'
      },
      {
        id: 'sys-n8n-automation',
        title: 'أتمتة سير العمل (n8n)',
        titleEn: 'n8n Workflow Automation',
        icon: 'alt_route',
        description: 'ربط وأتمتة مسارات العمل بين الأنظمة والمستندات'
      },
      {
        id: 'sys-api-gateway',
        title: 'بوابة لوحة الواجهات البرمجية',
        titleEn: 'API Gateway Dashboard',
        icon: 'hub',
        description: 'مراقبة الطلبات والتحكم بالتدفق وحظر الإساءة'
      },
      {
        id: 'sys-api-manager',
        title: 'إدارة الواجهات البرمجية',
        titleEn: 'API Manager',
        icon: 'api',
        description: 'إدارة نقاط النهاية المتاحة وتوثيق الإصدارات'
      },
      {
        id: 'sys-dev-docs',
        title: 'وثائق المطورين',
        titleEn: 'Developer Docs',
        icon: 'terminal',
        description: 'دليل التكامل، المخططات وأمثلة الاستدعاء'
      },
      {
        id: 'sys-db-schema',
        title: 'إدارة مخطط قاعدة البيانات',
        titleEn: 'Database Schema Manager',
        icon: 'schema',
        description: 'استعراض العلاقات والهياكل وجداول البيانات'
      },
      {
        id: 'sys-it-handbook',
        title: 'دليل مسؤول تقنية المعلومات',
        titleEn: 'IT Admin Handbook',
        icon: 'menu_book',
        description: 'إجراءات الصيانة والتطوير واستعادة النظام'
      },
      {
        id: 'sys-settings-security',
        title: 'الإعدادات والأمان',
        titleEn: 'Settings & Security',
        icon: 'settings',
        description: 'إدارة تفضيلات النظام، اللغة، السمة، وإعدادات الأمان'
      }
    ]
  },
  {
    id: 'cat-11-support',
    title: 'الدعم والمساعدة',
    titleEn: 'Support & Help Desk',
    icon: 'support_agent',
    modules: [
      {
        id: 'supp-emp-portal',
        title: 'بوابة الموظف الذاتية',
        titleEn: 'Employee Self-Service Portal',
        icon: 'person_pin',
        description: 'بوابة الموظف لتسجيل الدخول والوصول إلى الخدمات الذاتية'
      },
      {
        id: 'supp-agent-desk',
        title: 'لوحة وكيل الدعم',
        titleEn: 'Support Agent Desk',
        icon: 'headset_mic',
        description: 'لوحة متابعة وإغلاق تذاكر الموظفين لمسؤولي الدعم'
      },
      {
        id: 'supp-knowledge-base',
        title: 'قاعدة المعرفة ومركز المساعدة',
        titleEn: 'Help Desk & Knowledge Base',
        icon: 'auto_stories',
        description: 'مقالات الإرشادات والإجابات على الأسئلة الشائعة'
      },
      {
        id: 'supp-guide-center',
        title: 'مركز دليل المستخدم',
        titleEn: 'User Guide Center',
        icon: 'help_center',
        description: 'شروحات بالفيديو والصور لكافة خدمات البوابة'
      },
      {
        id: 'supp-emp-handbook',
        title: 'دليل استخدام الموظف',
        titleEn: 'Employee Handbook',
        icon: 'import_contacts',
        description: 'كتيب حقوق وواجبات الموظف في فيتاس العراق'
      },
      {
        id: 'supp-news-admin',
        title: 'إدارة الأخبار',
        titleEn: 'News Administration',
        icon: 'edit_note',
        description: 'إنشاء ونشر الأخبار والتنويهات للمستويات المختلفة'
      },
      {
        id: 'supp-notif-settings',
        title: 'إعدادات الإشعارات',
        titleEn: 'Notification Settings',
        icon: 'notifications_active',
        description: 'تخصيص القنوات والبريد الإلكتروني وتفضيلات التنبيه'
      },
      {
        id: 'supp-notif-center',
        title: 'مركز الإشعارات',
        titleEn: 'Notification Center',
        icon: 'circle_notifications',
        description: 'عرض ومتابعة كافة التنبيهات الرسمية الصادرة'
      },
      {
        id: 'supp-profile-settings',
        title: 'إعدادات ملف الموظف',
        titleEn: 'Profile Settings',
        icon: 'settings_suggest',
        description: 'تعديل بيانات الحساب الشخصي وتفضيلات النظام'
      },
      {
        id: 'supp-internal-chat',
        title: 'المحادثات الداخلية',
        titleEn: 'Internal Chat & Messenger',
        icon: 'forum',
        description: 'التواصل المباشر والآمن بين الموظفين والأقسام'
      },
      {
        id: 'supp-mobile-app',
        title: 'تطبيق الهاتف المحمول',
        titleEn: 'Mobile App Download & Sync',
        icon: 'smartphone',
        description: 'روابط تحميل تطبيق الموبايل ومزامنة الأجهزة'
      },
      {
        id: 'supp-enterprise-nexus',
        title: 'نظام Enterprise Nexus',
        titleEn: 'Enterprise Nexus Hub',
        icon: 'cloud_sync',
        description: 'مركز الربط الذكي للخدمات والأنظمة المتكاملة'
      },
      {
        id: 'supp-nexus-mobile',
        title: 'نظام Nexus Mobile',
        titleEn: 'Nexus Mobile Companion',
        icon: 'install_mobile',
        description: 'مرافق الهاتف الذكي لإشعار الموظفين الفوري'
      }
    ]
  }
];
