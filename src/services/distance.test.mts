import assert from 'node:assert/strict';
import test from 'node:test';

import { haversineDistanceKm, sortHospitals } from './distance.ts';
import type { Hospital } from '../types/hospital.ts';

const sampleHospitals: Hospital[] = [
  { id: 'far', name: 'Far Hospital', lat: 0, lng: 1, phone: '123', address: 'Far address' },
  { id: 'near', name: 'Near Hospital', lat: 0, lng: 0.1, phone: '', address: 'Near address' },
  { id: 'unknown', name: 'Unknown Hospital', lat: null, lng: null, phone: '', address: 'Unknown address' },
];

test('haversine distance returns the known one degree equatorial distance', () => {
  assert.ok(Math.abs(haversineDistanceKm(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  ) - 111.195) < 0.01);
});

test('sorts nearest first and keeps hospitals without phone numbers', () => {
  const sorted = sortHospitals(sampleHospitals, { latitude: 0, longitude: 0 });
  assert.deepEqual(sorted.map((hospital) => hospital.id), ['near', 'far', 'unknown']);
  assert.equal(sorted[0]?.phone, '');
  assert.equal(sorted[0]?.distanceKm !== null, true);
});

test('sorts alphabetically when location is unavailable', () => {
  const sorted = sortHospitals(sampleHospitals);
  assert.deepEqual(sorted.map((hospital) => hospital.name), [
    'Far Hospital',
    'Near Hospital',
    'Unknown Hospital',
  ]);
});
