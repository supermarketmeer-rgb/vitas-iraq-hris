import React, { useState } from 'react';
import { useExecutiveContext, ExecutiveDecree } from '../context/ExecutiveContext';
import { 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Users, 
  Calendar,
  X
} from 'lucide-react';

export const ExecutiveDecrees: React.FC = () => {
  const { decrees, issueDecree, theme, language, t } = useExecutiveContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New Decree Form State
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newCategory, setNewCategory] = useState<ExecutiveDecree['category']>('organizational');
  const [newPriority, setNewPriority] = useState<ExecutiveDecree['priority']>('urgent');
  const [newTargetAr, setNewTargetAr] = useState('كافة الفروع والإدارات والأقسام في عموم العراق');
  const [newContentAr, setNewContentAr] = useState('');

  const filteredDecrees = decrees.filter(d => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.titleAr.toLowerCase().includes(q) || d.titleEn.toLowerCase().includes(q);
      const matchContent = d.contentAr.toLowerCase().includes(q) || d.number.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    return true;
  });

  const handleCreateDecree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleAr.trim() || !newContentAr.trim()) return;

    issueDecree({
      number: `أمر إداري رقم (${decrees.length + 50})`,
      year: 2026,
      titleAr: newTitleAr.trim(),
      titleEn: newTitleEn.trim() || newTitleAr.trim(),
      category: newCategory,
      priority: newPriority,
      date: new Date().toISOString().split('T')[0],
      issuedBy: 'د. شاكر الحسني - المدير العام التنفيذي',
      targetAudienceAr: newTargetAr,
      targetAudienceEn: 'All Operational Branches & Departments',
      contentAr: newContentAr.trim(),
      contentEn: newContentAr.trim()
    });

    setIsModalOpen(false);
    setNewTitleAr('');
    setNewTitleEn('');
    setNewContentAr('');
  };

  return (
    <div className="p-3.5 space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Header & New Decree Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('الأوامر والتعاميم الإدارية العليا', 'Executive Decrees & Circulars')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('إصدار ومتابعة القرارات التنظيمية الملزمة لكافة الفروع', 'Issuing & tracking binding administrative decrees across Iraq')}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('إصدار أمر إداري', 'New Decree')}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder={t('بحث برقم الأمر، العنوان، أو المحتوى...', 'Search decree number, title, or content...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full ps-9 pe-3 py-2 rounded-xl text-xs outline-none border transition-all ${
            isDark 
              ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500' 
              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
          }`}
        />
      </div>

      {/* Decrees List */}
      <div className="space-y-3">
        {filteredDecrees.map(decree => (
          <div
            key={decree.id}
            className={`p-4 rounded-2xl border transition-all ${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/30' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Header: Number, Priority, Date */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-amber-400 block">
                    {decree.number} / {decree.year}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {decree.issuedBy}
                  </span>
                </div>
              </div>

              <div className="text-end">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  decree.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400' :
                  decree.priority === 'confidential' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {decree.priority === 'urgent' && t('عاجل ومهم', 'Urgent')}
                  {decree.priority === 'confidential' && t('سري ومحدود', 'Confidential')}
                  {decree.priority === 'normal' && t('اعتيادي', 'Normal')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {decree.date}
                </span>
              </div>
            </div>

            {/* Decree Title */}
            <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900 leading-snug" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {isAr ? decree.titleAr : decree.titleEn}
            </h3>

            {/* Target Audience */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('الجهة المعنية:', 'Target:')} {isAr ? decree.targetAudienceAr : decree.targetAudienceEn}</span>
            </div>

            {/* Official Content Box */}
            <p className="text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-600 mt-2.5 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800/50">
              {isAr ? decree.contentAr : decree.contentEn}
            </p>

            {/* Footer: Acknowledgment Rate & Status */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800 text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{decree.acknowledgmentRate}% {t('نسبة الاطلاع والمصادقة من الفروع', 'Branch acknowledgment rate')}</span>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                {t('ساري المفعول', 'Enforced')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Decree Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0d1322] border border-amber-500/30 p-5 space-y-4 shadow-2xl text-white animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold">
                  {t('إصدار أمر إداري ملزم جديد', 'Issue New Executive Decree')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDecree} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {t('عنوان الأمر الإداري بالعربية *', 'Decree Title (Arabic) *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تشكيل لجنة تدقيق المحافظ الائتمانية"
                  value={newTitleAr}
                  onChange={e => setNewTitleAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {t('التصنيف المؤسسي', 'Category')}
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  >
                    <option value="organizational">{t('تنظيمي وهيكلي', 'Organizational')}</option>
                    <option value="financial">{t('مالي ورواتب', 'Financial & Payroll')}</option>
                    <option value="promotions">{t('ترقيات ومكافآت', 'Promotions & Awards')}</option>
                    <option value="security">{t('أمني والتزام', 'Security & Compliance')}</option>
                    <option value="circular">{t('تعميم عام', 'General Circular')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {t('مستوى الأولوية', 'Priority')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  >
                    <option value="urgent">{t('عاجل وفوري', 'Urgent')}</option>
                    <option value="normal">{t('اعتيادي', 'Normal')}</option>
                    <option value="confidential">{t('سري ومحدود', 'Confidential')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {t('الجهة الموجه إليها التعميم', 'Target Audience')}
                </label>
                <input
                  type="text"
                  value={newTargetAr}
                  onChange={e => setNewTargetAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {t('نص القرار / الأمر الإداري *', 'Decree Text & Directives *')}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="بناءً على مقتضيات المصلحة العامة والصلاحيات المخولة لسيادتكم، تقرر ما يلي..."
                  value={newContentAr}
                  onChange={e => setNewContentAr(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-bold hover:from-amber-500 hover:to-amber-400 shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('إصدار وتعميم فوري', 'Publish & Broadcast')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
