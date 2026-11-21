/**
 * DTMS - Real-time MySQL Database Synchronization Client
 * Syncs frontend actions directly with XAMPP MySQL database (dtms_db)
 */

import { readableText } from './i18n';

async function fetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method || 'GET').toUpperCase();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 45000);
  if (method !== 'GET' && method !== 'HEAD') {
    const token = (window as any).__PORTAL_BOOTSTRAP__?.csrfToken;
    if (token) headers.set('X-CSRF-Token', token);
  }

  try {
    return await globalThis.fetch(input, {
      ...init,
      headers,
      signal: controller.signal,
      credentials: 'same-origin',
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '/hr_drivers/api/index.php';
  return '/hr_drivers/api/index.php';
}

export async function syncMarkNotificationRead(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}?endpoint=notifications&action=read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function syncMarkAllNotificationsRead(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}?endpoint=notifications&action=read_all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchGovernorates(): Promise<any[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=governorates`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to load governorates:', err);
    return [];
  }
}

export async function saveGovernorate(governorate: { id?: string; name_ar: string; name_en: string }): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=governorates&action=save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(governorate),
    });
    const data = await res.json();
    return { success: res.ok, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to save governorate.' };
  }
}

export async function deleteGovernorate(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=governorates&action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return { success: res.ok, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to delete governorate.' };
  }
}

export async function syncDeleteVehicle(id: string, vehicleNo?: string, plateNo?: string): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=vehicles&action=delete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, vehicle_no: vehicleNo, plate_no: plateNo }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync vehicle delete with MySQL:', err);
    return false;
  }
}

export async function syncSaveVehicle(vehicle: any): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=vehicles&action=save`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync vehicle save with MySQL:', err);
    return false;
  }
}

export async function syncDeleteUser(id: string, username?: string, email?: string): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=users&action=delete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username, email }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync user delete with MySQL:', err);
    return false;
  }
}

export async function syncSaveUser(user: any): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=users&action=save`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync user save with MySQL:', err);
    return false;
  }
}

export async function syncSaveDriver(driver: any): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=drivers&action=save`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: driver.id,
        user_id: driver.user_id,
        portal_user_id: driver.portal_user_id,
        full_name: driver.full_name,
        employee_no: driver.employee_no,
        phone: driver.phone,
        office_id: driver.office_id,
        license_no: driver.license_no,
        license_expiry: driver.license_expiry,
        assigned_vehicle_id: driver.assigned_vehicle_id,
        status: driver.status,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync driver save with MySQL:', err);
    return false;
  }
}

export async function syncDeleteDriver(id: string, employeeNo?: string): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=drivers&action=delete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, employee_no: employeeNo }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync driver delete with MySQL:', err);
    return false;
  }
}

export async function syncSaveOffice(office: any): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=offices&action=save`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(office),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync office save with MySQL:', err);
    return false;
  }
}

export async function syncDeleteOffice(id: string): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=offices&action=delete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync office delete with MySQL:', err);
    return false;
  }
}

export async function syncSaveTrip(trip: any): Promise<{ success: boolean; message?: string; id?: string; tripNo?: string }> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=trips&action=save`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: res.ok && data.status !== 'error',
      message: data.message,
      id: data.id != null ? String(data.id) : undefined,
      tripNo: data.trip_no,
    };
  } catch (err: any) {
    console.warn('[DTMS API Sync] Failed to sync trip save with MySQL:', err);
    return { success: false, message: err?.message || 'Network error' };
  }
}

