# Sadira order + inventory backend — Google Apps Script + Google Sheets

```
Browser → POST /api/orders (Next.js server: validates everything, re-reads prices)
        → Apps Script web app (Code.gs: checks secret + payload; under ONE lock checks live
          stock, writes the order, deducts stock, logs the inventory transaction)
        → returns { success, orderId } → success page → optional WhatsApp confirmation

Browser → GET /api/inventory (Next.js server, cached ~30 s) → Apps Script → Products tab
```

The browser never calls Apps Script. The web app URL and the secret live only in the
Next.js **server** environment.

## Where each kind of data lives

| Data | Source of truth |
| --- | --- |
| Product content (names, descriptions, sizes, colours, designs, slugs) | Google Sheets — Catalog |
| Product prices | Google Sheets — Catalog |
| Uploaded photos | Private Google Drive folder; CatalogImages registers the files |
| **Live inventory** (tracked stock, active/inactive) | **Google Sheets — Products** |
| Order history | Google Sheets — Orders / OrderItems |
| Customers | Google Sheets — Customers |
| Inventory audit trail | Google Sheets — InventoryTransactions |

The catalog's `stock` values are used only to **seed** the Products tab the first time
(`setupInventory()`) and as a display fallback when live inventory isn't configured (local
development). They never decide whether an order is accepted.

## Files

For admin product uploads and editing, follow [CATALOG-SETUP.md](CATALOG-SETUP.md).
Deploy `Catalog.gs` and `CatalogSeed.gs` alongside the files below and run `setupCatalog()`.

- `Code.gs` — the web app (orders, inventory, setup functions).
- `InventorySeed.gs` — **generated** by `npm run catalog:prepare` (or `npm run inventory:seed`)
  from the catalog. Holds each product's ID, name and initial stock for `setupInventory()`.
  Don't edit it by hand. Both files go into the same Apps Script project.
- `appsscript.json` — project manifest (timezone Asia/Dhaka, V8, web app settings).

## What Code.gs does

- `doPost(e)` — accepts only JSON from the Sadira server, with the shared secret.
  - **Order** (default action):
    1. Payload shape and arithmetic checks.
    2. Returns the existing Order ID if this `requestId` was already saved (checked before the
       lock and again inside it) — a retry never creates a second order, never deducts stock
       twice and never adds a second inventory transaction or customer increment.
    3. Under a **script lock**: loads the Products tab and checks every product in the order,
       with quantities **summed per product** across sizes/colours/designs (Scarf Design 1 × 2 +
       Design 2 × 3 is checked as 5):
       - `status` not active → `{ "success": false, "code": "PRODUCT_UNAVAILABLE", "productId": … }`
       - tracked and quantity > stock → `{ "success": false, "code": "INSUFFICIENT_STOCK",
         "productId": …, "available": 2 }`
       - untracked → no stock check.
       Nothing is written when a check fails.
    4. Generates the Order ID `SAD-YYYYMMDD-NNNN` (daily sequence, **Asia/Dhaka** date), writes 1
       row to **Orders** and 1 row per product line to **OrderItems** (`SAD-…-0001-01`, …).
    5. Deducts tracked stock (one deduction per product, e.g. 4000 → 3995), updates `updated_at`,
       and writes one **InventoryTransactions** row per product: `INV-000001`, type `SALE`,
       quantity `-5`, `stock_before`, `stock_after`, note `Order placed`.
    6. Creates or updates the **Customer** (matched by normalised phone, `CUS-000001`…).
    If any write fails, **everything is undone**: order, item and transaction rows are removed,
    stock is restored to its previous value and the customer row is restored — and a generic
    `{ "success": false, "error": "Unable to create order." }` is returned. Never a fake success.
  - **Inventory** (`{ "action": "inventory" }`): returns `productId`, `trackStock`, `stock`,
    `status`, `updatedAt` for every Products row (no row numbers or sheet details).
