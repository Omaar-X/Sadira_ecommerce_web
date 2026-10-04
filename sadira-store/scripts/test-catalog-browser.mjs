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
const secret = randomBytes(32).toString('hex'); f.props.setProperty('APPS_SCRIPT_SECRET', secret);
const mock = http.createServer(async (request, response) => {
 let raw = ''; for await (const chunk of request) raw += chunk;
 try { response.setHeader('Content-Type', 'application/json'); response.end(f.ctx.doPost({ postData: { contents: raw } }).text); }
 catch { response.statusCode = 500; response.end('{}'); }
});
await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:3115';
const username = 'catalog-test'; const password = randomBytes(24).toString('hex');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3115'], { windowsHide: true, env: { ...process.env, NODE_ENV: 'development', ADMIN_USERNAME: username, ADMIN_PASSWORD: password, ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), APPS_SCRIPT_ORDER_URL: `http://127.0.0.1:${mock.address().port}`, APPS_SCRIPT_SECRET: secret, DELIVERY_CHARGE_INSIDE_DHAKA: '60', DELIVERY_CHARGE_OUTSIDE_DHAKA: '120' }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
let browser;
try {
 for (let i = 0; i < 100; i++) { try { if ((await fetch(origin + '/admin/login')).ok) break; } catch {} if (child.exitCode !== null) throw Error(output.slice(-3000)); await new Promise(resolve => setTimeout(resolve, 500)); }
 for (const route of ['/api/admin/products', '/api/admin/products/images']) assert.equal((await fetch(origin + route, { method: 'POST', headers: { origin }, body: '{}' })).status, 401);
 browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
 const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto(origin + '/admin/login'); await page.getByLabel('Username').fill(username); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL(origin + '/admin');
 await page.goto(origin + '/admin/products'); await page.getByRole('link', { name: '+ Add product' }).click();
 await page.getByLabel('Product name', { exact: true }).fill('Browser Test Abaya'); await page.getByLabel('Price (৳)', { exact: true }).fill('1800'); await page.getByLabel('Offer price').fill('1500');
 await page.getByLabel('Description', { exact: true }).fill('Uploaded from the admin panel.'); await page.getByLabel('Details — one per line').fill('Fabric: Georgette\nIncludes: Abaya + Hijab');
 await page.getByLabel('Sizes — one per line').fill('52\n54'); await page.getByLabel('Colors — one per line').fill('Black\nBrown');
 await page.getByLabel('Track stock', { exact: true }).check(); await page.getByLabel('Initial stock').fill('5');
 await page.getByLabel('Choose photos').setInputFiles(['public/catalog/abaya/sad-abaya-001/1.jpeg', 'public/catalog/abaya/sad-abaya-001/2.jpeg']);
 await page.getByAltText('Product photo 2', { exact: true }).waitFor({ timeout: 60000 }); await page.getByRole('button', { name: 'Save product', exact: true }).waitFor();
 await page.getByRole('button', { name: 'Save product', exact: true }).click(); await page.waitForURL(/\/admin\/products\/SAD-/); await page.getByRole('heading', { name: 'Edit Browser Test Abaya' }).waitFor();
 const productId = page.url().split('/').at(-1); const entry = f.rows('Catalog').find(row => row.product_id === productId); const product = JSON.parse(entry.product_json);
 assert.equal(product.images.length, 2); assert.equal(product.price, 1800); assert.equal(product.salePrice, 1500); assert.equal(product.stock, 5);
 fs.mkdirSync('test-results', { recursive: true });
 await page.screenshot({ path: 'test-results/catalog-editor-desktop.png', fullPage: true });
 await page.setViewportSize({ width: 390, height: 844 });
 await page.waitForFunction(() => document.querySelector('.admin-sidebar').getBoundingClientRect().right <= 0);
 await page.getByLabel('Choose photos').setInputFiles('public/catalog/abaya/sad-abaya-001/3.jpeg');
 await page.getByAltText('Product photo 3', { exact: true }).waitFor();
 await page.getByRole('button', { name: 'Move photo 3 earlier', exact: true }).click();
 await page.getByRole('button', { name: 'Save product', exact: true }).click();
 await page.getByText('Product published. It is now available on the website.', { exact: false }).waitFor();
 await page.waitForFunction(() => [...document.querySelectorAll('.admin-photo-preview')].every(image => image.complete && image.naturalWidth > 0));
 await page.screenshot({ path: 'test-results/catalog-editor-mobile.png', fullPage: true });
 assert.equal(JSON.parse(f.rows('Catalog').find(row => row.product_id === productId).product_json).images.length, 3);
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await page.goto(origin + '/product/browser-test-abaya'); await page.getByRole('heading', { name: 'Browser Test Abaya', exact: true }).waitFor(); await page.getByText('Uploaded from the admin panel.', { exact: true }).first().waitFor();
 assert.equal(await page.getByText('Georgette', { exact: true }).count() > 0, true);
 const image = await fetch(origin + product.images[0]); assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/jpeg');
 assert.equal((await fetch(origin + '/api/catalog/images/unregistered-file')).status, 404);
 await page.screenshot({ path: 'test-results/catalog-product-mobile.png', fullPage: true });
 await page.goto(origin + '/shop?q=Browser+Test'); await page.getByText('Browser Test Abaya', { exact: true }).first().waitFor();
 await page.goto(origin + '/admin/products/' + productId); await page.getByLabel('Price (৳)', { exact: true }).fill('2000'); await page.getByLabel('Offer price').fill('');
 await page.getByLabel('Visibility').selectOption('draft'); await page.getByRole('button', { name: 'Save product', exact: true }).click(); await page.getByText('Product saved. It is hidden from the website.').waitFor();
 assert.equal((await fetch(origin + '/product/browser-test-abaya')).status, 404);
 assert.equal(f.rows('Products').find(row => row.product_id === productId).stock, 5);
 await page.getByLabel('Visibility').selectOption('active'); await page.getByRole('button', { name: 'Save product', exact: true }).click(); await page.getByText('Product published. It is now available on the website.', { exact: false }).waitFor();
 await page.goto(origin + '/product/browser-test-abaya'); await page.getByRole('heading', { name: 'Browser Test Abaya', exact: true }).waitFor();
 assert.equal(JSON.parse(f.rows('Catalog').find(row => row.product_id === productId).product_json).price, 2000);
 const csrf = await context.request.post(origin + '/api/admin/products', { headers: { origin: 'https://evil.example' }, data: {} }); assert.equal(csrf.status(), 403);
 assert.deepEqual(errors, []);
 console.log('PASS authenticated desktop/mobile image uploads, publish, details, listing, price edit, stock preservation, draft/re-publish, image isolation and CSRF');
} catch (error) { console.error(output.slice(-5000)); throw error; }
finally { await browser?.close(); if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }); else child.kill('SIGTERM'); await new Promise(resolve => mock.close(resolve)); }
