import React, { useState } from 'react';
import {
  Users, Plus, Search, Building2, AlertTriangle, CheckCircle2, Trash2, Edit, X,
} from 'lucide-react';
import { Driver, DriverStatus, User, Office, Vehicle } from '../types';
import { DtmsStorage } from '../utils/storage';
import { ModernToast, ToastState } from './ModernToast';
import { isSameOffice, isOfficeRestricted } from '../utils/officeUtils';
import { t, getLang } from '../utils/i18n';

interface DriversManagerProps {
  onRefreshData?: () => void;
  currentUser?: User | null;
}

export const DriversManager: React.FC<DriversManagerProps> = ({ onRefreshData, currentUser }) => {
  const isEn = getLang() === 'en';
  const tr = (ar: string, en: string) => (isEn ? en : ar);
  const [drivers, setDrivers] = useState<Driver[]>(DtmsStorage.getDrivers());
  const [offices, setOffices] = useState<Office[]>(DtmsStorage.getOffices());
  const [vehicles, setVehicles] = useState<Vehicle[]>(DtmsStorage.getVehicles());

  const isSupervisor = isOfficeRestricted(currentUser);
  const userOfficeId = currentUser?.office_id;
  const userOffice = isSupervisor ? offices.find((o) => isSameOffice(o.id, userOfficeId)) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [empNo, setEmpNo] = useState('');
  const [officeId, setOfficeId] = useState(offices[0]?.id || '');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseType, setLicenseType] = useState('خصوصي');
  const [licenseExpiry, setLicenseExpiry] = useState('2027-05-15');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('available');
  const [formError, setFormError] = useState<string | null>(null);

  const refreshList = () => {
    setDrivers(DtmsStorage.getDrivers());
    setOffices(DtmsStorage.getOffices());
    setVehicles(DtmsStorage.getVehicles());
    if (onRefreshData) onRefreshData();
  };

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormError(null);
    setFullName('');
    setPhone('');
    setEmpNo('');
    const latestOffices = DtmsStorage.getOffices();
    setOffices(latestOffices);
    setVehicles(DtmsStorage.getVehicles());
    const defaultOffice = isSupervisor && userOfficeId ? String(userOfficeId) : (latestOffices[0]?.id || '');
    setOfficeId(defaultOffice);
    setLicenseNo('');
    setLicenseType('خصوصي');
    setLicenseExpiry('2027-05-15');
    setAssignedVehicleId('');
    setDriverStatus('available');
    setShowModal(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormError(null);
    setOffices(DtmsStorage.getOffices());
    setVehicles(DtmsStorage.getVehicles());
    setFullName(driver.full_name);
    setPhone(driver.phone || '');
    setEmpNo(driver.employee_no);
    setOfficeId(driver.office_id);
    setLicenseNo(driver.license_no);
    setLicenseType(driver.license_type || 'خصوصي');
    setLicenseExpiry(driver.license_expiry);
    setAssignedVehicleId(driver.assigned_vehicle_id || '');
    setDriverStatus(driver.status || 'available');
    setShowModal(true);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isEdit = !!editingDriver;
    const targetName = fullName.trim();
    const targetEmpNo = empNo.trim().toLowerCase();
    const targetLicenseNo = licenseNo.trim().toLowerCase();

    const empConflict = drivers.some(
      (d) => (!editingDriver || d.id !== editingDriver.id) && d.employee_no.trim().toLowerCase() === targetEmpNo
    );
    if (empConflict) {
      setFormError(tr('قاعدة العمل: لا يمكن تكرار الرقم الوظيفي لسائق آخر!', 'Business Rule: Employee Number must be unique!'));
      return;
    }

    const licenseConflict = drivers.some(
      (d) => (!editingDriver || d.id !== editingDriver.id) && d.license_no.trim().toLowerCase() === targetLicenseNo
    );
    if (licenseConflict) {
      setFormError(tr('قاعدة العمل: لا يمكن تكرار رقم رخصة القيادة لسائق آخر!', 'Business Rule: License Number must be unique!'));
      return;
    }

    setToast({
      type: 'loading',
      title: isEdit ? tr('جاري حفظ تعديلات بيانات السائق...', 'Saving driver details...') : tr('جاري تسجيل السائق الجديد...', 'Registering new driver...'),
      message: `${tr('السائق:', 'Driver:')} ${targetName}`,
      timestamp: Date.now(),
    });

    const driverData: Driver = {
      id: editingDriver ? editingDriver.id : 'drv-' + Date.now(),
      user_id: editingDriver ? editingDriver.user_id : 'usr-' + Date.now(),
      full_name: targetName,
      phone: phone.trim() || '07700000000',
      employee_no: empNo.trim(),
      office_id: officeId,
      license_no: licenseNo.trim(),
      license_type: licenseType,
      license_expiry: licenseExpiry,
      photo_url: undefined,
      license_photo_url: undefined,
      assigned_vehicle_id: assignedVehicleId || undefined,
      status: driverStatus,
      total_distance_km: editingDriver ? editingDriver.total_distance_km : 0,
      total_trips_count: editingDriver ? editingDriver.total_trips_count : 0,
      rating: editingDriver ? editingDriver.rating : 5.0,
      created_at: editingDriver ? editingDriver.created_at : new Date().toISOString(),
    };

    DtmsStorage.saveDriver(driverData);

    if (assignedVehicleId) {
      const targetVeh = vehicles.find((v) => v.id === assignedVehicleId);
      if (targetVeh) {
        DtmsStorage.saveVehicle({
          ...targetVeh,
          assigned_driver_id: driverData.id,
          office_id: officeId || targetVeh.office_id,
        });
      }
    } else if (editingDriver?.assigned_vehicle_id) {
      const oldVeh = vehicles.find((v) => v.id === editingDriver.assigned_vehicle_id);
      if (oldVeh && oldVeh.assigned_driver_id === editingDriver.id) {
        DtmsStorage.saveVehicle({ ...oldVeh, assigned_driver_id: undefined });
      }
    }

    refreshList();
    setShowModal(false);

    setToast({
      type: 'success',
      title: isEdit ? tr('تم تحديث بيانات السائق بنجاح', 'Driver updated successfully') : tr('تم تسجيل السائق بنجاح', 'Driver registered successfully'),
      message: isEdit
        ? tr(`تم حفظ وتعديل بيانات السائق "${targetName}" بنجاح.`, `Driver details for "${targetName}" saved successfully.`)
        : tr(`تم تسجيل السائق "${targetName}" وإدراجه في النظام بنجاح.`, `Driver "${targetName}" was added successfully.`),
      timestamp: Date.now(),
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingDriver) return;

    const targetDriver = deletingDriver;
    DtmsStorage.deleteDriver(targetDriver.id);

    const driverVehicle = vehicles.find((v) => v.assigned_driver_id === targetDriver.id);
    if (driverVehicle) {
      DtmsStorage.saveVehicle({ ...driverVehicle, assigned_driver_id: undefined });
    }

    refreshList();
    setDeletingDriver(null);

    setToast({
      type: 'success',
      title: tr('تم حذف السائق بنجاح', 'Driver deleted successfully'),
      message: tr(`تم حذف السائق "${targetDriver.full_name}" من سجلات النظام.`, `Driver "${targetDriver.full_name}" has been deleted.`),
      timestamp: Date.now(),
    });
  };

  const isLicenseExpiringSoon = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const getStatusBadge = (status: DriverStatus) => {
    switch (status) {
      case 'available':
        return { label: tr('متاح للرحلات', 'Available'), style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'on_trip':
        return { label: tr('في رحلة حالياً', 'On Trip'), style: 'bg-teal-600 text-white font-bold animate-pulse' };
      case 'suspended':
        return { label: tr('موقوف إدارياً', 'Suspended'), style: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
      default:
        return { label: tr('متاح للرحلات', 'Available'), style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    }
  };

  const filteredDrivers = drivers.filter((d) => {
    if (isSupervisor && !isSameOffice(d.office_id, userOfficeId)) {
      return false;
    }
    const matchesSearch =
      d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.employee_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.license_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffice = isSupervisor ? true : (filterOffice === 'all' || isSameOffice(d.office_id, filterOffice));
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesOffice && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-16">
      <ModernToast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>{isSupervisor ? `${tr('سائقو', 'Drivers of')} ${userOffice?.name || tr('المكتب', 'Office')}` : t('drivers_manager_title')}</span>
            {isSupervisor && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                {userOffice?.governorate || tr('مخصص للمكتب', 'Assigned to Office')}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isSupervisor
              ? tr(`عرض ومتابعة السائقين التابعين لـ ${userOffice?.name || 'مكتبك'} فقط`, `View and monitor drivers assigned to ${userOffice?.name || 'your office'} only`)
              : t('drivers_manager_desc')}
          </p>
        </div>

      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('drivers_search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {isSupervisor ? (
            <div className="px-3 py-2 text-xs rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{(userOffice?.name || '').split('-')[0]?.trim() || userOffice?.name || tr('مكتبك', 'Your Office')}</span>
            </div>
          ) : (
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
            >
              <option value="all">{t('all_offices_filter')} ({offices.length})</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          >
            <option value="all">{t('all_statuses_driver')}</option>
            <option value="available">{t('available_status')}</option>
            <option value="on_trip">{t('on_trip_status')}</option>
            <option value="suspended">{t('suspended_status')}</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right" dir="auto">
            <thead className="bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-b border-gray-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="p-3.5 text-start">{tr('اسم السائق', 'Driver Name')}</th>
                <th className="p-3.5 text-start">{tr('المكتب', 'Office')}</th>
                <th className="p-3.5 text-start">{tr('رخصة القيادة', 'License No.')}</th>
                <th className="p-3.5 text-start">{tr('حالة السائق', 'Status')}</th>
                <th className="p-3.5 text-center">{tr('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-start">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    {tr('لا يوجد سائقين مطابقين للبحث', 'No drivers found matching your search')}
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const office = offices.find((o) => o.id === driver.office_id);
                  const statusBadge = getStatusBadge(driver.status);
                  const isExpiring = isLicenseExpiringSoon(driver.license_expiry);

                  return (
                    <tr key={driver.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 dark:text-white">{driver.full_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{driver.employee_no}</div>
                      </td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-300">
                        {office?.name || tr('مكتب غير محدد', 'Unassigned')}
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-gray-900 dark:text-gray-200">{driver.license_no}</div>
                        <div className={`text-[10px] mt-0.5 ${isExpiring ? 'text-amber-600 font-bold flex items-center gap-1' : 'text-gray-500'}`}>
                          {isExpiring && <AlertTriangle className="w-3 h-3" />}
                          {tr('صلاحية:', 'Expiry:')} {driver.license_expiry}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge.style}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(driver)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 text-gray-500 transition-colors cursor-pointer"
                            title={t('edit_action')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingDriver(driver)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-rose-500 hover:text-rose-600 text-gray-500 transition-colors cursor-pointer"
                            title={t('delete_action')}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                {editingDriver ? <Edit className="w-4 h-4 text-teal-300" /> : <Users className="w-4 h-4 text-teal-300" />}
                <h3 className="font-bold text-sm">
                  {editingDriver ? `${tr('تعديل بيانات السائق:', 'Edit Driver Details:')} ${editingDriver.full_name}` : tr('تسجيل وإضافة سائق جديد', 'Register New Driver')}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('الاسم الرباعي واللقب:', 'Full Name:')}</label>
                <input
                  type="text"
                  required
                  placeholder={tr('مثال: حيدر كريم جاسم...', 'e.g., John Doe...')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('الرقم الوظيفي (فريد):', 'Employee ID (Unique):')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={tr('مثال: EMP-905', 'e.g. EMP-905')}
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('رقم الهاتف:', 'Phone Number:')}</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('المكتب التابع له:', 'Assigned Office:')}</label>
                  {isSupervisor ? (
                    <div className="w-full px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate">{userOffice?.name || tr('مكتبك المخصص', 'Your Assigned Office')}</span>
                    </div>
                  ) : (
                    <select
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                    >
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('رقم رخصة القيادة (فريد):', 'Driver License No (Unique):')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={tr('مثال: LIC-84729', 'e.g. LIC-84729')}
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('فئة رخصة القيادة:', 'License Category:')}</label>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="خصوصي">{tr('خصوصي (افتراضي)', 'Private (Default)')}</option>
                    <option value="عمومي">{tr('عمومي', 'Public')}</option>
                    <option value="عمومي فئة أولى">{tr('عمومي فئة أولى', 'Public - Class A')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('تاريخ انتهاء الرخصة:', 'License Expiry Date:')}
                  </label>
                  <input
                    type="date"
                    required
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {tr('سيارة السائق الخاصة (المعتمدة في النظام):', 'Assigned Vehicle (Registered in System):')}
                </label>
                <select
                  value={assignedVehicleId}
                  onChange={(e) => setAssignedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="">{tr('-- اختر السيارة المعتمدة للسائق --', '-- Select Assigned Vehicle --')}</option>
                  {(() => {
                    const sameOfficeVehicles = vehicles.filter((v) => !officeId || isSameOffice(v.office_id, officeId));
                    const otherOfficeVehicles = vehicles.filter((v) => officeId && !isSameOffice(v.office_id, officeId));
                    const currentOfficeName = offices.find((o) => isSameOffice(o.id, officeId))?.name || tr('المكتب المحدد', 'Selected Office');

                    return (
                      <>
                        {sameOfficeVehicles.length > 0 && (
                          <optgroup label={tr(`سيارات تابعة لـ (${currentOfficeName})`, `Vehicles belonging to (${currentOfficeName})`)}>
                            {sameOfficeVehicles.map((v) => {
                              const isOther = v.assigned_driver_id && v.assigned_driver_id !== editingDriver?.id;
                              const driverName = isOther ? drivers.find((d) => d.id === v.assigned_driver_id)?.full_name : null;
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.vehicle_type} - {v.plate_no} ({v.model || v.year}) {driverName ? tr(`[مخصصة لـ ${driverName}]`, `[Assigned to ${driverName}]`) : tr('[متاحة]', '[Available]')}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {otherOfficeVehicles.length > 0 && (
                          <optgroup label={tr("سيارات من مكاتب أخرى (سيتم نقل ربطها لهذا المكتب)", "Vehicles from other offices (Will be reassigned)")}>
                            {otherOfficeVehicles.map((v) => {
                              const offName = offices.find((o) => isSameOffice(o.id, v.office_id))?.name || tr('مكتب آخر', 'Other Office');
                              const isOther = v.assigned_driver_id && v.assigned_driver_id !== editingDriver?.id;
                              const driverName = isOther ? drivers.find((d) => d.id === v.assigned_driver_id)?.full_name : null;
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.vehicle_type} - {v.plate_no} [{offName}] {driverName ? tr(`[مخصصة لـ ${driverName}]`, `[Assigned to ${driverName}]`) : tr('[متاحة]', '[Available]')}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {tr('تظهر جميع سيارات الأسطول مع إمكانية تعيين أي سيارة وسيقوم النظام بنقل ربطها المكتبي تلقائياً.', 'All fleet vehicles are shown. The system will automatically update the vehicle\'s office assignment if changed.')}
                </p>
              </div>

              {editingDriver && (
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('حالة السائق:', 'Driver Status:')}</label>
                  <select
                    value={driverStatus}
                    onChange={(e) => setDriverStatus(e.target.value as DriverStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="available">{tr('متاح للرحلات', 'Available')}</option>
                    <option value="on_trip">{tr('في رحلة حالياً', 'On Trip')}</option>
                    <option value="suspended">{tr('موقوف إدارياً', 'Suspended')}</option>
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
                  <span>{editingDriver ? tr('حفظ التعديلات', 'Save Changes') : tr('تسجيل السائق', 'Register Driver')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {tr('تأكيد حذف السائق', 'Confirm Driver Deletion')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tr('هل أنت متأكد من رغبتك في حذف هذا السائق نهائياً؟', 'Are you sure you want to permanently delete this driver?')}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('اسم السائق:', 'Driver Name:')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{deletingDriver.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('الرقم الوظيفي:', 'Employee No:')}</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{deletingDriver.employee_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('رخصة القيادة:', 'License No:')}</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{deletingDriver.license_no}</span>
              </div>
              {deletingDriver.status === 'on_trip' && (
                <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {tr('تنبيه أمني: هذا السائق في رحلة نشطة حالياً، يرجى إنهاء الرحلة قبل الحذف.', 'Security Alert: This driver is currently on an active trip, please complete the trip before deleting.')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDriver(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {tr('إلغاء الأمر', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('تأكيد الحذف', 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
