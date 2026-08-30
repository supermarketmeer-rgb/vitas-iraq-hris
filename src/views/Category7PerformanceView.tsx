import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export const Category7PerformanceView: React.FC = () => {
  const { activeModuleId, currentUser, employees, isDark, t, language } = useApp();
  
  const [q1Score, setQ1Score] = useState(88);
  const [q2Score, setQ2Score] = useState(92);
  const [comments, setComments] = useState('');
  const [appraisalSaved, setAppraisalSaved] = useState(false);

  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');

  const handleSaveAppraisal = (e: React.FormEvent) => {
    e.preventDefault();
    setAppraisalSaved(true);
  };

  // Mock evaluations derived from live employees list
  const employeeEvaluations = useMemo(() => {
    return employees.map((emp, idx) => {
      const baseScore = 4.0 + ((idx * 7) % 10) / 10;
      const score = Math.min(5.0, Math.max(3.5, Number(baseScore.toFixed(1))));
      let grade = 'ممتاز (Excellent)';
      if (score < 4.2) grade = 'جيد جداً (Very Good)';
      if (score < 3.8) grade = 'جيد (Good)';

      return {
        ...emp,
        score,
        grade,
        kpiCompletion: Math.min(100, Math.round(score * 20)),
        status: idx % 6 === 0 ? 'قيد التقييم' : 'مكتمل ومعتمد'
      };
    });
  }, [employees]);

  const filteredEvaluations = useMemo(() => {
    if (selectedDeptFilter === 'All') return employeeEvaluations;
    return employeeEvaluations.filter(e => e.department === selectedDeptFilter);
  }, [employeeEvaluations, selectedDeptFilter]);

  const completedAppraisalsCount = employeeEvaluations.filter(e => e.status === 'مكتمل ومعتمد').length;
  const avgScore = (employeeEvaluations.reduce((sum, e) => sum + e.score, 0) / (employees.length || 1)).toFixed(1);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-white">atr</span>
            <span className="text-xs font-mono text-white uppercase tracking-widest font-normal">
              PERFORMANCE & LEARNING ENTERPRISE PORTAL
            </span>
          </div>
          <h1 className="text-2xl font-normal text-white drop-shadow-md">
            {activeModuleId === 'perf-mgmt' && t('إدارة وتقييم أداء الموظفين السنوي (KPIs)', 'Annual Performance Management & KPIs')}
            {activeModuleId === 'perf-self-appraisal' && t('نموذج التقييم الذاتي للموظف (Self Appraisal)', 'Employee Self Appraisal Form')}
            {activeModuleId === 'perf-review' && t('مراجعة وتقييم الأداء من قبل المدير المباشر', 'Line Manager Performance Review')}
            {activeModuleId === 'train-my-learning' && t('لوحة التعلم والدورات التدريبية المتاحة', 'My Learning & Training Portal')}
            {activeModuleId === 'train-courses-analytics' && t('إدارة الدورات وتحليلات التطوير الوظيفي', 'Courses Management & Development Analytics')}
          </h1>
          <p className="text-xs text-white font-bold mt-1.5 drop-shadow-sm flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>{t('قياس المؤشرات وتحديث الكفاءات لـ 49 موظفاً حياً وفق لوائح مؤسسة فيتاس العراق', 'Live KPI tracking & competencies alignment for 49 VITAS Iraq staff')}</span>
          </p>
        </div>
      </div>

      {/* MODULE 1: PERFORMANCE MANAGEMENT */}
      {activeModuleId === 'perf-mgmt' && (
        <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-white/10">
            <h2 className="text-base font-normal text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400">moving</span>
              {t('مؤشرات الأداء الرئيسية والتقييم السنوي 2026 (KPIs)', 'Key Performance Indicators & Annual Ratings 2026')}
            </h2>
            <span className="text-xs bg-[#06080d] text-teal-400 font-mono font-normal px-3 py-1 rounded-full border border-teal-500/30">
              {completedAppraisalsCount} / {employees.length} {t('تقييمات معتمدة', 'approved ratings')}
            </span>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-1 shadow-sm">
              <p className="font-normal text-slate-400">{t('نسبة إنجاز الأهداف المؤسسية', 'Institutional Goals Progress')}</p>
              <p className="text-3xl font-normal text-teal-400 font-mono">94.5%</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{t('مستهدفة خطة الائتمان والنمو 2026', 'Targeted 2026 credit expansion plan')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-1 shadow-sm">
              <p className="font-normal text-slate-400">{t('التقييمات المكتملة والمعتمدة', 'Completed & Approved Ratings')}</p>
              <p className="text-3xl font-normal text-emerald-400 font-mono">{completedAppraisalsCount} / {employees.length}</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{t('مكتملة ومرحلة لملفات الموارد البشرية', 'Submitted & archived to HR files')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-1 shadow-sm">
              <p className="font-normal text-slate-400">{t('متوسط التقييم العام للكادر', 'Average Employee Rating')}</p>
              <p className="text-3xl font-normal text-purple-400 font-mono">{avgScore} / 5.0</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{t('مقياس التقييم من 5.0 درجات', 'On a scale out of 5.0')}</p>
            </div>
          </div>

          {/* Employee Evaluation Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-normal text-sm text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">format_list_bulleted</span>
                {t('سجل تقييمات أداء الكادر المباشر', 'Live Staff Evaluation Register')}
              </h3>
              <select
                value={selectedDeptFilter}
                onChange={e => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-normal bg-[#06080d] text-slate-200 border border-white/15 focus:outline-none"
              >
                <option value="All">{t('جميع الأقسام', 'All Departments')}</option>
                <option value="قسم الائتمان">{t('قسم الائتمان', 'Credit Dept')}</option>
                <option value="قسم الخزينة">{t('قسم الخزينة', 'Treasury Dept')}</option>
                <option value="الموارد البشرية">{t('الموارد البشرية', 'HR Dept')}</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-xs text-right">
                <thead className="bg-[#06080d] text-slate-200 border-b border-white/10 font-normal">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">{t('اسم الموظف والرمز', 'Employee & ID')}</th>
                    <th className="p-3">{t('الفرع والفرع الفرعي', 'Branch / Location')}</th>
                    <th className="p-3">{t('المسمى والقسم', 'Position & Dept')}</th>
                    <th className="p-3">{t('درجة الإنجاز', 'KPI Target %')}</th>
                    <th className="p-3">{t('التقييم النهائى (Score)', 'Final Rating')}</th>
                    <th className="p-3 text-center">{t('الحالة (Status)', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200 bg-[#0a0c10]">
                  {filteredEvaluations.slice(0, 12).map((emp, idx) => (
                    <tr key={emp.id} className="hover:bg-white/5 transition-colors font-normal">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-normal text-white block">{language === 'en' ? emp.fullNameEn || emp.fullName : emp.fullName}</span>
                        <span className="text-[10px] font-mono text-teal-400">
                          {String(emp.employeeId || emp.badgeNo || '').startsWith('VTS-')
                            ? (emp.employeeId || emp.badgeNo)
                            : `VTS-${emp.employeeId || emp.badgeNo || emp.id}`}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200">{emp.branch || emp.location_ar || 'السليمانية'}</td>
                      <td className="p-3 text-slate-200">{emp.jobTitle || emp.position_ar || emp.position}</td>
                      <td className="p-3 font-mono text-teal-400">{emp.kpiCompletion}%</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono bg-[#06080d] text-purple-300 border border-purple-500/30 inline-block">
                          {emp.score} / 5.0 ({emp.grade})
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-normal ${
                          emp.status === 'مكتمل ومعتمد'
                            ? 'bg-[#06080d] text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#06080d] text-amber-400 border border-amber-500/30'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: SELF APPRAISAL */}
      {activeModuleId === 'perf-self-appraisal' && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl space-y-6">
          <div className="border-b pb-3 border-white/10">
            <h2 className="text-base font-normal text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400">rate_review</span>
              {t(`نموذج التقييم الذاتي للعام 2026 - ${currentUser?.name || ''}`, `Self Appraisal Form 2026 - ${currentUser?.name || ''}`)}
            </h2>
            <p className="text-xs mt-1 font-normal text-slate-400">
              {t('قم بتقييم أدائك في تحقيق الأهداف والالتزام بقيم مؤسسة فيتاس العراق', 'Evaluate your performance against targets and core VITAS Iraq values')}
            </p>
          </div>

          {appraisalSaved && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-normal flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{t('تم حفظ وإرسال تقييمك الذاتي بنجاح إلى مدير القسم المباشر!', 'Your self appraisal has been saved and submitted to your line manager!')}</span>
            </div>
          )}

          <form onSubmit={handleSaveAppraisal} className="space-y-4 text-xs">
            <div>
              <label className="block font-normal mb-1 text-slate-200">
                {t(`1. درجة الالتزام بمؤشرات أداء التمويل والجودة (${q1Score}%)`, `1. Finance & Quality KPIs Score (${q1Score}%)`)}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={q1Score}
                onChange={e => setQ1Score(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-normal mb-1 text-slate-200">
                {t(`2. درجة العمل الجماعي والحلول الابتكارية (${q2Score}%)`, `2. Teamwork & Innovation Score (${q2Score}%)`)}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={q2Score}
                onChange={e => setQ2Score(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-normal mb-1 text-slate-200">{t('ملاحظات وإنجازات عام 2026', '2026 Achievements & Notes')}</label>
              <textarea
                rows={4}
                placeholder={t('اذكر أبرز المبادرات والمشاريع التي ساهمت بها هذا العام...', 'List key initiatives and contributions this year...')}
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="w-full p-3 rounded-xl border border-white/10 font-normal bg-[#06080d] text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#06080d] text-teal-400 border border-teal-500 hover:bg-[#0a0c10] hover:text-emerald-400 hover:border-emerald-400 font-normal text-xs shadow-lg transition-all"
            >
              {t('اعتماد وإرسال التقييم الذاتي', 'Submit Self Appraisal')}
            </button>
          </form>
        </div>
      )}

      {/* MODULE 3: PERFORMANCE REVIEW */}
      {activeModuleId === 'perf-review' && (
        <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-white/10">
            <h2 className="text-base font-normal text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400">assignment_turned_in</span>
              {t('اعتماد مراجعات الأداء السنوية من قبل المدير المباشر', 'Line Manager Performance Review Approvals')}
            </h2>
            <span className="text-xs bg-[#06080d] text-teal-400 font-mono font-normal px-3 py-1 rounded-full border border-teal-500/30">
              {employees.length} {t('موظفاً تحت التقييم', 'under review')}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs text-right">
              <thead className="bg-[#06080d] text-slate-200 border-b border-white/10 font-normal">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{t('اسم الموظف', 'Employee Name')}</th>
                  <th className="p-3">{t('القسم والمسمى', 'Dept & Position')}</th>
                  <th className="p-3">{t('التقييم الذاتي', 'Self Rating')}</th>
                  <th className="p-3">{t('تقييم المدير (1 - 5)', 'Manager Rating')}</th>
                  <th className="p-3 text-center">{t('الإجراء (Action)', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200 bg-[#0a0c10]">
                {employeeEvaluations.slice(0, 10).map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-white/5 transition-colors font-normal">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 text-white">
                      <span className="block font-normal">{emp.fullName}</span>
                      <span className="text-[10px] font-mono text-teal-400">
                        {String(emp.employeeId || emp.badgeNo || '').startsWith('VTS-')
                          ? (emp.employeeId || emp.badgeNo)
                          : `VTS-${emp.employeeId || emp.badgeNo || emp.id}`}
                      </span>
                    </td>
                    <td className="p-3 text-slate-200">{emp.jobTitle || emp.position_ar} • {emp.department}</td>
                    <td className="p-3 font-mono text-teal-400">{emp.score} / 5.0</td>
                    <td className="p-3">
                      <select className="px-2.5 py-1 rounded-xl text-xs font-normal bg-[#06080d] text-white border border-white/15 focus:outline-none">
                        <option value="5.0">5.0 (ممتاز)</option>
                        <option value="4.5">4.5 (جيد جداً)</option>
                        <option value="4.0">4.0 (جيد)</option>
                        <option value="3.5">3.5 (مقبول)</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button className="px-3 py-1.5 rounded-xl bg-[#06080d] text-teal-400 border border-teal-500 hover:bg-[#0a0c10] hover:text-emerald-400 font-normal text-xs transition-all shadow-sm">
                        {t('اعتماد الدرجة', 'Approve Grade')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODULE 4: MY LEARNING DASHBOARD */}
      {activeModuleId === 'train-my-learning' && (
        <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-white/10">
            <h2 className="text-base font-normal text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400">school</span>
              {t('مسارات التعلم والدورات التدريبية المتاحة للكادر', 'My Live Learning & Training Courses')}
            </h2>
            <span className="text-xs bg-[#06080d] text-purple-300 font-mono font-normal px-3 py-1 rounded-full border border-purple-500/30">
              4 {t('دورات نشطة', 'active courses')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Course 1 */}
            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-[#0a0c10] text-emerald-400 border border-emerald-500/30">
                  {t('مكتملة ومعتمدة 100%', '100% Completed')}
                </span>
                <span className="text-slate-400 font-mono">15 Hours</span>
              </div>
              <h3 className="font-normal text-sm text-white">
                {t('دورة إدارة الائتمان ومخاطر القروض والتخصيص', 'Credit Management & Loan Risk Analysis')}
              </h3>
              <p className="text-slate-400 text-xs">{t('الضوابط الائتمانية والتحليل المالي للقروض وتجنب التعثر وفق لوائح البنك المركزي.', 'Credit limits, financial analysis and non-performing loan prevention.')}</p>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full"></div>
              </div>
            </div>

            {/* Course 2 */}
            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-[#0a0c10] text-teal-400 border border-teal-500/30">
                  {t('قيد التقدم (85%)', '85% In Progress')}
                </span>
                <span className="text-slate-400 font-mono">20 Hours</span>
              </div>
              <h3 className="font-normal text-sm text-white">
                {t('دورة الامتثال والتعليمات المصرفية للبنك المركزي CBI', 'CBI Central Bank Compliance Rules')}
              </h3>
              <p className="text-slate-400 text-xs">{t('لوائح وتعليمات البنك المركزي العراقي الخاصة بمؤسسات التمويل الأصغر والتنظيم.', 'CBI regulations for microfinance institutions and governance.')}</p>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full w-[85%]"></div>
              </div>
            </div>

            {/* Course 3 */}
            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-[#0a0c10] text-purple-300 border border-purple-500/30">
                  {t('مكتملة (90%)', '90% Progress')}
                </span>
                <span className="text-slate-400 font-mono">12 Hours</span>
              </div>
              <h3 className="font-normal text-sm text-white">
                {t('دورة مكافحة غسل الأموال وحماية البيانات AML/KYC', 'Anti-Money Laundering & KYC Compliance')}
              </h3>
              <p className="text-slate-400 text-xs">{t('إجراءات العناية الواجبة وتحديد هوية المستفيد وحظر غسل الأموال.', 'Customer due diligence, KYC standards and AML compliance.')}</p>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[90%]"></div>
              </div>
            </div>

            {/* Course 4 */}
            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-[#0a0c10] text-amber-300 border border-amber-500/30">
                  {t('متاح للتسجيل', 'Enrolled')}
                </span>
                <span className="text-slate-400 font-mono">8 Hours</span>
              </div>
              <h3 className="font-normal text-sm text-white">
                {t('دورة تطوير مهارات خدمة العملاء والتواصل الفعال', 'Customer Service & Communication Excellence')}
              </h3>
              <p className="text-slate-400 text-xs">{t('مهارات التعامل مع المقترضين وبناء العلاقة وتذليل العقبات في الميدان.', 'Client relationship building and field service delivery.')}</p>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[20%]"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: COURSE MANAGEMENT & ANALYTICS */}
      {activeModuleId === 'train-courses-analytics' && (
        <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-white/10">
            <h2 className="text-base font-normal text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400">model_training</span>
              {t('إدارة الحقائب التدريبية وتحليلات التطوير الوظيفي', 'Course Management & Development Analytics')}
            </h2>
            <span className="text-xs bg-[#06080d] text-teal-400 font-mono font-normal px-3 py-1 rounded-full border border-teal-500/30">
              1,240 {t('ساعة تدريبية إجمالية', 'Total Training Hours')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-1 shadow-sm">
              <p className="font-normal text-slate-400">{t('إجمالي الكادر المشارك في التدريب', 'Total Enrolled Staff')}</p>
              <p className="text-3xl font-normal text-teal-400 font-mono">{employees.length}</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{t('موزعون على كافة الفروع والمكاتب', 'Across all branches & offices')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-1 shadow-sm">
              <p className="font-normal text-slate-400">{t('نسبة إنجاز الدورات العالية', 'Course Completion Rate')}</p>
              <p className="text-3xl font-normal text-emerald-400 font-mono">92.8%</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{t('نسبة نجاح واجتياز الاختبارات', 'Passing & certification rate')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#06080d] border border-white/10 space-y-1 shadow-sm">
              <p className="font-normal text-slate-400">{t('ساعات التدريب المنجزة', 'Completed Training Hours')}</p>
              <p className="text-3xl font-normal text-purple-400 font-mono">1,240 h</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{t('معدل 25.3 ساعة لكل موظف', 'Avg 25.3 hours per employee')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
