import React, { useState, useEffect } from 'react';

export interface ExchangeRateRecord {
  id: string;
  effectiveDate: string; // YYYY-MM-DD
  rate: number; // e.g. 1310 (1 USD = 1310 IQD)
  rateType: 'official_cbi' | 'company_standard' | 'parallel_market' | 'custom';
  sourceNameAr: string;
  sourceNameEn: string;
  notes?: string;
  updatedBy?: string;
  updatedAt: string;
  isActive: boolean;
}

interface ExchangeRateUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: ExchangeRateRecord) => void;
  language?: string;
  t?: (ar: string, en: string) => string;
  initialData?: ExchangeRateRecord | null;
  currentActiveRate?: number;
}

export const ExchangeRateUpdateModal: React.FC<ExchangeRateUpdateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  language = 'ar',
  t: propT,
  initialData,
  currentActiveRate = 1310,
}) => {
  const isAr = language === 'ar';
  const t = propT || ((ar: string, en: string) => (isAr ? ar : en));

  const [rate, setRate] = useState<string>('1310');
  const [effectiveDate, setEffectiveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [rateType, setRateType] = useState<ExchangeRateRecord['rateType']>('company_standard');
  const [sourceName, setSourceName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [updatedBy, setUpdatedBy] = useState<string>('الإدارة المالية / الموارد البشرية');

  // Interactive quick calculator state inside the modal
  const [calcUsd, setCalcUsd] = useState<string>('100');

  useEffect(() => {
    if (initialData) {
      setRate(String(initialData.rate));
      setEffectiveDate(initialData.effectiveDate || new Date().toISOString().split('T')[0]);
      setRateType(initialData.rateType || 'company_standard');
      setSourceName(isAr ? initialData.sourceNameAr : initialData.sourceNameEn);
      setNotes(initialData.notes || '');
      setIsActive(initialData.isActive);
      setUpdatedBy(initialData.updatedBy || (isAr ? 'الإدارة المالية' : 'Finance Dept'));
    } else {
      setRate(String(currentActiveRate || 1310));
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setRateType('company_standard');
      setSourceName(isAr ? 'سعر المؤسسة المعتمد (فيتاس)' : 'Vitas Corporate Official Rate');
      setNotes(isAr ? 'تحديث سعر الصرف المعتمد لصرف رواتب وبدلات الموظفين' : 'Exchange rate update for payroll & allowances');
      setIsActive(true);
      setUpdatedBy(isAr ? 'الإدارة المالية' : 'Finance Dept');
    }
  }, [initialData, currentActiveRate, isOpen, isAr]);

  if (!isOpen) return null;

  const numericRate = parseFloat(rate) || 0;
  const numCalcUsd = parseFloat(calcUsd) || 0;
  const convertedIqd = numericRate > 0 && numCalcUsd > 0 ? Math.round(numCalcUsd * numericRate) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericRate <= 0) return;

    let defaultArName = 'سعر المؤسسة المعتمد';
    let defaultEnName = 'Corporate Standard Rate';
    if (rateType === 'official_cbi') {
      defaultArName = 'سعر البنك المركزي العراقي (CBI)';
      defaultEnName = 'Central Bank of Iraq (CBI)';
    } else if (rateType === 'parallel_market') {
      defaultArName = 'سعر السوق الموازي';
      defaultEnName = 'Parallel Market Rate';
    } else if (rateType === 'custom') {
      defaultArName = sourceName || 'سعر مخصص';
      defaultEnName = sourceName || 'Custom Rate';
    }

    const newRecord: ExchangeRateRecord = {
      id: initialData?.id || `fx-${Date.now()}`,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      rate: numericRate,
      rateType,
      sourceNameAr: isAr ? (sourceName || defaultArName) : defaultArName,
      sourceNameEn: !isAr ? (sourceName || defaultEnName) : defaultEnName,
      notes: notes.trim(),
      updatedBy: updatedBy.trim() || (isAr ? 'الإدارة المالية' : 'Finance Dept'),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isActive,
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-xl bg-white border-2 border-gray-400 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-black">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b-2 border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white border-2 border-gray-300 text-black flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl text-black">currency_exchange</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg  text-black flex items-center gap-2 font-bold">
                <span>{initialData ? t('تعديل سجل سعر التصريف', 'Edit Exchange Rate Record') : t('تحديث سعر تصريف الدولار مقابل الدينار', 'Update USD / IQD Exchange Rate')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-200 text-black border border-gray-400">
                  USD / IQD
                </span>
              </h3>
              <p className="text-xs text-black mt-0.5 font-normal">
                {t('تحديد سعر الصرف المعتمد في المؤسسة لحساب الرواتب والبدلات والمخصصات', 'Set the enterprise exchange rate for payroll, allowances, and monetary policies')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white hover:bg-gray-200 text-black flex items-center justify-center transition-colors cursor-pointer border border-gray-300"
          >
            <span className="material-symbols-outlined text-lg text-black">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs bg-white text-black">
          {/* Main Exchange Rate Input Card */}
          <div className="p-4 rounded-xl bg-white border-2 border-black space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-normal text-black flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-black">payments</span>
                <span>{t('سعر التصريف (1 دولار أمريكي = كم دينار عراقي؟)', 'Exchange Rate (1 USD = ? IQD)')}</span>
                <span className="text-black font-normal">*</span>
              </label>
              <span className="text-[11px] font-mono font-normal text-black">
                1 USD = {Number(rate || 0).toLocaleString()} IQD
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black font-normal font-mono text-sm">
                $1.00 =
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="1310"
                className="w-full ps-20 pe-16 py-3 bg-white border-2 border-black rounded-xl text-black font-mono font-normal text-xl focus:outline-none focus:ring-2 focus:ring-black text-center tracking-wider"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-black font-normal text-xs">
                {t('د.ع عراقي', 'IQD')}
              </div>
            </div>

            {/* Quick helper buttons for common Iraqi rates */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-black font-normal">{t('أسعار شائعة:', 'Quick presets:')}</span>
              {[1300, 1310, 1320, 1450, 1500].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setRate(String(preset))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-normal transition-all cursor-pointer border ${
                    Number(rate) === preset
                      ? 'bg-black text-white border-black'
                      : 'bg-white hover:bg-gray-100 text-black border-gray-300'
                  }`}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Form Grid: Effective Date, Source Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-black">calendar_month</span>
                <span>{t('تاريخ سريان ونفاذ السعر', 'Effective Date')}</span>
                <span className="text-black font-normal">*</span>
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-black">account_balance</span>
                <span>{t('نوع ومصدر السعر', 'Rate Source / Type')}</span>
              </label>
              <select
                value={rateType}
                onChange={(e) => {
                  const val = e.target.value as ExchangeRateRecord['rateType'];
                  setRateType(val);
                  if (val === 'company_standard') setSourceName(isAr ? 'سعر المؤسسة المعتمد (فيتاس)' : 'Vitas Corporate Official Rate');
                  else if (val === 'official_cbi') setSourceName(isAr ? 'البنك المركزي العراقي (CBI)' : 'Central Bank of Iraq');
                  else if (val === 'parallel_market') setSourceName(isAr ? 'سعر السوق الموازي' : 'Parallel Market Rate');
                }}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-normal focus:outline-none focus:border-black"
              >
                <option value="company_standard">{t('سعر المؤسسة المعتمد (فيتاس)', 'Corporate Standard Rate (Vitas)')}</option>
                <option value="official_cbi">{t('سعر البنك المركزي العراقي الرسمي (CBI)', 'Central Bank of Iraq (Official CBI)')}</option>
                <option value="parallel_market">{t('سعر السوق الموازي / الفعلي', 'Parallel Market Rate')}</option>
                <option value="custom">{t('مصدر مخصص آخر', 'Custom Source')}</option>
              </select>
            </div>
          </div>

          {/* Source Label and Updated By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-black">badge</span>
                <span>{t('اسم المصدر / الجهة المعتمدة', 'Source Name / Label')}</span>
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder={isAr ? 'مثال: البنك المركزي العراقي' : 'e.g. Central Bank of Iraq'}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-normal focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-black">person</span>
                <span>{t('تم التحديث والاعتماد بواسطة', 'Updated / Approved By')}</span>
              </label>
              <input
                type="text"
                value={updatedBy}
                onChange={(e) => setUpdatedBy(e.target.value)}
                placeholder={isAr ? 'الإدارة المالية' : 'Finance Dept'}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-normal focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Active Status Switch Card */}
          <div className="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-300 flex items-center justify-between text-black">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-300 text-black">
                <span className="material-symbols-outlined text-base text-black">verified</span>
              </div>
              <div>
                <div className="font-normal text-black text-xs">
                  {t('تعيين هذا السعر كـ "السعر النشط والمعتمد حالياً"', 'Set as the Active Official Rate')}
                </div>
                <div className="text-[11px] text-black font-normal mt-0.5">
                  {t('سيتم تطبيق هذا السعر مباشرة على كافة عمليات تحويل العملات والبدلات', 'Applies immediately across all allowance and payroll currency conversions')}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-black">notes</span>
              <span>{t('ملاحظات وبيان سبب التحديث (اختياري)', 'Notes & Reason for Update (Optional)')}</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'بيان رسمي أو سبب تعديل سعر الصرف...' : 'Official reference or note...'}
              className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-normal focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Interactive Live Converter Simulator inside Modal */}
          <div className="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-300 space-y-2.5 text-black">
            <div className="flex items-center justify-between text-[11px] font-normal text-black">
              <span className="flex items-center gap-1.5 text-black">
                <span className="material-symbols-outlined text-sm text-black">calculate</span>
                <span>{t('حاسبة تحويل فورية للتأكد من السعر:', 'Live Currency Conversion Test:')}</span>
              </span>
              <span className="text-[11px] text-black font-mono font-normal">
                $1 = {numericRate.toLocaleString()} IQD
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 start-0 ps-2.5 flex items-center pointer-events-none text-black font-mono font-normal text-xs">$</span>
                <input
                  type="number"
                  value={calcUsd}
                  onChange={(e) => setCalcUsd(e.target.value)}
                  placeholder="100"
                  className="w-full ps-7 pe-2 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-black font-mono font-normal text-xs focus:outline-none focus:border-black"
                />
              </div>
              <span className="text-black font-normal text-sm">➔</span>
              <div className="flex-1 px-3 py-1.5 rounded-lg bg-white border-2 border-gray-300 text-black font-mono font-normal text-xs flex items-center justify-between">
                <span>{convertedIqd.toLocaleString()}</span>
                <span className="text-[10px] text-black font-normal">{t('د.ع', 'IQD')}</span>
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-black font-normal text-xs transition-colors cursor-pointer border-2 border-gray-300"
            >
              {t('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-normal text-xs shadow transition-all flex items-center gap-2 cursor-pointer border border-black active:scale-95"
            >
              <span className="material-symbols-outlined text-base text-white">save</span>
              <span>{initialData ? t('حفظ التعديلات', 'Save Changes') : t('اعتماد وحفظ سعر الصرف', 'Save & Apply Rate')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
