/**
 * GPS Tracking, Geolocation Services, Distance Calculation (Haversine Formula),
 * and Odometer vs GPS difference evaluation.
 */

export interface GeolocationPositionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
  locationName: string;
  governorate: string;
}

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

import { compareGpsAndOcrDistance, compareTripGpsAndOcr, DistanceComparisonResult } from './distanceComparator';
import { DtmsStorage } from './storage';
export { compareGpsAndOcrDistance, compareTripGpsAndOcr, type DistanceComparisonResult };

/**
 * Checks if GPS service is enabled by management or disabled pending official approvals
 */
export function isGPSTrackingEnabled(): boolean {
  try {
    const s = DtmsStorage.getSettings();
    return Boolean(s?.gps_tracking_enabled);
  } catch {
    return false;
  }
}

/**
 * Evaluates the discrepancy between actual odometer distance and GPS distance
 */
export function evaluateDistanceDiff(
  odometerDistance: number,
  gpsDistance: number,
  normalThreshold = 5,
  reviewThreshold = 15
): { diff: number; status: 'normal' | 'review_needed' | 'alert'; label: string; color: string; isWarning: boolean } {
  // If GPS is disabled pending approvals, rely strictly on odometer reading without false warnings
  if (!isGPSTrackingEnabled()) {
    return {
      diff: 0,
      status: 'normal',
      label: 'معتمد عبر العداد (GPS معطل رسمياً)',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300',
      isWarning: false,
    };
  }

  const result = compareGpsAndOcrDistance(gpsDistance, odometerDistance, reviewThreshold, normalThreshold);
  return {
    diff: result.difference,
    status: result.status,
    label: result.badgeLabel,
    color: result.status === 'alert'
      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300'
      : result.status === 'review_needed'
      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300'
      : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300',
    isWarning: result.isExceeded,
  };
}

/**
 * Requests device GPS permission or falls back to intelligent geolocation lookup.
 * NOTE: All original code is preserved intact. When gps_tracking_enabled is false,
 * it returns safe formal metadata without prompting the device.
 */
export async function requestCurrentGPSPosition(): Promise<GeolocationPositionResult> {
  const now = new Date();
  const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

  // If GPS operation is suspended pending official approvals:
  if (!isGPSTrackingEnabled()) {
    return {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      speed: 0,
      heading: 0,
      timestamp,
      locationName: 'تتبع GPS معطل بانتظار الموافقات الرسمية (اعتماد قراءة العداد)',
      governorate: 'العراق',
    };
  }

  // --- Complete original GPS code preserved below for future reactivation ---
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('خاصية تحديد المواقع GPS غير مدعومة في هذا المتصفح أو الجهاز.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy || 10,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
          timestamp,
          locationName: 'موقع الجهاز المباشر الموثق',
          governorate: lat > 32 && lat < 34 ? 'بغداد' : lat <= 31 ? 'البصرة' : 'العراق',
        });
      },
      (err) => {
        // If permission is denied or unavailable, fail explicitly
        reject(new Error(err?.code === 1 ? 'تم رفض إذن الوصول إلى الموقع الجغرافي (GPS).' : 'فشل في الحصول على الموقع الحالي، يرجى التأكد من تفعيل الـ GPS.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
