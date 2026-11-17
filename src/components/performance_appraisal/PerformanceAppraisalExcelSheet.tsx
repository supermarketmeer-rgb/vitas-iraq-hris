import React, { useState, useMemo, useEffect } from 'react';
import { 
  PERFORMANCE_APPRAISAL_TEMPLATES, 
  PerformanceAppraisalTemplate,
  getFormattedAppraisalTitles
} from '../../data/performanceAppraisalTemplates';
import ExcelJS from 'exceljs';

interface PerformanceAppraisalExcelSheetProps {
  initialTemplateId?: string;
  selectedEmployee?: any;
  employees?: any[];
  evaluationYear?: number | string;
  initialScores?: Record<string, { emp: number; mgr: number }>;
  initialGoals?: Array<{ goal: string; weight: number; party: string }>;
  initialTrainings?: Array<{ title: string; type: string; party: string }>;
  initialContractDecision?: 'renew' | 'terminate' | null;
  initialRecommendations?: string;
  onScoresChange?: (scores: Record<string, { emp: number; mgr: number }>) => void;
  language?: string;
  onClose?: () => void;
}

const extractEmployeeData = (emp: any, allEmps: any[] = []) => {
  if (!emp) return { name: '', pos: '', start: '', br: '', sup: '' };
  const name = emp.fullNameAr || emp.fullName || emp.full_name_ar || emp.name || emp.name_ar || emp.full_name_en || '';
  const pos = emp.jobTitle || emp.position_ar || emp.position || emp.job_title || emp.position_title || emp.position_en || '';
  
  const rawDate = emp.contractStartDate || emp.hireDate || emp.original_start_date || emp.contract_original_start || emp.hire_date || emp.contract_start_date || emp.startDate || emp.start_date || '';
  const start = rawDate ? String(rawDate).split('T')[0] : '';
  
  const br = emp.branch || emp.location_ar || emp.location || emp.office_name || '';
  
  let sup = emp.supervisorName || emp.supervisor_name || emp.supervisor || emp.manager || emp.direct_manager || '';
  if (!sup && Array.isArray(allEmps) && allEmps.length > 0 && br) {
    const mgr = allEmps.find(e => 
      (e.branch === br || e.location_ar === br || e.location === br) &&
      (String(e.jobTitle || e.position || e.position_ar || '').includes('مدير') || String(e.jobTitle || e.position || '').toLowerCase().includes('manager')) &&
      String(e.id) !== String(emp.id)
    );
    if (mgr) {
      sup = `${mgr.fullName || mgr.fullNameAr || mgr.name} (${mgr.jobTitle || mgr.position || 'مدير الفرع'})`;
    }
  }
  return { name, pos, start, br, sup };
};

