<?php
/**
 * Centralized Bilingual Localization System (Arabic / English)
 * 100% strict separation: No Arabic in English mode, no English in Arabic mode.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$GLOBALS['CURRENT_LANG'] = $_SESSION['lang'] ?? 'ar';

$translations = [
    'ar' => [
        // App
        'app_name' => 'موديول إدارة السائقين والرحلات',
        'hr_system' => 'نظام الموارد البشرية',
        'currency_iqd' => 'د.ع',
        
        // Navigation
        'nav_dashboard' => 'لوحة التحكم',
        'nav_offices' => 'المكاتب والفروع',
        'nav_drivers' => 'إدارة السائقين',
        'nav_trip_rates' => 'الرحلات والتسعيرات',
        'nav_trips' => 'سجل الرحلات (Timesheet)',
        'nav_trip_approval' => 'مراجعة واعتماد الرحلات',
        'nav_payroll' => 'رواتب السائقين',
        'nav_reports' => 'التقارير والإحصائيات',
        'nav_manager_portal' => 'تطبيق مدير المكتب (موبايل)',
        'nav_driver_portal' => 'تطبيق السائق (موبايل)',
        
        // Theme & Lang
        'theme_dark' => 'الوضع الليلي',
        'theme_light' => 'الوضع النهاري',
        'lang_switch' => 'English',
        'lang_label' => 'اللغة الحالية: العربية',

        // Auth & Login
        'login' => 'تسجيل الدخول',
        'logout' => 'تسجيل الخروج',
        'username' => 'اسم المستخدم',
        'password' => 'كلمة المرور',
        'remember_me' => 'تذكر بيانات الدخول',
        'login_btn' => 'دخول إلى النظام',
        'login_welcome' => 'مرحباً بك، يرجى تسجيل الدخول للوصول إلى النظام',
        'login_subtitle' => 'وحدة إدارة السائقين والرحلات والـ Timesheet',
        'login_error' => 'اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مفعّل.',
        'logged_out_msg' => 'تم تسجيل الخروج بنجاح.',
        'role_admin' => 'مدير النظام',
        'role_hr_manager' => 'مدير الموارد البشرية',
        'role_payroll' => 'مسؤول الرواتب',
        'role_hr_employee' => 'موظف إدخال الرحلات',
        'role_viewer' => 'مستعرض',
        'demo_accounts' => 'حسابات تجريبية للاختبار المباشر حسب الصلاحيات:',
        
        // Actions & Buttons
        'action_add' => 'إضافة',
        'action_edit' => 'تعديل',
        'action_delete' => 'حذف',
        'action_save' => 'حفظ البيانات',
        'action_cancel' => 'إلغاء',
        'action_view' => 'عرض',
        'action_view_all' => 'عرض الكل',
        'action_search' => 'بحث...',
        'action_filter' => 'تصفية',
        'action_all' => 'الكل',
        'action_back' => 'رجوع',
        'action_approve' => 'اعتماد',
        'action_reject' => 'رفض',
        'action_review' => 'اعتماد / مراجعة',
        'action_actions' => 'الإجراءات',
        
        // Status Badges
        'status' => 'الحالة',
        'status_active' => 'نشط',
        'status_inactive' => 'غير نشط',
        'status_on_leave' => 'إجازة',
        'status_suspended' => 'موقوف',
        'status_transferred' => 'منقول',
        'status_resigned' => 'مستقيل',
        'status_draft' => 'مسودة',
        'status_pending' => 'قيد المراجعة',
        'status_approved' => 'معتمدة',
        'status_rejected' => 'مرفوضة',
        'status_cancelled' => 'ملغاة',
        'status_calculated' => 'تم الاحتساب',
        'status_paid' => 'مصروف',

        // Drivers Module
        'drivers_title' => 'إدارة السائقين',
        'drivers_desc' => 'قائمة السائقين المعتمدين والمكلفين في كافة المكاتب والمحافظات',
        'drivers_add' => 'إضافة سائق جديد',
        'driver_edit' => 'تعديل بيانات السائق',
        'driver_number' => 'رقم الباج',
        'badge_no' => 'رقم الباج',
        'employee_code' => 'الرقم الوظيفي',
        'driver_name' => 'اسم السائق',
        'driver_name_ar' => 'اسم السائق (بالعربية)',
        'driver_name_en' => 'اسم السائق (بالإنجليزية)',
        'father_name' => 'اسم الأب',
        'phone' => 'رقم الهاتف',
        'national_id' => 'رقم البطاقة الوطنية / الهوية',
        'license_number' => 'رقم رخصة القيادة',
        'license_type' => 'نوع الرخصة',
        'license_issue_date' => 'تاريخ إصدار الرخصة',
        'license_expiry_date' => 'تاريخ انتهاء الرخصة',
        'base_salary' => 'الراتب الأساسي',
        'transport_allowance' => 'بدل النقل',
        'fuel_allowance' => 'بدل الوقود',
        'hire_date' => 'تاريخ التعيين',
        'exit_date' => 'تاريخ الانتهاء',
        'notes' => 'ملاحظات',
        'personal_info' => 'البيانات الشخصية والوظيفية',
        'license_info' => 'بيانات رخصة القيادة',
        'salary_info' => 'بيانات التعيين والمكتب والحالة',
        'filter_by_office' => 'تصفية حسب المكتب',
        'filter_by_status' => 'تصفية حسب الحالة',

        // License Types
        'lic_commercial' => 'عمومي',
        'lic_private' => 'خصوصي',
        'lic_construction' => 'إنشائي / آليات ثقيلة',
        'lic_international' => 'دولي',
        'lic_other' => 'أخرى',

        // Offices Module
        'offices_title' => 'المكاتب والفروع',
        'offices_desc' => 'إدارة الفروع الإقليمية، مدراء المكاتب، وسائل الاتصال وعدد السائقين',
        'office_add' => 'إضافة مكتب جديد',
        'office_edit' => 'تعديل بيانات المكتب',
        'office_code' => 'رمز المكتب',
        'office_name' => 'اسم المكتب',
        'office_name_ar' => 'اسم المكتب (بالعربية)',
        'office_name_en' => 'اسم المكتب (بالإنجليزية)',
        'city' => 'المدينة / المحافظة',
        'address' => 'العنوان التفصيلي',
        'manager_name' => 'مدير المكتب',
        'manager_name_ar' => 'مدير المكتب (بالعربية)',
        'manager_name_en' => 'مدير المكتب (بالإنجليزية)',
        'manager_email' => 'البريد الإلكتروني للمدير',
        'manager_badge_no' => 'رقم باج المدير',
        'drivers_count' => 'عدد السائقين التابعين',
        'trips_count' => 'عدد الرحلات المنجزة',

        // Trip Rates Module
        'trip_rates_title' => 'الرحلات والمسارات والتسعيرات المعتمدة',
        'trip_rates_desc' => 'تعريف أسعار الرحلات لكل مسار ومكتب مع تثبيت الأسعار التاريخية',
        'trip_rates_add' => 'إضافة رحلة وسعر جديد',
        'trip_rates_edit' => 'تعديل السعر والمسار',
        'route_code' => 'رمز المسار',
        'route_name' => 'اسم / وصف الرحلة',
        'trip_type' => 'نوع الرحلة',
        'departure_city' => 'مدينة الانطلاق',
        'arrival_city' => 'مدينة الوصول',
        'pathway' => 'المسار والتفاصيل',
        'current_rate' => 'التسعيرة الحالية',
        'rate_history' => 'سجل تغير الأسعار',
        'currency' => 'العملة',

        // Timesheet Trips
        'trips_title' => 'سجل الرحلات (Timesheet)',
        'trip_number' => 'رقم الرحلة',
        'trip_date' => 'تاريخ الرحلة',
        'departure_time' => 'وقت الانطلاق',
        'arrival_time' => 'وقت الوصول',
        'trip_count_col' => 'العدد',
        'total_amount' => 'القيمة الإجمالية',
        'reviewed_by' => 'تمت المراجعة بواسطة',

        // Dashboard
        'dashboard_title' => 'لوحة متابعة السائقين والرحلات',
        'dashboard_desc' => 'نظرة عامة على حركة المركبات، الـ Timesheet، ومستحقات الرواتب لشهر ',
        'total_drivers' => 'إجمالي السائقين',
        'active_drivers_count' => 'سائق نشط',
        'pending_trips' => 'رحلات بانتظار الاعتماد',
        'pending_trips_desc' => 'تتطلب موافقة مسؤول الحركة',
        'month_trips_value' => 'قيمة رحلات الشهر المعتمدة',
        'month_trips_approved' => 'رحلة معتمدة',
        'month_payroll_total' => 'رواتب الشهر المحتسبة',
        'month_payroll_desc' => 'شاملة البدلات والرحلات',
        'new_trip_timesheet' => 'تسجيل رحلة جديدة (Timesheet)',
        'review_pending_trips' => 'مراجعة الرحلات المعلقة',
        'recent_pending_trips' => 'آخر رحلات الـ Timesheet بانتظار الاعتماد',
        'trips_by_office' => 'توزيع الرحلات حسب المكتب',
        'top_drivers_month' => 'أنشط السائقين لهذا الشهر (حسب الرحلات المعتمدة)',
        'no_pending_trips' => 'لا توجد رحلات معلقة حالياً، جميع الرحلات تمت مراجعتها!',

        // Extra keys used in various screens
        'office'       => 'المكتب',
        'route'        => 'المسار',
        'rate'         => 'التسعيرة',
        'action_add'   => 'إضافة',
        'action_delete'=> 'حذف',
        'logout'       => 'تسجيل الخروج',
        'nav_dashboard'=> 'لوحة التحكم',
        'nav_offices'  => 'المكاتب والفروع',
        'nav_trip_approval' => 'مراجعة الرحلات',
        'nav_reports'  => 'التقارير',
        'hr_system'    => 'نظام الموارد البشرية',
        'trips_count'  => 'عدد الرحلات',
    ],
    'en' => [
        // App
        'app_name' => 'Drivers & Trips HR Module',
        'hr_system' => 'HR System',
        'currency_iqd' => 'IQD',

        // Navigation
        'nav_dashboard' => 'Dashboard',
        'nav_offices' => 'Offices & Branches',
        'nav_drivers' => 'Drivers Management',
        'nav_trip_rates' => 'Trips & Pricing Rates',
        'nav_trips' => 'Trip Timesheet',
        'nav_trip_approval' => 'Trip Approvals',
        'nav_payroll' => 'Driver Payroll',
        'nav_reports' => 'Reports & Analytics',
        'nav_manager_portal' => 'Office Manager Mobile',
        'nav_driver_portal' => 'Driver Mobile Portal',

        // Theme & Lang
        'theme_dark' => 'Dark Mode',
        'theme_light' => 'Light Mode',
        'lang_switch' => 'العربية',
        'lang_label' => 'Current Language: English',

        // Auth & Login
        'login' => 'Sign In',
        'logout' => 'Sign Out',
        'username' => 'Username',
        'password' => 'Password',
        'remember_me' => 'Remember Me',
        'login_btn' => 'Sign In to Portal',
        'login_welcome' => 'Welcome back, please sign in to access the system',
        'login_subtitle' => 'Drivers & Trips Timesheet Management Unit',
        'login_error' => 'Invalid username or password, or account is disabled.',
        'logged_out_msg' => 'You have been logged out successfully.',
        'role_admin' => 'Administrator',
        'role_hr_manager' => 'HR Manager',
        'role_payroll' => 'Payroll Officer',
        'role_hr_employee' => 'Operations Employee',
        'role_viewer' => 'Viewer',
        'demo_accounts' => 'Demo accounts for role-based testing:',

        // Actions & Buttons
        'action_add' => 'Add',
        'action_edit' => 'Edit',
        'action_delete' => 'Delete',
        'action_save' => 'Save Data',
        'action_cancel' => 'Cancel',
        'action_view' => 'View',
        'action_view_all' => 'View All',
        'action_search' => 'Search...',
        'action_filter' => 'Filter',
        'action_all' => 'All',
        'action_back' => 'Back',
        'action_approve' => 'Approve',
        'action_reject' => 'Reject',
        'action_review' => 'Review / Approve',
        'action_actions' => 'Actions',

        // Status Badges
        'status' => 'Status',
        'status_active' => 'Active',
        'status_inactive' => 'Inactive',
        'status_on_leave' => 'On Leave',
        'status_suspended' => 'Suspended',
        'status_transferred' => 'Transferred',
        'status_resigned' => 'Resigned',
        'status_draft' => 'Draft',
        'status_pending' => 'Pending Review',
        'status_approved' => 'Approved',
        'status_rejected' => 'Rejected',
        'status_cancelled' => 'Cancelled',
        'status_calculated' => 'Calculated',
        'status_paid' => 'Paid',

        // Drivers Module
        'drivers_title' => 'Drivers Management',
        'drivers_desc' => 'List of certified and deployed drivers across all offices and provinces',
        'drivers_add' => 'Add New Driver',
        'driver_edit' => 'Edit Driver Profile',
        'driver_number' => 'Badge No',
        'badge_no' => 'Badge No',
        'employee_code' => 'Employee Code',
        'driver_name' => 'Driver Full Name',
        'driver_name_ar' => 'Driver Name (Arabic)',
        'driver_name_en' => 'Driver Name (English)',
        'father_name' => 'Father Name',
        'phone' => 'Phone Number',
        'national_id' => 'National ID / Civil ID',
        'license_number' => 'Driver License Number',
        'license_type' => 'License Type',
        'license_issue_date' => 'License Issue Date',
        'license_expiry_date' => 'License Expiry Date',
        'base_salary' => 'Base Salary',
        'transport_allowance' => 'Transport Allowance',
        'fuel_allowance' => 'Fuel Allowance',
        'hire_date' => 'Hire Date',
        'exit_date' => 'Exit Date',
        'notes' => 'Notes',
        'personal_info' => 'Personal & Employment Details',
        'license_info' => 'Driver License Details',
        'salary_info' => 'Office Assignment & Status',
        'filter_by_office' => 'Filter by Office',
        'filter_by_status' => 'Filter by Status',

        // License Types
        'lic_commercial' => 'Commercial',
        'lic_private' => 'Private',
        'lic_construction' => 'Heavy / Construction',
        'lic_international' => 'International',
        'lic_other' => 'Other',

        // Offices Module
        'offices_title' => 'Offices & Branches',
        'offices_desc' => 'Manage regional offices, branch managers, contact channels, and assigned drivers',
        'office_add' => 'Add New Office',
        'office_edit' => 'Edit Office Details',
        'office_code' => 'Office Code',
        'office_name' => 'Office Name',
        'office_name_ar' => 'Office Name (Arabic)',
        'office_name_en' => 'Office Name (English)',
        'city' => 'City / Province',
        'address' => 'Full Address',
        'manager_name' => 'Office Manager',
        'manager_name_ar' => 'Manager Name (Arabic)',
        'manager_name_en' => 'Manager Name (English)',
        'manager_email' => 'Manager Email',
        'manager_badge_no' => 'Badge No',
        'drivers_count' => 'Assigned Drivers',
        'trips_count' => 'Completed Trips',

        // Trip Rates Module
        'trip_rates_title' => 'Trip Routes & Approved Rates',
        'trip_rates_desc' => 'Configure trip routes and standard rates per office with historical rate lock',
        'trip_rates_add' => 'Add Route & Rate',
        'trip_rates_edit' => 'Edit Route & Rate',
        'route_code' => 'Route Code',
        'route_name' => 'Route / Trip Description',
        'trip_type' => 'Trip Type',
        'departure_city' => 'Departure City',
        'arrival_city' => 'Arrival City',
        'pathway' => 'Pathway & Details',
        'current_rate' => 'Approved Rate',
        'rate_history' => 'Rate Change History',
        'currency' => 'Currency',

        // Timesheet Trips
        'trips_title' => 'Trip Timesheet',
        'trip_number' => 'Trip Number',
        'trip_date' => 'Trip Date',
        'departure_time' => 'Departure Time',
        'arrival_time' => 'Arrival Time',
        'trip_count_col' => 'Count',
        'total_amount' => 'Total Value',
        'reviewed_by' => 'Reviewed By',

        // Dashboard
        'dashboard_title' => 'Drivers & Trips Operations Dashboard',
        'dashboard_desc' => 'Fleet performance overview, Timesheet logs, and payroll receivables for month ',
        'total_drivers' => 'Total Drivers',
        'active_drivers_count' => 'Active Drivers',
        'pending_trips' => 'Trips Awaiting Approval',
        'pending_trips_desc' => 'Requires Transport Officer review',
        'month_trips_value' => 'Approved Month Trips Value',
        'month_trips_approved' => 'Approved Trips',
        'month_payroll_total' => 'Calculated Month Payroll',
        'month_payroll_desc' => 'Including allowances and trips',
        'new_trip_timesheet' => 'Record New Trip (Timesheet)',
        'review_pending_trips' => 'Review Pending Trips',
        'recent_pending_trips' => 'Recent Pending Timesheet Trips',
        'trips_by_office' => 'Trips Breakdown by Office',
        'top_drivers_month' => 'Top Active Drivers This Month (Approved Trips)',
        'no_pending_trips' => 'No pending trips at this time. All submissions are reviewed!',

        // Extra keys used in various screens
        'office'       => 'Office',
        'route'        => 'Route',
        'rate'         => 'Rate',
        'action_add'   => 'Add',
        'action_delete'=> 'Delete',
        'logout'       => 'Sign Out',
        'nav_dashboard'=> 'Dashboard',
        'nav_offices'  => 'Offices & Branches',
        'nav_trip_approval' => 'Trip Approvals',
        'nav_reports'  => 'Reports',
        'hr_system'    => 'HR System',
        'trips_count'  => 'Total Trips',
    ]
];

/**
 * Translate helper
 */
function __(string $key, ?string $fallback = null): string {
    global $translations;
    $lang = $_SESSION['lang'] ?? 'ar';
    if (!isset($translations[$lang])) {
        $lang = 'ar';
    }
    return $translations[$lang][$key] ?? $fallback ?? $key;
}

/**
 * Returns current language code ('ar' or 'en')
 */
function getCurrentLang(): string {
    return $_SESSION['lang'] ?? 'ar';
}

/**
 * Checks if current language is RTL (Arabic)
 */
function isRtl(): bool {
    return getCurrentLang() === 'ar';
}
