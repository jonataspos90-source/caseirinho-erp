const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('publicação raiz carrega recuperação V8.22.15',()=>{
 const sw=fs.readFileSync('service-worker.js','utf8');
 const recovery=fs.readFileSync('production-recovery-v8-22-15.js','utf8');
 assert.match(sw,/john-erp-pwa-v8\.22\.15-real-recovery/);
 assert.match(sw,/const REAL_RECOVERY='\.\/production-recovery-v8-22-15\.js'/);
 assert.match(sw,/production-recovery-v8-22-15\.js\?v=82215/);
 assert.match(sw,/REAL_RECOVERY/);
 assert.match(recovery,/JohnRealPwaRecovery82215/);
 assert.match(recovery,/mergeBackupOrders/);
 assert.match(recovery,/found102/);
});
