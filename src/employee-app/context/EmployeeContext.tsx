import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EmployeeContextType {
  employee: any;
  notifications: any[];
  messages: any[];
  unreadNotifications: number;
  unreadMessages: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setEmployee: (employee: any) => void;
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

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('employee_app_theme', next);
      } catch {}
      return next;
    });
  };

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
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
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
      setEmployee,
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