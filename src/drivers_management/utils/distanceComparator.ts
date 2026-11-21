/**
 * DTMS - Distance Comparison & Audit Engine
 * 
 * Compares actual GPS distance recorded via field GPS telemetry
 * with odometer distance obtained from OCR image processing.
 * Triggers a visual alert and compliance flag if discrepancy exceeds 15 km.
 */

import { Trip } from '../types';

export interface DistanceComparisonResult {
  actualGpsDistance: number;
  ocrOdometerDistance: number;
  startOdoReading?: number;
  endOdoReading?: number;
  difference: number; // in kilometers, rounded to 1 decimal
  differencePercentage: number; // % relative to GPS
  isExceeded: boolean; // true if diff > alertThresholdKm (15 km)
  alertThresholdKm: number;
  reviewThresholdKm: number;
  status: 'normal' | 'review_needed' | 'alert';
  severity: 'safe' | 'warning' | 'critical';
  title: string;
  message: string;
  badgeLabel: string;
  badgeClass: string;
  alertBannerClass: string;
  recommendedAction: string;
  auditFlag: boolean;
}

/**
 * Core software function comparing actual GPS distance and OCR-read odometer distance.
 * Explicitly verifies if the discrepancy exceeds 15 km, generating visual alert metadata.
 *
 * @param actualGpsDistance - The distance recorded by GPS tracking points (km)
 * @param ocrOdometerDistance - The distance calculated from start/end OCR odometer readings (km)
 * @param alertThresholdKm - Discrepancy threshold for critical alert (default: 15 km)
 * @param reviewThresholdKm - Discrepancy threshold for supervisor review (default: 5 km)
 */
export function compareGpsAndOcrDistance(
  actualGpsDistance: number,
  ocrOdometerDistance: number,
  alertThresholdKm: number = 15,
  reviewThresholdKm: number = 5,
  metadata?: { startReading?: number; endReading?: number }
): DistanceComparisonResult {
  const gps = Math.max(0, Number(actualGpsDistance.toFixed(1)));
  const ocr = Math.max(0, Number(ocrOdometerDistance.toFixed(1)));
  const diff = Number(Math.abs(ocr - gps).toFixed(1));
  
  const percentage = gps > 0 ? Number(((diff / gps) * 100).toFixed(1)) : 0;
  const isExceeded = diff > alertThresholdKm;

  if (isExceeded) {
    return {
      actualGpsDistance: gps,
      ocrOdometerDistance: ocr,
      startOdoReading: metadata?.startReading,
      endOdoReading: metadata?.endReading,
      difference: diff,
      differencePercentage: percentage,
      isExceeded: true,
      alertThresholdKm,
      reviewThresholdKm,
      status: 'alert',
      severity: 'critical',
      title: `تنبيه رقابي: فارق المسافة (${diff} كم) يتجاوز الحد المسموح (15 كم)!`,
      message: `تم رصد عدم تطابق جوهري بين مسافة العداد المقروءة عبر OCR (${ocr} كم) ومسافة تتبع GPS الفعلية (${gps} كم). فارق المسافة يبلغ ${diff} كم بنسبة تباين ${percentage}%.`,
      badgeLabel: `تنبيه: فرق مرتفع (${diff} كم > ${alertThresholdKm} كم)`,
      badgeClass: 'bg-rose-600 text-white font-bold animate-pulse shadow-sm',
      alertBannerClass: 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-100 shadow-lg',
      recommendedAction: 'إلزامية التدقيق الميداني واستدعاء السائق وفحص صور العداد وكشف نقاط GPS المسجلة قبل اتخاذ قرار الاعتماد.',
      auditFlag: true,
    };
  }

  if (diff > reviewThresholdKm) {
    return {
      actualGpsDistance: gps,
      ocrOdometerDistance: ocr,
      startOdoReading: metadata?.startReading,
      endOdoReading: metadata?.endReading,
      difference: diff,
      differencePercentage: percentage,
      isExceeded: false,
      alertThresholdKm,
      reviewThresholdKm,
      status: 'review_needed',
      severity: 'warning',
      title: `ملاحظة تدقيق: فارق المسافة (${diff} كم) يحتاج مراجعة (5 - 15 كم)`,
      message: `يوجد تباين متوسط بين مسافة العداد OCR (${ocr} كم) ومسار GPS (${gps} كم). الفارق هو ${diff} كم. يوصى بمراجعة ملاحظات السائق.`,
      badgeLabel: `مراجعة مطلوبة (${diff} كم)`,
      badgeClass: 'bg-amber-500 text-white font-semibold',
      alertBannerClass: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-amber-900 dark:text-amber-100',
      recommendedAction: 'مراجعة أسباب المسارات البديلة أو الازدحام مع السائق.',
      auditFlag: false,
    };
  }

  return {
    actualGpsDistance: gps,
    ocrOdometerDistance: ocr,
    startOdoReading: metadata?.startReading,
    endOdoReading: metadata?.endReading,
    difference: diff,
    differencePercentage: percentage,
    isExceeded: false,
    alertThresholdKm,
    reviewThresholdKm,
    status: 'normal',
    severity: 'safe',
    title: 'تطابق سليم ومقبول رقابياً (فارق أقل من 5 كم)',
    message: `المسافة المقروءة عبر العداد (${ocr} كم) مطابقة تقنياً لمسافة تتبع GPS (${gps} كم) بفارق ضئيل قدره ${diff} كم فقط.`,
    badgeLabel: `مطابق وطبيعي (${diff} كم)`,
    badgeClass: 'bg-emerald-600 text-white font-medium',
    alertBannerClass: 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-emerald-900 dark:text-emerald-100',
    recommendedAction: 'الرحلة مستوفية لمعايير المطابقة وجاهزة للاعتماد الفوري.',
    auditFlag: false,
  };
}

/**
 * Compares a Trip's GPS distance and OCR odometer distance
 */
export function compareTripGpsAndOcr(
  trip: Trip,
  alertThresholdKm: number = 15
): DistanceComparisonResult {
  return compareGpsAndOcrDistance(
    trip.distance_gps || 0,
    trip.distance_odometer || 0,
    alertThresholdKm,
    5
  );
}
