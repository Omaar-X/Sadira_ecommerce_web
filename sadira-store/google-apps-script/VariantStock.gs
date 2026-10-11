/** Optional SKU stock. Empty matrix preserves legacy product-level inventory. */
function variantKey_(size, color, design) { return JSON.stringify([size || null, color || null, design || null]); }
function variantRows_(t, productId) {
  return records_(t.ProductVariants).filter(function (r) { return String(r.product_id) === productId; });
}
function variantProjection_(rows) {
  return rows.map(function (r) { return { size: r.size || null, color: r.color || null, design: r.design || null, stock: Number.isSafeInteger(Number(r.stock)) && Number(r.stock) >= 0 && r.stock !== '' ? Number(r.stock) : 0, active: r.status === 'active' }; });
}
function variantDeductions_(t, items) {
  var all = records_(t.ProductVariants), groups = Object.create(null), requested = Object.create(null);
  all.forEach(function (r, i) { r.row = i + 2; (groups[r.product_id] || (groups[r.product_id] = [])).push(r); });
  for (var i = 0; i < items.length; i++) {
    var it = items[i], rows = groups[it.productId];
    if (!rows || !rows.length) continue;
    var key = variantKey_(it.size, it.color, it.design), identity = JSON.stringify([it.productId, key]);
    var matches = rows.filter(function (r) { return r.variant_key === key; });
    if (matches.length !== 1 || matches[0].status !== 'active') return { error: { success: false, code: 'VARIANT_UNAVAILABLE', productId: it.productId } };
    var r = matches[0], stock = r.stock === '' ? NaN : Number(r.stock);
    if (!Number.isSafeInteger(stock) || stock < 0) return { error: { success: false, code: 'VARIANT_UNAVAILABLE', productId: it.productId } };
    var entry = requested[identity] || (requested[identity] = { productId: it.productId, row: r.row, key: key, stock: stock, quantity: 0 });
    entry.quantity += it.quantity;
    if (entry.quantity > stock) return { error: { success: false, code: 'VARIANT_UNAVAILABLE', productId: it.productId } };
  }
  return { deductions: Object.keys(requested).map(function (key) { return requested[key]; }) };
}
function deductVariants_(t, deductions, orderId, now, undo, transactions) {
  deductions.forEach(function (v) {
    undo.push(updateRowUndo_(t.ProductVariants, v.row));
    updateRow_(t.ProductVariants, v.row, { stock: v.stock - v.quantity, updated_at: now });
    transactions.push({ created_at: now, product_id: v.productId, variant_key: v.key, order_id: orderId, type: 'VARIANT_SALE', quantity: -v.quantity, stock_before: v.stock, stock_after: v.stock - v.quantity, note: 'Variant sold' });
  });
}
function restoreVariants_(t, audit, items, orderId, now, undo, transactions) {
  var sales = audit.filter(function (r) { return r.type === 'VARIANT_SALE'; });
  var seen = Object.create(null);
  sales.forEach(function (sale) {
    var identity = JSON.stringify([sale.product_id, sale.variant_key]);
    if (seen[identity]) throw new Error('Duplicate variant sale requires reconciliation');
    seen[identity] = true;
    var rows = variantRows_(t, String(sale.product_id)).filter(function (r) { return r.variant_key === sale.variant_key; });
    var sold = -Number(sale.quantity);
    var ordered = items.filter(function (r) { return r.product_id === sale.product_id && variantKey_(r.size, r.color, r.design) === sale.variant_key; }).reduce(function (s, r) { return s + Number(r.quantity); }, 0);
    if (rows.length !== 1 || !Number.isSafeInteger(sold) || sold <= 0 || sold !== ordered || rows[0].stock === '') throw new Error('Variant audit mismatch');
    var stock = Number(rows[0].stock);
    if (!Number.isSafeInteger(stock) || stock < 0 || !Number.isSafeInteger(stock + sold)) throw new Error('Invalid variant stock');
    var row = findRow_(t.ProductVariants, 'variant_id', rows[0].variant_id);
    undo.push(updateRowUndo_(t.ProductVariants, row.row));
    updateRow_(t.ProductVariants, row.row, { stock: stock + sold, updated_at: now });
    transactions.push({ created_at: now, product_id: sale.product_id, variant_key: sale.variant_key, order_id: orderId, type: 'VARIANT_RESTOCK', quantity: sold, stock_before: stock, stock_after: stock + sold, note: 'Cancelled variant restock' });
  });
}
function adminVariants_(b) {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(b.productId || '')) return operationError_('INVALID_INPUT');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) return operationError_('BUSY');
  try {
    var t = ensureSheets_(getSpreadsheet_()), product = loadInventory_(t.Products)[b.productId];
    if (!product) return operationError_('PRODUCT_NOT_FOUND');
    var rows = variantRows_(t, b.productId);
    if (rows.some(function (r) { return r.stock === '' || !Number.isSafeInteger(Number(r.stock)) || Number(r.stock) < 0; })) return operationError_('ADJUSTMENT_FAILED');
    var revision = JSON.stringify(rows.map(function (r) { return [r.variant_key, r.stock, r.status, r.updated_at]; }));
    if (b.action === 'adminGetVariants') return { success: true, data: { variants: variantProjection_(rows), revision: revision } };
    if (b.action !== 'adminSaveVariants' || b.expectedRevision !== revision || !Array.isArray(b.variants) || !b.variants.length || b.variants.length > 100 || !isText_(b.reason, 300) || b.reason.trim().length < 3) return operationError_(b.expectedRevision !== revision ? 'INVENTORY_CHANGED' : 'INVALID_INPUT');
    var props = PropertiesService.getScriptProperties(), fence = 'INVENTORY_FENCE_' + b.productId;
    if (props.getProperty(fence) || props.getProperty('CATALOG_FENCE_' + b.productId)) return operationError_('ADJUSTMENT_FAILED');
    var catalog = findRow_(t.Catalog, 'product_id', b.productId);
    if (!catalog) return operationError_('PRODUCT_NOT_FOUND');
    var p = JSON.parse(catalog.values.product_json), keys = Object.create(null), total = 0;
    for (var i = 0; i < b.variants.length; i++) {
      var v = b.variants[i];
      if (!v || !Number.isSafeInteger(v.stock) || v.stock < 0 || typeof v.active !== 'boolean') return operationError_('INVALID_INPUT');
      var valid = function (value, options) { return options.length ? typeof value === 'string' && options.indexOf(value) !== -1 : value === null; };
      var key = variantKey_(v.size, v.color, v.design);
      var historical = rows.some(function (r) { return r.variant_key === key; });
      if ((!valid(v.size, p.sizes) || !valid(v.color, p.colors) || !valid(v.design, p.designs.map(function (d) { return d.label; }))) && !(historical && !v.active)) return operationError_('INVALID_INPUT');
      if (keys[key]) return operationError_('INVALID_INPUT');
      keys[key] = true; total += v.stock;
    }
    if (!Number.isSafeInteger(total)) return operationError_('INVALID_INPUT');
    // Never lose an old SKU or guess how to allocate outstanding legacy sales.
    if (rows.some(function (r) { return !keys[r.variant_key]; })) return { success: false, code: 'VARIANT_HISTORY', message: 'Existing variants must be retained. Set them inactive instead.' };
    var open = records_(t.Orders).filter(function (r) { return ['Pending', 'Confirmed', 'Processing', 'Shipped'].indexOf(String(r.order_status)) !== -1 || ['Pending', 'Failed'].indexOf(String(r.restock_status)) !== -1; });
    if (!rows.length && records_(t.OrderItems).some(function (r) { return r.product_id === b.productId && open.some(function (o) { return o.order_id === r.order_id; }); })) return { success: false, code: 'VARIANT_HISTORY', message: 'Complete or cancel existing orders for this product before enabling variant stock.' };
    var undo = [], transactions = [], now = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    try {
      props.setProperty(fence, JSON.stringify({ action: 'adminSaveVariants', created_at: now }));
      b.variants.forEach(function (v) {
        var key = variantKey_(v.size, v.color, v.design), previous = rows.find(function (r) { return r.variant_key === key; });
        var fields = { product_id: b.productId, variant_key: key, size: v.size || '', color: v.color || '', design: v.design || '', stock: v.stock, status: v.active ? 'active' : 'inactive', updated_at: now };
        if (previous) {
          var r = findRow_(t.ProductVariants, 'variant_id', previous.variant_id);
          undo.push(updateRowUndo_(t.ProductVariants, r.row)); updateRow_(t.ProductVariants, r.row, fields);
        } else { fields.variant_id = Utilities.getUuid(); appendOperational_(t.ProductVariants, [fields], undo); }
        var before = previous ? Number(previous.stock) : 0;
        if (before !== v.stock) transactions.push({ product_id: b.productId, variant_key: key, created_at: now, order_id: '', type: 'VARIANT_ADJUSTMENT', quantity: v.stock - before, stock_before: before, stock_after: v.stock, note: b.reason.trim() });
      });
      undo.push(updateRowUndo_(t.Products, product.row));
      updateRow_(t.Products, product.row, { stock: total, track_stock: true, updated_at: now });
      var beforeTotal = product.stock || 0;
      if (beforeTotal !== total) transactions.push({ product_id: b.productId, created_at: now, order_id: '', type: total > beforeTotal ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', quantity: total - beforeTotal, stock_before: beforeTotal, stock_after: total, note: 'Variant totals: ' + b.reason.trim() });
      if (transactions.length) {
        var seq = nextSequence_(t.InventoryTransactions, 'transaction_id', 'INV-');
        transactions.forEach(function (tx, i) { tx.transaction_id = 'INV-' + pad_(seq + i, 6); });
        appendOperational_(t.InventoryTransactions, transactions, undo);
      }
      SpreadsheetApp.flush(); props.deleteProperty(fence);
      return { success: true };
    } catch (err) {
      if (rollbackOperational_(undo)) props.deleteProperty(fence);
      return operationError_('ADJUSTMENT_FAILED');
    }
  } finally { lock.releaseLock(); }
}
