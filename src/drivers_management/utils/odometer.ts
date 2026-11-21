import { OdometerUnit } from '../types';

export const MILES_TO_KM = 1.609344;

export function normalizeOdometerUnit(unit?: string): OdometerUnit {
  return unit === 'mile' ? 'mile' : 'km';
}

export function odometerToKm(reading: number, unit?: string): number {
  const value = Number(reading) || 0;
  return normalizeOdometerUnit(unit) === 'mile' ? value * MILES_TO_KM : value;
}

export function odometerFromKm(readingKm: number, unit?: string): number {
  const value = Number(readingKm) || 0;
  return normalizeOdometerUnit(unit) === 'mile' ? value / MILES_TO_KM : value;
}

export function roundOdometerReading(value: number): number {
  return Math.round((Number(value) || 0) * 10) / 10;
}

export function odometerUnitLabel(unit: OdometerUnit, language: 'ar' | 'en'): string {
  if (unit === 'mile') return language === 'ar' ? 'ميل' : 'mi';
  return language === 'ar' ? 'كم' : 'km';
}
