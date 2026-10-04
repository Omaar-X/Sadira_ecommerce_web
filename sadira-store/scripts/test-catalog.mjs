import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { catalogFixture } from './apps-script-simulator.mjs';
const base = JSON.parse(fs.readFileSync('data/products.generated.json', 'utf8'))[0];
let checks = 0;
function test(name, run) { run(); checks++; console.log('PASS', name); }
function upload(f) { const bytes = fs.readFileSync('public' + base.images[0]); return f.ctx.uploadCatalogImage_({ mime: 'image/jpeg', data: bytes.toString('base64'), uploadKey: randomUUID() }); }
function fresh(f, overrides = {}) { const photo = upload(f); assert.equal(photo.success, true); return { ...base, id: 'SAD-' + randomUUID().toUpperCase(), slug: 'test-' + randomUUID(), images: [photo.image], designs: [], detailsSource: null, ...overrides }; }
function save(f, product, create = true, expectedRevision = '') { return f.ctx.saveCatalogProduct_({ product, create, expectedRevision }); }
test('migration preserves existing edits and live stock', () => {
 const f = catalogFixture(); const row = f.rows('Catalog')[0]; const product = JSON.parse(row.product_json); product.price = 3000;
 assert.equal(save(f, product, false, row.revision).success, true); const count = f.rows('Catalog').length; f.ctx.setupCatalog();
 assert.equal(f.rows('Catalog').length, count); assert.equal(JSON.parse(f.rows('Catalog')[0].product_json).price, 3000); assert.equal(f.rows('Products').find(p => p.product_id === 'P').stock, 10);
});
test('upload checks magic bytes, deduplicates retries and serves only registered images', () => {
 const f = catalogFixture(); const bytes = fs.readFileSync('public' + base.images[0]); const body = { mime: 'image/jpeg', data: bytes.toString('base64'), uploadKey: randomUUID() };
 const first = f.ctx.uploadCatalogImage_(body); const repeat = f.ctx.uploadCatalogImage_(body); assert.equal(first.image, repeat.image); assert.equal(f.files.size, 1);
 const id = first.image.split('/').at(-1); const image = f.ctx.readCatalogImage_({ fileId: id }); assert.equal(image.data, body.data);
 assert.equal(f.ctx.readCatalogImage_({ fileId: 'arbitrary-drive-file' }).success, false);
 assert.equal(f.ctx.uploadCatalogImage_({ ...body, uploadKey: randomUUID(), data: Buffer.from('<svg/>').toString('base64') }).success, false);
 assert.equal(f.ctx.uploadCatalogImage_({ ...body, uploadKey: randomUUID(), data: Buffer.alloc(1048577).toString('base64') }).success, false);
});
test('create, update, stale revision, duplicate slug and draft visibility', () => {
 const f = catalogFixture(); const product = fresh(f, { price: 1200, stock: 8 }); const result = save(f, product); assert.equal(result.success, true);
 assert.equal(f.rows('Products').find(p => p.product_id === product.id).stock, 8);
 const edited = { ...product, price: 1500, description: 'New details', stock: 999, status: 'draft' };
 const updated = save(f, edited, false, result.revision); assert.equal(updated.success, true); assert.equal(f.rows('Products').find(p => p.product_id === product.id).stock, 8);
 assert.equal(f.rows('Products').find(p => p.product_id === product.id).status, 'inactive');
 assert.equal(save(f, product, false, result.revision).code, 'CATALOG_CHANGED');
 assert.equal(save(f, fresh(f, { slug: product.slug })).code, 'DUPLICATE_SLUG');
 assert.equal(save(f, product).code, 'DUPLICATE_PRODUCT');
 const entry = f.ctx.readCatalog_().products.find(p => p.product.id === product.id); assert.equal(entry.product.description, 'New details'); assert.equal(entry.product.stock, 8);
});
test('invalid prices, image references and formula text', () => {
 const f = catalogFixture(); const product = fresh(f);
 assert.equal(save(f, { ...product, salePrice: product.price + 1 }).success, false);
 assert.equal(save(f, { ...product, images: ['/api/catalog/images/unregistered-file'] }).code, 'INVALID_IMAGE');
 assert.equal(save(f, { ...product, images: [base.images[0]] }).code, 'INVALID_IMAGE');
 assert.equal(save(f, { ...product, name: '=IMPORTXML("example")' }).success, true);
 assert.equal(f.rows('Products').find(p => p.product_id === product.id).product_name, '=IMPORTXML("example")');
});
for (const table of ['Catalog', 'Products']) test('failed ' + table + ' write rolls back both tables', () => {
 const f = catalogFixture(); const product = fresh(f); const counts = [f.rows('Catalog').length, f.rows('Products').length]; f.fail(table);
 assert.equal(save(f, product).success, false); assert.deepEqual([f.rows('Catalog').length, f.rows('Products').length], counts); assert.equal(f.props.getProperty('CATALOG_FENCE_' + product.id), null);
});
test('checkout rejects a price or variant changed after server validation', () => {
 const f = catalogFixture(); const product = fresh(f, { sizes: ['54'], colors: ['Black'] }); assert.equal(save(f, product).success, true);
 const item = { productId: product.id, productName: product.name, productSlug: product.slug, category: product.category, unitPrice: product.price, size: '54', color: 'Black', design: null };
 assert.equal(f.ctx.checkCatalogOrder_(f.t, [item]), null); assert.equal(f.ctx.checkCatalogOrder_(f.t, [{ ...item, unitPrice: 1 }]).code, 'CATALOG_CHANGED');
 assert.equal(f.ctx.checkCatalogOrder_(f.t, [{ ...item, size: '56' }]).code, 'CATALOG_CHANGED');
 f.props.setProperty('CATALOG_FENCE_' + product.id, 'pending'); assert.equal(f.ctx.checkCatalogOrder_(f.t, [item]).code, 'PRODUCT_UNAVAILABLE'); assert.equal(f.ctx.readCatalog_().success, false);
});
test('new catalog actions still require the shared secret', () => {
 const f = catalogFixture(); for (const action of ['catalog', 'catalogImage', 'adminSaveProduct', 'adminUploadProductImage']) assert.equal(JSON.parse(f.ctx.doPost({ postData: { contents: JSON.stringify({ action }) } }).text).success, false);
});
test('availability actions publish drafts and invalidate stale editors', () => {
 const f = catalogFixture(); const product = fresh(f, { status: 'draft', stock: null }); const saved = save(f, product); assert.equal(saved.success, true);
 const body = { action: 'adminSetProductStatus', productId: product.id, expectedStock: null, expectedTracking: false, expectedStatus: 'inactive', status: 'active' };
 assert.equal(f.ctx.adminMutateInventory_(body).success, true);
 const row = f.rows('Catalog').find(row => row.product_id === product.id); assert.equal(JSON.parse(row.product_json).status, 'active'); assert.notEqual(row.revision, saved.revision);
 assert.equal(save(f, product, false, saved.revision).code, 'CATALOG_CHANGED');
 f.fail('Catalog'); assert.equal(f.ctx.adminMutateInventory_({ ...body, expectedStatus: 'active', status: 'inactive' }).success, false);
 assert.equal(f.rows('Products').find(row => row.product_id === product.id).status, 'active'); assert.equal(JSON.parse(f.rows('Catalog').find(row => row.product_id === product.id).product_json).status, 'active');
});
console.log(checks + ' catalog checks passed.');
