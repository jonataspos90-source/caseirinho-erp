/* Central Caseirinho — imagens dos cards da entrada da loja. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const keys=[['cardapio','🍝 Cardápio'],['ofertas','🔥 Ofertas e combos'],['blackfriday','🖤 Black Friday'],['encomendas','🎄 Encomendas']];
let loaded=false,original={},draft={};
function box(){
 if($('homeCardAdmin'))return;
 const section=$('settings');if(!section)return;
 const el=document.createElement('article');el.className='card';el.id='homeCardAdmin';el.style.marginTop='18px';
 el.innerHTML='<div class="section-head"><div><h2>🖼️ Imagens da página inicial</h2><p>Personalize os quatro cartões de compra. Quando não houver foto personalizada, a loja utiliza uma imagem do catálogo.</p></div></div>'+
 '<div id="homeCardAdminFields" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px"></div>'+
 '<div class="toolbar" style="margin-top:15px"><button type="button" class="btn primary" id="homeCardsSave">💾 Salvar imagens da loja</button><button type="button" class="btn" id="homeCardsReload">↻ Recarregar imagens</button></div>'+
 '<p class="notice" id="homeCardMessage" role="status">As fotos serão usadas somente no cartão correspondente. Não alteram cadastro de produtos, preços ou pedidos.</p>';
 section.append(el);
 const fields=$('homeCardAdminFields');
 for(const [key,label] of keys){
  const card=document.createElement('div');card.style.cssText='border:1px solid #d8e5d9;border-radius:15px;padding:13px;background:#fff';
  const title=document.createElement('strong');title.textContent=label;
  const img=document.createElement('img');img.id='homeCardImg-'+key;img.alt='Prévia '+label;img.style.cssText='display:none;width:100%;height:145px;object-fit:cover;border-radius:10px;margin:9px 0';
  const input=document.createElement('input');input.type='url';input.id='homeCardUrl-'+key;input.placeholder='https://... (ou envie uma foto)';input.setAttribute('aria-label','URL da imagem '+label);input.style.width='100%';
  const file=document.createElement('input');file.id='homeCardFile-'+key;file.type='file';file.accept='image/jpeg,image/png,image/webp';file.style.cssText='width:100%;margin-top:8px;font-size:12px';
  const clear=document.createElement('button');clear.type='button';clear.className='btn small';clear.textContent='Remover foto personalizada';clear.style.marginTop='8px';
  input.addEventListener('input',()=>{draft[key]=input.value.trim();preview(key)});
  file.addEventListener('change',async()=>{
   const chosen=file.files?.[0];if(!chosen)return;
   if(chosen.size>12*1024*1024){message('A foto deve ter menos de 12 MB.',true);return}
   try{draft[key]=await compress(chosen);input.value='';preview(key);message('Prévia pronta. Clique em Salvar imagens da loja para publicar.')}
   catch(err){message('Não foi possível preparar a foto: '+err.message,true)}
  });
  clear.addEventListener('click',()=>{draft[key]='';input.value='';file.value='';preview(key)});
  card.append(title,img,input,file,clear);fields.append(card);
 }
 $('homeCardsSave').onclick=save;$('homeCardsReload').onclick=load;
}
function message(text,error=false){const x=$('homeCardMessage');if(x){x.textContent=text;x.style.color=error?'#9d2020':'#17603e'}}
function preview(key){
 const img=$('homeCardImg-'+key),url=String(draft[key]||'');
 const valid=/^https:\/\//i.test(url)||/^data:image\/(?:jpeg|png|webp);base64,/i.test(url);
 img.style.display=valid?'block':'none';
 if(valid)img.src=url;else img.removeAttribute('src');
}
function compress(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(Error('Falha na leitura do arquivo'));
  reader.onload=()=>{
   const image=new Image();
   image.onerror=()=>reject(Error('Formato não reconhecido'));
   image.onload=()=>{
    const max=900,ratio=Math.min(1,max/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*ratio));
    canvas.height=Math.max(1,Math.round(image.height*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)return reject(Error('Canvas indisponível'));
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    let result='';
    for(const quality of [.76,.62,.48,.35]){
     result=canvas.toDataURL('image/jpeg',quality);
     if(result.length<280000)break;
    }
    if(result.length>310000)return reject(Error('Foto muito grande mesmo após compressão; escolha outra'));
    resolve(result);
   };
   image.src=reader.result;
  };
  reader.readAsDataURL(file);
 });
}
async function load(){
 box();
 const bridge=window.CaseirinhoHoursBridge;
 if(!bridge?.st?.token)return message('Entre com seu login administrativo para consultar as imagens.');
 try{
  const data=await bridge.api('home-cards');
  if(!data?.ok)throw Error('Resposta não confirmada');
  original={...(data.images||{})};draft={...original};loaded=true;
  for(const [key] of keys){$('homeCardUrl-'+key).value=/^https:\/\//.test(draft[key]||'')?draft[key]:'';preview(key)}
  message('Imagens carregadas. Altere somente as que desejar e clique em Salvar.');
 }catch(err){message('Não foi possível carregar as imagens: '+err.message,true)}
}
async function save(){
 const bridge=window.CaseirinhoHoursBridge;
 if(!bridge?.st?.token)return message('Faça login administrativo antes de salvar.',true);
 const images={};for(const [key] of keys)images[key]=String(draft[key]||'');
 const button=$('homeCardsSave');button.disabled=true;button.textContent='Salvando...';
 try{
  const result=await bridge.api('home-cards',{method:'POST',body:{images}});
  if(!result?.ok)throw Error('A API não confirmou a gravação');
  original={...(result.images||{})};draft={...original};loaded=true;
  for(const [key] of keys){$('homeCardUrl-'+key).value=/^https:\/\//.test(draft[key]||'')?draft[key]:'';$('homeCardFile-'+key).value='';preview(key)}
  message('✅ Fotos salvas na nuvem. A loja utilizará as novas imagens na próxima atualização.');
 }catch(err){message('Erro ao salvar: '+err.message+'. As fotos antigas foram preservadas até confirmação.',true)}
 finally{button.disabled=false;button.textContent='💾 Salvar imagens da loja'}
}
function init(){box();const button=document.querySelector('[data-view="settings"]');button?.addEventListener('click',()=>{if(!loaded)load()});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();