import React, { useState } from 'react';

interface DiscussionCase {
  id?: number | string;
  employee_id: string;
  employee_name: string;
  job_title: string;
  branch: string;
  supervisor_name: string;
  status: string;
  dispute_reason?: string;
  scheduled_date?: string;
  meeting_notes?: string;
  resolution_type?: string;
}

interface DiscussionCenterModalProps {
  language?: string;
  isDark?: boolean;
  onClose: () => void;
  onOpenAppraisal: (employeeId: string) => void;
}

export const DiscussionCenterModal: React.FC<DiscussionCenterModalProps> = ({
  language = 'ar',
  isDark = true,
  onClose,
  onOpenAppraisal
}) => {
  // Sample cases or load from localStorage/API
  const [cases, setCases] = useState<DiscussionCase[]>([
    {
      id: 'DISC-01',
      employee_id: 'VTS-1042',
      employee_name: 'حيدر علي كاظم',
      job_title: 'مسؤول قروض',
      branch: 'فرع البصرة',
      supervisor_name: 'عمار عبد الكريم',
      status: 'Pending Discussion',
      dispute_reason: 'اعتراض الموظف على تقييم معيار مواكبة التطورات الفنية، حيث تم احتساب درجة 2 بينما حقق دورات معتمدة.',
      scheduled_date: '2026-03-25'
    },
    {
      id: 'DISC-02',
      employee_id: 'VTS-1050',
      employee_name: 'بدر الحارثي',
      job_title: 'مسؤول أمن وحراسة',
      branch: 'فرع الموصل',
      supervisor_name: 'محمد عبد الله',
      status: 'Escalated to HR',
      dispute_reason: 'تم رفع التقييم إلى إدارة الموارد البشرية لعدم التوافق بعد جلسة المناقشة الأولى بين الموظف والمشرف.',
      scheduled_date: '2026-03-28'
    }
  ]);

  const [selectedCase, setSelectedCase] = useState<DiscussionCase | null>(cases[0] || null);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState('');

  const handleResolve = (type: 'maintain' | 'revise' | 'escalate') => {
    if (!selectedCase) return;
    const newStatus = type === 'escalate' ? 'Escalated to HR' : 'Completed';
    setCases(prev => prev.map(c => c.id === selectedCase.id ? { ...c, status: newStatus, resolution_type: type } : c));
    alert(language === 'ar' ? 'تم تحديث حالة الجلسة بنجاح' : 'Discussion case updated');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className={`w-full max-w-5xl rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
              <span className="material-symbols-outlined text-xl">forum</span>
            </div>
            <div>
              <h3 className="text-sm font-black">
                {language === 'ar' ? 'مركز المناقشات وإدارة الاعتراضات (Discussion Center)' : 'Appraisal Discussion & Appeals Center'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'إدارة حالات عدم التوافق بين تقييم الموظف الذاتي وتقييم المشرف وجلسات الحوار' : 'Manage score disagreements and formal dialogue sessions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Cases List */}
          <div className="md:col-span-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'القضايا المعلقة' : 'Active Discussion Cases'} ({cases.length})
            </h4>
            <div className="space-y-2.5">
              {cases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white dark:text-white">{c.employee_name}</span>
                      <span className="text-[10px] font-mono text-teal-400">{c.employee_id}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{c.job_title} • {c.branch}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">مشرف: {c.supervisor_name}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        c.status === 'Escalated to HR' ? 'bg-rose-500/20 text-rose-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Case Details */}
          <div className="md:col-span-7 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-4">
            {selectedCase ? (
              <>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <div>
                    <h4 className="text-sm font-bold text-white dark:text-white">{selectedCase.employee_name}</h4>
                    <p className="text-xs text-slate-400">
                      {language === 'ar' ? 'المشرف المباشر:' : 'Supervisor:'} {selectedCase.supervisor_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAppraisal(selectedCase.employee_id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>{language === 'ar' ? 'فتح ملف التقييم' : 'Open Appraisal'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <div className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">report_problem</span>
                    <span>{language === 'ar' ? 'سبب الاعتراض المقدم من الموظف:' : 'Employee Objection Details:'}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-medium">
                    {selectedCase.dispute_reason}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    {language === 'ar' ? 'محضر وقرارات جلسة المناقشة:' : 'Discussion Minutes & Decision:'}
                  </label>
                  <textarea
                    rows={3}
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'دون هنا نتائج الحوار مع الموظف وما تم الاتفاق عليه...' : 'Enter meeting dialogue and agreed notes...'}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleResolve('maintain')}
                    className="py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'تثبيت التقييم الأصلي' : 'Maintain Score'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResolve('revise')}
                    className="py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'إصدار تقييم معدل' : 'Revise Scores'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResolve('escalate')}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'تصعيد لإدارة HR' : 'Escalate to HR'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-medium">
                {language === 'ar' ? 'اختر قضية من القائمة للاطلاع على تفاصيلها' : 'Select a case to view details'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${
          isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-white/5 cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

