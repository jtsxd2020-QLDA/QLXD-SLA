import type { Position, RecordMeasurement } from './types';
import { measureLineMeters, measurePolygonAreaSquareMeters } from './map-measurement';

export const MAX_MEASUREMENT_POINTS = 200;
export function readRecordMeasurement(value: unknown): RecordMeasurement | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some(key => !['type', 'points'].includes(key))) return undefined;
  if (candidate.type !== 'line' && candidate.type !== 'area') return undefined;
  if (!Array.isArray(candidate.points) || candidate.points.length < (candidate.type === 'line' ? 2 : 3) || candidate.points.length > MAX_MEASUREMENT_POINTS) return undefined;
  const points: Position[] = [];
  for (const value of candidate.points) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const point = value as Record<string, unknown>;
    if (Object.keys(point).some(key => !['lat', 'lng'].includes(key))) return undefined;
    if (typeof point.lat !== 'number' || !Number.isFinite(point.lat) || Math.abs(point.lat) > 90 || typeof point.lng !== 'number' || !Number.isFinite(point.lng) || Math.abs(point.lng) > 180) return undefined;
    const position = { lat: point.lat, lng: point.lng };
    points.push(position);
  }
  const magnitude = candidate.type === 'line' ? measureLineMeters(points) : measurePolygonAreaSquareMeters(points);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return undefined;
  return { type: candidate.type, points };
}
export function parseDraftMeasurement(serialized?: string): RecordMeasurement | undefined {
  if (!serialized || serialized.length > 20_000) return undefined;
  try { return readRecordMeasurement(JSON.parse(serialized)); } catch { return undefined; }
}
export function publicMeasurement(record: Position & { measurement?: RecordMeasurement }): {measurement?: RecordMeasurement} {
  const measurement = readRecordMeasurement(record.measurement);
  return measurement ? { measurement } : {};
}
