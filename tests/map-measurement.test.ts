import assert from 'node:assert/strict';
import test from 'node:test';
import { formatArea, formatDistance, measureLineMeters, measurePolygonAreaSquareMeters } from '../lib/map-measurement';

test('measures a multi-segment line with geodesic distances', () => {
  const length = measureLineMeters([{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }, { lat: 0.001, lng: 0.001 }]);
  assert.ok(length > 220 && length < 223);
  assert.equal(formatDistance(length), '222 m');
});

test('measures polygon area independent of drawing direction', () => {
  const square = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }, { lat: 0.001, lng: 0.001 }, { lat: 0.001, lng: 0 }];
  const area = measurePolygonAreaSquareMeters(square);
  assert.ok(area > 12_300 && area < 12_400);
  assert.ok(Math.abs(measurePolygonAreaSquareMeters([...square].reverse()) - area) < 0.00001);
  assert.equal(formatArea(area), '1.24 ha');
  assert.equal(measurePolygonAreaSquareMeters(square.slice(0, 2)), 0);
});

test('empty, singleton and repeated vertices have zero distance or area', () => {
  const point = { lat: 21.3, lng: 103.9 };
  assert.equal(measureLineMeters([]), 0);
  assert.equal(measureLineMeters([point]), 0);
  assert.equal(measureLineMeters([point, point, point]), 0);
  assert.equal(measurePolygonAreaSquareMeters([point, point, point]), 0);
  assert.equal(measurePolygonAreaSquareMeters([{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 0, lng: 2 }]), 0);
});

test('independent equatorial benchmark, reverse line and short date-line crossing are finite', () => {
  // One degree at the equator is approximately 111.195 km on the mean sphere.
  const endpoints = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }];
  const distance = measureLineMeters(endpoints);
  assert.ok(Math.abs(distance - 111_195.08) < 0.1);
  assert.equal(measureLineMeters([...endpoints].reverse()), distance);
  const shortCrossing = measureLineMeters([{ lat: 0, lng: 179.999 }, { lat: 0, lng: -179.999 }]);
  assert.ok(shortCrossing > 222 && shortCrossing < 223);
  assert.ok(Number.isFinite(measureLineMeters([{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }])));
});

test('polygon closure and duplicated adjacent vertices do not change an ordinary local area', () => {
  const ring = [{ lat: 21, lng: 104 }, { lat: 21, lng: 104.001 }, { lat: 21.001, lng: 104.001 }, { lat: 21.001, lng: 104 }];
  const area = measurePolygonAreaSquareMeters(ring);
  assert.ok(area > 11_500 && area < 11_600);
  assert.ok(Math.abs(measurePolygonAreaSquareMeters([...ring, ring[0]]) - area) < 0.00001);
  assert.ok(Math.abs(measurePolygonAreaSquareMeters([ring[0], ring[1], ring[1], ...ring.slice(2)]) - area) < 0.00001);
  assert.ok(Math.abs(measurePolygonAreaSquareMeters([...ring].reverse()) - area) < 0.00001);
});

test('distance and area display switches units at exact thresholds', () => {
  assert.equal(formatDistance(0), '0 m');
  assert.equal(formatDistance(999), '999 m');
  assert.equal(formatDistance(1000), '1.00 km');
  assert.equal(formatArea(0), '0 m²');
  assert.equal(formatArea(9999), '9999 m²');
  assert.equal(formatArea(10000), '1.00 ha');
});
