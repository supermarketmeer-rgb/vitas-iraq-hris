import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { leavesApi } from '../components/leaves_attendance/api';
import {
  AttendanceRecord,
  AttendanceCorrectionRequest,
  BiometricServerSettings,
  CurrentUser,
  DashboardStats,
  EmployeeSchedule,
  Language,
  LeaveBalance,
  LeaveRequest,
  PublicHoliday,
  RawAttendanceLog,
} from '../components/leaves_attendance/types';

import { DashboardView } from '../components/leaves_attendance/DashboardView';
import { AttendanceView } from '../components/leaves_attendance/AttendanceView';
import { TimesheetsView } from '../components/leaves_attendance/TimesheetsView';
import { LeaveDirectoryView } from '../components/leaves_attendance/LeaveDirectoryView';
import { MyScheduleView } from '../components/leaves_attendance/MyScheduleView';
import { ManagerApprovalCenter } from '../components/leaves_attendance/ManagerApprovalCenter';
import { BiometricSettingsView } from '../components/leaves_attendance/BiometricSettingsView';

import { LeaveApplyModal } from '../components/leaves_attendance/LeaveApplyModal';
import { AttendanceCorrectionModal } from '../components/leaves_attendance/AttendanceCorrectionModal';
import { PunchDetailsModal } from '../components/leaves_attendance/PunchDetailsModal';
import { LeaveDetailsModal } from '../components/leaves_attendance/LeaveDetailsModal';
import { DatabaseInspectorModal } from '../components/leaves_attendance/DatabaseInspectorModal';
import { ExportReportModal } from '../components/leaves_attendance/ExportReportModal';

