/* Atalho para o projeto de segunda empresa. Nenhuma consulta ou escrita
   é realizada no tenant Caseirinho ou na futura empresa de cosméticos. */
(()=>{
'use strict';
function init(){
 const settings=document.getElementById('settings');
 if(!settings||document.getElementById('partnerStoreDirectory'))return;
 const el=document.createElement('article');
 el.id='partnerStoreDirectory';el.className='card';el.style.cssText='margin:18px 0;border:1px solid #decfda;background:#fffafc';
 el.innerHTML='<div class="section-head"><div><h2>🏬 Lojas e empresas parceiras</h2><p>Atalhos das vitrines. Dados financeiros, cadastros e usuários não são compartilhados entre empresas.</p></div></div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:12px">'+
 '<div style="border:1px solid #d5e6d9;border-radius:14px;padding:17px;background:#fff"><strong>🍝 Caseirinho Massas Artesanais</strong><p style="font-size:12px;color:#597360">Loja comercial atual, com cadastro e operação próprios.</p><a class="btn" target="_blank" rel="noopener noreferrer" href="https://jonataspos90-source.github.io/caseirinho-loja/">Abrir loja Caseirinho</a></div>'+
 '<div style="border:1px solid #eedce6;border-radius:14px;padding:17px;background:#fff"><strong>🌸 Loja de Cosméticos</strong><p style="font-size:12px;color:#866b7c">Prévia em construção. Ainda sem empresa ativa, vendas, pagamentos ou usuários próprios.</p><a class="btn" target="_blank" rel="noopener noreferrer" href="../lojas/cosmeticos/">Visualizar aplicativo</a></div>'+
 '</div><p class="notice" style="margin-top:14px">A gestão comercial da nova empresa será habilitada nesta Central somente após criar seu tenant isolado, cadastrar responsáveis e aprovar os testes de acesso. Este painel é apenas de navegação.</p>';
 settings.append(el);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
