import test from 'node:test';
import assert from 'node:assert/strict';
import {readRecordMeasurement,parseDraftMeasurement,publicMeasurement} from '../lib/record-measurement';
import {freshDraft} from '../components/draft-lifecycle';
const measurement={type:'line' as const,points:[{lat:21,lng:104},{lat:21.001,lng:104.001}]};
test('public geometry is a copied whitelist and never includes contact fields',()=>{
 const record={lat:21,lng:104,measurement,reporterName:'PRIVATE',reporterPhone:'PRIVATE'};
 assert.deepEqual(publicMeasurement(record),{measurement});
 const projected=publicMeasurement(record).measurement!;
 assert.notEqual(projected,measurement);assert.notEqual(projected.points[0],measurement.points[0]);
 assert.equal(JSON.stringify(projected).includes('PRIVATE'),false);
 assert.deepEqual(publicMeasurement({lat:21,lng:104}),{});
 assert.equal(readRecordMeasurement({...measurement,reporterPhone:'PRIVATE'}),undefined);
});
test('drafts retain explicit measurement but location reset clears it',()=>{
 const values={lat:'21',lng:'104',communeCode:'04000',measurementSelectionKey:'explicit-selection-1',measurement:JSON.stringify(measurement)};
 assert.deepEqual(parseDraftMeasurement(freshDraft(values).values.measurement),measurement);
 assert.equal(freshDraft(values,Date.now(),true).values.measurement,'');
 assert.equal(freshDraft(values,Date.now(),true).values.measurementSelectionKey,'explicit-selection-1');
 assert.equal(parseDraftMeasurement('{bad'),undefined);
 assert.equal(parseDraftMeasurement('a'.repeat(20001)),undefined);
});
