/** Deploy with Code.gs. Rate-limit identities are hashed; no PII in properties. */
function equalAccessHash_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[a-f0-9]{64}$/.test(a) || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function existingTable_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  return sheet && sheet.getLastColumn() ? { sheet: sheet, headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String) } : null;
}
/** Must hold script lock. Persisted and bounded across Next.js instances. */
function consumeSharedLimit_(key, max, windowMs) {
  var props = PropertiesService.getScriptProperties(), now = Date.now(), all;
  try { all = JSON.parse(props.getProperty('SADIRA_RATE_LIMITS') || '{}'); } catch (err) { all = {}; }
  Object.keys(all).forEach(function (k) { if (all[k].until <= now) delete all[k]; });
  var bucket = all[key];
  if (bucket && bucket.count >= max || !bucket && Object.keys(all).length >= 80) return false;
  all[key] = { count: (bucket ? bucket.count : 0) + 1, until: bucket ? bucket.until : now + windowMs };
  props.setProperty('SADIRA_RATE_LIMITS', JSON.stringify(all));
  return true;
}
function orderRateAllowed_(b) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b.customer.phone);
  var key = digest.map(function (n) { return ('0' + ((n + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 24);
  return consumeSharedLimit_('orders-global', 60, 900000) && consumeSharedLimit_('phone-' + key, 5, 900000);
}
/** Never return customer names, contact details, address or access hash. */
function sharedLoginLimit_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try { return { success: true, allowed: consumeSharedLimit_('admin-login', 10, 900000) }; }
  finally { lock.releaseLock(); }
}
function readOrderStatus_(b) {
  if (!validOrderId_(b.orderId) || !/^[a-f0-9]{64}$/.test(b.accessHash || '')) return { success: false, code: 'NOT_FOUND' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try {
    if (!consumeSharedLimit_('status-lookups', 120, 60000)) return { success: false, code: 'RATE_LIMITED' };
    var table = existingTable_('Orders'), row = table && findRow_(table, 'order_id', b.orderId);
    if (!row || !equalAccessHash_(String(row.values.access_hash || ''), b.accessHash)) return { success: false, code: 'NOT_FOUND' };
    if (PropertiesService.getScriptProperties().getProperty('ORDER_FENCE_' + row.values.request_id)) return operationError_('BUSY');
    var v = row.values;
    return { success: true, data: { orderId: String(v.order_id), createdAt: formatTimestamp_(v.created_at), updatedAt: formatTimestamp_(v.status_updated_at), status: String(v.order_status), paymentStatus: String(v.payment_status), total: Number(v.total) } };
  } finally { lock.releaseLock(); }
}
/** Before catalog validation: recover the original saved receipt, not current prices. */
function recoverOrder_(b) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(b.requestId || '') || !/^[a-f0-9]{64}$/.test(b.accessHash || '')) return operationError_('INVALID_INPUT');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try {
    if (!consumeSharedLimit_('recover-lookups', 180, 60000)) return { success: false, code: 'RATE_LIMITED' };
    var table = existingTable_('Orders'), row = table && findRow_(table, 'request_id', b.requestId);
    if (PropertiesService.getScriptProperties().getProperty('ORDER_FENCE_' + b.requestId)) return operationError_('BUSY');
    if (!row) return { success: true, found: false };
    if (!equalAccessHash_(String(row.values.access_hash || ''), b.accessHash)) return { success: false, code: 'LEGACY_ORDER' };
    var itemTable = existingTable_('OrderItems');
    var ids = itemTable ? records_(itemTable).filter(function (r) { return r.order_id === row.values.order_id; }).map(function (r) { return r.product_id; }) : [];
    if (['Pending', 'Failed'].indexOf(String(row.values.restock_status)) !== -1 || ids.some(function (id) { return PropertiesService.getScriptProperties().getProperty('INVENTORY_FENCE_' + id); })) return operationError_('BUSY');
    return { success: true, found: true, order: confirmedReceipt_(row.values) };
  } finally { lock.releaseLock(); }
}
function confirmedReceipt_(v) {
  var table = existingTable_('OrderItems');
  var items = records_(table).filter(function (r) { return String(r.order_id) === String(v.order_id); }).map(function (r) {
    return { productId: String(r.product_id), name: String(r.product_name), slug: String(r.product_slug), image: String(r.product_image || '/brand/logo-transparent.png'), size: r.size || null, color: r.color || null, design: r.design || null, quantity: Number(r.quantity), unitPrice: Number(r.unit_price), lineTotal: Number(r.line_total) };
  });
  if (!items.length) throw new Error('Saved order items missing');
  return { orderId: String(v.order_id), createdAt: formatTimestamp_(v.created_at), items: items, subtotal: Number(v.subtotal), deliveryCharge: Number(v.delivery_charge), discount: Number(v.discount), total: Number(v.total), paymentMethod: 'cod', orderStatus: String(v.order_status), customer: { name: String(v.customer_name), phone: String(v.phone) }, delivery: { deliveryArea: v.delivery_area === 'Inside Dhaka' ? 'inside-dhaka' : 'outside-dhaka', address: [v.full_address, v.area, v.district, v.division, v.postal_code].filter(Boolean).join(', ') } };
}
function backendHealth_() {
  var props = PropertiesService.getScriptProperties();
  var missing = ['Orders', 'OrderItems', 'Customers', 'Products', 'Catalog', 'ProductVariants', 'PaymentTransactions'].filter(function (name) { return !existingTable_(name); });
  var fences = Object.keys(props.getProperties()).filter(function (key) { return /^(INVENTORY|CATALOG|ORDER|PAYMENT)_FENCE_/.test(key); });
  return { success: true, data: { ready: !missing.length && !fences.length, missingTables: missing, reconciliationCount: fences.length, lastBackupAt: props.getProperty('SADIRA_LAST_BACKUP_AT') || null, lastBackupError: props.getProperty('SADIRA_LAST_BACKUP_ERROR') || null } };
}
/** Collection is separate from delivery and must be explicitly confirmed by staff. */
function recordCOD_(b) {
  if (!validOrderId_(b.orderId) || !isText_(b.note, 300) || b.note.trim().length < 3 || !Number.isSafeInteger(b.amount) || b.amount < 0) return operationError_('INVALID_INPUT');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try {
    var t = ensureSheets_(getSpreadsheet_()), order = findRow_(t.Orders, 'order_id', b.orderId);
    if (!order || order.values.order_status !== 'Delivered' || order.values.payment_method !== 'COD' || Number(order.values.total) !== b.amount) return operationError_('INVALID_INPUT');
    var props = PropertiesService.getScriptProperties(), fence = 'PAYMENT_FENCE_' + b.orderId;
    if (props.getProperty(fence)) return operationError_('ADJUSTMENT_FAILED');
    var prior = records_(t.PaymentTransactions).filter(function (r) { return r.order_id === b.orderId && r.type === 'COLLECTION'; });
    if (prior.length) return order.values.payment_status === 'Paid' && prior.length === 1 && Number(prior[0].amount) === b.amount ? { success: true } : operationError_('ADJUSTMENT_FAILED');
    if (order.values.payment_status !== 'Pending') return operationError_('INVALID_INPUT');
    var undo = [], now = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    try {
      props.setProperty(fence, JSON.stringify({ amount: b.amount, created_at: now }));
      appendOperational_(t.PaymentTransactions, [{ payment_id: Utilities.getUuid(), created_at: now, order_id: b.orderId, method: 'COD', amount: b.amount, type: 'COLLECTION', note: b.note.trim() }], undo);
      undo.push(updateRowUndo_(t.Orders, order.row)); updateRow_(t.Orders, order.row, { payment_status: 'Paid' });
      SpreadsheetApp.flush(); props.deleteProperty(fence); return { success: true };
    } catch (err) { if (rollbackOperational_(undo)) props.deleteProperty(fence); return operationError_('ADJUSTMENT_FAILED'); }
  } finally { lock.releaseLock(); }
}
/** Run explicitly. Copies the spreadsheet to a separately configured private folder. */
function backupSadiraSpreadsheet() {
  var props = PropertiesService.getScriptProperties(), folderId = props.getProperty('SADIRA_BACKUP_FOLDER_ID');
  if (!folderId) throw new Error('Set SADIRA_BACKUP_FOLDER_ID to a private Drive folder first.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) throw new Error('Backend busy; retry backup later.');
  try {
    SpreadsheetApp.flush();
    var ss = getSpreadsheet_();
    DriveApp.getFileById(ss.getId()).makeCopy('Sadira backup ' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH-mm-ss'), DriveApp.getFolderById(folderId));
    props.setProperty('SADIRA_LAST_BACKUP_AT', Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'));
    props.deleteProperty('SADIRA_LAST_BACKUP_ERROR');
  } catch (err) {
    props.setProperty('SADIRA_LAST_BACKUP_ERROR', 'Backup failed. Check Apps Script executions and private folder access.');
    throw err;
  } finally { lock.releaseLock(); }
}
/** Explicit opt-in, idempotent. No backup deletion or outgoing messages. */
function installSadiraBackupTrigger() {
  if (!PropertiesService.getScriptProperties().getProperty('SADIRA_BACKUP_FOLDER_ID')) throw new Error('Configure the private backup folder first.');
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'backupSadiraSpreadsheet'; })) ScriptApp.newTrigger('backupSadiraSpreadsheet').timeBased().everyDays(1).atHour(3).inTimezone(TIMEZONE).create();
}
