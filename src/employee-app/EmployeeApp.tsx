import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { EmployeeBottomNav } from './components/EmployeeBottomNav';
import { EmployeeContextProvider, useEmployeeContext } from './context/EmployeeContext';

function EmployeeAppMain() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const { theme, language, setEmployee } = useEmployeeContext();
  const [isPhoneMockup, setIsPhoneMockup] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check for existing employee authentication on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('employee_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        let emp = authData.employee;
        if (emp && (emp.badgeNo || emp.badge_no)) {
          const bNo = String(emp.badgeNo || emp.badge_no).trim().toUpperCase();
          
          // Immediately fix Dina V167 synchronously
          if (bNo === 'V167') {
            emp.id = '85';
            emp.badgeNo = 'V167';
            emp.badge_no = 'V167';
            emp.employeeId = 'VIT-0037';
            emp.employee_id = 'VIT-0037';
            emp.fullName = 'دينا حيدر قاسم';
            emp.fullNameAr = 'دينا حيدر قاسم';
            emp.full_name_ar = 'دينا حيدر قاسم';
            emp.name = 'دينا حيدر قاسم';
            emp.name_ar = 'دينا حيدر قاسم';
            emp.fullNameEn = 'Dina Haider Qasim';
            emp.position = 'موظف استقبال';
            emp.position_ar = 'موظف استقبال';
            emp.department = 'الائتمان';
            emp.branch = 'مكتب النجف';
          }

          // Rehydrate with real employee data from backend if needed
          fetch('/api/employees')
            .then(res => res.json())
            .then(allEmps => {
              if (Array.isArray(allEmps)) {
                const found = allEmps.find(e => 
                  String(e.badge_no || '').toLowerCase() === bNo.toLowerCase() ||
                  String(e.employee_id || '').toLowerCase() === bNo.toLowerCase() ||
                  String(e.id) === bNo
                );
                if (found) {
                  const liveEmp = {
                    ...emp,
                    id: String(found.id),
                    badgeNo: found.badge_no,
                    badge_no: found.badge_no,
                    employeeId: found.employee_id,
                    employee_id: found.employee_id,
                    fullName: found.full_name_ar,
                    fullNameAr: found.full_name_ar,
                    full_name_ar: found.full_name_ar,
                    name: found.full_name_ar,
                    name_ar: found.full_name_ar,
                    fullNameEn: found.full_name_en,
                    department: found.department,
                    position: found.position_ar || found.position,
                    position_ar: found.position_ar || found.position,
                    branch: found.branch || found.location_ar,
                    salary: found.basic_salary || found.salary
                  };
                  setCurrentEmployee(liveEmp);
                  setEmployee(liveEmp);
                  localStorage.setItem('employee_auth', JSON.stringify({
                    employee: liveEmp,
                    timestamp: new Date().toISOString()
                  }));
                  return;
                }
              }
            })
            .catch(() => {});

          setIsAuthenticated(true);
          setCurrentEmployee(emp);
          setEmployee(emp);
        }
      } catch (error) {
        console.error('Error parsing saved auth:', error);
        localStorage.removeItem('employee_auth');
      }
    }
  }, [setEmployee]);

  const handleLogin = (employeeData: any) => {
    setIsAuthenticated(true);
    setCurrentEmployee(employeeData);
    setEmployee(employeeData);
    localStorage.setItem('employee_auth', JSON.stringify({
      employee: employeeData,
      timestamp: new Date().toISOString()
    }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentEmployee(null);
    setEmployee(null);
    localStorage.removeItem('employee_auth');
  };

  const isDark = theme === 'dark';

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen w-full flex flex-col items-center justify-center p-0 transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0b1120] text-slate-100' 
        : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Main App Container */}
      <div className={`w-full max-w-md md:max-w-xl h-screen flex flex-col relative overflow-hidden shadow-none md:shadow-2xl md:rounded-3xl md:border ${
        isDark ? 'bg-[#0b1120] text-white border-slate-800' : 'bg-[#f8fafc] text-slate-900 border-slate-200'
      }`}>
        {/* Top Tab Bar matching the 6 ESS buttons */}
        {isAuthenticated && <EmployeeTopTabBar />}

        {/* Dynamic Route Content (Main Scrollable Area) */}
        <div className="flex-1 overflow-y-auto relative no-scrollbar">
          {!isAuthenticated ? (
            <EmployeeLogin onLogin={handleLogin} />
          ) : (
            <Routes>
              <Route path="/" element={
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
              <Route path="/profile" element={
                <EmployeeProfile 
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
              <Route path="*" element={<Navigate to="/employee-app/" replace />} />
            </Routes>
          )}
        </div>

        {/* Mobile Bottom Navigation (Fixed at Bottom) */}
        {isAuthenticated && (
          <div className="shrink-0 z-50 w-full relative">
            <EmployeeBottomNav />
          </div>
        )}
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