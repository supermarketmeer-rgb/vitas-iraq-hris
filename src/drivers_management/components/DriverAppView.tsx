import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Users,
  Navigation,
  Camera,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Car,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  Info,
  Sliders,
  Radio,
  AlertTriangle,
  ArrowDown,
  Sparkles,
  Gauge,
  ChevronDown,
  ChevronUp,
  Check,
  KeyRound,
  LogOut,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Trip, Driver, Vehicle, Office, OdometerRecord, OCRResult, User, TripDestination, TripCompanion, Governorate, WorkSessionRoute } from '../types';
import { DtmsStorage } from '../utils/storage';
import { requestCurrentGPSPosition, calculateHaversineDistance, evaluateDistanceDiff, compareGpsAndOcrDistance, isGPSTrackingEnabled } from '../utils/gpsTracker';
import { performOdometerOCR } from '../utils/ocrSimulator';
import { fetchGovernorates, fetchOdometerRecordsForTrip, syncAttachOdometerOcr, syncCompleteTripDestination, syncReviseTripOdometer, syncSaveTrip } from '../utils/apiSync';
import { getLang, tr } from '../utils/i18n';
import { normalizeOdometerUnit, odometerFromKm, odometerToKm, odometerUnitLabel, roundOdometerReading } from '../utils/odometer';
import { OdometerCamera } from './OdometerCamera';
import { OdometerPhotoCropper } from './OdometerPhotoCropper';

interface DriverAppViewProps {
  currentUser: User;
  onRefreshData?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

const localDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error || new Error('Unable to read image.'));
  reader.readAsDataURL(file);
});

const prepareOdometerPhoto = async (file: File): Promise<string> => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return readFileAsDataUrl(file);
  }
};

