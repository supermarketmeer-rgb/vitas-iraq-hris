import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  Users,
  Car,
  Trash2,
  Edit,
  Eye,
  CheckCheck,
  XCircle,
  MapPin,
  ArrowUpDown,
  PlusCircle,
  X,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { Governorate, Trip, TripType, TripCompanion, TripDestination, TripStatus, User } from '../types';
import { DtmsStorage } from '../utils/storage';
import { isGPSTrackingEnabled } from '../utils/gpsTracker';
import { isSameOffice, isOfficeRestricted } from '../utils/officeUtils';
import { fetchGovernorates, hydrateDataFromMySQL, syncSaveTrip, syncUpdateTripDestinations } from '../utils/apiSync';
import { normalizeOdometerUnit } from '../utils/odometer';

interface TripsManagerProps {
  currentUser: User;
  onOpenTripApproval: (trip: Trip) => void;
  onOpenLiveTracking: (tripId: string) => void;
  onRefreshData?: () => void;
  initialCreateModalOpen?: boolean;
}

export const TripsManager: React.FC<TripsManagerProps> = ({
  currentUser,
  onOpenTripApproval,
  onOpenLiveTracking,
  onRefreshData,
  initialCreateModalOpen = false,
}) => {
  const tr = (ar: string, en: string) => (getLang() === 'en' ? en : ar);
  const [trips, setTrips] = useState<Trip[]>(DtmsStorage.getTrips());
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const offices = DtmsStorage.getOffices();
  const drivers = DtmsStorage.getDrivers();
  const vehicles = DtmsStorage.getVehicles();
  const vehicleAssignments = DtmsStorage.getAssignments();

  const isSupervisor = isOfficeRestricted(currentUser);
  const isViewer = currentUser.role === 'viewer';
  const userOfficeId = currentUser?.office_id;
  const userOffice = isSupervisor ? offices.find((o) => isSameOffice(o.id, userOfficeId)) : null;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterGov, setFilterGov] = useState('all');

  // Sorting and Pagination State
  const [sortField, setSortField] = useState<keyof Trip>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formatActualDateTime = (date?: string, time?: string): string => {
    if (!date) return '-';
    return `${date}${time ? ` ${time.slice(0, 5)}` : ''}`;
  };

  // Create Trip Modal State
  const defaultInitialOffice = isSupervisor && userOfficeId ? String(userOfficeId) : (offices[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalOfficeId, setModalOfficeId] = useState(defaultInitialOffice);
  const [modalDriverId, setModalDriverId] = useState(drivers[0]?.id || '');
  const [modalVehicleId, setModalVehicleId] = useState(vehicles[0]?.id || '');
  const [modalTripType, setModalTripType] = useState<TripType>('internal');
  const [modalStartType, setModalStartType] = useState<'driver_governorate' | 'office_branch' | 'governorate'>('office_branch');
  const [modalStartGovernorateId, setModalStartGovernorateId] = useState('');
  const [modalStartLocationDetail, setModalStartLocationDetail] = useState('');
  const [modalDestinationGovernorateId, setModalDestinationGovernorateId] = useState('');
  const [modalDestination, setModalDestination] = useState('');
  const [modalVisitLocation, setModalVisitLocation] = useState('');
  const [modalPurpose, setModalPurpose] = useState('');
  const [modalDestinations, setModalDestinations] = useState<TripDestination[]>([]);
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [modalPlannedDate, setModalPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalSupervisorNotes, setModalSupervisorNotes] = useState('');
  const [modalCompanions, setModalCompanions] = useState<TripCompanion[]>([]);
  const [compNameInput, setCompNameInput] = useState('');
  const [compJobInput, setCompJobInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  // Supervisors may maintain only unfinished destinations while a trip is open.
  const [destinationEditTrip, setDestinationEditTrip] = useState<Trip | null>(null);
  const [destinationDrafts, setDestinationDrafts] = useState<TripDestination[]>([]);
  const [destinationEditError, setDestinationEditError] = useState<string | null>(null);
  const [isSavingDestinations, setIsSavingDestinations] = useState(false);

  const availableGovOptions = governorates.map((governorate) => ({
    id: governorate.id,
    value: getLang() === 'en' ? governorate.name_en : governorate.name_ar,
    label: getLang() === 'en' ? governorate.name_en : governorate.name_ar,
  }));
  const selectedDriver = drivers.find((driver) => driver.id === modalDriverId);
  const responsibleOffice = offices.find((office) => selectedDriver && isSameOffice(office.id, selectedDriver.office_id));
  const driverGovernorate = responsibleOffice?.governorate || '';
  const normalizedDriverGovernorate = driverGovernorate.trim().toLocaleLowerCase();
  const driverGovernorateRecord = governorates.find((governorate) => {
    const names = [governorate.name_ar, governorate.name_en]
      .map((name) => name.trim().toLocaleLowerCase())
      .filter(Boolean);
    return normalizedDriverGovernorate !== '' && names.some((name) =>
      name === normalizedDriverGovernorate ||
      name.includes(normalizedDriverGovernorate) ||
      normalizedDriverGovernorate.includes(name)
    );
  });
  const eligibleDrivers = isSupervisor ? drivers.filter((driver) => isSameOffice(driver.office_id, userOfficeId)) : drivers;
  const filteredEligibleDrivers = eligibleDrivers.filter((driver) => {
    const query = driverSearch.trim().toLocaleLowerCase();
    return !query || `${driver.full_name} ${driver.employee_no}`.toLocaleLowerCase().includes(query);
  });
  const isVehicleAssignedToDriver = (vehicleId: string, driverId: string) => {
    const driver = drivers.find((item) => item.id === driverId);
    return driver?.assigned_vehicle_id === vehicleId || vehicleAssignments.some((assignment) =>
      assignment.driver_id === driverId && assignment.vehicle_id === vehicleId && assignment.status === 'active'
    );
  };
  const driverVehicles = vehicles.filter((vehicle) => isVehicleAssignedToDriver(vehicle.id, modalDriverId));

  const selectDriver = (driverId: string) => {
    const driver = drivers.find((item) => item.id === driverId);
    setModalDriverId(driverId);
    setModalOfficeId(driver?.office_id || '');
    const assignedVehicles = vehicles.filter((vehicle) => isVehicleAssignedToDriver(vehicle.id, driverId));
    setModalVehicleId(assignedVehicles.length === 1 ? assignedVehicles[0].id : '');
    const office = offices.find((item) => driver && isSameOffice(item.id, driver.office_id));
    const governorate = governorates.find((item) => item.name_ar === office?.governorate || item.name_en === office?.governorate);
    if (modalTripType === 'internal') setModalDestinationGovernorateId(governorate?.id || '');
    if (modalStartType !== 'governorate') setModalStartGovernorateId(governorate?.id || '');
    setDriverDropdownOpen(false);
    setDriverSearch('');
  };

  useEffect(() => {
    const closeDriverDropdown = (event: MouseEvent) => {
      if (!driverDropdownRef.current?.contains(event.target as Node)) {
        setDriverDropdownOpen(false);
        setDriverSearch('');
      }
    };
    document.addEventListener('mousedown', closeDriverDropdown);
    return () => document.removeEventListener('mousedown', closeDriverDropdown);
  }, []);

  const openCreateTrip = () => {
    if (isViewer) return;
    const initialDriver = eligibleDrivers[0];
    const initialOffice = initialDriver?.office_id || '';
    setModalDriverId(initialDriver?.id || '');
    setModalOfficeId(initialOffice);
    const assignedVehicles = initialDriver ? vehicles.filter((vehicle) => isVehicleAssignedToDriver(vehicle.id, initialDriver.id)) : [];
    setModalVehicleId(assignedVehicles.length === 1 ? assignedVehicles[0].id : '');
    setModalTripType('internal');
    setModalStartType('office_branch');
    const office = offices.find((item) => isSameOffice(item.id, initialOffice));
    const governorate = governorates.find((item) => item.name_ar === office?.governorate || item.name_en === office?.governorate);
    setModalStartGovernorateId(governorate?.id || '');
    setModalDestinationGovernorateId(governorate?.id || '');
    setModalStartLocationDetail('');
    setModalDestinations([]);
    setEditingDestId(null);
    setFormError(null);
    setShowCreateModal(true);
  };

  useEffect(() => {
    fetchGovernorates().then((data) => {
      const mapped = data.map((item: any) => ({ ...item, id: String(item.id), usage_count: Number(item.usage_count || 0) }));
      setGovernorates(mapped);
      const driver = drivers.find((item) => item.id === modalDriverId);
      const office = offices.find((item) => driver && isSameOffice(item.id, driver.office_id));
      const governorate = mapped.find((item: Governorate) => item.name_ar === office?.governorate || item.name_en === office?.governorate);
      if (governorate) {
        setModalStartGovernorateId(governorate.id);
        setModalDestinationGovernorateId(governorate.id);
      }
    });
  }, []);

  useEffect(() => {
    if (initialCreateModalOpen && !isViewer) {
      openCreateTrip();
    }
  }, [initialCreateModalOpen, isViewer]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshList = async () => {
    setIsRefreshing(true);
    try {
      await hydrateDataFromMySQL();
    } catch {}
    setTrips(DtmsStorage.getTrips());
    if (onRefreshData) onRefreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const modalOpenRef = React.useRef(showCreateModal);
  useEffect(() => {
    modalOpenRef.current = showCreateModal;
  }, [showCreateModal]);

  // Real-time Auto Sync with MySQL (every 5 seconds when modal is closed)
  useEffect(() => {
    let isMounted = true;
    const syncFromBackend = async () => {
      if (modalOpenRef.current) return;
      try {
        await hydrateDataFromMySQL();
        if (isMounted && !modalOpenRef.current) {
          setTrips(DtmsStorage.getTrips());
        }
      } catch {}
    };

    // Immediate sync on load
    syncFromBackend();

    // Auto-polling interval
    const interval = setInterval(syncFromBackend, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Add Companion
  const handleAddCompanion = () => {
    if (!compNameInput.trim()) return;
    setModalCompanions([
      ...modalCompanions,
      {
        id: 'cmp-' + Date.now(),
        name: compNameInput.trim(),
        job_title: compJobInput.trim() || 'موظف مرافق',
      },
    ]);
    setCompNameInput('');
    setCompJobInput('');
  };

  // Remove Companion
  const handleRemoveCompanion = (id: string) => {
    setModalCompanions(modalCompanions.filter((c) => c.id !== id));
  };

  // Add/Edit Destination
  const handleSaveDestination = () => {
    if (!modalDestination.trim() || !modalPurpose.trim()) {
      setFormError(tr('يرجى ملء الوجهة والغرض على الأقل للوجهة المحددة!', 'Enter the destination and trip purpose.'));
      return;
    }
    const destinationGovernorate = modalTripType === 'internal'
      ? driverGovernorateRecord
      : governorates.find((item) => item.id === modalDestinationGovernorateId);
    if (!destinationGovernorate) {
      setFormError(tr('يرجى اختيار محافظة الوجهة.', 'Select the destination governorate.'));
      return;
    }
    const governorateName = getLang() === 'en' ? destinationGovernorate.name_en : destinationGovernorate.name_ar;
    
    if (editingDestId) {
      setModalDestinations(modalDestinations.map(d => 
        d.id === editingDestId ? {
          ...d,
          governorate_id: destinationGovernorate.id,
          governorate_name: governorateName,
          destination: modalDestination.trim(),
          visit_location: modalVisitLocation.trim() || modalDestination.trim(),
          purpose: modalPurpose.trim()
        } : d
      ));
      setEditingDestId(null);
    } else {
      setModalDestinations([
        ...modalDestinations,
        {
          id: 'dest-' + Date.now(),
          governorate_id: destinationGovernorate.id,
          governorate_name: governorateName,
          destination: modalDestination.trim(),
          visit_location: modalVisitLocation.trim() || modalDestination.trim(),
          purpose: modalPurpose.trim()
        }
      ]);
    }
    
    setModalDestination('');
    setModalVisitLocation('');
    setModalPurpose('');
    setFormError(null);
  };

  const handleEditDestination = (dest: TripDestination) => {
    setModalDestination(dest.destination);
    setModalDestinationGovernorateId(dest.governorate_id || driverGovernorateRecord?.id || '');
    setModalVisitLocation(dest.visit_location);
    setModalPurpose(dest.purpose);
    setEditingDestId(dest.id);
  };

  const handleRemoveDestination = (id: string) => {
    setModalDestinations(modalDestinations.filter((d) => d.id !== id));
    if (editingDestId === id) {
      setEditingDestId(null);
      setModalDestination('');
      setModalVisitLocation('');
      setModalPurpose('');
    }
  };

  // Create Trip submit
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    if (!modalDriverId) {
      setFormError(tr('يرجى اختيار السائق المكلف بالرحلة!', 'Select the assigned driver.'));
      return;
    }
    if (!modalOfficeId || !responsibleOffice) {
      setFormError(tr('السائق المحدد غير مرتبط بمكتب مسؤول.', 'The selected driver does not have a responsible office.'));
      return;
    }
    if (!modalVehicleId) {
      setFormError('يرجى اختيار المركبة المخصصة للرحلة!');
      return;
    }
    if (modalStartType === 'governorate' && !modalStartGovernorateId) {
      setFormError(tr('يرجى اختيار محافظة الانطلاق.', 'Select the starting governorate.'));
      return;
    }
    if (modalDestinations.length === 0 && (!modalDestination.trim() || !modalPurpose.trim())) {
      setFormError('يرجى إضافة وجهة واحدة على الأقل أو ملء تفاصيل الوجهة الحالية!');
      return;
    }
    
    const finalDestinations = [...modalDestinations];
    
    // Auto-add if user typed something but didn't click Add
    if (modalDestination.trim() && !editingDestId) {
      const destinationGovernorate = modalTripType === 'internal'
        ? driverGovernorateRecord
        : governorates.find((item) => item.id === modalDestinationGovernorateId);
      if (!destinationGovernorate) {
        setFormError(tr('يرجى اختيار محافظة الوجهة.', 'Select the destination governorate.'));
        return;
      }
      finalDestinations.push({
        id: 'dest-' + Date.now(),
        governorate_id: destinationGovernorate.id,
        governorate_name: getLang() === 'en' ? destinationGovernorate.name_en : destinationGovernorate.name_ar,
        destination: modalDestination.trim(),
        visit_location: modalVisitLocation.trim() || modalDestination.trim(),
        purpose: modalPurpose.trim()
      });
    }

    const mergedDestination = finalDestinations.map(d => d.destination).join('، ');
    const mergedVisitLocation = finalDestinations.map(d => d.visit_location).join('، ');
    const mergedPurpose = finalDestinations.map(d => d.purpose).join(' | ');

    const tripNo = `TRIP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`;
    const selectedStartGovernorate = modalStartType === 'governorate'
      ? governorates.find((item) => item.id === modalStartGovernorateId)
      : driverGovernorateRecord;
    if (modalTripType === 'external' && selectedStartGovernorate && !finalDestinations.some((destination) => destination.governorate_id !== selectedStartGovernorate.id)) {
      setFormError(tr('يجب أن تتضمن الرحلة الخارجية وجهة في محافظة مختلفة عن محافظة الانطلاق.', 'An external trip must include a destination in a different governorate from its starting point.'));
      return;
    }
    const startPointName = modalStartType === 'office_branch'
      ? responsibleOffice.name
      : selectedStartGovernorate
        ? (getLang() === 'en' ? selectedStartGovernorate.name_en : selectedStartGovernorate.name_ar)
        : driverGovernorate;
    const newTrip: Trip = {
      id: 'trp-' + Date.now(),
      trip_no: tripNo,
      office_id: modalOfficeId,
      driver_id: modalDriverId,
      vehicle_id: modalVehicleId,
      trip_type: modalTripType,
      governorate: finalDestinations[0]?.governorate_name || driverGovernorate,
      start_point_type: modalStartType,
      start_governorate_id: selectedStartGovernorate?.id,
      start_office_id: modalStartType === 'office_branch' ? responsibleOffice.id : undefined,
      start_point_name: startPointName,
      start_location_detail: modalStartLocationDetail.trim(),
      destination: mergedDestination,
      visit_location: mergedVisitLocation,
      purpose: mergedPurpose,
      destinations: finalDestinations,
      planned_departure_date: modalPlannedDate || new Date().toISOString().split('T')[0],
      companions: modalCompanions,
      supervisor_notes: modalSupervisorNotes.trim(),
      status: 'new',
      distance_gps: 0,
      distance_odometer: 0,
      distance_diff: 0,
      diff_status: 'normal',
      created_by: currentUser?.name || 'مدير النظام',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    try {
      const result = await syncSaveTrip(newTrip);
      if (!result.success) {
        throw new Error(result.message || tr('تعذر إنشاء الرحلة.', 'Unable to create the trip.'));
      }
      const savedTrip = {
        ...newTrip,
        id: result.id ? String(result.id) : newTrip.id,
        trip_no: result.tripNo || newTrip.trip_no,
      };
      DtmsStorage.saveTrip(savedTrip, false);
      refreshList();
      setShowCreateModal(false);

      // Reset Form
      setModalDestination('');
      setModalVisitLocation('');
      setModalPurpose('');
      setModalDestinations([]);
      setEditingDestId(null);
      setModalSupervisorNotes('');
      setModalCompanions([]);
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء حفظ الرحلة');
    }
  };

  // Delete Trip with business rule
  const handleDeleteTrip = (tripId: string) => {
    if (isViewer) return;
    const res = DtmsStorage.deleteTrip(tripId);
    if (!res.success) {
      alert(res.message);
      return;
    }
    refreshList();
  };

  const openDestinationEditor = (trip: Trip) => {
    if (isViewer || !['new', 'in_progress'].includes(trip.status)) return;
    const drafts = trip.destinations?.length
      ? trip.destinations.map((destination) => ({ ...destination }))
      : [{
          id: `destination-${Date.now()}`,
          governorate_name: trip.governorate,
          destination: trip.destination,
          visit_location: trip.visit_location,
          purpose: trip.purpose,
          completed: false,
        }];
    setDestinationEditTrip(trip);
    setDestinationDrafts(drafts);
    setDestinationEditError(null);
  };

  const updateDestinationDraft = (id: string, field: keyof TripDestination, value: string) => {
    setDestinationDrafts((drafts) => drafts.map((destination) =>
      destination.id === id && !destination.completed
        ? { ...destination, [field]: value }
        : destination
    ));
  };

  const addDestinationDraft = () => {
    if (!destinationEditTrip) return;
    const firstDestination = destinationDrafts[0];
    setDestinationDrafts((drafts) => [...drafts, {
      id: `destination-${Date.now()}-${drafts.length}`,
      governorate_id: destinationEditTrip.trip_type === 'internal'
        ? firstDestination?.governorate_id
        : availableGovOptions[0]?.id,
      governorate_name: destinationEditTrip.trip_type === 'internal'
        ? (firstDestination?.governorate_name || destinationEditTrip.governorate)
        : availableGovOptions[0]?.label,
      destination: '',
      visit_location: '',
      purpose: '',
      completed: false,
    }]);
  };

  const removeDestinationDraft = (id: string) => {
    setDestinationDrafts((drafts) => drafts.filter((destination) => destination.id !== id || destination.completed));
  };

  const saveDestinationDrafts = async () => {
    if (!destinationEditTrip) return;
    if (!destinationDrafts.length) {
      setDestinationEditError(tr('يجب أن تحتوي الرحلة على وجهة واحدة على الأقل.', 'A trip must have at least one destination.'));
      return;
    }
    if (destinationDrafts.some((destination) => !destination.destination.trim() || !destination.purpose.trim())) {
      setDestinationEditError(tr('أدخل الوجهة والغرض لكل محطة.', 'Enter the destination and purpose for every stop.'));
      return;
    }
    if (destinationEditTrip.trip_type === 'external' && destinationDrafts.some((destination) => !destination.governorate_id)) {
      setDestinationEditError(tr('اختر المحافظة لكل وجهة.', 'Select a governorate for every destination.'));
      return;
    }

    setIsSavingDestinations(true);
    setDestinationEditError(null);
    const result = await syncUpdateTripDestinations(destinationEditTrip.id, destinationDrafts);
    setIsSavingDestinations(false);
    if (!result.success || !result.data) {
      setDestinationEditError(result.message || tr('تعذر تحديث الوجهات.', 'Unable to update destinations.'));
      return;
    }

    const updatedDestinations = result.data.map((destination: any) => ({
      ...destination,
      id: String(destination.id),
      governorate_id: destination.governorate_id != null ? String(destination.governorate_id) : undefined,
      completed: Boolean(Number(destination.completed)),
    })) as TripDestination[];
    const updatedTrip: Trip = {
      ...destinationEditTrip,
      destinations: updatedDestinations,
      governorate: updatedDestinations[0]?.governorate_name || destinationEditTrip.governorate,
      destination: updatedDestinations.map((destination) => destination.destination).join('، '),
      visit_location: updatedDestinations.map((destination) => destination.visit_location).join('، '),
      purpose: updatedDestinations.map((destination) => destination.purpose).join(' | '),
    };
    DtmsStorage.saveTrip(updatedTrip, false);
    setDestinationEditTrip(null);
    await refreshList();
  };

  // Filtered trips
  const filteredTrips = trips.filter((t) => {
    if (isSupervisor && !isSameOffice(t.office_id, userOfficeId)) {
      return false;
    }
    const matchesSearch =
      t.trip_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.governorate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOffice = isSupervisor ? true : (filterOffice === 'all' || isSameOffice(t.office_id, filterOffice));
    const matchesDriver = filterDriver === 'all' || t.driver_id === filterDriver;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesType = filterType === 'all' || t.trip_type === filterType;
    const matchesGov = filterGov === 'all' || t.governorate === filterGov;

    return matchesSearch && matchesOffice && matchesDriver && matchesStatus && matchesType && matchesGov;
  });

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedTrips.length / itemsPerPage);
  const paginatedTrips = sortedTrips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: keyof Trip) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'new':
        return { label: t('status_new_full'), style: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 'in_progress':
        return { label: t('status_in_progress_full'), style: 'bg-teal-600 text-white font-bold animate-pulse' };
      case 'pending_approval':
        return { label: t('status_pending_approval_full'), style: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300' };
      case 'approved':
        return { label: t('status_approved_full'), style: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
      case 'rejected':
        return { label: t('status_rejected_full'), style: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300' };
      case 'revision_requested':
        return { label: t('status_revision_requested'), style: 'bg-amber-50 text-amber-700 border-amber-300' };
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header & Create Trip Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-teal-600" />
            <span>{isSupervisor ? `${t('trips_manager_supervisor_title')} ${userOffice?.name || t('the_office')}` : t('trips_manager_title')}</span>
            {isSupervisor && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                {userOffice?.governorate || 'مخصص للمكتب'}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isSupervisor
              ? `${t('trips_manager_supervisor_desc')} ${userOffice?.name || t('the_office')} فقط`
              : t('trips_manager_desc')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshList}
            title={t('refresh_list')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{t('refresh_list')}</span>
          </button>

          {!isViewer && (
            <button
              id="btn-open-create-trip"
              onClick={openCreateTrip}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create_new_trip')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('search_trips_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full md:w-36 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">{t('all_types')}</option>
            <option value="internal">{t('internal')}</option>
            <option value="external">{t('external')}</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-44 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">{t('all_statuses')}</option>
            <option value="new">{t('status_new')}</option>
            <option value="in_progress">{t('status_in_progress')}</option>
            <option value="pending_approval">{t('status_pending_approval')}</option>
            <option value="approved">{t('status_approved')}</option>
            <option value="rejected">{t('status_rejected')}</option>
          </select>

          {/* Office Filter */}
          {isSupervisor ? (
            <div className="w-full md:w-52 px-3 py-2 text-xs rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">{(userOffice?.name || '').split('-')[0]?.trim() || userOffice?.name || 'مكتبك'}</span>
            </div>
          ) : (
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className="w-full md:w-44 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">{t('all_offices')}</option>
              {offices.map((off) => (
                <option key={off.id} value={off.id}>
                  {(off?.name || '').split('-')[0]?.trim() || off?.name || t('the_office')}
                </option>
              ))}
            </select>
          )}

          {/* Driver Filter */}
          <select
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            className="w-full md:w-44 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">جميع السائقين</option>
            {drivers.filter(d => isSupervisor ? isSameOffice(d.office_id, userOfficeId) : (filterOffice === 'all' || isSameOffice(d.office_id, filterOffice))).map((drv) => (
              <option key={drv.id} value={drv.id}>
                {drv.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trips Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-b border-gray-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('trip_no')}>{t('trip_no')} {sortField === 'trip_no' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5">{tr('أنشئت بواسطة', 'Created By')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('office_id')}>{t('the_office')} {sortField === 'office_id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('driver_id')}>{t('driver_and_vehicle')} {sortField === 'driver_id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('trip_type')}>{t('trip_type')} {sortField === 'trip_type' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('destination')}>{t('destination')} {sortField === 'destination' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('planned_departure_date')}>{t('planned_departure')} {sortField === 'planned_departure_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('departure_date')}>{tr('المغادرة الفعلية', 'Actual Departure')} {sortField === 'departure_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('arrival_date')}>{tr('النهاية الفعلية', 'Actual End')} {sortField === 'arrival_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('distance_odometer')}>{t('distance')} {sortField === 'distance_odometer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 cursor-pointer hover:bg-teal-100/50" onClick={() => toggleSort('status')}>{t('status')} {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3.5 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-400">
                    {t('no_trips_found')}
                  </td>
                </tr>
              ) : (
                paginatedTrips.map((trip) => {
                  const office = offices.find((o) => o.id === trip.office_id);
                  const driver = drivers.find((d) => d.id === trip.driver_id);
                  const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                  const statusInfo = getStatusBadge(trip.status);

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5 font-bold font-mono text-gray-900 dark:text-white">
                        {trip.trip_no}
                      </td>

                      <td className="p-3.5 text-gray-700 dark:text-gray-300 font-semibold whitespace-nowrap">
                        {trip.created_by || '-'}
                      </td>

                      <td className="p-3.5 text-gray-600 dark:text-gray-300">
                        {(office?.name || '').split('-')[0]?.trim() || office?.name || t('the_office')}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {driver?.full_name || t('unspecified_driver')}
                        </div>
                        <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">
                          {vehicle?.vehicle_no} • {vehicle?.plate_no}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold">
                          {trip.record_type === 'work_session'
                            ? tr('سجل عمل مبسط', 'Simple work session')
                            : trip.trip_type === 'internal' ? t('internal') : t('external')}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 dark:text-white line-clamp-1">
                          {trip.record_type === 'work_session'
                            ? tr(`${trip.internal_trip_count || 0} داخلية • ${trip.external_trip_count || 0} خارجية`, `${trip.internal_trip_count || 0} internal • ${trip.external_trip_count || 0} external`)
                            : trip.destinations && trip.destinations.length > 0 
                            ? `${trip.destinations[trip.destinations.length - 1].destination} (${trip.destinations.length} محطات)` 
                            : trip.destination}
                        </div>
                        <div className="text-[11px] text-gray-400 line-clamp-1">
                          {trip.governorate}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-gray-600 dark:text-gray-300">
                        {trip.planned_departure_date}
                      </td>

                      <td className="p-3.5 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatActualDateTime(trip.departure_date, trip.departure_time)}
                      </td>

                      <td className="p-3.5 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatActualDateTime(trip.arrival_date, trip.arrival_time)}
                      </td>

                      <td className="p-3.5 font-mono">
                        {trip.status === 'approved' || trip.status === 'pending_approval' ? (
                          <div className="font-bold text-gray-900 dark:text-white">
                            {trip.distance_odometer} {t('km')}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">قيد التنفيذ / مجدولة</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${statusInfo.style}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* If approved, show button to view full odometer proof & certificate */}
                          {trip.status === 'approved' && (
                            <button
                              onClick={() => onOpenTripApproval(trip)}
                              title={t('view_documentation')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('view_documentation')}</span>
                            </button>
                          )}

                          {/* If pending approval, prominent button to inspect & approve */}
                          {trip.status === 'pending_approval' && (
                            <button
                              id={`btn-approve-trip-${trip.id}`}
                              onClick={() => onOpenTripApproval(trip)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1 cursor-pointer ${isViewer ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                            >
                              {isViewer ? <Eye className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
                              <span>{isViewer ? tr('عرض التفاصيل', 'View Details') : t('endorse_and_approve')}</span>
                            </button>
                          )}

                          {/* If in progress, show live GPS and inspect buttons */}
                          {trip.status === 'in_progress' && (
                            <div className="flex items-center gap-1">
                              {!isViewer && trip.record_type !== 'work_session' && (
                                <button
                                  onClick={() => openDestinationEditor(trip)}
                                  title={tr('تعديل الوجهات غير المنجزة', 'Edit unfinished destinations')}
                                  className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => onOpenTripApproval(trip)}
                                title="عرض تفاصيل الرحلة الجارية"
                                className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 hover:bg-teal-100 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {isGPSTrackingEnabled() && (
                                <button
                                  onClick={() => onOpenLiveTracking(trip.id)}
                                  title="تتبع مباشر على الخريطة"
                                  className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  <MapPin className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Delete and inspect if only 'new' */}
                          {trip.status === 'new' && (
                            <div className="flex items-center gap-1">
                              {!isViewer && (
                                <button
                                  onClick={() => openDestinationEditor(trip)}
                                  title={tr('تعديل وجهات الرحلة', 'Edit trip destinations')}
                                  className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => onOpenTripApproval(trip)}
                                title="عرض تفاصيل الرحلة المجدولة"
                                className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-teal-600 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {!isViewer && (
                                <button
                                  onClick={() => handleDeleteTrip(trip.id)}
                                  title="حذف الرحلة المجدولة"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* If rejected or revision requested */}
                          {(trip.status === 'rejected' || trip.status === 'revision_requested') && (
                            <button
                              onClick={() => onOpenTripApproval(trip)}
                              title="عرض تفاصيل الرحلة والملاحظات"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض الملاحظات</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold">إظهار</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs font-mono font-bold rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 focus:outline-hidden"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-gray-500 font-bold">في الصفحة</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              السابق
            </button>
            <span className="px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-100 dark:border-teal-800">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EDIT OPEN TRIP DESTINATIONS */}
      {/* ======================================================== */}
      {destinationEditTrip && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-[min(96vw,920px)] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-bold text-sm">{tr('تعديل وجهات الرحلة', 'Edit Trip Destinations')}</h3>
                  <p className="text-[11px] text-teal-200 font-mono">{destinationEditTrip.trip_no}</p>
                </div>
              </div>
              <button onClick={() => setDestinationEditTrip(null)} className="text-teal-300 hover:text-white" title={tr('إغلاق', 'Close')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tr('يمكن تعديل أو حذف الوجهات غير المنجزة فقط. الوجهات المنجزة محفوظة كسجل للرحلة.', 'Only unfinished destinations can be edited or deleted. Completed destinations remain locked as part of the trip record.')}
              </p>
              {destinationEditError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{destinationEditError}</div>
              )}

              {destinationDrafts.map((destination, index) => (
                <div key={destination.id} className={`p-3 rounded-xl border ${destination.completed ? 'bg-gray-50 border-gray-200 opacity-80' : 'bg-white dark:bg-slate-900 border-teal-100 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {tr('الوجهة', 'Destination')} {index + 1}
                      {destination.completed && <span className="ms-2 text-emerald-700">{tr('(منجزة)', '(Completed)')}</span>}
                    </span>
                    {!destination.completed && destinationDrafts.length > 1 && (
                      <button onClick={() => removeDestinationDraft(destination.id)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50" title={tr('حذف الوجهة', 'Delete destination')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    {destinationEditTrip.trip_type === 'external' && (
                      <select
                        value={destination.governorate_id || ''}
                        disabled={destination.completed}
                        onChange={(event) => {
                          const selected = availableGovOptions.find((option) => option.id === event.target.value);
                          updateDestinationDraft(destination.id, 'governorate_id', event.target.value);
                          updateDestinationDraft(destination.id, 'governorate_name', selected?.label || '');
                        }}
                        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs disabled:bg-gray-100"
                      >
                        <option value="">{tr('اختر المحافظة', 'Select governorate')}</option>
                        {availableGovOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    )}
                    <input value={destination.destination} disabled={destination.completed} onChange={(event) => updateDestinationDraft(destination.id, 'destination', event.target.value)} placeholder={tr('الوجهة', 'Destination')} className="px-3 py-2 rounded-lg border border-gray-200 text-xs disabled:bg-gray-100" />
                    <input value={destination.visit_location} disabled={destination.completed} onChange={(event) => updateDestinationDraft(destination.id, 'visit_location', event.target.value)} placeholder={tr('الموقع الدقيق (اختياري)', 'Exact location (optional)')} className="px-3 py-2 rounded-lg border border-gray-200 text-xs disabled:bg-gray-100" />
                    <input value={destination.purpose} disabled={destination.completed} onChange={(event) => updateDestinationDraft(destination.id, 'purpose', event.target.value)} placeholder={tr('غرض الزيارة', 'Trip purpose')} className="px-3 py-2 rounded-lg border border-gray-200 text-xs disabled:bg-gray-100" />
                  </div>
                </div>
              ))}

              <button onClick={addDestinationDraft} className="w-full py-2.5 rounded-xl border border-dashed border-teal-400 text-teal-700 font-bold text-xs hover:bg-teal-50 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                {tr('إضافة وجهة', 'Add Destination')}
              </button>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setDestinationEditTrip(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600">{tr('إلغاء', 'Cancel')}</button>
              <button onClick={saveDestinationDrafts} disabled={isSavingDestinations} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50">
                {isSavingDestinations ? tr('جاري الحفظ...', 'Saving...') : tr('حفظ الوجهات', 'Save Destinations')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE TRIP MODAL */}
      {/* ======================================================== */}
      {showCreateModal && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-[min(96vw,1100px)] max-w-5xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-sm">{t('create_assign_trip')}</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-teal-300 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {t('trip_type_label')}
                  </label>
                  <select
                    value={modalTripType}
                    onChange={(e) => {
                      const newType = e.target.value as TripType;
                      setModalTripType(newType);
                      setModalDestinations([]);
                      setEditingDestId(null);
                      if (newType === 'internal') {
                        setModalStartType('office_branch');
                        setModalStartGovernorateId(driverGovernorateRecord?.id || '');
                        setModalDestinationGovernorateId(driverGovernorateRecord?.id || '');
                      } else if (!modalDestinationGovernorateId) {
                        setModalDestinationGovernorateId(availableGovOptions[0]?.id || '');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium"
                  >
                    <option value="internal">{t('type_internal_option')}</option>
                    <option value="external">{t('type_external_option')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{t('driver_label')}</label>
                  <div ref={driverDropdownRef} className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={driverDropdownOpen}
                      onClick={() => {
                        setDriverDropdownOpen((open) => !open);
                        setDriverSearch('');
                      }}
                      className="w-full min-h-9 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white flex items-center justify-between gap-2 text-start"
                    >
                      <span className="truncate">
                        {selectedDriver ? `${selectedDriver.full_name} (${selectedDriver.employee_no})` : tr('اختر السائق', 'Select driver')}
                      </span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${driverDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {driverDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                        <div className="relative border-b border-gray-100 dark:border-slate-700">
                          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            autoFocus
                            role="combobox"
                            aria-controls="driver-options"
                            aria-expanded="true"
                            value={driverSearch}
                            onChange={(event) => setDriverSearch(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') {
                                setDriverDropdownOpen(false);
                                setDriverSearch('');
                              } else if (event.key === 'Enter' && filteredEligibleDrivers.length === 1) {
                                event.preventDefault();
                                selectDriver(filteredEligibleDrivers[0].id);
                              }
                            }}
                            placeholder={tr('ابحث باسم السائق أو الرقم الوظيفي', 'Search by driver name or employee number')}
                            className="w-full py-2 ps-9 pe-3 text-xs bg-transparent text-gray-900 dark:text-white outline-none"
                          />
                        </div>
                        <div id="driver-options" role="listbox" className="max-h-52 overflow-y-auto p-1">
                          {filteredEligibleDrivers.length > 0 ? filteredEligibleDrivers.map((driver) => (
                            <button
                              key={driver.id}
                              type="button"
                              role="option"
                              aria-selected={driver.id === modalDriverId}
                              onClick={() => selectDriver(driver.id)}
                              className={`w-full px-3 py-2 text-xs rounded-md text-start hover:bg-teal-50 dark:hover:bg-slate-700 ${driver.id === modalDriverId ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200 font-bold' : 'text-gray-800 dark:text-gray-200'}`}
                            >
                              <span className="block truncate">{driver.full_name}</span>
                              <span className="block truncate text-[11px] font-normal text-gray-500 dark:text-gray-400">{driver.employee_no}</span>
                            </button>
                          )) : (
                            <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                              {tr('لا توجد نتائج', 'No drivers found')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{t('vehicle_label')}</label>
                  <select
                    value={modalVehicleId}
                    onChange={(e) => setModalVehicleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">{tr('اختر المركبة', 'Select vehicle')}</option>
                    {driverVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_no} - {v.vehicle_type} [{v.vehicle_category || 'خصوصي'}] ({v.plate_no}) - {normalizeOdometerUnit(v.odometer_unit) === 'mile' ? tr('عداد بالميل', 'Miles odometer') : tr('عداد بالكيلومتر', 'Kilometers odometer')}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('المكتب المسؤول:', 'Responsible Office:')}</label>
                  <div className="w-full px-3 py-2 text-xs rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span className="truncate">{responsibleOffice ? `${responsibleOffice.name} (${responsibleOffice.governorate})` : tr('يحدد من السائق', 'Determined by driver')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('نوع نقطة الانطلاق:', 'Starting Point Type:')}</label>
                  <select
                    required
                    value={modalStartType}
                    onChange={(e) => {
                      const type = e.target.value as 'driver_governorate' | 'office_branch' | 'governorate';
                      setModalStartType(type);
                      if (type === 'office_branch') setModalStartLocationDetail('');
                      if (type !== 'governorate') setModalStartGovernorateId(driverGovernorateRecord?.id || '');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500 font-medium"
                  >
                    <option value="driver_governorate">{tr('محافظة السائق', "Driver's Governorate")}</option>
                    <option value="office_branch">{tr('فرع مكتب السائق', "Driver's Office Branch")}</option>
                    {modalTripType === 'external' && <option value="governorate">{tr('محافظة أخرى', 'Another Governorate')}</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('نقطة الانطلاق:', 'Starting Point:')}</label>
                  {modalStartType === 'governorate' ? <select required value={modalStartGovernorateId} onChange={(e) => setModalStartGovernorateId(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"><option value="">{tr('اختر المحافظة', 'Select governorate')}</option>{availableGovOptions.map((governorate) => <option key={governorate.id} value={governorate.id}>{governorate.label}</option>)}</select> : <input readOnly value={modalStartType === 'office_branch' ? (responsibleOffice?.name || '') : driverGovernorate} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300" />}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('تفاصيل موقع الانطلاق الفعلي:', 'Exact Starting Location:')}</label>
                  <input
                    value={modalStartLocationDetail}
                    onChange={(e) => setModalStartLocationDetail(e.target.value)}
                    disabled={modalStartType === 'office_branch'}
                    placeholder={modalStartType === 'office_branch'
                      ? tr('يتم استخدام عنوان مكتب السائق', "Driver's office address is used")
                      : tr('العنوان أو الموقع الدقيق (اختياري)', 'Exact address or landmark (optional)')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
                  />
                </div>

                {/* Planned Departure Date (Default today per requirements) */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {t('planned_departure_date_label')}
                  </label>
                  <input
                    type="date"
                    required
                    value={modalPlannedDate}
                    onChange={(e) => setModalPlannedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Destinations Grid Builder */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 space-y-3">
                <label className="block text-xs font-bold text-gray-900 dark:text-white">
                  {tr('محطات الوجهة ومواقع الزيارة (متعددة):', 'Destination Stops and Visit Locations (Multiple):')}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(160px,0.85fr)_minmax(190px,1fr)_minmax(220px,1.2fr)_minmax(210px,1fr)] gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 dark:text-gray-400 mb-1">{tr('محافظة الوجهة', 'Destination Governorate')}</label>
                    {modalTripType === 'internal' ? <input readOnly value={driverGovernorate} className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800" /> : <select required value={modalDestinationGovernorateId} onChange={(e) => setModalDestinationGovernorateId(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"><option value="">{tr('اختر المحافظة', 'Select governorate')}</option>{availableGovOptions.map((governorate) => <option key={governorate.id} value={governorate.id}>{governorate.label}</option>)}</select>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 dark:text-gray-400 mb-1">{t('destination_label')}</label>
                    <input
                      type="text"
                      value={modalDestination}
                      onChange={(e) => setModalDestination(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder={tr('مثال: مبنى الإدارة العامة', 'Example: Head Office Building')}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 dark:text-gray-400 mb-1">{t('exact_visit_location')}</label>
                    <input
                      type="text"
                      value={modalVisitLocation}
                      onChange={(e) => setModalVisitLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder={tr('اختياري: إحداثية أو تفصيل دقيق', 'Optional: exact address or landmark')}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-600 dark:text-gray-400 mb-1">{t('trip_purpose')}</label>
                      <input
                        type="text"
                        value={modalPurpose}
                        onChange={(e) => setModalPurpose(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        placeholder={tr('سبب الزيارة أو المهمة', 'Reason for the visit or assignment')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveDestination}
                      className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors flex items-center justify-center h-[34px]"
                    >
                      {editingDestId ? <CheckCheck className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {modalDestinations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {modalDestinations.map((dest, idx) => (
                      <div key={dest.id} className="flex items-start justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{dest.destination}</span>
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 truncate">{dest.governorate_name}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{dest.purpose}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditDestination(dest)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                            title={tr('تعديل', 'Edit')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDestination(dest.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                            title={tr('حذف', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Companions (Unlimited per requirements: الاسم، الوظيفة) */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 space-y-3">
                <label className="block text-xs font-bold text-gray-900 dark:text-white">
                  {t('companions_label')}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('companion_name')}
                    value={compNameInput}
                    onChange={(e) => setCompNameInput(e.target.value)}
                    className="flex-1 w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder={t('companion_job')}
                    value={compJobInput}
                    onChange={(e) => setCompJobInput(e.target.value)}
                    className="w-full sm:w-48 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCompanion}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('add_btn')}</span>
                  </button>
                </div>

                {/* Companions tags */}
                {modalCompanions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {modalCompanions.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs"
                      >
                        <span className="font-bold">{comp.name}</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400">({comp.job_title})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCompanion(comp.id)}
                          className="text-gray-400 hover:text-rose-600 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supervisor Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {t('supervisor_notes')}
                </label>
                <textarea
                  rows={2}
                  value={modalSupervisorNotes}
                  onChange={(e) => setModalSupervisorNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('save_trip_and_notify')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
