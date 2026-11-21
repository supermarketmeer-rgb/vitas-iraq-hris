import React, { useEffect, useState } from 'react';
import { Cpu, DatabaseBackup, Edit3, Eye, EyeOff, History, MapPinned, Plus, Save, Settings, ShieldCheck, Trash2, X } from 'lucide-react';
import { Governorate } from '../types';
import { deleteGovernorate, fetchAzureOcrSettings, fetchGovernorates, saveAzureOcrSettings, saveGovernorate } from '../utils/apiSync';
import { getLang, tr } from '../utils/i18n';
import { DtmsStorage } from '../utils/storage';
import { AuditLogsViewer } from './AuditLogsViewer';
import { BackupModal } from './BackupModal';
import { useDtmsHeader } from '../context/DtmsHeaderContext';

type SettingsTab = 'governorates' | 'ocr' | 'backup' | 'audit';

interface SettingsManagerProps {
  onRefreshData?: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onRefreshData }) => {
  const { headerActions } = useDtmsHeader();
  const [activeTab, setActiveTab] = useState<SettingsTab>('governorates');
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [azureEndpoint, setAzureEndpoint] = useState('https://vitasiraq-dtms-vision.cognitiveservices.azure.com/');
  const [azureRegion, setAzureRegion] = useState('eastus');
  const [azureKey, setAzureKey] = useState('');
  const [azureKeyConfigured, setAzureKeyConfigured] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [clearAzureKey, setClearAzureKey] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isEnglish = getLang() === 'en';

  const loadGovernorates = async () => {
    setLoading(true);
    const data = await fetchGovernorates();
    setGovernorates(data.map((item: any) => ({ ...item, id: String(item.id), usage_count: Number(item.usage_count || 0) })));
    setLoading(false);
  };

  useEffect(() => {
    loadGovernorates();
    fetchAzureOcrSettings().then((result) => {
      if (result.success && result.data) {
        setAzureEndpoint(result.data.endpoint);
        setAzureRegion(result.data.region);
        setAzureKeyConfigured(result.data.key_configured);
      }
    });
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNameAr('');
    setNameEn('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameAr.trim() || !nameEn.trim()) {
      setMessage({ type: 'error', text: tr('الاسم العربي والإنجليزي مطلوبان.', 'Arabic and English names are required.') });
      return;
    }
    setLoading(true);
    const result = await saveGovernorate({ id: editingId || undefined, name_ar: nameAr.trim(), name_en: nameEn.trim() });
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? tr('تم حفظ المحافظة.', 'Governorate saved.') : (result.message || tr('تعذر حفظ المحافظة.', 'Unable to save governorate.')) });
    if (result.success) {
      resetForm();
      await loadGovernorates();
      onRefreshData?.();
    } else {
      setLoading(false);
    }
  };

  const handleEdit = (governorate: Governorate) => {
    setEditingId(governorate.id);
    setNameAr(governorate.name_ar);
    setNameEn(governorate.name_en);
    setMessage(null);
  };

  const handleDelete = async (governorate: Governorate) => {
    if ((governorate.usage_count || 0) > 0) return;
    if (!window.confirm(tr(`حذف محافظة ${governorate.name_ar}؟`, `Delete ${governorate.name_en}?`))) return;
    setLoading(true);
    const result = await deleteGovernorate(governorate.id);
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? tr('تم حذف المحافظة.', 'Governorate deleted.') : (result.message || tr('تعذر حذف المحافظة.', 'Unable to delete governorate.')) });
    await loadGovernorates();
  };

  const handleSaveAzureOcr = async (event: React.FormEvent) => {
    event.preventDefault();
    setOcrLoading(true);
    setOcrMessage(null);
    const result = await saveAzureOcrSettings({
      endpoint: azureEndpoint.trim(),
      region: azureRegion.trim(),
      key: azureKey.trim() || undefined,
      clear_key: clearAzureKey,
    });
    setOcrLoading(false);
    if (!result.success || !result.data) {
      setOcrMessage({ type: 'error', text: result.message || tr('تعذر حفظ إعدادات Azure OCR.', 'Unable to save Azure OCR settings.') });
      return;
    }
    setAzureEndpoint(result.data.endpoint);
    setAzureRegion(result.data.region);
    setAzureKeyConfigured(result.data.key_configured);
    setAzureKey('');
    setClearAzureKey(false);
    const currentSettings = DtmsStorage.getSettings();
    DtmsStorage.saveSettings({ ...currentSettings, default_ocr_engine: 'Azure Vision' });
    setOcrMessage({
      type: 'success',
      text: result.data.key_configured
        ? tr('تم حفظ إعدادات Azure وتفعيل Microsoft Azure Vision كمحرك OCR.', 'Azure settings saved and Microsoft Azure Vision is now the active OCR engine.')
        : tr('تمت إزالة مفتاح Azure وتعطيل Azure OCR.', 'The Azure key was removed and Azure OCR was disabled.'),
    });
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'governorates', label: tr('المحافظات', 'Governorates'), icon: MapPinned },
    { id: 'ocr', label: tr('إعدادات Azure OCR', 'Azure OCR'), icon: Cpu },
    { id: 'backup', label: tr('النسخ الاحتياطي', 'Backup'), icon: DatabaseBackup },
    { id: 'audit', label: tr('سجل التدقيق', 'Audit Logs'), icon: History },
  ];

  return <div className="space-y-4 pb-16" dir={isEnglish ? 'ltr' : 'rtl'}>
    <header className="dtms-settings-header p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold !text-black" style={{color:'#000000'}}>
            <Settings className="w-5 h-5 text-teal-600" />
            <span style={{color: '#000000'}} className="!text-black font-black">{tr('إعدادات النظام', 'System Settings')}</span>
          </h2>
          <p className="mt-1 text-xs font-semibold !text-slate-700" style={{color:'#374151'}}>{tr('إدارة البيانات المرجعية والنسخ الاحتياطي وسجل التدقيق.', 'Manage reference data, backups, and audit records.')}</p>
        </div>
        {headerActions}
      </div>
    </header>

    <nav className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-x-auto">
      {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 min-w-36 px-4 py-2.5 rounded-md text-xs font-bold transition-colors ${activeTab === tab.id ? 'bg-teal-700 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700'}`}><Icon className="w-4 h-4" />{tab.label}</button>; })}
    </nav>

    {activeTab === 'governorates' && <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/30">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200">{tr('الاسم بالعربية', 'Arabic Name')}<input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="بغداد" /></label>
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200">{tr('الاسم بالإنجليزية', 'English Name')}<input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="Baghdad" /></label>
        <div className="flex items-end gap-2"><button disabled={loading} type="submit" className="h-9 px-4 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">{editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{editingId ? tr('حفظ التعديل', 'Save Changes') : tr('إضافة', 'Add')}</button>{editingId && <button type="button" onClick={resetForm} className="h-9 w-9 rounded-md border border-gray-300 flex items-center justify-center" title={tr('إلغاء', 'Cancel')}><X className="w-4 h-4" /></button>}</div>
      </form>
      {message && <div className={`mx-4 mt-4 p-3 rounded-md text-xs border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{message.text}</div>}
      <div className="overflow-x-auto p-4"><table className={`w-full text-xs ${isEnglish ? 'text-left' : 'text-right'}`}><thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200"><tr><th className="p-3">#</th><th className="p-3">{tr('الاسم بالعربية', 'Arabic Name')}</th><th className="p-3">{tr('الاسم بالإنجليزية', 'English Name')}</th><th className="p-3">{tr('عدد الاستخدامات', 'References')}</th><th className="p-3">{tr('الإجراءات', 'Actions')}</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-800">{governorates.map((governorate, index) => <tr key={governorate.id}><td className="p-3 text-gray-400">{index + 1}</td><td className="p-3 font-bold">{governorate.name_ar}</td><td className="p-3" dir="ltr">{governorate.name_en}</td><td className="p-3">{governorate.usage_count || 0}</td><td className="p-3"><div className="flex gap-1.5"><button onClick={() => handleEdit(governorate)} className="w-8 h-8 rounded-md border border-gray-300 text-teal-700 flex items-center justify-center" title={tr('تعديل', 'Edit')}><Edit3 className="w-4 h-4" /></button><button disabled={(governorate.usage_count || 0) > 0} onClick={() => handleDelete(governorate)} className="w-8 h-8 rounded-md border border-rose-200 text-rose-600 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed" title={(governorate.usage_count || 0) > 0 ? tr('لا يمكن حذف محافظة مستخدمة', 'Used governorates cannot be deleted') : tr('حذف', 'Delete')}><Trash2 className="w-4 h-4" /></button></div></td></tr>)}{!loading && governorates.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">{tr('لا توجد محافظات معرفة.', 'No governorates defined.')}</td></tr>}</tbody></table></div>
    </section>}

    {activeTab === 'ocr' && <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><Cpu className="w-4 h-4 text-teal-600" />{tr('Microsoft Azure Vision OCR', 'Microsoft Azure Vision OCR')}</h3>
            <p className="mt-1 text-xs text-gray-500">{tr('تُرسل صور العدادات إلى Azure من الخادم فقط، ولا يظهر مفتاح الوصول في المتصفح.', 'Odometer images are sent to Azure by the server only. The access key is never returned to the browser.')}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border ${azureKeyConfigured ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <ShieldCheck className="w-4 h-4" />
            {azureKeyConfigured ? tr('المفتاح مشفر ومحفوظ', 'Encrypted key configured') : tr('المفتاح غير محفوظ', 'Key not configured')}
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveAzureOcr} className="p-5 space-y-4 max-w-3xl">
        {ocrMessage && <div className={`p-3 rounded-md text-xs border ${ocrMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{ocrMessage.text}</div>}

        <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
          {tr('نقطة اتصال Azure', 'Azure Endpoint')}
          <input value={azureEndpoint} onChange={(event) => setAzureEndpoint(event.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono" placeholder="https://resource.cognitiveservices.azure.com/" required />
        </label>

        <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
          {tr('المنطقة', 'Region')}
          <input value={azureRegion} onChange={(event) => setAzureRegion(event.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono" placeholder="eastus" required />
        </label>

        <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
          {tr('مفتاح Azure (KEY 1 أو KEY 2)', 'Azure Key (KEY 1 or KEY 2)')}
          <div className="relative mt-1">
            <input
              type={showAzureKey ? 'text' : 'password'}
              value={azureKey}
              onChange={(event) => { setAzureKey(event.target.value); setClearAzureKey(false); }}
              dir="ltr"
              autoComplete="new-password"
              className="w-full px-3 py-2.5 pe-11 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              placeholder={azureKeyConfigured ? tr('اتركه فارغاً للاحتفاظ بالمفتاح الحالي', 'Leave blank to keep the current key') : tr('أدخل المفتاح', 'Enter the key')}
            />
            <button type="button" onClick={() => setShowAzureKey((visible) => !visible)} className="absolute end-1 top-1 w-8 h-8 flex items-center justify-center text-gray-500" title={showAzureKey ? tr('إخفاء المفتاح', 'Hide key') : tr('إظهار المفتاح', 'Show key')}>
              {showAzureKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="block mt-1 text-[10px] text-gray-500">{tr('يُشفّر المفتاح باستخدام AES-256-GCM قبل تخزينه في قاعدة البيانات. لا يمكن استخدام التجزئة أحادية الاتجاه لأن الخادم يحتاج المفتاح للاتصال بـ Azure.', 'The key is encrypted with AES-256-GCM before database storage. One-way hashing cannot be used because the server must retrieve the key to call Azure.')}</span>
          <span className="block mt-1 text-[10px] text-amber-700">{tr('احتفظ بنسخة آمنة من ملف config/dtms_secret.key مع نسخ الاستعادة؛ بدونه لا يمكن فك تشفير المفتاح بعد نقل قاعدة البيانات إلى خادم آخر.', 'Keep config/dtms_secret.key in secure recovery backups. Without it, the Azure key cannot be decrypted after moving the database to another server.')}</span>
        </label>

        {azureKeyConfigured && <label className="flex items-center gap-2 text-xs text-rose-700 cursor-pointer">
          <input type="checkbox" checked={clearAzureKey} onChange={(event) => { setClearAzureKey(event.target.checked); if (event.target.checked) setAzureKey(''); }} className="w-4 h-4 accent-rose-600" />
          {tr('إزالة مفتاح Azure المحفوظ', 'Remove the stored Azure key')}
        </label>}

        <div className="pt-3 border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button disabled={ocrLoading} type="submit" className="px-5 py-2.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{ocrLoading ? tr('جاري الحفظ...', 'Saving...') : tr('حفظ وتفعيل Azure OCR', 'Save and Enable Azure OCR')}</button>
        </div>
      </form>
    </section>}

    {activeTab === 'backup' && <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden"><BackupModal embedded onRefreshData={onRefreshData} /></section>}
    {activeTab === 'audit' && <AuditLogsViewer />}
  </div>;
};
