import {
  Office,
  User,
  Driver,
  Vehicle,
  Trip,
  VehicleAssignment,
  VehicleMaintenance,
  OdometerRecord,
  OCRResult,
  NotificationItem,
  AuditLogItem,
  SystemSettings,
  TripTrackingPoint,
  PhotoVerification,
} from '../types';
import { getLang } from './i18n';
import { initialSettings, initialOffices, initialDrivers, initialVehicles } from '../mockData';
import { SoundEffects } from './soundEffects';
import {
  syncDeleteVehicle,
  syncSaveVehicle,
  syncDeleteUser,
  syncSaveUser,
  syncSaveDriver,
  syncDeleteDriver,
  syncSaveOffice,
  syncDeleteOffice,
  syncSaveTrip,
  syncDeleteTrip,
  syncSaveAuditLog,
  syncSaveOdometerRecord,
  syncSaveTrackingPoint,
  syncMarkNotificationRead,
  syncMarkAllNotificationsRead,
} from './apiSync';

const STORAGE_KEYS = {
  OFFICES: 'dtms_offices_v2',
  USERS: 'dtms_users_v2',
  DRIVERS: 'dtms_drivers_v2',
  VEHICLES: 'dtms_vehicles_v2',
  TRIPS: 'dtms_trips_v2',
  ASSIGNMENTS: 'dtms_assignments_v2',
  MAINTENANCE: 'dtms_maintenance_v2',
  ODOMETER: 'dtms_odometer_v2',
  OCR_RESULTS: 'dtms_ocr_results_v2',
  TRACKING: 'dtms_tracking_v2',
  NOTIFICATIONS: 'dtms_notifications_v2',
  AUDIT_LOGS: 'dtms_audit_logs_v2',
  SETTINGS: 'dtms_settings_v2',
  CURRENT_USER_ID: 'dtms_current_user_id_v2',
  AUTH_USER_ID: 'dtms_auth_user_id_v2',
  THEME: 'dtms_theme_v2',
  PHOTO_VERIFICATIONS: 'dtms_photos_v2',
};

function getStoredItem<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw) as T;
  } catch {
    return defaultVal;
  }
}

function setStoredItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Storage error', err);
  }
}

// Auto-purge any legacy cached trips on module load so devices immediately reflect empty state
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const legacyKeys = [
      'dtms_trips_v1',
      'dtms_odometer_v1',
      'dtms_ocr_results_v1',
      'dtms_tracking_v1',
      'dtms_photos_v1',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
    // Ensure trips in v2 starts empty if not set or legacy
    if (!localStorage.getItem(STORAGE_KEYS.TRIPS)) {
      localStorage.setItem(STORAGE_KEYS.TRIPS, '[]');
    }
  } catch (e) {
    // ignore
  }
}

