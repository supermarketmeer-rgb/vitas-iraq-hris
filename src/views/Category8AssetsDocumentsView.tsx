import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';

export const Category8AssetsDocumentsView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    assetRecords,
    addAssetRecord,
    documentRecords,
    addDocumentRecord,
    currentUser,
    t
  } = useApp();

  // Asset Form State
  const [assetName, setAssetName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [assetCat, setAssetCat] = useState<'أجهزة حاسوب' | 'هواتف' | 'أثاث' | 'مركبات' | 'معدات شبكة'>('أجهزة حاسوب');
  const [serialNum, setSerialNum] = useState('');
  const [branch, setBranch] = useState('بغداد - المقر الرئيسي');

  // Document Form State
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'عقد' | 'سياسة' | 'هوية' | 'شهادة' | 'تقرير'>('عقد');
  const [dept, setDept] = useState('الموارد البشرية');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;
    addAssetRecord({
      assetTag: assetTag || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: assetName,
      category: assetCat,
      serialNumber: serialNum || 'SN-9008112',
      branch,
      status: 'متاح',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setAssetName('');
    setAssetTag('');
    setSerialNum('');
    setActiveModuleId('asset-inventory');
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;
    addDocumentRecord({
      docNumber: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: docTitle,
      type: docType,
      department: dept,
      uploadedBy: currentUser.name,
      fileSize: '1.4 MB',
      category: 'وثائق رسمية'
    });
    setDocTitle('');
    setActiveModuleId('doc-mgmt');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="dark-banner p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400">folder_copy</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">
              ASSETS & ENTERPRISE DOCUMENTS
            </span>
          </div>
          <h1 className="text-2xl font-black text-white text-white-force drop-shadow-sm">
            {activeModuleId === 'asset-inventory' && t('إدارة مخزون العهد والأصول الرقمية والمكتبية', 'Asset & Office Inventory Management')}
            {activeModuleId === 'asset-my-requests' && t('طلبات العهد والأجهزة الخاصة بي', 'My Asset & Device Requests')}
            {activeModuleId === 'asset-details' && t('تفاصيل العهدة وحالة الصيانة والتخصيص', 'Asset Details, Maintenance & Allocation')}
            {activeModuleId === 'doc-mgmt' && t('نظام إدارة وأرشيف الوثائق والمستندات (DMS)', 'Document Management & Archiving System (DMS)')}
            {activeModuleId === 'doc-edms' && t('بوابة الأرشفة الإلكترونية المتقدمة (EDMS Portal)', 'Electronic Document Management Portal (EDMS)')}
            {activeModuleId === 'doc-my-docs' && t('مستنداتي الشخصية الرسمية والعقود', 'My Official Documents & Contracts')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('تتبع دقيق وموثق لعهد ومستندات شركة فيتاس العراق', 'Accurate tracking & archiving for VITAS Iraq assets and documents')}
          </p>
        </div>
      </div>

      {activeModuleId === 'asset-inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              {t(`الأصول والعهد المسجلة (${assetRecords.length})`, `Registered Assets (${assetRecords.length})`)}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="material-symbols-outlined text-teal-400">add_to_photos</span>
                {t('تسجيل عهدة / أصل جديد', 'Register New Asset')}
              </h3>

              <form onSubmit={handleAddAsset} className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t('اسم العهدة / الجهاز *', 'Asset / Device Name *')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('حاسوب محمول Dell Latitude 5540', 'e.g. Dell Latitude 5540 Laptop')}
                    value={assetName}
                    onChange={e => setAssetName(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('رمز الأصول (Tag Number)', 'Asset Tag Number')}</label>
                  <input
                    type="text"
                    placeholder="VTS-AST-908"
                    value={assetTag}
                    onChange={e => setAssetTag(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-teal-400 font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('فئة العهدة', 'Asset Category')}</label>
                  <select
                    value={assetCat}
                    onChange={e => setAssetCat(e.target.value as any)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="أجهزة حاسوب">{t('أجهزة حاسوب', 'Computers & Laptops')}</option>
                    <option value="هواتف">{t('هواتف وذكية', 'Mobile & Smart Devices')}</option>
                    <option value="أثاث">{t('أثاث مكتبي', 'Office Furniture')}</option>
                    <option value="مركبات">{t('مركبات وسيارات ميدانية', 'Vehicles & Field Cars')}</option>
                    <option value="معدات شبكة">{t('معدات شبكة وسيرفرات', 'Network Equipment & Servers')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('الرقم التسلسلي (Serial Number)', 'Serial Number')}</label>
                  <input
                    type="text"
                    placeholder="SN-XXXXXXXX"
                    value={serialNum}
                    onChange={e => setSerialNum(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
                >
                  {t('حفظ العهدة في المخزون', 'Save Asset to Inventory')}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              {assetRecords.length === 0 ? (
                <EmptyState
                  icon="inventory_2"
                  title={t('مخزون الأصول فارغ حالياً', 'Asset Inventory Empty')}
                  description={t('لم يتم تسجيل أي أصول أو عهد في السجل الحقيقي بعد.', 'No assets or inventory items have been registered yet.')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {assetRecords.map(asset => (
                    <div key={asset.id} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 space-y-2 shadow-sm">
                      <div className="flex justify-between font-bold text-white">
                        <span>{asset.name}</span>
                        <span className="text-teal-400 font-mono text-[10px]">{asset.assetTag}</span>
                      </div>
                      <p className="text-slate-400">{t('الفئة:', 'Category:')} {asset.category} • {t('الرقم التسلسلي:', 'S/N:')} <span className="font-mono text-slate-300">{asset.serialNumber}</span></p>
                      <div className="pt-2 border-t border-white/5 flex justify-between text-[10px]">
                        <span className="text-emerald-400 font-bold">{t('الحالة:', 'Status:')} {asset.status}</span>
                        <span className="text-slate-500">{asset.branch}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModuleId === 'doc-mgmt' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Document Form */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="material-symbols-outlined text-teal-400">cloud_upload</span>
                {t('أرشفة مستند / وثيقة جديدة', 'Archive New Document')}
              </h3>

              <form onSubmit={handleAddDoc} className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t('عنوان المستند أو العقد *', 'Document Title *')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('مثال: عقد إيجار فرع النجف 2026', 'e.g. Najaf Branch Lease Contract 2026')}
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('نوع الوثيقة', 'Document Type')}</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as any)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="عقد">{t('عقد رسمّي', 'Official Contract')}</option>
                    <option value="سياسة">{t('سياسة إدارية', 'Administrative Policy')}</option>
                    <option value="هوية">{t('هوية وثيقة إثبات', 'ID Document')}</option>
                    <option value="شهادة">{t('شهادة أو ترخيص', 'Certificate / License')}</option>
                    <option value="تقرير">{t('تقرير تدقيق', 'Audit Report')}</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
                >
                  {t('رفع وأرشفة الوثيقة', 'Upload & Archive Document')}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              {documentRecords.length === 0 ? (
                <EmptyState
                  icon="folder_shared"
                  title={t('سجل إدارة المستندات فارغ', 'Document Register Empty')}
                  description={t('لا توجد أية وثائق أو عقود مؤرشفة في النظام حالياً.', 'No archived documents or contracts found.')}
                />
              ) : (
                <div className="space-y-2 text-xs">
                  {documentRecords.map(doc => (
                    <div key={doc.id} className="p-3.5 rounded-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-teal-400 text-2xl">
                          description
                        </span>
                        <div>
                          <p className="font-bold text-white">{doc.title}</p>
                          <p className="text-[10px] text-slate-400">{doc.type} • {doc.department} • {t('بواسطة', 'by')} {doc.uploadedBy}</p>
                        </div>
                      </div>
                      <div className="text-left font-mono text-[10px]">
                        <span className="text-teal-400 font-bold block">{doc.docNumber}</span>
                        <span className="text-slate-500">{doc.uploadDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(activeModuleId === 'asset-my-requests' || activeModuleId === 'asset-details') && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">devices</span>
            {t('طلبات ومتابعة العهد الشخصية', 'Personal Asset Requests & Tracking')}
          </h2>
          <EmptyState
            icon="devices_other"
            title={t('لا توجد طلبات عهد قائمة', 'No Active Asset Requests')}
            description={t('لم تقم برفع أي طلب للحصول على جهاز أو عهدة جديدة.', 'You have not submitted any asset or device requests.')}
          />
        </div>
      )}

      {(activeModuleId === 'doc-edms' || activeModuleId === 'doc-my-docs') && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">cloud_done</span>
            {t('بوابة الأرشيف والمستندات الشخصية', 'Personal Documents & Archive Portal')}
          </h2>
          <EmptyState
            icon="folder_zip"
            title={t('لا توجد مستندات شخصية مرفوعة', 'No Personal Documents Uploaded')}
            description={t('يمكنك أرشفة عقد عملك ووثائقك الشخصية هنا.', 'You can archive your employment contracts and ID documents here.')}
          />
        </div>
      )}
    </div>
  );
};
