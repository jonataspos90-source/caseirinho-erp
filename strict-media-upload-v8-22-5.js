(function(){
'use strict';
if(window.__JOHN_STRICT_MEDIA_825__)return;
window.__JOHN_STRICT_MEDIA_825__=true;

const S=v=>String(v??'');
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
async function strictUploadImages(ev){
  const input=ev?.target||document.getElementById('produtoEcomArquivos');
  const files=[...(input?.files||[])];
  if(!files.length)return;

  if(typeof compress!=='function'||typeof adminFetch!=='function'){
    setStatus('Falha ao enviar: a integração de mídia com a API não está disponível.',true);
    notify('A foto não foi salva. Verifique a conexão com a API.');
    if(input)input.value='';
    return;
  }

  setStatus(`Enviando ${files.length} foto(s) para o servidor...`);
  let saved=0;
  const errors=[];
  for(const file of files){
    try{
      const dataUrl=await compress(file);
      const productId=document.getElementById('produtoId')?.value||'';
      const response=await adminFetch('/api/v1/admin/store/media',{
        method:'POST',
        body:JSON.stringify({dataUrl,filename:file.name,productId})
      });
      const url=publicMediaUrl(response?.url);
      if(!url)throw new Error('A API não retornou uma URL pública para a imagem.');
      if(typeof imageState==='undefined'||!Array.isArray(imageState)){
        throw new Error('O cadastro do produto não está pronto para receber imagens.');
      }
      if(!imageState.includes(url))imageState.push(url);
      saved++;
    }catch(err){
      console.error('[John ERP 8.22.5] upload de mídia:',err);
      errors.push(`${file.name}: ${err?.message||err}`);
    }
  }

  try{if(typeof renderImages==='function')renderImages()}catch(err){console.warn('[John ERP 8.22.5] renderização de imagens:',err)}
  if(input)input.value='';

  if(errors.length){
    setStatus(`${saved} foto(s) salva(s) no servidor. ${errors.length} falharam. Nenhuma imagem local foi usada.`,true);
    notify('Algumas fotos não foram salvas no servidor. Tente novamente.');
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
    setStatus('Falha ao enviar a foto para o servidor.',true);
    notify('A foto não foi salva no servidor.');
  });
}

try{window.uploadImages=strictUploadImages}catch(_){}
document.addEventListener('change',intercept,true);
window.JohnStrictMedia825={upload:strictUploadImages};
})();