export const DriverAppView: React.FC<DriverAppViewProps> = ({
  currentUser,
  onRefreshData,
  onOpenChangePassword,
  onLogout,
}) => {
  const drivers = DtmsStorage.getDrivers();
  // Driver ownership uses the immutable Central Portal user ID only.
  const myDriver = drivers.find((d) => d.portal_user_id === currentUser.id);

  // If currentUser is admin/supervisor previewing, allow selecting which driver to preview
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    return myDriver?.id || drivers[0]?.id || '';
  });

  // Effective driver:
  // If user is driver, strictly lock to their matching driver profile
  // If user is admin/supervisor, use selected preview driver
  const driver = currentUser.role === 'driver'
    ? myDriver
    : (drivers.find((d) => d.id === selectedDriverId) || myDriver || drivers[0]);

  const allTrips = DtmsStorage.getTrips();
  const isSimpleMode = currentUser.role === 'driver' && currentUser.driver_mode !== 'complex';
  // STRICT ISOLATION: The driver only sees trips assigned directly to this driver
  const driverTrips = driver ? allTrips.filter((t) =>
    t.driver_id === driver.id && (isSimpleMode ? t.record_type === 'work_session' : t.record_type !== 'work_session')
  ) : [];
  const vehicles = DtmsStorage.getVehicles();
  const offices = DtmsStorage.getOffices();
  const vehicleAssignments = DtmsStorage.getAssignments();
  const settings = DtmsStorage.getSettings();
  const odoRecords = DtmsStorage.getOdometerRecords();

  const [activeTab, setActiveTab] = useState<'current' | 'new' | 'revision' | 'completed'>('current');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [createTripVehicleId, setCreateTripVehicleId] = useState('');
  const [createTripDate, setCreateTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [createDestination, setCreateDestination] = useState('');
  const [createVisitLocation, setCreateVisitLocation] = useState('');
  const [createPurpose, setCreatePurpose] = useState('');
  const [createDestinations, setCreateDestinations] = useState<TripDestination[]>([]);
  const [createCompanionName, setCreateCompanionName] = useState('');
  const [createCompanionJobTitle, setCreateCompanionJobTitle] = useState('');
  const [createCompanions, setCreateCompanions] = useState<TripCompanion[]>([]);
  const [createTripError, setCreateTripError] = useState<string | null>(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [workInternalCount, setWorkInternalCount] = useState(0);
  const [workExternalCount, setWorkExternalCount] = useState(0);
  const [workRoutes, setWorkRoutes] = useState<WorkSessionRoute[]>([]);
  const [workPassengerNames, setWorkPassengerNames] = useState('');
  const [showEndSummary, setShowEndSummary] = useState(false);

  useEffect(() => {
    fetchGovernorates().then((rows) => setGovernorates(rows.map((row: any) => ({ ...row, id: String(row.id) }))));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return tr('صباح الخير', 'Good morning');
    if (hour < 17) return tr('طاب يومك', 'Good afternoon');
    return tr('مساء الخير', 'Good evening');
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshData) onRefreshData();
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshToast(tr('تم تحديث بيانات الرحلات بنجاح', 'Trip data updated successfully'));
      setTimeout(() => setRefreshToast(null), 2200);
    }, 500);
  };

  // Start Trip Modal & Capture State
  const [showStartModal, setShowStartModal] = useState(false);
  const [startOdoPhoto, setStartOdoPhoto] = useState<string | null>(null);
  const [pendingStartPhoto, setPendingStartPhoto] = useState<string | null>(null);
  const [startOdoReading, setStartOdoReading] = useState<number>(0);
  const [startOcrResult, setStartOcrResult] = useState<OCRResult | null>(null);
  const [startGpsData, setStartGpsData] = useState<any>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isSubmittingStart, setIsSubmittingStart] = useState(false);

  // End Trip Modal & Capture State
  const [showEndModal, setShowEndModal] = useState(false);
  const [endOdoPhoto, setEndOdoPhoto] = useState<string | null>(null);
  const [pendingEndPhoto, setPendingEndPhoto] = useState<string | null>(null);
  const [endOdoReading, setEndOdoReading] = useState<number>(0);
  const [endOcrResult, setEndOcrResult] = useState<OCRResult | null>(null);
  const [endGpsData, setEndGpsData] = useState<any>(null);
  const [driverVisitNotes, setDriverVisitNotes] = useState('');
  const [endError, setEndError] = useState<string | null>(null);
  const [isSubmittingEnd, setIsSubmittingEnd] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionStartReading, setRevisionStartReading] = useState<number>(0);
  const [revisionEndReading, setRevisionEndReading] = useState<number>(0);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Hidden native camera file input refs
  const startCameraInputRef = useRef<HTMLInputElement>(null);
  const endCameraInputRef = useRef<HTMLInputElement>(null);
  const startReadingInputRef = useRef<HTMLInputElement>(null);
  const endReadingInputRef = useRef<HTMLInputElement>(null);
  const startOcrResultRef = useRef<OCRResult | null>(null);
  const endOcrResultRef = useRef<OCRResult | null>(null);
  const endStartReadingRef = useRef(0);
  const startEvidenceSavedRef = useRef(false);
  const endEvidenceSavedRef = useRef(false);
  const startCaptureVersionRef = useRef(0);
  const endCaptureVersionRef = useRef(0);

  // Live GPS Simulation loop while in-progress trip is active
  const inProgressTrip = driverTrips.find((t) => t.status === 'in_progress');
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ lat: number; lng: number; speed: number } | null>(null);
  const [updateTick, setUpdateTick] = useState(0);
  const [completingDestinationKey, setCompletingDestinationKey] = useState<string | null>(null);

  const handleCompleteDestination = async (tripId: string, destId: string) => {
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip || !trip.destinations) return;

    const requestKey = `${tripId}:${destId}`;
    setCompletingDestinationKey(requestKey);
    const result = await syncCompleteTripDestination(tripId, destId);
    if (!result.success || !result.completedAt) {
      setCompletingDestinationKey(null);
      setRefreshToast(tr('تعذر تسجيل إنجاز الوجهة. حاول مرة أخرى.', 'Could not record destination completion. Please try again.'));
      setTimeout(() => setRefreshToast(null), 3000);
      return;
    }

    const updatedDestinations = trip.destinations.map(d => 
      d.id === destId ? { 
        ...d, 
        completed: true,
        completed_at: result.completedAt,
        completed_by: currentUser.username,
      } : d
    );

    DtmsStorage.saveTrip({ ...trip, destinations: updatedDestinations }, false);
    setUpdateTick(prev => prev + 1);
    setCompletingDestinationKey(null);
    setRefreshToast(tr('تم تسجيل إنجاز الوجهة ووقت الوصول.', 'Destination completion and arrival time recorded.'));
    setTimeout(() => setRefreshToast(null), 2600);
    if (onRefreshData) onRefreshData();
  };

  const formatDestinationCompletion = (value: string) => {
    const parsed = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(getLang() === 'ar' ? 'ar-IQ' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  useEffect(() => {
    let interval: any = null;
    if (inProgressTrip && driver && isGPSTrackingEnabled()) {
      interval = setInterval(async () => {
        try {
          const pos = await requestCurrentGPSPosition();
          setLiveGpsCoords({
            lat: pos.latitude,
            lng: pos.longitude,
            speed: pos.speed,
          });

          // Record tracking point
          DtmsStorage.addTrackingPoint({
            id: 'trk-' + Date.now(),
            trip_id: inProgressTrip.id,
            driver_id: driver.id,
            latitude: pos.latitude,
            longitude: pos.longitude,
            speed: pos.speed,
            heading: pos.heading,
            timestamp: new Date().toISOString(),
            location_name: pos.locationName,
          });
        } catch (e) {
          // ignore background fetch error
        }
      }, 30000); // every 30s
    }
    return () => clearInterval(interval);
  }, [inProgressTrip, driver]);

  // Tab counts
  const newTrips = driverTrips.filter((t) => t.status === 'new');
  const activeTrips = driverTrips.filter((t) => t.status === 'in_progress');
  const hasActiveDriverWork = Boolean(driver && allTrips.some((trip) =>
    trip.driver_id === driver.id && trip.status === 'in_progress'
  ));
  const isCorrectionWorkflow = (trip: Trip) =>
    trip.status === 'revision_requested' ||
    (trip.status === 'pending_approval' && Boolean(trip.supervisor_notes?.trim()));
  const completedTripsList = driverTrips.filter(
    (t) => !isCorrectionWorkflow(t) && (t.status === 'pending_approval' || t.status === 'approved' || t.status === 'rejected')
  );
  const revisionTrips = driverTrips.filter(isCorrectionWorkflow);

  const getVehicleInfo = (vehicleId: string) => {
    return vehicles.find((v) => v.id === vehicleId);
  };

  const getVehicleOdometerUnit = (vehicleId: string) => normalizeOdometerUnit(getVehicleInfo(vehicleId)?.odometer_unit);
  const getOdometerUnitLabel = (vehicleId: string) => odometerUnitLabel(getVehicleOdometerUnit(vehicleId), getLang());
  const getDisplayedOdometerReading = (record: OdometerRecord | undefined, vehicleId: string) => {
    if (!record) return 0;
    return roundOdometerReading(record.display_reading ?? odometerFromKm(record.reading, getVehicleOdometerUnit(vehicleId)));
  };

  const getOfficeInfo = (officeId: string) => {
    return offices.find((o) => o.id === officeId);
  };

  const driverOffice = driver ? getOfficeInfo(driver.office_id) : undefined;
  const driverOfficeGovernorate = governorates.find((item) => {
    const officeNames = [driverOffice?.governorate, driverOffice?.governorate_en]
      .filter(Boolean)
      .map((name) => String(name).trim().toLocaleLowerCase());
    const governorateNames = [item.name_ar, item.name_en]
      .filter(Boolean)
      .map((name) => String(name).trim().toLocaleLowerCase());

    return officeNames.some((officeName) => governorateNames.some((governorateName) =>
      officeName === governorateName || officeName.includes(governorateName) || governorateName.includes(officeName)
    ));
  });
  const assignedVehicles = driver
    ? vehicles.filter((vehicle) =>
        vehicle.id === driver.assigned_vehicle_id || vehicleAssignments.some((assignment) =>
          assignment.driver_id === driver.id && assignment.vehicle_id === vehicle.id && assignment.status === 'active'
        )
      )
    : [];

  const createAndStartWorkSession = async () => {
    if (!driver || !driverOffice || isCreatingTrip || hasActiveDriverWork) return;
    const existingDraft = driverTrips.find((trip) => trip.record_type === 'work_session' && trip.status === 'new');
    if (existingDraft) {
      await handleOpenStartTrip(existingDraft);
      return;
    }
    const vehicle = assignedVehicles.find((item) => item.id === driver.assigned_vehicle_id) || assignedVehicles[0];
    if (!vehicle) {
      setRefreshToast(tr('لا توجد مركبة مخصصة لك. تواصل مع مسؤول السائقين.', 'No vehicle is assigned to you. Contact the driver supervisor.'));
      setTimeout(() => setRefreshToast(null), 3500);
      return;
    }

    const now = new Date();
    const draft: Trip = {
      id: `session-${Date.now()}`,
      trip_no: `WORK-${now.getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`,
      office_id: driver.office_id,
      driver_id: driver.id,
      vehicle_id: vehicle.id,
      trip_type: 'internal',
      record_type: 'work_session',
      internal_trip_count: 0,
      external_trip_count: 0,
      passenger_names: '',
      work_session_routes: [],
      governorate: driverOffice.governorate,
      start_point_type: 'office_branch',
      start_office_id: driverOffice.id,
      start_point_name: driverOffice.name,
      destination: tr('سجل عمل يومي', 'Daily work session'),
      visit_location: driverOffice.name,
      purpose: tr('توثيق حركة السائق اليومية', 'Daily driver movement record'),
      destinations: [],
      planned_departure_date: localDateValue(now),
      companions: [],
      status: 'new',
      distance_gps: 0,
      distance_odometer: 0,
      distance_diff: 0,
      diff_status: 'normal',
      created_by: currentUser.username || currentUser.name,
      created_at: now.toISOString().replace('T', ' ').slice(0, 19),
    };

    setIsCreatingTrip(true);
    const result = await syncSaveTrip(draft);
    setIsCreatingTrip(false);
    if (!result.success || !result.id) {
      setRefreshToast(result.message || tr('تعذر بدء سجل العمل.', 'Could not start the work record.'));
      setTimeout(() => setRefreshToast(null), 3500);
      return;
    }
    const saved = { ...draft, id: String(result.id), trip_no: result.tripNo || draft.trip_no };
    DtmsStorage.saveTrip(saved, false);
    setUpdateTick((value) => value + 1);
    await handleOpenStartTrip(saved);
  };

  const openDriverTripCreator = () => {
    if (!driver || currentUser.role !== 'driver') return;
    const preferredVehicle = assignedVehicles.find((vehicle) => vehicle.id === driver.assigned_vehicle_id) || assignedVehicles[0];
    setCreateTripVehicleId(preferredVehicle?.id || '');
    setCreateTripDate(new Date().toISOString().split('T')[0]);
    setCreateDestination('');
    setCreateVisitLocation('');
    setCreatePurpose('');
    setCreateDestinations([]);
    setCreateCompanionName('');
    setCreateCompanionJobTitle('');
    setCreateCompanions([]);
    setCreateTripError(null);
    setShowCreateTripModal(true);
  };

  const addDriverDestination = () => {
    if (!createDestination.trim() || !createPurpose.trim()) {
      setCreateTripError(tr('أدخل الوجهة وغرض الرحلة.', 'Enter the destination and trip purpose.'));
      return;
    }
    setCreateDestinations((destinations) => [...destinations, {
      id: `destination-${Date.now()}-${destinations.length}`,
      governorate_name: driverOffice?.governorate || '',
      destination: createDestination.trim(),
      visit_location: createVisitLocation.trim(),
      purpose: createPurpose.trim(),
      completed: false,
    }]);
    setCreateDestination('');
    setCreateVisitLocation('');
    setCreatePurpose('');
    setCreateTripError(null);
  };

  const addDriverCompanion = () => {
    if (!createCompanionName.trim()) {
      setCreateTripError(tr('أدخل اسم المرافق.', 'Enter the companion name.'));
      return;
    }
    setCreateCompanions((companions) => [...companions, {
      id: `companion-${Date.now()}-${companions.length}`,
      name: createCompanionName.trim(),
      job_title: createCompanionJobTitle.trim(),
    }]);
    setCreateCompanionName('');
    setCreateCompanionJobTitle('');
    setCreateTripError(null);
  };

  const submitDriverTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!driver || !driverOffice) {
      setCreateTripError(tr('ملف السائق غير مرتبط بمكتب مسؤول.', 'Your driver profile is not linked to a responsible office.'));
      return;
    }
    if (!createTripVehicleId) {
      setCreateTripError(tr('لا توجد مركبة مخصصة لك. تواصل مع المشرف.', 'No vehicle is assigned to you. Contact your supervisor.'));
      return;
    }

    const finalDestinations = [...createDestinations];
    if (createDestination.trim() || createPurpose.trim()) {
      if (!createDestination.trim() || !createPurpose.trim()) {
        setCreateTripError(tr('أكمل الوجهة وغرض الرحلة الحاليين.', 'Complete the current destination and trip purpose.'));
        return;
      }
      finalDestinations.push({
        id: `destination-${Date.now()}-${finalDestinations.length}`,
        governorate_name: driverOffice.governorate,
        destination: createDestination.trim(),
        visit_location: createVisitLocation.trim(),
        purpose: createPurpose.trim(),
        completed: false,
      });
    }
    if (!finalDestinations.length) {
      setCreateTripError(tr('أضف وجهة واحدة على الأقل.', 'Add at least one destination.'));
      return;
    }

    const finalCompanions = [...createCompanions];
    if (createCompanionName.trim()) {
      finalCompanions.push({
        id: `companion-${Date.now()}-${finalCompanions.length}`,
        name: createCompanionName.trim(),
        job_title: createCompanionJobTitle.trim(),
      });
    } else if (createCompanionJobTitle.trim()) {
      setCreateTripError(tr('أدخل اسم المرافق الحالي.', 'Enter the current companion name.'));
      return;
    }

    const newTrip: Trip = {
      id: `trp-${Date.now()}`,
      trip_no: `TRIP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`,
      office_id: driver.office_id,
      driver_id: driver.id,
      vehicle_id: createTripVehicleId,
      trip_type: 'internal',
      governorate: driverOffice.governorate,
      start_point_type: 'office_branch',
      start_office_id: driverOffice.id,
      start_point_name: driverOffice.name,
      start_location_detail: '',
      destination: finalDestinations.map((destination) => destination.destination).join('، '),
      visit_location: finalDestinations.map((destination) => destination.visit_location).join('، '),
      purpose: finalDestinations.map((destination) => destination.purpose).join(' | '),
      destinations: finalDestinations,
      planned_departure_date: createTripDate,
      companions: finalCompanions,
      status: 'new',
      distance_gps: 0,
      distance_odometer: 0,
      distance_diff: 0,
      diff_status: 'normal',
      created_by: currentUser.username || currentUser.name || driver.employee_no,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    setIsCreatingTrip(true);
    setCreateTripError(null);
    const result = await syncSaveTrip(newTrip);
    setIsCreatingTrip(false);
    if (!result.success) {
      setCreateTripError(result.message || tr('تعذر إنشاء الرحلة.', 'Unable to create the trip.'));
      return;
    }
    DtmsStorage.saveTrip({
      ...newTrip,
      id: result.id || newTrip.id,
      trip_no: result.tripNo || newTrip.trip_no,
    }, false);
    setShowCreateTripModal(false);
    setActiveTab('new');
    setRefreshToast(tr('تم إنشاء الرحلة الداخلية وإضافتها إلى المهام الجديدة.', 'The internal trip was created and added to New tasks.'));
    setTimeout(() => setRefreshToast(null), 3000);
    if (onRefreshData) onRefreshData();
  };

  // Open Start Trip Flow
  const handleOpenStartTrip = async (trip: Trip) => {
    if (activeTrips.some((activeTrip) => activeTrip.id !== trip.id)) {
      setActiveTab('current');
      setRefreshToast(tr('أنهِ الرحلة النشطة قبل بدء رحلة أخرى.', 'End the active trip before starting another trip.'));
      setTimeout(() => setRefreshToast(null), 3000);
      return;
    }
    setSelectedTrip(trip);
    setStartError(null);
    setStartOdoPhoto(null);
    setPendingStartPhoto(null);
    setStartOdoReading(0);
    setStartOcrResult(null);
    startOcrResultRef.current = null;
    startEvidenceSavedRef.current = false;
    startCaptureVersionRef.current += 1;
    setIsSubmittingStart(false);

    // Business rule: verify vehicle is assigned
    if (!trip.vehicle_id) {
      setStartError(tr('قاعدة العمل: لا يمكن بدء الرحلة بدون تحديد وتخصيص مركبة للسائق!', 'A trip cannot start until a vehicle is assigned to the driver.'));
      setShowStartModal(true);
      return;
    }

    // GPS-disabled installations use neutral coordinates; enabled installations
    // require a real device position and never fabricate location evidence.
    setStartGpsData(isGPSTrackingEnabled() ? null : {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      speed: 0,
      heading: 0,
      timestamp: new Date().toISOString(),
      locationName: tr('تتبع GPS معطل', 'GPS tracking disabled'),
      governorate: '',
    });
    setShowStartModal(true);

    // Business rule: Request GPS immediately with safe fallback for LAN HTTP
    try {
      const gps = await requestCurrentGPSPosition();
      setStartGpsData(gps);
    } catch (error: any) {
      if (isGPSTrackingEnabled()) {
        setStartError(error?.message || tr('تعذر التحقق من موقع GPS.', 'Unable to verify the GPS location.'));
      }
    }
  };

  // Process any captured photo (from camera file, gallery, or sample) for Start Odometer
  const processStartPhoto = async (photoDataUrl: string) => {
    const captureVersion = ++startCaptureVersionRef.current;
    const tripId = selectedTrip!.id;
    setStartOdoPhoto(photoDataUrl);
    setStartOdoReading(0);
    setStartOcrResult(null);
    startOcrResultRef.current = null;
    startEvidenceSavedRef.current = false;
    setStartError(null);

    window.setTimeout(() => startReadingInputRef.current?.focus(), 0);

    try {
      // OCR runs independently; it must never populate or overwrite the driver's reading.
      const vehicle = getVehicleInfo(selectedTrip?.vehicle_id || '');
      const unit = normalizeOdometerUnit(vehicle?.odometer_unit);
      const expectedMin = roundOdometerReading(odometerFromKm(vehicle?.last_odometer || 48500, unit));
      const ocr = await performOdometerOCR(photoDataUrl, expectedMin, settings.default_ocr_engine, tripId);

      if (captureVersion !== startCaptureVersionRef.current) return;

      const result: OCRResult = {
        id: 'ocr-' + Date.now(),
        trip_id: tripId,
        type: 'start',
        raw_text: ocr.rawText,
        parsed_number: ocr.extractedNumber,
        confidence: ocr.confidence,
        processing_time_ms: ocr.processingTimeMs,
        engine: ocr.engine,
        preprocessed_image_url: ocr.preprocessedPreviewUrl,
      };
      startOcrResultRef.current = result;
      setStartOcrResult(result);
      DtmsStorage.saveOCRResult(result);
      if (startEvidenceSavedRef.current) {
        await syncAttachOdometerOcr({
          trip_id: tripId,
          type: 'start',
          ocr_result: ocr.extractedNumber,
          confidence_score: ocr.confidence,
        });
      }
    } catch (err) {
      console.warn('[DTMS OCR] Starting odometer analysis did not complete.', err);
    }
  };

  // Trigger file from mobile camera or file input
  const handleStartCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const dataUrl = await prepareOdometerPhoto(file);
    setPendingStartPhoto(dataUrl);
  };

  // Confirm Start Trip
  const handleConfirmStartTrip = async () => {
    if (!selectedTrip || !driver || !startOdoPhoto || !startOdoReading || !startGpsData) {
      setStartError(tr('يرجى التأكد من تشغيل GPS وتصوير العداد وقراءة الرقم قبل بدء الرحلة!', 'Verify GPS and capture a readable odometer photo before starting the trip.'));
      return;
    }
    if (isSubmittingStart) return;
    setIsSubmittingStart(true);

    const now = new Date();
    const departureTime = now.toTimeString().split(' ')[0].slice(0, 5);
    const departureDate = localDateValue(now);

    const updatedTrip: Trip = {
      ...selectedTrip,
      status: 'in_progress',
      departure_date: departureDate,
      departure_time: departureTime,
      departure_lat: startGpsData.latitude,
      departure_lng: startGpsData.longitude,
      departure_location_name: startGpsData.locationName,
    };

    const vehicle = getVehicleInfo(selectedTrip.vehicle_id);
    const readingUnit = normalizeOdometerUnit(vehicle?.odometer_unit);
    const startReadingKm = roundOdometerReading(odometerToKm(startOdoReading, readingUnit));

    // Save Odometer Record
    const evidenceSaved = await DtmsStorage.saveOdometerRecord({
      id: 'odo-' + Date.now(),
      trip_id: selectedTrip.id,
      type: 'start',
      reading: startReadingKm,
      display_reading: startOdoReading,
      reading_unit: readingUnit,
      photo_url: startOdoPhoto,
      ocr_result: startOcrResultRef.current ? String(startOcrResultRef.current.parsed_number) : '',
      confidence_score: startOcrResultRef.current?.confidence || 0,
      is_verified: true,
      manual_override: startOcrResultRef.current ? startOcrResultRef.current.parsed_number !== startOdoReading : false,
      created_at: `${departureDate} ${departureTime}:00`,
    });
    if (!evidenceSaved) {
      setIsSubmittingStart(false);
      setStartError(tr('تعذر حفظ صورة عداد البداية على الخادم. يرجى المحاولة مرة أخرى.', 'Could not save the starting odometer photo to the server. Please try again.'));
      return;
    }
    startEvidenceSavedRef.current = true;
    if (startOcrResultRef.current) {
      void syncAttachOdometerOcr({
        trip_id: selectedTrip.id,
        type: 'start',
        ocr_result: startOcrResultRef.current.parsed_number,
        confidence_score: startOcrResultRef.current.confidence,
      });
    }

    // Confirm the server transition before updating local state.
    const tripSaveResult = await syncSaveTrip(updatedTrip);
    if (!tripSaveResult.success) {
      setIsSubmittingStart(false);
      setStartError(tr(
        'تم حفظ صورة العداد، لكن تعذر بدء الرحلة على الخادم. حاول مرة أخرى.',
        tripSaveResult.message || 'The odometer photo was saved, but the server could not start the trip. Try again.'
      ));
      return;
    }
    DtmsStorage.saveTrip(updatedTrip, false);

    // Save Photo Verification
    DtmsStorage.savePhotoVerification({
      id: 'pv-' + Date.now(),
      trip_id: selectedTrip.id,
      photo_type: 'start_odometer',
      photo_url: startOdoPhoto,
      latitude: startGpsData.latitude,
      longitude: startGpsData.longitude,
      device_id: 'MOB-DRIVER-' + driver.employee_no,
      capture_date: departureDate,
      capture_time: departureTime,
      is_duplicate: false,
      is_tampered: false,
      watermark_applied: false,
    });

    // Update vehicle status
    if (vehicle) {
      DtmsStorage.saveVehicle({ ...vehicle, status: 'assigned', last_odometer: startReadingKm });
    }

    setShowStartModal(false);
    setActiveTab('current');
    if (onRefreshData) onRefreshData();
  };

  // Open End Trip Modal
  const handleOpenEndTrip = async (trip: Trip) => {
    const vehicle = getVehicleInfo(trip.vehicle_id);
    const readingUnit = normalizeOdometerUnit(vehicle?.odometer_unit);
    const localStartRecord = DtmsStorage.getOdometerRecords().find(
      (record) => record.trip_id === trip.id && record.type === 'start'
    );
    endStartReadingRef.current = localStartRecord
      ? getDisplayedOdometerReading(localStartRecord, trip.vehicle_id)
      : roundOdometerReading(odometerFromKm(vehicle?.last_odometer || 0, readingUnit));
    setSelectedTrip(trip);
    setEndError(null);
    setEndOdoPhoto(null);
    setPendingEndPhoto(null);
    setEndOdoReading(0);
    setEndOcrResult(null);
    endOcrResultRef.current = null;
    endEvidenceSavedRef.current = false;
    endCaptureVersionRef.current += 1;
    setIsSubmittingEnd(false);
    setDriverVisitNotes('');
    setWorkInternalCount(trip.internal_trip_count || 0);
    setWorkExternalCount(trip.external_trip_count || 0);
    setWorkRoutes(trip.work_session_routes || []);
    setWorkPassengerNames(trip.passenger_names || '');
    setShowEndSummary(false);

    setEndGpsData(isGPSTrackingEnabled() ? null : {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      speed: 0,
      heading: 0,
      timestamp: new Date().toISOString(),
      locationName: tr('تتبع GPS معطل', 'GPS tracking disabled'),
      governorate: '',
    });
    setShowEndModal(true);

    void fetchOdometerRecordsForTrip(trip.id).then((records) => {
      const serverStartRecord = records.find((record) => record.type === 'start');
      if (serverStartRecord) {
        endStartReadingRef.current = getDisplayedOdometerReading(serverStartRecord, trip.vehicle_id);
      }
    });

    try {
      const gps = await requestCurrentGPSPosition();
      setEndGpsData(gps);
    } catch (error: any) {
      if (isGPSTrackingEnabled()) {
        setEndError(error?.message || tr('تعذر التحقق من موقع GPS.', 'Unable to verify the GPS location.'));
      }
    }
  };

  const setExternalTripCount = (count: number) => {
    const safeCount = Math.max(0, Math.floor(count || 0));
    setWorkExternalCount(safeCount);
    setWorkRoutes((current) => Array.from({ length: safeCount }, (_, index) => current[index] || {
      id: `route-${Date.now()}-${index}`,
      from_governorate_id: driverOfficeGovernorate?.id || '',
      from_governorate_name: driverOfficeGovernorate?.name_ar || driverOffice?.governorate || '',
      to_governorate_id: '',
      to_governorate_name: '',
    }));
    setShowEndSummary(false);
  };

  const updateWorkRoute = (index: number, field: 'from' | 'to', governorateId: string) => {
    const governorate = governorates.find((item) => item.id === governorateId);
    setWorkRoutes((routes) => routes.map((route, routeIndex) => routeIndex === index ? {
      ...route,
      [`${field}_governorate_id`]: governorateId,
      [`${field}_governorate_name`]: governorate?.name_ar || '',
    } : route));
    setShowEndSummary(false);
  };

  const reviewEndWork = () => {
    if (!selectedTrip || !endOdoPhoto || !endOdoReading || !endGpsData) {
      setEndError(tr('التقط صورة عداد النهاية وأدخل القراءة أولاً.', 'Capture the ending odometer and enter its reading first.'));
      return;
    }
    if (selectedTrip.record_type === 'work_session') {
      const invalidRoute = workRoutes.some((route) =>
        !route.from_governorate_id || !route.to_governorate_id || route.from_governorate_id === route.to_governorate_id
      );
      if (workRoutes.length !== workExternalCount || invalidRoute) {
        setEndError(tr('حدد محافظة الانطلاق والوصول المختلفة لكل رحلة خارجية.', 'Select different from and to governorates for every external trip.'));
        return;
      }
      if (endOdoReading < endStartReadingRef.current) {
        setEndError(tr('لا يمكن أن تكون قراءة النهاية أقل من قراءة البداية.', 'The ending reading cannot be lower than the starting reading.'));
        return;
      }
      setEndError(null);
      setShowEndSummary(true);
      return;
    }
    void handleConfirmEndTrip();
  };

  // Process End Odometer photo
  const processEndPhoto = async (photoDataUrl: string) => {
    const captureVersion = ++endCaptureVersionRef.current;
    const tripId = selectedTrip!.id;
    setEndOdoPhoto(photoDataUrl);
    setEndOdoReading(0);
    setEndOcrResult(null);
    endOcrResultRef.current = null;
    endEvidenceSavedRef.current = false;
    setEndError(null);

    window.setTimeout(() => endReadingInputRef.current?.focus(), 0);

    try {
      // Find start odometer
      const expectedEnd = endStartReadingRef.current;

      const ocr = await performOdometerOCR(photoDataUrl, expectedEnd, settings.default_ocr_engine, tripId);

      if (captureVersion !== endCaptureVersionRef.current) return;

      const result: OCRResult = {
        id: 'ocr-end-' + Date.now(),
        trip_id: tripId,
        type: 'end',
        raw_text: ocr.rawText,
        parsed_number: ocr.extractedNumber,
        confidence: ocr.confidence,
        processing_time_ms: ocr.processingTimeMs,
        engine: ocr.engine,
        preprocessed_image_url: ocr.preprocessedPreviewUrl,
      };
      endOcrResultRef.current = result;
      setEndOcrResult(result);
      DtmsStorage.saveOCRResult(result);
      if (endEvidenceSavedRef.current) {
        await syncAttachOdometerOcr({
          trip_id: tripId,
          type: 'end',
          ocr_result: ocr.extractedNumber,
          confidence_score: ocr.confidence,
        });
      }
    } catch (err) {
      console.warn('[DTMS OCR] Ending odometer analysis did not complete.', err);
    }
  };

  const handleEndCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const dataUrl = await prepareOdometerPhoto(file);
    setPendingEndPhoto(dataUrl);
  };

  const handleOpenRevision = async (trip: Trip) => {
    let records = DtmsStorage.getOdometerRecords().filter((record) => record.trip_id === trip.id);
    const serverRecords = await fetchOdometerRecordsForTrip(trip.id);
    if (serverRecords.length > 0) records = serverRecords;
    const startRecord = records.find((record) => record.type === 'start');
    const endRecord = records.slice().reverse().find((record) => record.type === 'end');
    setSelectedTrip(trip);
    setRevisionStartReading(getDisplayedOdometerReading(startRecord, trip.vehicle_id));
    setRevisionEndReading(getDisplayedOdometerReading(endRecord, trip.vehicle_id));
    setWorkInternalCount(trip.internal_trip_count || 0);
    setWorkExternalCount(trip.external_trip_count || 0);
    setWorkRoutes(trip.work_session_routes || []);
    setWorkPassengerNames(trip.passenger_names || '');
    setRevisionError(null);
    setShowRevisionModal(true);
  };

  const handleSubmitRevision = async () => {
    if (!selectedTrip) return;
    if (!revisionStartReading || !revisionEndReading || revisionEndReading < revisionStartReading) {
      setRevisionError(tr(
        'يجب أن تكون قراءة النهاية مساوية أو أكبر من قراءة البداية.',
        'The ending reading must be equal to or greater than the starting reading.'
      ));
      return;
    }
    if (selectedTrip.record_type === 'work_session' && (
      workRoutes.length !== workExternalCount || workRoutes.some((route) =>
        !route.from_governorate_id || !route.to_governorate_id || route.from_governorate_id === route.to_governorate_id
      )
    )) {
      setRevisionError(tr('حدد مساراً صحيحاً لكل رحلة خارجية.', 'Enter a valid route for every external trip.'));
      return;
    }

    const readingUnit = getVehicleOdometerUnit(selectedTrip.vehicle_id);
    const startReadingKm = roundOdometerReading(odometerToKm(revisionStartReading, readingUnit));
    const endReadingKm = roundOdometerReading(odometerToKm(revisionEndReading, readingUnit));
    const distanceOdometer = roundOdometerReading(endReadingKm - startReadingKm);
    const evaluation = evaluateDistanceDiff(
      distanceOdometer,
      selectedTrip.distance_gps || 0,
      settings.gps_diff_normal_threshold,
      settings.gps_diff_review_threshold
    );

    setIsSubmittingRevision(true);
    setRevisionError(null);
    const result = await syncReviseTripOdometer({
      trip_id: selectedTrip.id,
      start_reading: startReadingKm,
      end_reading: endReadingKm,
      display_start_reading: revisionStartReading,
      display_end_reading: revisionEndReading,
      reading_unit: readingUnit,
      distance_gps: selectedTrip.distance_gps || 0,
      diff_status: evaluation.status,
      driver_notes: selectedTrip.driver_notes || '',
    });

    if (!result.success) {
      setIsSubmittingRevision(false);
      setRevisionError(result.message || tr('تعذر إرسال التصحيح.', 'Could not submit the correction.'));
      return;
    }

    const correctedTrip: Trip = {
      ...selectedTrip,
      status: 'pending_approval',
      distance_odometer: distanceOdometer,
      distance_diff: evaluation.diff,
      diff_status: evaluation.status,
      internal_trip_count: selectedTrip.record_type === 'work_session' ? workInternalCount : selectedTrip.internal_trip_count,
      external_trip_count: selectedTrip.record_type === 'work_session' ? workExternalCount : selectedTrip.external_trip_count,
      passenger_names: selectedTrip.record_type === 'work_session' ? workPassengerNames.trim() : selectedTrip.passenger_names,
      work_session_routes: selectedTrip.record_type === 'work_session' ? workRoutes : selectedTrip.work_session_routes,
    };
    if (selectedTrip.record_type === 'work_session') {
      const detailsResult = await syncSaveTrip(correctedTrip);
      if (!detailsResult.success) {
        setIsSubmittingRevision(false);
        setRevisionError(detailsResult.message || tr('تعذر حفظ تفاصيل العمل المصححة.', 'Could not save the corrected work details.'));
        return;
      }
    }

    DtmsStorage.reviseOdometerRecords(
      selectedTrip.id,
      startReadingKm,
      endReadingKm,
      revisionStartReading,
      revisionEndReading,
      readingUnit
    );
    DtmsStorage.saveTrip(correctedTrip, false);

    setIsSubmittingRevision(false);
    setShowRevisionModal(false);
    setUpdateTick((value) => value + 1);
    setRefreshToast(tr('تم إرسال قراءة العداد المصححة للمراجعة.', 'The corrected odometer reading was resubmitted for review.'));
    setTimeout(() => setRefreshToast(null), 3000);
    if (onRefreshData) onRefreshData();
  };

  // Confirm End Trip
  const handleConfirmEndTrip = async () => {
    if (!selectedTrip || !driver || !endOdoPhoto || !endOdoReading || !endGpsData) {
      setEndError(tr('يرجى تصوير عداد النهاية والتحقق من القراءة وموقع GPS!', 'Capture the final odometer and verify the reading and GPS location.'));
      return;
    }
    if (isSubmittingEnd) return;
    setIsSubmittingEnd(true);

    // Business rule: End reading must NOT be less than start reading
    const odoRecords = DtmsStorage.getOdometerRecords().filter(
      (o) => o.trip_id === selectedTrip.id && o.type === 'start'
    );
    const vehicle = getVehicleInfo(selectedTrip.vehicle_id);
    const readingUnit = normalizeOdometerUnit(vehicle?.odometer_unit);
    const startDisplayReading = endStartReadingRef.current || (odoRecords[0]
      ? getDisplayedOdometerReading(odoRecords[0], selectedTrip.vehicle_id)
      : roundOdometerReading(odometerFromKm(vehicle?.last_odometer || 0, readingUnit)));

    if (endOdoReading < startDisplayReading) {
      setIsSubmittingEnd(false);
      setEndError(tr(
        `قاعدة العمل: لا يمكن أن تكون قراءة النهاية (${endOdoReading} ${getOdometerUnitLabel(selectedTrip.vehicle_id)}) أقل من قراءة البداية (${startDisplayReading} ${getOdometerUnitLabel(selectedTrip.vehicle_id)})!`,
        `The final reading (${endOdoReading} ${getOdometerUnitLabel(selectedTrip.vehicle_id)}) cannot be lower than the starting reading (${startDisplayReading} ${getOdometerUnitLabel(selectedTrip.vehicle_id)}).`
      ));
      return;
    }

    const endReadingKm = roundOdometerReading(odometerToKm(endOdoReading, readingUnit));
    const startReadingKm = roundOdometerReading(odometerToKm(startDisplayReading, readingUnit));
    const actualOdoDistance = roundOdometerReading(endReadingKm - startReadingKm);

    // Calculate GPS Distance using departure coords and arrival coords
    let gpsDistance = selectedTrip.distance_gps || 0;
    if (selectedTrip.departure_lat && selectedTrip.departure_lng && endGpsData.latitude && endGpsData.longitude) {
      gpsDistance = calculateHaversineDistance(
        selectedTrip.departure_lat,
        selectedTrip.departure_lng,
        endGpsData.latitude,
        endGpsData.longitude
      );
    }
    // Compare Odometer vs GPS
    const evaluation = evaluateDistanceDiff(
      actualOdoDistance,
      gpsDistance,
      settings.gps_diff_normal_threshold,
      settings.gps_diff_review_threshold
    );

    const now = new Date();
    const arrivalTime = now.toTimeString().split(' ')[0].slice(0, 5);
    const arrivalDate = localDateValue(now);

    const updatedTrip: Trip = {
      ...selectedTrip,
      status: 'pending_approval',
      arrival_date: arrivalDate,
      arrival_time: arrivalTime,
      arrival_lat: endGpsData.latitude,
      arrival_lng: endGpsData.longitude,
      arrival_location_name: endGpsData.locationName,
      distance_odometer: actualOdoDistance,
      distance_gps: gpsDistance,
      distance_diff: evaluation.diff,
      diff_status: evaluation.status,
      driver_notes: driverVisitNotes || selectedTrip.driver_notes,
      internal_trip_count: selectedTrip.record_type === 'work_session' ? workInternalCount : selectedTrip.internal_trip_count,
      external_trip_count: selectedTrip.record_type === 'work_session' ? workExternalCount : selectedTrip.external_trip_count,
      passenger_names: selectedTrip.record_type === 'work_session' ? workPassengerNames.trim() : selectedTrip.passenger_names,
      work_session_routes: selectedTrip.record_type === 'work_session' ? workRoutes : selectedTrip.work_session_routes,
    };

    // Save End Odometer
    const evidenceSaved = await DtmsStorage.saveOdometerRecord({
      id: 'odo-end-' + Date.now(),
      trip_id: selectedTrip.id,
      type: 'end',
      reading: endReadingKm,
      display_reading: endOdoReading,
      reading_unit: readingUnit,
      photo_url: endOdoPhoto,
      ocr_result: endOcrResultRef.current ? String(endOcrResultRef.current.parsed_number) : '',
      confidence_score: endOcrResultRef.current?.confidence || 0,
      is_verified: true,
      manual_override: endOcrResultRef.current ? endOcrResultRef.current.parsed_number !== endOdoReading : false,
      created_at: `${arrivalDate} ${arrivalTime}:00`,
    });
    if (!evidenceSaved) {
      setIsSubmittingEnd(false);
      setEndError(tr('تعذر حفظ صورة عداد النهاية على الخادم. يرجى المحاولة مرة أخرى.', 'Could not save the ending odometer photo to the server. Please try again.'));
      return;
    }
    endEvidenceSavedRef.current = true;
    if (endOcrResultRef.current) {
      void syncAttachOdometerOcr({
        trip_id: selectedTrip.id,
        type: 'end',
        ocr_result: endOcrResultRef.current.parsed_number,
        confidence_score: endOcrResultRef.current.confidence,
      });
    }

    // Confirm completion on the server; never hide a failed status transition.
    const tripSaveResult = await syncSaveTrip(updatedTrip);
    if (!tripSaveResult.success) {
      setIsSubmittingEnd(false);
      setEndError(tr(
        'تم حفظ صورة عداد النهاية، لكن تعذر إنهاء الرحلة على الخادم. حاول مرة أخرى.',
        tripSaveResult.message || 'The ending odometer was saved, but the server could not complete the trip. Try again.'
      ));
      return;
    }
    DtmsStorage.saveTrip(updatedTrip, false);

    // Update vehicle last odometer
    if (vehicle) {
      DtmsStorage.saveVehicle({ ...vehicle, last_odometer: endReadingKm });
    }

    setShowEndModal(false);
    setActiveTab('completed');
    if (onRefreshData) onRefreshData();
  };

  if (currentUser.role === 'driver' && !driver) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-amber-300 bg-amber-50 p-5 text-center text-sm text-amber-900">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
        <p className="font-bold">{tr('ملف السائق غير مرتبط بحساب البوابة المركزية', 'Driver profile is not linked to the Central Portal account')}</p>
        <p className="mt-1 text-xs">{tr('تواصل مع مسؤول النظام لربط حسابك بملف السائق.', 'Contact the administrator to link your account to the driver profile.')}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2.5 pb-5 px-1 sm:space-y-4 sm:pb-10 sm:px-3 text-right">
      {/* Floating Refresh Toast */}
      {refreshToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-teal-800 text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border border-teal-600">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{refreshToast}</span>
        </div>
      )}

      {/* Friendly Driver Profile & Greeting Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0f172a 100%)',
          backgroundColor: '#042f2e',
          borderColor: 'rgba(13, 148, 136, 0.5)'
        }}
        className="dtms-driver-app-banner relative overflow-hidden rounded-2xl text-white p-3 sm:rounded-3xl sm:p-5 shadow-xl border border-teal-700/50"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5 sm:space-y-3.5">
          {/* Top Identity & Greeting Row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md border border-teal-300/30 shrink-0 sm:h-12 sm:w-12 sm:rounded-2xl">
                <Truck className="w-4 h-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ color: '#ffffff' }} className="text-[11px] font-semibold !text-white">
                  {getGreeting()}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 style={{ color: '#ffffff' }} className="text-sm sm:text-lg font-black !text-white leading-snug">
                    {driver?.full_name}
                  </h2>
                  <span style={{ color: '#ffffff' }} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-700/90 !text-white border border-teal-500/40 shrink-0">
                    {tr('سائق معتمد', 'Certified driver')}
                  </span>
                </div>
                <p style={{ color: '#ffffff' }} className="text-[11px] font-mono mt-0.5 !text-white">
                  {tr('رقم الموظف:', 'Employee No.:')} {driver?.employee_no} • {tr('رخصة:', 'License:')} {driver?.license_no}
                </p>
              </div>
            </div>

            {/* Quick Actions & Optional Active Trip Status */}
            <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
              <button
                onClick={handleManualRefresh}
                title={tr('تحديث بيانات الرحلات', 'Refresh trip data')}
                className="p-2 rounded-xl bg-teal-800/80 hover:bg-teal-700 text-teal-200 hover:text-white border border-teal-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
              </button>

              {onOpenChangePassword && (
                <button
                  onClick={onOpenChangePassword}
                  title={tr('تعديل كلمة المرور', 'Change password')}
                  className="p-2 rounded-xl bg-teal-800/80 hover:bg-teal-700 text-teal-200 hover:text-white border border-teal-700 transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  title={tr('تسجيل الخروج', 'Log out')}
                  className="p-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 hover:text-white border border-rose-700/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              {inProgressTrip && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold shadow-xs animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{isSimpleMode ? tr('العمل جارٍ', 'Work in progress') : tr('رحلة نشطة', 'Active trip')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin Preview Mode Switcher (Only visible to admin/supervisor to test driver isolation) */}
          {currentUser.role !== 'driver' && drivers.length > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-xs">
              <span style={{ color: '#000000' }} className="dtms-preview-label !text-black font-bold shrink-0">{tr('معاينة كسائق:', 'Preview as driver:')}</span>
              <select
                value={driver?.id}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                style={{ color: '#000000', backgroundColor: '#ffffff' }}
                className="dtms-driver-app-select bg-white !text-black text-xs font-bold rounded-xl px-2.5 py-1.5 border border-teal-500/60 focus:outline-none focus:ring-2 focus:ring-teal-300 w-full"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                    {d.full_name} ({tr('رقم وظيفي:', 'Employee No.:')} {d.employee_no})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Complex mode retains task metrics; simple mode uses the compact tabs below. */}
          {!isSimpleMode && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            <button
              onClick={() => setActiveTab('current')}
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              className="dtms-driver-metric-card p-2.5 rounded-2xl border border-gray-200 transition-all text-right sm:text-center bg-white shadow-xs"
            >
              <span style={{ color: '#000000' }} className="block text-[11px] font-bold !text-black">{isSimpleMode ? tr('العمل الحالي', 'Current work') : tr('الرحلة النشطة', 'Active trip')}</span>
              <span style={{ color: '#000000' }} className="text-lg font-black font-mono !text-black">{activeTrips.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('new')}
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              className="dtms-driver-metric-card p-2.5 rounded-2xl border border-gray-200 transition-all text-right sm:text-center bg-white shadow-xs"
            >
              <span style={{ color: '#000000' }} className="block text-[11px] font-bold !text-black">{tr('مهام جديدة', 'New tasks')}</span>
              <span style={{ color: '#000000' }} className="text-lg font-black font-mono !text-black">{newTrips.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('revision')}
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              className="dtms-driver-metric-card p-2.5 rounded-2xl border border-gray-200 transition-all text-right sm:text-center bg-white shadow-xs"
            >
              <span style={{ color: '#000000' }} className="block text-[11px] font-bold !text-black">{tr('تحتاج تصحيح', 'Needs correction')}</span>
              <span style={{ color: '#000000' }} className="text-lg font-black font-mono !text-black">{revisionTrips.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              className="dtms-driver-metric-card p-2.5 rounded-2xl border border-gray-200 transition-all text-right sm:text-center bg-white shadow-xs"
            >
              <span style={{ color: '#000000' }} className="block text-[11px] font-bold !text-black">{tr('المنجزة', 'Completed')}</span>
              <span style={{ color: '#000000' }} className="text-lg font-black font-mono !text-black">{completedTripsList.length}</span>
            </button>
          </div>}

          {/* Live GPS Telemetry if trip in progress */}
          {isGPSTrackingEnabled() && inProgressTrip && liveGpsCoords && (
            <div className="pt-2.5 border-t border-teal-700/60 flex items-center justify-between text-xs text-teal-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-xs">{tr('تتبع GPS المباشر نشط', 'Live GPS tracking is active')}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono bg-teal-950/70 px-2.5 py-1 rounded-xl border border-teal-800">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>{tr('السرعة:', 'Speed:')} {liveGpsCoords.speed} {tr('كم/س', 'km/h')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentUser.role === 'driver' && driver && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={isSimpleMode ? createAndStartWorkSession : openDriverTripCreator}
            disabled={isSimpleMode && (hasActiveDriverWork || isCreatingTrip)}
            aria-disabled={isSimpleMode && (hasActiveDriverWork || isCreatingTrip)}
            className="w-full min-h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:text-gray-100 disabled:cursor-not-allowed disabled:shadow-none text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
            title={hasActiveDriverWork
              ? tr('يجب إنهاء العمل الحالي قبل بدء سجل عمل جديد', 'Finish the current work session before starting another')
              : isSimpleMode ? tr('بدء سجل عمل جديد', 'Start a new work session') : tr('إنشاء رحلة داخلية', 'Create an internal trip')}
          >
            {isCreatingTrip ? <RefreshCw className="w-5 h-5 animate-spin" /> : hasActiveDriverWork && isSimpleMode ? <Clock className="w-5 h-5" /> : isSimpleMode ? <Play className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>{hasActiveDriverWork && isSimpleMode
              ? tr('العمل الحالي جارٍ - أنهِ العمل للبدء من جديد', 'Work in progress - finish it before starting again')
              : isSimpleMode ? tr('بدء العمل', 'Start Work') : tr('إنشاء رحلة داخلية', 'Create Internal Trip')}</span>
          </button>
        </div>
      )}

      {/* Sticky Ergonomic Touch Tabs */}
      <div className="sticky top-16 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 py-1 shadow-xs rounded-xl sm:py-1.5 sm:rounded-2xl">
        <div className={`grid ${isSimpleMode ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700`}>
          <button
            id="driver-tab-current"
            onClick={() => setActiveTab('current')}
                className={`min-w-0 py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all text-center flex flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'current'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{tr('الحالية', 'Current')}</span>
            {activeTrips.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-teal-800 text-[10px] font-black">
                {activeTrips.length}
              </span>
            )}
          </button>

          {!isSimpleMode && <button
            id="driver-tab-new"
            onClick={() => setActiveTab('new')}
                className={`min-w-0 py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all text-center flex flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'new'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400'
            }`}
          >
            <Navigation className="w-4 h-4 shrink-0" />
            <span>{tr('جديدة', 'New')}</span>
            {newTrips.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {newTrips.length}
              </span>
            )}
          </button>}

          <button
            id="driver-tab-revision"
            onClick={() => setActiveTab('revision')}
            className={`min-w-0 py-2 px-1 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all text-center flex flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'revision'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-orange-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{tr('للتصحيح', 'Corrections')}</span>
            {revisionTrips.length > 0 && <span className="text-[10px]">({revisionTrips.length})</span>}
          </button>

          <button
            id="driver-tab-completed"
            onClick={() => setActiveTab('completed')}
            className={`min-w-0 py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all text-center flex flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{tr('المنجزة', 'Completed')}</span>
            <span className="text-[10px] opacity-80">({completedTripsList.length})</span>
          </button>
        </div>
      </div>

      {/* Trips Content List - Smoothly Scrollable & High Contrast */}
      <div className="space-y-4 min-w-0">
        {/* Tab 1: Current In-Progress Trip */}
        {activeTab === 'current' && (
          <div className="space-y-4">
            {activeTrips.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 mx-auto flex items-center justify-center">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{isSimpleMode ? tr('لم يتم بدء العمل حالياً', 'Work has not been started') : tr('لا توجد رحلة قيد التنفيذ حالياً', 'No trip is currently in progress')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {isSimpleMode ? tr('اضغط على زر بدء العمل ثم التقط صورة عداد المركبة وأدخل القراءة.', 'Press Start Work, photograph the vehicle odometer, and enter the reading.') : tr('يمكنك مراجعة تبويب "مهام جديدة" لبدء المهام المسندة إليك وتوثيق عداد الانطلاق بالكاميرا', 'Open the "New tasks" tab to start an assigned trip and document the starting odometer.')}
                </p>
                {!isSimpleMode && newTrips.length > 0 && (
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-2"
                  >
                    <span>{tr('الانتقال للمهام الجديدة', 'Go to new tasks')} ({newTrips.length})</span>
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              activeTrips.map((trip) => {
                const vehicle = getVehicleInfo(trip.vehicle_id);
                const office = getOfficeInfo(trip.office_id);
                return (
                  <div
                    key={trip.id}
                    className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-500 dark:border-teal-500 shadow-xl space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm sm:text-base text-teal-700 dark:text-teal-300">
                          {trip.trip_no}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{tr('قيد التنفيذ الآن', 'In progress now')}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                          {trip.record_type === 'work_session' ? tr('سجل عمل', 'Work session') : trip.trip_type === 'internal' ? tr('داخلية', 'Internal') : tr('خارجية', 'External')}
                        </span>
                      </div>

                      <div className="text-left text-xs font-mono text-gray-500 dark:text-gray-400">
                        {trip.departure_time}
                      </div>
                    </div>

                    {isSimpleMode && (
                      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-xs dark:border-teal-900 dark:bg-teal-950/30">
                        <div><span className="block text-[10px] text-gray-500">{tr('بدأ العمل في', 'Work started at')}</span><strong className="font-mono">{trip.departure_date} {trip.departure_time}</strong></div>
                        <div><span className="block text-[10px] text-gray-500">{tr('عداد البداية', 'Starting odometer')}</span><strong className="font-mono">{odoRecords.find((record) => record.trip_id === trip.id && record.type === 'start') ? getDisplayedOdometerReading(odoRecords.find((record) => record.trip_id === trip.id && record.type === 'start'), trip.vehicle_id) : '-'} {getOdometerUnitLabel(trip.vehicle_id)}</strong></div>
                      </div>
                    )}

                    {/* Clear Route Path Visualization */}
                    {!isSimpleMode && <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-start gap-2.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-100 dark:ring-emerald-950" />
                        <div>
                          <span className="text-[10px] text-gray-400 block">{tr('نقطة الانطلاق:', 'Starting point:')}</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {office?.name || tr('مكتب بغداد الرئيسي', 'Baghdad Main Office')}
                          </span>
                        </div>
                      </div>

                      <div className="mr-1 pr-2 border-r-2 border-dashed border-teal-300 dark:border-teal-700 text-[10px] text-teal-600 dark:text-teal-400 font-bold py-0.5 min-h-[1.5rem]">
                        {isGPSTrackingEnabled() && tr('مسار الرحلة المباشر • تتبع GPS نشط', 'Live trip route • GPS tracking active')}
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0 ring-4 ring-rose-100 dark:ring-rose-950" />
                        <div className="flex-1 w-full min-w-0">
                          <span className="text-[10px] text-gray-400 block mb-1">{tr('الوجهة المقصودة / مسار الرحلة:', 'Destination / trip route:')}</span>
                          
                          {/* Multi-destinations Grid */}
                          {trip.destinations && trip.destinations.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 mt-2 w-full">
                              {trip.destinations.map((dest, idx) => (
                                <div 
                                  key={dest.id} 
                                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-colors ${
                                    dest.completed 
                                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50' 
                                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                      <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${dest.completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-800'}`}>
                                        {idx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <span className={`font-bold text-sm block truncate ${dest.completed ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-teal-700 dark:text-teal-300'}`}>
                                          {dest.destination}
                                        </span>
                                        {dest.visit_location && (
                                          <span className="text-[10px] text-gray-500 block truncate">{dest.visit_location}</span>
                                        )}
                                      </div>
                                    </div>
                                    {dest.completed ? (
                                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {tr('مكتملة', 'Completed')}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleCompleteDestination(trip.id, dest.id)}
                                        disabled={completingDestinationKey === `${trip.id}:${dest.id}`}
                                        className="shrink-0 ml-2 px-2.5 py-1.5 rounded-md border border-emerald-600 bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
                                      >
                                        {completingDestinationKey === `${trip.id}:${dest.id}`
                                          ? tr('جارٍ الحفظ...', 'Saving...')
                                          : tr('إكمال الوجهة', 'Complete destination')}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {dest.purpose && (
                                    <div className={`text-[10px] p-1.5 rounded-lg ${dest.completed ? 'bg-emerald-100/50 text-emerald-800 dark:bg-emerald-900/30' : 'bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>
                                      <span className="font-bold">{tr('الغرض:', 'Purpose:')}</span> {dest.purpose}
                                    </div>
                                  )}
                                  
                                  {dest.completed && dest.completed_at && (
                                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                      {tr('وقت الإنجاز:', 'Completed at:')} {formatDestinationCompletion(dest.completed_at)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span className="font-bold text-base text-teal-700 dark:text-teal-300">
                                {trip.destination}
                              </span>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {trip.visit_location} • {trip.governorate}
                              </p>
                              <div className="mt-2 p-2 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50">
                                <span className="font-bold text-teal-900 dark:text-teal-200 block mb-0.5 text-[10px]">{tr('الغرض من الزيارة:', 'Visit purpose:')}</span>
                                <p className="text-teal-800 dark:text-teal-300">{trip.purpose}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>}

                    {/* Active work records show the vehicle only; passengers are documented at completion. */}
                    <div className="grid grid-cols-1 gap-2.5 text-xs">
                      <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 block">{tr('المركبة المخصصة:', 'Assigned vehicle:')}</span>
                          <span className="font-bold text-gray-900 dark:text-white truncate block">
                            {vehicle?.vehicle_type} [{vehicle?.vehicle_category || 'خصوصي'}] ({vehicle?.plate_no})
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Big Action Button: End Trip */}
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
                      {trip.destinations && trip.destinations.length > 1 && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-2.5 py-2">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{tr(
                            'تسجيل إنجاز كل وجهة اختياري ولا يمنع إنهاء الرحلة.',
                            'Completing individual destinations is optional and does not prevent ending the trip.'
                          )}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{tr('عند وصولك للوجهة النهائية: التقط صورة العداد لحساب الكيلومترات واعتماد الرحلة', 'At the final destination, photograph the odometer to calculate the distance and submit the trip.')}</span>
                      </div>

                      <button
                        id={`btn-end-trip-${trip.id}`}
                        onClick={() => handleOpenEndTrip(trip)}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{isSimpleMode ? tr('إنهاء العمل وتوثيق العداد', 'End work and document odometer') : tr('إنهاء الرحلة وتوثيق العداد', 'End trip and document odometer')}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: New Trips */}
        {!isSimpleMode && activeTab === 'new' && (
          <div className="space-y-4">
            {newTrips.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{tr('لا توجد رحلات جديدة معلقة', 'No new trips are pending')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {tr('كافة المهام مكتملة أو جارية. سيظهر هنا أي تكليف جديد فور إرساله من مسؤول السائقين', 'All tasks are completed or in progress. New assignments will appear here when sent by the driver supervisor.')}
                </p>
              </div>
            ) : (
              newTrips.map((trip) => {
                const vehicle = getVehicleInfo(trip.vehicle_id);
                const office = getOfficeInfo(trip.office_id);
                return (
                  <div
                    key={trip.id}
                    className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-teal-500 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm sm:text-base text-teal-700 dark:text-teal-300">
                          {trip.trip_no}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {tr('مهمة جديدة', 'New task')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                          {trip.trip_type === 'internal' ? tr('داخلية', 'Internal') : tr('خارجية', 'External')}
                        </span>
                      </div>

                      <div className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {tr('تاريخ:', 'Date:')} {trip.planned_departure_date}
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-start gap-2.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <div>
                          <span className="text-[10px] text-gray-400 block">{tr('الانطلاق من:', 'Departing from:')}</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {office?.name || tr('مقر الفرع الرئيسي', 'Main branch office')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 mt-1 shrink-0" />
                        <div>
                          <span className="text-[10px] text-gray-400 block">{tr('الوجهة المحددة:', 'Destination:')}</span>
                          <span className="font-bold text-base text-gray-900 dark:text-white">
                            {trip.destination}
                          </span>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {trip.visit_location} • {trip.governorate}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 text-xs text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700/60">
                      <span className="font-bold text-gray-900 dark:text-white block mb-0.5">{tr('الغرض من الرحلة:', 'Trip purpose:')}</span>
                      {trip.purpose}
                    </div>

                    {/* Vehicle & Companions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
                        <Car className="w-4 h-4 text-teal-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 block">{tr('المركبة:', 'Vehicle:')}</span>
                          <span className="font-bold text-gray-900 dark:text-white truncate block">
                            {vehicle?.vehicle_type} [{vehicle?.vehicle_category || 'خصوصي'}] ({vehicle?.plate_no})
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-teal-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 block">{tr('المرافقون:', 'Companions:')}</span>
                          <span className="font-bold text-gray-900 dark:text-white truncate block">
                            {Array.isArray(trip.companions) && trip.companions.length > 0
                              ? trip.companions.map((c) => c.name).join('، ')
                              : tr('بدون مرافقين', 'No companions')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Big Start Trip Button */}
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">
                        {tr('* يتطلب بدء الرحلة تصوير العداد وإدخال القراءة الظاهرة', '* Starting a trip requires an odometer photo and the displayed reading.')}
                      </div>
                      <button
                        id={`btn-start-trip-${trip.id}`}
                        onClick={() => handleOpenStartTrip(trip)}
                        disabled={activeTrips.some((activeTrip) => activeTrip.id !== trip.id)}
                        title={activeTrips.some((activeTrip) => activeTrip.id !== trip.id)
                          ? tr('أنهِ الرحلة النشطة أولاً.', 'End the active trip first.')
                          : tr('بدء الرحلة', 'Start trip')}
                        className="w-full py-4 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-black text-sm shadow-md flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{tr('بدء الرحلة وتصوير العداد', 'Start trip and photograph odometer')}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Completed and correction queues share the same evidence card layout. */}
        {(activeTab === 'completed' || activeTab === 'revision') && (
          <div className="space-y-3">
            {(activeTab === 'revision' ? revisionTrips : completedTripsList).length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
                {activeTab === 'revision' ? <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-2" /> : <CheckCircle2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />}
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {activeTab === 'revision' ? tr('لا توجد رحلات تحتاج إلى تصحيح', 'No trips need correction') : tr('لا توجد رحلات سابقة منجزة', 'No completed trips')}
                </h3>
              </div>
            ) : (
              (activeTab === 'revision' ? revisionTrips : completedTripsList).map((trip) => {
                const isApproved = trip.status === 'approved';
                const isPending = trip.status === 'pending_approval';
                const isRevision = trip.status === 'revision_requested';
                const isRejected = trip.status === 'rejected';
                const isExpanded = expandedTripId === trip.id;
                const tripRecords = odoRecords.filter((o) => o.trip_id === trip.id);
                const startRec = tripRecords.find((r) => r.type === 'start');
                const endRec = tripRecords.slice().reverse().find((r) => r.type === 'end');

                return (
                  <div
                    key={trip.id}
                    className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3 transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-gray-900 dark:text-white">
                          {trip.trip_no}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isApproved
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : isPending
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : isRevision
                              ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {isApproved
                            ? tr('معتمدة ومؤيدة رسمياً', 'Officially approved and endorsed')
                            : isPending
                              ? tr('بانتظار التأييد والاعتماد', 'Awaiting approval and endorsement')
                              : isRevision
                                ? tr('يوجد ملاحظات - مطلوب مراجعة', 'Notes received - correction required')
                                : tr('مرفوضة', 'Rejected')}
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-gray-400">
                        {trip.departure_date}
                      </span>
                    </div>

                    {/* Destination */}
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white">
                        {trip.destination}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {trip.visit_location} • {trip.governorate}
                      </p>
                    </div>

                    {trip.record_type === 'work_session' && (
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"><span className="block text-[10px] text-gray-500">{tr('الرحلات الداخلية', 'Internal trips')}</span><strong className="text-base">{trip.internal_trip_count || 0}</strong></div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"><span className="block text-[10px] text-gray-500">{tr('الرحلات الخارجية', 'External trips')}</span><strong className="text-base">{trip.external_trip_count || 0}</strong></div>
                      </div>
                    )}

                    {/* Metric Pills Grid */}
                    <div className={`${isGPSTrackingEnabled() ? 'grid grid-cols-3' : 'grid grid-cols-1'} gap-2 pt-1 text-center text-xs`}>
                      <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                        <span className="text-[10px] text-gray-400 block">{tr('مسافة العداد:', 'Odometer distance:')}</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                          {trip.distance_odometer} {tr('كم', 'km')}
                        </span>
                      </div>

                      {isGPSTrackingEnabled() && <>
                        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                          <span className="text-[10px] text-gray-400 block">{tr('مسافة GPS:', 'GPS distance:')}</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                            {trip.distance_gps} {tr('كم', 'km')}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60">
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 block">{tr('فارق المسافة:', 'Distance difference:')}</span>
                          <span className="font-mono font-black text-teal-700 dark:text-teal-300 text-sm">
                            {trip.distance_diff} {tr('كم', 'km')}
                          </span>
                        </div>
                      </>}
                    </div>

                    {/* Expand/Collapse Full Trip Details */}
                    <button
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span>{isExpanded ? tr('إخفاء التفاصيل وصور العداد', 'Hide details and odometer photos') : tr('عرض التفاصيل وصور العداد والتوثيق', 'Show details and odometer documentation')}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Expanded trip evidence */}
                    {isExpanded && (
                      <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 space-y-3 text-xs animate-fadeIn">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                            <span className="text-[10px] text-gray-400 block">{tr('وقت وتاريخ الانطلاق:', 'Departure date and time:')}</span>
                            <span className="font-bold text-gray-900 dark:text-white block font-mono">
                              {trip.departure_date} {trip.departure_time}
                            </span>
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 block mt-1 font-mono">
                              {tr('عداد البداية:', 'Start odometer:')} {startRec ? getDisplayedOdometerReading(startRec, trip.vehicle_id) : '-'} {getOdometerUnitLabel(trip.vehicle_id)}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                            <span className="text-[10px] text-gray-400 block">{tr('وقت وتاريخ الوصول:', 'Arrival date and time:')}</span>
                            <span className="font-bold text-gray-900 dark:text-white block font-mono">
                              {trip.arrival_date || trip.departure_date} {trip.arrival_time || '15:30'}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
                              {tr('عداد النهاية:', 'End odometer:')} {endRec ? getDisplayedOdometerReading(endRec, trip.vehicle_id) : '-'} {getOdometerUnitLabel(trip.vehicle_id)}
                            </span>
                          </div>
                        </div>

                        {/* Odometer Proof Photos Thumbnails */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {startRec?.photo_url && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">
                                {tr('صورة عداد الانطلاق (موثقة)', 'Start odometer photo (verified)')}
                              </span>
                              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 aspect-video bg-black/5">
                                <img
                                  src={startRec.photo_url}
                                  alt={tr('عداد الانطلاق', 'Start odometer')}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px]">
                                  {tr('قراءة السائق:', 'Driver reading:')} {getDisplayedOdometerReading(startRec, trip.vehicle_id)} {getOdometerUnitLabel(trip.vehicle_id)}
                                </span>
                              </div>
                            </div>
                          )}

                          {endRec?.photo_url && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">
                                {tr('صورة عداد الوصول (موثقة)', 'End odometer photo (verified)')}
                              </span>
                              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 aspect-video bg-black/5">
                                <img
                                  src={endRec.photo_url}
                                  alt={tr('عداد الوصول', 'End odometer')}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px]">
                                  {tr('قراءة السائق:', 'Driver reading:')} {getDisplayedOdometerReading(endRec, trip.vehicle_id)} {getOdometerUnitLabel(trip.vehicle_id)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Supervisor Notes if any */}
                        {trip.supervisor_notes && (
                          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px]">
                            <span className="font-bold text-teal-900 dark:text-teal-200 block mb-0.5">{tr('ملاحظات المشرف:', 'Supervisor notes:')}</span>
                            <p className="text-teal-800 dark:text-teal-300">{trip.supervisor_notes}</p>
                          </div>
                        )}
                        
                        {/* Action to fix revision */}
                        {isRevision && (
                          <button
                            onClick={() => handleOpenRevision(trip)}
                            className="w-full mt-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-colors"
                          >
                            <Gauge className="w-4 h-4" />
                            <span>{tr('تصحيح قراءات العداد وإعادة الإرسال', 'Correct odometer readings and resubmit')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* DRIVER INTERNAL TRIP CREATOR */}
      {/* ======================================================== */}
      {showCreateTripModal && currentUser.role === 'driver' && driver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-[min(96vw,760px)] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-bold text-sm">{tr('إنشاء رحلة داخلية', 'Create Internal Trip')}</h3>
                  <p className="text-[11px] text-teal-200">{tr('ستظهر الرحلة في المهام الجديدة ويُسجل اسمك كمنشئ لها.', 'The trip will appear in New tasks and your account will be recorded as its creator.')}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateTripModal(false)} title={tr('إغلاق', 'Close')} className="text-teal-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitDriverTrip} className="p-5 overflow-y-auto space-y-4 flex-1">
              {createTripError && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{createTripError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="block text-[10px] text-gray-500">{tr('نوع الرحلة', 'Trip type')}</span>
                  <strong className="text-xs text-gray-900">{tr('داخلية', 'Internal')}</strong>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="block text-[10px] text-gray-500">{tr('المكتب المسؤول ونقطة الانطلاق', 'Responsible office and starting point')}</span>
                  <strong className="text-xs text-gray-900">{driverOffice?.name || '-'}</strong>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('المركبة', 'Vehicle')}</label>
                  <select value={createTripVehicleId} onChange={(event) => setCreateTripVehicleId(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs">
                    <option value="">{tr('اختر المركبة المخصصة', 'Select assigned vehicle')}</option>
                    {assignedVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_no} - {vehicle.plate_no} ({normalizeOdometerUnit(vehicle.odometer_unit) === 'mile' ? tr('ميل', 'Miles') : tr('كيلومتر', 'Kilometers')})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('تاريخ المغادرة المخطط', 'Planned departure date')}</label>
                  <input type="date" value={createTripDate} min={new Date().toISOString().split('T')[0]} onChange={(event) => setCreateTripDate(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs" required />
                </div>
              </div>

              {createDestinations.length > 0 && (
                <div className="space-y-2">
                  {createDestinations.map((destination, index) => (
                    <div key={destination.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100">
                      <div className="min-w-0">
                        <strong className="block text-xs text-teal-900">{index + 1}. {destination.destination}</strong>
                        <span className="block text-[11px] text-gray-600">{destination.visit_location || '-'} · {destination.purpose}</span>
                      </div>
                      <button type="button" onClick={() => setCreateDestinations((destinations) => destinations.filter((item) => item.id !== destination.id))} title={tr('حذف الوجهة', 'Delete destination')} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <h4 className="text-xs font-bold text-gray-800">{tr('تفاصيل الوجهة', 'Destination Details')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={createDestination} onChange={(event) => setCreateDestination(event.target.value)} placeholder={tr('الوجهة', 'Destination')} className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs" />
                  <input value={createVisitLocation} onChange={(event) => setCreateVisitLocation(event.target.value)} placeholder={tr('الموقع الدقيق (اختياري)', 'Exact location (optional)')} className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs" />
                  <input value={createPurpose} onChange={(event) => setCreatePurpose(event.target.value)} placeholder={tr('غرض الرحلة', 'Trip purpose')} className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs" />
                </div>
                <button type="button" onClick={addDriverDestination} className="w-full py-2 rounded-xl border border-teal-300 text-teal-700 hover:bg-teal-50 text-xs font-bold flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  {tr('إضافة وجهة أخرى', 'Add Destination')}
                </button>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  {tr('المرافقون (اختياري)', 'Companions (Optional)')}
                </h4>

                {createCompanions.length > 0 && (
                  <div className="space-y-2">
                    {createCompanions.map((companion, index) => (
                      <div key={companion.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-gray-200">
                        <div className="min-w-0">
                          <strong className="block text-xs text-gray-900">{index + 1}. {companion.name}</strong>
                          {companion.job_title && <span className="block text-[11px] text-gray-500">{companion.job_title}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCreateCompanions((companions) => companions.filter((item) => item.id !== companion.id))}
                          title={tr('حذف المرافق', 'Remove companion')}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    value={createCompanionName}
                    onChange={(event) => setCreateCompanionName(event.target.value)}
                    placeholder={tr('اسم المرافق', 'Companion name')}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs"
                  />
                  <input
                    value={createCompanionJobTitle}
                    onChange={(event) => setCreateCompanionJobTitle(event.target.value)}
                    placeholder={tr('المسمى الوظيفي', 'Job title / position')}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs"
                  />
                  <button type="button" onClick={addDriverCompanion} className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    {tr('إضافة', 'Add')}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateTripModal(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600">{tr('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={isCreatingTrip} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50">
                  {isCreatingTrip ? tr('جاري الإنشاء...', 'Creating...') : tr('إنشاء الرحلة', 'Create Trip')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* START TRIP MODAL WITH CAMERA OCR & WATERMARK */}
      {/* ======================================================== */}
      {showStartModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-slate-800">
            <div className="shrink-0 p-3.5 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-teal-900 text-white">
              <div>
                <h3 className="font-bold text-sm">{selectedTrip.record_type === 'work_session' ? tr('بدء العمل وتوثيق عداد البداية', 'Start work and document starting odometer') : tr('بدء الرحلة وتوثيق عداد الانطلاق', 'Start trip and document starting odometer')}</h3>
                <p className="text-[11px] text-teal-300">
                  {selectedTrip.trip_no} • {selectedTrip.record_type === 'work_session'
                    ? tr('سجل عمل يومي', 'Daily work session')
                    : selectedTrip.destination}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                aria-label={tr('إغلاق', 'Close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-teal-200 hover:bg-white/10 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {/* Error Alert */}
              {startError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{startError}</span>
                </div>
              )}
              {/* GPS Status Indicator */}
              {isGPSTrackingEnabled() && (
                <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <span>{tr('حالة موقع GPS:', 'GPS location status:')}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        startGpsData
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {startGpsData ? tr('تم التحقق من الموقع', 'Location verified') : tr('جاري الفحص...', 'Checking...')}
                    </span>
                  </div>
                  {startGpsData && (
                    <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {startGpsData.locationName} (Lat: {startGpsData.latitude.toFixed(5)}, Lng:{' '}
                      {startGpsData.longitude.toFixed(5)})
                    </p>
                  )}
                </div>
              )}

              {/* Camera Capture Area */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  {tr('تصوير عداد المركبة الحالي (مباشر بالكاميرا):', 'Photograph the current vehicle odometer (live camera):')}
                </label>

                {/* Hidden native mobile camera input */}
                <input
                  ref={startCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleStartCameraFile}
                />

                {pendingStartPhoto && (
                  <OdometerPhotoCropper
                    image={pendingStartPhoto}
                    onConfirm={async (photo) => {
                      setPendingStartPhoto(null);
                      await processStartPhoto(photo);
                    }}
                    onUseFullImage={async () => {
                      const photo = pendingStartPhoto;
                      setPendingStartPhoto(null);
                      await processStartPhoto(photo);
                    }}
                    onCancel={() => setPendingStartPhoto(null)}
                  />
                )}

                {!startOdoPhoto ? (
                  <OdometerCamera
                    onCapture={setPendingStartPhoto}
                    onNativeFallback={() => startCameraInputRef.current?.click()}
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Original photo preview */}
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 relative bg-black">
                      <img
                        src={startOdoPhoto}
                        alt={tr('عداد البداية', 'Start odometer')}
                        className="h-40 w-full object-contain sm:h-48"
                      />
                    </div>

                    {/* Driver entry is authoritative; OCR remains separate audit evidence. */}
                    <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
                      <div className="text-xs">
                        <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-teal-600" />
                          <span>{tr('أدخل قراءة العداد الظاهرة في الصورة', 'Enter the odometer reading shown in the photo')}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">
                            {tr('قراءة السائق:', 'Driver-entered reading:')}
                          </label>
                          <input
                            ref={startReadingInputRef}
                            type="number"
                            inputMode="decimal"
                            min="0.1"
                            step="0.1"
                            value={startOdoReading || ''}
                            onChange={(e) => setStartOdoReading(Number(e.target.value))}
                            placeholder={tr('أدخل القراءة', 'Enter reading')}
                            autoComplete="off"
                            className="w-full px-3 py-3 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono font-bold text-xl text-center"
                          />
                          <span className="block mt-1 text-center text-[11px] font-bold text-teal-700 dark:text-teal-300">
                            {getOdometerUnitLabel(selectedTrip.vehicle_id)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            startCaptureVersionRef.current += 1;
                            setStartOdoPhoto(null);
                            setPendingStartPhoto(null);
                            setStartOdoReading(0);
                            setStartOcrResult(null);
                            startOcrResultRef.current = null;
                          }}
                          title={tr('إعادة التصوير بالكاميرا', 'Retake photo')}
                          className="mt-4 flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-teal-300 p-2.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{tr('إعادة التقاط', 'Retake')}</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-teal-200 pt-2 text-[11px] dark:border-teal-800">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          {tr('قراءة OCR المرجعية:', 'OCR reference reading:')}
                        </span>
                        <strong className="font-mono text-teal-800 dark:text-teal-200">
                          {startOcrResult ? `${startOcrResult.parsed_number} ${getOdometerUnitLabel(selectedTrip.vehicle_id)}` : '—'}
                          {startOcrResult ? ` (${startOcrResult.confidence}%)` : ''}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 border-t border-gray-100 bg-gray-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900 sm:p-4">
              <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                onClick={() => setShowStartModal(false)}
                disabled={isSubmittingStart}
                className="min-h-11 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 disabled:opacity-50"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                id="btn-confirm-start-trip"
                disabled={!startOdoPhoto || !startOdoReading || !startGpsData || isSubmittingStart}
                onClick={handleConfirmStartTrip}
                className="min-h-11 min-w-0 px-3 sm:px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingStart ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{selectedTrip.record_type === 'work_session' ? tr('تأكيد بدء العمل', 'Confirm Start Work') : tr('تأكيد وانطلاق الرحلة', 'Confirm and start trip')}</span>
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REVISION MODAL - MANUAL ODOMETER CORRECTION ONLY */}
      {/* ======================================================== */}
      {showRevisionModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-orange-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{tr('تصحيح قراءات العداد', 'Correct odometer readings')}</h3>
                <p className="text-[11px] text-orange-100">{selectedTrip.trip_no}</p>
              </div>
              <button type="button" onClick={() => setShowRevisionModal(false)} className="text-orange-100 hover:text-white text-lg font-bold">×</button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              {revisionError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  {revisionError}
                </div>
              )}

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                {tr(
                  'سيتم الاحتفاظ بصور العداد الأصلية. يمكنك تصحيح قراءة البداية أو النهاية حسب ملاحظة المشرف.',
                  'The original odometer photos will be retained. Correct the starting or ending reading as requested by the supervisor.'
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    {tr('قراءة البداية المصححة', 'Corrected start reading')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={revisionStartReading || ''}
                      onChange={(event) => setRevisionStartReading(Number(event.target.value))}
                      className="w-full px-3 py-3 pr-12 rounded-lg border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono font-bold text-lg text-center focus:outline-none focus:border-orange-600"
                      autoFocus
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getOdometerUnitLabel(selectedTrip.vehicle_id)}</span>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    {tr('قراءة النهاية المصححة', 'Corrected end reading')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={revisionEndReading || ''}
                      onChange={(event) => setRevisionEndReading(Number(event.target.value))}
                      className="w-full px-3 py-3 pr-12 rounded-lg border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono font-bold text-lg text-center focus:outline-none focus:border-orange-600"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getOdometerUnitLabel(selectedTrip.vehicle_id)}</span>
                  </div>
                </div>
              </div>

              {selectedTrip.record_type === 'work_session' && (
                <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-slate-700">
                  <h4 className="font-bold text-gray-900 dark:text-white">{tr('تصحيح تفاصيل حركة اليوم', 'Correct daily movement details')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 font-bold"><span>{tr('الرحلات الداخلية', 'Internal trips')}</span><input type="number" min="0" step="1" inputMode="numeric" value={workInternalCount || ''} onChange={(event) => setWorkInternalCount(Math.max(0, Math.floor(Number(event.target.value) || 0)))} className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-center text-base font-black dark:border-orange-800 dark:bg-slate-800" /></label>
                    <label className="space-y-1 font-bold"><span>{tr('الرحلات الخارجية', 'External trips')}</span><input type="number" min="0" step="1" inputMode="numeric" value={workExternalCount || ''} onChange={(event) => setExternalTripCount(Number(event.target.value))} className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-center text-base font-black dark:border-orange-800 dark:bg-slate-800" /></label>
                  </div>
                  {workRoutes.map((route, index) => <div key={route.id} className="grid grid-cols-2 gap-2 rounded-lg bg-orange-50 p-2 dark:bg-orange-950/20"><select value={route.from_governorate_id} onChange={(event) => updateWorkRoute(index, 'from', event.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-2 dark:bg-slate-800"><option value="">{tr('من', 'From')}</option>{governorates.map((item) => <option key={item.id} value={item.id}>{getLang() === 'en' ? item.name_en : item.name_ar}</option>)}</select><select value={route.to_governorate_id} onChange={(event) => updateWorkRoute(index, 'to', event.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-2 dark:bg-slate-800"><option value="">{tr('إلى', 'To')}</option>{governorates.map((item) => <option key={item.id} value={item.id}>{getLang() === 'en' ? item.name_en : item.name_ar}</option>)}</select></div>)}
                  <label className="block space-y-1 font-bold"><span>{tr('أسماء الركاب (اختياري)', 'Passenger names (optional)')}</span><textarea rows={2} value={workPassengerNames} onChange={(event) => setWorkPassengerNames(event.target.value)} className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 font-normal dark:border-orange-800 dark:bg-slate-800" /></label>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2 bg-gray-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                disabled={isSubmittingRevision}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                disabled={isSubmittingRevision || !revisionStartReading || !revisionEndReading}
                className="px-5 py-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-bold disabled:opacity-60"
              >
                {isSubmittingRevision ? tr('جارٍ الإرسال...', 'Submitting...') : tr('حفظ وإعادة الإرسال', 'Save and resubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* END TRIP MODAL WITH CAMERA OCR & COMPARISON */}
      {/* ======================================================== */}
      {showEndModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-slate-800">
            <div className="shrink-0 p-3.5 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-teal-900 text-white">
              <div>
                <h3 className="font-bold text-sm">{selectedTrip.record_type === 'work_session' ? tr('إنهاء العمل وتوثيق عداد النهاية', 'End work and document ending odometer') : tr('إنهاء الرحلة وتوثيق عداد الوصول', 'End trip and document arrival odometer')}</h3>
                <p className="text-[11px] text-teal-300">
                  {selectedTrip.trip_no} • {selectedTrip.record_type === 'work_session'
                    ? tr('سجل عمل يومي', 'Daily work session')
                    : selectedTrip.destination}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                aria-label={tr('إغلاق', 'Close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-teal-200 hover:bg-white/10 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {endError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{endError}</span>
                </div>
              )}
              {/* GPS End status */}
              {isGPSTrackingEnabled() && (
                <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <span>{tr('موقع الوصول المسجل:', 'Recorded arrival location:')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {tr('موقع GPS موثق', 'GPS location verified')}
                    </span>
                  </div>
                  {endGpsData && (
                    <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {endGpsData.locationName} (Lat: {endGpsData.latitude.toFixed(5)}, Lng:{' '}
                      {endGpsData.longitude.toFixed(5)})
                    </p>
                  )}
                </div>
              )}

              {/* End Odometer Capture */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  {tr('تصوير العداد النهائي (مباشر بالكاميرا):', 'Photograph the final odometer (live camera):')}
                </label>

                {/* Hidden native mobile camera input for End Trip */}
                <input
                  ref={endCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleEndCameraFile}
                />

                {pendingEndPhoto && (
                  <OdometerPhotoCropper
                    image={pendingEndPhoto}
                    onConfirm={async (photo) => {
                      setPendingEndPhoto(null);
                      await processEndPhoto(photo);
                    }}
                    onUseFullImage={async () => {
                      const photo = pendingEndPhoto;
                      setPendingEndPhoto(null);
                      await processEndPhoto(photo);
                    }}
                    onCancel={() => setPendingEndPhoto(null)}
                  />
                )}

                {!endOdoPhoto ? (
                  <OdometerCamera
                    onCapture={setPendingEndPhoto}
                    onNativeFallback={() => endCameraInputRef.current?.click()}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 relative bg-black">
                      <img src={endOdoPhoto} alt={tr('عداد النهاية', 'End odometer')} className="h-40 w-full object-contain sm:h-44" />
                    </div>

                    <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
                      <div className="text-xs">
                        <span className="font-bold text-teal-900 dark:text-teal-200">
                          {tr('أدخل قراءة العداد النهائية الظاهرة في الصورة', 'Enter the final odometer reading shown in the photo')}
                        </span>
                      </div>

                      <div className="flex items-end gap-2 sm:gap-3">
                        <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                          {tr('قراءة السائق:', 'Driver-entered reading:')}
                        </label>
                        <input
                          ref={endReadingInputRef}
                          type="number"
                          inputMode="decimal"
                          min="0.1"
                          step="0.1"
                          value={endOdoReading || ''}
                          onChange={(e) => {
                            setEndOdoReading(Number(e.target.value));
                            setEndError(null);
                          }}
                          placeholder={tr('أدخل القراءة', 'Enter reading')}
                          autoComplete="off"
                          className="w-full px-3 py-3 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono font-bold text-xl text-center"
                        />
                        <span className="mt-1 block text-center text-xs font-bold text-teal-700 dark:text-teal-300">
                          {getOdometerUnitLabel(selectedTrip.vehicle_id)}
                        </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            endCaptureVersionRef.current += 1;
                            setEndOdoPhoto(null);
                            setPendingEndPhoto(null);
                            setEndOdoReading(0);
                            setEndOcrResult(null);
                            endOcrResultRef.current = null;
                            setShowEndSummary(false);
                          }}
                          title={tr('إعادة التصوير بالكاميرا', 'Retake photo')}
                          className="mb-5 flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-teal-300 p-2.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{tr('إعادة التقاط', 'Retake')}</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-teal-200 pt-2 text-[11px] dark:border-teal-800">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          {tr('قراءة OCR المرجعية:', 'OCR reference reading:')}
                        </span>
                        <strong className="font-mono text-teal-800 dark:text-teal-200">
                          {endOcrResult ? `${endOcrResult.parsed_number} ${getOdometerUnitLabel(selectedTrip.vehicle_id)}` : '—'}
                          {endOcrResult ? ` (${endOcrResult.confidence}%)` : ''}
                        </strong>
                      </div>
                    </div>

                    {/* Live Comparison between GPS distance and OCR odometer reading */}
                    {(() => {
                      const startRec = DtmsStorage.getOdometerRecords().find(
                        (o) => o.trip_id === selectedTrip?.id && o.type === 'start'
                      );
                      const unit = getVehicleOdometerUnit(selectedTrip.vehicle_id);
                      const startVal = startRec
                        ? getDisplayedOdometerReading(startRec, selectedTrip.vehicle_id)
                        : roundOdometerReading(odometerFromKm(getVehicleInfo(selectedTrip.vehicle_id)?.last_odometer || 48500, unit));
                      const odoDiff = endOdoReading > startVal
                        ? roundOdometerReading(odometerToKm(endOdoReading - startVal, unit))
                        : 0;
                      let gpsDist = selectedTrip?.distance_gps || 0;
                      if (selectedTrip?.departure_lat && selectedTrip?.departure_lng && endGpsData?.latitude && endGpsData?.longitude) {
                        gpsDist = calculateHaversineDistance(
                          selectedTrip.departure_lat,
                          selectedTrip.departure_lng,
                          endGpsData.latitude,
                          endGpsData.longitude
                        );
                      }
                      if (!isGPSTrackingEnabled() || odoDiff <= 0) return null;

                      const cmp = compareGpsAndOcrDistance(gpsDist, odoDiff, 15, 5);

                      return (
                        <div
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            cmp.isExceeded
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 animate-pulse'
                              : cmp.status === 'review_needed'
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-100'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-100'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold flex items-center gap-1.5">
                              {cmp.isExceeded ? (
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                              <span>{tr('مقارنة مسافة GPS ومسافة عداد السائق:', 'GPS and driver odometer distance comparison:')}</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cmp.isExceeded
                                  ? 'bg-rose-600 text-white'
                                  : cmp.status === 'review_needed'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {cmp.isExceeded ? tr('تنبيه: فرق > 15 كم', 'Alert: difference > 15 km') : cmp.status === 'review_needed' ? tr('مراجعة مطلوبة', 'Review required') : tr('مطابق', 'Matched')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 min-[380px]:grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                            <div className="p-1.5 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                              <span className="text-[9px] text-gray-500 block font-sans">{tr('مسافة العداد:', 'Odometer distance:')}</span>
                              <strong>{odoDiff} {tr('كم', 'km')}</strong>
                            </div>
                            <div className="p-1.5 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                              <span className="text-[9px] text-gray-500 block font-sans">{tr('مسافة GPS:', 'GPS distance:')}</span>
                              <strong>{gpsDist} {tr('كم', 'km')}</strong>
                            </div>
                            <div className="p-1.5 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                              <span className="text-[9px] text-gray-500 block font-sans">{tr('فارق المسافة:', 'Distance difference:')}</span>
                              <strong className={cmp.isExceeded ? 'text-rose-600' : 'text-teal-600'}>
                                {cmp.difference} {tr('كم', 'km')}
                              </strong>
                            </div>
                          </div>

                          {cmp.isExceeded && (
                            <p className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold pt-0.5">
                              {tr('⚠️ تنبيه: تجاوز الفارق 15 كم يستدعي كتابة سبب الاختلاف في الملاحظات أدناه لمسؤول السائقين.', 'Warning: A difference over 15 km requires an explanation in the notes below for the driver supervisor.')}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {selectedTrip.record_type === 'work_session' && (
                <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-800 dark:bg-teal-950/30">
                  <div>
                    <h4 className="font-bold text-sm text-teal-950 dark:text-teal-100">{tr('تفاصيل حركة اليوم', 'Today\'s movement details')}</h4>
                    <p className="text-[11px] text-teal-700 dark:text-teal-300">{tr('أدخل عدد الرحلات التي تم تنفيذها أثناء فترة العمل.', 'Enter the trips completed during this work session.')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-xs font-bold text-gray-800 dark:text-gray-200">
                      <span>{tr('عدد الرحلات الداخلية', 'Internal trips')}</span>
                      <input type="number" min="0" step="1" inputMode="numeric" value={workInternalCount || ''}
                        onChange={(event) => { setWorkInternalCount(Math.max(0, Math.floor(Number(event.target.value) || 0))); setShowEndSummary(false); }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-lg font-black dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-gray-800 dark:text-gray-200">
                      <span>{tr('عدد الرحلات الخارجية', 'External trips')}</span>
                      <input type="number" min="0" step="1" inputMode="numeric" value={workExternalCount || ''}
                        onChange={(event) => setExternalTripCount(Number(event.target.value))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-lg font-black dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                  </div>

                  {workRoutes.map((route, index) => (
                    <div key={route.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-2 text-xs font-black text-teal-800 dark:text-teal-200">{tr(`الرحلة الخارجية ${index + 1}`, `External trip ${index + 1}`)}</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-xs font-bold"><span>{tr('من محافظة', 'From governorate')}</span>
                          <select value={route.from_governorate_id} onChange={(event) => updateWorkRoute(index, 'from', event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900">
                            <option value="">{tr('اختر المحافظة', 'Select governorate')}</option>
                            {governorates.map((item) => <option key={item.id} value={item.id}>{getLang() === 'en' ? item.name_en : item.name_ar}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs font-bold"><span>{tr('إلى محافظة', 'To governorate')}</span>
                          <select value={route.to_governorate_id} onChange={(event) => updateWorkRoute(index, 'to', event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900">
                            <option value="">{tr('اختر المحافظة', 'Select governorate')}</option>
                            {governorates.map((item) => <option key={item.id} value={item.id}>{getLang() === 'en' ? item.name_en : item.name_ar}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}

                  <label className="block space-y-1 text-xs font-bold text-gray-800 dark:text-gray-200">
                    <span>{tr('أسماء الركاب (اختياري)', 'Passenger names (optional)')}</span>
                    <textarea rows={2} value={workPassengerNames} onChange={(event) => { setWorkPassengerNames(event.target.value); setShowEndSummary(false); }}
                      placeholder={tr('اكتب أسماء الركاب إن وجدوا', 'Enter passenger names, if any')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-800" />
                  </label>
                </div>
              )}

              {/* Driver Notes input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  {tr('ملاحظات السائق وتفاصيل الزيارة:', 'Driver notes and visit details:')}
                </label>
                <textarea
                  rows={2}
                  value={driverVisitNotes}
                  onChange={(e) => setDriverVisitNotes(e.target.value)}
                  placeholder={tr('سجل أي ملاحظات حول الطريق، التسليم، أو حالة المركبة...', 'Record any notes about the route, delivery, or vehicle condition...')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-gray-100 bg-gray-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900 sm:p-4">
              <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                onClick={() => setShowEndModal(false)}
                disabled={isSubmittingEnd}
                className="min-h-11 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 disabled:opacity-50"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                id="btn-confirm-end-trip"
                disabled={!endOdoPhoto || !endOdoReading || !endGpsData || isSubmittingEnd}
                onClick={selectedTrip.record_type === 'work_session' ? reviewEndWork : handleConfirmEndTrip}
                className="min-h-11 min-w-0 px-3 sm:px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingEnd ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{selectedTrip.record_type === 'work_session'
                  ? tr('مراجعة ملخص العمل', 'Review work summary')
                  : tr('إتمام الرحلة وإرسالها للتأييد', 'Complete trip and submit for endorsement')}</span>
              </button>
              </div>
            </div>
          </div>

          {selectedTrip.record_type === 'work_session' && showEndSummary && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="end-work-summary-title">
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-teal-300 bg-white shadow-2xl dark:border-teal-800 dark:bg-slate-900">
                <div className="border-b border-gray-100 bg-teal-900 px-4 py-3 text-center text-white dark:border-slate-800">
                  <CheckCircle2 className="mx-auto mb-1 h-7 w-7 text-teal-300" />
                  <h4 id="end-work-summary-title" className="text-base font-black">{tr('تأكيد ملخص العمل', 'Confirm work summary')}</h4>
                  <p className="mt-0.5 text-[11px] text-teal-200">{tr('راجع التفاصيل قبل إرسالها إلى مسؤول السائقين', 'Review the details before submitting them to the driver supervisor')}</p>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
                      <span className="block text-[10px] text-gray-500 dark:text-gray-400">{tr('المسافة الكلية', 'Total distance')}</span>
                      <strong className="mt-1 block font-mono text-lg text-gray-900 dark:text-white">{roundOdometerReading(odometerToKm(endOdoReading - endStartReadingRef.current, getVehicleOdometerUnit(selectedTrip.vehicle_id)))} <small>{tr('كم', 'km')}</small></strong>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
                      <span className="block text-[10px] text-gray-500 dark:text-gray-400">{tr('رحلات داخلية', 'Internal trips')}</span>
                      <strong className="mt-1 block text-lg text-gray-900 dark:text-white">{workInternalCount}</strong>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
                      <span className="block text-[10px] text-gray-500 dark:text-gray-400">{tr('رحلات خارجية', 'External trips')}</span>
                      <strong className="mt-1 block text-lg text-gray-900 dark:text-white">{workExternalCount}</strong>
                    </div>
                  </div>

                  {workPassengerNames.trim() && (
                    <div className="rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700">
                      <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400">{tr('أسماء الركاب', 'Passenger names')}</span>
                      <span className="text-gray-900 dark:text-white">{workPassengerNames.trim()}</span>
                    </div>
                  )}

                  {endError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                      {endError}
                    </div>
                  )}

                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    <button type="button" onClick={() => setShowEndSummary(false)} disabled={isSubmittingEnd} className="min-h-12 rounded-xl border border-gray-300 px-4 text-xs font-bold text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:text-gray-200">
                      {tr('العودة للتعديل', 'Back to edit')}
                    </button>
                    <button type="button" onClick={handleConfirmEndTrip} disabled={isSubmittingEnd} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-black text-white disabled:opacity-60">
                      {isSubmittingEnd ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>{isSubmittingEnd ? tr('جارٍ الإرسال...', 'Submitting...') : tr('تأكيد وإرسال للمصادقة', 'Confirm and submit for approval')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
