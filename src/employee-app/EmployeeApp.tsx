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
import { EmployeeBottomNav } from './components/EmployeeBottomNav';
import { EmployeeContextProvider, useEmployeeContext } from './context/EmployeeContext';

function EmployeeAppMain() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const { theme } = useEmployeeContext();
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
        if (emp && emp.badgeNo) {
          const bNo = String(emp.badgeNo).trim();
          const badgeMap: Record<string, { ar: string; en: string }> = {
            '1001': { ar: 'أحمد محمد علي', en: 'Ahmed Mohammed Ali' },
            '1002': { ar: 'فاطمة حسين خليل', en: 'Fatima Hussein Khalil' },
            '1003': { ar: 'علي جاسم كريم', en: 'Ali Jassim Kareem' },
            '1004': { ar: 'مصطفى حسن كاظم', en: 'Mustafa Hassan Kadhim' },
            '1005': { ar: 'زينب عبد الجبار', en: 'Zainab Abdul-Jabbar' },
            '1006': { ar: 'حيدر جاسم الفتلاوي', en: 'Haidar Jassim' },
            '1007': { ar: 'مريم عادل طارق', en: 'Maryam Adel' },
            '1008': { ar: 'عمر فاروق عبد الله', en: 'Omar Farooq' },
          };
          if (badgeMap[bNo]) {
            emp.fullName = badgeMap[bNo].ar;
            emp.fullNameEn = badgeMap[bNo].en;
          }
          // Overwrite stale local storage with correct badge data
          localStorage.setItem('employee_auth', JSON.stringify({
            employee: emp,
            timestamp: new Date().toISOString()
          }));
        }
        setIsAuthenticated(true);
        setCurrentEmployee(emp);
      } catch (error) {
        console.error('Error parsing saved auth:', error);
        localStorage.removeItem('employee_auth');
      }
    }
  }, []);

  const handleLogin = (employeeData: any) => {
    setIsAuthenticated(true);
    setCurrentEmployee(employeeData);
    localStorage.setItem('employee_auth', JSON.stringify({
      employee: employeeData,
      timestamp: new Date().toISOString()
    }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentEmployee(null);
    localStorage.removeItem('employee_auth');
  };

  const isDark = theme === 'dark';

  return (
    <div dir="rtl" className={`min-h-screen w-full flex flex-col items-center justify-center p-0 transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0b1120] text-slate-100' 
        : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Main App Container */}
      <div className={`w-full max-w-md md:max-w-xl h-screen flex flex-col relative overflow-hidden shadow-none md:shadow-2xl md:rounded-3xl md:border ${
        isDark ? 'bg-[#0b1120] text-white border-slate-800' : 'bg-[#f8fafc] text-slate-900 border-slate-200'
      }`}>
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