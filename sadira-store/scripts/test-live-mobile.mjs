import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const products = JSON.parse(fs.readFileSync('data/products.generated.json', 'utf8'));
const origin = process.env.QA_ORIGIN || 'https://sadira-store.vercel.app';
const browser = await chromium.launch({ headless: true });
try {
 const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
 const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
 fs.mkdirSync('test-results', { recursive: true });
 for (const product of products) {
  const response = await page.goto(origin + '/product/' + product.slug); assert.equal(response.status(), 200);
  await page.getByRole('heading', { name: product.name, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, product.name);
 }
 console.log('PASS all 12 products on 360px touch viewport');
 const videoRequests = [];
 page.on('request', request => { if (request.url().endsWith('/shirt-abaya.mp4')) videoRequests.push(request.url()); });
 await page.goto(origin + '/product/shirt-abaya');
 const watchVideo = page.getByRole('button', { name: 'Watch Shirt Abaya video', exact: true });
 await watchVideo.waitFor();
 assert.equal(videoRequests.length, 0, 'Video must not download before user selection');
 await watchVideo.tap();
 assert.equal(await page.locator('video').getAttribute('preload'), 'none');
 assert.equal(await page.locator('video').evaluate(async video => {
  video.muted = true;
  await video.play();
  await new Promise(resolve => setTimeout(resolve, 700));
  const playing = video.videoWidth > 0 && video.currentTime > 0 && !video.paused;
  video.pause();
  return playing;
 }), true, 'Product video must play');
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await page.getByRole('button', { name: 'View image 1 of Shirt Abaya', exact: true }).tap();
 assert.equal(await page.locator('video').count(), 0, 'Returning to photos removes video playback');
 console.log('PASS Shirt Abaya video lazy loading, playback and photo return');
 await page.goto(origin + '/shop'); await page.getByRole('button', { name: 'Filters', exact: true }).tap();
 const drawer = page.locator('dialog[open]'); await drawer.getByRole('radio', { name: /^Abaya\s*\d*$/ }).check();
 await page.screenshot({ path: 'test-results/qa-mobile-shop-filters.png', fullPage: true });
 await drawer.getByRole('button', { name: /Show \d+ Products/i }).tap(); await page.waitForURL(/category=abaya/);
 await page.getByRole('combobox', { name: 'Sort products', exact: true }).selectOption('price-low'); await page.waitForURL(/sort=price-low/);
 await page.waitForFunction(() => document.querySelector('main article h3')?.textContent.trim() === 'Shirt Abaya');
 const cards = await page.locator('main article h3').allTextContents(); assert.equal(cards.length, 5); assert.equal(cards[0].trim(), 'Shirt Abaya');
 await page.reload(); assert.equal(await page.getByRole('combobox', { name: 'Sort products', exact: true }).inputValue(), 'price-low');
 console.log('PASS touch filter selection, sorting and URL persistence');
 await page.goto(origin + '/product/brand-scarf-collection'); await page.getByRole('button', { name: 'Design 4', exact: true }).tap();
 await page.getByRole('button', { name: 'Add to Cart', exact: true }).tap(); await page.getByRole('button', { name: 'Close bag', exact: true }).tap();
 await page.goto(origin + '/cart'); await page.locator('main').getByRole('button', { name: 'Increase quantity', exact: true }).tap();
 await page.waitForFunction(() => JSON.parse(localStorage.getItem('sadira-cart')).items[0].quantity === 2);
 await page.reload(); await page.locator('main').getByText('Design 4', { exact: true }).waitFor();
 assert.equal(await page.locator('main output').first().innerText(), '2');
 await page.locator('main article img').first().evaluate(img => img.decode());
 await page.screenshot({ path: 'test-results/qa-mobile-cart.png', fullPage: true });
 await page.goto(origin + '/checkout'); assert.equal(await page.getByRole('button', { name: 'Place Order', exact: false }).isDisabled(), true);
 await page.getByText('Online ordering is currently unavailable.', { exact: false }).waitFor();
 await page.screenshot({ path: 'test-results/qa-mobile-checkout.png', fullPage: true });
 for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Checkout at ' + width);
  assert.equal(await page.getByRole('button', { name: 'Place Order', exact: false }).isDisabled(), true);
 }
 await page.setViewportSize({ width: 360, height: 800 });
 await page.goto(origin + '/cart'); await page.getByRole('button', { name: 'Remove Brand Scarf Collection from bag', exact: true }).tap();
 await page.waitForFunction(() => JSON.parse(localStorage.getItem('sadira-cart')).items.length === 0);
 console.log('PASS scarf design, cart image/quantity/reload/removal; unavailable checkout notice and disabled submit');
 for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  await page.setViewportSize(viewport);
  for (const route of ['/', '/shop', '/product/shirt-abaya']) { await page.goto(origin + route); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ' ' + viewport.width); }
 }
 await page.setViewportSize({ width: 390, height: 844 }); await page.goto(origin + '/shop'); await page.screenshot({ path: 'test-results/qa-mobile-shop.png', fullPage: true });
 await page.emulateMedia({ reducedMotion: 'no-preference' });
 await page.goto(origin + '/product/abaya-elara');
 await page.getByRole('button', { name: 'Pause slideshow', exact: true }).waitFor();
 const previous = await page.getByRole('button', { name: 'Previous image', exact: true }).boundingBox();
 const next = await page.getByRole('button', { name: 'Next image', exact: true }).boundingBox();
 const photo = await page.locator('img[alt^="Abaya Elara product image"]').boundingBox();
 assert.ok(previous.x + previous.width < next.x, 'Gallery arrows must not overlap');
 assert.ok(Math.abs(previous.y + previous.height / 2 - (photo.y + photo.height / 2)) < 2, 'Previous arrow vertically centered on photo');
 assert.ok(Math.abs(next.y - previous.y) < 2, 'Gallery arrows aligned');
 await page.screenshot({ path: 'test-results/qa-mobile-gallery.png', fullPage: true });
 await page.waitForFunction(() => !!document.querySelector('img[alt="Abaya Elara product image 2"]'), null, { timeout: 12000 });
 await page.getByRole('button', { name: 'Pause slideshow', exact: true }).tap();
 const paused = await page.locator('img[alt^="Abaya Elara product image"]').getAttribute('alt');
 await page.waitForTimeout(5500);
 assert.equal(await page.locator('img[alt^="Abaya Elara product image"]').getAttribute('alt'), paused);
 console.log('PASS mobile slideshow autoplay and pause');
 assert.deepEqual(errors, []); console.log('PASS portrait/landscape layouts and zero mobile JS errors');
} finally { await browser.close(); }
