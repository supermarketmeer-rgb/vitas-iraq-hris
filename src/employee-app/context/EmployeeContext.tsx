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
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: any) => void;
  markNotificationAsRead: (id: string) => void;
  addMessage: (message: any) => void;
  markMessageAsRead: (id: string) => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<any>(null);
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