import React, { useState } from 'react';
import { Building2, Download, FileBarChart, Printer } from 'lucide-react';
import { TripStatus, User } from '../types';
import { exportToExcelCSV, printReportTable } from '../utils/exportUtils';
import { isGPSTrackingEnabled } from '../utils/gpsTracker';
import { getLang, tr } from '../utils/i18n';
import { isOfficeRestricted, isSameOffice } from '../utils/officeUtils';
import { DtmsStorage } from '../utils/storage';
import { normalizeOdometerUnit, odometerFromKm, odometerUnitLabel, roundOdometerReading } from '../utils/odometer';
import { useDtmsHeader } from '../context/DtmsHeaderContext';

interface ReportsManagerProps { currentUser?: User | null; }

export const ReportsManager: React.FC<ReportsManagerProps> = ({ currentUser }) => {
  const { headerActions } = useDtmsHeader();
  const allOffices = DtmsStorage.getOffices();
  const allDrivers = DtmsStorage.getDrivers();
  const allVehicles = DtmsStorage.getVehicles();
  const allTrips = DtmsStorage.getTrips();
  const odometerRecords = DtmsStorage.getOdometerRecords();
  const isEnglish = getLang() === 'en';
  const isSupervisor = isOfficeRestricted(currentUser);
  const userOfficeId = currentUser?.office_id;
  const userOffice = isSupervisor ? allOffices.find((o) => isSameOffice(o.id, userOfficeId)) : null;
  const offices = isSupervisor && userOffice ? [userOffice] : allOffices;
  const drivers = isSupervisor ? allDrivers.filter((d) => isSameOffice(d.office_id, userOfficeId)) : allDrivers;
  const vehicles = isSupervisor ? allVehicles.filter((v) => isSameOffice(v.office_id, userOfficeId)) : allVehicles;
  const trips = isSupervisor ? allTrips.filter((t) => isSameOffice(t.office_id, userOfficeId)) : allTrips;
  const gpsEnabled = isGPSTrackingEnabled();

  const reportTypes = [
    [1, tr('1- تقرير الرحلات اليومية', '1 - Daily Trips Report')],
    [2, tr('2- تقرير الرحلات الشهرية', '2 - Monthly Trips Report')],
    [3, tr('3- تقرير الرحلات حسب المكتب', '3 - Trips by Office')],
    [4, tr('4- تقرير الرحلات حسب السائق', '4 - Trips by Driver')],
    [5, tr('5- تقرير الرحلات حسب المركبة', '5 - Trips by Vehicle')],
    [6, tr('6- تقرير المسافات المقطوعة', '6 - Distance Report')],
    [7, tr('7- تقرير مقارنة GPS مع العداد', '7 - GPS and Odometer Comparison')],
    [8, tr('8- تقرير الرحلات غير المكتملة', '8 - Incomplete Trips')],
    [9, tr('9- تقرير الرحلات المرفوضة', '9 - Rejected Trips')],
    [10, tr('10- تقرير تنبيهات فروقات المسافة', '10 - Distance Difference Alerts')],
    [11, tr('11- تقرير سجل قراءات العدادات', '11 - Odometer Reading Log')],
    [12, tr('12- تقرير استهلاك الوقود التقديري', '12 - Estimated Fuel Consumption')],
    [13, tr('13- تقرير أداء السائقين', '13 - Driver Performance')],
  ].map(([id, name]) => ({ id: Number(id), name: String(name) })).filter((r) => gpsEnabled || (r.id !== 7 && r.id !== 10));

  const [selectedReportId, setSelectedReportId] = useState(1);
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const statusLabel = (status: TripStatus) => ({
    new: tr('جديدة', 'New'), in_progress: tr('قيد التنفيذ', 'In Progress'),
    pending_approval: tr('بانتظار الاعتماد', 'Pending Approval'), approved: tr('معتمدة', 'Approved'),
    rejected: tr('مرفوضة', 'Rejected'), revision_requested: tr('مطلوب تصحيح', 'Correction Required'),
  })[status];

  const filteredTrips = trips.filter((trip) => {
    const departure = trip.departure_date || trip.planned_departure_date || '';
    const completion = trip.arrival_date || departure;
    return (isSupervisor || filterOffice === 'all' || isSameOffice(trip.office_id, filterOffice))
      && (filterDriver === 'all' || trip.driver_id === filterDriver)
      && (filterVehicle === 'all' || trip.vehicle_id === filterVehicle)
      && (!startDate || departure >= startDate) && (!endDate || completion <= endDate);
  });
  const filteredTripIds = new Set(filteredTrips.map((t) => t.id));

  const generateReportData = () => {
    const title = reportTypes.find((r) => r.id === selectedReportId)?.name || tr('تقرير', 'Report');
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if ([1, 2, 3, 4, 5].includes(selectedReportId)) {
      headers = [tr('رقم الرحلة', 'Trip No.'), tr('المكتب', 'Office'), tr('السائق', 'Driver'), tr('المركبة', 'Vehicle'), tr('النوع', 'Type'), tr('الوجهة', 'Destination'), tr('المغادرة الفعلية', 'Actual Departure'), tr('النهاية الفعلية', 'Actual End'), tr('الحالة', 'Status')];
      rows = filteredTrips.map((trip) => [trip.trip_no, offices.find((o) => o.id === trip.office_id)?.name || '', drivers.find((d) => d.id === trip.driver_id)?.full_name || '', vehicles.find((v) => v.id === trip.vehicle_id)?.vehicle_no || '', trip.trip_type === 'internal' ? tr('داخلية', 'Internal') : tr('خارجية', 'External'), trip.destination, `${trip.departure_date || trip.planned_departure_date || '-'} ${trip.departure_time || ''}`.trim(), `${trip.arrival_date || '-'} ${trip.arrival_time || ''}`.trim(), statusLabel(trip.status)]);
    } else if (selectedReportId === 6) {
      headers = gpsEnabled ? [tr('رقم الرحلة', 'Trip No.'), tr('السائق', 'Driver'), tr('المركبة', 'Vehicle'), tr('المسافة الفعلية (كم)', 'Actual Distance (km)'), tr('مسافة GPS (كم)', 'GPS Distance (km)'), tr('الحالة', 'Status')] : [tr('رقم الرحلة', 'Trip No.'), tr('السائق', 'Driver'), tr('المركبة', 'Vehicle'), tr('المسافة الفعلية (كم)', 'Actual Distance (km)'), tr('الحالة', 'Status')];
      rows = filteredTrips.map((trip) => { const base: (string | number)[] = [trip.trip_no, drivers.find((d) => d.id === trip.driver_id)?.full_name || '', vehicles.find((v) => v.id === trip.vehicle_id)?.vehicle_no || '', trip.distance_odometer]; if (gpsEnabled) base.push(trip.distance_gps); base.push(statusLabel(trip.status)); return base; });
    } else if (selectedReportId === 7 || selectedReportId === 10) {
      headers = [tr('رقم الرحلة', 'Trip No.'), tr('السائق', 'Driver'), tr('مسافة العداد', 'Odometer Distance'), tr('مسافة GPS', 'GPS Distance'), tr('فرق المسافة', 'Distance Difference'), tr('مستوى التقييم', 'Evaluation')];
      rows = filteredTrips.map((trip) => { const diff = trip.distance_diff || 0; const evaluation = diff > 15 ? tr('تنبيه عالي (>15 كم)', 'High Alert (>15 km)') : diff > 5 ? tr('مراجعة (5-15 كم)', 'Review (5-15 km)') : tr('طبيعي (0-5 كم)', 'Normal (0-5 km)'); return [trip.trip_no, drivers.find((d) => d.id === trip.driver_id)?.full_name || '', `${trip.distance_odometer} km`, `${trip.distance_gps} km`, `${diff} km`, evaluation]; });
    } else if (selectedReportId === 8) {
      headers = [tr('رقم الرحلة', 'Trip No.'), tr('المكتب', 'Office'), tr('السائق', 'Driver'), tr('الوجهة', 'Destination'), tr('المغادرة المخططة', 'Planned Departure'), tr('الحالة الحالية', 'Current Status')];
      rows = filteredTrips.filter((trip) => ['new', 'in_progress'].includes(trip.status)).map((trip) => [trip.trip_no, offices.find((o) => o.id === trip.office_id)?.name || '', drivers.find((d) => d.id === trip.driver_id)?.full_name || '', trip.destination, trip.planned_departure_date, statusLabel(trip.status)]);
    } else if (selectedReportId === 9) {
      headers = [tr('رقم الرحلة', 'Trip No.'), tr('السائق', 'Driver'), tr('الوجهة', 'Destination'), tr('سبب الرفض', 'Rejection Reason'), tr('تاريخ الإنشاء', 'Created At')];
      rows = filteredTrips.filter((trip) => trip.status === 'rejected').map((trip) => [trip.trip_no, drivers.find((d) => d.id === trip.driver_id)?.full_name || '', trip.destination, trip.rejection_reason || tr('غير محدد', 'Not specified'), trip.created_at]);
    } else if (selectedReportId === 11) {
      headers = [tr('معرف القراءة', 'Reading ID'), tr('رقم الرحلة', 'Trip No.'), tr('النوع', 'Type'), tr('قراءة العداد', 'Odometer Reading'), tr('دقة OCR', 'OCR Confidence'), tr('التاريخ والوقت', 'Date and Time')];
      rows = odometerRecords.filter((record) => filteredTripIds.has(record.trip_id)).map((record) => {
        const trip = trips.find((item) => item.id === record.trip_id);
        const vehicle = vehicles.find((item) => item.id === trip?.vehicle_id);
        const unit = normalizeOdometerUnit(record.reading_unit || vehicle?.odometer_unit);
        const reading = roundOdometerReading(record.display_reading ?? odometerFromKm(record.reading, unit));
        return [record.id, trip?.trip_no || '', record.type === 'start' ? tr('انطلاق', 'Departure') : tr('وصول', 'Arrival'), `${reading} ${odometerUnitLabel(unit, isEnglish ? 'en' : 'ar')}`, `${record.confidence_score}%`, record.created_at];
      });
    } else if (selectedReportId === 12) {
      headers = [tr('رقم المركبة', 'Vehicle No.'), tr('الموديل', 'Model'), tr('المسافة الكلية (كم)', 'Total Distance (km)'), tr('معدل الاستهلاك (كم/لتر)', 'Consumption Rate (km/L)'), tr('الوقود التقديري (لتر)', 'Estimated Fuel (L)'), tr('التكلفة التقديرية (د.ع)', 'Estimated Cost (IQD)')];
      rows = vehicles.filter((v) => filterVehicle === 'all' || v.id === filterVehicle).map((vehicle) => { const totalKm = filteredTrips.filter((trip) => trip.vehicle_id === vehicle.id).reduce((sum, trip) => sum + (trip.distance_odometer || 0), 0); const rate = vehicle.fuel_type === 'gasoline' || vehicle.fuel_type === 'بنزين' ? 8.5 : 10; const liters = Math.round(totalKm / rate); return [vehicle.vehicle_no, vehicle.model || vehicle.vehicle_type, totalKm, rate, liters, (liters * 750).toLocaleString(isEnglish ? 'en-US' : 'ar-IQ')]; });
    } else if (selectedReportId === 13) {
      headers = [tr('اسم السائق', 'Driver Name'), tr('الرقم الوظيفي', 'Employee No.'), tr('المكتب', 'Office'), tr('الرحلات المنفذة', 'Completed Trips'), tr('إجمالي المسافة (كم)', 'Total Distance (km)'), tr('التقييم العام', 'Overall Rating')];
      rows = drivers.filter((d) => filterDriver === 'all' || d.id === filterDriver).map((driver) => { const driverTrips = filteredTrips.filter((trip) => trip.driver_id === driver.id); return [driver.full_name, driver.employee_no, offices.find((o) => o.id === driver.office_id)?.name || '', driverTrips.length, driverTrips.reduce((sum, trip) => sum + (trip.distance_odometer || 0), 0), `${driver.rating ?? 0} / 5`]; });
    }
    return { title, headers, rows };
  };

  const reportData = generateReportData();
  const controlClass = 'mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white';
  return <div className="space-y-5 pb-16" dir={isEnglish ? 'ltr' : 'rtl'}>
    <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
      <div><h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileBarChart className="w-5 h-5 text-teal-600" />{tr('نظام التقارير الشاملة والتشغيلية (13 تقريراً)', 'Comprehensive & Operational Reports (13 Reports)')}</h2><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tr('تقارير تشغيلية قابلة للتصفية والتصدير والطباعة', 'Filter, export, and print operational reports')}</p></div>
      <div className="flex gap-2">{headerActions}<button onClick={() => exportToExcelCSV(reportData.title, reportData.headers, reportData.rows)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"><Download className="w-4 h-4" />{tr('تصدير Excel', 'Export Excel')}</button><button onClick={() => printReportTable(reportData.title, reportData.headers, reportData.rows)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold"><Printer className="w-4 h-4" />{tr('طباعة / PDF', 'Print / PDF')}</button></div>
    </section>
    <section className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <label className="md:col-span-2 text-xs font-bold">{tr('التقرير:', 'Report:')}<select value={selectedReportId} onChange={(e) => setSelectedReportId(Number(e.target.value))} className={controlClass}>{reportTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className="text-xs font-bold">{tr('المكتب:', 'Office:')}{isSupervisor ? <span className={`${controlClass} flex items-center gap-1.5 bg-teal-50 text-teal-800`}><Building2 className="w-3.5 h-3.5" />{userOffice?.name || tr('مكتبك', 'Your office')}</span> : <select value={filterOffice} onChange={(e) => setFilterOffice(e.target.value)} className={controlClass}><option value="all">{tr('جميع المكاتب', 'All Offices')}</option>{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}</label>
        <label className="text-xs font-bold">{tr('السائق:', 'Driver:')}<select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className={controlClass}><option value="all">{tr('جميع السائقين', 'All Drivers')}</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></label>
        <label className="text-xs font-bold">{tr('المركبة:', 'Vehicle:')}<select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} className={controlClass}><option value="all">{tr('جميع المركبات', 'All Vehicles')}</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_no} - {v.plate_no}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs"><strong>{tr('الفترة الزمنية:', 'Period:')}</strong><label className="flex items-center gap-2">{tr('من:', 'From:')}<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2.5 py-1 rounded-lg border" /></label><label className="flex items-center gap-2">{tr('إلى:', 'To:')}<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2.5 py-1 rounded-lg border" /></label><span className={`${isEnglish ? 'ml-auto' : 'mr-auto'} text-teal-600 font-bold`}>{tr('عدد السجلات:', 'Records:')} {reportData.rows.length}</span></div>
    </section>
    <section className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-teal-50/50 dark:bg-teal-950/20"><h3 className="font-bold text-xs text-teal-900 dark:text-teal-200">{reportData.title}</h3><span className="text-[11px] text-gray-500 font-mono">{tr('تاريخ الاستخراج:', 'Generated:')} {new Date().toLocaleDateString(isEnglish ? 'en-GB' : 'ar-IQ')}</span></div>
      <div className="overflow-x-auto"><table className={`w-full text-xs ${isEnglish ? 'text-left' : 'text-right'}`}><thead className="bg-gray-50 dark:bg-slate-800/60"><tr>{reportData.headers.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y">{reportData.rows.length === 0 ? <tr><td colSpan={Math.max(reportData.headers.length, 1)} className="p-8 text-center text-gray-400">{tr('لا توجد بيانات مطابقة لمعايير البحث المحددة', 'No data matches the selected filters.')}</td></tr> : reportData.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="p-3 text-gray-700 dark:text-gray-300 font-medium">{cell}</td>)}</tr>)}</tbody></table></div>
    </section>
  </div>;
};
