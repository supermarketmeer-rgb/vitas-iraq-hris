import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  Car,
  MapPin,
  CheckCircle2,
  Trash2,
  Edit,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Governorate, Office } from '../types';
import { DtmsStorage } from '../utils/storage';
import { fetchGovernorates } from '../utils/apiSync';
import { getLang } from '../utils/i18n';
import { ModernToast, ToastState } from './ModernToast';

interface OfficesManagerProps {
  onRefreshData?: () => void;
}

export const OfficesManager: React.FC<OfficesManagerProps> = ({ onRefreshData }) => {
  const [offices, setOffices] = useState<Office[]>(DtmsStorage.getOffices());
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const drivers = DtmsStorage.getDrivers();
  const vehicles = DtmsStorage.getVehicles();
  const lang = getLang();

  const tr = (ar: string, en: string) => (lang === 'en' ? en : ar);

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [deletingOffice, setDeletingOffice] = useState<Office | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [governorateId, setGovernorateId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    void fetchGovernorates().then((rows) => {
      const available = rows.map((row: Governorate) => ({ ...row, id: String(row.id) }));
      setGovernorates(available);
      setGovernorateId((current) => current || available[0]?.id || '');
    });
  }, []);

  const resolveGovernorateId = (office: Office) => {
    const officeNames = [office.governorate, office.governorate_en]
      .filter(Boolean)
      .map((value) => String(value).trim().toLocaleLowerCase());
    return governorates.find((item) => [item.name_ar, item.name_en].some((value) => {
      const candidate = value.trim().toLocaleLowerCase();
      return officeNames.some((officeName) => officeName === candidate || officeName.includes(candidate) || candidate.includes(officeName));
    }))?.id || '';
  };

  const refreshList = () => {
    setOffices(DtmsStorage.getOffices());
    if (onRefreshData) onRefreshData();
  };

  const handleOpenAdd = () => {
    setEditingOffice(null);
    setName('');
    setNameEn('');
    setGovernorateId(governorates[0]?.id || '');
    setAddress('');
    setPhone('');
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (office: Office) => {
    setEditingOffice(office);
    setName(office.name);
    setNameEn(office.name_en || '');
    setGovernorateId(resolveGovernorateId(office));
    setAddress(office.address);
    setPhone(office.phone || '');
    setStatus(office.status || 'active');
    setShowModal(true);
  };

  const handleSaveOffice = (e: React.FormEvent) => {
    e.preventDefault();

    const isEdit = !!editingOffice;
    const targetName = name.trim();
    const selectedGovernorate = governorates.find((item) => item.id === governorateId);
    if (!selectedGovernorate) return;

    // Show ongoing operation toast
    setToast({
      type: 'loading',
      title: isEdit ? tr('جاري حفظ تعديلات المكتب...', 'Saving office updates...') : tr('جاري تسجيل المكتب الجديد...', 'Registering new office...'),
      message: `${tr('المكتب:', 'Office:')} ${targetName}`,
      timestamp: Date.now(),
    });

    const officeData: Office = {
      id: editingOffice ? editingOffice.id : 'off-' + Date.now(),
      name: targetName,
      name_en: nameEn.trim(),
      governorate: selectedGovernorate.name_ar,
      governorate_en: selectedGovernorate.name_en,
      address: address.trim(),
      phone: phone.trim() || '07700000000',
      status,
      created_at: editingOffice ? editingOffice.created_at : new Date().toISOString(),
    };

    DtmsStorage.saveOffice(officeData);
    refreshList();
    setShowModal(false);

    setToast({
      type: 'success',
      title: isEdit ? tr('تم تحديث بيانات المكتب بنجاح', 'Office updated successfully') : tr('تمت إضافة المكتب بنجاح', 'Office added successfully'),
      message: isEdit
        ? tr(`تم حفظ وتعديل بيانات "${targetName}" بنجاح في النظام.`, `Data for "${targetName}" updated successfully.`)
        : tr(`تم تسجيل مكتب "${targetName}" وتفعيله بنجاح.`, `Office "${targetName}" registered and activated successfully.`),
      timestamp: Date.now(),
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingOffice) return;

    const targetOffice = deletingOffice;
    DtmsStorage.deleteOffice(targetOffice.id);
    refreshList();
    setDeletingOffice(null);

    setToast({
      type: 'success',
      title: tr('تم حذف المكتب بنجاح', 'Office deleted successfully'),
      message: tr(`تم حذف مكتب "${targetOffice.name}" وكافة سجلاته التابعة بنجاح.`, `Office "${targetOffice.name}" and all related records deleted.`),
      timestamp: Date.now(),
    });
  };

  const filteredOffices = offices.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.name_en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.governorate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.governorate_en || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-16">
      {/* Modern Toast Notification */}
      <ModernToast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>{tr('إدارة المكاتب والفروع الجغرافية', 'Offices & Branches Management')}</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {tr('توزيع المقرات، ربط السائقين وسياراتهم، وتحديث بيانات المكاتب', 'Manage locations, link drivers and vehicles, and update branch data')}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{tr('إضافة مكتب جديد', 'Add New Office')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={tr('ابحث باسم المكتب أو المحافظة...', 'Search by office name or governorate...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          />
        </div>
      </div>

      {/* Table of Offices (Replaced Grid) */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right" dir="auto">
            <thead className="bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-b border-gray-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="p-3.5 text-start">{tr('اسم المكتب والفرع', 'Office / Branch Name')}</th>
                <th className="p-3.5 text-start">{tr('إحصائيات المكتب', 'Office Stats')}</th>
                <th className="p-3.5 text-start">{tr('رقم الهاتف', 'Phone Number')}</th>
                <th className="p-3.5 text-start">{tr('حالة الفرع', 'Status')}</th>
                <th className="p-3.5 text-center">{tr('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-start">
              {filteredOffices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    {tr('لا توجد مكاتب مطابقة للبحث', 'No offices found matching your search')}
                  </td>
                </tr>
              ) : (
                filteredOffices.map((office) => {
                  const officeDrivers = drivers.filter((d) => d.office_id === office.id);
                  const officeVehicles = vehicles.filter((v) => v.office_id === office.id);

                  return (
                    <tr key={office.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                          {lang === 'en' ? office.name_en || office.name : office.name}
                        </div>
                        <div className="text-teal-600 dark:text-teal-400 font-semibold text-[11px] mt-1">
                          {lang === 'en' ? office.governorate_en || office.governorate : office.governorate} • {office.address}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-teal-600" />
                            <span>{officeDrivers.length} {tr('سائق (السائقون الملحقون)', 'Driver(s) Assigned')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-teal-600" />
                            <span>{officeVehicles.length} {tr('سيارة (سيارات السائقين)', 'Vehicle(s) Assigned')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-[11px] text-gray-600 dark:text-gray-300">
                        <span className="font-mono text-gray-800 dark:text-gray-200">{office.phone || '-'}</span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            office.status === 'inactive'
                              ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {office.status === 'inactive' ? tr('غير نشط', 'Inactive') : tr('نشط', 'Active')}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(office)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 text-gray-500 transition-colors cursor-pointer"
                            title={tr('تعديل المكتب', 'Edit Office')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingOffice(office)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-rose-500 hover:text-rose-600 text-gray-500 transition-colors cursor-pointer"
                            title={tr('حذف المكتب', 'Delete Office')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                {editingOffice ? <Edit className="w-4 h-4 text-teal-300" /> : <Building2 className="w-4 h-4 text-teal-300" />}
                <h3 className="font-bold text-sm">
                  {editingOffice ? tr(`تعديل بيانات: ${editingOffice.name}`, `Edit Details: ${editingOffice.name_en || editingOffice.name}`) : tr('إضافة مكتب أو فرع جديد', 'Add New Office')}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOffice} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('اسم المكتب / الفرع (عربي):', 'Office Name (Arabic):')}</label>
                  <input
                    type="text"
                    required
                    placeholder={tr('مثال: مكتب النجف الأشرف...', 'e.g., Najaf Office...')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('اسم المكتب / الفرع (إنجليزي):', 'Office Name (English):')}</label>
                  <input
                    type="text"
                    placeholder="e.g., Najaf Office..."
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('المحافظة:', 'Governorate:')}</label>
                <select
                  required
                  value={governorateId}
                  onChange={(e) => setGovernorateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="">{tr('اختر المحافظة', 'Select governorate')}</option>
                  {governorates.map((item) => (
                    <option key={item.id} value={item.id}>{lang === 'en' ? item.name_en : item.name_ar}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('العنوان التفصيلي:', 'Detailed Address:')}</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('رقم الهاتف:', 'Phone Number:')}</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              {editingOffice && (
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('حالة الفرع:', 'Branch Status:')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="active">{tr('نشط ومفعل للرحلات', 'Active & enabled for trips')}</option>
                    <option value="inactive">{tr('معطل مؤقتاً', 'Temporarily disabled')}</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingOffice ? tr('حفظ التعديلات', 'Save Changes') : tr('تسجيل المكتب', 'Register Office')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {tr('تأكيد حذف المكتب', 'Confirm Office Deletion')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tr('هل أنت متأكد من رغبتك في حذف هذا المكتب نهائياً؟', 'Are you sure you want to permanently delete this office?')}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('اسم المكتب:', 'Office Name:')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{lang === 'en' ? deletingOffice.name_en || deletingOffice.name : deletingOffice.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('المحافظة:', 'Governorate:')}</span>
                <span className="text-gray-700 dark:text-gray-300">{lang === 'en' ? deletingOffice.governorate_en || deletingOffice.governorate : deletingOffice.governorate}</span>
              </div>
              {drivers.filter((d) => d.office_id === deletingOffice.id).length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {tr(`تنبيه: يوجد ${drivers.filter((d) => d.office_id === deletingOffice.id).length} سائق مرتبط بهذا المكتب حالياً.`, `Warning: There are ${drivers.filter((d) => d.office_id === deletingOffice.id).length} drivers currently assigned to this office.`)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingOffice(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {tr('إلغاء الأمر', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('تأكيد الحذف', 'Confirm Deletion')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
