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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const { theme, language, setEmployee, employee: contextEmployee, logout } = useEmployeeContext();
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

  // Sync state when contextEmployee updates
  useEffect(() => {
    if (contextEmployee) {
      setCurrentEmployee(contextEmployee);
      setIsAuthenticated(true);
    } else {
      setCurrentEmployee(null);
      setIsAuthenticated(false);
    }
  }, [contextEmployee]);

  // Check for existing employee authentication on mount
  useEffect(() => {
    if (window.location.search.includes('logout') || sessionStorage.getItem('employee_logged_out') === 'true') {
      try {
        localStorage.removeItem('employee_auth');
        sessionStorage.removeItem('employee_auth');
      } catch {}
      setIsAuthenticated(false);
      setCurrentEmployee(null);
      setEmployee(null);
      return;
    }

    const savedAuth = localStorage.getItem('employee_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        let emp = authData.employee;
        if (emp && (emp.badgeNo || emp.badge_no || emp.id)) {
          const bNo = String(emp.badgeNo || emp.badge_no || emp.id || '').trim().toUpperCase();
          
          setIsAuthenticated(true);
          setCurrentEmployee(emp);
          setEmployee(emp);

          // Rehydrate with real employee data from backend immediately
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          fetch(`/api/employees?badge=${encodeURIComponent(bNo)}&id=${encodeURIComponent(emp.id || '')}`, {
            signal: controller.signal
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              clearTimeout(timeoutId);
              if (sessionStorage.getItem('employee_logged_out') === 'true' || !localStorage.getItem('employee_auth')) {
                return;
              }
              const allEmps = Array.isArray(data) ? data : (data ? [data] : []);
              if (allEmps.length > 0) {
                const found = allEmps.find((e: any) => {
                  const b = String(e.badgeNo || e.badge_no || '').trim().toUpperCase();
                  const eid = String(e.employeeId || e.employee_id || '').trim().toUpperCase();
                  const id = String(e.id || '').trim();
                  return b === bNo || eid === bNo || id === bNo || (bNo === 'V167' && (b === 'V167' || id === '85' || eid === 'VIT-0037'));
                }) || (allEmps.length === 1 ? allEmps[0] : null);
                if (found) {
                  if (sessionStorage.getItem('employee_logged_out') === 'true' || !localStorage.getItem('employee_auth')) {
                    return;
                  }
                  const livePhoto = found.photoUrl || found.photo_url || found.photo || found.avatar || '';
                  const realHireDate = found.joinDate || found.originalStartDate || found.contractStartDate || found.original_start_date || found.contract_start_date || '';
                  const realDob = found.dob || found.dateOfBirth || found.date_of_birth || '';

                  const liveEmp = {
                    ...emp,
                    id: String(found.id),
                    badgeNo: found.badgeNo || found.badge_no || emp.badgeNo,
                    badge_no: found.badgeNo || found.badge_no || emp.badge_no,
                    employeeId: found.employeeId || found.employee_id || emp.employeeId,
                    employee_id: found.employeeId || found.employee_id || emp.employee_id,
                    fullName: found.fullName || found.full_name_ar || emp.fullName,
                    fullNameAr: found.fullName || found.full_name_ar || emp.fullNameAr,
                    full_name_ar: found.fullName || found.full_name_ar || emp.full_name_ar,
                    name: found.fullName || found.full_name_ar || emp.name,
                    name_ar: found.fullName || found.full_name_ar || emp.name_ar,
                    fullNameEn: found.fullNameEn || found.full_name_en || emp.fullNameEn,
                    department: found.department || emp.department,
                    departmentEn: found.departmentEn || found.department_en || emp.departmentEn,
                    position: found.jobTitle || found.position_ar || found.position || emp.position,
                    position_ar: found.jobTitle || found.position_ar || found.position || emp.position_ar,
                    positionEn: found.jobTitleEn || found.position_en || emp.positionEn,
                    branch: found.branch || found.location_ar || emp.branch,
                    branchEn: found.branchEn || found.branch_en || emp.branchEn,
                    salary: found.basicSalary || found.basic_salary || found.salary || emp.salary,
                    basicSalary: found.basicSalary || found.basic_salary || emp.basicSalary,
                    joinDate: realHireDate,
                    originalStartDate: realHireDate,
                    contractStartDate: found.contractStartDate || found.contract_start_date || realHireDate,
                    hireDate: realHireDate,
                    dob: realDob,
                    dateOfBirth: realDob,
                    email: found.email || emp.email || '',
                    phone: found.phone || found.mobile || emp.phone || '',
                    nationality: found.nationality || emp.nationality || '',
                    gender: found.gender || emp.gender || '',
                    photoUrl: livePhoto,
                    photo_url: livePhoto,
                    avatar: livePhoto,
                    photo: livePhoto
                  };
                  setCurrentEmployee(liveEmp);
                  setEmployee(liveEmp);
                  localStorage.setItem('employee_auth', JSON.stringify({
                    employee: liveEmp,
                    timestamp: new Date().toISOString()
                  }));
                }
              }
            })
            .catch(() => {});
        }
      } catch (error) {
        console.error('Error parsing saved auth:', error);
        localStorage.removeItem('employee_auth');
      }
    }
  }, [setEmployee]);

  const handleLogin = (employeeData: any) => {
    try {
      sessionStorage.removeItem('employee_logged_out');
    } catch {}
    setIsAuthenticated(true);
    setCurrentEmployee(employeeData);
    setEmployee(employeeData);
    localStorage.setItem('employee_auth', JSON.stringify({
      employee: employeeData,
      timestamp: new Date().toISOString()
    }));
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
    setIsAuthenticated(false);
    setCurrentEmployee(null);
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
      <div className={`w-full max-w-md md:max-w-xl h-screen min-h-[100dvh] flex flex-col relative overflow-hidden shadow-none md:shadow-2xl md:rounded-3xl md:border-2 ${isDark ? 'employee-app-dark' : 'employee-app-light'} ${
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