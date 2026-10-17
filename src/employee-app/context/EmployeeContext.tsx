import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EmployeeContextType {
  employee: any;
  notifications: any[];
  messages: any[];
  unreadNotifications: number;
  unreadMessages: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  language: 'ar' | 'en';
  toggleLanguage: () => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (ar: string, en: string) => string;
  setEmployee: (employee: any) => void;
  logout: () => void;
  refreshEmployee: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: any) => void;
  markNotificationAsRead: (id: string) => void;
  addMessage: (message: any) => void;
  markMessageAsRead: (id: string) => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isLoggedOutRef = React.useRef(false);

  const [employee, setEmployeeState] = useState<any>(() => {
    try {
      if (sessionStorage.getItem('employee_logged_out') === 'true') {
        return null;
      }
      const savedAuth = localStorage.getItem('employee_auth');
      if (savedAuth) {
        return JSON.parse(savedAuth).employee;
      }
    } catch {}
    return null;
  });

  const setEmployee = React.useCallback((emp: any) => {
    if (emp) {
      isLoggedOutRef.current = false;
      try {
        sessionStorage.removeItem('employee_logged_out');
      } catch {}
    }
    setEmployeeState(emp);
  }, []);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem('employee_app_theme');
      return savedTheme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Synchronize Employee App theme with document.documentElement for global CSS variant compatibility
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('employee_app_theme', theme);
    } catch {}
  }, [theme]);

  const [language, setLanguageState] = useState<'ar' | 'en'>(() => {
    try {
      const savedLang = localStorage.getItem('employee_app_lang');
      return savedLang === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('employee_app_theme', next);
      } catch {}
      return next;
    });
  };

  const toggleLanguage = () => {
    setLanguageState(prev => {
      const next = prev === 'ar' ? 'en' : 'ar';
      try {
        localStorage.setItem('employee_app_lang', next);
      } catch {}
      return next;
    });
  };

  const setLanguage = (lang: 'ar' | 'en') => {
    setLanguageState(lang);
    try {
      localStorage.setItem('employee_app_lang', lang);
    } catch {}
  };

  const logout = React.useCallback(() => {
    isLoggedOutRef.current = true;
    try {
      localStorage.removeItem('employee_auth');
      sessionStorage.removeItem('employee_auth');
      sessionStorage.setItem('employee_logged_out', 'true');
    } catch {}
    setEmployeeState(null);
    setNotifications([]);
    setMessages([]);
  }, []);

  const t = React.useCallback((ar: string, en: string) => {
    return language === 'en' ? en : ar;
  }, [language]);

  const refreshNotifications = React.useCallback(async () => {
    if (!employee) return;
    const empId = employee.id || employee.employeeId || employee.badgeNo;
    if (!empId) return;

    try {
      const res = await fetch(`/api/routing/employee/${encodeURIComponent(empId)}/notifications`);
      if (res.ok) {
        const deliveries = await res.json();
        if (Array.isArray(deliveries)) {
          const formatted = deliveries.map((del: any) => ({
            id: del.id,
            title: language === 'en' ? `[Official Document] ${del.document_title}` : `[مستند رسمي] ${del.document_title}`,
            message: del.message || (language === 'en' 
              ? `Official document (${del.document_title}) was routed to you with ref ${del.document_id}.`
              : `تم توجيه مستند رسمي (${del.document_title}) إليك برقم مرجعي ${del.document_id}.`),
            type: del.document_type === 'employment_contract' ? 'success' : 'info',
            timestamp: del.created_at,
            read: del.app_status === 'read',
            important: true,
            action: language === 'en' ? 'Preview Document' : 'معاينة المستند',
            deliveryId: del.id,
            documentType: del.document_type,
            documentId: del.document_id,
            documentTitle: del.document_title,
            attachments: [
              {
                name: `${del.document_title}.pdf`,
                size: '1.2 MB',
                type: 'pdf',
                refNo: del.document_id,
                issuer: del.sender_name || (language === 'en' ? 'VITAS Iraq' : 'فيتاس العراق'),
                deliveryId: del.id,
                content: language === 'en'
                  ? `Official verified document: ${del.document_title}\nReference No: ${del.document_id}\nSender: ${del.sender_name}\nDelivery Date: ${new Date(del.created_at).toLocaleDateString('en-US')}`
                  : `مستند معتمد رسمياً: ${del.document_title}\nرقم المرجع: ${del.document_id}\nالمرسل: ${del.sender_name}\nتاريخ التسليم: ${new Date(del.created_at).toLocaleDateString('ar-IQ')}`
              }
            ]
          }));
          setNotifications(formatted);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch employee notifications:', e);
    }
  }, [employee, language]);

  // Initial load and periodic refresh
  React.useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 8000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const unreadMessages = messages.filter(m => !m.read).length;

  const addNotification = (notification: any) => {
    setNotifications(prev => [{
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    }, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id || n.deliveryId === id) {
        if (n.deliveryId && employee) {
          fetch(`/api/routing/documents/${n.deliveryId}/access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: employee.id || employee.badgeNo || 'EMP',
              documentId: n.documentId,
              action: 'view'
            })
          }).catch(() => {});
        }
        return { ...n, read: true };
      }
      return n;
    }));
  };

  const addMessage = (message: any) => {
    setMessages(prev => [{
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    }, ...prev]);
  };

  const markMessageAsRead = (id: string) => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, read: true } : m
    ));
  };

  const refreshEmployee = React.useCallback(async () => {
    try {
      if (isLoggedOutRef.current || sessionStorage.getItem('employee_logged_out') === 'true') {
        return;
      }

      const savedAuth = localStorage.getItem('employee_auth');
      if (!savedAuth) {
        return;
      }

      let bNo = '';
      let targetId = '';
      let targetEmpId = '';

      if (employee) {
        bNo = String(employee.badgeNo || employee.badge_no || '').trim().toUpperCase();
        targetId = String(employee.id || '').trim();
        targetEmpId = String(employee.employeeId || employee.employee_id || '').trim().toUpperCase();
      }

      if (!bNo) {
        try {
          const authData = JSON.parse(savedAuth);
          const emp = authData?.employee;
          if (emp) {
            bNo = String(emp.badgeNo || emp.badge_no || '').trim().toUpperCase();
            targetId = String(emp.id || '').trim();
            targetEmpId = String(emp.employeeId || emp.employee_id || '').trim().toUpperCase();
          }
        } catch {}
      }

      // If no authenticated employee or saved auth exists, DO NOT auto-login or fetch!
      if (!bNo) {
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`/api/employees?badge=${encodeURIComponent(bNo)}&id=${encodeURIComponent(targetId)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Check again if logout occurred during network request
      if (isLoggedOutRef.current || sessionStorage.getItem('employee_logged_out') === 'true' || !localStorage.getItem('employee_auth')) {
        return;
      }

      if (!res.ok) return;
      const data = await res.json();
      const allEmps = Array.isArray(data) ? data : (data ? [data] : []);
      if (allEmps.length === 0) return;

      const found = allEmps.find((e: any) => {
        const b = String(e.badgeNo || e.badge_no || '').trim().toUpperCase();
        const eid = String(e.employeeId || e.employee_id || '').trim().toUpperCase();
        const id = String(e.id || '').trim();
        return b === bNo || eid === bNo || id === bNo || (targetEmpId && eid === targetEmpId) || (targetId && id === targetId) || (bNo === 'V167' && (b === 'V167' || id === '85' || eid === 'VIT-0037'));
      }) || (allEmps.length === 1 ? allEmps[0] : null);

      if (found) {
        if (isLoggedOutRef.current || sessionStorage.getItem('employee_logged_out') === 'true' || !localStorage.getItem('employee_auth')) {
          return;
        }

        const livePhoto = found.photoUrl || found.photo_url || found.photo || found.avatar || '';
        const realHireDate = found.joinDate || found.originalStartDate || found.contractStartDate || found.original_start_date || found.contract_start_date || '';
        const realDob = found.dob || found.dateOfBirth || found.date_of_birth || '';

        setEmployeeState((prev: any) => {
          if (!prev || isLoggedOutRef.current || sessionStorage.getItem('employee_logged_out') === 'true' || !localStorage.getItem('employee_auth')) {
            return null;
          }

          const current = prev || {};
          const updated = {
            ...current,
            id: String(found.id),
            badgeNo: found.badgeNo || found.badge_no || current.badgeNo,
            badge_no: found.badgeNo || found.badge_no || current.badge_no,
            employeeId: found.employeeId || found.employee_id || current.employeeId,
            employee_id: found.employeeId || found.employee_id || current.employee_id,
            fullName: found.fullName || found.full_name_ar || current.fullName,
            fullNameAr: found.fullName || found.full_name_ar || current.fullNameAr,
            full_name_ar: found.fullName || found.full_name_ar || current.full_name_ar,
            name: found.fullName || found.full_name_ar || current.name,
            name_ar: found.fullName || found.full_name_ar || current.name_ar,
            fullNameEn: found.fullNameEn || found.full_name_en || current.fullNameEn,
            department: found.department || current.department,
            departmentEn: found.departmentEn || found.department_en || current.departmentEn,
            position: found.jobTitle || found.position_ar || found.position || current.position,
            position_ar: found.jobTitle || found.position_ar || found.position || current.position_ar,
            positionEn: found.jobTitleEn || found.position_en || current.positionEn,
            branch: found.branch || found.location_ar || current.branch,
            branchEn: found.branchEn || found.branch_en || current.branchEn,
            salary: found.basicSalary || found.basic_salary || found.salary || current.salary,
            basicSalary: found.basicSalary || found.basic_salary || current.basicSalary,
            joinDate: realHireDate,
            originalStartDate: realHireDate,
            contractStartDate: found.contractStartDate || found.contract_start_date || realHireDate,
            hireDate: realHireDate,
            dob: realDob,
            dateOfBirth: realDob,
            email: found.email || current.email || '',
            phone: found.phone || found.mobile || current.phone || '',
            nationality: found.nationality || current.nationality || '',
            gender: found.gender || current.gender || '',
            photoUrl: livePhoto,
            photo_url: livePhoto,
            avatar: livePhoto,
            photo: livePhoto
          };

          try {
            localStorage.setItem('employee_auth', JSON.stringify({
              employee: updated,
              timestamp: new Date().toISOString()
            }));
          } catch {}

          return updated;
        });
      }
    } catch (err) {
      console.warn('refreshEmployee failed:', err);
    }
  }, [employee]);

  // Synchronize employee immediately and automatically on focus/visibility and periodically
  React.useEffect(() => {
    refreshEmployee();

    const handleSync = () => {
      refreshEmployee();
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleSync();
    });

    const interval = setInterval(handleSync, 5000);
    return () => {
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, [refreshEmployee]);

  return (
    <EmployeeContext.Provider value={{
      employee,
      notifications,
      messages,
      unreadNotifications,
      unreadMessages,
      theme,
      toggleTheme,
      language,
      toggleLanguage,
      setLanguage,
      t,
      setEmployee,
      logout,
      refreshEmployee,
      refreshNotifications,
      addNotification,
      markNotificationAsRead,
      addMessage,
      markMessageAsRead
    }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployeeContext = () => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployeeContext must be used within an EmployeeContextProvider');
  }
  return context;
};