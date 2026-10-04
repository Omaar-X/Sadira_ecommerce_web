# Connect admin product uploads to Google Sheets

The code is complete locally. Publishing real products requires the store owner's Google account and the deployment configuration below. Do not put passwords or the shared secret in chat, public files, or `NEXT_PUBLIC_*` variables.

## One-time Google setup

1. Open the store's Google Sheet, then **Extensions → Apps Script**.
2. Add/update these files from this folder: `Code.gs`, `InventorySeed.gs`, `Catalog.gs`, and `CatalogSeed.gs`. Keep any existing project files. `CatalogSeed.gs` contains the current 12 products, including the recent additions.
3. In **Project Settings → Script properties**, set `APPS_SCRIPT_SECRET` to a random secret of at least 32 characters. A bound script uses its current spreadsheet. An unbound script also needs `SPREADSHEET_ID`.
4. Run `setupCatalog()` in the editor and grant the requested Sheets and Drive permissions. It adds `Catalog` and `CatalogImages` tabs, adds missing inventory rows, and creates a private **Sadira Product Images** Drive folder. Existing catalog edits and live inventory are preserved. The folder ID is saved automatically as `PRODUCT_IMAGE_FOLDER_ID`.
5. Deploy as a **Web app**, executing as **Me**, accessible to **Anyone**. For an existing deployment, select **Manage deployments → Edit → New version → Deploy** to keep the same URL. Access to data still requires the shared secret; the website alone sends that secret from its server.

## Website configuration

Set these in `.env.local` for local use and in the hosting provider's server environment for the deployed site:

```dotenv
APPS_SCRIPT_ORDER_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_SECRET=YOUR_PRIVATE_SHARED_SECRET
ADMIN_USERNAME=YOUR_ADMIN_USERNAME
ADMIN_PASSWORD=YOUR_PRIVATE_PASSWORD_AT_LEAST_12_CHARACTERS
ADMIN_SESSION_SECRET=YOUR_PRIVATE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

Use the same `APPS_SCRIPT_SECRET` as the Script Property. Existing delivery-charge settings remain necessary for placing orders. Restart the local server or deploy the website once after setting these values. Afterwards, product uploads and edits do **not** require another website deployment.

## Use the admin panel

Open `/admin/login`, sign in, then **Products → Add product**. Select photos from your phone or computer; enter name, category, price, optional offer price, description, details, sizes and colors. Choose **Published** to show the product or **Draft** to keep it hidden, then **Save product**. The first photo is the cover; arrows reorder photos. Optional design names create selectable photo variants. Existing products have an **Edit product** button. Page addresses remain stable when editing.

Photos accept JPEG, PNG and WebP up to 20 MB before browser resizing. The browser scales to at most 1600 px and uploads each photo separately at up to 1 MB; up to 10 photos per product. Export unsupported HEIC photos to JPEG first. Photos are stored privately in Drive and served by `/api/catalog/images/<id>`; the Drive folder must not be made public. Registered product-photo URLs can be viewed by site visitors, including draft photos whose URL is known.

New products can start with tracked stock. Later stock changes use **Set Stock** / **Tracking On/Off**, with the existing inventory history. Editing content never resets stock. Both product saving and checkout use the script lock. Checkout checks current price and variants again under that lock, rejecting a concurrent catalog change before any order or stock write.

When Sheets is unconfigured, the existing local catalog continues to display and upload/save controls are disabled. When configured but unavailable, the site does not silently use old catalog prices. Product pages, shop listings and the home page load the live catalog per request.

## Verify after connecting

Upload a temporary product as Draft, refresh the editor, check its photos and details, then publish it. Open its product link and find it in Shop. Change its price and verify the new amount after refreshing. Save it as Draft again and confirm the public page is hidden. Confirm the existing stock counts have not changed.

Local automated checks: `npm run test:catalog`, `npm run test:catalog:browser`, `npm run test:admin`, `npm run test:operations`, and `npm run build`. Browser tests use a simulated spreadsheet and Drive, never the real account. Set `PLAYWRIGHT_MODULE` to the bundled Playwright package if it is not installed locally.

## Operational notes

Sheets and Apps Script quotas apply; serving photos through Apps Script is suitable for an initial small store. If traffic grows, move photo storage to an image CDN/object store. Unused uploaded photos are retained so removing a photo from one listing cannot break another listing that references it; review unused files before deleting them.

If a write fails, the script rolls back both content and inventory. An interrupted write or failed rollback leaves a `CATALOG_FENCE_<productId>` or `INVENTORY_FENCE_<productId>` Script Property. Inspect the relevant Catalog, Products and inventory-history records before manually removing a fence; do not clear it without reconciliation. This intentionally blocks unsafe sales. For a catalog fence, its JSON contains the intended product and revision; reconcile the Catalog content and Products availability together, preserving the actual live stock, then remove the fence.

Do not edit the `product_json` cells by hand; use the admin editor. The other Catalog columns are indexing/revision fields maintained by the script.
