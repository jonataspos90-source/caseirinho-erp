(function(){
'use strict';
if(window.__JOHN_STRICT_MEDIA_825__)return;
window.__JOHN_STRICT_MEDIA_825__=true;

const S=v=>String(v??'');
const CLOUD_KEY='john_cloud_config_v1';

function storage(){
  try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}
  catch(_){return localStorage}
}
function cloudCfg(){
  let c={};
  try{c=JSON.parse(storage().getItem(CLOUD_KEY)||'{}')||{}}catch(_){}
  return {
    apiUrl:S(c.apiUrl).replace(/\/+$/,''),
    apiKey:S(c.apiKey),
    storeSlug:S(c.storeSlug||'caseirinho')||'caseirinho'
  };
}
function currentUser(){
  try{
    if(typeof usuarioAtual==='function'){
      const u=usuarioAtual();
      return S(u?.nome||u?.login||'ERP-Ecommerce-Midia')||'ERP-Ecommerce-Midia';
    }
  }catch(_){}
  return 'ERP-Ecommerce-Midia';
}
function setStatus(message,isError=false){
  const st=document.getElementById('produtoEcomUploadStatus');
  if(!st)return;
  st.textContent=message;
  st.style.color=isError?'#b42318':'';
}
function notify(message){
  try{if(typeof toast==='function')toast(message)}catch(_){}
}
function publicMediaUrl(value){
  const url=S(value).trim();
  return /^https?:\/\//i.test(url)?url:'';
}
async function directAdminFetch(path,opt={}){
  const c=cloudCfg();
  if(!c.apiUrl||!c.apiKey){
    throw new Error('A sessão da API não está disponível neste dispositivo. Saia e entre novamente no ERP.');
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45000);
  try{
    const r=await fetch(c.apiUrl+path,{
      ...opt,
      signal:opt.signal||controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+c.apiKey,
        'X-ERP-User':currentUser(),
        ...(opt.headers||{})
      }
    });
    let d={};
    try{d=await r.json()}catch(_){}
    if(!r.ok)throw new Error(d?.error||('HTTP '+r.status));
    return d;
  }catch(err){
    if(err?.name==='AbortError')throw new Error('O envio da foto demorou mais de 45 segundos. Tente novamente.');
    throw err;
  }finally{
    clearTimeout(timer);
  }
}
async function mediaAdminFetch(path,opt={}){
  try{
    if(typeof adminFetch==='function')return await adminFetch(path,opt);
  }catch(err){
    console.warn('[John ERP 8.22.5] adminFetch global falhou; usando conexão direta:',err);
  }
  return directAdminFetch(path,opt);
}
async function localCompress(file){
  if(!file||!S(file.type).startsWith('image/'))throw new Error('Selecione somente arquivos de imagem.');
  if(file.size>12*1024*1024)throw new Error('Imagem muito grande. Limite de entrada: 12 MB.');
  const data=await new Promise((ok,no)=>{
    const fr=new FileReader();
    fr.onload=()=>ok(fr.result);
    fr.onerror=()=>no(new Error('Não foi possível ler a foto selecionada.'));
    fr.readAsDataURL(file);
  });
  const img=await new Promise((ok,no)=>{
    const i=new Image();
    i.onload=()=>ok(i);
    i.onerror=()=>no(new Error('Formato de imagem não suportado. Use JPG, PNG ou WEBP.'));
    i.src=data;
  });
  const max=1400;
  const ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*ratio));
  const h=Math.max(1,Math.round(img.naturalHeight*ratio));
  const cv=document.createElement('canvas');
  cv.width=w;cv.height=h;
  const ctx=cv.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('O navegador não conseguiu preparar a foto.');
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,w,h);
  ctx.drawImage(img,0,0,w,h);
  const out=cv.toDataURL('image/webp',.82);
  if(!/^data:image\/webp;base64,/i.test(out))throw new Error('Não foi possível otimizar a foto.');
  return out;
}
async function mediaCompress(file){
  try{
    if(typeof compress==='function')return await compress(file);
  }catch(err){
    console.warn('[John ERP 8.22.5] compressor global falhou; usando compressor interno:',err);
  }
  return localCompress(file);
}
function addRemoteUrl(url){
  try{
    if(typeof imageState!=='undefined'&&Array.isArray(imageState)){
      if(!imageState.includes(url))imageState.push(url);
      return true;
    }
  }catch(_){}
  return false;
}
async function strictUploadImages(ev){
  const input=ev?.target||document.getElementById('produtoEcomArquivos');
  const files=[...(input?.files||[])];
  if(!files.length)return;

  setStatus(`Enviando ${files.length} foto(s) para o servidor...`);
  let saved=0;
  const errors=[];
  for(const file of files){
    try{
      const dataUrl=await mediaCompress(file);
      const productId=document.getElementById('produtoId')?.value||'';
      const response=await mediaAdminFetch('/api/v1/admin/store/media',{
        method:'POST',
        body:JSON.stringify({dataUrl,filename:file.name,productId})
      });
      const url=publicMediaUrl(response?.url);
      if(!url)throw new Error('A API não retornou uma URL pública para a imagem.');
      if(!addRemoteUrl(url))throw new Error('A foto chegou ao servidor, mas o cadastro do produto não está pronto para recebê-la. Reabra o produto e tente novamente.');
      saved++;
    }catch(err){
      console.error('[John ERP 8.22.5] upload de mídia:',err);
      errors.push(`${file.name}: ${err?.message||err}`);
    }
  }

  try{if(typeof renderImages==='function')renderImages()}catch(err){console.warn('[John ERP 8.22.5] renderização de imagens:',err)}
  if(input)input.value='';

  if(errors.length){
    const first=errors[0].replace(/^[^:]+:\s*/, '');
    setStatus(`${saved} foto(s) salva(s). ${errors.length} falharam: ${first}. Nenhuma imagem local foi usada.`,true);
    notify('A foto não foi salva: '+first);
  }else{
    setStatus(`${saved} foto(s) salva(s) no servidor. Agora salve/publice o produto.`);
    notify('Foto salva no servidor com sucesso.');
  }
}

function intercept(ev){
  const input=ev?.target;
  if(!input||input.id!=='produtoEcomArquivos')return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  strictUploadImages(ev).catch(err=>{
    console.error('[John ERP 8.22.5] upload estrito:',err);
    const msg=err?.message||String(err);
    setStatus('Falha ao enviar a foto: '+msg+'. Nenhuma imagem local foi usada.',true);
    notify('A foto não foi salva: '+msg);
  });
}

try{window.uploadImages=strictUploadImages}catch(_){}
document.addEventListener('change',intercept,true);
window.JohnStrictMedia825={upload:strictUploadImages};
})();