export async function syncUpdateTripDestinations(
  tripId: string,
  destinations: any[]
): Promise<{ success: boolean; message?: string; data?: any[] }> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=trips&action=update_destinations`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, destinations }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: res.ok && data.status === 'success',
      message: data.message,
      data: Array.isArray(data.data) ? data.data : undefined,
    };
  } catch (err: any) {
    console.warn('[DTMS API Sync] Failed to update trip destinations:', err);
    return { success: false, message: err?.message || 'Network error' };
  }
}

export async function analyzeOdometerWithAzure(payload: {
  trip_id: string;
  image_data: string;
  expected_min?: number;
}): Promise<{
  success: boolean;
  message?: string;
  data?: {
    raw_text: string;
    extracted_number: number;
    confidence: number;
    engine: 'Azure Vision';
    model_version?: string;
    processing_time_ms: number;
    requires_manual_review?: boolean;
    validation_warning?: string | null;
    expected_reference?: number;
  };
}> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=ocr&action=analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const response = await res.json().catch(() => ({}));
    return {
      success: res.ok && response.status === 'success',
      message: response.message,
      data: response.data,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to connect to Azure Vision OCR.' };
  }
}

export interface AzureOcrSettingsResponse {
  endpoint: string;
  region: string;
  api_version: string;
  key_configured: boolean;
  key_masked: string;
}

export async function fetchAzureOcrSettings(): Promise<{
  success: boolean;
  message?: string;
  data?: AzureOcrSettingsResponse;
}> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=ocr_settings`);
    const response = await res.json().catch(() => ({}));
    return { success: res.ok && response.status === 'success', message: response.message, data: response.data };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to load Azure OCR settings.' };
  }
}

export async function saveAzureOcrSettings(payload: {
  endpoint: string;
  region: string;
  key?: string;
  clear_key?: boolean;
}): Promise<{ success: boolean; message?: string; data?: AzureOcrSettingsResponse }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=ocr_settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const response = await res.json().catch(() => ({}));
    return { success: res.ok && response.status === 'success', message: response.message, data: response.data };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to save Azure OCR settings.' };
  }
}

export async function syncCompleteTripDestination(
  tripId: string,
  destinationId: string
): Promise<{ success: boolean; completedAt?: string; message?: string }> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=trips&action=complete_destination`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, destination_id: destinationId }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.status === 'success',
      completedAt: data.completed_at,
      message: data.message,
    };
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to complete trip destination:', err);
    return { success: false, message: 'Network error' };
  }
}

export async function syncReviseTripOdometer(payload: {
  trip_id: string;
  start_reading: number;
  end_reading: number;
  display_start_reading?: number;
  display_end_reading?: number;
  reading_unit?: 'km' | 'mile';
  distance_gps: number;
  diff_status: string;
  driver_notes?: string;
}): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=trips&action=revise_odometer`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: res.ok && data.status === 'success', data, message: data.message };
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to revise trip odometer:', err);
    return { success: false, message: 'Network error' };
  }
}

export async function syncSaveOdometerRecord(record: any): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=odometer`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to save odometer evidence:', err);
    return false;
  }
}

export async function syncSaveTrackingPoint(point: any): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(point),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to save GPS tracking point:', err);
    return false;
  }
}

export async function syncAttachOdometerOcr(payload: {
  trip_id: string;
  type: 'start' | 'end';
  ocr_result: number;
  confidence_score: number;
}): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=odometer&action=attach_ocr`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to attach OCR evidence:', err);
    return false;
  }
}

export async function fetchOdometerRecordsForTrip(tripId: string): Promise<any[]> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=odometer&trip_id=${encodeURIComponent(tripId)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to load odometer evidence:', err);
    return [];
  }
}

export async function syncDeleteTrip(id: string): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=trips&action=delete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync trip delete with MySQL:', err);
    return false;
  }
}

