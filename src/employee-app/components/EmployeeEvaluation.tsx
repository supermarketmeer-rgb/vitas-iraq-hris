import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  Award, 
  CheckCircle2, 
  Star, 
  Send, 
  TrendingUp, 
  Sparkles, 
  Target,
  FileCheck
} from 'lucide-react';

interface EmployeeEvaluationProps {
  employee: any;
  onLogout?: () => void;
}

export const EmployeeEvaluation: React.FC<EmployeeEvaluationProps> = ({ employee }) => {
  const { theme, language, t } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [ratings, setRatings] = useState<{ [key: string]: number }>({
    punctuality: 5,
    quality: 4,
    teamwork: 5,
    initiative: 4,
    compliance: 5
  });

  const [achievements, setAchievements] = useState(() => 
    isEn 
      ? 'Completed client reception transactions and verified documents with 98% accuracy and zero complaints.'
      : 'إنجاز معاملات استقبال العملاء والتحقق من المستندات بنسبة دقة 98% وبدون أي شكاوى.'
  );
  
  const [trainingGoals, setTrainingGoals] = useState(() =>
    isEn
      ? 'Developing advanced customer service skills and electronic document management system mastery.'
      : 'تطوير المهارات المتقدمة في خدمة العملاء ونظام إدارة المستندات الإلكترونية.'
  );

  const [submitted, setSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const criteria = [
    { 
      id: 'punctuality', 
      label: isEn ? 'Punctuality & Working Hours Commitment' : 'الالتزام بأوقات الدوام وساعات العمل', 
      desc: isEn ? 'Discipline in time attendance and branch schedule compliance' : 'الانضباط في تسجيل الحضور والالتزام بجدول الفرع' 
    },
    { 
      id: 'quality', 
      label: isEn ? 'Accuracy & Quality of Daily Tasks' : 'دقة وجودة إنجاز المهام اليومية', 
      desc: isEn ? 'Executing customer transactions according to certified standards' : 'تنفيذ معاملات العملاء وفق المعايير المعتمدة' 
    },
    { 
      id: 'teamwork', 
      label: isEn ? 'Teamwork & Customer Service' : 'التعاون وخدمة العملاء والزملاء', 
      desc: isEn ? 'Positive collaboration and facilitating client procedures' : 'التعامل الإيجابي وتسهيل إجراءات الزبائن' 
    },
    { 
      id: 'initiative', 
      label: isEn ? 'Initiative & Problem Solving Speed' : 'المبادرة وسرعة معالجة الحالات', 
      desc: isEn ? 'Professional conduct and resolving field issues' : 'التصرف المهني وحل الصعوبات الميدانية' 
    },
    { 
      id: 'compliance', 
      label: isEn ? 'Institutional Policies & Regulatory Compliance' : 'الالتزام بسياسات وضوابط المؤسسة', 
      desc: isEn ? 'Adhering to compliance, confidentiality, and data protection rules' : 'تطبيق تعليمات الامتثال والسرية وحماية البيانات' 
    },
  ];

  const handleRatingChange = (id: string, score: number) => {
    setRatings(prev => ({ ...prev, [id]: score }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setToastMsg(
      isEn 
        ? 'Self-evaluation form successfully submitted to direct supervisor and HR department'
        : 'تم إرسال نموذج التقييم الذاتي بنجاح إلى المشرف المباشر وقسم الموارد البشرية'
    );
    setTimeout(() => setToastMsg(null), 4000);
  };

  const ratingsList = Object.values(ratings).map(v => Number(v) || 0);
  const avgScore = ratingsList.length > 0 
    ? (ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length).toFixed(1)
    : '0.0';

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Self Performance Evaluation' : 'التقييم الذاتي للأداء'}
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isEn ? 'Targets & Key Performance Indicators (KPIs) for 2026' : 'تقييم المستهدفات ومؤشرات الأداء للدورة الحالية 2026'}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 shrink-0">
          {isEn ? 'Q3 - 2026' : 'الربع الثالث - 2026'}
        </span>
      </div>

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* KPI Summary Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-600 via-orange-700 to-slate-900 text-white shadow-xl relative overflow-hidden border border-amber-500/30">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
              {isEn ? 'Estimated Self Rating' : 'المعدل التقديري الذاتي'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black font-mono">{avgScore}</span>
              <span className="text-xs text-amber-200">
                {isEn ? 'out of 5.0 stars' : 'من 5.0 نجوم'}
              </span>
            </div>
            <p className="text-[11px] text-slate-200 mt-1">
              {Number(avgScore) >= 4.5 
                ? (isEn ? 'Excellent performance exceeding expectations ★★★★★' : 'أداء ممتاز يتجاوز التوقعات ★★★★★') 
                : (isEn ? 'Very good performance matching targets ★★★★☆' : 'أداء جيد جداً ومطابق للمستهدف ★★★★☆')}
            </p>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex flex-col items-center justify-center border border-white/20">
            <Sparkles className="w-6 h-6 text-amber-300 mb-0.5" />
            <span className="text-[10px] font-bold text-white">
              {isEn ? 'Verified' : 'معتمد'}
            </span>
          </div>
        </div>
      </div>

      {/* Rating Criteria Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <h2 className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
            <Target className="w-4 h-4" />
            <span>{isEn ? 'Core Self-Evaluation Criteria' : 'معايير التقييم الذاتي الرئيسية'}</span>
          </h2>

          <div className="space-y-3">
            {criteria.map((item) => (
              <div key={item.id} className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} first:border-0 first:pt-0`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
                    <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{item.desc}</p>
                  </div>

                  {/* Star Rating Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => handleRatingChange(item.id, star)}
                        className={`p-1 rounded-lg transition-transform active:scale-125 cursor-pointer ${
                          star <= (ratings[item.id] || 0)
                            ? 'text-amber-500'
                            : isDark ? 'text-slate-700' : 'text-slate-300'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${star <= (ratings[item.id] || 0) ? 'fill-amber-500 text-amber-500' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text Areas */}
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
        }`}>
          <div>
            <label className={`block text-xs font-black mb-1 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
              {isEn ? 'Key Achievements & Completed Tasks' : 'أبرز الإنجازات والمهام المكتملة خلال الدورة'}
            </label>
            <textarea
              rows={2}
              value={achievements}
              onChange={e => setAchievements(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-black mb-1 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
              {isEn ? 'Proposed Professional Development & Training Areas' : 'مجالات التطوير المهني والتدريب المقترحة'}
            </label>
            <textarea
              rows={2}
              value={trainingGoals}
              onChange={e => setTrainingGoals(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>
            {submitted 
              ? (isEn ? 'Update and Resubmit Self Evaluation' : 'تحديث وإعادة إرسال التقييم الذاتي')
              : (isEn ? 'Submit Self Evaluation to Supervisor' : 'إرسال التقييم الذاتي للمدير المباشر')}
          </span>
        </button>
      </form>
    </div>
  );
};
