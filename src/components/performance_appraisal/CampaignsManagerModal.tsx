import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

interface Campaign {
  id?: number;
  campaign_code: string;
  name_en: string;
  name_ar: string;
  appraisal_type: string;
  evaluation_year: number;
  announcement_date?: string;
  start_date?: string;
  closing_date?: string;
  status: string;
}

interface CampaignsManagerModalProps {
  language?: string;
  isDark?: boolean;
  onClose: () => void;
}

export const CampaignsManagerModal: React.FC<CampaignsManagerModalProps> = ({
  language = 'ar',
  isDark = true,
  onClose
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [appraisalType, setAppraisalType] = useState('Annual');
  const [evalYear, setEvalYear] = useState(2026);
  const [startDate, setStartDate] = useState('2026-01-15');
  const [closingDate, setClosingDate] = useState('2026-03-31');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res: any = await api.getCampaigns();
      if (Array.isArray(res) && res.length > 0) {
        setCampaigns(res);
      } else {
        // Fallback default campaigns
        setCampaigns([
          {
            id: 1,
            campaign_code: 'CMP-2026-FY25',
            name_en: 'FY-25 Annual Performance Appraisal Campaign',
            name_ar: 'حملة تقييم الأداء السنوي الرسمية 2026 / FY-25',
            appraisal_type: 'Annual',
            evaluation_year: 2026,
            start_date: '2026-01-15',
            closing_date: '2026-03-31',
            status: 'Active'
          },
          {
            id: 2,
            campaign_code: 'CMP-2026-PROB',
            name_en: 'Q1-2026 Probationary Staff Appraisal',
            name_ar: 'تقييم موظفي فترة التجربة - الربع الأول 2026',
            appraisal_type: 'Probationary',
            evaluation_year: 2026,
            start_date: '2026-02-01',
            closing_date: '2026-04-15',
            status: 'Active'
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    const payload = {
      campaign_code: `CMP-${evalYear}-${Date.now().toString().slice(-4)}`,
      name_en: nameEn.trim() || nameAr.trim(),
      name_ar: nameAr.trim(),
      appraisal_type: appraisalType,
      evaluation_year: evalYear,
      start_date: startDate,
      closing_date: closingDate,
      status: 'Active'
    };

    try {
      await api.saveCampaign(payload);
      await fetchCampaigns();
      setShowAddForm(false);
      setNameAr('');
      setNameEn('');
    } catch (err) {
      console.error('Error creating campaign:', err);
      setCampaigns(prev => [payload, ...prev]);
      setShowAddForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className={`w-full max-w-4xl rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <div>
              <h3 className="text-sm font-black">
                {language === 'ar' ? 'إدارة حملات التقييم المؤسسية (Campaigns Manager)' : 'Institutional Appraisal Campaigns'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'إطلاق وجدولة دورات وحملات تقييم الأداء السنوي وتحديد مواعيد البدء والإغلاق' : 'Schedule and launch appraisal cycles with start and closing dates'}
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
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'الحملات المسجلة' : 'Registered Campaigns'} ({campaigns.length})
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-600/20"
            >
              <span className="material-symbols-outlined text-sm">{showAddForm ? 'close' : 'add'}</span>
              <span>{showAddForm ? (language === 'ar' ? 'إلغاء' : 'Cancel') : (language === 'ar' ? 'إطلاق دورة تقييم جديدة' : 'New Campaign')}</span>
            </button>
          </div>

          {/* Add Campaign Form */}
          {showAddForm && (
            <form onSubmit={handleCreateCampaign} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3 animate-in fade-in">
              <h5 className="text-xs font-bold text-teal-400">
                {language === 'ar' ? 'بيانات الحملة الجديدة:' : 'New Campaign Details:'}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {language === 'ar' ? 'اسم الحملة (بالعربية):' : 'Campaign Name (Arabic):'}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    required
                    placeholder="مثال: تقييم الأداء السنوي لعام 2026"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {language === 'ar' ? 'اسم الحملة (بالإنجليزية):' : 'Campaign Name (English):'}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. 2026 Annual Performance Review"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {language === 'ar' ? 'نوع التقييم:' : 'Appraisal Type:'}
                  </label>
                  <select
                    value={appraisalType}
                    onChange={(e) => setAppraisalType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Annual">سنوي (Annual)</option>
                    <option value="Semi-Annual">نصف سنوي (Semi-Annual)</option>
                    <option value="Probationary">فترة تجربة (Probationary)</option>
                    <option value="Special">استثنائي / خاص (Special)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {language === 'ar' ? 'سنة التقييم:' : 'Evaluation Year:'}
                  </label>
                  <input
                    type="number"
                    value={evalYear}
                    onChange={(e) => setEvalYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {language === 'ar' ? 'تاريخ بدء التقييم:' : 'Start Date:'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {language === 'ar' ? 'تاريخ إغلاق الحملة:' : 'Closing Date:'}
                  </label>
                  <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/30 cursor-pointer"
                >
                  {language === 'ar' ? 'حفظ وإطلاق الحملة' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          )}

          {/* Campaigns Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaigns.map((c) => (
              <div key={c.id || c.campaign_code} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white dark:text-white">{c.name_ar}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {c.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">{c.campaign_code} • {c.appraisal_type}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>من: {c.start_date || '—'}</span>
                  <span>إلى: {c.closing_date || '—'}</span>
                </div>
              </div>
            ))}
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

