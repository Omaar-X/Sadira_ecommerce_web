import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { fixture } from './apps-script-simulator.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const f=fixture();
const catalog=JSON.parse(fs.readFileSync('data/products.generated.json','utf8'));
const tracked=catalog.find(p=>p.stock!==null);
const productId=tracked.id;
f.set('Products',{product_id:productId,product_name:tracked.name});
f.set('OrderItems',{product_id:productId,product_name:tracked.name,category:tracked.category,unit_price:600,line_total:1200});
f.set('InventoryTransactions',{product_id:productId,stock_before:12,stock_after:10,created_at:'2026-09-30 22:00:00'});
f.set('Orders',{created_at:'2026-09-30 22:00:00',customer_name:'Simulator Customer',phone:'+8801700000000',payment_method:'COD',payment_status:'Pending',subtotal:1200,total:1260,delivery_charge:60,discount:0,full_address:'Simulator test address',division:'Dhaka',district:'Dhaka',area:'Test area',delivery_area:'Inside Dhaka'});
f.add('Customers',[{customer_id:'CUS-000001',name:'Simulator Customer',phone:'+8801700000000',email:'simulator@example.test',total_orders:1,first_order_at:'2026-09-30 22:00:00',last_order_at:'2026-09-30 22:00:00'}]);
for(let i=30;i<60;i++)f.add('Orders',[{order_id:`SAD-20260929-00${i}`,created_at:'2026-09-29 10:00:00',customer_name:'Older simulator order',phone:'+8801700000000',total:500,order_status:'Delivered',payment_method:'COD',payment_status:'Pending'}]);
const secret=randomBytes(32).toString('hex');
f.props.setProperty('APPS_SCRIPT_SECRET',secret);
const mock=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req) raw+=chunk;
 try{const response=f.ctx.doPost({postData:{contents:raw}});res.setHeader('Content-Type','application/json');res.end(response.text);}catch{res.statusCode=500;res.end('{}');}
});
await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:3113';
const username='simulator-operator';const password=randomBytes(24).toString('hex');const sessionSecret=randomBytes(32).toString('hex');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3113'],{windowsHide:true,env:{...process.env,NODE_ENV:'development',ADMIN_USERNAME:username,ADMIN_PASSWORD:password,ADMIN_SESSION_SECRET:sessionSecret,APPS_SCRIPT_ORDER_URL:`http://127.0.0.1:${mock.address().port}`,APPS_SCRIPT_SECRET:secret,DELIVERY_CHARGE_INSIDE_DHAKA:'60',DELIVERY_CHARGE_OUTSIDE_DHAKA:'120'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',data=>{output+=data;});child.stderr.on('data',data=>{output+=data;});
let browser;
const post=(action,body,headers={})=>fetch(origin+'/api/admin/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
async function ready() { for(let i=0;i<80;i++){try{const r=await fetch(origin+'/admin/login');if(r.ok)return;}catch{}if(child.exitCode!==null)throw Error(output.slice(-3000));await new Promise(r=>setTimeout(r,500));}throw Error('Test server failed to start: '+output.slice(-3000)); }
try {
 await ready();
 for(const path of ['/admin','/admin/orders','/admin/orders/'+f.id,'/admin/products','/admin/inventory','/admin/customers']){
  const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,307);assert.equal(new URL(r.headers.get('location'),origin).pathname,'/admin/login');
 }
 for(const action of ['updateOrderStatus','cancelOrder','adminAdjustStock','adminSetProductStatus','adminSetTracking']) assert.equal((await post('mutate',{action,orderId:f.id,productId})).status,401);
 assert.equal((await post('login',{username:'wrong',password})).status,401);
 assert.equal((await post('login',{username,password:'wrong'})).status,401);
 assert.equal((await post('login',{username,password},{origin:'https://evil.test'})).status,403);
 console.log('PASS HTTP protected routes, all unauthenticated mutations and invalid login');
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/admin/login');await page.getByLabel('Username').fill(username);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(origin+'/admin');await page.getByRole('heading',{name:'Recent orders'}).waitFor();
 const cookie=(await context.cookies()).find(c=>c.name==='sadira-admin');assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'Strict');
 assert.equal(await page.locator('a[href="/shop"]').count(),0,'no storefront navbar in admin');
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/admin-desktop.png',fullPage:true});
 const headers={cookie:`sadira-admin=${cookie.value}`};
 assert.equal((await post('mutate',{action:'cancelOrder',orderId:f.id,reason:'Customer request'},{...headers,origin:'https://evil.test'})).status,403);
 assert.equal((await fetch(origin+'/api/admin/mutate',{headers})).status,405);
 await page.goto(origin+'/admin/orders');await page.getByRole('link',{name:'Next →'}).click();await page.waitForURL(/page=2/);assert.equal(await page.locator('tbody tr').count(),6);
 await page.goto(origin+'/admin/orders/'+f.id);await page.getByRole('button',{name:'Confirm Order',exact:true}).click();assert.equal(f.rows('Orders')[0].order_status,'Pending');await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(f.rows('Orders')[0].order_status,'Pending');
 await page.getByRole('button',{name:'Confirm Order',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await page.getByRole('button',{name:'Mark Processing',exact:true}).waitFor();assert.equal(f.rows('Orders')[0].order_status,'Confirmed');assert.equal(f.rows('Products')[0].stock,10);assert.equal(f.rows('OrderStatusHistory').length,1);
 await page.getByRole('button',{name:'Cancel Order',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();assert.equal(f.rows('Orders')[0].order_status,'Confirmed');await page.getByLabel('Cancellation Reason').fill('Customer requested cancellation');await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await page.getByText('Order cancelled successfully. Stock restored.',{exact:true}).waitFor();assert.equal(f.rows('Products')[0].stock,12);assert.equal(f.rows('InventoryTransactions').filter(tx=>tx.type==='RESTOCK').length,1);
 assert.equal((await (await post('mutate',{action:'cancelOrder',orderId:f.id,reason:'Duplicate cancellation'},headers)).json()).success,true);assert.equal(f.rows('Products')[0].stock,12);
 await page.goto(origin+'/admin');await page.getByRole('heading',{name:'Recent orders'}).waitFor();const metrics=await page.locator('.admin-metric').allTextContents();assert.equal(metrics.find(text=>text.startsWith('Today Revenue')).includes('0'),true);
 console.log('PASS UI confirmations, reason validation, progression, cancellation, one restock and updated counts');
 await page.goto(origin+'/admin/products?q='+productId);await page.getByRole('button',{name:'Set Stock',exact:true}).click();await page.getByLabel('New stock').fill('15');await page.getByLabel('Adjustment reason').fill('New stock received');await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await page.getByText('Stock adjusted.',{exact:true}).waitFor();assert.equal(f.rows('Products')[0].stock,15);assert.equal(f.rows('InventoryTransactions').at(-1).type,'ADJUSTMENT_IN');assert.equal(f.rows('InventoryTransactions').at(-1).quantity,3);
 await page.reload();await page.getByRole('button',{name:'Set Stock',exact:true}).click();await page.getByLabel('New stock').fill('12');await page.getByLabel('Adjustment reason').fill('Physical count correction');await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await page.getByText('Stock adjusted.',{exact:true}).waitFor();assert.equal(f.rows('InventoryTransactions').at(-1).type,'ADJUSTMENT_OUT');assert.equal(f.rows('InventoryTransactions').at(-1).quantity,-3);
 await page.reload();await page.getByRole('button',{name:'Set Inactive',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await page.getByRole('button',{name:'Set Active',exact:true}).waitFor();const inv=await (await fetch(origin+'/api/inventory')).json();assert.equal(inv.products.find(p=>p.productId===productId).status,'inactive');
 await page.goto(origin+'/product/'+tracked.slug);await page.getByRole('button',{name:'Currently Unavailable',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Currently Unavailable',exact:true}).isDisabled(),true);
 const unitPrice=tracked.salePrice!==null && tracked.salePrice<tracked.price?tracked.salePrice:tracked.price;
 const orderResponse=await fetch(origin+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'simulator-unavailable-order',mode:'cart',form:{name:'Simulator Customer',phone:'01700000000',alternativePhone:'',email:'simulator@example.test',division:'Dhaka',district:'Dhaka',area:'Test area',address:'Simulator test address',postalCode:'',deliveryArea:'inside-dhaka',paymentMethod:'cod',note:''},items:[{productId,quantity:1,displayedUnitPrice:unitPrice,size:tracked.sizes[0]||null,color:tracked.colors[0]||null,design:tracked.designs[0]?.label||null}]})});assert.equal((await orderResponse.json()).code,'PRODUCT_UNAVAILABLE');
 await page.goto(origin+'/admin/products?q='+productId);
 await page.getByRole('button',{name:'Set Active',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await page.getByRole('button',{name:'Set Inactive',exact:true}).waitFor();assert.equal(f.ctx.readInventory_().products[0].status,'active');
 assert.equal((await (await post('mutate',{action:'adminAdjustStock',productId,stock:4,reason:'Low stock verification',expectedStock:12,expectedTracking:true,expectedStatus:'active'},headers)).json()).success,true);
 await page.goto(origin+'/admin/inventory');await page.locator('.admin-card').first().getByText(productId,{exact:true}).waitFor();assert.equal(await page.locator('.admin-card').first().getByText('Low Stock',{exact:true}).count()>0,true);
 assert.equal((await (await post('mutate',{action:'adminAdjustStock',productId,stock:0,reason:'Out of stock verification',expectedStock:4,expectedTracking:true,expectedStatus:'active'},headers)).json()).success,true);
 await page.goto(origin+'/admin/inventory?filter=out');await page.locator('.admin-card').first().getByText(productId,{exact:true}).waitFor();
 await page.goto(origin+'/product/'+tracked.slug);await page.getByRole('button',{name:'Out of Stock',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Out of Stock',exact:true}).isDisabled(),true);
 console.log('PASS UI stock adjustment audit, product availability and cache invalidation');
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/admin','/admin/orders','/admin/orders/'+f.id,'/admin/products','/admin/inventory','/admin/customers']){
  await page.goto(origin+path);await page.locator('.admin-main h1').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile overflow '+path);
 }
 await page.getByRole('button',{name:'Open menu',exact:true}).click();assert.equal(await page.getByRole('navigation',{name:'Admin navigation'}).isVisible(),true);await page.getByRole('button',{name:'Close navigation',exact:true}).click();
 await page.goto(origin+'/admin/products?q='+productId);await page.getByRole('button',{name:'Set Stock',exact:true}).click();assert.equal(await page.getByRole('dialog').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'test-results/admin-mobile-stock-modal.png',fullPage:true});await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 // Re-enable an eligible status only in the simulator fixture to inspect the mobile status modal.
 f.set('Orders',{order_status:'Pending',restock_status:'Not Required'});await page.goto(origin+'/admin/orders/'+f.id);await page.getByRole('button',{name:'Confirm Order',exact:true}).click();await page.screenshot({path:'test-results/admin-mobile-status-modal.png',fullPage:true});await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Logout',exact:true}).click();await page.waitForURL(origin+'/admin/login');assert.equal((await context.cookies()).some(c=>c.name==='sadira-admin'),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'test-results/admin-mobile-login.png',fullPage:true});
 const now=Date.now();const payload=Buffer.from(JSON.stringify({issued:now-9*60*60*1000,expires:now-60*60*1000,version:'expired',nonce:'test'})).toString('base64url');const expired=payload+'.'+createHmac('sha256',sessionSecret).update(payload).digest('base64url');
 await context.addCookies([{name:'sadira-admin',value:expired,url:origin}]);assert.equal((await fetch(origin+'/admin/orders',{headers:{cookie:'sadira-admin='+expired},redirect:'manual'})).status,307);await context.clearCookies();
 await page.goto(origin+'/');await page.locator('header').first().waitFor();assert.equal(await page.locator('.admin-shell').count(),0);assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS 390px admin pages/menu/modals/login, logout, expired session and storefront shell');
} finally {
 if(browser)await browser.close();
 if(child.exitCode===null){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{}}else child.kill('SIGTERM');}
 await new Promise(resolve=>mock.close(resolve));
}
