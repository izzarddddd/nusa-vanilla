// Jalankan: npm test  (memakai test runner bawaan Node, tanpa dependency)
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/lib.js');

const valid = { company_name: 'Becker Gewürze GmbH', contact_name: 'Hans Becker', email: 'hans@becker.de', phone: '+49 40 123456', country: 'Jerman', quantity_kg: 50, notes: '' };

test('estimasi: 50 kg x $200 = $10.000', () => {
  assert.equal(L.estimate(50, 200), 10000);
  assert.deepEqual(L.validateRfq(valid), {});
});

test('estimasi memakai satu rumus dan membulatkan 2 desimal', () => {
  assert.equal(L.estimate(2.5, 115.55), 288.88);
  assert.equal(L.estimate(3, 0.1), 0.3);
});

test('RFQ menolak kuantitas 0, negatif, kosong, dan desimal > 2 tempat', () => {
  for (const q of [0, -5, '', null, 'abc']) {
    assert.equal(L.validateRfq({ ...valid, quantity_kg: q }).quantity_kg, 'Kuantitas pemesanan minimal 1 kg.', String(q));
  }
  assert.equal(L.validateRfq({ ...valid, quantity_kg: 1.234 }).quantity_kg, 'Maksimal 2 angka desimal.');
  assert.equal(L.validateRfq({ ...valid, quantity_kg: 1.25 }).quantity_kg, undefined);
});

test('RFQ menolak email tidak valid dan field wajib kosong', () => {
  assert.ok(L.validateRfq({ ...valid, email: 'salah' }).email);
  const e = L.validateRfq({ quantity_kg: 5 });
  for (const k of ['company_name', 'contact_name', 'email', 'phone', 'country']) assert.ok(e[k], k);
});

test('RFQ menolak catatan > 1000 karakter dan karakter kontrol', () => {
  assert.ok(L.validateRfq({ ...valid, notes: 'x'.repeat(1001) }).notes);
  assert.ok(L.validateRfq({ ...valid, notes: 'halo\u0000' }).notes);
});

test('admin: harga negatif atau 0 ditolak dengan pesan yang ditentukan', () => {
  const p = { name: 'Tahitian Extraction', grade: 'B', price_per_kg: -50, stock_kg: 10, moisture_percentage: 22, vanillin_percentage: 1.5, length_cm: 14 };
  assert.equal(L.validateProduct(p).price_per_kg, 'Harga jual harus lebih dari 0');
  assert.equal(L.validateProduct({ ...p, price_per_kg: 0 }).price_per_kg, 'Harga jual harus lebih dari 0');
  assert.deepEqual(L.validateProduct({ ...p, price_per_kg: 195 }), {});
});

test('admin: stok negatif dan kadar di luar 0-100 ditolak', () => {
  const p = { name: 'X', grade: 'A', price_per_kg: 10, stock_kg: -1, moisture_percentage: 101, vanillin_percentage: -2, length_cm: 10 };
  const e = L.validateProduct(p);
  assert.ok(e.stock_kg && e.moisture_percentage && e.vanillin_percentage);
});

test('alur status RFQ', () => {
  assert.deepEqual(L.STATUS_FLOW.PENDING, ['QUOTED', 'CANCELLED']);
  assert.deepEqual(L.STATUS_FLOW.CANCELLED, []);
});

test('stok menipis: di bawah ambang dan bukan OUT_OF_STOCK', () => {
  assert.equal(L.isLowStock({ stock_kg: 18, status: 'AVAILABLE' }), true);
  assert.equal(L.isLowStock({ stock_kg: 25, status: 'AVAILABLE' }), false);
  assert.equal(L.isLowStock({ stock_kg: 0, status: 'OUT_OF_STOCK' }), false);
});
