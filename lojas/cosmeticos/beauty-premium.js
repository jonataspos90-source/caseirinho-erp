/* Beauty Premium — PWA de demonstração independente. Sem API, sem pagamentos. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const KEY='john_beauty_preview_identity_v1';
const CONSENT_VERSION='2026-11';
const DAY=86400000;
let installPrompt=null;
const s=v=>String(v??'');
function profile(){
 try{
  const p=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!p||p.version!==CONSENT_VERSION||Date.now()-p.savedAt>30*DAY)return null;
  if(!/^\d{10,11}$/.test(s(p.phone))||s(p.name).length<2||!p.consent)return null;
  return p;
 }catch(_){return null}
}
function hidePersonalData(){
 try{localStorage.removeItem(KEY)}catch(_){}
 document.body.classList.add('beauty-locked');$('beautyIdentity').hidden=false;
 $('beautyUser').textContent='Identificar-me';$('beautyWelcome').textContent='';
 $('beautyName').focus();
}
function activate(p){
 document.body.classList.remove('beauty-locked');
 const gate=$('beautyIdentity');if(gate)gate.hidden=true;
 $('beautyUser').textContent='Dados';
 $('beautyWelcome').textContent='Olá, '+p.name.split(/\s+/)[0]+'!';
}
function gateMarkup(){
 const overlay=document.createElement('section');overlay.id='beautyIdentity';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-labelledby','beautyGateTitle');
 overlay.innerHTML='<div class="beauty-gate">'+
 '<div class="beauty-gate-art" aria-hidden="true">'+bottleSvg('hero')+'</div>'+
 '<div class="beauty-gate-form"><span class="eyebrow">BEM-VINDA À SUA MARCA BEAUTY</span>'+
 '<h2 id="beautyGateTitle">Um espaço de beleza feito para você.</h2>'+
 '<p>Antes de explorar, informe seu nome e WhatsApp. Esta é uma prévia: os dados ficam somente neste dispositivo.</p>'+
 '<form id="beautyForm" novalidate>'+
 '<label for="beautyName">Seu nome</label><input type="text" name="name" id="beautyName" maxlength="80" minlength="2" required autocomplete="name" placeholder="Como podemos chamar você?">'+
 '<label for="beautyPhone">WhatsApp com DDD</label><input type="tel" name="phone" id="beautyPhone" maxlength="20" inputmode="tel" required autocomplete="tel" placeholder="(11) 99999-9999">'+
 '<label class="consent-label"><input type="checkbox" id="beautyConsent" required><span>Li e aceito a <a href="./privacidade.html" target="_blank" rel="noopener noreferrer">Política de Privacidade</a> desta prévia, para identificação neste dispositivo.</span></label>'+
 '<button type="submit">Entrar na loja <span aria-hidden="true">→</span></button><p id="beautyIdentityStatus" role="status" aria-live="polite"></p></form>'+
 '</div></div>';
 document.body.prepend(overlay);
 const form=$('beautyForm');
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('beautyName').value.trim().replace(/\s+/g,' ');
  const phone=$('beautyPhone').value.replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
  if(name.length<2){$('beautyIdentityStatus').textContent='Informe seu nome, com pelo menos 2 caracteres.';return}
  if(!/^\d{10,11}$/.test(phone)||!/^[1-9][1-9]/.test(phone)){
   $('beautyIdentityStatus').textContent='Informe um telefone brasileiro com DDD (10 ou 11 dígitos).';return;
  }
  if(!$('beautyConsent').checked){$('beautyIdentityStatus').textContent='Para continuar, confirme a leitura da Política de Privacidade.';return}
  const p={name,phone,consent:true,version:CONSENT_VERSION,savedAt:Date.now()};
  try{localStorage.setItem(KEY,JSON.stringify(p))}
  catch(_){$('beautyIdentityStatus').textContent='Não foi possível salvar no navegador. Verifique as permissões de armazenamento.';return}
  $('beautyIdentityStatus').textContent='';
  activate(p);
 });
}
function bottleSvg(kind='serum'){
 const palette=kind==='hero'?['#b76c89','#f4d8ca','#fffaf0','#d0b79c']:kind==='perfume'?['#c69e79','#f5e4d7','#fff9ed','#c5a47d']:kind==='lipstick'?['#b65e7b','#f5d8df','#fff4ea','#a98373']:['#987c95','#f3dce7','#fffaf6','#d0aeb9'];
 const [dark,light,white,gold]=palette;
 if(kind==='lipstick')return '<svg viewBox="0 0 220 230" aria-hidden="true"><ellipse cx="112" cy="204" rx="65" ry="10" fill="#886676" opacity=".12"/><rect x="86" y="111" width="48" height="80" rx="3" fill="'+gold+'"/><rect x="83" y="120" width="54" height="70" rx="5" fill="'+dark+'"/><rect x="89" y="47" width="42" height="84" rx="8" fill="#d8adb8"/><path d="M89 68 Q91 47 115 36 L131 47 L131 78 L89 80 Z" fill="'+dark+'"/><path d="M90 83 L90 61 Q111 62 131 53 L131 85 Z" fill="#9f496b"/><rect x="83" y="188" width="54" height="10" rx="3" fill="'+gold+'"/></svg>';
 if(kind==='perfume')return '<svg viewBox="0 0 220 230" aria-hidden="true"><ellipse cx="110" cy="205" rx="74" ry="10" fill="#886676" opacity=".10"/><rect x="89" y="27" width="42" height="25" rx="3" fill="'+gold+'"/><rect x="95" y="48" width="30" height="24" rx="3" fill="#9b7c5d"/><rect x="54" y="68" width="112" height="124" rx="18" fill="'+light+'" stroke="'+gold+'" stroke-width="3"/><path d="M69 87 L69 162 Q73 174 86 174 L134 174 Q149 174 151 162 L151 87" fill="none" stroke="white" stroke-width="5" opacity=".65"/><rect x="74" y="116" width="72" height="34" rx="2" fill="'+white+'"/><text x="110" y="137" font-size="12" text-anchor="middle" font-family="Georgia,serif" fill="'+dark+'">ESSENCE</text></svg>';
 if(kind==='jar')return '<svg viewBox="0 0 220 230" aria-hidden="true"><ellipse cx="110" cy="201" rx="78" ry="10" fill="#886676" opacity=".10"/><path d="M55 105 Q60 91 73 91 H147 Q162 91 165 105 L157 186 Q150 193 140 193 H80 Q68 193 63 186 Z" fill="'+light+'" stroke="'+gold+'" stroke-width="2"/><rect x="51" y="77" width="118" height="34" rx="8" fill="'+dark+'"/><rect x="56" y="72" width="108" height="17" rx="5" fill="'+gold+'"/><rect x="73" y="134" width="74" height="36" rx="3" fill="'+white+'"/><text x="110" y="157" font-size="13" text-anchor="middle" font-family="Georgia,serif" fill="'+dark+'">CARE</text></svg>';
 return '<svg viewBox="0 0 220 230" aria-hidden="true"><defs><linearGradient id="beautyGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+white+'"/><stop offset="1" stop-color="'+light+'"/></linearGradient></defs><ellipse cx="110" cy="204" rx="80" ry="13" fill="#886676" opacity=".09"/><rect x="92" y="29" width="36" height="28" rx="5" fill="'+gold+'"/><rect x="102" y="55" width="16" height="23" fill="'+dark+'"/><path d="M72 75 Q72 66 83 66 H137 Q148 66 148 75 L161 174 Q162 190 148 195 H72 Q59 190 61 174 Z" fill="url(#beautyGlass)" stroke="'+gold+'" stroke-width="2"/><path d="M82 87 Q77 120 76 162" stroke="#fff" stroke-width="8" opacity=".5" fill="none"/><rect x="76" y="122" width="68" height="43" rx="4" fill="'+white+'"/><text x="110" y="143" font-size="10" text-anchor="middle" letter-spacing="2" font-family="Georgia,serif" fill="'+dark+'">BEAUTY</text><text x="110" y="155" font-size="7" text-anchor="middle" font-family="sans-serif" fill="'+dark+'">SKIN CARE</text></svg>';
}
const styleForProduct=id=>/d1|d7/.test(id)?'lipstick':/d3/.test(id)?'perfume':/d4|d6/.test(id)?'jar':'serum';
function decorateProducts(){
 for(const card of document.querySelectorAll('.product[data-product]')){
  const surface=card.querySelector('.product-image');
  if(!surface||surface.dataset.beautyDone)return;
  surface.dataset.beautyDone='1';
  [...surface.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
  surface.insertAdjacentHTML('beforeend',bottleSvg(styleForProduct(card.dataset.product)));
 }
}
function pixDemo(){
 const dialog=document.createElement('dialog');dialog.id='beautyPixDemo';dialog.className='pix-demo-dialog';
 dialog.innerHTML='<div class="pix-demo-top"><strong>Pagamento PIX · Prévia</strong><button type="button" data-close-pix aria-label="Fechar">×</button></div>'+
 '<div class="pix-demo-content"><div class="pix-demo-warn"><b>Atenção:</b> esta loja está em preparação. Nenhum PIX é gerado ou cobrado nesta demonstração. Quando estiver ativa, confira sempre o destinatário antes de pagar.</div>'+
 '<h3>Falta pouco! Seu pedido estará quase concluído.</h3><p style="text-align:center;color:#766b73;font-size:13px">O código PIX e o prazo aparecerão somente depois da emissão oficial da cobrança.</p>'+
 '<button type="button" class="pix-demo-disabled" disabled>Copiar código PIX (indisponível)</button>'+
 '<ol class="pix-demo-steps"><li>Copie o código PIX do seu pedido.</li><li>Abra o aplicativo do banco.</li><li>Escolha PIX copia e cola.</li><li>Confira destinatário e valor.</li><li>Confirme o pagamento.</li></ol>'+
 '<div class="pix-demo-info"><b>Destinatário:</b> será exibido após cadastrar a conta da nova empresa.<br><b>Status:</b> aguardando ativação comercial e homologação.</div></div>';
 document.body.append(dialog);
 dialog.querySelector('[data-close-pix]').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 const btn=document.createElement('button');btn.className='beauty-user-btn';btn.type='button';btn.textContent='PIX';btn.dataset.beautyPix='true';btn.setAttribute('aria-label','Visualizar instruções para pagamento PIX');btn.title='Como será o pagamento PIX';btn.onclick=()=>dialog.showModal();
 document.querySelector('.headright')?.prepend(btn);
}
function installApp(){
 const button=document.createElement('button');button.id='beautyInstall';button.type='button';button.textContent='↓ Instalar';
 document.querySelector('.headright')?.prepend(button);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;button.classList.add('ready')});
 button.onclick=async()=>{
  if(!installPrompt)return;
  const e=installPrompt;installPrompt=null;button.classList.remove('ready');
  await e.prompt();await e.userChoice;
 };
 if('serviceWorker' in navigator&&location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('[Beauty PWA] Sem offline',e)));
 }
}
function init(){
 gateMarkup();
 const account=document.createElement('button');account.type='button';account.id='beautyUser';account.className='beauty-user-btn';account.textContent='Dados';
 const welcome=document.createElement('span');welcome.id='beautyWelcome';welcome.className='beauty-welcome';
 const row=document.createElement('div');row.className='beauty-quickactions';row.append(welcome,account);
 document.querySelector('.headright')?.prepend(row);
 account.onclick=hidePersonalData;
 const prev=profile();if(prev)activate(prev);else hidePersonalData();
 pixDemo();installApp();
 // Agrupa as ações para criar cabeçalho mobile em duas linhas.
 const headerRight=document.querySelector('.headright');
 if(headerRight&&!headerRight.querySelector('.beauty-header-tools')){
   const actions=document.createElement('div');
   actions.className='beauty-header-tools';
   actions.setAttribute('role','group');
   actions.setAttribute('aria-label','Ações da loja');
   for(const control of [document.getElementById('beautyInstall'),headerRight.querySelector('[data-beauty-pix]'),row])
     if(control)actions.append(control);
   headerRight.insertBefore(actions,headerRight.querySelector('.pill-link')||headerRight.querySelector('.cart')||null);
 }
 const hero=document.querySelector('.hero-art');if(hero){hero.innerHTML=bottleSvg('hero');}
 decorateProducts();
 const productGrid=$('products');
 if(productGrid)new MutationObserver(decorateProducts).observe(productGrid,{childList:true});
 const featured=$('featured');
 if(featured)new MutationObserver(decorateProducts).observe(featured,{childList:true});
 const strip=document.createElement('div');strip.className='beauty-safety-strip';
 strip.innerHTML='<span>♧ Beleza com cuidado</span><span>♢ Lotes e validade controlados na loja definitiva</span><span>✧ Compras seguras após homologação</span>';
 document.querySelector('#inicio .feature')?.after(strip);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
