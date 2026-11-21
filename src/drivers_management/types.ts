export type Role = 'admin' | 'supervisor' | 'security' | 'viewer' | 'driver';

export type TripType = 'internal' | 'external';
export type DriverMode = 'simple' | 'complex';
export type TripRecordType = 'trip' | 'work_session';

export type TripStatus =
  | 'new'
  | 'in_progress'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

export type VehicleStatus = 'available' | 'assigned' | 'out_of_service';

export type DiffEvaluation = 'normal' | 'review_needed' | 'alert';

export type DriverStatus = 'available' | 'on_trip' | 'off_duty' | 'suspended';

export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'بنزين' | 'ديزل' | 'هايبرد' | '';
export type OdometerUnit = 'km' | 'mile';

export type MaintenanceType =
  | 'oil_change'
  | 'filter_replacement'
  | 'tires'
  | 'brakes'
  | 'general_service'
  | 'emergency_repair';

export interface Office {
  id: string;
  name: string;
  name_en?: string;
  code?: string;
  governorate: string;
  governorate_en?: string;
  address: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  portal_user_id?: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: Role;
  office_id: string;
  status: 'active' | 'inactive';
  preferred_language?: 'ar' | 'en';
  can_view_reports?: boolean;
  driver_mode?: DriverMode;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  portal_user_id?: string;
  full_name: string;
  employee_no: string;
  phone: string;
  office_id: string;
  license_no: string;
  license_type?: string;
  license_expiry: string;
  photo_url?: string;
  license_photo_url?: string;
  assigned_vehicle_id?: string;
  status: DriverStatus;
  total_distance_km?: number;
  total_trips_count?: number;
  rating?: number;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  vehicle_no: string;
  plate_no: string;
  vehicle_type: string;
  vehicle_category?: 'خصوصي' | 'عمومي';
  model: string;
  year: number;
  chassis_no?: string;
  fuel_type?: FuelType;
  engine_capacity?: string;
  color?: string;
  avg_consumption?: number; // L/100km
  last_odometer: number;
  odometer_unit?: OdometerUnit;
  status: VehicleStatus;
  office_id: string;
  assigned_driver_id?: string;
  insurance_expiry?: string;
  inspection_expiry?: string;
  maintenance_interval_km?: number;
  photos?: {
    front?: string;
    back?: string;
    right?: string;
    left?: string;
  };
  created_at?: string;
}

export interface TripCompanion {
  id: string;
  name: string;
  job_title: string;
}

