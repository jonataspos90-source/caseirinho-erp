const CACHE='john-erp-pwa-v8.22.5-persistent-media';

const MULTI='./multiempresa-v8-12-0.js';
const STABILITY='./production-stability-v8-10-5.js';
const PLATFORM='./platform-admin-v8-12-0.js';
const EXPERIENCE='./ecommerce-customer-experience-v8-13-0.js';
const HYDRATE='./server-catalog-hydration-v8-19.js';
const NEXTJS='./john-next-v8-17.js';
const NEXTCSS='./john-next-v8-17.css';
const COMMERCE='./commerce-engine-v8-22-0.js';
const MANAGEMENT='./management-engine-v8-22-0.js';
const USAGE='./erp-usage-v8-20.js';
const SYNC='./caseirinho-commerce-sync-v8-21.js';
const STRICT_MEDIA='./strict-media-upload-v8-22-5.js';
const RECOVERY='./ecommerce-recovery-v8-16-1.js';
const DEEP='./catalog-deep-recovery-v8-18-1.js';
const CENTRAL_FIX='./central-modules-hotfix-v8-22-2.js';
const USAGE_FIX='./erp-usage-v8-22-1.js';
const RELEASE='./release-consistency-v8-22-5.js';

const MULTI_TAG='<script src="./multiempresa-v8-12-0.js?v=8225"></'+'script>';
const STABILITY_TAG='<script src="./production-stability-v8-10-5.js?v=8225"></'+'script>';
const PLATFORM_TAG='<script src="./platform-admin-v8-12-0.js?v=8225"></'+'script>';
const EXPERIENCE_TAG='<script src="./ecommerce-customer-experience-v8-13-0.js?v=8225"></'+'script>';
const HYDRATE_TAG='<script src="./server-catalog-hydration-v8-19.js?v=8225"></'+'script>';
const NEXTJS_TAG='<script src="./john-next-v8-17.js?v=8225"></'+'script>';
const NEXTCSS_TAG='<link rel="stylesheet" href="./john-next-v8-17.css?v=8225">';
const COMMERCE_TAG='<script src="./commerce-engine-v8-22-0.js?v=8225"></'+'script>';
const MANAGEMENT_TAG='<script src="./management-engine-v8-22-0.js?v=8225"></'+'script>';
const USAGE_TAG='<script src="./erp-usage-v8-20.js?v=8225"></'+'script>';
const SYNC_TAG='<script src="./caseirinho-commerce-sync-v8-21.js?v=8225"></'+'script>';
const STRICT_MEDIA_TAG='<script src="./strict-media-upload-v8-22-5.js?v=8225"></'+'script>';
const RECOVERY_TAG='<script src="./ecommerce-recovery-v8-16-1.js?v=8225"></'+'script>';
const DEEP_TAG='<script src="./catalog-deep-recovery-v8-18-1.js?v=8225"></'+'script>';
const CENTRAL_FIX_TAG='<script src="./central-modules-hotfix-v8-22-2.js?v=8225"></'+'script>';
const USAGE_FIX_TAG='<script src="./erp-usage-v8-22-1.js?v=8225"></'+'script>';
const RELEASE_TAG='<script src="./release-consistency-v8-22-5.js?v=8225"></'+'script>';

const SHELL=['./','./index.html','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png',MULTI,STABILITY,PLATFORM,EXPERIENCE,HYDRATE,NEXTJS,NEXTCSS,COMMERCE,MANAGEMENT,USAGE,SYNC,STRICT_MEDIA,RECOVERY,DEEP,CENTRAL_FIX,USAGE_FIX,RELEASE];

async function cacheShell(){const c=await caches.open(CACHE);for(const url of SHELL){try{const r=await fetch(url,{cache:'reload'});if(r.ok)await c.put(url,r.clone())}catch(_){}}}
function injectBefore(html,needle,tag){if(html.includes(needle))return html;const low=html.toLowerCase(),p=low.lastIndexOf('</body>');return p>=0?html.slice(0,p)+tag+html.slice(p):html+tag}
function injectHead(html,needle,tag){if(html.includes(needle))return html;const low=html.toLowerCase(),p=low.lastIndexOf('</head>');return p>=0?html.slice(0,p)+tag+html.slice(p):tag+html}
async function injectScripts(response){
  if(!response)return response;const ct=response.headers.get('content-type')||'';if(!ct.includes('text/html'))return response;let html=await response.text();
  html=injectHead(html,'multiempresa-v8-12-0.js',MULTI_TAG);
  html=injectHead(html,'john-next-v8-17.css',NEXTCSS_TAG);
  html=injectBefore(html,'production-stability-v8-10-5.js',STABILITY_TAG);
  html=injectBefore(html,'platform-admin-v8-12-0.js',PLATFORM_TAG);
  html=injectBefore(html,'ecommerce-customer-experience-v8-13-0.js',EXPERIENCE_TAG);
  html=injectBefore(html,'server-catalog-hydration-v8-19.js',HYDRATE_TAG);
  html=injectBefore(html,'john-next-v8-17.js',NEXTJS_TAG);
  html=injectBefore(html,'commerce-engine-v8-22-0.js',COMMERCE_TAG);
  html=injectBefore(html,'management-engine-v8-22-0.js',MANAGEMENT_TAG);
  html=injectBefore(html,'erp-usage-v8-20.js',USAGE_TAG);
  html=injectBefore(html,'caseirinho-commerce-sync-v8-21.js',SYNC_TAG);
  html=injectBefore(html,'strict-media-upload-v8-22-5.js',STRICT_MEDIA_TAG);
  html=injectBefore(html,'ecommerce-recovery-v8-16-1.js',RECOVERY_TAG);
  html=injectBefore(html,'catalog-deep-recovery-v8-18-1.js',DEEP_TAG);
  html=injectBefore(html,'central-modules-hotfix-v8-22-2.js',CENTRAL_FIX_TAG);
  html=injectBefore(html,'erp-usage-v8-22-1.js',USAGE_FIX_TAG);
  html=injectBefore(html,'release-consistency-v8-22-5.js',RELEASE_TAG);
  const h=new Headers(response.headers);h.delete('content-length');h.set('Cache-Control','no-cache, no-store, must-revalidate');return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}
self.addEventListener('install',e=>e.waitUntil(cacheShell().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('john-erp-pwa-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==self.location.origin||e.request.method!=='GET')return;if(e.request.mode==='navigate'){e.respondWith((async()=>{try{const net=await fetch(e.request,{cache:'no-store'}),out=await injectScripts(net);if(out&&out.ok)caches.open(CACHE).then(c=>c.put('./index.html',out.clone())).catch(()=>{});return out}catch(_){const cached=await caches.match('./index.html')||await caches.match('./offline.html');return injectScripts(cached)}})());return}e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
