// Terjemahan: kunci dan placeholder id/en harus sama; pesan validasi RFQ bisa diganti tanpa mengubah perilaku bawaan.
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/lib.js');
const fs = require('node:fs');
const id = require('../i18n/id.json');
const files = fs.readdirSync(__dirname + '/../i18n').filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const all = Object.fromEntries(files.map(c => [c, require('../i18n/' + c + '.json')]));

const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join();

test('i18n: keenam bahasa ada', () => {
  assert.deepEqual(files.sort(), ['en', 'es', 'fr', 'id', 'ja', 'ko']);
});

test('i18n: semua bahasa punya kunci yang sama dan tidak kosong', () => {
  for (const [c, d] of Object.entries(all)) {
    assert.deepEqual(Object.keys(d).sort(), Object.keys(id).sort(), c);
    for (const k of Object.keys(id)) assert.ok(String(d[k]).trim(), c + ' kosong: ' + k);
  }
});

test('i18n: placeholder {x} sama di semua bahasa', () => {
  for (const [c, d] of Object.entries(all)) for (const k of Object.keys(id)) assert.equal(ph(d[k]), ph(id[k]), c + ': ' + k);
});

test('i18n: tagline hero muat di batas typewriter (90 huruf)', () => {
  for (const [c, d] of Object.entries(all)) assert.ok([...d['hero.tagline']].length <= 90, c);
});

test('validateRfq: pesan bisa diganti, bawaan tetap Indonesia', () => {
  assert.equal(L.validateRfq({}).company_name, 'Isi nama perusahaan.');
  assert.equal(L.validateRfq({}, { company_name: 'Enter the company name.' }).company_name, 'Enter the company name.');
  assert.equal(L.validateRfq({ quantity_kg: 0 }, { qty_min: 'min 1 kg' }).quantity_kg, 'min 1 kg');
});
