const CACHE='john-erp-pwa-v8.10.6-login-recovery';
const PATCH='./production-stability-v8-10-5.js';
const PATCH_TAG='<script src="./production-stability-v8-10-5.js?v=20260909"></'+'script>';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  PATCH
];

async function cacheShell(){
  const c=await caches.open(CACHE);
  for(const url of SHELL){
    try{
      const r=await fetch(url,{cache:'reload'});
      if(r.ok) await c.put(url,r.clone());
    }catch(_){}
  }
}

async function injectPatch(response){
  if(!response) return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html')) return response;

  let html=await response.text();

  /*
    V8.10.6
    NÃO usar html.replace(/<\/body>/i,...).
    O ERP pode possuir </body> dentro de strings/template HTML de impressão/PDF.
    A injeção precisa ocorrer somente antes do ÚLTIMO </body> real do documento.
  */
  if(!html.includes('production-stability-v8-10-5.js')){
    const lower=html.toLowerCase();
    const pos=lower.lastIndexOf('</body>');
    html = pos >= 0
      ? html.slice(0,pos)+PATCH_TAG+html.slice(pos)
      : html+PATCH_TAG;
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
          /* IMPORTANTE: não apagar cache da Loja Caseirinho, que usa o mesmo domínio github.io */
          .filter(k=>k!==CACHE && k.startsWith('john-erp-pwa-'))
          .map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);

  /* O SW do ERP só atua dentro da própria origem/escopo e nunca interfere em APIs externas. */
  if(u.origin!==self.location.origin) return;
  if(e.request.method!=='GET') return;

  /*
    Navegação: rede primeiro.
    Isso impede o ERP de continuar preso em um index.html antigo/corrompido.
  */
  if(e.request.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request,{cache:'no-store'});
        const out=await injectPatch(net);
        if(out&&out.ok){
          caches.open(CACHE)
            .then(c=>c.put('./index.html',out.clone()))
            .catch(()=>{});
        }
        return out;
      }catch(_){
        const cached=await caches.match('./index.html')||await caches.match('./offline.html');
        return injectPatch(cached);
      }
    })());
    return;
  }

  /*
    Arquivos estáticos: rede primeiro, cache como fallback.
    Assim uma nova versão manual aparece sem exigir apagar dados do ERP.
  */
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
