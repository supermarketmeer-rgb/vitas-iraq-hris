import React from 'react';

interface StatusBadgeProps {
  status: string;
  language?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, language = 'ar' }) => {
  let bg = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30';
  let icon = 'radio_button_unchecked';
  let labelAr = status;
  let labelEn = status;

  switch (status) {
    case 'Completed':
    case 'Approved':
      bg = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      icon = 'check_circle';
      labelAr = 'مكتمل ومعتمد';
      labelEn = 'Completed & Approved';
      break;
    case 'In Progress':
    case 'Self-Assessment Draft':
      bg = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
      icon = 'pending';
      labelAr = 'قيد التقييم الذاتي';
      labelEn = 'In Progress (Self)';
      break;
    case 'Pending Supervisor Assessment':
    case 'Supervisor Draft':
      bg = 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
      icon = 'hourglass_top';
      labelAr = 'بانتظار تقييم المشرف';
      labelEn = 'Pending Supervisor';
      break;
    case 'Pending Employee Acknowledgment':
      bg = 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
      icon = 'draw';
      labelAr = 'بانتظار إقرار الموظف';
      labelEn = 'Pending Acknowledgment';
      break;
    case 'Pending Discussion':
      bg = 'bg-orange-500/15 text-orange-800 dark:text-orange-400 border-orange-500/30';
      icon = 'forum';
      labelAr = 'بانتظار جلسة مناقشة';
      labelEn = 'Pending Discussion';
      break;
    case 'Escalated to HR':
      bg = 'bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-500/30';
      icon = 'warning';
      labelAr = 'مصعّد للموارد البشرية';
      labelEn = 'Escalated to HR';
      break;
    case 'Overdue':
      bg = 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
      icon = 'error';
      labelAr = 'متأخر عن الموعد';
      labelEn = 'Overdue';
      break;
    case 'Not Started':
    default:
      bg = 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
      icon = 'circle';
      labelAr = 'لم يبدأ بعد';
      labelEn = 'Not Started';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${bg}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      <span>{language === 'ar' ? labelAr : labelEn}</span>
    </span>
  );
};

