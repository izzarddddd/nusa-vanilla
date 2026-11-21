// Terjemahan: kunci dan placeholder id/en harus sama; pesan validasi RFQ bisa diganti tanpa mengubah perilaku bawaan.
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/lib.js');
const id = require('../i18n/id.json');
const en = require('../i18n/en.json');

const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join();

test('i18n: id dan en punya kunci yang sama dan tidak kosong', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(id).sort());
  for (const k of Object.keys(id)) { assert.ok(id[k].trim(), 'id kosong: ' + k); assert.ok(en[k].trim(), 'en kosong: ' + k); }
});

test('i18n: placeholder {x} sama di semua bahasa', () => {
  for (const k of Object.keys(id)) assert.equal(ph(en[k]), ph(id[k]), k);
});

test('validateRfq: pesan bisa diganti, bawaan tetap Indonesia', () => {
  assert.equal(L.validateRfq({}).company_name, 'Isi nama perusahaan.');
  assert.equal(L.validateRfq({}, { company_name: 'Enter the company name.' }).company_name, 'Enter the company name.');
  assert.equal(L.validateRfq({ quantity_kg: 0 }, { qty_min: 'min 1 kg' }).quantity_kg, 'min 1 kg');
});
