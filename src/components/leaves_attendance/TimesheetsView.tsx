import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Language, TimesheetSummary } from './types';
import { useApp } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CHF_LOGO_BASE64, VITAS_LOGO_BASE64 } from './timesheetLogos';

interface TimesheetRecord {
  dayName: string;
  date: string;
  isoDate: string;
  dateSerial?: number;
  dayType: string;
  requiredHours: string;
  requiredHoursNum: number;
  firstIn: string;
  lastOut: string;
  lunchBreak: string;
  lunchBreakNum: number;
  annualLeave: string;
  annualLeaveNum: number;
  sickLeave: string;
  sickLeaveNum: number;
  otherLeave: string;
  otherLeaveNum: number;
  otherLeaveType: string;
  outsideOffice: string;
  outsideOfficeNum: number;
  actualHours: string;
  actualHoursNum: number;
  remarks: string;
  overtime?: string;
  isWorkingDay?: boolean;
  isHoliday?: boolean;
}

interface EmployeeTimesheetData {
  code: string;
  name: string;
  position: string;
  dept: string;
  location: string;
  supervisorName: string;
  startDate: string;
  endDate: string;
  records: TimesheetRecord[];
  totals: {
    requiredHours: number;
    actualHours: number;
    lunchBreakHours: number;
    annualLeaveHours: number;
    sickLeaveHours: number;
    otherLeaveHours: number;
    outsideOfficeHours: number;
    absenceHours: number;
    overtimeHours: number;
  };
}

