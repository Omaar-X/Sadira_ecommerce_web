import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash, randomUUID, webcrypto } from 'node:crypto';
import ts from 'typescript';
import { catalogFixture } from './apps-script-simulator.mjs';
const require = createRequire(import.meta.url);
let checks = 0;
async function test(name, fn) { await fn(); checks++; console.log('PASS', name); }
const hash = value => createHash('sha256').update(value).digest('hex');
function fresh() {
  const f = catalogFixture();
  f.ctx.Utilities.formatDate = (_d, _z, format) => format === 'yyyyMMdd' ? '20261010' : '2026-10-10 10:00:00';
  const product = JSON.parse(f.rows('Catalog')[0].product_json);
  const item = { productId: product.id, productName: product.name, productSlug: product.slug, category: product.category, image: product.images[0], size: product.sizes[0] || null, color: product.colors[0] || null, design: product.designs[0]?.label || null, quantity: 1, unitPrice: product.salePrice ?? product.price, lineTotal: product.salePrice ?? product.price };
  const body = { requestId: randomUUID(), accessHash: hash('private-code'), customer: { name: 'Test Customer', phone: '+8801700000000', alternativePhone: null, email: null }, delivery: { division: 'Dhaka', district: 'Dhaka', area: 'Test area', address: 'Test address', postalCode: null, deliveryArea: 'inside-dhaka' }, items: [item], subtotal: item.lineTotal, deliveryCharge: 80, discount: 0, total: item.lineTotal + 80, paymentMethod: 'cod', note: null };
  return { ...f, product, item, body };
}
const readVariants = f => f.ctx.adminVariants_({ action: 'adminGetVariants', productId: f.product.id }).data;
function saveVariants(f, variants, revision = readVariants(f).revision) { return f.ctx.adminVariants_({ action: 'adminSaveVariants', productId: f.product.id, variants, expectedRevision: revision, reason: 'Physical stock count' }); }
const v = (f, stock, active = true) => ({ size: f.item.size, color: f.item.color, design: f.item.design, stock, active });
await test('invalid inside-Dhaka claims rejected in Apps Script', () => {
  const f = fresh();
  assert.equal(f.ctx.validatePayload_(f.body), null);
  for (const [division, district] of [['Dhaka', 'Gazipur'], ['Chattogram', 'Dhaka'], ['Dhaka', 'Narayanganj']]) assert.equal(f.ctx.validatePayload_({ ...f.body, delivery: { ...f.body.delivery, division, district } }), 'delivery.deliveryArea');
  assert.equal(f.ctx.validatePayload_({ ...f.body, delivery: { ...f.body.delivery, district: 'ঢাকা' } }), null);
});
await test('variants set real counts, sum total and audit changes', () => {
  const f = fresh(); assert.equal(saveVariants(f, [v(f, 3)]).success, true);
  const p = f.rows('Products').find(r => r.product_id === f.product.id);
  assert.equal(p.stock, 3); assert.equal(p.track_stock, true);
  assert.equal(f.rows('ProductVariants').length, 1);
  assert.equal(f.rows('InventoryTransactions').some(r => r.type === 'VARIANT_ADJUSTMENT'), true);
});
await test('missing, inactive and insufficient variants rejected without writes', () => {
  const f = fresh(); assert.equal(saveVariants(f, [v(f, 1, false)]).success, true);
  assert.equal(f.ctx.createOrder_(f.body).code, 'VARIANT_UNAVAILABLE');
  assert.equal(saveVariants(f, [v(f, 1)]).success, true);
  const size = f.product.sizes.find(s => s !== f.item.size);
  if (size) assert.equal(f.ctx.createOrder_({ ...f.body, items: [{ ...f.item, size }] }).code, 'VARIANT_UNAVAILABLE');
  const qty = 2; assert.equal(f.ctx.createOrder_({ ...f.body, items: [{ ...f.item, quantity: qty, lineTotal: f.item.unitPrice * qty }] }).success, false);
  assert.equal(f.rows('Orders').length, 1);
});
await test('variant deduction, original receipt recovery, and no duplicate writes', () => {
  const f = fresh(); assert.equal(saveVariants(f, [v(f, 3)]).success, true);
  const first = f.ctx.createOrder_(f.body); assert.equal(first.success, true);
  const retry = f.ctx.createOrder_(f.body); assert.equal(retry.orderId, first.orderId);
  assert.equal(f.rows('ProductVariants')[0].stock, 2);
  assert.equal(f.rows('InventoryTransactions').filter(r => r.type === 'VARIANT_SALE').length, 1);
  const recovered = f.ctx.recoverOrder_({ requestId: f.body.requestId, accessHash: f.body.accessHash });
  assert.equal(recovered.order.total, f.body.total); assert.equal(recovered.order.items[0].unitPrice, f.item.unitPrice);
  assert.equal(f.ctx.createOrder_({ ...f.body, accessHash: hash('wrong-code') }).code, 'REQUEST_CONFLICT');
  assert.equal(f.ctx.recoverOrder_({ requestId: f.body.requestId, accessHash: hash('wrong-code') }).success, false);
});
await test('status lookup uses possession token, returns no PII and current state', () => {
  const f = fresh(); const result = f.ctx.createOrder_(f.body);
  assert.equal(f.ctx.readOrderStatus_({ orderId: result.orderId, accessHash: hash('wrong') }).code, 'NOT_FOUND');
  assert.equal(f.ctx.updateOrderStatus(result.orderId, 'Confirmed', '').success, true);
  const status = f.ctx.readOrderStatus_({ orderId: result.orderId, accessHash: f.body.accessHash });
  assert.equal(status.data.status, 'Confirmed');
  assert.deepEqual(Object.keys(status.data).sort(), ['createdAt', 'orderId', 'paymentStatus', 'status', 'total', 'updatedAt'].sort());
  assert.equal(JSON.stringify(status).includes(f.body.customer.phone), false);
});
await test('cancellation restores both total and exact variant once', () => {
  const f = fresh(); saveVariants(f, [v(f, 3)]);
  const order = f.ctx.createOrder_(f.body); assert.equal(order.success, true);
  assert.equal(f.ctx.cancelOrder(order.orderId, 'Customer request').success, true);
  assert.equal(f.rows('ProductVariants')[0].stock, 3);
  assert.equal(f.rows('Products').find(r => r.product_id === f.product.id).stock, 3);
  assert.equal(f.ctx.cancelOrder(order.orderId, 'Retry cancellation').success, true);
  assert.equal(f.rows('InventoryTransactions').filter(r => r.type === 'VARIANT_RESTOCK').length, 1);
});
await test('variant edits reject stale revision and legacy total-stock actions', () => {
  const f = fresh(), revision = readVariants(f).revision;
  saveVariants(f, [v(f, 3)], revision);
  assert.equal(saveVariants(f, [v(f, 99)], revision).code, 'INVENTORY_CHANGED');
  const p = f.rows('Products').find(r => r.product_id === f.product.id);
  assert.equal(f.ctx.adminAction_({ action: 'adminAdjustStock', productId: f.product.id, expectedStock: p.stock, expectedTracking: true, expectedStatus: 'active', stock: 99, reason: 'Test change' }).code, 'VARIANT_MANAGED');
});
await test('first-time variant conversion blocked by outstanding orders', () => {
  const f = fresh(); assert.equal(f.ctx.createOrder_(f.body).success, true);
  assert.equal(saveVariants(f, [v(f, 3)]).code, 'VARIANT_HISTORY');
  assert.equal(f.rows('ProductVariants').length, 0);
});
for (const table of ['Orders', 'OrderItems', 'Products', 'ProductVariants', 'InventoryTransactions', 'Customers']) await test('order write-then-fail rollback: ' + table, () => {
  const f = fresh(); saveVariants(f, [v(f, 3)]);
  const before = JSON.stringify(['Orders', 'OrderItems', 'Products', 'ProductVariants', 'InventoryTransactions', 'Customers'].map(t => f.rows(t)));
  f.fail(table); assert.throws(() => f.ctx.createOrder_(f.body));
  assert.equal(JSON.stringify(['Orders', 'OrderItems', 'Products', 'ProductVariants', 'InventoryTransactions', 'Customers'].map(t => f.rows(t))), before);
  assert.equal(f.props.getProperty('ORDER_FENCE_' + f.body.requestId), null);
});
for (const table of ['ProductVariants', 'Products', 'InventoryTransactions']) await test('variant-save rollback: ' + table, () => {
  const f = fresh(); const before = JSON.stringify([f.rows('Products'), f.rows('ProductVariants'), f.rows('InventoryTransactions')]);
  f.fail(table); assert.equal(saveVariants(f, [v(f, 3)]).success, false);
  assert.equal(JSON.stringify([f.rows('Products'), f.rows('ProductVariants'), f.rows('InventoryTransactions')]), before);
});
await test('partial order fences block retry/recovery and mark health', () => {
  const f = fresh(); f.props.setProperty('ORDER_FENCE_' + f.body.requestId, 'interrupted');
  assert.equal(f.ctx.createOrder_(f.body).code, 'ORDER_RECOVERY_REQUIRED');
  assert.equal(f.ctx.recoverOrder_({ requestId: f.body.requestId, accessHash: f.body.accessHash }).code, 'BUSY');
  assert.equal(f.ctx.backendHealth_().data.ready, false);
});
await test('shared order quota allows saved retries but blocks new attempts', () => {
  const f = fresh();
  for (let i = 0; i < 5; i++) assert.equal(f.ctx.createOrder_({ ...f.body, requestId: randomUUID() }).success, true);
  assert.equal(f.ctx.createOrder_(f.body).code, 'RATE_LIMITED');
  const saved = f.rows('Orders').find(r => r.access_hash === f.body.accessHash);
  assert.equal(f.ctx.createOrder_({ ...f.body, requestId: saved.request_id }).success, true);
  const buckets = f.props.getProperty('SADIRA_RATE_LIMITS'); assert.equal(buckets.includes(f.body.customer.phone), false);
});
await test('shared login limits persist independently of server process', () => {
  const f = fresh(); for (let i = 0; i < 10; i++) assert.equal(f.ctx.sharedLoginLimit_().allowed, true);
  assert.equal(f.ctx.sharedLoginLimit_().allowed, false);
});
await test('new backend actions reject unauthorized calls', () => {
  const f = fresh(); f.props.setProperty('APPS_SCRIPT_SECRET', 'secret-with-at-least-16-characters');
  for (const action of ['orderStatus', 'recoverOrder', 'adminSaveVariants', 'adminGetVariants', 'adminBackendHealth', 'adminLoginLimit']) assert.equal(JSON.parse(f.ctx.doPost({ postData: { contents: JSON.stringify({ action }) } }).text).success, false);
});
await test('backup opt-in and success/error health markers', () => {
  const f = fresh(); assert.throws(() => f.ctx.backupSadiraSpreadsheet(), /SADIRA_BACKUP_FOLDER_ID/);
  f.props.setProperty('SADIRA_BACKUP_FOLDER_ID', 'private-folder');
  let copies = 0; const ss = f.ctx.SpreadsheetApp.getActiveSpreadsheet(); ss.getId = () => 'source-sheet';
  f.ctx.DriveApp.getFileById = id => { assert.equal(id, 'source-sheet'); return { makeCopy(name) { assert.match(name, /Sadira backup/); copies++; } }; };
  f.ctx.DriveApp.getFolderById = id => { assert.equal(id, 'private-folder'); return {}; };
  f.ctx.backupSadiraSpreadsheet(); assert.equal(copies, 1); assert.ok(f.ctx.backendHealth_().data.lastBackupAt);
  f.ctx.DriveApp.getFileById = () => { throw Error('Drive unavailable'); };
  assert.throws(() => f.ctx.backupSadiraSpreadsheet()); assert.ok(f.ctx.backendHealth_().data.lastBackupError);
});
function loadTs(file, overrides = {}, extra = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, Request, Response, TextDecoder, TextEncoder, Uint8Array, Buffer, URL, Date, console, crypto: webcrypto, process, ...extra, require: name => name === 'server-only' ? {} : overrides[name] ?? require(name) });
  return exports;
}
await test('bounded JSON enforces actual bytes without trusted Content-Length', async () => {
  const { readJsonBody, RequestBodyError } = loadTs('lib/requestBody.ts');
  const input = value => new Request('http://localhost/api', { method: 'POST', body: value });
  await assert.rejects(readJsonBody(input('"' + 'ঢ'.repeat(100) + '"'), 100), e => e instanceof RequestBodyError && e.status === 413);
  await assert.rejects(readJsonBody(input('invalid'), 100), e => e.status === 400);
  assert.equal((await readJsonBody(input('{"ok":true}'), 100)).ok, true);
});
await test('retry ID survives reload without persisting customer data', async () => {
  const values = new Map(), sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const first = loadTs('lib/orderAttempt.ts', {}, { sessionStorage });
  const body = { customer: { name: 'Customer', phone: '01700000000', address: 'Private address' } };
  const id = await first.orderAttemptId(body);
  const reload = loadTs('lib/orderAttempt.ts', {}, { sessionStorage });
  assert.equal(await reload.orderAttemptId(body), id);
  assert.equal(JSON.stringify([...values.values()]).includes('Private address'), false);
  assert.notEqual(await reload.orderAttemptId({ ...body, changed: true }), id);
  reload.clearOrderAttempt(); assert.equal(values.size, 0);
});
await test('variant display and cart warnings respect exact options', () => {
  const { resolveStock, getStockWarning } = loadTs('lib/inventory.ts');
  const item = { productId: 'P', stock: 5, size: '54', color: 'Black', design: null, quantity: 2 };
  const view = { products: new Map([['P', { productId: 'P', trackStock: true, stock: 5, status: 'active', variants: [{ size: '54', color: 'Black', design: null, stock: 1, active: true }, { size: '56', color: 'Black', design: null, stock: 4, active: true }] }]]) };
  const resolved = resolveStock('P', 5, view, item); assert.equal(resolved.stock, 1); assert.equal(resolved.variant, true);
  assert.match(getStockWarning(item, [item, { ...item, size: '56', quantity: 4 }], resolved), /Only 1/);
  assert.equal(resolveStock('P', 5, view, { ...item, size: '52' }).unavailable, true);
});
await test('delivery does not collect COD; explicit collection is audited and idempotent', () => {
  const f = fresh(), order = f.ctx.createOrder_(f.body);
  const payment = { orderId: order.orderId, amount: f.body.total, note: 'Received from courier' };
  assert.equal(f.ctx.recordCOD_(payment).success, false);
  for (const state of ['Confirmed', 'Processing', 'Shipped', 'Delivered']) assert.equal(f.ctx.updateOrderStatus(order.orderId, state, '').success, true);
  assert.equal(f.rows('Orders').find(r => r.order_id === order.orderId).payment_status, 'Pending');
  assert.equal(f.ctx.recordCOD_({ ...payment, amount: 1 }).success, false);
  assert.equal(f.ctx.recordCOD_(payment).success, true); assert.equal(f.ctx.recordCOD_(payment).success, true);
  assert.equal(f.rows('PaymentTransactions').length, 1);
  assert.equal(f.ctx.adminAction_({ action: 'adminGetDashboard' }).data.metrics['Collected COD'], f.body.total);
  assert.equal(f.ctx.readOrderStatus_({ orderId: order.orderId, accessHash: f.body.accessHash }).data.paymentStatus, 'Paid');
});
for (const table of ['PaymentTransactions', 'Orders']) await test('COD write-then-fail rollback: ' + table, () => {
  const f = fresh(), order = f.ctx.createOrder_(f.body);
  for (const state of ['Confirmed', 'Processing', 'Shipped', 'Delivered']) f.ctx.updateOrderStatus(order.orderId, state, '');
  f.fail(table); assert.equal(f.ctx.recordCOD_({ orderId: order.orderId, amount: f.body.total, note: 'Received from courier' }).success, false);
  assert.equal(f.rows('PaymentTransactions').length, 0);
  assert.equal(f.rows('Orders').find(r => r.order_id === order.orderId).payment_status, 'Pending');
});
await test('duplicate keys and total/variant mismatches fail closed', () => {
  const f = fresh(); assert.equal(saveVariants(f, [v(f, 1), v(f, 1)]).success, false);
  saveVariants(f, [v(f, 3)]);
  f.add('ProductVariants', [{ ...f.rows('ProductVariants')[0], variant_id: randomUUID() }]);
  assert.equal(f.ctx.createOrder_(f.body).success, false);
});
console.log(`${checks} backend hardening checks passed.`);
