import { Trip, TripTrackingPoint } from '../types';
import { calculateHaversineDistance } from './gpsTracker';

export interface RouteTelemetryPoint extends TripTrackingPoint {
  index: number;
  timeOffsetSeconds: number;
  cumulativeDistanceKm: number;
  statusTag?: 'start' | 'transit' | 'congestion' | 'highway' | 'destination';
}

/**
 * Adds display metrics to recorded GPS points without inventing route evidence.
 */
export function generateSixtySecondTelemetry(
  _trip: Trip,
  existingPoints: TripTrackingPoint[] = []
): RouteTelemetryPoint[] {
  let cumulativeDistanceKm = 0;

  return existingPoints.map((point, index) => {
    if (index > 0) {
      const previous = existingPoints[index - 1];
      cumulativeDistanceKm += calculateHaversineDistance(
        previous.latitude,
        previous.longitude,
        point.latitude,
        point.longitude
      );
    }

    return {
      ...point,
      index: index + 1,
      timeOffsetSeconds: index * 60,
      cumulativeDistanceKm: Number(cumulativeDistanceKm.toFixed(2)),
      statusTag: index === 0
        ? 'start'
        : index === existingPoints.length - 1
          ? 'destination'
          : 'transit',
    };
  });
}
