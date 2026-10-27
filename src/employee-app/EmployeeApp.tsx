import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { EmployeeMessages } from './components/EmployeeMessages';
import { EmployeeNotifications } from './components/EmployeeNotifications';
import { EmployeeLeaveRequests } from './components/EmployeeLeaveRequests';
import { EmployeeAttendance } from './components/EmployeeAttendance';
import { EmployeeProfile } from './components/EmployeeProfile';
import { EmployeeNews } from './components/EmployeeNews';
import { EmployeePayroll } from './components/EmployeePayroll';
import { EmployeeEvaluation } from './components/EmployeeEvaluation';
import { EmployeeTopTabBar } from './components/EmployeeTopTabBar';
import { EmployeeContextProvider, useEmployeeContext } from './context/EmployeeContext';

function EmployeeAppMain() {
  const navigate = useNavigate();
  const { theme, language, setEmployee, employee: contextEmployee, logout } = useEmployeeContext();
  const isAuthenticated = Boolean(contextEmployee);
  const currentEmployee = contextEmployee;

  // Check for logout query flag on mount
  useEffect(() => {
    if (window.location.search.includes('logout') || sessionStorage.getItem('employee_logged_out') === 'true') {
      try {
        localStorage.removeItem('employee_auth');
        sessionStorage.removeItem('employee_auth');
      } catch {}
      if (logout) logout();
      else setEmployee(null);
    }
  }, [logout, setEmployee]);

  const handleLogin = (employeeData: any) => {
    try {
      sessionStorage.removeItem('employee_logged_out');
    } catch {}
    setEmployee(employeeData);
    try {
      localStorage.setItem('employee_auth', JSON.stringify({
        employee: employeeData,
        timestamp: new Date().toISOString()
      }));
    } catch {}
    navigate('/employee-app/profile');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('employee_auth');
      sessionStorage.removeItem('employee_auth');
      sessionStorage.setItem('employee_logged_out', 'true');
    } catch {}
    if (logout) {
      logout();
    } else {
      setEmployee(null);
    }
    navigate('/employee-app/');
  };

  // Restore main admin app theme upon leaving employee portal
  useEffect(() => {
    return () => {
      try {
        const mainTheme = localStorage.getItem('vitas_theme') || 'dark';
        const root = document.documentElement;
        if (mainTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      } catch {}
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen w-full flex flex-col items-center justify-center p-0 transition-colors duration-300 ${isDark ? 'employee-app-dark' : 'employee-app-light'} ${
      isDark 
        ? 'bg-[#0b1120] text-slate-100' 
        : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Main App Container */}
      <div className={`w-full max-w-md md:max-w-2xl lg:max-w-3xl h-screen min-h-[100dvh] flex flex-col relative overflow-hidden shadow-none md:shadow-2xl md:rounded-3xl md:border-2 ${isDark ? 'employee-app-dark' : 'employee-app-light'} ${
        isDark ? 'bg-[#0b1120] text-white border-slate-700/80' : 'bg-[#f8fafc] text-slate-900 border-slate-300'
      }`}>
        {/* Top Tab Bar matching the 6 ESS buttons */}
        {isAuthenticated && <EmployeeTopTabBar onLogout={handleLogout} />}

        {/* Dynamic Route Content (Main Scrollable Area) */}
        <div className={`flex-1 overflow-y-auto relative no-scrollbar ${!isAuthenticated ? 'h-full min-h-full flex flex-col justify-center items-center' : ''}`}>
          {!isAuthenticated ? (
            <EmployeeLogin onLogin={handleLogin} />
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/employee-app/profile" replace />} />
              <Route path="/profile" element={
                <EmployeeProfile 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/dashboard" element={
                <EmployeeDashboard 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/messages" element={
                <EmployeeMessages 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/notifications" element={
                <EmployeeNotifications 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/leave" element={
                <EmployeeLeaveRequests 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/attendance" element={
                <EmployeeAttendance 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/payroll" element={
                <EmployeePayroll 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/evaluation" element={
                <EmployeeEvaluation 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="/news" element={
                <EmployeeNews 
                  employee={currentEmployee} 
                  onLogout={handleLogout}
                />
              } />
              <Route path="*" element={<Navigate to="/employee-app/profile" replace />} />
            </Routes>
          )}
        </div>
      </div>
    </div>
  );
}

export const EmployeeApp: React.FC = () => {
  return (
    <EmployeeContextProvider>
      <EmployeeAppMain />
    </EmployeeContextProvider>
  );
};