export async function syncSaveAuditLog(log: any): Promise<boolean> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=audit_logs&action=save`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: log.user_name || log.userName || 'مستخدم النظام',
        user_role: log.user_role || log.userRole || 'مسؤول',
        ip_address: log.ip_address || log.ipAddress || '127.0.0.1',
        action_type: log.action_type || log.action || 'إجراء نظام',
        description: log.description || log.details || '',
        entity: log.entity || log.table_name || 'global',
        entity_id: String(log.entity_id || log.entityId || '1'),
        timestamp: log.timestamp || log.created_at,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to sync audit log with MySQL:', err);
    return false;
  }
}

export async function fetchAuditLogsFromMySQL(): Promise<any[]> {
  try {
    const url = `${getApiBaseUrl()}?endpoint=audit_logs`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to fetch audit logs from MySQL:', err);
    return [];
  }
}

/**
 * Hydrates local storage cache directly from MySQL database (dtms_db).
 * Ensures that what displays on screen matches actual database records.
 */
export async function hydrateDataFromMySQL(): Promise<{
  success: boolean;
  authRequired?: boolean;
  counts?: { offices: number; users: number; vehicles: number; drivers: number; trips: number; notifications: number; audit_logs: number };
}> {
  if (typeof window === 'undefined') return { success: false };

  try {
    const baseUrl = getApiBaseUrl();
    const isViewer = (window as any).__PORTAL_USER__?.role === 'viewer';
    const isAdmin = (window as any).__PORTAL_USER__?.role === 'admin' || Boolean((window as any).__PORTAL_USER__?.is_portal_admin);

    const fetchHydrationData = async (url: string) => {
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || `Request failed (${response.status})`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return data;
    };

    // Fetch in parallel
    const [resOffices, resUsers, resVehicles, resDrivers, resTrips, resNotifications, resAuditLogs, resRuntimeSettings, resTracking] = await Promise.allSettled([
      fetchHydrationData(`${baseUrl}?endpoint=offices`),
      isAdmin ? fetchHydrationData(`${baseUrl}?endpoint=users`) : Promise.resolve({ data: [] }),
      fetchHydrationData(`${baseUrl}?endpoint=vehicles`),
      fetchHydrationData(`${baseUrl}?endpoint=drivers`),
      fetchHydrationData(`${baseUrl}?endpoint=trips`),
      fetchHydrationData(`${baseUrl}?endpoint=notifications`),
      isAdmin ? fetchHydrationData(`${baseUrl}?endpoint=audit_logs`) : Promise.resolve({ data: [] }),
      fetchHydrationData(`${baseUrl}?endpoint=runtime_settings`),
      isViewer ? Promise.resolve({ data: [] }) : fetchHydrationData(`${baseUrl}?endpoint=tracking`),
    ]);

    const responses = [resOffices, resUsers, resVehicles, resDrivers, resTrips, resNotifications, resAuditLogs, resRuntimeSettings, resTracking];
    const authFailure = responses.some((result) =>
      result.status === 'rejected' && [401, 419].includes(Number((result.reason as any)?.status))
    );
    if (authFailure) return { success: false, authRequired: false };
    if (resTrips.status === 'rejected' || resDrivers.status === 'rejected') return { success: false };

    if (resRuntimeSettings.status === 'fulfilled' && resRuntimeSettings.value?.data?.default_ocr_engine) {
      const storedSettings = JSON.parse(localStorage.getItem('dtms_settings_v2') || '{}');
      localStorage.setItem('dtms_settings_v2', JSON.stringify({
        ...storedSettings,
        default_ocr_engine: resRuntimeSettings.value.data.default_ocr_engine,
        gps_tracking_enabled: Boolean(resRuntimeSettings.value.data.gps_tracking_enabled),
      }));
    }

    if (resTracking.status === 'fulfilled' && Array.isArray(resTracking.value?.data)) {
      const tracking = resTracking.value.data.map((point: any) => ({
        id: String(point.id),
        trip_id: String(point.trip_id),
        driver_id: String(point.driver_id),
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        speed: Number(point.speed) || 0,
        heading: Number(point.heading) || 0,
        location_name: point.location_name || '',
        timestamp: point.timestamp || '',
      }));
      localStorage.setItem('dtms_tracking_v2', JSON.stringify(tracking));
    }

    let notificationsCount = 0;
    if (resNotifications.status === 'fulfilled' && Array.isArray(resNotifications.value?.data)) {
      const notifications = resNotifications.value.data.map((notification: any) => ({
        id: String(notification.id),
        user_id: String(notification.user_id),
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'system',
        is_read: Boolean(Number(notification.is_read)),
        trip_id: notification.trip_id ? String(notification.trip_id) : undefined,
        created_at: notification.created_at || '',
      }));
      localStorage.setItem('dtms_notifications_v2', JSON.stringify(notifications));
      notificationsCount = notifications.length;
    }

    let officesCount = 0;
    let usersCount = 0;
    let vehiclesCount = 0;
    let driversCount = 0;
    let tripsCount = 0;

    // Offices
    if (resOffices.status === 'fulfilled' && resOffices.value?.data) {
      const offices = resOffices.value.data.map((o: any) => ({
        id: String(o.id),
        name: o.name,
        code: o.code,
        governorate: o.governorate,
        address: o.address || '',
        status: o.status || 'active',
        created_at: o.created_at || '',
      }));
      localStorage.setItem('dtms_offices_v2', JSON.stringify(offices));
      officesCount = offices.length;
    }

    // Users
    if (resUsers.status === 'fulfilled' && resUsers.value?.data) {
      const users = resUsers.value.data.map((u: any) => {
        return {
          id: String(u.id),
          portal_user_id: u.portal_user_id ? String(u.portal_user_id) : String(u.id),
          name: readableText(u.name, u.username, u.email, `User ${u.id}`),
          username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          office_id: String(u.office_id),
          status: u.status,
          can_view_reports: Boolean(Number(u.can_view_reports)),
          preferred_language: u.preferred_language === 'en' ? 'en' : 'ar',
          driver_mode: u.driver_mode === 'complex' ? 'complex' : 'simple',
          created_at: u.created_at || '',
        };
      });
      localStorage.setItem('dtms_users_v2', JSON.stringify(users));
      usersCount = users.length;
    }

    // Vehicles
    if (resVehicles.status === 'fulfilled' && resVehicles.value?.data) {
      const vehicles = resVehicles.value.data.map((v: any) => ({
        id: String(v.id),
        vehicle_no: v.vehicle_no,
        plate_no: v.plate_no,
        vehicle_type: v.vehicle_type || 'صالون',
        vehicle_category: v.vehicle_category || 'خصوصي',
        model: v.model || '',
        year: Number(v.year) || new Date().getFullYear(),
        chassis_no: v.chassis_no || undefined,
        fuel_type: v.fuel_type || 'بنزين',
        avg_consumption: Number(v.avg_consumption) || 10,
        last_odometer: Number(v.last_odometer) || 0,
        odometer_unit: v.odometer_unit === 'mile' ? 'mile' : 'km',
        status: v.status || 'available',
        office_id: String(v.office_id),
        assigned_driver_id: v.assigned_driver_id ? String(v.assigned_driver_id) : undefined,
        insurance_expiry: v.insurance_expiry || undefined,
        inspection_expiry: v.inspection_expiry || undefined,
        created_at: v.created_at || '',
      }));
      localStorage.setItem('dtms_vehicles_v2', JSON.stringify(vehicles));
      vehiclesCount = vehicles.length;
    }

    // Drivers
    if (resDrivers.status === 'fulfilled' && resDrivers.value?.data) {
      const drivers = resDrivers.value.data.map((d: any) => ({
        id: String(d.id),
        user_id: d.user_id ? String(d.user_id) : '',
        portal_user_id: d.portal_user_id ? String(d.portal_user_id) : undefined,
        full_name: readableText(d.full_name, d.username, d.employee_no, `Driver ${d.id}`),
        employee_no: d.employee_no,
        phone: d.phone || '',
        office_id: String(d.office_id),
        license_no: d.license_no || '',
        license_expiry: d.license_expiry || '',
        assigned_vehicle_id: d.assigned_vehicle_id ? String(d.assigned_vehicle_id) : undefined,
        status: d.status || 'available',
        created_at: d.created_at || '',
      }));
      localStorage.setItem('dtms_drivers_v2', JSON.stringify(drivers));
      driversCount = drivers.length;
    }

    // Trips
    if (resTrips.status === 'fulfilled' && resTrips.value?.data) {
      const trips = resTrips.value.data.map((t: any) => ({
        id: String(t.id),
        trip_no: t.trip_no,
        office_id: String(t.office_id),
        driver_id: String(t.driver_id),
        vehicle_id: String(t.vehicle_id),
        trip_type: t.trip_type || 'internal',
        record_type: t.record_type === 'work_session' ? 'work_session' : 'trip',
        internal_trip_count: Number(t.internal_trip_count) || 0,
        external_trip_count: Number(t.external_trip_count) || 0,
        passenger_names: t.passenger_names || '',
        work_session_routes: Array.isArray(t.work_session_routes)
          ? t.work_session_routes.map((route: any) => ({
              id: String(route.id),
              from_governorate_id: String(route.from_governorate_id),
              from_governorate_name: route.from_governorate_name || '',
              to_governorate_id: String(route.to_governorate_id),
              to_governorate_name: route.to_governorate_name || '',
            }))
          : [],
        governorate: readableText(
          t.governorate,
          t.start_governorate_name,
          t.office_governorate,
          t.start_governorate_name_en,
          t.office_governorate_en
        ),
        start_point_type: t.start_point_type || undefined,
        start_governorate_id: t.start_governorate_id ? String(t.start_governorate_id) : undefined,
        start_office_id: t.start_office_id ? String(t.start_office_id) : undefined,
        start_point_name: t.start_point_name || undefined,
        start_location_detail: t.start_location_detail || undefined,
        destination: t.destination || '',
        visit_location: t.visit_location || '',
        purpose: t.purpose || '',
        destinations: Array.isArray(t.destinations)
          ? t.destinations.map((d: any) => ({
              id: String(d.id),
              governorate_id: d.governorate_id ? String(d.governorate_id) : undefined,
              governorate_name: readableText(d.governorate_name, d.resolved_governorate_name, d.resolved_governorate_name_en) || undefined,
              destination: readableText(d.destination),
              visit_location: readableText(d.visit_location),
              purpose: readableText(d.purpose),
              completed: Boolean(Number(d.completed)),
              completed_at: d.completed_at || undefined,
              completed_by: d.completed_by || undefined,
            }))
          : [],
        planned_departure_date: t.planned_departure_date || '',
        departure_date: t.departure_date || undefined,
        departure_time: t.departure_time || undefined,
        actual_departure_time: t.actual_departure_time || undefined,
        arrival_date: t.arrival_date || undefined,
        arrival_time: t.arrival_time || undefined,
        actual_return_time: t.actual_return_time || undefined,
        status: t.status || 'new',
        distance_gps: Number(t.distance_gps) || 0,
        distance_odometer: Number(t.distance_odometer) || 0,
        distance_diff: Number(t.distance_diff) || 0,
        diff_status: t.diff_status || 'normal',
        supervisor_notes: t.supervisor_notes || '',
        driver_notes: t.driver_notes || '',
        companions: Array.isArray(t.companions)
          ? t.companions.map((c: any) => ({
              id: String(c.id || Math.random()),
              name: c.name || '',
              job_title: c.job_title || '',
            }))
          : typeof t.companions === 'string'
            ? (() => {
                try {
                  const parsed = JSON.parse(t.companions);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : [],
        created_by: t.created_by || '',
        created_at: t.created_at || '',
      }));
      localStorage.setItem('dtms_trips_v2', JSON.stringify(trips));
      tripsCount = trips.length;
    }

    // Audit Logs
    let auditLogsCount = 0;
    if (resAuditLogs.status === 'fulfilled' && resAuditLogs.value?.data) {
      const logs = resAuditLogs.value.data.map((l: any) => ({
        id: String(l.id),
        user_name: l.user_name || 'مستخدم النظام',
        user_role: l.user_role || 'مسؤول',
        ip_address: l.ip_address || '127.0.0.1',
        action_type: l.action_type || l.action || 'إجراء نظام',
        action: l.action_type || l.action || 'إجراء نظام',
        description: l.description || l.details || '',
        details: l.description || l.details || '',
        entity: l.entity || l.table_name || 'global',
        table_name: l.entity || l.table_name || 'global',
        entity_id: String(l.entity_id || '1'),
        timestamp: l.timestamp || '',
        created_at: l.timestamp || '',
      }));
      if (logs.length > 0) {
        localStorage.setItem('dtms_audit_logs_v2', JSON.stringify(logs));
        auditLogsCount = logs.length;
      }
    }

    return {
      success: true,
      counts: {
        offices: officesCount,
        users: usersCount,
        vehicles: vehiclesCount,
        drivers: driversCount,
        trips: tripsCount,
        notifications: notificationsCount,
        audit_logs: auditLogsCount,
      },
    };
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to hydrate data from MySQL:', err);
    return { success: false };
  }
}

export interface BackupInfo {
  status: string;
  database: string;
  tables_count: number;
  default_folder: string;
  server_presets: string[];
  timestamp: string;
}

export interface BackupResult {
  success: boolean;
  message: string;
  file_path?: string;
  target_folder?: string;
  filename?: string;
  size_formatted?: string;
  tables_count?: number;
  database?: string;
  timestamp?: string;
}

export async function fetchBackupInfo(): Promise<BackupInfo | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=backup&action=info`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[DTMS API Sync] Failed to fetch backup info:', err);
  }
  return null;
}

