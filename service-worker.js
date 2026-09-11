const CACHE='john-erp-pwa-v8.11.1-multiempresa';

const MULTI='./multiempresa-v8-11-0.js';
const STABILITY='./production-stability-v8-10-5.js';

const MULTI_TAG='<script src="./multiempresa-v8-11-0.js?v=8111"></'+'script>';
const STABILITY_TAG='<script src="./production-stability-v8-10-5.js?v=8111"></'+'script>';

const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  MULTI,
  STABILITY
];

async function cacheShell(){
  const c=await caches.open(CACHE);
  for(const url of SHELL){
    try{
      const r=await fetch(url,{cache:'reload'});
      if(r.ok)await c.put(url,r.clone());
    }catch(_){}
  }
}

async function injectScripts(response){
  if(!response)return response;

  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;

  let html=await response.text();

  /*
    Multiempresa precisa executar ANTES do script principal do ERP para
    particionar localStorage/sessionStorage antes da leitura do DB_KEY.
    Por isso entra antes do primeiro </head> real.
  */
  if(!html.includes('multiempresa-v8-11-0.js')){
    const lower=html.toLowerCase();
    const headPos=lower.indexOf('</head>');
    html=headPos>=0
      ?html.slice(0,headPos)+MULTI_TAG+html.slice(headPos)
      :MULTI_TAG+html;
  }

  /*
    Estabilidade permanece no final. Usamos o ÚLTIMO </body> para não
    quebrar strings de impressão/PDF existentes dentro do ERP.
  */
  if(!html.includes('production-stability-v8-10-5.js')){
    const lower=html.toLowerCase();
    const bodyPos=lower.lastIndexOf('</body>');
    html=bodyPos>=0
      ?html.slice(0,bodyPos)+STABILITY_TAG+html.slice(bodyPos)
      :html+STABILITY_TAG;
  }

  const h=new Headers(response.headers);
  h.delete('content-length');
  h.set('Cache-Control','no-cache');

  return new Response(html,{
    status:response.status,
    statusText:response.statusText,
    headers:h
  });
}

self.addEventListener('install',e=>{
  e.waitUntil(cacheShell().then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(
            k=>k!==CACHE&&k.startsWith('john-erp-pwa-')
          )
          .map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);

  if(u.origin!==self.location.origin)return;
  if(e.request.method!=='GET')return;

  if(e.request.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request,{cache:'no-store'});
        const out=await injectScripts(net);

        if(out&&out.ok){
          caches.open(CACHE)
            .then(c=>c.put('./index.html',out.clone()))
            .catch(()=>{});
        }
        return out;
      }catch(_){
        const cached=
          await caches.match('./index.html') ||
          await caches.match('./offline.html');
        return injectScripts(cached);
      }
    })());
    return;
  }

  e.respondWith(
    fetch(e.request,{cache:'no-cache'})
      .then(r=>{
        if(r.ok){
          caches.open(CACHE)
            .then(c=>c.put(e.request,r.clone()))
            .catch(()=>{});
        }
        return r;
      })
      .catch(()=>caches.match(e.request))
  );
});