export const PerformanceAppraisalExcelSheet: React.FC<PerformanceAppraisalExcelSheetProps> = ({
  initialTemplateId = 'pa-staff',
  selectedEmployee,
  employees = [],
  evaluationYear = 2026,
  initialScores,
  initialGoals,
  initialTrainings,
  initialContractDecision,
  initialRecommendations,
  onScoresChange,
  language = 'ar',
  onClose
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    return String(selectedEmployee?.id || selectedEmployee?.employeeId || selectedEmployee?.employee_id || '');
  });
  const [evalYear, setEvalYear] = useState<number>(() => {
    const parsed = typeof evaluationYear === 'number' ? evaluationYear : parseInt(String(evaluationYear).replace(/\D/g, ''), 10);
    return parsed || 2026;
  });

  useEffect(() => {
    if (evaluationYear) {
      const parsed = typeof evaluationYear === 'number' ? evaluationYear : parseInt(String(evaluationYear).replace(/\D/g, ''), 10);
      if (parsed) setEvalYear(parsed);
    }
  }, [evaluationYear]);

  // Active template
  const currentTemplate = useMemo(() => {
    return PERFORMANCE_APPRAISAL_TEMPLATES.find(t => t.id === selectedTemplateId) || PERFORMANCE_APPRAISAL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Dynamic formatted titles based on evaluation year
  const dynamicTitles = useMemo(() => {
    return getFormattedAppraisalTitles(currentTemplate, evalYear);
  }, [currentTemplate, evalYear]);

  // Employee Header fields auto-extracted from selectedEmployee
  const initialEmpInfo = useMemo(() => extractEmployeeData(selectedEmployee, employees), [selectedEmployee, employees]);

  const [employeeName, setEmployeeName] = useState<string>(initialEmpInfo.name);
  const [position, setPosition] = useState<string>(initialEmpInfo.pos);
  const [startDate, setStartDate] = useState<string>(initialEmpInfo.start);
  const [branch, setBranch] = useState<string>(initialEmpInfo.br);
  const [supervisorName, setSupervisorName] = useState<string>(initialEmpInfo.sup);

  // Sync when selectedEmployee prop updates
  useEffect(() => {
    if (selectedEmployee) {
      const info = extractEmployeeData(selectedEmployee, employees);
      setEmployeeName(info.name);
      setPosition(info.pos);
      setStartDate(info.start);
      setBranch(info.br);
      setSupervisorName(info.sup);
      setSelectedEmpId(String(selectedEmployee.id || selectedEmployee.employeeId || selectedEmployee.employee_id || ''));
    }
  }, [selectedEmployee, employees]);

  // Scores state: key = `${sectionIndex}_${itemIndex}`, value = { emp: number, mgr: number }
  const [scores, setScores] = useState<Record<string, { emp: number; mgr: number }>>(initialScores || {});

  useEffect(() => {
    if (initialScores && Object.keys(initialScores).length > 0) {
      setScores(initialScores);
    }
  }, [initialScores]);

  // Contract recommendation
  const [contractDecision, setContractDecision] = useState<'renew' | 'terminate' | null>(initialContractDecision || 'renew');

  useEffect(() => {
    if (initialContractDecision) {
      setContractDecision(initialContractDecision);
    }
  }, [initialContractDecision]);

  // Goals
  const [goals, setGoals] = useState<Array<{ goal: string; weight: number; party: string }>>(
    initialGoals && initialGoals.length > 0
      ? initialGoals
      : [
          { goal: '', weight: 0, party: 'الموظف:' },
          { goal: '', weight: 0, party: 'المشرف المباشر:' },
          { goal: '', weight: 0, party: 'الموظف:' },
          { goal: '', weight: 0, party: 'المشرف المباشر:' }
        ]
  );

  useEffect(() => {
    if (initialGoals && initialGoals.length > 0) {
      setGoals(initialGoals);
    }
  }, [initialGoals]);

  // Trainings
  const [trainings, setTrainings] = useState<Array<{ title: string; type: string; party: string }>>(
    initialTrainings && initialTrainings.length > 0
      ? initialTrainings
      : [
          { title: '', type: 'له علاقة بالعمل', party: 'الموظف:' },
          { title: '', type: 'له علاقة بالمهارات', party: 'المشرف المباشر:' },
          { title: '', type: 'له علاقة بالمسار الوظيفي', party: 'الموظف:' },
          { title: '', type: 'له علاقة بالعمل', party: 'المشرف المباشر:' }
        ]
  );

  useEffect(() => {
    if (initialTrainings && initialTrainings.length > 0) {
      setTrainings(initialTrainings);
    }
  }, [initialTrainings]);

  // Supervisor Recommendations
  const [recommendations, setRecommendations] = useState<string>(initialRecommendations || '');

  useEffect(() => {
    if (initialRecommendations) {
      setRecommendations(initialRecommendations);
    }
  }, [initialRecommendations]);

  // Signatures
  const [empSignatureDate, setEmpSignatureDate] = useState<string>('');
  const [supSignatureDate, setSupSignatureDate] = useState<string>('');
  const [hrSignatureDate, setHrSignatureDate] = useState<string>('');

  // Handle employee selection from dropdown
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    if (!empId) return;
    const emp = employees.find(e => String(e.id) === String(empId) || String(e.employeeId) === String(empId) || String(e.employee_id) === String(empId));
    if (emp) {
      const info = extractEmployeeData(emp, employees);
      setEmployeeName(info.name);
      setPosition(info.pos);
      setStartDate(info.start);
      setBranch(info.br);
      setSupervisorName(info.sup);
    }
  };

  // Score updater
  const updateScore = (secIdx: number, itemIdx: number, role: 'emp' | 'mgr', val: number) => {
    const key = `${secIdx}_${itemIdx}`;
    setScores(prev => {
      const next = {
        ...prev,
        [key]: {
          emp: role === 'emp' ? val : (prev[key]?.emp || 0),
          mgr: role === 'mgr' ? val : (prev[key]?.mgr || 0)
        }
      };
      onScoresChange?.(next);
      return next;
    });
  };

  // Compute Section Scores & Totals
  const { sectionResults, totalEmpScore, totalMgrScore, finalOverallRating } = useMemo(() => {
    const secResults: Array<{
      avgEmp: number;
      avgMgr: number;
      pctEmp: number;
      pctMgr: number;
      count: number;
    }> = [];

    currentTemplate.sections.forEach((sec, sIdx) => {
      let sumEmp = 0;
      let sumMgr = 0;
      let count = sec.items.length;

      sec.items.forEach((_, iIdx) => {
        const sc = scores[`${sIdx}_${iIdx}`] || { emp: 0, mgr: 0 };
        sumEmp += Number(sc.emp || 0);
        sumMgr += Number(sc.mgr || 0);
      });

      const avgEmp = count > 0 ? sumEmp / count : 0;
      const avgMgr = count > 0 ? sumMgr / count : 0;
      // In Excel: score out of 5 converted to percentage
      const pctEmp = (avgEmp / 5) * 100;
      const pctMgr = (avgMgr / 5) * 100;

      secResults.push({ avgEmp, avgMgr, pctEmp, pctMgr, count });
    });

    let overallMgr = 0;
    let overallEmp = 0;

    if (currentTemplate.scoringType === 'cleaner') {
      // 21 items total
      const s0 = secResults[0] || { pctEmp: 0, pctMgr: 0 };
      overallEmp = s0.pctEmp;
      overallMgr = s0.pctMgr;
    } else if (currentTemplate.scoringType === 'team_leaders') {
      const s0 = secResults[0] || { pctEmp: 0, pctMgr: 0 };
      const s1 = secResults[1] || { pctEmp: 0, pctMgr: 0, count: 0 };
      // If leadership has scores, average of both, else section 0
      if (s1.pctMgr > 0) {
        overallMgr = (s0.pctMgr + s1.pctMgr) / 2;
        overallEmp = (s0.pctEmp + s1.pctEmp) / 2;
      } else {
        overallMgr = s0.pctMgr;
        overallEmp = s0.pctEmp;
      }
    } else {
      // staff: first 7 sections
      const coreSecs = secResults.slice(0, 7);
      const coreMgrAvg = coreSecs.reduce((acc, s) => acc + s.pctMgr, 0) / (coreSecs.length || 1);
      const coreEmpAvg = coreSecs.reduce((acc, s) => acc + s.pctEmp, 0) / (coreSecs.length || 1);

      const leadSec = secResults[7];
      if (leadSec && leadSec.pctMgr > 0) {
        overallMgr = (coreSecs.reduce((acc, s) => acc + s.pctMgr, 0) + leadSec.pctMgr) / 8;
        overallEmp = (coreSecs.reduce((acc, s) => acc + s.pctEmp, 0) + leadSec.pctEmp) / 8;
      } else {
        overallMgr = coreMgrAvg;
        overallEmp = coreEmpAvg;
      }
    }

    return {
      sectionResults: secResults,
      totalEmpScore: overallEmp,
      totalMgrScore: overallMgr,
      finalOverallRating: overallMgr > 0 ? (overallMgr / 20).toFixed(2) : '0.00' // out of 5
    };
  }, [currentTemplate, scores]);

  // Fill sample dummy values for demonstration
  const handleFillSample = () => {
    const sampleScores: Record<string, { emp: number; mgr: number }> = {};
    currentTemplate.sections.forEach((sec, sIdx) => {
      sec.items.forEach((_, iIdx) => {
        // Pick realistic ratings between 3 and 5
        const r1 = 3 + ((sIdx + iIdx) % 3);
        const r2 = 3 + ((sIdx * 2 + iIdx) % 3);
        sampleScores[`${sIdx}_${iIdx}`] = { emp: r1, mgr: r2 };
      });
    });
    setScores(sampleScores);

    if (!employeeName) {
      setEmployeeName('علي حيدر حسن');
      setPosition('مسؤول قروض رئيسي');
      setStartDate('2021-03-15');
      setBranch('فرع بغداد - الكرادة');
      setSupervisorName('أحمد عبد الرزاق (مدير الفرع)');
    }

    setGoals([
      { goal: 'تحقيق مستهدف المحفظة الائتمانية بنسبة 100%', weight: 40, party: 'الموظف:' },
      { goal: 'الحفاظ على نسبة التعثر أقل من 1.5%', weight: 30, party: 'المشرف المباشر:' },
      { goal: 'استقطاب 30 عميل جديد شهرياً', weight: 20, party: 'الموظف:' },
      { goal: 'الالتزام الكامل بضوابط الامتثال والسياسات', weight: 10, party: 'المشرف المباشر:' }
    ]);

    setTrainings([
      { title: 'إدارة المخاطر والتحليل الائتماني المتقدم', type: 'له علاقة بالعمل', party: 'الموظف:' },
      { title: 'مهارات التفاوض والإقناع للمشاريع الصغيرة', type: 'له علاقة بالمهارات', party: 'المشرف المباشر:' },
      { title: 'القيادة وإدارة فرق العمل', type: 'له علاقة بالمسار الوظيفي', party: 'الموظف:' },
      { title: 'مكافحة غسل الأموال وحماية المستهلك', type: 'له علاقة بالعمل', party: 'المشرف المباشر:' }
    ]);

    setRecommendations('موظف متميز ومثابر، أظهر التزاماً عالياً وحقق المستهدفات بجدارة. نوصي بتجديد عقده وترقيته إلى الدرجة التالية.');
    setContractDecision('renew');
  };

  // Reset all
  const handleReset = () => {
    setScores({});
    setEmployeeName('');
    setPosition('');
    setStartDate('');
    setBranch('');
    setSupervisorName('');
    setSelectedEmpId('');
    setRecommendations('');
    setContractDecision('renew');
  };

  // Export to Excel using ExcelJS
  const handleExportFilledExcel = async () => {
    try {
      const response = await fetch(currentTemplate.downloadUrl);
      if (!response.ok) {
        // Fallback to downloading raw file
        const link = document.createElement('a');
        link.href = currentTemplate.downloadUrl;
        link.download = currentTemplate.filename;
        link.click();
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);
      const ws = wb.worksheets[0];

      // Update Header Title in Excel sheet (A1 merged) with dynamic evaluation year
      ws.getCell('A1').value = `${dynamicTitles.titleEn}\n ${dynamicTitles.titleAr}`;

      // Populate employee details
      if (employeeName) ws.getCell('E3').value = employeeName;
      if (position) ws.getCell('E4').value = position;
      if (startDate) ws.getCell('E5').value = startDate;
      if (branch) ws.getCell('E6').value = branch;
      if (supervisorName) ws.getCell('E7').value = supervisorName;

      // Populate scores into sheet
      // We know row offsets for each template
      let rowOffset = 11;
      if (currentTemplate.id === 'pa-maintenance-cleaner') {
        for (let i = 0; i < 21; i++) {
          const sc = scores[`0_${i}`];
          if (sc) {
            if (sc.emp) ws.getCell(`H${11 + i}`).value = sc.emp;
            if (sc.mgr) ws.getCell(`I${11 + i}`).value = sc.mgr;
          }
        }
      } else if (currentTemplate.id === 'pa-staff') {
        const staffRowMap: number[][] = [
          [11, 12, 13, 14, 15, 16, 17], // sec 0
          [19, 20, 21, 22, 23, 24],     // sec 1
          [26, 27, 28, 29],             // sec 2
          [31, 32],                     // sec 3
          [34, 35, 36, 37],             // sec 4
          [39, 40, 41, 42],             // sec 5
          [44, 45, 46, 47, 48],         // sec 6
          [52, 53, 54, 55, 56, 57, 58, 59] // sec 7 (leadership)
        ];
        staffRowMap.forEach((rows, sIdx) => {
          rows.forEach((r, iIdx) => {
            const sc = scores[`${sIdx}_${iIdx}`];
            if (sc) {
              if (sc.emp) ws.getCell(`H${r}`).value = sc.emp;
              if (sc.mgr) ws.getCell(`I${r}`).value = sc.mgr;
            }
          });
        });
      } else if (currentTemplate.id === 'pa-team-leaders-guards') {
        for (let i = 0; i < 21; i++) {
          const sc = scores[`0_${i}`];
          if (sc) {
            if (sc.emp) ws.getCell(`H${11 + i}`).value = sc.emp;
            if (sc.mgr) ws.getCell(`I${11 + i}`).value = sc.mgr;
          }
        }
        for (let i = 0; i < 4; i++) {
          const sc = scores[`1_${i}`];
          if (sc) {
            if (sc.emp) ws.getCell(`H${34 + i}`).value = sc.emp;
            if (sc.mgr) ws.getCell(`I${34 + i}`).value = sc.mgr;
          }
        }
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employeeName ? employeeName + '_' : ''}${currentTemplate.filename}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export filled Excel, downloading original:', err);
      const a = document.createElement('a');
      a.href = currentTemplate.downloadUrl;
      a.download = currentTemplate.filename;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Template Selector Tabs */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <span className="material-symbols-outlined text-2xl">rate_review</span>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-[#e2e8f0]">
                {language === 'ar' ? 'نماذج تقييم الأداء السنوي الرسمية (Performance Appraisal)' : 'Official Performance Appraisal Templates'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'النماذج المؤسسية المعتمدة لشركة فيتاس العراق مطابقة تماماً لتصميم وهيكلية شيتات الإكسل مع حساب الدرجات آلياً والتصدير.' 
                  : 'Vitas Iraq official appraisal templates matching the Excel design with automatic score calculations and export.'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleFillSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
              title={language === 'ar' ? 'تعبئة بيانات ودرجات نموذجية للعرض والتجربة' : 'Fill Sample Data'}
            >
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Sample Data'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer"
              title={language === 'ar' ? 'إعادة ضبط النموذج' : 'Reset Form'}
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>{language === 'ar' ? 'تفريغ' : 'Reset'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportFilledExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title={language === 'ar' ? 'تصدير النموذج مع البيانات المعبأة إلى ملف إكسل' : 'Export Excel with data'}
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>{language === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
              title={language === 'ar' ? 'طباعة النموذج أو حفظ كـ PDF' : 'Print Form / Save PDF'}
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{language === 'ar' ? 'طباعة / PDF' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* 3 Template Selector Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
          {PERFORMANCE_APPRAISAL_TEMPLATES.map((tmpl) => {
            const isSelected = tmpl.id === selectedTemplateId;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(tmpl.id);
                  setScores({});
                }}
                className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer flex items-start gap-3 relative ${
                  isSelected
                    ? 'bg-teal-50/80 dark:bg-teal-500/10 border-teal-500 shadow-md ring-2 ring-teal-500/30'
                    : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}>
                  <span className="material-symbols-outlined text-lg">
                    {tmpl.id === 'pa-maintenance-cleaner' ? 'cleaning_services' : tmpl.id === 'pa-team-leaders-guards' ? 'shield_person' : 'badge'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono">
                      {dynamicTitles.fyTag}
                    </span>
                    {isSelected && (
                      <span className="text-teal-600 dark:text-teal-400 flex items-center text-xs font-bold gap-0.5">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>{language === 'ar' ? 'المعروض حالياً' : 'Active'}</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate">
                    {getFormattedAppraisalTitles(tmpl, evalYear).titleAr}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                    {tmpl.filename}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Evaluation Year Selector Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-teal-500/5 p-3 rounded-xl border border-teal-500/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-lg">event</span>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'ar' ? 'سنة إطلاق التقييم (Evaluation Year):' : 'Appraisal Launch Year:'}
              </span>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-bold font-mono ms-2 px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30">
                {dynamicTitles.fyTag} ({evalYear})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[2024, 2025, 2026, 2027].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setEvalYear(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  evalYear === yr
                    ? 'bg-teal-600 text-white shadow-xs scale-105'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-teal-400'
                }`}
              >
                FY-{String(yr).slice(-2)} ({yr})
              </button>
            ))}
          </div>
        </div>

        {/* Employee Auto-fill Bar */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-base">person_search</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {language === 'ar' ? 'تعبئة تلقائية من سجلات الموظفين:' : 'Auto-fill from Employee Directory:'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <select
              value={selectedEmpId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="w-full bg-white dark:bg-[#0a0c10] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-[#e2e8f0] focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="">{language === 'ar' ? '-- اختر موظفاً للتعبئة التلقائية --' : '-- Select Employee to Auto-fill --'}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || emp.fullNameAr || emp.name} ({emp.employeeId || emp.badgeNo || '—'}) - {emp.branch || '—'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── THE EXACT EXCEL SHEET DESIGN CONTAINER ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div 
        id="appraisal-sheet-printable" 
        className="bg-white text-black p-6 sm:p-8 rounded-2xl shadow-xl border-2 border-slate-400 overflow-x-auto print:p-0 print:border-none print:shadow-none"
        dir="rtl"
        style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
      >
        {/* ROW 1: EXCEL TITLE BOX */}
        <div className="border-2 border-blue-800 p-2.5 text-center mb-3 bg-white">
          <h1 className="text-blue-700 font-bold text-sm sm:text-base leading-snug">
            {dynamicTitles.titleEn}
          </h1>
          <h2 className="text-blue-700 font-bold text-sm sm:text-base leading-snug mt-0.5">
            {dynamicTitles.titleAr}
          </h2>
        </div>

        {/* ROWS 3-8: LOGOS & EMPLOYEE DETAILS TABLE */}
        <div className="grid grid-cols-12 gap-3 items-center mb-3">
          {/* Left Logo (Col 0-1) */}
          <div className="col-span-12 sm:col-span-2 flex items-center justify-center p-2 border border-slate-300 rounded bg-slate-50/50 min-h-[140px]">
            <img 
              src="/assets/pa_logo_left.jpg" 
              alt="Vitas Logo Left" 
              className="max-h-24 max-w-full object-contain"
              onError={(e) => {
                // fallback to public/assets/vitas_iraq_logo.png
                (e.target as HTMLImageElement).src = '/assets/vitas_iraq_logo.png';
              }}
            />
          </div>

          {/* Center: Employee Info Table (Cols C-F in Excel) */}
          <div className="col-span-12 sm:col-span-8">
            <table className="w-full border-collapse border border-black text-xs font-sans">
              <tbody>
                <tr className="border border-black">
                  <td className="border border-black bg-slate-100 font-bold p-1.5 w-40 text-start">
                    اسم الموظف:
                  </td>
                  <td className="border border-black p-1 text-start">
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="أدخل اسم الموظف..."
                      className="w-full px-2 py-0.5 border-none outline-none font-bold text-slate-900 bg-transparent"
                    />
                  </td>
                </tr>
                <tr className="border border-black">
                  <td className="border border-black bg-slate-100 font-bold p-1.5 text-start">
                    المنصب الوظيفي:
                  </td>
                  <td className="border border-black p-1 text-start">
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="أدخل المنصب الوظيفي..."
                      className="w-full px-2 py-0.5 border-none outline-none font-semibold text-slate-900 bg-transparent"
                    />
                  </td>
                </tr>
                <tr className="border border-black">
                  <td className="border border-black bg-slate-100 font-bold p-1.5 text-start">
                    تاريخ بدء العمل:
                  </td>
                  <td className="border border-black p-1 text-start">
                    <input
                      type="text"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="مثال: 2022-01-15"
                      className="w-full px-2 py-0.5 border-none outline-none text-slate-900 bg-transparent font-mono"
                    />
                  </td>
                </tr>
                <tr className="border border-black">
                  <td className="border border-black bg-slate-100 font-bold p-1.5 text-start">
                    الفرع:
                  </td>
                  <td className="border border-black p-1 text-start">
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="اسم الفرع..."
                      className="w-full px-2 py-0.5 border-none outline-none text-slate-900 bg-transparent"
                    />
                  </td>
                </tr>
                <tr className="border border-black">
                  <td className="border border-black bg-slate-100 font-bold p-1.5 text-start">
                    اسم و منصب المسؤول المباشر:
                  </td>
                  <td className="border border-black p-1 text-start">
                    <input
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      placeholder="اسم ومنصب المسؤول المباشر..."
                      className="w-full px-2 py-0.5 border-none outline-none text-slate-900 bg-transparent"
                    />
                  </td>
                </tr>
                <tr className="border-2 border-red-600 bg-red-50">
                  <td className="border border-red-600 font-black p-1.5 text-red-600 text-start text-xs sm:text-sm">
                    الدرجة النهائية:
                  </td>
                  <td className="border border-red-600 p-1.5 text-start">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-red-600 text-sm sm:text-base font-mono">
                        {totalMgrScore.toFixed(1)}%
                      </span>
                      <span className="text-[11px] font-bold text-red-500 font-mono">
                        ({finalOverallRating} من 5.0)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {language === 'ar' ? '(محسوبة تلقائياً وفق معادلة الإكسل)' : '(Auto-calculated)'}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Logo (Col 7-8) */}
          <div className="col-span-12 sm:col-span-2 flex items-center justify-center p-2 border border-slate-300 rounded bg-slate-50/50 min-h-[140px]">
            <img 
              src="/assets/pa_logo_right.jpg" 
              alt="Vitas Logo Right" 
              className="max-h-24 max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/chf_iraq_logo.png';
              }}
            />
          </div>
        </div>

        {/* ROW 9: RATING SCALE BANNER (EXACT SAGE TINT / LIGHT GRAY) */}
        <div className="border border-black bg-[#f1f5e9] text-center py-2 px-3 mb-4 text-xs font-bold text-black leading-relaxed">
          <span>5: أستثنائي</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>4: فوق التوقعات</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>3: بمستوى التوقعات</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>2: أقل من المتوقع</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>1: غير مرضي</span>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* EVALUATION SECTIONS & TABLES */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4 mb-5">
          {currentTemplate.sections.map((sec, secIdx) => {
            const isLeadership = sec.title.includes('القيادة') || sec.title.includes('للمدراء والمشرفين');
            const secRes = sectionResults[secIdx] || { avgEmp: 0, avgMgr: 0, pctEmp: 0, pctMgr: 0 };

            return (
              <div key={secIdx} className="border border-black overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    {/* SECTION HEADER ROW (EXACT EXCEL COLOR #D8E4BC) */}
                    <tr style={{ backgroundColor: '#D8E4BC' }} className="border-b border-black">
                      <th className="border-r border-black p-2 text-center w-12 font-bold text-blue-900">
                        {sec.number || secIdx + 1}
                      </th>
                      <th className="border-r border-black p-2 text-start font-bold text-blue-900 text-xs sm:text-sm">
                        {sec.title}
                        {isLeadership && (
                          <span className="text-[10px] text-red-600 font-bold mr-2">
                            *(خاص بالمدراء والمشرفين)*
                          </span>
                        )}
                      </th>
                      <th className="border-r border-black p-2 text-center w-28 sm:w-32 font-bold text-blue-900 text-[11px]">
                        درجة الموظف
                        <span className="block text-[9px] font-normal text-slate-600">(1 - 5)</span>
                      </th>
                      <th className="p-2 text-center w-32 sm:w-36 font-bold text-blue-900 text-[11px]">
                        درجة المشرف المباشر
                        <span className="block text-[9px] font-normal text-slate-600">(1 - 5)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((item, itemIdx) => {
                      const sc = scores[`${secIdx}_${itemIdx}`] || { emp: 0, mgr: 0 };
                      return (
                        <tr 
                          key={itemIdx} 
                          className={`border-b border-black hover:bg-slate-50 transition-colors ${
                            itemIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                          }`}
                        >
                          <td className="border-r border-black p-1.5 text-center font-bold text-slate-700">
                            {item.num}
                          </td>
                          <td className="border-r border-black p-1.5 text-start font-medium text-slate-900 leading-snug">
                            {item.text}
                          </td>
                          {/* Employee Score Selector (1-5) */}
                          <td className="border-r border-black p-1 text-center bg-white">
                            <select
                              value={sc.emp || ''}
                              onChange={(e) => updateScore(secIdx, itemIdx, 'emp', Number(e.target.value))}
                              className="w-16 p-1 text-center border border-slate-300 rounded font-bold text-xs bg-white text-black focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                              <option value="">—</option>
                              <option value="5">5</option>
                              <option value="4">4</option>
                              <option value="3">3</option>
                              <option value="2">2</option>
                              <option value="1">1</option>
                            </select>
                          </td>
                          {/* Supervisor Score Selector (1-5) */}
                          <td className="p-1 text-center bg-white">
                            <select
                              value={sc.mgr || ''}
                              onChange={(e) => updateScore(secIdx, itemIdx, 'mgr', Number(e.target.value))}
                              className="w-16 p-1 text-center border border-blue-400 rounded font-black text-xs bg-blue-50/40 text-blue-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                              <option value="">—</option>
                              <option value="5">5</option>
                              <option value="4">4</option>
                              <option value="3">3</option>
                              <option value="2">2</option>
                              <option value="1">1</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}

                    {/* SECTION SUBTOTAL / SCORING ROW (EXACT EXCEL COLOR #F2F2F2) */}
                    <tr style={{ backgroundColor: '#F2F2F2' }} className="font-bold border-t-2 border-black">
                      <td colSpan={2} className="border-r border-black p-2 text-end font-black text-slate-900 text-xs">
                        مجموع الدرجات (نسبة الإنجاز %):
                      </td>
                      <td className="border-r border-black p-2 text-center text-red-600 font-mono font-black text-xs">
                        {secRes.pctEmp.toFixed(1)}%
                      </td>
                      <td className="p-2 text-center text-red-600 font-mono font-black text-xs">
                        {secRes.pctMgr.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* CONTRACT RECOMMENDATION SECTION (EXACT EXCEL COLOR #92D050) */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div 
          style={{ backgroundColor: '#92D050' }} 
          className="border border-black p-3 mb-4 rounded-xs text-xs font-bold text-black flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-800 text-lg">gavel</span>
            <span className="font-black text-red-900 text-xs sm:text-sm">توصية العقد:</span>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer bg-white/70 px-3 py-1 rounded border border-black/20 hover:bg-white transition-colors">
              <input
                type="radio"
                name="contractDecision"
                checked={contractDecision === 'renew'}
                onChange={() => setContractDecision('renew')}
                className="w-4 h-4 text-emerald-600 cursor-pointer"
              />
              <span className="font-black text-emerald-950 text-xs">✅ تجديد العقد</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-white/70 px-3 py-1 rounded border border-black/20 hover:bg-white transition-colors">
              <input
                type="radio"
                name="contractDecision"
                checked={contractDecision === 'terminate'}
                onChange={() => setContractDecision('terminate')}
                className="w-4 h-4 text-rose-600 cursor-pointer"
              />
              <span className="font-black text-rose-950 text-xs">⚠️ إنهاء خدمات</span>
            </label>
          </div>

          <div className="text-[11px] text-black/70 font-mono">
            {language === 'ar' ? 'الدرجة التراكمية: ' : 'Cumulative Score: '}
            <span className="font-bold text-red-900 font-mono">{totalMgrScore.toFixed(1)}%</span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* NEXT YEAR GOALS (اهداف السنة القادمة) */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="border border-black mb-4">
          <div style={{ backgroundColor: '#D8E4BC' }} className="p-2 border-b border-black font-bold text-blue-900 text-xs flex items-center justify-between">
            <span>اهداف السنة القادمة</span>
            <span className="text-[11px] font-normal text-slate-600">
              إجمالي الوزن: {goals.reduce((acc, g) => acc + (Number(g.weight) || 0), 0)}%
            </span>
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: '#e9efd8' }} className="border-b border-black text-slate-800 font-bold">
                <th className="border-r border-black p-1.5 text-center w-28">الجهة</th>
                <th className="border-r border-black p-1.5 text-start">الهدف</th>
                <th className="p-1.5 text-center w-24">الوزن %</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, gIdx) => (
                <tr key={gIdx} className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center font-bold bg-slate-50 text-slate-700">
                    {g.party}
                  </td>
                  <td className="border-r border-black p-1">
                    <input
                      type="text"
                      value={g.goal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGoals(prev => prev.map((item, idx) => idx === gIdx ? { ...item, goal: val } : item));
                      }}
                      placeholder="أدخل نص الهدف..."
                      className="w-full px-2 py-1 outline-none text-xs bg-transparent"
                    />
                  </td>
                  <td className="p-1 text-center">
                    <input
                      type="number"
                      value={g.weight || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGoals(prev => prev.map((item, idx) => idx === gIdx ? { ...item, weight: val } : item));
                      }}
                      placeholder="%"
                      className="w-16 p-1 text-center border border-slate-300 rounded font-mono font-bold text-xs bg-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TRAININGS & COURSES (الدورات والتدريبات) */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="border border-black mb-4">
          <div style={{ backgroundColor: '#D8E4BC' }} className="p-2 border-b border-black font-bold text-blue-900 text-xs">
            الدورات والتدريبات
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: '#e9efd8' }} className="border-b border-black text-slate-800 font-bold">
                <th className="border-r border-black p-1.5 text-center w-28">الجهة</th>
                <th className="border-r border-black p-1.5 text-start">عنوان التدريب</th>
                <th className="p-1.5 text-start w-52 sm:w-64">نوع التدريب</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map((t, tIdx) => (
                <tr key={tIdx} className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center font-bold bg-slate-50 text-slate-700">
                    {t.party}
                  </td>
                  <td className="border-r border-black p-1">
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTrainings(prev => prev.map((item, idx) => idx === tIdx ? { ...item, title: val } : item));
                      }}
                      placeholder="عنوان الدورة أو البرنامج التدريبي..."
                      className="w-full px-2 py-1 outline-none text-xs bg-transparent"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      value={t.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTrainings(prev => prev.map((item, idx) => idx === tIdx ? { ...item, type: val } : item));
                      }}
                      className="w-full p-1 border border-slate-300 rounded text-xs bg-white text-black cursor-pointer"
                    >
                      <option value="له علاقة بالعمل">له علاقة بالعمل</option>
                      <option value="له علاقة بالمهارات">له علاقة بالمهارات</option>
                      <option value="له علاقة بالمسار الوظيفي">له علاقة بالمسار الوظيفي</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* SUPERVISOR RECOMMENDATIONS (رأي وتوصيات المشرف المباشر) */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="border border-black mb-4">
          <div className="bg-slate-100 p-2 border-b border-black font-bold text-blue-900 text-xs">
            رأي وتوصيات المشرف المباشر:
          </div>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={3}
            placeholder="اكتب هنا ملاحظات وتوصيات المسؤول المباشر حول أداء الموظف ونقاط القوة والتحسين..."
            className="w-full p-2.5 outline-none text-xs text-slate-900 resize-y bg-transparent"
          />
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* OFFICIAL SIGNATURES & DATES (التواقيع) */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-black p-3 bg-slate-50/50">
          {/* Employee Signature */}
          <div className="border border-slate-300 p-3 rounded bg-white text-xs space-y-2">
            <div className="font-bold text-blue-900 border-b pb-1">
              اسم الموظف / التاريخ / التوقيع:
            </div>
            <div className="text-[11px] font-semibold text-slate-700 min-h-[20px]">
              {employeeName || '—'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>التاريخ:</span>
              <input
                type="date"
                value={empSignatureDate}
                onChange={(e) => setEmpSignatureDate(e.target.value)}
                className="border border-slate-200 px-1 py-0.5 rounded text-[11px] outline-none"
              />
            </div>
            <div className="pt-2 text-center text-slate-400 text-[10px] border-t border-dashed">
              (التوقيع الإلكتروني للموظف)
            </div>
          </div>

          {/* Supervisor Signature */}
          <div className="border border-slate-300 p-3 rounded bg-white text-xs space-y-2">
            <div className="font-bold text-blue-900 border-b pb-1">
              اسم المشرف المباشر / التاريخ / التوقيع:
            </div>
            <div className="text-[11px] font-semibold text-slate-700 min-h-[20px]">
              {supervisorName || '—'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>التاريخ:</span>
              <input
                type="date"
                value={supSignatureDate}
                onChange={(e) => setSupSignatureDate(e.target.value)}
                className="border border-slate-200 px-1 py-0.5 rounded text-[11px] outline-none"
              />
            </div>
            <div className="pt-2 text-center text-slate-400 text-[10px] border-t border-dashed">
              (توقيع المشرف المباشر)
            </div>
          </div>

          {/* HR Signature */}
          <div className="border border-slate-300 p-3 rounded bg-white text-xs space-y-2">
            <div className="font-bold text-blue-900 border-b pb-1">
              قسم الموارد البشرية / التاريخ / التوقيع:
            </div>
            <div className="text-[11px] font-semibold text-slate-700 min-h-[20px]">
              إدارة الموارد البشرية - Vitas Iraq
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>التاريخ:</span>
              <input
                type="date"
                value={hrSignatureDate}
                onChange={(e) => setHrSignatureDate(e.target.value)}
                className="border border-slate-200 px-1 py-0.5 rounded text-[11px] outline-none"
              />
            </div>
            <div className="pt-2 text-center text-slate-400 text-[10px] border-t border-dashed">
              (مصادقة قسم الموارد البشرية)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

