# Google Sheets backend upgrade — 10 October 2026

The website now expects the new backend protocol. **Deploy Apps Script first**, then the website. No production Google Sheet was changed during implementation.

## Deploy

1. Make a private backup copy of the existing spreadsheet and product-photo Drive folder.
2. In the existing bound Apps Script project, update `Code.gs`, and add `Reliability.gs` and `VariantStock.gs`. Keep `Catalog.gs`, `CatalogSeed.gs`, `InventorySeed.gs` and the existing manifest.
3. Run `setup()` to append new columns and create `ProductVariants` and `PaymentTransactions`. This preserves existing rows. Run `setupCatalog()` if the Catalog connection has not been initialized. Do not replace live tables with seed data.
4. Deploy → Manage deployments → Edit → New version → Deploy. Keep the existing URL and shared secret in the website environment.
5. Deploy the website. Sign in and open `/admin/backend`. Check that tables are present and reconciliation markers are zero.
6. Test on a separate test spreadsheet first: place a COD order, record its ID/access code, check `/track-order`, retry the same order after a lost response, and cancel a tracked test order. Confirm only one order, sale and restock exist.

The upgraded website fails closed when the recovery/login-limit protocol is unavailable; it will not silently use an older backend for order creation.

## Variant stock

- Products with no ProductVariants rows retain their old product-level inventory behavior.
- Open Products → Edit product → **Stock by size, color and design** → Load variants. Enter actual physical counts and an adjustment reason; Save variant counts.
- Every generated combination begins at zero, not an estimated share of total stock. Zero/missing/inactive combinations cannot be ordered.
- First-time activation is blocked while that product has Pending/Confirmed/Processing/Shipped orders or unresolved restock failures. Complete/cancel/reconcile them before conversion; no existing sale is arbitrarily assigned to a SKU.
- After activation, use the variant editor for stock changes. Legacy Set Stock / Tracking Off actions are blocked. Total stock becomes the sum of all variant physical counts, including inactive retained variants.
- Existing variant rows must be retained for audit and cancellation; mark an obsolete option inactive. Product-wide availability can still be changed separately.
- Orders deduct total inventory and exact variant quantities under one lock. Cancellation restores the original sold variant and logs VARIANT_SALE / VARIANT_RESTOCK alongside the total-product audit. A matrix/total mismatch fails closed.
- Manual spreadsheet stock edits bypass the controls and can produce inconsistencies. Use admin controls.

## Tracking and retry recovery

- New confirmations display an order ID and a 64-character private access code. Save both to use `/track-order` later; there is also a footer link.
- The code is submitted by POST, not embedded in URLs. Only its SHA-256 hash is stored in Orders. Status lookup returns status, timestamps, payment state and total; it excludes contact/address details and item/customer records.
- Pre-upgrade orders have no access code; staff must handle those through existing official support channels. Codes are not retroactively manufactured for historical orders.
- The browser keeps only a hashed attempt signature plus random request ID in sessionStorage. Retrying unchanged details in the same tab, including after refresh, reuses that ID. The backend recovers the saved receipt before validating against today's catalog prices.
- Clearing browser storage, closing the tab or changing order details starts a different attempt. On an uncertain save, keep the same details/tab and retry; contact staff before creating a different order. Secret rotation does not invalidate already-issued codes stored as hashes, but changes the derived code for a retry, so resolve outstanding retries before rotation.

## Delivery validation

Inside Dhaka is accepted only when division is Dhaka and district is Dhaka (English/Bangla supported). Gazipur, Narayanganj or a different division cannot claim the inside-city price. Dhaka district still contains locations outside city coverage: the existing explicit city/outside choice is retained until the owner supplies an authoritative courier coverage map. This upgrade does **not** guess which thana is inside a courier's service zone.

## Rate limits and body limits

- Apps Script persists bounded counters under the script lock, shared by all website instances: 60 new order attempts per 15 minutes globally, 5 per phone per 15 minutes; saved retries bypass order-creation counters. Recovery requests are separately limited to 180/minute, status lookups to 120/minute, admin login to 10/15 minutes. These are starter limits; review them against real traffic before expanding.
- Phone keys are hashed; the bounded property stores at most 80 active buckets and removes expired ones. This is basic application protection, not a replacement for hosting-edge bot/DDoS controls.
- Login retains an additional process-local guard. Shared single-account throttling can temporarily affect all staff; named staff accounts/MFA remain a future authentication change.
- Orders, status, login, admin mutations and variant saves use byte-limited streamed JSON parsing, including requests without Content-Length.

## COD collection

Delivered does not imply Paid. For a delivered COD order, open its detail page → **Record COD Collection** and explicitly confirm the full total with a note. It records one append-only PaymentTransactions COLLECTION and marks payment Paid under the same lock. Duplicate confirmation does not append a second payment. Dashboard shows recorded COD collections separately from order value. Partial collections, returns and refunds are not introduced by this upgrade.

## Daily backups and health

1. Create a **private** Google Drive folder dedicated to spreadsheet backups. Set Script Property `SADIRA_BACKUP_FOLDER_ID` to its ID.
2. Run `backupSadiraSpreadsheet()` once in the editor and verify the copy can be opened. It copies the spreadsheet; uploaded photo bytes are not inside that copy, so back up the photo folder separately.
3. Run `installSadiraBackupTrigger()` explicitly to create a single daily trigger around 03:00 Asia/Dhaka. Re-running does not duplicate the trigger. No outgoing email or message is configured.
4. `/admin/backend` displays missing tables, reconciliation count, last successful backup and last backup failure. Health checks do not create backups and are not an external uptime-alert service.
5. Review Drive storage and choose a retention policy. This code never automatically deletes backups. Rehearse restoring a private copy in a test deployment and reconcile order counts, stock and payment audits.

## Reconciliation markers

`ORDER_FENCE_<requestId>`, `INVENTORY_FENCE_<productId>`, `CATALOG_FENCE_<productId>` and `PAYMENT_FENCE_<orderId>` protect interrupted/uncertain writes. Successfully rolled-back operations clear their markers. Incomplete rollbacks leave them so new stock writes, payment collection or receipt recovery cannot confidently proceed.

Do not simply remove a marker. Back up the sheet; inspect Orders, OrderItems, Products, ProductVariants, InventoryTransactions, Customers and PaymentTransactions against the journal; reconcile a single committed outcome or restore the prior state. Only then clear the corresponding marker in the Apps Script editor and recheck health. An order rollback that cannot complete must not be retried as a new order until reviewed.

## Validation performed locally

Run `npm run test:backend`, `npm run test:admin`, `npm run test:operations`, `npm run test:catalog`, `npm run lint`, and `npm run build`. Browser tests use an isolated simulator and build directory (`npm run test:checkout:browser`, `npm run test:admin:browser`) and never touch `.env.local` or a real Sheet.

Separate future work: named staff roles/MFA, exact courier coverage mapping, courier integrations, partial payments/returns/refunds, external uptime/error alerts and object-storage migration. Google Sheets remains the source of truth; no database subscription was created.
