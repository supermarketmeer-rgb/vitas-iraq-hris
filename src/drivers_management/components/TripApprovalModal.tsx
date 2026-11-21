import React, { useEffect, useState } from 'react';
import {
  CheckCheck,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Camera,
  MapPin,
  Calendar,
  Clock,
  Car,
  UserCheck,
  ShieldCheck,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { OdometerRecord, Trip, User } from '../types';
import { DtmsStorage } from '../utils/storage';
import { useLanguage } from '../utils/i18n';
import { isGPSTrackingEnabled } from '../utils/gpsTracker';
import { fetchOdometerRecordsForTrip, syncReviseTripOdometer, syncSaveTrip } from '../utils/apiSync';
import { normalizeOdometerUnit, odometerFromKm, odometerToKm, odometerUnitLabel, roundOdometerReading } from '../utils/odometer';

interface TripApprovalModalProps {
  trip: Trip;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const TripApprovalModal: React.FC<TripApprovalModalProps> = ({
  trip,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const isReadOnly = currentUser.role === 'viewer';
  const driver = DtmsStorage.getDrivers().find((d) => d.id === trip.driver_id);
  const vehicle = DtmsStorage.getVehicles().find((v) => v.id === trip.vehicle_id);
  const configuredVehicleUnit = normalizeOdometerUnit(vehicle?.odometer_unit);
  const [odoRecords, setOdoRecords] = useState<OdometerRecord[]>(() =>
    DtmsStorage.getOdometerRecords().filter((o) => o.trip_id === trip.id)
  );
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(true);
  const startOdo = odoRecords.find((o) => o.type === 'start');
  const endOdo = odoRecords.slice().reverse().find((o) => o.type === 'end');
  const vehicleUnit = normalizeOdometerUnit(startOdo?.reading_unit || configuredVehicleUnit);
  const displayReading = (record?: OdometerRecord) => record
    ? roundOdometerReading(record.display_reading ?? odometerFromKm(record.reading, record.reading_unit || vehicleUnit))
    : 0;
  const originalOcrReading = (record?: OdometerRecord) => {
    if (!record) return null;
    const value = Number(record.ocr_result);
    return Number.isFinite(value) && value > 0 ? roundOdometerReading(value) : null;
  };
  const ocrValueLabel = (record?: OdometerRecord) => {
    const value = originalOcrReading(record);
    return value === null ? tr('قيد المعالجة / غير متوفر', 'Pending / unavailable') : `${value} ${unitLabel}`;
  };
  const [correctedStartReading, setCorrectedStartReading] = useState(() => startOdo
    ? roundOdometerReading(startOdo.display_reading ?? odometerFromKm(startOdo.reading, startOdo.reading_unit || configuredVehicleUnit))
    : 0);
  const [correctedEndReading, setCorrectedEndReading] = useState(() => endOdo
    ? roundOdometerReading(endOdo.display_reading ?? odometerFromKm(endOdo.reading, endOdo.reading_unit || configuredVehicleUnit))
    : 0);

  const { tr, t, lang } = useLanguage();
  const unitLabel = odometerUnitLabel(vehicleUnit, lang);
  const [decision, setDecision] = useState<'approve' | 'review' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setIsEvidenceLoading(true);
    fetchOdometerRecordsForTrip(trip.id).then((records) => {
      if (!active) return;
      if (records.length > 0) {
        const mappedRecords = records.map((record: any) => ({
          ...record,
          id: String(record.id),
          trip_id: String(record.trip_id),
          reading: Number(record.reading),
          display_reading: record.display_reading == null ? undefined : Number(record.display_reading),
          reading_unit: normalizeOdometerUnit(record.reading_unit || vehicleUnit),
          confidence_score: Number(record.confidence_score),
          is_verified: Boolean(Number(record.is_verified)),
          manual_override: Boolean(Number(record.manual_override)),
        }));
        setOdoRecords(mappedRecords);
        setCorrectedStartReading(displayReading(mappedRecords.find((record: OdometerRecord) => record.type === 'start')));
        setCorrectedEndReading(displayReading(mappedRecords.slice().reverse().find((record: OdometerRecord) => record.type === 'end')));
      }
      setIsEvidenceLoading(false);
    });
    return () => {
      active = false;
    };
  }, [trip.id]);

  const handleProcessDecision = async () => {
    if (isReadOnly || isSubmitting) return;
    setErrorMessage(null);

    if (decision === 'reject' && !rejectionReason.trim()) {
      setErrorMessage(tr('سبب الرفض إلزامي عند رفض الرحلة!', 'Rejection reason is mandatory when rejecting the trip!'));
      return;
    }

    if (decision === 'review' && !notes.trim()) {
      setErrorMessage(tr('يرجى كتابة ملاحظات للسائق توضح سبب طلب المراجعة!', 'Please write notes for the driver explaining the revision request!'));
      return;
    }

    if (!startOdo || !endOdo || correctedStartReading <= 0 || correctedEndReading <= 0) {
      setErrorMessage(tr('يجب توفر قراءتي عداد البداية والنهاية بقيم صحيحة.', 'Valid start and end odometer readings are required.'));
      return;
    }
    if (correctedEndReading < correctedStartReading) {
      setErrorMessage(tr('لا يمكن أن تكون قراءة عداد النهاية أقل من قراءة البداية.', 'The ending odometer cannot be lower than the starting odometer.'));
      return;
    }

    const startReadingKm = roundOdometerReading(odometerToKm(correctedStartReading, vehicleUnit));
    const endReadingKm = roundOdometerReading(odometerToKm(correctedEndReading, vehicleUnit));
    const odometerChanged = correctedStartReading !== displayReading(startOdo) || correctedEndReading !== displayReading(endOdo);
    const correctedDistance = roundOdometerReading(endReadingKm - startReadingKm);
    const correctedDiff = Math.abs(correctedDistance - Number(trip.distance_gps || 0));
    const correctedDiffStatus = correctedDiff > 15 ? 'alert' : correctedDiff > 5 ? 'review_needed' : 'normal';

    setIsSubmitting(true);
    if (odometerChanged) {
      const correction = await syncReviseTripOdometer({
        trip_id: trip.id,
        start_reading: startReadingKm,
        end_reading: endReadingKm,
        display_start_reading: correctedStartReading,
        display_end_reading: correctedEndReading,
        reading_unit: vehicleUnit,
        distance_gps: Number(trip.distance_gps || 0),
        diff_status: correctedDiffStatus,
        driver_notes: trip.driver_notes || '',
      });
      if (!correction.success) {
        setIsSubmitting(false);
        setErrorMessage(correction.message || tr('تعذر حفظ تصحيح قراءة العداد.', 'Could not save the odometer correction.'));
        return;
      }
      setOdoRecords((records) => records.map((record) =>
        record.type === 'start'
          ? { ...record, reading: startReadingKm, display_reading: correctedStartReading, reading_unit: vehicleUnit, manual_override: true }
          : record.type === 'end'
          ? { ...record, reading: endReadingKm, display_reading: correctedEndReading, reading_unit: vehicleUnit, manual_override: true }
          : record
      ));
    }

    let nextStatus = trip.status;

    if (decision === 'approve') {
      nextStatus = 'approved';
    } else if (decision === 'review') {
      nextStatus = 'revision_requested';
    } else if (decision === 'reject') {
      nextStatus = 'rejected';
    }

    const updatedTrip: Trip = {
      ...trip,
      status: nextStatus,
      distance_odometer: correctedDistance,
      distance_diff: correctedDiff,
      diff_status: correctedDiffStatus,
      supervisor_notes: notes ? `${trip.supervisor_notes || ''}\n[${tr('ملاحظة تأييد', 'Endorsement')}]: ${notes}` : trip.supervisor_notes,
      rejection_reason: decision === 'reject' ? rejectionReason : undefined,
    };

    const saveResult = await syncSaveTrip(updatedTrip);
    if (!saveResult.success) {
      setIsSubmitting(false);
      setErrorMessage(saveResult.message || tr('تعذر حفظ قرار التأييد.', 'Could not save the endorsement decision.'));
      return;
    }
    DtmsStorage.saveTrip(updatedTrip, false);

    // Free the vehicle if approved or rejected
    if (vehicle && (decision === 'approve' || decision === 'reject')) {
      DtmsStorage.saveVehicle({
        ...vehicle,
        status: 'available',
        last_odometer: endReadingKm || vehicle.last_odometer,
      });
    }

    onSuccess();
    onClose();
  };

  const diff = trip.distance_diff || 0;
  const isDiffWarning = diff > 15;
  const isDiffReview = diff > 5 && diff <= 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-sm">{trip.record_type === 'work_session' ? tr('مراجعة وتأييد سجل العمل', 'Review & Endorse Work Session') : tr('مراجعة وتأييد الرحلة', 'Review & Endorse Trip')} ({trip.trip_no})</h3>
              <p className="text-[11px] text-teal-300">
                {tr('السائق:', 'Driver:')} {driver?.full_name} • {tr('المركبة:', 'Vehicle:')} {vehicle?.vehicle_no} ({vehicle?.plate_no})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-teal-300 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              {errorMessage}
            </div>
          )}

          {/* 1. Distance & Discrepancy KPI Banner */}
          {isGPSTrackingEnabled() && (
            <div
              className={`p-4 rounded-2xl border ${
                isDiffWarning
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                  : isDiffReview
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span>{tr('مقارنة مسافة عداد الكيلومترات مع مسافة تتبع GPS:', 'Odometer vs GPS Distance Comparison:')}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isDiffWarning
                      ? 'bg-rose-600 text-white'
                      : isDiffReview
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isDiffWarning ? tr('تنبيه: فرق مرتفع (> 15 كم)', 'Alert: High Diff (> 15 km)') : isDiffReview ? tr('يحتاج مراجعة (5-15 كم)', 'Needs Review (5-15 km)') : tr('طبيعي ومطابق (0-5 كم)', 'Normal & Matches (0-5 km)')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 shadow-xs">
                  <span className="text-[10px] text-gray-500 block">{tr('مسافة العداد الفعلية:', 'Actual Odo Distance:')}</span>
                  <span className="text-base font-black text-gray-900 dark:text-white font-mono">
                    {trip.distance_odometer} {tr('كم', 'km')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 shadow-xs">
                  <span className="text-[10px] text-gray-500 block">{tr('مسافة مسار GPS:', 'GPS Route Distance:')}</span>
                  <span className="text-base font-black text-gray-900 dark:text-white font-mono">
                    {trip.distance_gps} {tr('كم', 'km')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 shadow-xs">
                  <span className="text-[10px] text-gray-500 block">{tr('فرق المسافة (Diff):', 'Distance Diff:')}</span>
                  <span className="text-base font-black font-mono text-teal-700 dark:text-teal-300">
                    {trip.distance_diff} {tr('كم', 'km')}
                  </span>
                </div>
              </div>
            </div>
          )}


          {/* 2. Before & After Odometer Photos with Watermark Check */}
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-teal-600" />
              <span>{tr('صور العداد الموثقة (قبل المغادرة وبعد الوصول):', 'Verified Odometer Photos (Departure & Arrival):')}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Odometer */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2 bg-gray-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-gray-200">1. {tr('عداد البداية', 'Start Odometer')}</span>
                  {trip.status !== 'approved' && !isReadOnly ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={correctedStartReading || ''}
                        onChange={(event) => setCorrectedStartReading(Number(event.target.value))}
                        aria-label={tr('تصحيح قراءة عداد البداية', 'Correct start odometer reading')}
                        className="w-28 rounded-md border border-red-300 bg-white px-2 py-1 text-center font-mono text-lg font-black text-red-600 outline-none focus:border-red-500 dark:border-red-800 dark:bg-slate-900 dark:text-red-400"
                      />
                      <span className="font-bold text-gray-500">{unitLabel}</span>
                    </div>
                  ) : (
                    <span className="font-mono text-lg font-black text-red-600 dark:text-red-400">
                      {startOdo ? `${displayReading(startOdo)} ${unitLabel}` : '-'}
                    </span>
                  )}
                </div>
                <div className="h-40 rounded-lg overflow-hidden bg-black relative flex items-center justify-center">
                  {startOdo?.photo_url ? <img
                    src={startOdo.photo_url}
                    alt="عداد البداية"
                    className="w-full h-full object-contain"
                  /> : <span className="px-4 text-center text-xs text-gray-300">{isEvidenceLoading ? tr('جاري تحميل الصورة...', 'Loading photo...') : tr('صورة عداد البداية غير متوفرة', 'Start odometer photo is unavailable')}</span>}
                  {startOdo && <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[9px] text-white">
                    OCR: {ocrValueLabel(startOdo)}{originalOcrReading(startOdo) !== null ? ` (${tr('ثقة', 'Conf')}: ${startOdo.confidence_score}%)` : ''}
                  </div>}
                </div>
                {startOdo && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-2 text-center dark:border-slate-700 dark:bg-slate-900">
                    <div>
                      <span className="block text-[9px] text-gray-500">{tr('قيمة OCR الأصلية', 'Original OCR value')}</span>
                      <strong className="font-mono text-xs text-gray-800 dark:text-gray-200">{ocrValueLabel(startOdo)}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500">{tr('قيمة السائق / القيمة الحالية', 'Driver-entered / current value')}</span>
                      <strong className={`font-mono text-xs ${originalOcrReading(startOdo) !== null && originalOcrReading(startOdo) !== correctedStartReading ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{correctedStartReading} {unitLabel}</strong>
                      {originalOcrReading(startOdo) !== null && (
                        <span className={`block text-[9px] font-bold ${originalOcrReading(startOdo) === correctedStartReading ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {originalOcrReading(startOdo) === correctedStartReading
                            ? tr('مطابقة لقراءة OCR', 'Matches OCR')
                            : tr('مختلفة عن قراءة OCR', 'Different from OCR')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  {tr('تاريخ المغادرة:', 'Departure:')} {trip.departure_date || trip.planned_departure_date} • {trip.departure_time}
                </p>
              </div>

              {/* End Odometer */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2 bg-gray-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-gray-200">2. {tr('عداد النهاية', 'End Odometer')}</span>
                  {trip.status !== 'approved' && !isReadOnly ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={correctedEndReading || ''}
                        onChange={(event) => setCorrectedEndReading(Number(event.target.value))}
                        aria-label={tr('تصحيح قراءة عداد النهاية', 'Correct end odometer reading')}
                        className="w-28 rounded-md border border-red-300 bg-white px-2 py-1 text-center font-mono text-lg font-black text-red-600 outline-none focus:border-red-500 dark:border-red-800 dark:bg-slate-900 dark:text-red-400"
                      />
                      <span className="font-bold text-gray-500">{unitLabel}</span>
                    </div>
                  ) : (
                    <span className="font-mono text-lg font-black text-red-600 dark:text-red-400">
                      {endOdo ? `${displayReading(endOdo)} ${unitLabel}` : '-'}
                    </span>
                  )}
                </div>
                <div className="h-40 rounded-lg overflow-hidden bg-black relative flex items-center justify-center">
                  {endOdo?.photo_url ? <img
                    src={endOdo.photo_url}
                    alt="عداد النهاية"
                    className="w-full h-full object-contain"
                  /> : <span className="px-4 text-center text-xs text-gray-300">{isEvidenceLoading ? tr('جاري تحميل الصورة...', 'Loading photo...') : tr('صورة عداد النهاية غير متوفرة', 'End odometer photo is unavailable')}</span>}
                  {endOdo && <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[9px] text-white">
                    OCR: {ocrValueLabel(endOdo)}{originalOcrReading(endOdo) !== null ? ` (${tr('ثقة', 'Conf')}: ${endOdo.confidence_score}%)` : ''}
                  </div>}
                </div>
                {endOdo && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-2 text-center dark:border-slate-700 dark:bg-slate-900">
                    <div>
                      <span className="block text-[9px] text-gray-500">{tr('قيمة OCR الأصلية', 'Original OCR value')}</span>
                      <strong className="font-mono text-xs text-gray-800 dark:text-gray-200">{ocrValueLabel(endOdo)}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500">{tr('قيمة السائق / القيمة الحالية', 'Driver-entered / current value')}</span>
                      <strong className={`font-mono text-xs ${originalOcrReading(endOdo) !== null && originalOcrReading(endOdo) !== correctedEndReading ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{correctedEndReading} {unitLabel}</strong>
                      {originalOcrReading(endOdo) !== null && (
                        <span className={`block text-[9px] font-bold ${originalOcrReading(endOdo) === correctedEndReading ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {originalOcrReading(endOdo) === correctedEndReading
                            ? tr('مطابقة لقراءة OCR', 'Matches OCR')
                            : tr('مختلفة عن قراءة OCR', 'Different from OCR')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  {tr('تاريخ الوصول:', 'Arrival Date:')} {trip.arrival_date} • {trip.arrival_time}
                </p>
              </div>
            </div>
          </div>

          {trip.record_type === 'work_session' && (
            <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-800 dark:bg-teal-950/30">
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3 dark:bg-slate-800"><span className="block text-[10px] text-gray-500">{tr('المسافة الكلية', 'Total distance')}</span><strong className="font-mono text-lg">{trip.distance_odometer} {tr('كم', 'km')}</strong></div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-800"><span className="block text-[10px] text-gray-500">{tr('الرحلات الداخلية', 'Internal trips')}</span><strong className="text-lg">{trip.internal_trip_count || 0}</strong></div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-800"><span className="block text-[10px] text-gray-500">{tr('الرحلات الخارجية', 'External trips')}</span><strong className="text-lg">{trip.external_trip_count || 0}</strong></div>
              </div>
              {(trip.work_session_routes || []).length > 0 && <div><span className="mb-1 block font-bold">{tr('مسارات الرحلات الخارجية:', 'External trip routes:')}</span>{trip.work_session_routes?.map((route, index) => <div key={route.id} className="border-t border-teal-100 py-1.5 dark:border-teal-900">{index + 1}. {tr(`من ${route.from_governorate_name} إلى ${route.to_governorate_name}`, `From ${route.from_governorate_name} to ${route.to_governorate_name}`)}</div>)}</div>}
              <div><span className="font-bold">{tr('الركاب:', 'Passengers:')} </span>{trip.passenger_names || tr('لا يوجد', 'None')}</div>
              <div className="text-[11px] text-gray-500">{tr('بدء العمل:', 'Work started:')} {trip.departure_date} {trip.departure_time} • {tr('إنهاء العمل:', 'Work ended:')} {trip.arrival_date} {trip.arrival_time}</div>
            </div>
          )}

          {/* 3. Driver Visit Notes & Destinations */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-gray-900 dark:text-white block">{tr('ملاحظات الزيارة المدخلة من السائق:', 'Driver Visit Notes:')}</span>
            <p className="text-gray-600 dark:text-gray-300">
              {trip.driver_notes || tr('لم يتم تدوين ملاحظات استثنائية، تم التوصيل وفق المسار المحدد.', 'No exceptional notes recorded.')}
            </p>
          </div>

          {/* 4. Decision Selection / Approved Status Banner */}
          {trip.status === 'approved' ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCheck className="w-5 h-5 text-emerald-600" />
                <span>{trip.record_type === 'work_session' ? tr('تم اعتماد وتأييد سجل العمل رسمياً', 'This work session has been officially approved and endorsed') : tr('تم اعتماد وتأييد هذه الرحلة رسمياً', 'This trip has been officially approved and endorsed')}</span>
              </div>
              {trip.supervisor_notes && (
                <p className="text-emerald-900 dark:text-emerald-200 text-xs">
                  <span className="font-bold">{tr('ملاحظات المشرف:', 'Supervisor Notes:')} </span>{trip.supervisor_notes}
                </p>
              )}
            </div>
          ) : isReadOnly ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold">
              {tr('وضع المشاهدة فقط: لا يمكن تنفيذ قرار أو تعديل الرحلة.', 'Read-only view: decisions and trip changes are disabled.')}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <label className="font-bold text-gray-900 dark:text-white block">
                {tr('قرار مسؤول السائقين:', 'Supervisor Decision:')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                    decision === 'approve'
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold'
                      : 'border-gray-200 dark:border-slate-800 hover:border-teal-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'approve'}
                    onChange={() => setDecision('approve')}
                    className="accent-teal-600"
                  />
                  <CheckCheck className="w-4 h-4 text-teal-600" />
                  <span>{tr('تأييد واعتماد الرحلة', 'Approve & Endorse Trip')}</span>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                    decision === 'review'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                      : 'border-gray-200 dark:border-slate-800 hover:border-amber-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'review'}
                    onChange={() => setDecision('review')}
                    className="accent-amber-500"
                  />
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>{tr('طلب مراجعة من السائق', 'Request Review')}</span>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                    decision === 'reject'
                      ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold'
                      : 'border-gray-200 dark:border-slate-800 hover:border-rose-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    checked={decision === 'reject'}
                    onChange={() => setDecision('reject')}
                    className="accent-rose-600"
                  />
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>{tr('رفض الرحلة', 'Reject Trip')}</span>
                </label>
              </div>

              {/* Notes / Reason input */}
              {decision === 'reject' ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-rose-600 block">{tr('سبب الرفض (إلزامي):', 'Rejection Reason (Mandatory):')}</label>
                  <textarea
                    rows={2}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={tr('بيان سبب رفض الرحلة بدقة...', 'State the rejection reason...')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">
                    {tr('ملاحظات مسؤول السائقين (اختياري / إلزامي عند طلب المراجعة):', 'Supervisor Notes (Mandatory for Review):')}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={tr('أي توجيهات أو استفسار حول المسار أو قراءة العداد...', 'Any instructions...')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-gray-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100"
          >
            {tr('إغلاق', 'Close')}
          </button>
          {trip.status !== 'approved' && !isReadOnly && (
            <button
              id="btn-confirm-approval-decision"
              onClick={handleProcessDecision}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isSubmitting ? tr('جارٍ الحفظ...', 'Saving...') : tr('تنفيذ القرار وحفظ السجل', 'Execute & Save')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
