(function(){
'use strict';
if(window.__JOHN_RELEASE_CONSISTENCY_8225__)return;
window.__JOHN_RELEASE_CONSISTENCY_8225__=true;
const VERSION='8.22.5';
function apply(){
 try{window.JOHN_ERP_VERSION=VERSION}catch(_){}
 try{document.documentElement.dataset.johnRelease='8225'}catch(_){}
 try{document.title='John Sistema ERP · V'+VERSION}catch(_){}
 try{
  const el=document.getElementById('jnActiveArea');
  if(el)el.textContent=String(el.textContent||'').replace(/\b8\.(?:18\.0|19\.\d+|20\.\d+|21\.\d+|22\.[0-4])\b/g,VERSION);
 }catch(_){}
}
apply();
[120,500,1200,3000].forEach(ms=>setTimeout(apply,ms));
window.addEventListener('john:session-ready',apply);
window.addEventListener('john:cloud-applied',apply);
})();
