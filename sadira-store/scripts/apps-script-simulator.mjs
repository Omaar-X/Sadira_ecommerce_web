import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
const source = fs.readFileSync('google-apps-script/Code.gs', 'utf8') + '\n' + fs.readFileSync('google-apps-script/Catalog.gs', 'utf8') + '\n' + fs.readFileSync('google-apps-script/CatalogSeed.gs', 'utf8');
export function fixture() {
  let fail = null, held = false;
  const properties = {};
  const props = { getProperty:key=>properties[key] ?? null, getProperties:()=>({...properties}), setProperty(key,value){properties[key]=value;}, deleteProperty(key){delete properties[key];} };
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows[0]?.length || 0; }
    setFrozenRows() {}
    deleteRows(row, count) { this.rows.splice(row - 1, count); }
    getRange(row, col, height, width) {
      return {
        getValues: () => Array.from({length:height}, (_, i) => Array.from({length:width}, (_, j) => this.rows[row+i-1]?.[col+j-1] ?? '')),
        setValues: values => {
          if (row > 1) assert.equal(held, true, 'writes must hold script lock');
          for (let i=0;i<height;i++) { this.rows[row+i-1] ||= []; for(let j=0;j<width;j++) { const v=values[i][j]; this.rows[row+i-1][col+j-1] = typeof v==='string' && v.startsWith("'") ? v.slice(1) : v; } }
          if (fail === this.name && row > 1) { fail=null; throw Error('write then fail'); }
        },
      };
    }
  }
  const sheets = {};
  const ss = { getSheetByName:n=>sheets[n], insertSheet:n=>sheets[n]=new Sheet(n), setSpreadsheetTimeZone(){} };
  const ctx = vm.createContext({ Date, ContentService:{ MimeType:{JSON:'application/json'}, createTextOutput:text=>({text,setMimeType(){return this;}})}, console:{log(){},warn(){},error(){}}, PropertiesService:{getScriptProperties:()=>props}, SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}}, Utilities:{formatDate:()=> '2026-09-30 23:00:00',getUuid:()=>randomUUID(),base64Decode:s=>Array.from(Buffer.from(s,'base64')),base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name,getBytes:()=>bytes})}, LockService:{getScriptLock:()=>({tryLock(){ assert.equal(held,false); held=true; return true; },releaseLock(){held=false;}})} });
  vm.runInContext(source,ctx);
  ctx.setup();
  const t=ctx.ensureSheets_(ss);
  function add(tab, records) { held=true; ctx.appendRows_(t[tab],records); held=false; }
  add('Products',[{product_id:'P',product_name:'Scarf',track_stock:true,stock:10,status:'active'},{product_id:'U',product_name:'Abaya',track_stock:false,stock:''}]);
  const id='SAD-20260930-0020';
  add('Orders',[{order_id:id,order_status:'Pending',restock_status:'Not Required'}]);
  add('OrderItems',[{order_id:id,product_id:'P',quantity:2}]);
  add('InventoryTransactions',[{transaction_id:'INV-000001',order_id:id,product_id:'P',type:'SALE',quantity:-2}]);
  return {ctx,t,id,add,props,rows:tab=>ctx.records_(t[tab]),fail:tab=>{fail=tab;},set:(tab,fields)=>{held=true;ctx.updateRow_(t[tab],2,fields);held=false;}};
}

export function catalogFixture() {
  const f = fixture();
  const files = new Map();
  const folderId = 'sadira-test-folder';
  const folder = { getId: () => folderId, createFile(blob) {
    const id = 'file-' + randomUUID();
    let trashed = false;
    const file = { getId: () => id, getMimeType: () => blob.mime, getBlob: () => blob, getSize: () => blob.bytes.length,
      isTrashed: () => trashed, setTrashed: value => { trashed = value; }, getParents: () => { let read = false; return { hasNext: () => !read, next: () => { read = true; return folder; } }; } };
    files.set(id, file); return file;
  } };
  f.ctx.DriveApp = { createFolder: () => folder, getFolderById: () => folder, getFileById: id => { if (!files.has(id)) throw Error('File not found'); return files.get(id); } };
  f.ctx.setupCatalog();
  return { ...f, files };
}