export const Category4LeaveView: React.FC = () => {
  const { activeModuleId, setActiveModuleId, language, employees, appSettings, currentUser: appUser, currentUserRole } = useApp();
  const lang: Language = (language === 'en' ? 'en' : 'ar') as Language;

  const isEmployeeRole = currentUserRole === 'Employee' || appUser?.role === 'Employee';

  const matchesCurrentEmployee = (item: any) => {
    if (!isEmployeeRole || !appUser) return true;
    const curEmpCode = (appUser.employeeId || appUser.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const recEmpCode = (item.employee_number || item.employee_id || item.employeeId || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const curName = (appUser.name || '').toLowerCase();
    const nameAr = (item.employee_name_ar || item.name_ar || '').toLowerCase();
    const nameEn = (item.employee_name_en || item.name_en || '').toLowerCase();

    if (curEmpCode && recEmpCode && (curEmpCode === recEmpCode || curEmpCode.includes(recEmpCode) || recEmpCode.includes(curEmpCode))) return true;
    if (curName && (nameAr.includes(curName) || nameEn.includes(curName) || curName.includes(nameAr))) return true;
    return false;
  };

  // Data state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [schedule, setSchedule] = useState<EmployeeSchedule | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [biometricSettings, setBiometricSettings] = useState<BiometricServerSettings | null>(null);
  const [rawLogs, setRawLogs] = useState<RawAttendanceLog[]>([]);

  // UI Modals state
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);
  const [selectedRecordForPunches, setSelectedRecordForPunches] = useState<AttendanceRecord | null>(null);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<LeaveRequest | null>(null);
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);

  // Syncing & Loading state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Initial load
  const loadData = async () => {
    try {
      if (employees && employees.length > 0) {
        leavesApi.syncWithAppEmployees(employees, appSettings);
      }

      const userRes = await leavesApi.getCurrentUser();
      if (userRes.data) setCurrentUser(userRes.data);

      const statsRes = await leavesApi.getDashboardStats();
      if (statsRes.data) setStats(statsRes.data);

      const attRes = await leavesApi.getAttendanceRecords();
      if (attRes.data) {
        const filtered = isEmployeeRole ? attRes.data.filter(matchesCurrentEmployee) : attRes.data;
        setAttendanceRecords(filtered.length > 0 ? filtered : attRes.data.slice(0, 1));
      }

      const reqsRes = await leavesApi.getLeaveRequests();
      if (reqsRes.data) {
        const filteredReqs = isEmployeeRole ? reqsRes.data.filter(matchesCurrentEmployee) : reqsRes.data;
        setLeaveRequests(filteredReqs);
      }

      const pLeavesRes = await leavesApi.getPendingLeaves();
      if (pLeavesRes.data) {
        const filteredP = isEmployeeRole ? pLeavesRes.data.filter(matchesCurrentEmployee) : pLeavesRes.data;
        setPendingLeaves(filteredP);
      }

      const pCorrRes = await leavesApi.getPendingCorrections();
      if (pCorrRes.data) setPendingCorrections(pCorrRes.data);

      const schedRes = await leavesApi.getMySchedule();
      if (schedRes.data) setSchedule(schedRes.data);

      const holRes = await leavesApi.getPublicHolidays();
      if (holRes.data) setPublicHolidays(holRes.data);

      const bioRes = await leavesApi.getBiometricSettings();
      if (bioRes.data) setBiometricSettings(bioRes.data);

      const rawRes = await leavesApi.getRawAttendanceLogs();
      if (rawRes.data) {
        const filteredRaw = isEmployeeRole ? rawRes.data.filter(matchesCurrentEmployee) : rawRes.data;
        setRawLogs(filteredRaw.length > 0 ? filteredRaw : rawRes.data.slice(0, 2));
      }
    } catch (e) {
      console.error('Failed to load leave data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [employees, appSettings, currentUserRole, appUser]);

  // Sync action
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await leavesApi.triggerBiometricSync();
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  // Reprocess action
  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      await leavesApi.reprocessAttendance();
      await loadData();
    } finally {
      setIsReprocessing(false);
    }
  };

  // Submit Leave Request
  const handleSubmitLeave = async (data: any) => {
    await leavesApi.submitLeaveRequest(data);
    await loadData();
    setIsApplyLeaveOpen(false);
  };

  // Submit Attendance Correction
  const handleSubmitCorrection = async (data: any) => {
    await leavesApi.submitAttendanceCorrection(data);
    await loadData();
    setIsCorrectionOpen(false);
  };

  // Manager Actions
  const handleManagerAction = async (payload: any) => {
    await leavesApi.takeManagerAction(payload);
    await loadData();
  };

  // Save Biometric Settings
  const handleSaveSettings = async (settings: Partial<BiometricServerSettings>) => {
    await leavesApi.updateBiometricSettings(settings);
    await loadData();
  };

  // Test Connection
  const handleTestConnection = async (params: any) => {
    const res = await leavesApi.testBiometricConnection(params);
    return res.data;
  };

  // Simulate Punch
  const handleSimulatePunch = async (employeeId: number, punchType: string, verifyMode: string) => {
    await leavesApi.simulatePunch({ employee_id: employeeId, punch_type: punchType, verify_mode: verifyMode });
    await loadData();
  };

  if (!currentUser || !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-teal-500">
        <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Dynamic Module Sub-view */}
      {(activeModuleId === 'leave-dashboard' || activeModuleId === 'cat-4-leave' || activeModuleId === 'leave-dash' || !activeModuleId) && (
        <DashboardView
          stats={stats}
          currentUser={currentUser}
          lang={lang}
          onNavigate={(tab) => setActiveModuleId(tab)}
          onSyncNow={handleSyncNow}
          isSyncing={isSyncing}
          onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
          onOpenCorrection={() => {
            setSelectedRecordForCorrection(null);
            setIsCorrectionOpen(true);
          }}
          onSimulatePunch={(type, mode) => handleSimulatePunch(currentUser.id, type, mode)}
          onOpenExportReport={() => setIsExportReportOpen(true)}
          onOpenDbInspector={() => setIsDbInspectorOpen(true)}
        />
      )}

      {(activeModuleId === 'leave-attendance' || activeModuleId === 'attendance-system') && (
        <AttendanceView
          records={attendanceRecords}
          lang={lang}
          onViewPunches={(rec) => setSelectedRecordForPunches(rec)}
          onCorrectPunch={(rec) => {
            setSelectedRecordForCorrection(rec);
            setIsCorrectionOpen(true);
          }}
          onReprocess={handleReprocess}
          isReprocessing={isReprocessing}
          onExportExcel={() => setIsExportReportOpen(true)}
          onExportPdf={() => setIsExportReportOpen(true)}
        />
      )}

      {(activeModuleId === 'leave-timesheets' || activeModuleId === 'timesheet') && (
        <TimesheetsView
          summaries={attendanceRecords.map((r) => ({
            id: r.id,
            employee_number: r.employee_number,
            employee_name_ar: r.employee_name_ar,
            employee_name_en: r.employee_name_en,
            department_name_ar: r.department_name_ar,
            department_name_en: r.department_name_en,
            period_type: periodType,
            scheduled_hours: 8,
            worked_hours: Number((r.worked_minutes / 60).toFixed(1)),
            break_hours: 0.75,
            late_minutes: r.late_minutes,
            overtime_hours: Number((r.overtime_minutes / 60).toFixed(1)),
            leave_hours: r.status === 'on_leave' ? 8 : 0,
            status: r.status,
            is_payroll_ready: true,
          }))}
          periodType={periodType}
          onPeriodChange={(p) => setPeriodType(p)}
          lang={lang}
          onExportExcel={() => setIsExportReportOpen(true)}
          onExportPdf={() => setIsExportReportOpen(true)}
        />
      )}

      {activeModuleId === 'leave-apply' && (
        <div className="w-full space-y-4">
          <button
            onClick={() => setIsApplyLeaveOpen(true)}
            className="w-full py-4 rounded-3xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">edit_calendar</span>
            <span>{lang === 'ar' ? 'فتح نموذج طلب إجازة جديدة' : 'Open Leave Request Form'}</span>
          </button>
          <LeaveDirectoryView
            requests={leaveRequests}
            lang={lang}
            onOpenApply={() => setIsApplyLeaveOpen(true)}
            onViewDetails={(req) => setSelectedLeaveDetails(req)}
            onCancelRequest={async (id) => {
              await leavesApi.cancelLeaveRequest(id);
              await loadData();
            }}
            onExportExcel={() => setIsExportReportOpen(true)}
          />
        </div>
      )}

      {activeModuleId === 'leave-directory' && (
        <LeaveDirectoryView
          requests={leaveRequests}
          lang={lang}
          onOpenApply={() => setIsApplyLeaveOpen(true)}
          onViewDetails={(req) => setSelectedLeaveDetails(req)}
          onCancelRequest={async (id) => {
            await leavesApi.cancelLeaveRequest(id);
            await loadData();
          }}
          onExportExcel={() => setIsExportReportOpen(true)}
        />
      )}

      {activeModuleId === 'leave-schedule' && (
        <MyScheduleView schedule={schedule} publicHolidays={publicHolidays} lang={lang} />
      )}

      {activeModuleId === 'leave-approvals' && (
        <ManagerApprovalCenter
          pendingLeaves={pendingLeaves}
          pendingCorrections={pendingCorrections}
          lang={lang}
          onTakeAction={handleManagerAction}
        />
      )}

      {activeModuleId === 'leave-biometric-settings' && (
        <BiometricSettingsView
          settings={biometricSettings || {
            server_name: 'MSSQL-SERVER',
            host: '192.168.1.100',
            port: 1433,
            connection_type: 'sqlserver',
            db_name: 'BioStar_Vitas_Logs',
            username: 'biometric_sync_user',
            auto_sync_interval_mins: 15,
            is_active: true,
          }}
          rawLogs={rawLogs}
          lang={lang}
          employees={employees}
          onSaveSettings={handleSaveSettings}
          onTestConnection={handleTestConnection}
          onSimulatePunch={handleSimulatePunch}
          onSyncNow={handleSyncNow}
          isSyncing={isSyncing}
        />
      )}

      {activeModuleId === 'leave-db-schema' && (
        <DatabaseInspectorModal lang={lang} onClose={() => setActiveModuleId('leave-dashboard')} />
      )}

      {/* MODALS */}
      {isApplyLeaveOpen && (
        <LeaveApplyModal
          leaveBalances={stats.my_leave_balances}
          lang={lang}
          onClose={() => setIsApplyLeaveOpen(false)}
          onSubmit={handleSubmitLeave}
        />
      )}

      {isCorrectionOpen && (
        <AttendanceCorrectionModal
          record={selectedRecordForCorrection}
          lang={lang}
          onClose={() => setIsCorrectionOpen(false)}
          onSubmit={handleSubmitCorrection}
        />
      )}

      {selectedRecordForPunches && (
        <PunchDetailsModal
          record={selectedRecordForPunches}
          punches={[
            { id: 1, punch_time: selectedRecordForPunches.first_punch || '08:05:00', punch_type: 'check_in', verify_mode: 'fingerprint' },
            { id: 2, punch_time: selectedRecordForPunches.last_punch || '16:02:00', punch_type: 'check_out', verify_mode: 'fingerprint' },
          ]}
          lang={lang}
          onClose={() => setSelectedRecordForPunches(null)}
          onOpenCorrection={() => {
            setSelectedRecordForCorrection(selectedRecordForPunches);
            setSelectedRecordForPunches(null);
            setIsCorrectionOpen(true);
          }}
        />
      )}

      {selectedLeaveDetails && (
        <LeaveDetailsModal
          request={selectedLeaveDetails}
          lang={lang}
          onClose={() => setSelectedLeaveDetails(null)}
          onCancelRequest={async (id) => {
            await leavesApi.cancelLeaveRequest(id);
            await loadData();
          }}
        />
      )}

      {isDbInspectorOpen && (
        <DatabaseInspectorModal lang={lang} onClose={() => setIsDbInspectorOpen(false)} />
      )}

      {isExportReportOpen && (
        <ExportReportModal records={attendanceRecords} lang={lang} onClose={() => setIsExportReportOpen(false)} />
      )}
    </div>
  );
};
