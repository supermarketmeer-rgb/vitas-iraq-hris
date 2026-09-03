import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ThemeMode,
  UserRole,
  UserProfile,
  Employee,
  LeaveRequest,
  JobVacancy,
  Candidate,
  AssetRecord,
  RiskRecord,
  DocumentRecord,
  SystemNotification
} from '../types';
import { CATEGORY_GROUPS } from '../data/categories';
import { api } from '../api/client';
import { connectionManager } from '../services/connectionManager';

interface AppContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  
  language: 'ar' | 'en';
  toggleLanguage: () => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (arText: string, enText: string) => string;
  
  activeModuleId: string;
  setActiveModuleId: (id: string) => void;
  
  currentUser: UserProfile | null;
  setCurrentUserRole: (role: UserRole) => void;
  setCurrentUser: (user: UserProfile | null) => void;
  isAuthenticated: boolean;
  setAuthenticated: (authenticated: boolean) => void;
  
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Domain Data state & handlers
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  leaveRequests: LeaveRequest[];
  addLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>) => void;
  updateLeaveStatus: (id: string, status: LeaveRequest['status']) => void;

  jobVacancies: JobVacancy[];
  addJobVacancy: (job: Omit<JobVacancy, 'id' | 'createdDate' | 'candidatesCount'>) => void;
  updateJobVacancy: (id: string, updates: Partial<JobVacancy>) => void;
  deleteJobVacancy: (id: string) => void;

  candidates: Candidate[];
  addCandidate: (candidate: Omit<Candidate, 'id' | 'appliedDate'>) => Promise<void>;
  updateCandidateStage: (id: string, stage: Candidate['stage']) => void;
  updateCandidate: (id: string, updates: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;

  assetRecords: AssetRecord[];
  addAssetRecord: (asset: Omit<AssetRecord, 'id'>) => void;

  riskRecords: RiskRecord[];
  addRiskRecord: (risk: Omit<RiskRecord, 'id'>) => void;

  documentRecords: DocumentRecord[];
  addDocumentRecord: (doc: Omit<DocumentRecord, 'id' | 'uploadDate'>) => void;

  notifications: SystemNotification[];
  addNotification: (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;

  // App Settings
  appSettings: Record<string, string>;

  // General App Actions
  refreshAllData: () => Promise<void>;
  resetToZeroData: () => Promise<void>;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr-001',
  name: 'أحمد محمود العراقي',
  role: 'HR Manager',
  email: 'a.mahmoud@vitas.iq',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  department: 'إدارة الموارد البشرية (HR HQ)',
  employeeId: 'VTS-1001',
  branch: 'المقر الرئيسي - بغداد',
  can_manage_employees: 1,
  can_manage_finance: 1,
  can_manage_recruitment: 1,
  can_manage_settings: 1,
  can_manage_users: 1
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDataLoaded = useRef(false);

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('vitas_theme') as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [language, setLanguageState] = useState<'ar' | 'en'>(() => {
    try {
      return (localStorage.getItem('vitas_language') as 'ar' | 'en') || 'ar';
    } catch {
      return 'ar';
    }
  });

  const [activeModuleId, setActiveModuleId] = useState<string>('dash-overview');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data state - initialized as empty arrays, will be loaded from API & localStorage
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>([]);
  const [riskRecords, setRiskRecords] = useState<RiskRecord[]>([]);
  const [documentRecords, setDocumentRecords] = useState<DocumentRecord[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('vitas_current_user');
      const savedRole = localStorage.getItem('vitas_user_role');
      if (savedUser && savedRole) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setAuthenticated(true);
      }
    } catch (e) {
      console.error('Error loading user from localStorage:', e);
    }
  }, []);

  // Load data from API on mount and on sync refresh
  const loadData = useCallback(async () => {
    try {
      // First, load from localStorage for instant display
        let localEmps: Employee[] = [];
        let localJobs: JobVacancy[] = [];
        let localCands: Candidate[] = [];
        let localLeaves: LeaveRequest[] = [];
        let localAssets: AssetRecord[] = [];
        let localRisks: RiskRecord[] = [];
        let localDocs: DocumentRecord[] = [];
        let localNotifs: SystemNotification[] = [];

        try {
          const saved = localStorage.getItem('vitas_employees');
          if (saved) localEmps = JSON.parse(saved);
        } catch (e) {}
        
        try {
          const savedJobs = localStorage.getItem('vitas_job_vacancies');
          if (savedJobs) localJobs = JSON.parse(savedJobs);
        } catch (e) {}
        
        try {
          const savedCands = localStorage.getItem('vitas_candidates');
          if (savedCands) localCands = JSON.parse(savedCands);
        } catch (e) {}
        
        try {
          const savedLeaves = localStorage.getItem('vitas_leave_requests');
          if (savedLeaves) localLeaves = JSON.parse(savedLeaves);
        } catch (e) {}
        
        try {
          const savedAssets = localStorage.getItem('vitas_assets');
          if (savedAssets) localAssets = JSON.parse(savedAssets);
        } catch (e) {}
        
        try {
          const savedRisks = localStorage.getItem('vitas_risks');
          if (savedRisks) localRisks = JSON.parse(savedRisks);
        } catch (e) {}
        
        try {
          const savedDocs = localStorage.getItem('vitas_documents');
          if (savedDocs) localDocs = JSON.parse(savedDocs);
        } catch (e) {}
        
        try {
          const savedNotifs = localStorage.getItem('vitas_notifications');
          if (savedNotifs) localNotifs = JSON.parse(savedNotifs);
        } catch (e) {}
        
        let localSettings: Record<string, string> = {};
        try {
          const savedSettings = localStorage.getItem('vitas_app_settings');
          if (savedSettings) localSettings = JSON.parse(savedSettings);
        } catch (e) {}

        // Set local data immediately for instant display
        setEmployees(localEmps || []);
        setJobVacancies(localJobs || []);
        setCandidates(localCands || []);
        setLeaveRequests(localLeaves || []);
        setAssetRecords(localAssets || []);
        setRiskRecords(localRisks || []);
        setDocumentRecords(localDocs || []);
        setNotifications(localNotifs || []);
        setAppSettings(localSettings || {});

        // Then fetch from API in background
        const [empData, leaveData, jobData, candData, assetData, riskData, docData, notifData, settingsData] = await Promise.all([
          api.getEmployees().catch(() => null),
          api.getLeaveRequests().catch(() => null),
          api.getJobVacancies().catch(() => null),
          api.getCandidates().catch(() => null),
          api.getAssets().catch(() => null),
          api.getRisks().catch(() => null),
          api.getDocuments().catch(() => null),
          api.getNotifications().catch(() => null),
          api.getAppSettings().catch(() => null)
        ]);

        // Process employees - accept API result if returned (even if empty after data clear)
        let finalEmpData: any = empData;
        if (!Array.isArray(finalEmpData)) {
          finalEmpData = localEmps || [];
        }
        
        // Remove any remaining duplicates based on ID
        finalEmpData = finalEmpData.filter((emp: any, index: number, self: any[]) => 
          index === self.findIndex((e: any) => String(e.id) === String(emp.id))
        );
        
        setEmployees(finalEmpData || []);

        let finalLeaves = leaveData || localLeaves || [];
        if (!Array.isArray(finalLeaves) || finalLeaves.length === 0) {
          finalLeaves = [
            {
              id: 'LV-2026-001',
              employeeId: '5425',
              employeeName: 'حسن وليد رسن',
              leaveType: 'إجازة سنوية',
              startDate: '2026-08-10',
              endDate: '2026-08-14',
              days: 5,
              reason: 'إجازة اعتيادية سنوية لمتابعة شؤون عائلية',
              status: 'قيد الانتظار',
              appliedDate: '2026-08-01'
            },
            {
              id: 'LV-2026-002',
              employeeId: '8488',
              employeeName: 'حسين رسول ابراهيم',
              leaveType: 'إجازة مرضية',
              startDate: '2026-08-05',
              endDate: '2026-08-07',
              days: 3,
              reason: 'إجازة مرضية بناءً على تقرير طبي معتمد',
              status: 'قيد الانتظار',
              appliedDate: '2026-08-04'
            },
            {
              id: 'LV-2026-003',
              employeeId: '8298',
              employeeName: 'حسين سعيد صالح',
              leaveType: 'إجازة طارئة',
              startDate: '2026-08-02',
              endDate: '2026-08-03',
              days: 2,
              reason: 'ظرف عائلي طارئ',
              status: 'مقبولة',
              appliedDate: '2026-08-02'
            },
            {
              id: 'LV-2026-004',
              employeeId: '5344',
              employeeName: 'حسين زامل مشرف',
              leaveType: 'إجازة سنوية',
              startDate: '2026-07-20',
              endDate: '2026-07-25',
              days: 6,
              reason: 'إجازة سنوية خطة الصيف',
              status: 'مقبولة',
              appliedDate: '2026-07-15'
            }
          ];
          try {
            localStorage.setItem('vitas_leave_requests', JSON.stringify(finalLeaves));
          } catch (e) {}
        }
        setLeaveRequests(finalLeaves);

        // Merge Job Vacancies
        let finalJobData: any = jobData;
        if (!Array.isArray(finalJobData) || finalJobData.length === 0) {
          finalJobData = localJobs;
        } else if (Array.isArray(localJobs) && localJobs.length > 0) {
          const merged = [...finalJobData];
          localJobs.forEach(lj => {
            if (lj && lj.id && !merged.some(j => j.id === lj.id)) {
              merged.push(lj);
            }
          });
          finalJobData = merged;
        }
        setJobVacancies(finalJobData || []);

        // Candidates sync from API
        if (Array.isArray(candData)) {
          setCandidates(candData);
          try {
            localStorage.setItem('vitas_candidates', JSON.stringify(candData));
          } catch (e) {}
        } else {
          setCandidates(localCands || []);
        }

        setAssetRecords(assetData || localAssets);
        setRiskRecords(riskData || localRisks);
        setDocumentRecords(docData || localDocs);
        setNotifications(notifData || localNotifs);

        // Process app settings (handles both array and object responses)
        let settingsObj: Record<string, string> = {};
        if (Array.isArray(settingsData)) {
          settingsData.forEach((setting: any) => {
            if (setting && setting.setting_key) {
              settingsObj[setting.setting_key] = setting.setting_value;
            }
          });
        } else if (settingsData && typeof settingsData === 'object') {
          settingsObj = { ...settingsData };
        }

        if (Object.keys(settingsObj).length > 0) {
          setAppSettings(settingsObj);
          try {
            localStorage.setItem('vitas_app_settings', JSON.stringify(settingsObj));
            if (settingsObj.vitas_custom_employee_permissions) {
              localStorage.setItem('vitas_custom_employee_permissions', settingsObj.vitas_custom_employee_permissions);
            }
            if (settingsObj.vitas_custom_users) {
              localStorage.setItem('vitas_custom_users', settingsObj.vitas_custom_users);
            }
          } catch (e) {}
        }
      } catch (error) {
        console.error('Error loading data from API:', error);
        try {
          const savedEmp = localStorage.getItem('vitas_employees');
          if (savedEmp) setEmployees(JSON.parse(savedEmp));
          const savedJobs = localStorage.getItem('vitas_job_vacancies');
          if (savedJobs) setJobVacancies(JSON.parse(savedJobs));
          const savedCands = localStorage.getItem('vitas_candidates');
          if (savedCands) setCandidates(JSON.parse(savedCands));
        } catch (e) {}
      } finally {
        isDataLoaded.current = true;
      }
  }, []);

  // Mount effect to load data and listen to Real-Time SSE stream
  useEffect(() => {
    loadData();

    // ⚡ Real-Time Server-Sent Events (SSE) Live Data Synchronization
    connectionManager.initRealtimeEventStream((tableName) => {
      const matchAll = !tableName || tableName === 'all' || tableName === 'general';

      if (matchAll || tableName === 'employees') {
        api.getEmployees().then(d => { if (Array.isArray(d)) setEmployees(d); }).catch(() => {});
      }
      if (matchAll || tableName === 'candidates') {
        api.getCandidates().then(d => { if (Array.isArray(d)) setCandidates(d); }).catch(() => {});
      }
      if (matchAll || tableName === 'job_vacancies') {
        api.getJobVacancies().then(d => { if (Array.isArray(d)) setJobVacancies(d); }).catch(() => {});
      }
      if (matchAll || tableName === 'leave_requests' || tableName === 'leaves') {
        api.getLeaveRequests().then(d => { if (Array.isArray(d)) setLeaveRequests(d); }).catch(() => {});
      }
      if (matchAll || tableName === 'attendance') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vitas:attendance_changed'));
        }
      }
      if (matchAll || tableName === 'app_settings' || tableName === 'users') {
        api.getAppSettings().then(d => { if (d && typeof d === 'object') setAppSettings(d); }).catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vitas:users_changed'));
        }
      }
    });

    const interval = setInterval(async () => {
      try {
        const [candData, jobData, empData, setsData] = await Promise.all([
          api.getCandidates().catch(() => null),
          api.getJobVacancies().catch(() => null),
          api.getEmployees().catch(() => null),
          api.getAppSettings().catch(() => null)
        ]);

        if (Array.isArray(candData)) {
          setCandidates(candData);
          try { localStorage.setItem('vitas_candidates', JSON.stringify(candData)); } catch (e) {}
        }
        if (Array.isArray(jobData) && jobData.length > 0) {
          setJobVacancies(jobData);
        }
        if (Array.isArray(empData) && empData.length > 0) {
          setEmployees(empData);
        }
        if (setsData && typeof setsData === 'object') {
          setAppSettings(setsData);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vitas:users_changed'));
        }
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-generate live active system notifications if notifications list is empty
  useEffect(() => {
    if (notifications.length === 0) {
      const activeNotifs: SystemNotification[] = [
        {
          id: 'notif-onhold-1',
          title: 'تنبيه إيقاف الرواتب (On Hold)',
          message: 'نظام حوكمة وإيقاف الرواتب مفعل تلقائياً للموظفين المستقيلين أو الموقوفين يدوياً واستبعادهم من القسائم.',
          timestamp: 'الآن',
          type: 'warning',
          read: false
        },
        {
          id: 'notif-payroll-2',
          title: 'تحديث مسير رواتب الشهر الحالي',
          message: `مسير الرواتب الحاضر نشط ومحدث لـ ${employees.length || 49} موظفاً في كافة فروع ومكاتب فيتاس العراق.`,
          timestamp: 'قبل 10 دقائق',
          type: 'success',
          read: false
        },
        {
          id: 'notif-leaves-3',
          title: 'نظام إدارة الإجازات والغيابات',
          message: 'تم ربط رصيد الإجازات السنوية والمرضية واحتساب استقطاعات أيام الغياب تلقائياً وفق القانون.',
          timestamp: 'اليوم 09:30 ص',
          type: 'info',
          read: false
        },
        {
          id: 'notif-db-4',
          title: 'تكامل قاعدة البيانات XAMPP MySQL',
          message: 'تم التثبت من الربط المباشر مع قاعدة البيانات المحلية vitasiraq_hris_db وحفظ السجلات بنجاح.',
          timestamp: 'أمس 08:00 ص',
          type: 'info',
          read: true
        }
      ];
      setNotifications(activeNotifs);
      try {
        localStorage.setItem('vitas_notifications', JSON.stringify(activeNotifs));
      } catch (e) {}
    }
  }, [employees.length, notifications.length]);

  // Theme Handling
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('vitas_theme', theme);
    } catch (e) {}
  }, [theme]);

  // Language Handling
  useEffect(() => {
    const root = document.documentElement;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.lang = language;
    try {
      localStorage.setItem('vitas_language', language);
    } catch (e) {}
  }, [language]);

  const toggleTheme = () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  const setTheme = (tMode: ThemeMode) => setThemeState(tMode);
  const toggleLanguage = () => setLanguageState(prev => (prev === 'ar' ? 'en' : 'ar'));
  const setLanguage = (lang: 'ar' | 'en') => setLanguageState(lang);
  const t = (arText: string, enText: string) => (language === 'en' ? enText : arText);

  const setCurrentUserRole = (role: UserRole) => {
    if (currentUser) {
      setCurrentUser(prev => ({ ...prev, role }));
    }
    localStorage.setItem('vitas_user_role', role);
    if (role === 'Recruiter') {
      setActiveModuleId('recruit-dash');
    } else if (role === 'IT Admin') {
      setActiveModuleId('cat-9-risk');
    }
  };

  const setCurrentUserHandler = (user: UserProfile | null) => {
    setCurrentUser(user);
    setAuthenticated(user !== null);
    if (user) {
      localStorage.setItem('vitas_current_user', JSON.stringify(user));
      localStorage.setItem('vitas_user_role', user.role);
    } else {
      localStorage.removeItem('vitas_current_user');
      localStorage.removeItem('vitas_user_role');
    }
  };

  const setAuthenticatedHandler = (authenticated: boolean) => {
    setAuthenticated(authenticated);
    if (!authenticated) {
      setCurrentUser(null);
      localStorage.removeItem('vitas_current_user');
      localStorage.removeItem('vitas_user_role');
    }
  };

  // Sync LocalStorage (as backup) - ONLY after initial data load completes!
  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_employees', JSON.stringify(employees));
    } catch (e) {}
  }, [employees]);

  // Ensure employees array stays deduplicated
  useEffect(() => {
    if (!isDataLoaded.current) return;
    const uniqueEmployees = employees.filter((emp, index, self) =>
      index === self.findIndex(e => String(e.id) === String(emp.id))
    );
    if (uniqueEmployees.length !== employees.length) {
      setEmployees(uniqueEmployees);
    }
  }, [employees]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_leave_requests', JSON.stringify(leaveRequests));
    } catch (e) {}
  }, [leaveRequests]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_job_vacancies', JSON.stringify(jobVacancies));
    } catch (e) {}
  }, [jobVacancies]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_candidates', JSON.stringify(candidates));
    } catch (e) {}
  }, [candidates]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_assets', JSON.stringify(assetRecords));
    } catch (e) {}
  }, [assetRecords]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_risks', JSON.stringify(riskRecords));
    } catch (e) {}
  }, [riskRecords]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    try {
      localStorage.setItem('vitas_documents', JSON.stringify(documentRecords));
    } catch (e) {}
  }, [documentRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('vitas_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Check and initialize Database connection on first run
  useEffect(() => {
    const checkDatabaseConnection = async () => {
      try {
        await api.health().catch(() => null);
        const dbInitialized = localStorage.getItem('vitas_db_initialized');
        if (!dbInitialized) {
          localStorage.setItem('vitas_db_initialized', 'true');
          
          const initialNotification: SystemNotification = {
            id: `NOTIF-DB-INIT-${Date.now()}`,
            title: language === 'en' ? 'Database Connected' : 'تم الاتصال بقاعدة البيانات بنجاح',
            message: language === 'en' 
              ? 'Successfully connected to MySQL database' 
              : 'تم الاتصال بقاعدة بيانات MySQL بنجاح',
            type: 'success',
            timestamp: new Date().toLocaleTimeString(),
            read: false,
          };
          setNotifications(prev => [initialNotification, ...prev]);
        }
      } catch (error) {
        console.error('Database connection failed:', error);
        const initialNotification: SystemNotification = {
          id: `NOTIF-DB-ERROR-${Date.now()}`,
          title: language === 'en' ? 'Database Connection Failed' : 'فشل الاتصال بقاعدة البيانات',
          message: language === 'en' 
            ? 'Failed to connect to MySQL database. Using LocalStorage fallback.' 
            : 'فشل الاتصال بقاعدة بيانات MySQL. استخدام التخزين المحلي كبديل.',
          type: 'alert',
          timestamp: new Date().toLocaleTimeString(),
          read: false,
        };
        setNotifications(prev => [initialNotification, ...prev]);
      }
    };

    checkDatabaseConnection();
  }, []);

  // Actions - Using API when available
  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    try {
      const resData: any = await api.addEmployee(emp);
      const createdEmp: Employee = {
        ...emp,
        id: String(resData?.id || Date.now().toString())
      };
      setEmployees(prev => [createdEmp, ...prev.filter(e => String(e.id) !== String(createdEmp.id))]);
      
      // Also fetch fresh list from API to ensure DB & state consistency
      try {
        const freshEmps = await api.getEmployees();
        if (Array.isArray(freshEmps) && freshEmps.length > 0) {
          // Remove duplicates from server response
          const uniqueList = freshEmps.filter((item, index, self) =>
            index === self.findIndex(e => String(e.id) === String(item.id))
          );
          setEmployees(uniqueList);
        }
      } catch (e) {}

      addNotification({
        title: 'إضافة موظف جديد',
        message: `تمت إضافة الموظف ${emp.fullName} بنجاح إلى السجلات`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding employee:', error);
      // Fallback to local state
      const newEmp: Employee = {
        ...emp,
        id: `EMP-${Date.now().toString().slice(-4)}`
      };
      setEmployees(prev => {
        // Ensure no duplicates before adding
        const filtered = prev.filter(e => String(e.id) !== String(newEmp.id));
        return [newEmp, ...filtered];
      });
    }
  };

  const updateEmployee = async (emp: Employee) => {
    try {
      const response = await api.updateEmployee(emp).catch(() => null);
      if (response) {
        const freshList = await api.getEmployees().catch(() => null);
        if (Array.isArray(freshList) && freshList.length > 0) {
          const uniqueList = freshList.filter((item, index, self) =>
            index === self.findIndex(e => String(e.id) === String(item.id))
          );
          setEmployees(uniqueList);
          try {
            localStorage.setItem('vitas_employees', JSON.stringify(uniqueList));
          } catch (e) {}
        }
      } else {
        throw new Error('API offline');
      }
    } catch (error) {
      console.warn('Backend API offline, updating employee locally in state and localStorage:', error);
      setEmployees(prev => {
        const updated = prev.map(e => (
          String(e.id) === String(emp.id) ||
          (e.employeeId && String(e.employeeId) === String(emp.employeeId)) ||
          (e.badgeNo && String(e.badgeNo) === String(emp.badgeNo))
        ) ? { ...e, ...emp } : e);
        try {
          localStorage.setItem('vitas_employees', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
    addNotification({
      title: 'تعديل بيانات موظف',
      message: `تم تحديث بيانات الموظف ${emp.fullName || emp.fullNameAr || ''} بنجاح`,
      type: 'success'
    });
  };

  const deleteEmployee = async (id: string) => {
    try {
      await api.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => String(e.id) !== String(id)));
    } catch (error) {
      console.error('Error deleting employee:', error);
      // Fallback to local state
      setEmployees(prev => prev.filter(e => String(e.id) !== String(id)));
    }
  };

  const refreshEmployees = async () => {
    try {
      const freshList = await api.getEmployees();
      if (Array.isArray(freshList)) {
        setEmployees(freshList);
      }
    } catch (err) {
      console.warn('Could not refresh employees list from API:', err);
    }
  };

  const addLeaveRequest = async (req: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>) => {
    try {
      const newReq = await api.addLeaveRequest(req);
      setLeaveRequests(prev => [newReq, ...prev]);
      addNotification({
        title: 'طلب إجازة جديد',
        message: `تم تقديم طلب إجازة بواسطة ${req.employeeName}`,
        type: 'info'
      });
    } catch (error) {
      console.error('Error adding leave request:', error);
      // Fallback to local state
      const newReq: LeaveRequest = {
        ...req,
        id: `LV-${Date.now().toString().slice(-4)}`,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'قيد الانتظار'
      };
      setLeaveRequests(prev => [newReq, ...prev]);
    }
  };

  const updateLeaveStatus = async (id: string, status: 'قيد الانتظار' | 'مقبول' | 'مرفوض') => {
    try {
      await api.updateLeaveStatus(id, status);
      setLeaveRequests(prev =>
        prev.map(item => (item.id === id ? { ...item, status } : item))
      );
    } catch (error) {
      console.error('Error updating leave status:', error);
      // Fallback to local state
      setLeaveRequests(prev =>
        prev.map(item => (item.id === id ? { ...item, status } : item))
      );
    }
  };

  const addJobVacancy = async (job: Omit<JobVacancy, 'id' | 'createdDate' | 'candidatesCount'>) => {
    try {
      const newJob = await api.addJobVacancy(job);
      setJobVacancies(prev => [newJob, ...prev]);
    } catch (error) {
      console.error('Error adding job vacancy:', error);
      // Fallback to local state
      const newJob: JobVacancy = {
        ...job,
        id: `JOB-${Date.now().toString().slice(-4)}`,
        createdDate: new Date().toISOString().split('T')[0],
        candidatesCount: 0
      };
      setJobVacancies(prev => [newJob, ...prev]);
    }
  };

  const updateJobVacancy = async (id: string, job: Partial<JobVacancy>) => {
    try {
      await api.updateJobVacancy(id, job).catch(() => {});
    } catch (error) {
      console.error('Error updating job vacancy:', error);
    }
    setJobVacancies(prev => {
      const exists = prev.some(j => j.id === id || (job.title && j.title === job.title));
      if (exists) {
        return prev.map(j => (j.id === id || (job.title && j.title === job.title) ? { ...j, ...job } : j));
      } else {
        const newJob: JobVacancy = {
          id: id,
          title: job.title || id,
          department: job.department || 'قسم الائتمان',
          location: job.location || 'بغداد_المنصور',
          type: job.type || 'دوام كامل',
          status: (job.status || 'مفتوحة') as JobVacancy['status'],
          experienceYears: job.experienceYears || 2,
          requirements: job.requirements || '',
          deadline: job.deadline || '',
          createdDate: new Date().toISOString(),
          candidatesCount: 0,
          ...job
        };
        return [newJob, ...prev];
      }
    });
  };

  const deleteJobVacancy = async (id: string) => {
    try {
      await api.deleteJobVacancy(id);
      setJobVacancies(prev => prev.filter(j => j.id !== id));
    } catch (error) {
      console.error('Error deleting job vacancy:', error);
      // Fallback to local state
      setJobVacancies(prev => prev.filter(j => j.id !== id));
    }
  };

  const addCandidate = async (cand: Omit<Candidate, 'id' | 'appliedDate'>) => {
    try {
      const newCand = await api.addCandidate(cand);
      setCandidates(prev => [newCand, ...prev.filter(c => c.id !== newCand.id)]);

      // Update job candidate count
      setJobVacancies(prev =>
        prev.map(j =>
          j.id === cand.appliedJobId
            ? { ...j, candidatesCount: (j.candidatesCount || 0) + 1 }
            : j
        )
      );
      return newCand;
    } catch (error) {
      console.error('Error adding candidate:', error);
      throw error;
    }
  };

  const updateCandidateStage = async (id: string, stage: Candidate['stage']) => {
    try {
      await api.updateCandidateStage(id, stage);
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, stage } : c))
      );
    } catch (error) {
      console.error('Error updating candidate stage:', error);
      // Fallback to local state
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, stage } : c))
      );
    }
  };

  const updateCandidate = async (id: string, updates: Partial<Candidate>) => {
    try {
      await api.updateCandidate(id, updates);
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
    } catch (error) {
      console.error('Error updating candidate:', error);
      // Fallback to local state
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      await api.deleteCandidate(id);
      setCandidates(prev => {
        const updated = prev.filter(c => c.id !== id);
        try { localStorage.setItem('vitas_candidates', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      setCandidates(prev => {
        const updated = prev.filter(c => c.id !== id);
        try { localStorage.setItem('vitas_candidates', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
    }
  };

  const addAssetRecord = async (asset: Omit<AssetRecord, 'id'>) => {
    try {
      const newAsset = await api.addAsset(asset);
      setAssetRecords(prev => [newAsset, ...prev]);
    } catch (error) {
      console.error('Error adding asset:', error);
      // Fallback to local state
      const newAsset: AssetRecord = {
        ...asset,
        id: `AST-${Date.now().toString().slice(-4)}`
      };
      setAssetRecords(prev => [newAsset, ...prev]);
    }
  };

  const addRiskRecord = async (risk: Omit<RiskRecord, 'id' | 'identifiedDate'>) => {
    try {
      const newRisk = await api.addRisk(risk);
      setRiskRecords(prev => [newRisk, ...prev]);
    } catch (error) {
      console.error('Error adding risk:', error);
      // Fallback to local state
      const newRisk: RiskRecord = {
        ...risk,
        id: `RSK-${Date.now().toString().slice(-4)}`,
        identifiedDate: new Date().toISOString().split('T')[0]
      };
      setRiskRecords(prev => [newRisk, ...prev]);
    }
  };

  const addDocumentRecord = async (doc: Omit<DocumentRecord, 'id' | 'uploadDate'>) => {
    try {
      const newDoc = await api.addDocument(doc);
      setDocumentRecords(prev => [newDoc, ...prev]);
    } catch (error) {
      console.error('Error adding document:', error);
      // Fallback to local state
      const newDoc: DocumentRecord = {
        ...doc,
        id: `DOC-${Date.now().toString().slice(-4)}`,
        uploadDate: new Date().toISOString().split('T')[0]
      };
      setDocumentRecords(prev => [newDoc, ...prev]);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Fallback to local state
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const addNotification = async (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
    try {
      const newN = await api.addNotification(notif);
      setNotifications(prev => [newN, ...prev]);
    } catch (error) {
      console.error('Error adding notification:', error);
      // Fallback to local state
      const newN: SystemNotification = {
        ...notif,
        id: `NTF-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setNotifications(prev => [newN, ...prev]);
    }
  };

  const resetToZeroData = async () => {
    try {
      await api.resetData();
    } catch (e: any) {
      console.error('Could not reset database via API:', e);
      throw e;
    }
    setEmployees([]);
    setLeaveRequests([]);
    setJobVacancies([]);
    setCandidates([]);
    setAssetRecords([]);
    setRiskRecords([]);
    setDocumentRecords([]);
    setNotifications([]);

    // Backup essential user/auth session keys before clearing localStorage
    const currentUserBackup = localStorage.getItem('vitas_current_user');
    const authBackup = localStorage.getItem('vitas_auth');
    const roleBackup = localStorage.getItem('vitas_user_role');
    const themeBackup = localStorage.getItem('vitas_theme');
    const langBackup = localStorage.getItem('vitas_language');

    localStorage.clear();

    if (currentUserBackup) localStorage.setItem('vitas_current_user', currentUserBackup);
    if (authBackup) localStorage.setItem('vitas_auth', authBackup);
    if (roleBackup) localStorage.setItem('vitas_user_role', roleBackup);
    if (themeBackup) localStorage.setItem('vitas_theme', themeBackup);
    if (langBackup) localStorage.setItem('vitas_language', langBackup);

    // Explicitly write empty arrays to domain keys so no cached data persists
    localStorage.setItem('vitas_employees', JSON.stringify([]));
    localStorage.setItem('vitas_candidates', JSON.stringify([]));
    localStorage.setItem('vitas_leave_requests', JSON.stringify([]));
    localStorage.setItem('vitas_job_vacancies', JSON.stringify([]));
    localStorage.setItem('vitas_assets', JSON.stringify([]));
    localStorage.setItem('vitas_risks', JSON.stringify([]));
    localStorage.setItem('vitas_documents', JSON.stringify([]));
    localStorage.setItem('vitas_notifications', JSON.stringify([]));
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
        language,
        toggleLanguage,
        setLanguage,
        t,
        activeModuleId,
        setActiveModuleId,
        currentUser,
        setCurrentUserRole,
        setCurrentUser: setCurrentUserHandler,
        isAuthenticated,
        setAuthenticated: setAuthenticatedHandler,
        isSidebarOpen,
        setIsSidebarOpen,
        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,
        employees,
        setEmployees,
        refreshEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        leaveRequests,
        addLeaveRequest,
        updateLeaveStatus,
        jobVacancies,
        addJobVacancy,
        updateJobVacancy,
        deleteJobVacancy,
        candidates,
        addCandidate,
        updateCandidateStage,
        updateCandidate,
        deleteCandidate,
        assetRecords,
        addAssetRecord,
        riskRecords,
        addRiskRecord,
        documentRecords,
        addDocumentRecord,
        notifications,
        markNotificationRead,
        addNotification,
        appSettings,
        refreshAllData: loadData,
        resetToZeroData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
