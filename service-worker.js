const CACHE='john-erp-pwa-v8.16.0-management-pricing';

const MULTI='./multiempresa-v8-12-0.js';
const STABILITY='./production-stability-v8-10-5.js';
const PLATFORM='./platform-admin-v8-12-0.js';
const EXPERIENCE='./ecommerce-customer-experience-v8-13-0.js';

const MULTI_TAG='<script src="./multiempresa-v8-12-0.js?v=8140"></'+'script>';
const STABILITY_TAG='<script src="./production-stability-v8-10-5.js?v=8140"></'+'script>';
const PLATFORM_TAG='<script src="./platform-admin-v8-12-0.js?v=8140"></'+'script>';
const EXPERIENCE_TAG='<script src="./ecommerce-customer-experience-v8-13-0.js?v=8140"></'+'script>';

const SHELL=['./','./index.html',
  './commerce-engine-v8-15-0.js','./management-engine-v8-16-0.js','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png',MULTI,STABILITY,PLATFORM,EXPERIENCE];

async function cacheShell(){const c=await caches.open(CACHE);for(const url of SHELL){try{const r=await fetch(url,{cache:'reload'});if(r.ok)await c.put(url,r.clone())}catch(_){}}}
function injectBefore(html,needle,tag){if(html.includes(needle))return html;const low=html.toLowerCase(),p=low.lastIndexOf('</body>');return p>=0?html.slice(0,p)+tag+html.slice(p):html+tag}
async function injectScripts(response){
  if(!response)return response;const ct=response.headers.get('content-type')||'';if(!ct.includes('text/html'))return response;let html=await response.text();
  if(!html.includes('multiempresa-v8-12-0.js')){const low=html.toLowerCase(),p=low.indexOf('</head>');html=p>=0?html.slice(0,p)+MULTI_TAG+html.slice(p):MULTI_TAG+html}
  html=injectBefore(html,'production-stability-v8-10-5.js',STABILITY_TAG);
  html=injectBefore(html,'platform-admin-v8-12-0.js',PLATFORM_TAG);
  html=injectBefore(html,'ecommerce-customer-experience-v8-13-0.js',EXPERIENCE_TAG);
  const h=new Headers(response.headers);h.delete('content-length');h.set('Cache-Control','no-cache');return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}
self.addEventListener('install',e=>e.waitUntil(cacheShell().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('john-erp-pwa-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==self.location.origin||e.request.method!=='GET')return;if(e.request.mode==='navigate'){e.respondWith((async()=>{try{const net=await fetch(e.request,{cache:'no-store'}),out=await injectScripts(net);if(out&&out.ok)caches.open(CACHE).then(c=>c.put('./index.html',out.clone())).catch(()=>{});return out}catch(_){const cached=await caches.match('./index.html')||await caches.match('./offline.html');return injectScripts(cached)}})());return}e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
