/** Product editing + private Drive storage. Deploy alongside Code.gs and CatalogSeed.gs. */
var CATALOG_CATEGORIES = { abaya: 'Abaya', bag: 'Bag', burka: 'Burka', bracelet: 'Bracelet', niqab: 'Niqab', scarf: 'Scarf', sunglasses: 'Sunglasses', combo: 'Combo', perfume: 'Perfume' };
var CATALOG_IMAGE_RE = /^\/api\/catalog\/images\/([A-Za-z0-9_-]{10,150})$/;
var CATALOG_LOCAL_IMAGE_RE = /^\/catalog\/[a-z0-9/-]+\.(jpeg|jpg|png|webp)$/;

/** Run once: copies existing products without resetting live stock or overwriting edits. */
function setupCatalog() {
  if (typeof SADIRA_CATALOG_SEED === 'undefined') throw new Error('Add CatalogSeed.gs first.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) throw new Error('Store is busy. Try again.');
  try {
    var t = ensureSheets_(getSpreadsheet_());
    var now = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    SADIRA_CATALOG_SEED.forEach(function (p) {
      if (!findRow_(t.Catalog, 'product_id', p.id)) appendRows_(t.Catalog, [{ product_id: p.id, slug: p.slug, product_json: JSON.stringify(p), revision: Utilities.getUuid(), updated_at: now }]);
      if (!findRow_(t.Products, 'product_id', p.id)) appendRows_(t.Products, [{ product_id: p.id, product_name: p.name, track_stock: p.stock !== null, stock: p.stock === null ? '' : p.stock, status: p.status === 'active' ? 'active' : 'inactive', updated_at: now }]);
    });
    catalogFolder_(); // prompts for Drive permission, remains private
    SpreadsheetApp.flush();
    PropertiesService.getScriptProperties().setProperty('CATALOG_READY', 'true');
  } finally { lock.releaseLock(); }
}
function catalogFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PRODUCT_IMAGE_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  var folder = DriveApp.createFolder('Sadira Product Images');
  props.setProperty('PRODUCT_IMAGE_FOLDER_ID', folder.getId());
  return folder;
}
function readCatalog_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try {
    var t = ensureSheets_(getSpreadsheet_());
    var props = PropertiesService.getScriptProperties();
    if (Object.keys(props.getProperties()).some(function (key) { return key.indexOf('CATALOG_FENCE_') === 0; })) return operationError_('CATALOG_RECOVERY');
    var products = records_(t.Catalog).map(function (row) {
      var product = JSON.parse(row.product_json);
      if (!validCatalogProduct_(product) || product.id !== row.product_id || product.slug !== row.slug) throw new Error('Invalid catalog row.');
      return { product: product, revision: String(row.revision) };
    });
    // Also catch a fence from a failed new-product insert whose row was rolled back.
    if (Object.keys(props.getProperties()).some(function (key) { return key.indexOf('CATALOG_FENCE_') === 0; })) return operationError_('CATALOG_RECOVERY');
    var inventory = {};
    var live = loadInventory_(t.Products);
    Object.keys(live).forEach(function (id) { var p = live[id]; inventory[id] = { active: p.active, trackStock: p.trackStock, stock: p.stock }; });
    return { success: true, products: products, inventory: inventory };
  } finally { lock.releaseLock(); }
}
function catalogString_(value, max, required) { return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0); }
function catalogList_(value, max) { return Array.isArray(value) && value.length <= max && value.every(function (v) { return catalogString_(v, 100, true); }); }
function validCatalogProduct_(p) {
  return !!p && /^SAD-[A-Z0-9-]{1,60}$/.test(p.id) && catalogString_(p.name, 150, true) && catalogString_(p.slug, 180, true) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) &&
    Object.prototype.hasOwnProperty.call(CATALOG_CATEGORIES, p.categorySlug) && p.category === CATALOG_CATEGORIES[p.categorySlug] &&
    (p.price === null || isWhole_(p.price, 0) && p.price <= 10000000) && (p.salePrice === null || isWhole_(p.salePrice, 0) && p.price !== null && p.salePrice < p.price) &&
    catalogString_(p.description, 5000, false) && catalogList_(p.features, 30) && catalogList_(p.sizes, 30) && catalogList_(p.colors, 30) &&
    Array.isArray(p.details) && p.details.length <= 30 && p.details.every(function (d) { return d && catalogString_(d.label, 100, true) && catalogString_(d.value, 500, true); }) &&
    Array.isArray(p.images) && p.images.length > 0 && p.images.length <= 10 && p.images.every(function (url) { return typeof url === 'string' && (CATALOG_IMAGE_RE.test(url) || CATALOG_LOCAL_IMAGE_RE.test(url)); }) &&
    Array.isArray(p.designs) && p.designs.length <= 30 && p.designs.every(function (d) { return d && catalogString_(d.id, 100, true) && catalogString_(d.label, 100, true) && p.images.indexOf(d.image) !== -1; }) &&
    (p.stock === null || isWhole_(p.stock, 0)) && typeof p.featured === 'boolean' && typeof p.newArrival === 'boolean' && ['active', 'draft', 'archived'].indexOf(p.status) !== -1 && JSON.stringify(p).length < 40000;
}
function saveCatalogProduct_(b) {
  if (PropertiesService.getScriptProperties().getProperty('CATALOG_READY') !== 'true') return operationError_('CATALOG_NOT_READY');
  if (!validCatalogProduct_(b.product) || b.product.price === null || typeof b.create !== 'boolean' || !catalogString_(b.expectedRevision, 100, false)) return operationError_('INVALID_INPUT');
  var p = b.product;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try {
    var t = ensureSheets_(getSpreadsheet_());
    var props = PropertiesService.getScriptProperties();
    var fence = 'CATALOG_FENCE_' + p.id;
    if (props.getProperty(fence) || props.getProperty('INVENTORY_FENCE_' + p.id)) return operationError_('CATALOG_RECOVERY');
    var existing = findRow_(t.Catalog, 'product_id', p.id);
    var inventory = findRow_(t.Products, 'product_id', p.id);
    if (b.create && (existing || inventory)) return operationError_('DUPLICATE_PRODUCT');
    if (!b.create && (!existing || String(existing.values.revision) !== b.expectedRevision)) return operationError_('CATALOG_CHANGED');
    if (records_(t.Catalog).some(function (row) { return row.slug === p.slug && row.product_id !== p.id; })) return operationError_('DUPLICATE_SLUG');
    var originalImages = existing ? JSON.parse(existing.values.product_json).images : [];
    if (!p.images.every(function (image) {
      var match = image.match(CATALOG_IMAGE_RE);
      return match ? !!findRow_(t.CatalogImages, 'file_id', match[1]) : originalImages.indexOf(image) !== -1;
    })) return operationError_('INVALID_IMAGE');
    // Editing content never resets tracked stock. Use the inventory actions for stock changes.
    if (inventory) { var live = loadInventory_(t.Products)[p.id]; if (live.trackStock && live.stock === null) return operationError_('CATALOG_RECOVERY'); p.stock = live.trackStock ? live.stock : null; }
    p.detailsSource = null;
    var revision = Utilities.getUuid();
    var now = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    var record = { product_id: p.id, slug: p.slug, product_json: JSON.stringify(p), revision: revision, updated_at: now };
    var fields = { product_name: p.name, status: p.status === 'active' ? 'active' : 'inactive', updated_at: now };
    var undo = [];
    try {
      props.setProperty(fence, JSON.stringify({ product: p, revision: revision, created_at: now }));
      if (existing) { undo.push(updateRowUndo_(t.Catalog, existing.row)); updateRow_(t.Catalog, existing.row, record); }
      else appendOperational_(t.Catalog, [record], undo);
      if (inventory) { undo.push(updateRowUndo_(t.Products, inventory.row)); updateRow_(t.Products, inventory.row, fields); }
      else appendOperational_(t.Products, [{ product_id: p.id, product_name: p.name, track_stock: p.stock !== null, stock: p.stock === null ? '' : p.stock, status: fields.status, updated_at: now }], undo);
      SpreadsheetApp.flush();
      props.deleteProperty(fence);
      return { success: true, revision: revision };
    } catch (err) {
      if (rollbackOperational_(undo)) props.deleteProperty(fence);
      console.error('Product save failed: ' + err);
      return operationError_('SAVE_FAILED');
    }
  } finally { lock.releaseLock(); }
}
function uploadCatalogImage_(b) {
  if (PropertiesService.getScriptProperties().getProperty('CATALOG_READY') !== 'true') return operationError_('CATALOG_NOT_READY');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(b.mime) === -1 || typeof b.data !== 'string' || b.data.length > 1398104 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.data) || !/^[a-zA-Z0-9-]{16,64}$/.test(b.uploadKey)) return operationError_('INVALID_INPUT');
  var bytes = Utilities.base64Decode(b.data);
  if (bytes.length === 0 || bytes.length > 1048576) return operationError_('INVALID_INPUT');
  var unsigned = function (i) { return (bytes[i] + 256) % 256; };
  var jpeg = unsigned(0) === 255 && unsigned(1) === 216 && unsigned(2) === 255;
  var png = [137,80,78,71,13,10,26,10].every(function (v, i) { return unsigned(i) === v; });
  var webp = [82,73,70,70].every(function (v, i) { return unsigned(i) === v; }) && [87,69,66,80].every(function (v, i) { return unsigned(i + 8) === v; });
  if (!(b.mime === 'image/jpeg' && jpeg || b.mime === 'image/png' && png || b.mime === 'image/webp' && webp)) return operationError_('INVALID_INPUT');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  var file;
  try {
    var t = ensureSheets_(getSpreadsheet_());
    var existing = findRow_(t.CatalogImages, 'upload_key', b.uploadKey);
    if (existing) return { success: true, image: '/api/catalog/images/' + existing.values.file_id };
    var extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[b.mime];
    file = catalogFolder_().createFile(Utilities.newBlob(bytes, b.mime, b.uploadKey + '.' + extension));
    appendRows_(t.CatalogImages, [{ upload_key: b.uploadKey, file_id: file.getId(), mime: b.mime, created_at: Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss') }]);
    SpreadsheetApp.flush();
    return { success: true, image: '/api/catalog/images/' + file.getId() };
  } catch (err) {
    // Only discard if the registry write never became durable (network retries are idempotent).
    if (file) {
      try { if (!findRow_(ensureSheets_(getSpreadsheet_()).CatalogImages, 'file_id', file.getId())) file.setTrashed(true); } catch (ignored) { console.error('Image cleanup needs review.'); }
    }
    console.error('Image upload failed: ' + err);
    return operationError_('UPLOAD_FAILED');
  } finally { lock.releaseLock(); }
}
function readCatalogImage_(b) {
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(b.fileId)) return operationError_('INVALID_INPUT');
  var table = ensureSheets_(getSpreadsheet_()).CatalogImages;
  var row = findRow_(table, 'file_id', b.fileId);
  if (!row) return operationError_('IMAGE_NOT_FOUND');
  var file = DriveApp.getFileById(b.fileId);
  var parents = file.getParents();
  var folderId = PropertiesService.getScriptProperties().getProperty('PRODUCT_IMAGE_FOLDER_ID');
  var owned = false;
  while (parents.hasNext()) if (parents.next().getId() === folderId) owned = true;
  if (!owned || file.isTrashed() || file.getSize() > 1048576 || ['image/jpeg', 'image/png', 'image/webp'].indexOf(file.getMimeType()) === -1) return operationError_('IMAGE_NOT_FOUND');
  return { success: true, mime: file.getMimeType(), data: Utilities.base64Encode(file.getBlob().getBytes()) };
}
function checkCatalogOrder_(t, items) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (PropertiesService.getScriptProperties().getProperty('CATALOG_FENCE_' + item.productId)) return { success: false, code: 'PRODUCT_UNAVAILABLE', productId: item.productId };
    var row = findRow_(t.Catalog, 'product_id', item.productId);
    if (!row) continue; // legacy products before migration
    var p = JSON.parse(row.values.product_json);
    if (!validCatalogProduct_(p) || p.status !== 'active') return { success: false, code: 'PRODUCT_UNAVAILABLE', productId: item.productId };
    var price = p.salePrice === null ? p.price : p.salePrice;
    var option = function (value, options) { return options.length ? options.indexOf(value) !== -1 : value === null || value === ''; };
    if (price === null || item.unitPrice !== price || item.productName !== p.name || item.productSlug !== p.slug || item.category !== p.category || !option(item.size, p.sizes) || !option(item.color, p.colors) || !option(item.design, p.designs.map(function (d) { return d.label; }))) return { success: false, code: 'CATALOG_CHANGED', productId: item.productId };
  }
  return null;
}
