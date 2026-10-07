(function(root){
'use strict';
const MAX_DEPTH=64;
function sanitize(value,ancestors=new WeakSet(),depth=0){
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value==='undefined'||typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')return undefined;
  if(typeof value!=='object')return undefined;
  if(depth>=MAX_DEPTH)return undefined;
  if(value instanceof Date)return Number.isNaN(value.getTime())?null:value.toISOString();
  if(ancestors.has(value))return undefined;
  ancestors.add(value);
  let out;
  if(Array.isArray(value)){
    out=value.map(item=>{
      const clean=sanitize(item,ancestors,depth+1);
      return clean===undefined?null:clean;
    });
  }else{
    out={};
    for(const [key,item] of Object.entries(value)){
      const clean=sanitize(item,ancestors,depth+1);
      if(clean!==undefined)out[key]=clean;
    }
  }
  ancestors.delete(value);
  return out;
}
const api=Object.freeze({version:'8.22.54',sanitize});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.JohnCatalogPublishSafe82254=api;
})(typeof window!=='undefined'?window:globalThis);
