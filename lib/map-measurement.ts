import type { Position } from '@/lib/types';

const EARTH_RADIUS_METERS = 6_371_008.8;
const radians = (degrees: number) => degrees * Math.PI / 180;

export function measureLineMeters(points: Position[]): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const latitudeDelta = radians(end.lat - start.lat);
    const longitudeDelta = radians(end.lng - start.lng);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(start.lat)) * Math.cos(radians(end.lat)) * Math.sin(longitudeDelta / 2) ** 2;
    distance += 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
  }
  return distance;
}

export function measurePolygonAreaSquareMeters(points: Position[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    area += radians(end.lng - start.lng)
      * (2 + Math.sin(radians(start.lat)) + Math.sin(radians(end.lat)));
  }
  return Math.abs(area) * EARTH_RADIUS_METERS ** 2 / 2;
}

export function formatDistance(meters: number): string {
  return meters >= 1_000 ? `${(meters / 1_000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

export function formatArea(squareMeters: number): string {
  return squareMeters >= 10_000
    ? `${(squareMeters / 10_000).toFixed(2)} ha`
    : `${Math.round(squareMeters)} m²`;
}