- Sets `payment_method = COD`, `payment_status = Pending`, `order_status = Pending`,
  `whatsapp_confirmation = Pending` itself (the website can't set them).
- `doGet()` — health check: `{ "ok": true, "service": "sadira-orders" }` (no data).
- `setup()` — creates the tabs and headers and sets the sheet timezone.
- `setupInventory()` — adds a Products row for each catalog product that doesn't have one yet
  (see below). **Never changes an existing row.**
- Both setup functions are safe to re-run: they never delete, clear or reorder; missing headers
  are appended at the end, and rows are written by header name, so staff can add columns.
- All text is stored as plain text (leading `'`), which keeps `+8801…` phones intact and stops
  customer text beginning with `=`, `+`, `-`, `@` from running as a formula.

Tabs: **Orders**, **OrderItems**, **Customers**, **Products**, **InventoryTransactions**, and
**Coupons** (created empty, reserved for a later phase).

## Setup (do this with a TEST spreadsheet first)

1. Create a Google Sheet, e.g. **"Sadira Orders — TEST"**.
2. In the Sheet: **Extensions → Apps Script**.
3. Replace the contents of `Code.gs` with this folder's `Code.gs`. Then **+ (Add a file) →
   Script**, name it `InventorySeed`, and paste this folder's `InventorySeed.gs`.
4. **Project Settings** (gear icon):
   - Time zone: **(GMT+06:00) Dhaka** — or enable "Show appsscript.json" and paste this folder's
     `appsscript.json`.
   - **Script properties → Add**:
     - `APPS_SCRIPT_SECRET` = a long random value (at least 16 characters), e.g. from
       `node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"`
     - `SPREADSHEET_ID` — only if the script is **not** bound to the Sheet (the ID is the long
       part of the Sheet URL between `/d/` and `/edit`). A script opened via Extensions → Apps
       Script is bound, so leave it out.
5. **Run the existing setup:** choose `setup` → **Run** → approve the permissions. The tabs and
   headers appear.
6. **Run the inventory setup:** choose `setupInventory` → **Run**. The execution log says how
   many products were added.
7. **Check the Products tab:**
   - one row per catalog product;
   - known stock is tracked: `SAD-SCARF-001` → `track_stock TRUE`, `stock 4000`;
     `SAD-SUNGLASS-001` → `TRUE`, `12`;
   - every product with unknown stock has `track_stock FALSE` and a **blank** stock (blank is
     "not tracked" — it is **not** 0; 0 means sold out).
8. **Deploy → New deployment → Select type: Web app**:
   - Execute as: **Me** (the owner of the Sheet)
   - Who has access: **Anyone** — needed so the Next.js server can call it without a Google
     login. The shared secret is what protects it; without the right secret every request is
     rejected and nothing is written or returned.
9. **Deploy**, then copy the **Web app URL** (ends in `/exec`). Opening it in a browser should
   show `{"ok":true,"service":"sadira-orders"}`.
10. In the Next.js server environment (`.env.local` locally, or the hosting provider's settings):
    ```
    APPS_SCRIPT_ORDER_URL=https://script.google.com/macros/s/…/exec
    APPS_SCRIPT_SECRET=<the same value as the Script property>
    DELIVERY_CHARGE_INSIDE_DHAKA=<real Inside Dhaka charge, whole taka>
    DELIVERY_CHARGE_OUTSIDE_DHAKA=<real Outside Dhaka charge, whole taka>
    ```
    Restart the Next.js server. Live stock appears on the site once the URL and secret are set.
    **Place Order** is live only when the URL, the secret **and both** delivery charges are set —
    a blank charge is "not configured", never ৳0.
11. Place test orders and check the TEST sheet: 1 Orders row, 1 row per item, customer row,
    the tracked product's stock reduced, and one `SALE` row in InventoryTransactions.

### Going live

Repeat steps 1–9 with the real **"Sadira Orders"** spreadsheet (its own secret is best), then
change `APPS_SCRIPT_ORDER_URL` and `APPS_SCRIPT_SECRET` in the **production** server environment
only. Keep development pointed at the TEST deployment so no fake orders reach the real sheet and
no real stock is deducted by tests. Before launch, set the real starting stock in the live
Products tab (see below).

### Updating Code.gs later

Edit the code, then **Deploy → Manage deployments → Edit (pencil) → Version: New version →
Deploy**. This keeps the same URL. (A "New deployment" gets a new URL.)

### Adding products later

Add the product to the catalog, run `npm run catalog:prepare` (regenerates `InventorySeed.gs`),
paste the new `InventorySeed.gs` into the Apps Script project and run `setupInventory()` again.
Only the new product gets a row; existing stock is untouched. Until it has a row, a product is
treated as **untracked** (orders aren't stock-checked; a warning is logged).

## Managing inventory in the Products tab

| Column | Meaning |
| --- | --- |
| `track_stock` | `TRUE` = the website enforces `stock`. `FALSE` = stock is unknown / not tracked. |
| `stock` | Units available (whole number ≥ 0) when tracked. Blank when not tracked. |
| `status` | `active` (or blank) = can be ordered. `inactive` = new orders are rejected; the product stays on the site marked "Currently Unavailable". Any other text (typos) also counts as unavailable. |
| `updated_at` | Set by the script when an order changes the stock (Bangladesh time). |

**Do not change stock without understanding the effect.** Every order reads and deducts this
cell. Setting it lower can make orders fail; setting it higher allows more orders; a tracked
product with a blank or invalid stock **cannot be ordered at all**. Manual edits are **not**
logged in InventoryTransactions — note restocks/corrections somewhere (a transaction type for
them is planned). Avoid editing a product's row at the exact moment orders are coming in.

Never delete rows from InventoryTransactions — it is the audit trail.

## Managing orders (for now)

The Sheet is the admin panel. Staff update `order_status` (Pending → Confirmed → Processing →
Shipped → Delivered, or Cancelled), `payment_status`, and `whatsapp_confirmation` (set to
"Received" manually when the customer's WhatsApp message arrives — the website can't know
whether the customer pressed Send).

**Changing an order status manually does not alter stock.** Setting `order_status` to
`Cancelled` does **not** put the items back into stock — manual cell edits can't safely drive
inventory. If a cancelled order's stock must return, adjust the Products `stock` by hand (and
note it). Controlled cancellation/restocking is planned for a later phase.

## Security rules

- Never put the secret in a `NEXT_PUBLIC_*` variable, client code, logs or the repository.
- If the secret leaks: change the Script property **and** the server env var together.
- Apps Script errors are logged in **Executions** (Apps Script editor) — the website only ever
  receives a generic error or a stock code (`INSUFFICIENT_STOCK` / `PRODUCT_UNAVAILABLE`).

## Current limitations

- Restocks, corrections and cancellations are manual Products edits and aren't logged as
  transactions yet.
- Coupons/discounts are not implemented (`discount` is always 0).
- Very high order volumes would make the per-order column scans slower; fine for normal
  boutique volumes.

## Phase 12: order operations and safe cancellation

**Changing Orders.order_status manually does NOT restore stock.** Manual editing is
only a text change. There is no onEdit stock trigger. A manually cancelled order is
returned as already cancelled without inventory writes, even if restock_status is blank.
Do not change a cancelled order back to an active status. Recovery requires auditing.

Run `setup()` to append the five Orders columns (`status_updated_at`, `status_note`,
`cancelled_at`, `cancel_reason`, `restock_status`) and create OrderStatusHistory. Existing
rows are preserved; blank historical restock_status is interpreted as Not Required.
New orders start Pending / Not Required. Deploy the updated Code.gs web app to use
the new authenticated actions; retain the existing shared server secret.

Allowed statuses: Pending, Confirmed, Processing, Shipped, Delivered, Cancelled.
`updateOrderStatus(orderId, newStatus, note)` permits only the next forward step:
Pending → Confirmed → Processing → Shipped → Delivered. Notes are optional, max 300
characters. Cancelled must use the separate `cancelOrder(orderId, reason)` function.
A reason is required (3 trimmed characters minimum, 300 characters maximum).

Both mutations hold the same LockService script lock as order creation. Cancellation:
find order → reject Shipped/Delivered → return existing Cancelled safely → read items
and SALE audit → sum quantities across variants → persist Pending safety fence →
restore currently tracked products that actually had a matching SALE deduction →
append one positive RESTOCK per product with order_id → append status history →
write cancellation reason/time and Restored (or Not Required if nothing was deducted).
Inactive products still regain their deducted stock; their availability status is unchanged.
Changing an originally untracked product to tracked does not create an unearned credit.
Missing sold products, invalid stock/quantities, audit mismatch, or prior RESTOCK rows
fail closed. Do not delete or alter SALE/RESTOCK audit records.

Successful InventoryTransactions records are append-only. Rollback removes only new
uncommitted rows from the failed operation; existing audit rows are never rewritten.
Google Sheets is not a transactional database: undo snapshots are registered before
writes, including writes that take effect then throw. On failure, reverse new audit rows
and stock writes, preserve the original order status, and set restock_status Failed.
Pending/Failed blocks cancellation and progression until an operator reconciles the
original SALEs, current stock, any RESTOCKs, and status history. Even a successful
rollback leaves Failed for explicit review. If rollback or the failure marker cannot be
written, Pending serves as the durable fence. A runtime terminated after commit must
also be reconciled if it left Pending. Never clear this fence merely to retry.

Responses contain only success, orderId, status, restockStatus, or safe error code/message.
Errors include ORDER_NOT_FOUND, INVALID_STATUS_TRANSITION, ORDER_ALREADY_CANCELLED
(status updates), ORDER_ALREADY_SHIPPED, RESTOCK_FAILED, INVALID_INPUT, BUSY, and
STATUS_UPDATE_FAILED. Repeated cancellation returns success with the saved cancelled
state and writes no additional stock, RESTOCK, or history rows.

### Staff editor helpers

In a development Sheet, replace `REPLACE_WITH_ORDER_ID` in `testUpdateOrderStatus()`
or `testCancelOrder()` with an order from that Sheet and run it in the Apps Script editor.
The placeholders fail validation unchanged. Do not commit real order IDs. For normal
progression, adjust the test target status to the next allowed value. Inspect the function
return value/execution log, Orders, OrderStatusHistory, and InventoryTransactions filtered
by order_id. Sequential OSH-/INV- IDs are generated under lock.

There is no public Next.js mutation route. `services/orderOperations.ts` is internal and
server-only, ready for a future authorized admin caller. It calls the authenticated Apps
Script actions and invalidates the existing Next.js inventory cache after cancellation.
Editor calls bypass Next.js and thus rely on its existing 30-second refresh; they cannot
invalidate another process's memory. Cache invalidation shares the Phase 11 process-local
scope. No new browser admin actions or secrets were introduced.

### Low stock and opt-in reporting

`LOW_STOCK_THRESHOLD = 5` is centralized in Code.gs. `getLowStockProducts()` (also an
authenticated action) reports tracked products with valid stock 1–5 as Low Stock and 0
as Out of Stock. It includes inactive tracked products so operations can audit them too.
It returns only product_id, product_name, stock, status, updated_at; untracked and invalid
stock rows are excluded. No separate LowStock source of truth or report sheet is created.

`sendLowStockReport()` requires an explicitly configured Script Property
`LOW_STOCK_REPORT_EMAIL`; without it the function throws before sending email.
No email is sent by order/cancellation actions and no scheduled trigger is installed.
To opt in later, configure the recipient, manually run the report and grant MailApp
permission, then add a time-driven trigger for sendLowStockReport in the Apps Script
Triggers editor. Remove that trigger to disable scheduled email.

### Local validation

`npm run test:operations` uses an in-memory Sheets/LockService simulator (no Google
requests, customer data, emails, or environment changes). It checks forward/backward
transitions, cancellation at eligible stages, shipping rejection, duplicate cancellation,
tracked/untracked/mixed orders, variant aggregation, history IDs, RESTOCK fields,
write-then-fail rollback at stock/audit/history/order stages, manual status editing,
reason bounds, changed tracking, low-stock fields, and actual server cache invalidation.
A real deployment still needs operator validation of Google permissions and deployment.

## Phase 13 — Admin actions

**Apps Script actions should not be called manually from the browser.** The admin browser
uses protected Next.js routes; Next.js verifies its eight-hour staff session before sending
a request here. Every doPost action still requires the existing APPS_SCRIPT_SECRET.
The login credentials/session signing secret live only in Next.js server environment
variables; they are not Script Properties and never reach this web app or the browser.

Deploy the updated Code.gs using the existing web app settings, and run setup() to ensure
all Phase 12 tabs/headers exist. Admin reads take the script lock to avoid observing partial
order or stock writes. Products remains the inventory source of truth; live catalog
names/categories are joined only on the Next.js server.

### Payloads

All payloads below also include `{ secret: APPS_SCRIPT_SECRET }` supplied by Next.js.
Responses use `{ success: true, data: ... }` for reads and safe codes/messages for failures.

| action | additional fields | result |
| --- | --- | --- |
| adminGetDashboard | none | today (Dhaka), nine metrics, ten recent orders |
| adminListOrders | page, q, status, sort | rows, total, page, pageSize |
| adminGetOrder | orderId | order, items, history, transactions, hasTrackedItems |
| adminListInventory | page, q, filter | paginated live Products rows |
| adminListTransactions | page | paginated InventoryTransactions, newest first |
| adminListCustomers | page, q | paginated supplied customer contact fields |
| adminUpdateOrderStatus | orderId, newStatus, note | reuses updateOrderStatus |
| adminCancelOrder | orderId, reason | reuses cancelOrder |
| adminAdjustStock | productId, stock, reason, expectedStock, expectedTracking, expectedStatus | audited absolute stock change |
| adminSetProductStatus | productId, status, expectedStock, expectedTracking, expectedStatus | active/inactive |
| adminSetTracking | productId, trackStock, stock (when enabling), reason, expectedStock, expectedTracking, expectedStatus | tracking on/off |

The Next.js order mutation endpoint uses the existing updateOrderStatus/cancelOrder service
functions directly; admin-prefixed aliases are available here and share the same logic.
List pages contain 25 records, with out-of-range page numbers clamped. Order filters use
exact Phase 12 statuses. Order sorts: newest (default), oldest, total-high, total-low. Search
is capped at 100 characters. Inventory filters: low (1–5), out (0), tracked, or all when
omitted. The low/out selections reuse getLowStockProducts and LOW_STOCK_THRESHOLD.
Customers search by customer_id/name/phone; order lists omit full address/email/request_id.
Only the protected detail view loads full supplied order/customer/delivery details.

Today uses Asia/Dhaka timestamps. Today Revenue sums today's non-Cancelled order totals;
status cards count all-time orders. Sheets rows are scanned server-side to compute filters
and metrics; only paginated operational fields are sent to the browser.

### Stock edits, tracking, and failure safety

Every product mutation holds the same LockService script lock as orders/cancellation and
compares the supplied expected stock/tracking/status with the latest row. A mismatch returns
INVENTORY_CHANGED so operators refresh rather than overwrite concurrent sales or edits.
Stock must be a safe integer >= 0. Reasons are 3 trimmed characters minimum, 300 maximum.
Untracked products reject direct stock adjustment. Enabling tracking requires an initial
stock count and records its difference from zero (or current tracked stock) as an adjustment.
Disabling tracking retains the last stock cell and all audit history; storefront stock is null.
If stock is unchanged, there is no inventory movement and no zero-quantity audit record.

10 -> 15 writes ADJUSTMENT_IN +5, stock_before=10, stock_after=15. 15 -> 12 writes
ADJUSTMENT_OUT -3, stock_before=15, stock_after=12. Manual adjustments have blank order_id,
and the supplied reason appears in the note. Never change or delete existing audit records.
Availability changes do not affect stock and are rejected by checkout when inactive.

Before a product write, a durable INVENTORY_FENCE_<product_id> Script Property records
the action/before/after/time. Success flushes stock and audit writes before removing it.
Write failures roll back the product and any new uncommitted transactions. A completed
rollback removes the fence; an interrupted execution or incomplete rollback retains it.
Fenced products are treated as inactive by live inventory/checkout, shown as needing
reconciliation in admin, and cannot receive another admin edit or cancellation credit.

Recovery is an editor-only operator procedure: inspect the fence, Products stock/status/
tracking, transaction IDs, timestamps, and the attempted before/after movement; verify that
all corresponding stock/audit effects are consistently committed or consistently reverted.
Correct any inconsistent effects with an audited operational recovery, then remove that
specific Script Property only after reconciliation. Never clear a fence just to retry.
This phase does not provide a browser recovery override. Script Properties have storage
quotas; stale fences must be reconciled rather than accumulated.

Errors include INVALID_INPUT, PRODUCT_NOT_FOUND, UNTRACKED_PRODUCT, INVENTORY_CHANGED,
ADJUSTMENT_FAILED, BUSY, ADMIN_LOAD_FAILED, and the existing Phase 12 order codes.
Next.js maps failures to clear text and does not expose exceptions or customer payloads.
The simulator/browser harness exercises these actions without a real Google deployment.