export class DtmsStorage {
  // Initialization & Reset
  static init() {
    // Purge old cached data from v1 so obsolete trips disappear immediately
    const v1Keys = [
      'dtms_trips_v1',
      'dtms_odometer_v1',
      'dtms_ocr_results_v1',
      'dtms_tracking_v1',
      'dtms_photos_v1',
    ];
    v1Keys.forEach((k) => localStorage.removeItem(k));

    const existingOffices = getStoredItem<Office[]>(STORAGE_KEYS.OFFICES, []);
    if (!existingOffices || existingOffices.length === 0) {
      setStoredItem(STORAGE_KEYS.OFFICES, initialOffices);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      setStoredItem(STORAGE_KEYS.USERS, []);
    }
    const existingDrivers = getStoredItem<Driver[]>(STORAGE_KEYS.DRIVERS, []);
    if (!existingDrivers || existingDrivers.length === 0) {
      setStoredItem(STORAGE_KEYS.DRIVERS, initialDrivers);
    }
    const existingVehicles = getStoredItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    if (!existingVehicles || existingVehicles.length === 0) {
      setStoredItem(STORAGE_KEYS.VEHICLES, initialVehicles);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRIPS)) {
      setStoredItem(STORAGE_KEYS.TRIPS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS)) {
      setStoredItem(STORAGE_KEYS.ASSIGNMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE)) {
      setStoredItem(STORAGE_KEYS.MAINTENANCE, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ODOMETER)) {
      setStoredItem(STORAGE_KEYS.ODOMETER, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.OCR_RESULTS)) {
      setStoredItem(STORAGE_KEYS.OCR_RESULTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRACKING)) {
      setStoredItem(STORAGE_KEYS.TRACKING, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      setStoredItem(STORAGE_KEYS.NOTIFICATIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      setStoredItem(STORAGE_KEYS.AUDIT_LOGS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      setStoredItem(STORAGE_KEYS.SETTINGS, initialSettings);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
      setStoredItem(STORAGE_KEYS.CURRENT_USER_ID, '');
    }
    if (!localStorage.getItem(STORAGE_KEYS.PHOTO_VERIFICATIONS)) {
      setStoredItem(STORAGE_KEYS.PHOTO_VERIFICATIONS, []);
    }
  }

  static clearAllTrips() {
    setStoredItem(STORAGE_KEYS.TRIPS, []);
    setStoredItem(STORAGE_KEYS.ODOMETER, []);
    setStoredItem(STORAGE_KEYS.OCR_RESULTS, []);
    setStoredItem(STORAGE_KEYS.TRACKING, []);
    setStoredItem(STORAGE_KEYS.PHOTO_VERIFICATIONS, []);
  }

  static resetToDefault() {
    localStorage.clear();
    this.init();
  }

  // Theme
  static getTheme(): 'light' | 'dark' {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark') || 'light';
  }

  static setTheme(theme: 'light' | 'dark') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Current User
  static getCurrentUser(): User {
    const portalUser = typeof window !== 'undefined' ? (window as any).__PORTAL_USER__ : null;
    if (portalUser) {
      return {
        id: String(portalUser.id),
        name: portalUser.name || portalUser.full_name || portalUser.username,
        username: portalUser.username,
        email: portalUser.email || '',
        role: portalUser.role,
        office_id: String(portalUser.office_id || 1),
        status: 'active',
        can_view_reports: Boolean(portalUser.is_portal_admin || portalUser.can_view_reports),
        created_at: portalUser.created_at || new Date().toISOString(),
      };
    }
    const users = this.getUsers();
    const currentId = getStoredItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr-1');
    return users.find((u) => u.id === currentId) || users[0] || {
      id: '', name: '', username: '', email: '', role: 'viewer', office_id: '',
      status: 'inactive', can_view_reports: false, created_at: new Date(0).toISOString(),
    };
  }

  static setCurrentUser(userId: string) {
    setStoredItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  // Audit Logs
  static getAuditLogs(): AuditLogItem[] {
    return getStoredItem<AuditLogItem[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  static logAction(
    actionType: AuditLogItem['action_type'],
    description: string,
    entity: string,
    entityId: string,
    userOverride?: { name: string; role: string }
  ) {
    const user = userOverride || this.getCurrentUser();
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

    const newLog: AuditLogItem = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      user_name: user.name,
      user_role: user.role === 'admin' ? 'مدير نظام' : user.role === 'supervisor' ? 'مسؤول سائقين' : user.role === 'security' ? 'الأمن' : user.role === 'viewer' ? 'مشاهد' : 'سائق',
      ip_address: '',
      action_type: actionType,
      description,
      entity,
      entity_id: entityId,
      timestamp,
    };

    const logs = [newLog, ...this.getAuditLogs()];
    setStoredItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 300));

    // Real-time synchronization with MySQL dtms_db.audit_logs
    syncSaveAuditLog(newLog);

    return newLog;
  }

  // Notifications
  static getNotifications(): NotificationItem[] {
    return getStoredItem<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  static addNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationItem['type'],
    tripId?: string
  ) {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      trip_id: tripId,
      created_at: timestamp,
    };
    const current = [newNotif, ...this.getNotifications()];
    setStoredItem(STORAGE_KEYS.NOTIFICATIONS, current);
    try {
      SoundEffects.play(type === 'approval' ? 'success' : 'info');
    } catch {}
    return newNotif;
  }

  static markNotificationRead(id: string) {
    const list = this.getNotifications().map((n) => (n.id === id ? { ...n, is_read: true } : n));
    setStoredItem(STORAGE_KEYS.NOTIFICATIONS, list);
    void syncMarkNotificationRead(id);
  }

  static markAllNotificationsRead(userId?: string) {
    const list = this.getNotifications().map((n) =>
      !userId || n.user_id === userId ? { ...n, is_read: true } : n
    );
    setStoredItem(STORAGE_KEYS.NOTIFICATIONS, list);
    void syncMarkAllNotificationsRead();
  }

  // Settings
  static getSettings(): SystemSettings {
    const s = getStoredItem<SystemSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
    if (typeof s.gps_tracking_enabled === 'undefined') {
      s.gps_tracking_enabled = false;
      setStoredItem(STORAGE_KEYS.SETTINGS, s);
    }
    return s;
  }

  static saveSettings(settings: SystemSettings) {
    setStoredItem(STORAGE_KEYS.SETTINGS, settings);
    this.logAction('تعديل الإعدادات', 'تم تحديث إعدادات النظام وسياسات الرفع والـ OCR والمسافات وخدمة GPS.', 'settings', 'global');
  }

  // Offices
  /** Raw stored offices (Arabic `name` + optional `name_en`). Use for editing/saving. */
  static getOfficesRaw(): Office[] {
    return getStoredItem<Office[]>(STORAGE_KEYS.OFFICES, []);
  }

  /** Offices localized for display: `name`/`governorate` follow the selected UI language. */
  static getOffices(): Office[] {
    const raw = this.getOfficesRaw();
    if (getLang() !== 'en') return raw;
    return raw.map((o) => ({
      ...o,
      name: (o.name_en && o.name_en.trim()) || o.name,
      governorate: (o.governorate_en && o.governorate_en.trim()) || o.governorate,
    }));
  }

  static saveOffice(office: Office) {
    const offices = this.getOfficesRaw();
    const index = offices.findIndex((o) => o.id === office.id);
    if (index >= 0) {
      offices[index] = office;
      this.logAction('إدارة المستخدمين', `تم تحديث بيانات المكتب: ${office.name}`, 'offices', office.id);
    } else {
      offices.push(office);
      this.logAction('إدارة المستخدمين', `تم إضافة مكتب جديد: ${office.name}`, 'offices', office.id);
    }
    setStoredItem(STORAGE_KEYS.OFFICES, offices);

    // Real-time sync with MySQL (dtms_db)
    syncSaveOffice(office);
  }

  static deleteOffice(id: string) {
    const offices = this.getOfficesRaw().filter((o) => o.id !== id);
    setStoredItem(STORAGE_KEYS.OFFICES, offices);
    this.logAction('إدارة المستخدمين', `تم حذف المكتب: ${id}`, 'offices', id);

    // Real-time sync with MySQL (dtms_db)
    syncDeleteOffice(id);
  }

  // Users
  static getUsers(): User[] {
    const list = getStoredItem<User[]>(STORAGE_KEYS.USERS, []);

    let modified = false;

    // Purge central users that are not assigned to this module (cached by older syncs)
    if (typeof window !== 'undefined' && Array.isArray((window as any).__CENTRAL_REVOKED_USERNAMES__)) {
      const revoked = new Set<string>(
        ((window as any).__CENTRAL_REVOKED_USERNAMES__ as string[]).map((n) => String(n).toLowerCase())
      );
      for (let i = list.length - 1; i >= 0; i--) {
        const u = list[i];
        const uname = (u.username || '').toLowerCase();
        if (uname && uname !== 'admin' && revoked.has(uname)) {
          list.splice(i, 1);
          modified = true;
        }
      }
    }

    if (typeof window !== 'undefined' && (window as any).__CENTRAL_USERS__) {
      const centralUsers = (window as any).__CENTRAL_USERS__;
      centralUsers.forEach((cu: any) => {
        const strId = cu.id.toString();
        const exists = list.find((u) => u.id === strId || u.username === cu.username);
        if (!exists) {
          list.push({
            id: strId,
            portal_user_id: strId,
            name: cu.full_name_ar || cu.full_name_en || cu.username,
            username: cu.username,
            email: cu.email || `${cu.username}@vitasiraq.com`,
            phone: cu.phone || '',
            role: cu.is_portal_admin ? 'admin' : 'viewer',
            office_id: '1',
            status: cu.status === 'inactive' ? 'inactive' : 'active',
            can_view_reports: Boolean(cu.is_portal_admin),
            created_at: new Date().toISOString()
          });
          modified = true;
        }
      });
    }

    const sanitized = list.map((u) => {
      let updated = { ...u };
      if (!updated.username) {
        modified = true;
        if (updated.role === 'admin') {
          updated.username = 'admin';
        } else if (updated.email && updated.email.includes('@')) {
          updated.username = updated.email.split('@')[0];
        } else if (updated.role === 'supervisor') {
          updated.username = 'supervisor';
        } else if (updated.role === 'security' || updated.role === 'viewer') {
          updated.username = updated.role;
        } else {
          updated.username = 'driver';
        }
      }
      return updated;
    });
    if (modified) {
      setStoredItem(STORAGE_KEYS.USERS, sanitized);
    }
    return sanitized;
  }

  static saveUser(user: User) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
      this.logAction('إدارة المستخدمين', `تم تحديث بيانات المستخدم: ${user.name}`, 'users', user.id);
    } else {
      users.push(user);
      this.logAction('إدارة المستخدمين', `تم إنشاء مستخدم جديد: ${user.name} بدور ${user.role}`, 'users', user.id);
    }
    setStoredItem(STORAGE_KEYS.USERS, users);