export async function fetchMySQLDumpSql(): Promise<{
  success: boolean;
  sql?: string;
  filename?: string;
  size_formatted?: string;
  tables_count?: number;
  database?: string;
  message?: string;
}> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=backup&action=get_sql`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      success: data.status === 'success',
      sql: data.sql,
      filename: data.filename,
      size_formatted: data.size_formatted,
      tables_count: data.tables_count,
      database: data.database,
    };
  } catch (err: any) {
    console.warn('[DTMS API Sync] Failed to fetch SQL dump:', err);
    return { success: false, message: err.message || 'فشل توليد سكربت قاعدة بيانات MySQL' };
  }
}

export async function saveMySQLBackupToServerFolder(
  targetFolder: string,
  userName?: string
): Promise<BackupResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=backup&action=save_to_folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_folder: targetFolder, user_name: userName }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return {
        success: true,
        message: data.message,
        file_path: data.file_path,
        target_folder: data.target_folder,
        filename: data.filename,
        size_formatted: data.size_formatted,
        tables_count: data.tables_count,
        database: data.database,
        timestamp: data.timestamp,
      };
    }
    return {
      success: false,
      message: data.message || 'حدث خطأ أثناء حفظ النسخة الاحتياطية في المجلد المحدد',
    };
  } catch (err: any) {
    console.warn('[DTMS API Sync] Failed to save backup to folder:', err);
    return {
      success: false,
      message: 'تعذر الاتصال بالخادم لحفظ النسخة الاحتياطية: ' + (err.message || ''),
    };
  }
}

export function getMySQLBackupDownloadUrl(): string {
  return `${getApiBaseUrl()}?endpoint=backup&action=download`;
}

export async function syncRestoreMySQLDump(
  sqlContent: string,
  userName?: string
): Promise<{ success: boolean; message: string; tables_count?: number }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}?endpoint=backup&action=restore_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sqlContent, user_name: userName }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return {
        success: true,
        message: data.message,
        tables_count: data.tables_count,
      };
    }
    return {
      success: false,
      message: data.message || 'فشلت استعادة قاعدة بيانات MySQL',
    };
  } catch (err: any) {
    console.warn('[DTMS API Sync] Failed to restore MySQL dump:', err);
    return {
      success: false,
      message: 'تعذر الاتصال بالخادم لاستعادة قاعدة البيانات: ' + (err.message || ''),
    };
  }
}