interface TimesheetsViewProps {
  summaries?: TimesheetSummary[];
  periodType?: 'daily' | 'weekly' | 'monthly';
  onPeriodChange?: (p: 'daily' | 'weekly' | 'monthly') => void;
  lang?: Language;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

export const TimesheetsView: React.FC<TimesheetsViewProps> = ({
  summaries = [],
  periodType = 'monthly',
  onPeriodChange,
  lang = 'ar',
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printableSheetRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'form' | 'directory'>('form');
  const [employees, setEmployees] = useState<EmployeeTimesheetData[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [filterText, setFilterText] = useState<string>('');
  const [cyclePeriod, setCyclePeriod] = useState<string>('21-09-2026 To 20-10-2026');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [attendanceExceptions, setAttendanceExceptions] = useState<any[]>([]);

  // Load attendance exceptions from API
  useEffect(() => {
    fetch('/api/attendance-exceptions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAttendanceExceptions(data);
      })
      .catch(() => {});
  }, []);

  // Helper formatting for hh:mm
  const formatHHMM = (val: number) => {
    const hours = Math.floor(val);
    const mins = Math.round((val - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Load bundled official timesheet dataset
  useEffect(() => {
    let isMounted = true;
    const loadDefaultDataset = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/data/timesheet_dataset.json');
        if (!res.ok) {
          throw new Error('Could not load pre-compiled timesheet dataset');
        }
        const data = await res.json();
        if (isMounted && data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
          setCyclePeriod(data.cycle || '21-09-2026 To 20-10-2026');
          // Prefer Basra DCC employee (Adel Abdul Ameer Farhood) matching the official sample
          const target = data.employees.find((e: EmployeeTimesheetData) => e.code.toLowerCase().includes('v152')) || 
                         data.employees.find((e: EmployeeTimesheetData) => e.code.toLowerCase().includes('v144')) || 
                         data.employees[0];
          setSelectedEmpCode(target.code);
        }
      } catch (err) {
        console.warn('Falling back to local data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDefaultDataset();
    return () => { isMounted = false; };
  }, []);

  // Filtered branches list
  const branches = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.location) set.add(e.location);
    });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  // Filtered employees for directory view & dropdown
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchBranch = selectedBranch === 'All' || e.location.toLowerCase() === selectedBranch.toLowerCase();
      if (!matchBranch) return false;
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.dept.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q)
      );
    });
  }, [employees, selectedBranch, filterText]);

  // Selected Employee Data
  const currentEmployee = useMemo(() => {
    return employees.find(e => e.code === selectedEmpCode) || employees[0] || null;
  }, [employees, selectedEmpCode]);

  const activeException = useMemo(() => {
    if (!currentEmployee || !attendanceExceptions.length) return null;
    const c = (currentEmployee.code || '').toLowerCase().trim();
    const n = (currentEmployee.name || '').toLowerCase().trim();
    return attendanceExceptions.find((exc: any) => {
      const empCode = (exc.employee_code || '').toLowerCase().trim();
      const badge = (exc.badge_no || '').toLowerCase().trim();
      const sysId = (exc.system_id || '').toLowerCase().trim();
      const nameAr = (exc.loan_officer_name || '').toLowerCase().trim();
      const nameEn = (exc.name_en || '').toLowerCase().trim();
      return (
        (empCode && (c === empCode || c.includes(empCode) || empCode.includes(c))) ||
        (badge && (c === badge || c.includes(badge) || badge.includes(c))) ||
        (sysId && (c === sysId || c.includes(sysId) || sysId.includes(c))) ||
        (nameAr && (n === nameAr || n.includes(nameAr) || nameAr.includes(n))) ||
        (nameEn && (n === nameEn || n.includes(nameEn) || nameEn.includes(n)))
      );
    });
  }, [currentEmployee, attendanceExceptions]);

  // Formatted Cycle Dates for display (dd/MM/yyyy)
  const formattedStartDate = useMemo(() => {
    const raw = currentEmployee?.startDate || cyclePeriod.split(/to/i)[0]?.trim() || '21-09-2026';
    return raw.replace(/-/g, '/');
  }, [currentEmployee, cyclePeriod]);

  const formattedEndDate = useMemo(() => {
    const raw = currentEmployee?.endDate || cyclePeriod.split(/to/i)[1]?.trim() || '20-10-2026';
    return raw.replace(/-/g, '/');
  }, [currentEmployee, cyclePeriod]);

  // Switch to next / previous employee
  const handleNavEmp = (direction: 'prev' | 'next') => {
    if (filteredEmployees.length === 0) return;
    const currentIndex = filteredEmployees.findIndex(e => e.code === selectedEmpCode);
    if (direction === 'prev') {
      const prevIndex = (currentIndex - 1 + filteredEmployees.length) % filteredEmployees.length;
      setSelectedEmpCode(filteredEmployees[prevIndex].code);
    } else {
      const nextIndex = (currentIndex + 1) % filteredEmployees.length;
      setSelectedEmpCode(filteredEmployees[nextIndex].code);
    }
  };

  // Generate Isolated, 100% Identical HTML document with GRAY lines matching Image 1
  const generateOfficialPrintHTML = (emp: EmployeeTimesheetData) => {
    const recordsRows = emp.records.map((rec) => {
      const isWeekend = rec.dayType.includes('عطلة نهاية الأسبوع');
      const isHoliday = rec.dayType.includes('عطلة') && !isWeekend;
      const reqH = (!isWeekend && !isHoliday && rec.requiredHoursNum > 0) ? rec.requiredHours : '';
      const lunchH = rec.lunchBreakNum > 0 ? rec.lunchBreak : '';
      const annH = rec.annualLeaveNum > 0 ? rec.annualLeave : '';
      const sickH = rec.sickLeaveNum > 0 ? rec.sickLeave : '';
      const othH = rec.otherLeaveNum > 0 ? rec.otherLeave : '';
      const outH = rec.outsideOfficeNum > 0 ? rec.outsideOffice : '';
      const actH = rec.actualHoursNum > 0 ? rec.actualHours : '';

      return `
        <tr style="height: 14px;">
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; white-space: nowrap; font-weight: bold; color: #000000 !important;">${rec.dayName}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important; white-space: nowrap;">${rec.date}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; white-space: nowrap; color: #000000 !important;">${rec.dayType}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${reqH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${rec.firstIn || ''}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${rec.lastOut || ''}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${lunchH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${annH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${sickH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${othH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-size: 8px; overflow: hidden; text-overflow: ellipsis; max-width: 80px; color: #000000 !important;">${rec.otherLeaveType || ''}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${outH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #000000 !important;">${actH}</td>
          <td style="border: 1px solid #71717a; padding: 1px 3px; text-align: right; font-size: 8px; overflow: hidden; text-overflow: ellipsis; max-width: 120px; color: #000000 !important;">${rec.remarks || ''}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>استمارة أوقات العمل الشهرية - ${emp.name}</title>
  <style type="text/css">
    @page {
      size: A4 landscape !important;
      margin: 5mm 6mm !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 285mm;
      margin: 0 auto;
      padding: 0;
      background-color: #ffffff;
      color: #000000 !important;
      font-family: Arial, Tahoma, "Segoe UI", sans-serif;
      font-size: 8.5px;
      line-height: 1.1;
    }
    .page-wrapper {
      width: 100%;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    .logos-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      padding: 0 4px;
    }
    .header-bar {
      background-color: #374151 !important;
      color: #ffffff !important;
      text-align: center;
      padding: 2.5px 0;
      font-weight: bold;
      font-size: 11.5px;
      letter-spacing: 0.5px;
      margin-bottom: 2.5px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #71717a;
      margin-bottom: 2.5px;
      font-size: 8.5px;
    }
    .meta-table td {
      border: 1px solid #71717a;
      padding: 2px 4px;
      color: #000000 !important;
    }
    .meta-table .label {
      font-weight: bold;
      text-align: center;
      background-color: #ffffff;
      color: #000000 !important;
    }
    .meta-table .val {
      text-align: center;
      color: #000000 !important;
      font-weight: bold;
    }
    .meta-table .kpi-label {
      font-weight: bold;
      text-align: center;
      background-color: #ffffff;
      color: #000000 !important;
    }
    .meta-table .kpi-val {
      font-weight: bold;
      font-family: monospace;
      text-align: center;
      color: #000000 !important;
    }
    .main-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #71717a;
      font-size: 8px;
      line-height: 1.05;
    }
    .main-table th {
      background-color: #374151 !important;
      color: #ffffff !important;
      border: 1px solid #71717a;
      padding: 2.5px 2px;
      font-weight: bold;
      text-align: center;
      white-space: nowrap;
    }
    .main-table tfoot td {
      background-color: #ffffff !important;
      border: 1px solid #71717a;
      padding: 2px 3px;
      font-weight: bold;
      font-size: 8.5px;
      text-align: center;
      color: #000000 !important;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      padding: 0 8px;
      font-size: 8.5px;
    }
    .sig-col {
      width: 31%;
    }
    .sig-line {
      display: inline-block;
      border-bottom: 1px solid #000000;
      width: 145px;
      margin-right: 4px;
      vertical-align: bottom;
      text-align: center;
      color: #000000 !important;
      font-weight: bold;
    }
    .sig-row {
      margin-bottom: 3px;
      color: #000000 !important;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <!-- 1. Top Logos -->
    <div class="logos-row">
      <div>
        <img src="${CHF_LOGO_BASE64}" alt="CHF Iraq" style="height: 34px; object-fit: contain;" />
      </div>
      <div>
        <img src="${VITAS_LOGO_BASE64}" alt="VITAS Iraq" style="height: 34px; object-fit: contain;" />
      </div>
    </div>

    <!-- 2. Header Bar -->
    <div class="header-bar" style="color: #ffffff !important;">
      استمارة أوقات العمل الشهرية
    </div>

    <!-- 3. Employee Info & KPI Summary Table -->
    <table class="meta-table">
      <tbody>
        <tr>
          <td class="label" style="width: 18%;">اسم الموظف</td>
          <td class="val" style="width: 32%;">${emp.name}</td>
          <td class="kpi-label" style="width: 35%;">مجموع عدد ساعات العمل المطلوبة</td>
          <td class="kpi-val" style="width: 15%;">${formatHHMM(emp.totals.requiredHours)}</td>
        </tr>
        <tr>
          <td class="label">العنوان الوظيفي</td>
          <td class="val">${emp.position}</td>
          <td class="kpi-label">مجموع عدد ساعات العمل الفعلية</td>
          <td class="kpi-val">${formatHHMM(emp.totals.actualHours)}</td>
        </tr>
        <tr>
          <td class="label">مكان العمل</td>
          <td class="val">${emp.location}</td>
          <td class="kpi-label">مجموع ساعات استراحة الغداء</td>
          <td class="kpi-val">${formatHHMM(emp.totals.lunchBreakHours)}</td>
        </tr>
        <tr>
          <td class="label">رقم الهوية المعرف بالنظام</td>
          <td class="val" style="font-family: monospace;">${emp.code}</td>
          <td class="kpi-label">مجموع ساعات الاجازة السنوية</td>
          <td class="kpi-val">${formatHHMM(emp.totals.annualLeaveHours)}</td>
        </tr>
        <tr>
          <td class="label">تاريخ بداية الفترة</td>
          <td class="val" style="font-family: monospace;">${emp.startDate}</td>
          <td class="kpi-label">مجموع ساعات الاجازة المرضية</td>
          <td class="kpi-val">${formatHHMM(emp.totals.sickLeaveHours)}</td>
        </tr>
        <tr>
          <td class="label">تاريخ نهاية الفترة</td>
          <td class="val" style="font-family: monospace;">${emp.endDate}</td>
          <td class="kpi-label">مجموع ساعات الاجازة الاخرى</td>
          <td class="kpi-val">${formatHHMM(emp.totals.otherLeaveHours)}</td>
        </tr>
        <tr>
          <td colspan="2" style="background: #ffffff; border: 1px solid #71717a;"></td>
          <td class="kpi-label">مجموع ساعات الغياب</td>
          <td class="kpi-val">${formatHHMM(emp.totals.absenceHours)}</td>
        </tr>
      </tbody>
    </table>

    <!-- 4. Main 14-Column Table -->
    <table class="main-table">
      <thead>
        <tr>
          <th style="width: 5%; color: #ffffff !important;">اليوم</th>
          <th style="width: 8%; color: #ffffff !important;">تاريخ اليوم</th>
          <th style="width: 9%; color: #ffffff !important;">النوع</th>
          <th style="width: 6%; color: #ffffff !important;">ساعات العمل المطلوبة</th>
          <th style="width: 6%; color: #ffffff !important;">وقت الدخول الأول</th>
          <th style="width: 6%; color: #ffffff !important;">وقت المغادرة الأخير</th>
          <th style="width: 6%; color: #ffffff !important;">استراحة الغداء</th>
          <th style="width: 6%; color: #ffffff !important;">ساعات إجازة سنوية</th>
          <th style="width: 6%; color: #ffffff !important;">ساعات إجازة مرضية</th>
          <th style="width: 6%; color: #ffffff !important;">ساعات إجازة اخرى</th>
          <th style="width: 7%; color: #ffffff !important;">نوع الإجازات الأخرى</th>
          <th style="width: 7%; color: #ffffff !important;">ساعات عمل خارج المكتب خلال الدوام</th>
          <th style="width: 7%; color: #ffffff !important;">مجموع ساعات العمل الفعلية</th>
          <th style="width: 15%; text-align: right; padding-right: 4px; color: #ffffff !important;">ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${recordsRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="font-size: 9px; font-weight: bold;">المجموع</td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.requiredHours)}</td>
          <td></td>
          <td></td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.lunchBreakHours)}</td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.annualLeaveHours)}</td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.sickLeaveHours)}</td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.otherLeaveHours)}</td>
          <td></td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.outsideOfficeHours)}</td>
          <td style="font-family: monospace; font-weight: bold;">${formatHHMM(emp.totals.actualHours)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- 5. Bottom Signatures -->
    <div class="signatures-row">
      <div class="sig-col">
        <div class="sig-row">
          <b>اسم الموظف:</b>
          <span class="sig-line">${emp.name}</span>
        </div>
        <div class="sig-row">
          <b>توقيع الموظف:</b>
          <span class="sig-line"></span>
        </div>
      </div>

      <div class="sig-col">
        <div class="sig-row">
          <b>اسم المسؤول المباشر:</b>
          <span class="sig-line">${emp.supervisorName || ''}</span>
        </div>
        <div class="sig-row">
          <b>توقيع المسؤول المباشر:</b>
          <span class="sig-line"></span>
        </div>
      </div>

      <div class="sig-col">
        <div class="sig-row">
          <b>اسم موظف الموارد البشرية:</b>
          <span class="sig-line"></span>
        </div>
        <div class="sig-row">
          <b>توقيع موظف الموارد البشرية:</b>
          <span class="sig-line"></span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Dedicated Window Print
  const handlePrintOfficialTimesheet = () => {
    if (!currentEmployee) return;

    const htmlContent = generateOfficialPrintHTML(currentEmployee);
    const printWin = window.open('', '_blank', 'width=1220,height=820');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 400);
    }
  };

  // Pure Vector-Fitted Landscape PDF Download via jsPDF & html2canvas
  const handleDownloadDirectLandscapePDF = async () => {
    if (!printableSheetRef.current || !currentEmployee) return;

    try {
      setIsExportingPdf(true);
      const element = printableSheetRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 5;
      const maxW = pageWidth - (margin * 2); // 287mm
      const maxH = pageHeight - (margin * 2); // 200mm

      let finalW = maxW;
      let finalH = (canvas.height * finalW) / canvas.width;

      if (finalH > maxH) {
        finalH = maxH;
        finalW = (canvas.width * finalH) / canvas.height;
      }

      const posX = margin + (maxW - finalW) / 2;
      const posY = margin + (maxH - finalH) / 2;

      pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH);
      pdf.save(`Timesheet_${currentEmployee.code}_Landscape_A4.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      handlePrintOfficialTimesheet();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Excel with Built-in Landscape A4 Page Setup
  const handleExportFullExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Official Employee Timesheet Form
      if (currentEmployee) {
        const formAoa: any[][] = [
          ['CHF Iraq', '', '', '', '', '', '', '', '', '', '', '', 'VITAS Iraq'],
          ['استمارة أوقات العمل الشهرية'],
          ['اسم الموظف', currentEmployee.name, '', '', 'مجموع عدد ساعات العمل المطلوبة', formatHHMM(currentEmployee.totals.requiredHours)],
          ['العنوان الوظيفي', currentEmployee.position, '', '', 'مجموع عدد ساعات العمل الفعلية', formatHHMM(currentEmployee.totals.actualHours)],
          ['مكان العمل', currentEmployee.location, '', '', 'مجموع ساعات استراحة الغداء', formatHHMM(currentEmployee.totals.lunchBreakHours)],
          ['رقم الهوية المعرف بالنظام', currentEmployee.code, '', '', 'مجموع ساعات الاجازة السنوية', formatHHMM(currentEmployee.totals.annualLeaveHours)],
          ['تاريخ بداية الفترة', currentEmployee.startDate, '', '', 'مجموع ساعات الاجازة المرضية', formatHHMM(currentEmployee.totals.sickLeaveHours)],
          ['تاريخ نهاية الفترة', currentEmployee.endDate, '', '', 'مجموع ساعات الاجازة الاخرى', formatHHMM(currentEmployee.totals.otherLeaveHours)],
          ['', '', '', '', 'مجموع ساعات الغياب', formatHHMM(currentEmployee.totals.absenceHours)],
          [],
          [
            'اليوم', 'تاريخ اليوم', 'النوع', 'ساعات العمل المطلوبة', 'وقت الدخول الأول',
            'وقت المغادرة الأخير', 'استراحة الغداء', 'ساعات إجازة سنوية', 'ساعات إجازة مرضية',
            'ساعات إجازة اخرى', 'نوع الإجازات الأخرى', 'ساعات عمل خارج المكتب خلال الدوام',
            'مجموع ساعات العمل الفعلية', 'ملاحظات'
          ]
        ];

        currentEmployee.records.forEach(rec => {
          formAoa.push([
            rec.dayName,
            rec.date,
            rec.dayType,
            rec.requiredHoursNum > 0 ? rec.requiredHours : '',
            rec.firstIn,
            rec.lastOut,
            rec.lunchBreakNum > 0 ? rec.lunchBreak : '',
            rec.annualLeaveNum > 0 ? rec.annualLeave : '',
            rec.sickLeaveNum > 0 ? rec.sickLeave : '',
            rec.otherLeaveNum > 0 ? rec.otherLeave : '',
            rec.otherLeaveType,
            rec.outsideOfficeNum > 0 ? rec.outsideOffice : '',
            rec.actualHoursNum > 0 ? rec.actualHours : '',
            rec.remarks
          ]);
        });

        // Totals row in Excel
        formAoa.push([
          'المجموع', '', '', formatHHMM(currentEmployee.totals.requiredHours), '', '',
          formatHHMM(currentEmployee.totals.lunchBreakHours),
          formatHHMM(currentEmployee.totals.annualLeaveHours),
          formatHHMM(currentEmployee.totals.sickLeaveHours),
          formatHHMM(currentEmployee.totals.otherLeaveHours),
          '',
          formatHHMM(currentEmployee.totals.outsideOfficeHours),
          formatHHMM(currentEmployee.totals.actualHours),
          ''
        ]);

        // Signatures in Excel
        formAoa.push([]);
        formAoa.push([
          'اسم وتوقيع الموظف:', currentEmployee.name, '', '',
          'اسم وتوقيع المسؤول المباشر:', currentEmployee.supervisorName || '', '', '',
          'اسم وتوقيع موظف الموارد البشرية:'
        ]);

        const wsForm = XLSX.utils.aoa_to_sheet(formAoa);

        wsForm['!pageSetup'] = {
          orientation: 'landscape',
          paperSize: 9, // A4
          fitToWidth: 1,
          fitToHeight: 1,
          scale: 100
        };
        wsForm['!margins'] = { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.2, footer: 0.2 };

        XLSX.utils.book_append_sheet(wb, wsForm, 'استمارة التايمشيت بالعرض');
      }

      // Sheet 2: Consolidated Timesheet Data
      const rows: any[] = [];
      employees.forEach(emp => {
        emp.records.forEach(rec => {
          rows.push({
            'Name': emp.name,
            'Code': emp.code,
            'Date': rec.date,
            'Working': rec.actualHoursNum > 0 || rec.firstIn ? 'Yes' : 'No',
            'Overtime Type': '',
            'Overtime (hh:mm)': rec.overtime || '0:00',
            'Deduction Type': rec.dayType === 'يوم غياب' ? 'يوم غياب' : (rec.remarks || ''),
            'Deduction (hh:mm)': rec.dayType === 'يوم غياب' ? rec.requiredHours : '0:00',
            'Is Holiday': rec.isHoliday ? 'Yes' : 'No',
            'Has Leave': (rec.annualLeaveNum > 0 || rec.sickLeaveNum > 0 || rec.otherLeaveNum > 0) ? 'Yes' : 'No',
            'Leave (hh:mm)': rec.annualLeave !== '00:00' ? rec.annualLeave : (rec.sickLeave !== '00:00' ? rec.sickLeave : rec.otherLeave),
            'IsWorking Day': rec.isWorkingDay ? 'Yes' : 'No',
            'Working (hh:mm)': rec.requiredHours,
            'Actual Working (hh:mm)': rec.actualHours,
            'Approved (hh:mm)': '0:00',
            'Approved Deduction (hh:mm)': '0:00'
          });
        });
      });

      const wsTimesheet = XLSX.utils.json_to_sheet(rows);
      wsTimesheet['!pageSetup'] = {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToWidth: 1,
      };
      XLSX.utils.book_append_sheet(wb, wsTimesheet, 'Timesheet Data');

      // Sheet 3: Reference Lists
      const wsLists = XLSX.utils.json_to_sheet([
        { 'Regular Overtime': 'Ignore', 'يوم راحة استثنائي': 'دوام مخفّض' },
        { 'يوم راحة استثنائي': 'يوم غياب' }
      ]);
      XLSX.utils.book_append_sheet(wb, wsLists, 'Lists');

      XLSX.writeFile(wb, `timesheet_landscape_${cyclePeriod.replace(/\s+/g, '_')}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      const a = document.createElement('a');
      a.href = '/timesheets/timesheet -21-09-2026 To 20-10-2026.xlsx';
      a.download = 'timesheet -21-09-2026 To 20-10-2026.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-6 font-sans" dir="rtl">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={() => {}}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* TOP CONTROLS CARD */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                isDark ? 'bg-teal-500/20 text-white border-teal-500/30' : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}>
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span>استمارة أوقات العمل الشهري للفترة من {formattedStartDate} الى {formattedEndDate}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                {employees.length} موظف مسجل
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              استمارة أوقات العمل الشهرية - تايمشيت الموظفين
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/10 shrink-0">
              <button
                onClick={() => setViewMode('form')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'form'
                    ? 'bg-teal-500 text-white font-bold shadow'
                    : 'text-slate-700 dark:text-slate-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">badge</span>
                <span>استمارة الطباعة</span>
              </button>
              <button
                onClick={() => setViewMode('directory')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'directory'
                    ? 'bg-teal-500 text-white font-bold shadow'
                    : 'text-slate-700 dark:text-slate-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">view_list</span>
                <span>كشف الموظفين</span>
              </button>
            </div>

            {/* Print & Export Actions - Guaranteed same line */}
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              {/* DIRECT LANDSCAPE PDF DOWNLOAD */}
              <button
                onClick={handleDownloadDirectLandscapePDF}
                disabled={isExportingPdf}
                className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer transform active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                <span>{isExportingPdf ? 'جارٍ التحميل...' : 'تحميل PDF'}</span>
              </button>

              {/* EXCEL EXPORT */}
              <button
                onClick={handleExportFullExcel}
                className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">table_chart</span>
                <span>تصدير Excel</span>
              </button>

              {/* BROWSER PRINT BUTTON */}
              <button
                onClick={handlePrintOfficialTimesheet}
                className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer transform active:scale-95 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>طباعة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center gap-3">
          {/* Branch filter */}
          <div className="w-full md:w-48">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              الفرع / المكتب
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {branches.map(b => (
                <option key={b} value={b}>
                  {b === 'All' ? 'جميع الفروع والمكاتب' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Selector for Form View */}
          <div className="w-full md:flex-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              اختيار الموظف لعرض الاستمارة
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavEmp('prev')}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="الموظف السابق"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <select
                value={selectedEmpCode}
                onChange={(e) => {
                  setSelectedEmpCode(e.target.value);
                  setViewMode('form');
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-teal-500"
              >
                {filteredEmployees.map(emp => (
                  <option key={emp.code} value={emp.code}>
                    {emp.name} — ({emp.code}) [{emp.location}]
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleNavEmp('next')}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="الموظف التالي"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="w-full md:w-64">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              بحث بالاسم أو الكود
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="بحث عن موظف..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-white/15 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <span className="material-symbols-outlined absolute right-2 top-2 text-slate-400 text-sm">search</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ON-SCREEN PREVIEW CONTAINER: EXACT REPLICA OF IMAGE 1 (GRAY BORDERS)     */}
      {/* ========================================================================= */}
      {viewMode === 'form' && currentEmployee && (
        <div className="flex flex-col items-center overflow-x-auto pb-8">
          {activeException && (
            <div className="w-[1100px] min-w-[1100px] mb-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-500 text-2xl">verified_user</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm">يخضع هذا الموظف لاستثناء رسمي معتمد في نظام التايمشيت:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono font-bold">
                      Badge: {activeException.badge_no}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    <span className="font-semibold">القاعدة لنظام تايم شيت:</span> {activeException.timesheet_rule || 'خاضع لسياسة الاستثناء'}
                    {activeException.reason && <span className="opacity-80"> | السبب: {activeException.reason}</span>}
                  </p>
                </div>
              </div>
              {activeException.arrival_time && (
                <div className="text-left rtl:text-right">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">وقت الحضور المقرر:</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{activeException.arrival_time}</span>
                </div>
              )}
            </div>
          )}
          <div 
            ref={printableSheetRef}
            className="w-[1100px] min-w-[1100px] bg-white text-black p-4 rounded-none shadow-2xl box-border"
          >
            {/* 1. Logos Row: CHF Iraq (Left) & VITAS (Right) */}
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="w-48 flex items-center justify-start">
                <img
                  src={CHF_LOGO_BASE64}
                  alt="CHF Iraq"
                  className="h-10 object-contain"
                />
              </div>

              <div className="w-48 flex items-center justify-end">
                <img
                  src={VITAS_LOGO_BASE64}
                  alt="VITAS Iraq"
                  className="h-10 object-contain"
                />
              </div>
            </div>

            {/* 2. Header Bar: Dark Charcoal */}
            <div className="bg-[#374151] text-white text-center py-1.5 font-bold text-xs tracking-wider mb-1">
              استمارة أوقات العمل الشهرية
            </div>

            {/* 3. Employee Info & KPI Summary Table (Gray Borders) */}
            <table className="w-full text-[9.5px] border-collapse border border-slate-500 mb-1">
              <tbody>
                <tr className="border-b border-slate-400">
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black w-[18%]">
                    اسم الموظف
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center w-[32%] truncate font-bold text-black">
                    {currentEmployee.name}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black w-[35%]">
                    مجموع عدد ساعات العمل المطلوبة
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black w-[15%]">
                    {formatHHMM(currentEmployee.totals.requiredHours)}
                  </td>
                </tr>

                <tr className="border-b border-slate-400">
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    العنوان الوظيفي
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center truncate font-bold text-black">
                    {currentEmployee.position}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مجموع عدد ساعات العمل الفعلية
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black">
                    {formatHHMM(currentEmployee.totals.actualHours)}
                  </td>
                </tr>

                <tr className="border-b border-slate-400">
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مكان العمل
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold text-black">
                    {currentEmployee.location}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مجموع ساعات استراحة الغداء
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black">
                    {formatHHMM(currentEmployee.totals.lunchBreakHours)}
                  </td>
                </tr>

                <tr className="border-b border-slate-400">
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    رقم الهوية المعرف بالنظام
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-mono font-bold text-black">
                    {currentEmployee.code}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مجموع ساعات الاجازة السنوية
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black">
                    {formatHHMM(currentEmployee.totals.annualLeaveHours)}
                  </td>
                </tr>

                <tr className="border-b border-slate-400">
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    تاريخ بداية الفترة
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-mono font-bold text-black">
                    {currentEmployee.startDate}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مجموع ساعات الاجازة المرضية
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black">
                    {formatHHMM(currentEmployee.totals.sickLeaveHours)}
                  </td>
                </tr>

                <tr className="border-b border-slate-400">
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    تاريخ نهاية الفترة
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-mono font-bold text-black">
                    {currentEmployee.endDate}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مجموع ساعات الاجازة الاخرى
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black">
                    {formatHHMM(currentEmployee.totals.otherLeaveHours)}
                  </td>
                </tr>

                <tr>
                  <td colSpan={2} className="border-r border-slate-400 py-1 px-2 bg-white"></td>
                  <td className="border-r border-slate-400 py-1 px-2 text-center font-bold bg-white text-black">
                    مجموع ساعات الغياب
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-bold text-black">
                    {formatHHMM(currentEmployee.totals.absenceHours)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. Main 14-Column Table (Gray Borders) */}
            <table className="w-full text-[8.5px] text-center border-collapse border border-slate-500 mb-2 leading-none">
              <thead>
                <tr className="bg-[#374151] text-white font-bold border-b border-slate-500">
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[5%] whitespace-nowrap">اليوم</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[8%] whitespace-nowrap">تاريخ اليوم</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[9%] whitespace-nowrap">النوع</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">ساعات العمل المطلوبة</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">وقت الدخول الأول</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">وقت المغادرة الأخير</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">استراحة الغداء</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">ساعات إجازة سنوية</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">ساعات إجازة مرضية</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[6%] whitespace-nowrap">ساعات إجازة اخرى</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[7%] whitespace-nowrap">نوع الإجازات الأخرى</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[7%] whitespace-nowrap">ساعات عمل خارج المكتب خلال الدوام</th>
                  <th className="py-1.5 px-1 border-r border-slate-400 w-[7%] whitespace-nowrap">مجموع ساعات العمل الفعلية</th>
                  <th className="py-1.5 px-2 w-[15%] text-right whitespace-nowrap">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {currentEmployee.records.map((rec, idx) => {
                  const isWeekend = rec.dayType.includes('عطلة نهاية الأسبوع');
                  const isHoliday = rec.dayType.includes('عطلة') && !isWeekend;

                  return (
                    <tr key={idx} className="border-b border-slate-400 h-[14px]">
                      <td className="border-r border-slate-400 py-0.5 px-1 font-bold text-black whitespace-nowrap">{rec.dayName}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black whitespace-nowrap">{rec.date}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 text-black whitespace-nowrap">{rec.dayType}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">
                        {(!isWeekend && !isHoliday && rec.requiredHoursNum > 0) ? rec.requiredHours : ''}
                      </td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">{rec.firstIn || ''}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">{rec.lastOut || ''}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">{rec.lunchBreakNum > 0 ? rec.lunchBreak : ''}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">{rec.annualLeaveNum > 0 ? rec.annualLeave : ''}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">{rec.sickLeaveNum > 0 ? rec.sickLeave : ''}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">{rec.otherLeaveNum > 0 ? rec.otherLeave : ''}</td>
                      <td className="border-r border-slate-400 py-0.5 px-1 text-[8px] truncate max-w-[80px] text-black" title={rec.otherLeaveType}>
                        {rec.otherLeaveType || ''}
                      </td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">
                        {rec.outsideOfficeNum > 0 ? rec.outsideOffice : ''}
                      </td>
                      <td className="border-r border-slate-400 py-0.5 px-1 font-mono font-bold text-black">
                        {rec.actualHoursNum > 0 ? rec.actualHours : ''}
                      </td>
                      <td className="py-0.5 px-2 text-right text-[8px] truncate max-w-[120px] text-black" title={rec.remarks}>
                        {rec.remarks || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Row */}
              <tfoot>
                <tr className="bg-white text-black font-bold border-t-2 border-slate-500">
                  <td colSpan={3} className="border-r border-slate-400 py-1 px-2 text-center font-bold text-[9px] text-black">
                    المجموع
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.requiredHours)}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1"></td>
                  <td className="border-r border-slate-400 py-1 px-1"></td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.lunchBreakHours)}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.annualLeaveHours)}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.sickLeaveHours)}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.otherLeaveHours)}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1"></td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.outsideOfficeHours)}
                  </td>
                  <td className="border-r border-slate-400 py-1 px-1 font-mono font-bold text-black text-center">
                    {formatHHMM(currentEmployee.totals.actualHours)}
                  </td>
                  <td className="py-1 px-2"></td>
                </tr>
              </tfoot>
            </table>

            {/* 5. Signatures Block */}
            <div className="mt-3 pt-1">
              <div className="grid grid-cols-3 gap-6 text-[9.5px] text-black">
                {/* Right: Employee */}
                <div className="space-y-2">
                  <div>
                    <span className="font-bold text-black">اسم الموظف: </span>
                    <span className="inline-block border-b border-black w-48 text-center pb-0.5 text-black font-bold">
                      {currentEmployee.name}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-black">توقيع الموظف: </span>
                    <span className="inline-block border-b border-black w-48 pb-0.5"></span>
                  </div>
                </div>

                {/* Center: Supervisor */}
                <div className="space-y-2">
                  <div>
                    <span className="font-bold text-black">اسم المسؤول المباشر: </span>
                    <span className="inline-block border-b border-black w-48 text-center pb-0.5 text-black font-bold">
                      {currentEmployee.supervisorName || ''}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-black">توقيع المسؤول المباشر: </span>
                    <span className="inline-block border-b border-black w-48 pb-0.5"></span>
                  </div>
                </div>

                {/* Left: HR */}
                <div className="space-y-2">
                  <div>
                    <span className="font-bold text-black">اسم موظف الموارد البشرية: </span>
                    <span className="inline-block border-b border-black w-44 pb-0.5"></span>
                  </div>
                  <div>
                    <span className="font-bold text-black">توقيع موظف الموارد البشرية: </span>
                    <span className="inline-block border-b border-black w-44 pb-0.5"></span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODE 2: DIRECTORY */}
      {viewMode === 'directory' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500 text-lg">fact_check</span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  سجل التايمشيت العام لجميع الموظفين
                </span>
                <span className="text-xs text-slate-400">
                  ({filteredEmployees.length} موظف مطابق)
                </span>
              </div>
              <button
                onClick={handleExportFullExcel}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">download</span>
                <span>تحميل الشيت كاملاً (XLSX)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                    <th className="p-3 text-start">#</th>
                    <th className="p-3 text-start">كود الموظف</th>
                    <th className="p-3 text-start">اسم الموظف</th>
                    <th className="p-3 text-start">الموقع / الفرع</th>
                    <th className="p-3 text-start">القسم والوظيفة</th>
                    <th className="p-3 text-start">المطلوبة</th>
                    <th className="p-3 text-start">الفعلية</th>
                    <th className="p-3 text-start">الإجازات</th>
                    <th className="p-3 text-start">الغياب</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredEmployees.slice(0, 100).map((emp, idx) => (
                    <tr 
                      key={emp.code}
                      onClick={() => {
                        setSelectedEmpCode(emp.code);
                        setViewMode('form');
                      }}
                      className={`hover:bg-teal-50/40 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        selectedEmpCode === emp.code ? 'bg-teal-50/70 dark:bg-teal-950/30' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{emp.code}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{emp.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          {emp.location}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[180px]">
                        {emp.position}
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {formatHHMM(emp.totals.requiredHours)}
                      </td>
                      <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {formatHHMM(emp.totals.actualHours)}
                      </td>
                      <td className="p-3 font-mono text-blue-600 dark:text-blue-400">
                        {formatHHMM(emp.totals.annualLeaveHours + emp.totals.sickLeaveHours + emp.totals.otherLeaveHours)}
                      </td>
                      <td className="p-3 font-mono text-rose-600 dark:text-rose-400">
                        {formatHHMM(emp.totals.absenceHours)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmpCode(emp.code);
                            setViewMode('form');
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 cursor-pointer"
                        >
                          عرض الاستمارة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
