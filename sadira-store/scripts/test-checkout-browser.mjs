import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { catalogFixture } from './apps-script-simulator.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const f = catalogFixture();
f.ctx.Utilities.formatDate = (_date, _zone, format) => format === 'yyyyMMdd' ? '20261004' : '2026-10-04 18:30:00';
const secret = randomBytes(32).toString('hex');
const qaUser = 'backend-test-operator', qaPassword = randomBytes(24).toString('hex'), qaSessionSecret = randomBytes(32).toString('hex');
f.props.setProperty('APPS_SCRIPT_SECRET', secret);
const payloads = [];
const mock = http.createServer(async (request, response) => {
  let raw = '';
  for await (const chunk of request) raw += chunk;
  try {
    const body = JSON.parse(raw);
    if (body.items) payloads.push(body);
    response.setHeader('Content-Type', 'application/json');
    const result = f.ctx.doPost({ postData: { contents: raw } }).text;
    if (body.items && JSON.parse(result).success !== true) console.error('Simulator rejected order:', result);
    response.end(result);
  } catch { response.statusCode = 500; response.end('{}'); }
});
await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:3116';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3116'], {
  windowsHide: true,
  env: { ...process.env, NODE_ENV: 'development', SADIRA_TEST_BUILD_DIR: '.next-tests/checkout', ADMIN_USERNAME: qaUser, ADMIN_PASSWORD: qaPassword, ADMIN_SESSION_SECRET: qaSessionSecret, APPS_SCRIPT_ORDER_URL: `http://127.0.0.1:${mock.address().port}`, APPS_SCRIPT_SECRET: secret,
    DELIVERY_CHARGE_INSIDE_DHAKA: '', DELIVERY_CHARGE_OUTSIDE_DHAKA: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => output += chunk);
child.stderr.on('data', chunk => output += chunk);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + '/product/floral-charm-shoulder-bag')).ok) { ready = true; break; } } catch {}
    if (child.exitCode !== null) throw Error(output.slice(-3000));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(ready, true);
  browser = await chromium.launch({ headless: true });
  const product = JSON.parse(fs.readFileSync('data/products.generated.json', 'utf8')).find(p => p.id === 'SAD-BAG-004');
  for (const [area, label, charge, width] of [['inside-dhaka', 'Inside Dhaka', 80, 1440], ['outside-dhaka', 'Outside Dhaka', 140, 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/product/' + product.slug);
    await page.getByRole('heading', { name: product.name, exact: true }).waitFor();
    await page.evaluate(p => sessionStorage.setItem('sadira-buy-now', JSON.stringify({ item: {
      productId: p.id, name: p.name, slug: p.slug, category: p.category, image: p.images[0], size: null,
      color: 'Black', design: null, quantity: 2, price: p.price, stock: p.stock,
    }, savedAt: Date.now() })), product);
    await page.goto(origin + '/checkout?mode=buy-now');
    await page.getByRole('radio', { name: label, exact: true }).check();
    const summary = page.getByRole('region', { name: 'Order Summary' });
    const readValue = term => summary.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp('^' + term + '$') }) }).locator('dd').innerText();
    assert.equal((await readValue('Delivery')).replace(/[^0-9]/g, ''), String(charge));
    assert.equal((await readValue('Total')).replace(/[^0-9]/g, ''), String(1198 + charge));
    await page.locator('#checkout-name').fill('Checkout QA');
    await page.locator('#checkout-phone').fill('01700000000');
    await page.locator('#checkout-division').selectOption('Dhaka');
    await page.locator('#checkout-district').fill('Dhaka');
    await page.locator('#checkout-area').fill('Test area');
    await page.locator('#checkout-address').fill('Test address for simulator only');
    const placeOrder = page.getByRole('button', { name: 'Place Order', exact: true });
    assert.equal(await placeOrder.isEnabled(), true);
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
    await placeOrder.click();
    const response = await responsePromise;
    const result = await response.json();
    assert.equal(response.status(), 201, JSON.stringify(result));
    assert.equal(result.success, true);
    assert.equal(result.order.deliveryCharge, charge);
    assert.equal(result.order.total, 1198 + charge);
    await page.waitForURL(origin + '/order-success');
    const saved = f.rows('Orders').find(row => row.order_id === result.order.orderId);
    assert.ok(saved, 'Order must exist before success is displayed');
    assert.equal(Number(saved.total), 1198 + charge);
    assert.equal(saved.payment_method, 'COD');
    assert.match(result.order.trackingToken, /^[a-f0-9]{64}$/);
    const submitted = response.request().postDataJSON();
    const retried = await page.request.post(origin + '/api/orders', { data: submitted });
    assert.equal((await retried.json()).order.orderId, result.order.orderId);
    const status = await page.request.post(origin + '/api/orders/status', { data: { orderId: result.order.orderId, token: result.order.trackingToken } });
    assert.equal(status.status(), 200);
    const projection = (await status.json()).data;
    assert.equal(projection.status, 'Pending');
    assert.equal(Object.hasOwn(projection, 'customer'), false);
    assert.equal((await page.request.post(origin + '/api/orders/status', { data: { orderId: result.order.orderId, token: '0'.repeat(64) } })).status(), 404);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sadira-buy-now')), null);
    assert.deepEqual(errors, []);
    await page.goto(origin + '/track-order');
    await page.getByLabel('Order ID', { exact: true }).fill(result.order.orderId);
    await page.getByLabel('Private access code').fill(result.order.trackingToken);
    await page.getByRole('button', { name: 'Check order status' }).click();
    await page.getByRole('heading', { name: 'Pending', exact: true }).waitFor();
    console.log(`PASS ${area}: subtotal 1198 + delivery ${charge} = ${1198 + charge}, COD saved, success navigation (${width}px)`);
    await context.close();
  }
  const page = await browser.newPage();
  await page.goto(origin + '/product/sunflower-hair-clip');
  const increase = page.getByRole('button', { name: 'Increase quantity', exact: true });
  await increase.click();
  assert.equal(await increase.isDisabled(), true, 'Clip selector must stop at two');
  const form = { name: 'Limit QA', phone: '01700000000', alternativePhone: '', email: '', division: 'Dhaka', district: 'Dhaka', area: 'Test area', address: 'Simulator test address', postalCode: '', deliveryArea: 'inside-dhaka', paymentMethod: 'cod', note: '' };
  for (const quantities of [[3], [2, 1]]) {
    const response = await page.request.post(origin + '/api/orders', { data: {
      requestId: randomBytes(16).toString('hex'), mode: 'cart', form,
      items: quantities.map(quantity => ({ productId: 'SAD-CLIP-001', quantity, size: null, color: null, design: null, displayedUnitPrice: 99 })),
    } });
    const result = await response.json();
    assert.equal(result.success, false);
    assert.match(JSON.stringify(result), /maximum 2 pieces per order/);
  }
  await page.close();
  console.log('PASS clip quantity cap and server rejection of split-line bypass');
  assert.equal(payloads.length, 2);
  console.log('PASS both delivery areas use published defaults without environment overrides');
  console.log('PASS saved retry recovery, private status API and desktop/mobile tracking form');
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(origin + '/admin/login');
  await adminPage.getByLabel('Username').fill(qaUser);
  await adminPage.getByLabel('Password', { exact: true }).fill(qaPassword);
  await adminPage.getByRole('button', { name: 'Sign In', exact: true }).click();
  await adminPage.waitForURL(origin + '/admin');
  const skuProduct = JSON.parse(f.rows('Catalog')[0].product_json);
  await adminPage.goto(origin + '/admin/products/' + skuProduct.id);
  await adminPage.getByRole('button', { name: 'Load / reload variants' }).click();
  const counts = adminPage.getByRole('spinbutton', { name: /^Stock for / });
  await counts.first().fill('3');
  await adminPage.getByLabel('Stock adjustment reason', { exact: true }).fill('Test physical count');
  await adminPage.getByRole('button', { name: 'Save variant counts' }).click();
  await adminPage.getByText('Variant stock saved. Reload to see current quantities.', { exact: true }).waitFor();
  assert.equal(f.rows('Products').find(r => r.product_id === skuProduct.id).stock, 3);
  const live = await (await adminPage.request.get(origin + '/api/inventory')).json();
  assert.equal(live.products.find(p => p.productId === skuProduct.id).variants.some(v => v.stock === 3), true);
  await adminPage.getByRole('button', { name: 'Load / reload variants' }).click();
  await counts.first().waitFor();
  fs.mkdirSync('test-results', { recursive: true });
  await adminPage.screenshot({ path: 'test-results/backend-variants-desktop.png', fullPage: true });
  const orderId = f.rows('Orders').find(r => r.access_hash).order_id;
  await adminPage.goto(origin + '/admin/orders/' + orderId);
  for (const label of ['Confirm Order', 'Mark Processing', 'Mark Shipped', 'Mark Delivered']) {
    await adminPage.getByRole('button', { name: label, exact: true }).click();
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await adminPage.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  await adminPage.getByRole('button', { name: 'Record COD Collection', exact: true }).click();
  await adminPage.getByLabel('Collection note', { exact: true }).fill('Simulator courier collection');
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await adminPage.getByText('COD collection recorded.', { exact: true }).waitFor();
  assert.equal(f.rows('Orders').find(r => r.order_id === orderId).payment_status, 'Paid');
  assert.equal(f.rows('PaymentTransactions').length, 1);
  await adminPage.goto(origin + '/admin/backend');
  await adminPage.getByRole('heading', { name: 'Backend checks passed', exact: true }).waitFor();
  await adminPage.screenshot({ path: 'test-results/backend-health-desktop.png', fullPage: true });
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.goto(origin + '/admin/products/' + skuProduct.id);
  await adminPage.getByRole('button', { name: 'Load / reload variants' }).click();
  await adminPage.getByRole('spinbutton', { name: /^Stock for / }).first().waitFor();
  await adminPage.screenshot({ path: 'test-results/backend-variants-mobile.png', fullPage: true });
  await adminContext.close();
  console.log('PASS desktop/mobile variant editor, COD collection and backend health UI');
} catch (error) { console.error(output.slice(-4000)); throw error; }
finally {
  await browser?.close();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  else child.kill('SIGTERM');
  await new Promise(resolve => mock.close(resolve));
}