    // Real-time sync with MySQL (dtms_db)
    syncSaveUser(user);
  }

  static deleteUser(id: string) {
    const targetUser = this.getUsers().find((u) => u.id === id);
    const users = this.getUsers().filter((u) => u.id !== id);
    setStoredItem(STORAGE_KEYS.USERS, users);
    this.logAction('إدارة المستخدمين', `تم حذف حساب المستخدم: ${targetUser?.name || id}`, 'users', id);

    // Real-time sync with MySQL (dtms_db)
    syncDeleteUser(id, targetUser?.username, targetUser?.email);
  }

  // Drivers
  static getDrivers(): Driver[] {
    const drivers = getStoredItem<Driver[]>(STORAGE_KEYS.DRIVERS, []);
    let modified = false;
    drivers.forEach((d) => {
      if (d.photo_url) {
        delete d.photo_url;
        modified = true;
      }
      if (d.license_photo_url) {
        delete d.license_photo_url;
        modified = true;
      }
    });
    if (modified) {
      setStoredItem(STORAGE_KEYS.DRIVERS, drivers);
    }
    return drivers;
  }

  static saveDriver(driver: Driver) {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex((d) => d.id === driver.id);
    if (idx >= 0) {
      drivers[idx] = driver;
      this.logAction('إدارة المستخدمين', `تم تحديث بيانات السائق: ${driver.full_name}`, 'drivers', driver.id);
    } else {
      drivers.push(driver);
      this.logAction('إدارة المستخدمين', `تم تسجيل سائق جديد: ${driver.full_name}`, 'drivers', driver.id);
    }
    setStoredItem(STORAGE_KEYS.DRIVERS, drivers);

    // Real-time sync with MySQL (dtms_db)
    syncSaveDriver(driver);
  }

  static deleteDriver(id: string) {
    const driver = this.getDrivers().find((d) => d.id === id);
    const drivers = this.getDrivers().filter((d) => d.id !== id);
    setStoredItem(STORAGE_KEYS.DRIVERS, drivers);
    this.logAction('إدارة المستخدمين', `تم حذف السائق: ${driver?.full_name || id}`, 'drivers', id);

    // Real-time sync with MySQL (dtms_db)
    syncDeleteDriver(id, driver?.employee_no);
  }

  // Vehicles
  static getVehicles(): Vehicle[] {
    return getStoredItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
  }

  static saveVehicle(vehicle: Vehicle) {
    const vehicles = this.getVehicles();
    const idx = vehicles.findIndex((v) => v.id === vehicle.id);
    if (idx >= 0) {
      vehicles[idx] = vehicle;
      this.logAction('إدارة الأسطول والمركبات', `تم تحديث بيانات المركبة: ${vehicle.vehicle_no} (${vehicle.plate_no})`, 'vehicles', vehicle.id);
    } else {
      vehicles.push(vehicle);
      this.logAction('إدارة الأسطول والمركبات', `تم إضافة مركبة جديدة: ${vehicle.vehicle_no} (${vehicle.plate_no})`, 'vehicles', vehicle.id);
    }
    setStoredItem(STORAGE_KEYS.VEHICLES, vehicles);

    // Real-time sync with MySQL (dtms_db)
    syncSaveVehicle(vehicle);
  }

  static deleteVehicle(id: string) {
    const veh = this.getVehicles().find((v) => v.id === id);
    const vehicles = this.getVehicles().filter((v) => v.id !== id);
    setStoredItem(STORAGE_KEYS.VEHICLES, vehicles);

    // Real-time sync with MySQL (dtms_db)
    syncDeleteVehicle(id, veh?.vehicle_no, veh?.plate_no);

    // Unassign vehicle from any driver assigned to it
    const drivers = this.getDrivers();
    let driversModified = false;
    drivers.forEach((d) => {
      if (d.assigned_vehicle_id === id) {
        d.assigned_vehicle_id = undefined;
        driversModified = true;
      }
    });
    if (driversModified) {
      setStoredItem(STORAGE_KEYS.DRIVERS, drivers);
    }

    this.logAction(
      'إدارة الأسطول والمركبات',
      `تم حذف المركبة: ${veh?.vehicle_no || id} (${veh?.plate_no || ''})`,
      'vehicles',
      id
    );
  }

  // Trips
  static getTrips(): Trip[] {
    const raw = getStoredItem<Trip[]>(STORAGE_KEYS.TRIPS, []);
    return raw.map((t) => ({
      ...t,
      companions: Array.isArray(t.companions) ? t.companions : [],
    }));
  }

  static getTripById(id: string): Trip | undefined {
    return this.getTrips().find((t) => t.id === id);
  }

  static saveTrip(trip: Trip, syncWithDatabase = true): Trip {
    const trips = this.getTrips();
    const idx = trips.findIndex((t) => t.id === trip.id);
    if (idx >= 0) {
      trips[idx] = trip;
      this.logAction('تعديل رحلة', `تم تعديل بيانات الرحلة ${trip.trip_no}`, 'trips', trip.id);
    } else {
      trips.unshift(trip);
      this.logAction('إنشاء رحلة', `تم إنشاء رحلة جديدة رقم ${trip.trip_no} لوجهة ${trip.destination}`, 'trips', trip.id);
    }
    setStoredItem(STORAGE_KEYS.TRIPS, trips);

    // Real-time sync with MySQL (dtms_db)
    if (syncWithDatabase) syncSaveTrip(trip);

    return trip;
  }

  static deleteTrip(tripId: string): { success: boolean; message: string } {
    const trip = this.getTripById(tripId);
    if (!trip) return { success: false, message: 'الرحلة غير موجودة' };
    if (trip.status !== 'new') {
      return { success: false, message: 'قاعدة العمل: لا يمكن حذف رحلة بدأت فعلياً أو قيد الإجراء!' };
    }
    const trips = this.getTrips().filter((t) => t.id !== tripId);
    setStoredItem(STORAGE_KEYS.TRIPS, trips);
    this.logAction('تعديل رحلة', `تم إلغاء وحذف الرحلة المجدولة ${trip.trip_no}`, 'trips', tripId);

    // Real-time sync with MySQL (dtms_db)
    syncDeleteTrip(tripId);

    return { success: true, message: 'تم حذف الرحلة بنجاح' };
  }

  // Odometer Records
  static getOdometerRecords(): OdometerRecord[] {
    return getStoredItem<OdometerRecord[]>(STORAGE_KEYS.ODOMETER, []);
  }

  static saveOdometerRecord(record: OdometerRecord) {
    const list = this.getOdometerRecords();
    const existingIndex = list.findIndex((item) => item.trip_id === record.trip_id && item.type === record.type);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }
    setStoredItem(STORAGE_KEYS.ODOMETER, list);
    this.logAction('قراءة عداد', `تسجيل قراءة عداد ${record.type === 'start' ? 'البداية' : 'النهاية'} للرحلة: ${record.reading} كم`, 'odometer_records', record.id);
    return syncSaveOdometerRecord(record);
  }

  static reviseEndOdometerRecord(tripId: string, reading: number): OdometerRecord | null {
    const list = this.getOdometerRecords();
    const index = list.findIndex((record) => record.trip_id === tripId && record.type === 'end');
    if (index < 0) return null;

    list[index] = {
      ...list[index],
      reading,
      manual_override: true,
    };
    setStoredItem(STORAGE_KEYS.ODOMETER, list);
    this.logAction('قراءة عداد', `تصحيح يدوي لقراءة عداد نهاية الرحلة إلى ${reading} كم`, 'odometer_records', list[index].id);
    return list[index];
  }

  static reviseOdometerRecords(
    tripId: string,
    startReading: number,
    endReading: number,
    startDisplayReading = startReading,
    endDisplayReading = endReading,
    readingUnit: 'km' | 'mile' = 'km'
  ): OdometerRecord[] {
    const list = this.getOdometerRecords();
    const revised: OdometerRecord[] = [];
    list.forEach((record, index) => {
      if (record.trip_id !== tripId || (record.type !== 'start' && record.type !== 'end')) return;
      const reading = record.type === 'start' ? startReading : endReading;
      list[index] = {
        ...record,
        reading,
        display_reading: record.type === 'start' ? startDisplayReading : endDisplayReading,
        reading_unit: readingUnit,
        manual_override: true,
      };
      revised.push(list[index]);
    });
    setStoredItem(STORAGE_KEYS.ODOMETER, list);
    this.logAction('قراءة عداد', `تصحيح يدوي لقراءات عداد الرحلة: البداية ${startReading} كم والنهاية ${endReading} كم`, 'odometer_records', tripId);
    return revised;
  }

  // OCR Results
  static getOCRResults(): OCRResult[] {
    return getStoredItem<OCRResult[]>(STORAGE_KEYS.OCR_RESULTS, []);
  }

  static saveOCRResult(res: OCRResult) {
    const list = this.getOCRResults();
    list.unshift(res);
    setStoredItem(STORAGE_KEYS.OCR_RESULTS, list);
    this.logAction('نتائج OCR', `معالجة صورة العداد بنجاح: ${res.parsed_number} (دقة ${res.confidence}%)`, 'ocr_results', res.id);
  }

  // Tracking
  static getTrackingPoints(tripId?: string): TripTrackingPoint[] {
    const all = getStoredItem<TripTrackingPoint[]>(STORAGE_KEYS.TRACKING, []);
    return tripId ? all.filter((p) => p.trip_id === tripId) : all;
  }

  static addTrackingPoint(point: TripTrackingPoint) {
    const list = this.getTrackingPoints();
    list.push(point);
    setStoredItem(STORAGE_KEYS.TRACKING, list);
    void syncSaveTrackingPoint(point);
  }

  // Vehicle Assignments
  static getAssignments(): VehicleAssignment[] {
    return getStoredItem<VehicleAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
  }

  static saveAssignment(assignment: VehicleAssignment) {
    const list = this.getAssignments();
    const idx = list.findIndex((a) => a.id === assignment.id);
    if (idx >= 0) {
      list[idx] = assignment;
      this.logAction('إعادة مركبة', `تم استلام وإعادة المركبة رقم ${assignment.vehicle_id}`, 'vehicle_assignments', assignment.id);
    } else {
      list.unshift(assignment);
      this.logAction('تسليم مركبة', `تم تسليم المركبة إلكترونياً وتوثيق الصور الأربعة`, 'vehicle_assignments', assignment.id);
    }
    setStoredItem(STORAGE_KEYS.ASSIGNMENTS, list);

    // Update vehicle status
    const vehicles = this.getVehicles();
    const vIdx = vehicles.findIndex((v) => v.id === assignment.vehicle_id);
    if (vIdx >= 0) {
      vehicles[vIdx].status = assignment.status === 'active' ? 'assigned' : 'available';
      setStoredItem(STORAGE_KEYS.VEHICLES, vehicles);
    }
  }

  // Maintenance
  static getMaintenance(): VehicleMaintenance[] {
    return getStoredItem<VehicleMaintenance[]>(STORAGE_KEYS.MAINTENANCE, []);
  }

  static saveMaintenance(m: VehicleMaintenance) {
    const list = this.getMaintenance();
    const idx = list.findIndex((x) => x.id === m.id);
    if (idx >= 0) {
      list[idx] = m;
    } else {
      list.unshift(m);
    }
    setStoredItem(STORAGE_KEYS.MAINTENANCE, list);
    this.logAction('إدارة المستخدمين', `تحديث سجل الصيانة الدورية للمركبة ${m.vehicle_id}`, 'vehicle_maintenance', m.id);
  }

  // Photo Verification & Anti-tamper
  static getPhotoVerifications(): PhotoVerification[] {
    return getStoredItem<PhotoVerification[]>(STORAGE_KEYS.PHOTO_VERIFICATIONS, []);
  }

  static savePhotoVerification(p: PhotoVerification) {
    const list = this.getPhotoVerifications();
    list.unshift(p);
    setStoredItem(STORAGE_KEYS.PHOTO_VERIFICATIONS, list);
  }

  // Aliases for compatibility
  static getVehicleAssignments(): VehicleAssignment[] {
    return this.getAssignments();
  }

  static saveVehicleAssignment(a: VehicleAssignment) {
    this.saveAssignment(a);
  }

  static getTripTracking(tripId?: string): TripTrackingPoint[] {
    return this.getTrackingPoints(tripId);
  }
}