export interface TripDestination {
  id: string;
  governorate_id?: string;
  governorate_name?: string;
  destination: string;
  visit_location: string;
  purpose: string;
  completed?: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface WorkSessionRoute {
  id: string;
  from_governorate_id: string;
  from_governorate_name: string;
  to_governorate_id: string;
  to_governorate_name: string;
}


export interface Trip {
  id: string;
  trip_no: string;
  office_id: string;
  driver_id: string;
  vehicle_id: string;
  trip_type: TripType;
  record_type?: TripRecordType;
  internal_trip_count?: number;
  external_trip_count?: number;
  passenger_names?: string;
  work_session_routes?: WorkSessionRoute[];
  governorate: string;
  start_point_type?: 'driver_governorate' | 'office_branch' | 'governorate';
  start_governorate_id?: string;
  start_office_id?: string;
  start_point_name?: string;
  start_location_detail?: string;
  destination: string;
  visit_location: string;
  purpose: string;
  destinations?: TripDestination[];
  planned_departure_date: string;
  departure_time?: string;
  departure_date?: string;
  arrival_date?: string;
  arrival_time?: string;
  departure_lat?: number;
  departure_lng?: number;
  departure_location_name?: string;
  arrival_lat?: number;
  arrival_lng?: number;
  arrival_location_name?: string;
  companions: TripCompanion[];
  supervisor_notes?: string;
  driver_notes?: string;
  status: TripStatus;
  distance_gps: number;
  distance_odometer: number;
  distance_diff: number;
  diff_status: DiffEvaluation;
  created_by: string;
  created_at: string;
  approval_notes?: string;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface OdometerRecord {
  id: string;
  trip_id: string;
  type: 'start' | 'end';
  reading: number;
  display_reading?: number;
  reading_unit?: OdometerUnit;
  photo_url: string;
  ocr_result: string;
  confidence_score: number;
  is_verified: boolean;
  manual_override: boolean;
  created_at: string;
}

export interface OCRResult {
  id: string;
  trip_id: string;
  type: 'start' | 'end';
  raw_text: string;
  parsed_number: number;
  confidence: number;
  processing_time_ms: number;
  engine: 'Azure Vision';
  preprocessed_image_url?: string;
}

export interface PhotoVerification {
  id: string;
  trip_id: string;
  photo_type: 'start_odometer' | 'end_odometer' | 'handover_front' | 'handover_back' | 'handover_right' | 'handover_left';
  photo_url: string;
  latitude: number;
  longitude: number;
  device_id: string;
  capture_date: string;
  capture_time: string;
  exif_data?: string;
  is_duplicate: boolean;
  is_tampered: boolean;
  watermark_applied: boolean;
}

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id: string;
  assignment_type?: 'handover' | 'return';
  date?: string;
  time?: string;
  odometer_reading?: number;
  front_photo?: string;
  back_photo?: string;
  right_photo?: string;
  left_photo?: string;
  driver_signature?: string;
  supervisor_signature?: string;
  notes?: string;
  damages_found?: string;
  handover_time?: string;
  handover_condition?: string;
  handover_notes?: string;
  photo_front?: string;
  photo_back?: string;
  photo_right?: string;
  photo_left?: string;
  return_time?: string;
  return_condition?: string;
  return_notes?: string;
  return_photo_front?: string;
  return_photo_back?: string;
  return_photo_right?: string;
  return_photo_left?: string;
  status: 'active' | 'returned';
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_type?: MaintenanceType | string;
  description?: string;
  cost?: number;
  workshop_name?: string;
  maintenance_date?: string;
  odometer_at_service?: number;
  next_due_odometer?: number;
  next_maintenance_date?: string;
  target_kilometers?: number;
  current_kilometers?: number;
  oil_status?: 'جيد' | 'يحتاج تبديل' | 'تم التبديل حديثاً';
  tires_status?: 'ممتاز' | 'جيد' | 'يحتاج فحص';
  battery_status?: 'سليمة' | 'ضعيفة' | 'جديدة';
  notes?: string;
  status?: string;
  last_service_date?: string;
}

export type MaintenanceRecord = VehicleMaintenance;

export interface TripTrackingPoint {
  id: string;
  trip_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees
  timestamp: string;
  location_name: string;
}

export type TrackingPoint = TripTrackingPoint;

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'trip_assigned' | 'trip_completed' | 'approval' | 'maintenance' | 'system';
  is_read: boolean;
  trip_id?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  user_name: string;
  user_role?: string;
  ip_address: string;
  action?: string;
  table_name?: string;
  details?: string;
  action_type?:
    | 'تسجيل دخول'
    | 'تسجيل خروج'
    | 'تعديل كلمة المرور'
    | 'إنشاء رحلة'
    | 'تعديل رحلة'
    | 'بدء رحلة'
    | 'إنهاء رحلة'
    | 'قراءة عداد'
    | 'نتائج OCR'
    | 'تتبع GPS'
    | 'اعتماد رحلة'
    | 'رفض رحلة'
    | 'تسليم مركبة'
    | 'إعادة مركبة'
    | 'إدارة المستخدمين'
    | 'إدارة الأسطول والمركبات'
    | 'تعديل الإعدادات';
  description?: string;
  entity?: string;
  entity_id?: string;
  timestamp?: string;
  created_at?: string;
}

export type AuditLog = AuditLogItem;

export interface SystemSettings {
  gps_tracking_enabled: boolean; // false pending official approvals
  allow_gallery_upload: boolean;
  default_ocr_engine: 'Azure Vision';
  gps_diff_normal_threshold: number; // 5 km
  gps_diff_review_threshold: number; // 15 km
  gps_update_interval_sec: number; // 60s
  gps_update_distance_meters: number; // 500m
  maintenance_alert_km: number; // 500km
}
