import React, { useState, useEffect } from 'react';
import {
  Car, Plus, Search, AlertTriangle, CheckCircle2, Trash2, Edit, Calendar, Building2, Users, X, CheckCircle, AlertCircle, ShieldAlert,
} from 'lucide-react';
import { Vehicle, VehicleStatus, FuelType, OdometerUnit, User, Office, Driver } from '../types';
import { DtmsStorage } from '../utils/storage';
import { isSameOffice, isOfficeRestricted } from '../utils/officeUtils';
import { t, getLang } from '../utils/i18n';
import { normalizeOdometerUnit, odometerFromKm, odometerToKm, odometerUnitLabel, roundOdometerReading } from '../utils/odometer';

interface VehiclesManagerProps {
  onRefreshData?: () => void;
  currentUser?: User | null;
}

interface ToastState {
  type: 'success' | 'error' | 'loading';
  title: string;
  message: string;
  timestamp: number;
}

export const VehiclesManager: React.FC<VehiclesManagerProps> = ({
  onRefreshData,
  currentUser,
}) => {
  const isEn = getLang() === 'en';
  const tr = (ar: string, en: string) => (isEn ? en : ar);

  const [vehicles, setVehicles] = useState<Vehicle[]>(DtmsStorage.getVehicles());
  const [offices, setOffices] = useState<Office[]>(DtmsStorage.getOffices());
  const [drivers, setDrivers] = useState<Driver[]>(DtmsStorage.getDrivers());

  const isSupervisor = isOfficeRestricted(currentUser);
  const userOfficeId = currentUser?.office_id;
  const userOffice = isSupervisor ? offices.find((o) => isSameOffice(o.id, userOfficeId)) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Add / Edit Vehicle Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Form Fields
  const [modalVehicleNo, setModalVehicleNo] = useState('');
  const [modalCategory, setModalCategory] = useState<'خصوصي' | 'عمومي'>('خصوصي');
  const [modalStatus, setModalStatus] = useState<VehicleStatus>('available');
  const [modalType, setModalType] = useState(tr('تويوتا لاند كروزر', 'Toyota Land Cruiser'));
  const [modalModel, setModalModel] = useState('Land Cruiser VXR');
  const [modalYear, setModalYear] = useState(2023);
  const [modalPlate, setModalPlate] = useState('');
  const [modalVin, setModalVin] = useState('');
  const [modalFuel, setModalFuel] = useState<FuelType>('gasoline');
  const [modalEngine, setModalEngine] = useState('4.0L V6');
  const [modalColor, setModalColor] = useState(tr('أبيض لؤلؤي', 'Pearl White'));
  const [modalOfficeId, setModalOfficeId] = useState(offices[0]?.id || '');
  const [modalDriverId, setModalDriverId] = useState('');
  const [modalOdometer, setModalOdometer] = useState(48500);
  const [modalOdometerUnit, setModalOdometerUnit] = useState<OdometerUnit>('km');
  const [modalInsuranceDate, setModalInsuranceDate] = useState('');
  const [modalInspectionDate, setModalInspectionDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    if (toast.type === 'loading') return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshList = () => {
    setVehicles(DtmsStorage.getVehicles());
    setOffices(DtmsStorage.getOffices());
    setDrivers(DtmsStorage.getDrivers());
    if (onRefreshData) onRefreshData();
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormError(null);
    setModalVehicleNo(`V-${String(Math.floor(Math.random() * 900 + 100))}`);
    setModalCategory('خصوصي');
    setModalStatus('available');
    setModalType(tr('تويوتا لاند كروزر', 'Toyota Land Cruiser'));
    setModalModel('Land Cruiser');
    setModalYear(new Date().getFullYear());
    setModalPlate('');
    setModalVin('');
    setModalFuel('gasoline');
    setModalEngine('4.0L V6');
    setModalColor(tr('أبيض لؤلؤي', 'Pearl White'));
    const latestOffices = DtmsStorage.getOffices();
    setOffices(latestOffices);
    setDrivers(DtmsStorage.getDrivers());
    const defaultOffice = isSupervisor && userOfficeId ? String(userOfficeId) : (latestOffices[0]?.id || '');
    setModalOfficeId(defaultOffice);
    setModalDriverId('');
    setModalOdometer(10000);
    setModalOdometerUnit('km');
    setModalInsuranceDate('');
    setModalInspectionDate('');
    setShowModal(true);
  };

  const handleOpenEdit = (veh: Vehicle) => {
    setEditingVehicle(veh);
    setFormError(null);
    setOffices(DtmsStorage.getOffices());
    setDrivers(DtmsStorage.getDrivers());
    setModalVehicleNo(veh.vehicle_no || '');
    setModalCategory(veh.vehicle_category || 'خصوصي');
    setModalStatus(veh.status || 'available');
    setModalType(veh.vehicle_type || '');
    setModalModel(veh.model || '');
    setModalYear(veh.year || new Date().getFullYear());
    setModalPlate(veh.plate_no || '');
    setModalVin(veh.chassis_no || '');
    setModalFuel(veh.fuel_type || 'gasoline');
    setModalEngine(veh.engine_capacity || '4.0L V6');
    setModalColor(veh.color || tr('أبيض', 'White'));
    setModalOfficeId(veh.office_id || offices[0]?.id || '');
    setModalDriverId(veh.assigned_driver_id || '');
    const odometerUnit = normalizeOdometerUnit(veh.odometer_unit);
    setModalOdometerUnit(odometerUnit);
    setModalOdometer(roundOdometerReading(odometerFromKm(veh.last_odometer || 0, odometerUnit)));
    setModalInsuranceDate(veh.insurance_expiry || '');
    setModalInspectionDate(veh.inspection_expiry || '');
    setShowModal(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isEdit = !!editingVehicle;
    const cleanPlate = modalPlate.trim();
    const cleanVin = modalVin.trim();
    const cleanVehNo = modalVehicleNo.trim() || `V-${String(Math.floor(Math.random() * 900 + 100))}`;

    if (!cleanPlate) {
      setFormError(tr('يرجى إدخال رقم اللوحة الرسمي للمركبة!', 'Please enter the official vehicle plate number!'));
      return;
    }

    // Check duplicate plate (excluding current vehicle if editing)
    const plateConflict = vehicles.some(
      (v) =>
        (!isEdit || v.id !== editingVehicle.id) &&
        v.plate_no.trim().toLowerCase() === cleanPlate.toLowerCase()
    );
    if (plateConflict) {
      setFormError(tr('قاعدة العمل: لا يمكن تكرار رقم اللوحة! رقم اللوحة مسجل بالفعل لمركبة أخرى.', 'Business Rule: Plate number cannot be duplicated! It is already registered for another vehicle.'));
      return;
    }

    // Check duplicate vin (excluding current vehicle if editing)
    if (cleanVin) {
      const vinConflict = vehicles.some(
        (v) =>
          (!isEdit || v.id !== editingVehicle.id) &&
          (v.chassis_no || '').trim().toLowerCase() === cleanVin.toLowerCase()
      );
      if (vinConflict) {
        setFormError(tr('قاعدة العمل: لا يمكن تكرار رقم الشاصي (VIN)! رقم الشاصي موجود بالفعل.', 'Business Rule: Chassis number (VIN) cannot be duplicated! It already exists.'));
        return;
      }
    }

    setToast({
      type: 'loading',
      title: isEdit ? tr('جاري حفظ تعديلات المركبة...', 'Saving vehicle changes...') : tr('جاري إضافة المركبة الجديدة...', 'Adding new vehicle...'),
      message: `${tr('المركبة:', 'Vehicle:')} ${cleanVehNo} (${cleanPlate})`,
      timestamp: Date.now(),
    });

    const vehData: Vehicle = {
      id: isEdit ? editingVehicle.id : 'veh-' + Date.now(),
      vehicle_no: cleanVehNo,
      vehicle_type: modalType.trim(),
      vehicle_category: modalCategory,
      model: modalModel.trim(),
      year: Number(modalYear),
      plate_no: cleanPlate,
      chassis_no: cleanVin || undefined,
      fuel_type: modalFuel || undefined,
      engine_capacity: modalEngine,
      color: modalColor,
      office_id: modalOfficeId,
      assigned_driver_id: modalDriverId || undefined,
      last_odometer: roundOdometerReading(odometerToKm(modalOdometer, modalOdometerUnit)),
      odometer_unit: modalOdometerUnit,
      status: modalStatus,
      insurance_expiry: modalInsuranceDate.trim() || undefined,
      inspection_expiry: modalInspectionDate.trim() || undefined,
      maintenance_interval_km: isEdit && editingVehicle.maintenance_interval_km ? editingVehicle.maintenance_interval_km : 500,
      photos: isEdit ? editingVehicle.photos : undefined,
      created_at: isEdit && editingVehicle.created_at ? editingVehicle.created_at : new Date().toISOString(),
    };

    DtmsStorage.saveVehicle(vehData);

    // Synchronize driver assignment if changed
    const currentDrivers = DtmsStorage.getDrivers();
    currentDrivers.forEach((d) => {
      if (modalDriverId && d.id === modalDriverId) {
        if (d.assigned_vehicle_id !== vehData.id || !isSameOffice(d.office_id, vehData.office_id)) {
          d.assigned_vehicle_id = vehData.id;
          d.office_id = vehData.office_id;
          DtmsStorage.saveDriver(d);
        }
      } else if (d.assigned_vehicle_id === vehData.id) {
        d.assigned_vehicle_id = undefined;
        DtmsStorage.saveDriver(d);
      }
    });

    refreshList();
    setShowModal(false);

    setToast({
      type: 'success',
      title: isEdit ? tr('تم تحديث بيانات المركبة بنجاح', 'Vehicle data updated successfully') : tr('تم إضافة وتسجيل المركبة بنجاح', 'Vehicle added and registered successfully'),
      message: isEdit
        ? tr(`تم تحديث بيانات المركبة (${vehData.vehicle_no} - ${vehData.plate_no}) بنجاح.`, `Vehicle data (${vehData.vehicle_no} - ${vehData.plate_no}) updated successfully.`)
        : tr(`تم تسجيل وإدراج المركبة (${vehData.vehicle_no} - ${vehData.plate_no}) في الأسطول.`, `Vehicle (${vehData.vehicle_no} - ${vehData.plate_no}) registered and added to the fleet.`),
      timestamp: Date.now(),
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingVehicle) return;

    // Check if vehicle is linked to an active in-progress trip
    const trips = DtmsStorage.getTrips();
    const activeTrip = trips.find(
      (t) => t.vehicle_id === deletingVehicle.id && (t.status === 'in_progress' || t.status === 'new')
    );

    if (activeTrip) {
      setToast({
        type: 'error',
        title: tr('لا يمكن حذف المركبة!', 'Cannot delete vehicle!'),
        message: tr(`المركبة مرتبطة حالياً برحلة عمل جارية رقم (${activeTrip.trip_no}). يرجى إنهاء الرحلة أولاً.`, `The vehicle is currently linked to an ongoing business trip No. (${activeTrip.trip_no}). Please end the trip first.`),
        timestamp: Date.now(),
      });
      setDeletingVehicle(null);
      return;
    }

    const targetVeh = deletingVehicle;
    DtmsStorage.deleteVehicle(targetVeh.id);
    refreshList();
    setDeletingVehicle(null);

    setToast({
      type: 'success',
      title: tr('تم حذف المركبة بنجاح', 'Vehicle deleted successfully'),
      message: tr(`تم حذف المركبة "${targetVeh.vehicle_no}" (${targetVeh.plate_no}) من سجلات الأسطول نهائياً.`, `The vehicle "${targetVeh.vehicle_no}" (${targetVeh.plate_no}) was permanently deleted from the fleet records.`),
      timestamp: Date.now(),
    });
  };

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'available':
        return { label: tr('جاهزة للرحلات', 'Available'), style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'assigned':
        return { label: tr('في رحلة عمل', 'Assigned'), style: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' };
      case 'out_of_service':
        return { label: tr('متوقفة مؤقتاً', 'Out of Service'), style: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
      default:
        return { label: tr('جاهزة للرحلات', 'Available'), style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (isSupervisor && !isSameOffice(v.office_id, userOfficeId)) {
      return false;
    }
    const matchesSearch =
      v.vehicle_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.chassis_no || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffice = isSupervisor ? true : (filterOffice === 'all' || isSameOffice(v.office_id, filterOffice));
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || (v.vehicle_category || 'خصوصي') === filterCategory;
    return matchesSearch && matchesOffice && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-5 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm rounded-2xl shadow-2xl p-4 border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            {toast.type === 'success' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'loading' && (
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                {toast.title}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-teal-600" />
            <span>{isSupervisor ? `${tr('سيارات سائقي', 'Vehicles of Drivers')} ${userOffice?.name || tr('المكتب', 'Office')}` : tr('مركبات وسيارات السائقين', 'Drivers Vehicles & Cars')}</span>
            {isSupervisor && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                {userOffice?.governorate || tr('مخصص للمكتب', 'Office Assigned')}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isSupervisor
              ? tr(`عرض وإدارة سيارات السائقين التابعين لـ ${userOffice?.name || 'مكتبك'} فقط`, `View and manage vehicles of drivers belonging to ${userOffice?.name || 'your office'} only`)
              : tr('جميع السيارات هي ملك خاص للسائقين المعتمدين وليست ملكاً للمؤسسة', 'All vehicles are privately owned by approved drivers and do not belong to the institution')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-new-vehicle"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('تسجيل سيارة سائق', 'Register Driver Vehicle')}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={tr('ابحث برقم المركبة، رقم اللوحة، الموديل، أو الشاصي...', 'Search by vehicle number, plate number, model, or chassis...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        {isSupervisor ? (
          <div className="w-full md:w-52 px-3 py-2 text-xs rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="truncate">{(userOffice?.name || '').split('-')[0]?.trim() || userOffice?.name || tr('مكتبك', 'Your Office')}</span>
          </div>
        ) : (
          <select
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
            className="w-full md:w-44 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="all">{tr('جميع المكاتب', 'All Offices')}</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {(o?.name || '').split('-')[0]?.trim() || o?.name || tr('مكتب', 'Office')}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-44 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="all">{tr('جميع الحالات', 'All Statuses')}</option>
          <option value="available">{tr('جاهزة للرحلات', 'Available')}</option>
          <option value="assigned">{tr('في رحلة عمل', 'Assigned')}</option>
          <option value="out_of_service">{tr('متوقفة مؤقتاً', 'Out of Service')}</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full md:w-44 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="all">{tr('صنف المركبة: الكل', 'Vehicle Category: All')}</option>
          <option value="خصوصي">{tr('خصوصي (افتراضي)', 'Private (Default)')}</option>
          <option value="عمومي">{tr('عمومي', 'Public')}</option>
        </select>
      </div>

      {/* Table of Vehicles (Replaced Grid) */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right" dir="auto">
            <thead className="bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-b border-gray-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="p-3.5 text-start">{tr('المركبة و الموديل', 'Vehicle & Model')}</th>
                <th className="p-3.5 text-start">{tr('السائق المالك', 'Assigned Driver')}</th>
                <th className="p-3.5 text-start">{tr('المكتب', 'Office')}</th>
                <th className="p-3.5 text-start">{tr('معلومات إضافية', 'Additional Info')}</th>
                <th className="p-3.5 text-start">{tr('حالة المركبة', 'Status')}</th>
                <th className="p-3.5 text-center">{tr('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-start">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    {tr('لا توجد مركبات مطابقة للبحث', 'No vehicles found matching your search')}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((veh) => {
                  const office = offices.find((o) => o.id === veh.office_id);
                  const driver = drivers.find((d) => d.id === veh.assigned_driver_id);
                  const badge = getStatusBadge(veh.status);

                  return (
                    <tr key={veh.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white font-mono">
                            {veh.vehicle_no}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
                            {veh.vehicle_category === 'عمومي' ? tr('عمومي', 'Public') : tr('خصوصي', 'Private')}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-teal-700 dark:text-teal-400 mt-1">
                          {veh.vehicle_type} ({veh.year})
                        </div>
                        <div className="text-[10px] font-mono mt-1 text-gray-500 bg-gray-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">
                          {veh.plate_no}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-teal-950 dark:text-teal-100">
                          {driver?.full_name || tr('سائق غير محدد', 'Unassigned Driver')}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {tr('ملك خاص', 'Private Owner')}
                        </div>
                      </td>

                      <td className="p-3.5 text-gray-600 dark:text-gray-300 font-semibold">
                        {(office?.name || '').split('-')[0]?.trim() || office?.name || tr('المركز الرئيسي', 'Main Office')}
                      </td>

                      <td className="p-3.5 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                        <div><span className="text-gray-400">{tr('العداد:', 'Odometer:')} </span><span className="font-mono text-gray-800 dark:text-gray-200">{roundOdometerReading(odometerFromKm(veh.last_odometer, veh.odometer_unit)).toLocaleString(isEn ? 'en-US' : 'ar-IQ')} {odometerUnitLabel(normalizeOdometerUnit(veh.odometer_unit), isEn ? 'en' : 'ar')}</span></div>
                        <div>
                          <span className="text-gray-400">{tr('الوقود:', 'Fuel:')} </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {veh.fuel_type === 'gasoline' || veh.fuel_type === 'بنزين'
                              ? tr('بنزين', 'Gasoline')
                              : veh.fuel_type === 'diesel' || veh.fuel_type === 'ديزل'
                              ? tr('ديزل', 'Diesel')
                              : veh.fuel_type === 'hybrid' || veh.fuel_type === 'هايبرد'
                              ? tr('هايبرد', 'Hybrid')
                              : tr('غير محدد', 'N/A')}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badge.style}`}>
                          {badge.label}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1.5 space-y-0.5">
                          <div>{tr('تأمين:', 'Insurance:')} {veh.insurance_expiry || '-'}</div>
                          <div>{tr('فحص:', 'Inspection:')} {veh.inspection_expiry || '-'}</div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(veh)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 text-gray-500 transition-colors cursor-pointer"
                            title={tr('تعديل بيانات المركبة', 'Edit Vehicle')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingVehicle(veh)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-rose-500 hover:text-rose-600 text-gray-500 transition-colors cursor-pointer"
                            title={tr('حذف المركبة', 'Delete Vehicle')}
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

      {/* Add / Edit Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                {editingVehicle ? (
                  <Edit className="w-5 h-5 text-teal-300" />
                ) : (
                  <Car className="w-5 h-5 text-teal-300" />
                )}
                <h3 className="font-bold text-sm">
                  {editingVehicle
                    ? `${tr('تعديل بيانات المركبة:', 'Edit Vehicle Data:')} ${editingVehicle.vehicle_no}`
                    : tr('تسجيل وإضافة مركبة جديدة للأسطول', 'Register New Vehicle in Fleet')}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('رقم المركبة الداخلي:', 'Internal Vehicle No:')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={tr('مثال: V-101', 'e.g. V-101')}
                    value={modalVehicleNo}
                    onChange={(e) => setModalVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('رقم اللوحة الرسمي (فريد):', 'Official Plate No (Unique):')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={tr('مثال: بغداد 45892 د', 'e.g. Baghdad 45892 D')}
                    value={modalPlate}
                    onChange={(e) => setModalPlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('نوع المركبة (صنف الترخيص):', 'Vehicle License Type:')}
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value as 'خصوصي' | 'عمومي')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="خصوصي">{tr('خصوصي (افتراضي)', 'Private (Default)')}</option>
                    <option value="عمومي">{tr('عمومي', 'Public')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('حالة المركبة التشغيلية:', 'Operational Status:')}
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="available">{tr('جاهزة للرحلات (Available)', 'Available for Trips')}</option>
                    <option value="assigned">{tr('في رحلة عمل (Assigned)', 'On a Trip (Assigned)')}</option>
                    <option value="out_of_service">{tr('متوقفة مؤقتاً (Out of Service)', 'Out of Service')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('نوع وموديل المركبة:', 'Vehicle Make & Model:')}</label>
                  <input
                    type="text"
                    required
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('الفئة / الموديل الفرعي:', 'Sub-model / Trim:')}</label>
                  <input
                    type="text"
                    value={modalModel}
                    onChange={(e) => setModalModel(e.target.value)}
                    placeholder={tr('مثال: دبل قمارة أو VXR', 'e.g. Double Cab or VXR')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('سنة الصنع:', 'Year:')}</label>
                  <input
                    type="number"
                    required
                    value={modalYear}
                    onChange={(e) => setModalYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('رقم الشاصي VIN (اختياري):', 'Chassis No VIN (Optional):')}
                  </label>
                  <input
                    type="text"
                    placeholder={tr('اختياري - 17 حرف ورقم...', 'Optional - 17 chars/digits...')}
                    value={modalVin}
                    onChange={(e) => setModalVin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('المكتب التابع له:', 'Assigned Office:')}</label>
                  {isSupervisor ? (
                    <div className="w-full px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      <span>{userOffice?.name || tr('مكتبك المخصص', 'Your Assigned Office')}</span>
                    </div>
                  ) : (
                    <select
                      value={modalOfficeId}
                      onChange={(e) => setModalOfficeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
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
                    {tr('قراءة العداد الحالية:', 'Current Odometer:')}
                  </label>
                  <input
                    type="number"
                    required
                    value={modalOdometer}
                    onChange={(e) => setModalOdometer(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono font-bold focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('وحدة عداد المركبة:', 'Vehicle Odometer Unit:')}</label>
                  <select
                    value={modalOdometerUnit}
                    onChange={(e) => {
                      const nextUnit = e.target.value as OdometerUnit;
                      const readingKm = odometerToKm(modalOdometer, modalOdometerUnit);
                      setModalOdometer(roundOdometerReading(odometerFromKm(readingKm, nextUnit)));
                      setModalOdometerUnit(nextUnit);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="km">{tr('كيلومتر (كم)', 'Kilometers (km)')}</option>
                    <option value="mile">{tr('ميل', 'Miles (mi)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('نوع الوقود (اختياري):', 'Fuel Type (Optional):')}</label>
                  <select
                    value={modalFuel}
                    onChange={(e) => setModalFuel(e.target.value as FuelType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="">{tr('-- اختياري (غير محدد) --', '-- Optional (Unspecified) --')}</option>
                    <option value="gasoline">{tr('بنزين عادي / محسن', 'Gasoline')}</option>
                    <option value="diesel">{tr('ديزل (غازولين)', 'Diesel')}</option>
                    <option value="hybrid">{tr('هجين (هايبرد)', 'Hybrid')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('السائق المالك للمركبة:', 'Assigned Owner Driver:')}
                  </label>
                  <select
                    value={modalDriverId}
                    onChange={(e) => setModalDriverId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="">{tr('-- اختر السائق المالك --', '-- Select Assigned Driver --')}</option>
                    {(() => {
                      const sameOfficeDrivers = drivers.filter((d) => !modalOfficeId || isSameOffice(d.office_id, modalOfficeId));
                      const otherOfficeDrivers = drivers.filter((d) => modalOfficeId && !isSameOffice(d.office_id, modalOfficeId));
                      const currentOfficeName = offices.find((o) => isSameOffice(o.id, modalOfficeId))?.name || tr('المكتب المحدد', 'Selected Office');

                      return (
                        <>
                          {sameOfficeDrivers.length > 0 && (
                            <optgroup label={tr(`سائقو (${currentOfficeName})`, `Drivers of (${currentOfficeName})`)}>
                              {sameOfficeDrivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.full_name} ({d.employee_no})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {otherOfficeDrivers.length > 0 && (
                            <optgroup label={tr("سائقون من مكاتب أخرى", "Drivers from other offices")}>
                              {otherOfficeDrivers.map((d) => {
                                const offName = offices.find((o) => isSameOffice(o.id, d.office_id))?.name || tr('مكتب آخر', 'Other Office');
                                return (
                                  <option key={d.id} value={d.id}>
                                    {d.full_name} ({d.employee_no}) [{offName}]
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('تاريخ انتهاء التأمين (اختياري):', 'Insurance Expiry Date (Optional):')}
                  </label>
                  <input
                    type="date"
                    value={modalInsuranceDate}
                    onChange={(e) => setModalInsuranceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('تاريخ انتهاء الفحص الدوري (اختياري):', 'Inspection Expiry Date (Optional):')}
                  </label>
                  <input
                    type="date"
                    value={modalInspectionDate}
                    onChange={(e) => setModalInspectionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

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
                  <span>{editingVehicle ? tr('حفظ التعديلات', 'Save Changes') : tr('حفظ وتسجيل المركبة', 'Save & Register Vehicle')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {tr('تأكيد حذف المركبة من الأسطول', 'Confirm Vehicle Deletion')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tr('هل أنت متأكد من رغبتك في إزالة هذه المركبة نهائياً من سجلات النظام؟', 'Are you sure you want to permanently remove this vehicle from the system records?')}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('رقم المركبة:', 'Vehicle No:')}</span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">{deletingVehicle.vehicle_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('رقم اللوحة:', 'Plate No:')}</span>
                <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{deletingVehicle.plate_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('النوع والموديل:', 'Make & Model:')}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {deletingVehicle.vehicle_type} ({deletingVehicle.year})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('السائق المالك:', 'Owner Driver:')}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {drivers.find((d) => d.id === deletingVehicle.assigned_driver_id)?.full_name || tr('سائق معتمد', 'Assigned Driver')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('المكتب التابع:', 'Office:')}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {(offices.find((o) => o.id === deletingVehicle.office_id)?.name || '').split('-')[0]?.trim() || tr('المركز الرئيسي', 'Main Office')}
                </span>
              </div>
            </div>

            {/* Warning if on active trip */}
            {DtmsStorage.getTrips().some(
              (t) => t.vehicle_id === deletingVehicle.id && (t.status === 'in_progress' || t.status === 'new')
            ) && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {tr('تنبيه: لا يمكن حذف هذه المركبة لوجود رحلة جارية مرتبطة بها. يرجى إنهاء الرحلة أولاً.', 'Alert: Cannot delete this vehicle as it is linked to an active trip. Please end the trip first.')}
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={DtmsStorage.getTrips().some(
                  (t) => t.vehicle_id === deletingVehicle.id && (t.status === 'in_progress' || t.status === 'new')
                )}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('تأكيد الحذف النهائي', 'Confirm Permanent Deletion')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
