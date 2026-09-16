const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','server-catalog-hydration-v8-19.js'),'utf8');

function fixture(){
  const cats=[
    ['CAT_NHOQUE','Nhoque'],['CAT_PANQUECA','Panqueca'],['CAT_TORTAS','Tortas'],
    ['CAT_PAES','Pães'],['CAT_MOLHOS','Molhos'],['CAT_SALGADOS','Salgados']
  ].map(([id,nome],i)=>({id,nome,ativo:true,ordem:i+1,emoji:'✨'}));
  const produtos=Array.from({length:33},(_,i)=>({
    id:'p'+(i+1),codigo:String(i+1).padStart(6,'0'),nome:'Produto '+(i+1),
    categoriaId:cats[i%cats.length].id,categoria:cats[i%cats.length].nome,
    imagem:'https://cdn.example/p'+(i+1)+'.webp',imagens:['https://cdn.example/p'+(i+1)+'.webp'],preco:10+i
  }));
  return {version:734,publishedAt:'2026-09-14T03:45:42.782Z',loja:{categorias:cats},produtos};
}

function makeContext(){
  const data=new Map();
  const localStorage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
  const cat=fixture();
  const db={config:{ecommerce:{categorias:[{id:'GERAL',nome:'Geral',geral:true,ativo:false}]}},produtos:cat.produtos.map(p=>({id:p.id,codigo:p.codigo,nome:p.nome,ecommerce:{}}))};
  const listeners={};
  const window={__JOHN_TENANT__:{slug:'caseirinho'},addEventListener:(n,fn)=>{listeners[n]=fn},dispatchEvent:()=>{},toast:()=>{}};
  const document={addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null,createElement:()=>({})};
  const context={window,document,localStorage,db,DB_KEY:'pcp_app_v1',console,setTimeout:()=>0,clearTimeout:()=>{},Date,JSON,Number,String,Array,Set,encodeURIComponent,CustomEvent:function(n,o){this.type=n;this.detail=o?.detail},fetch:async(url,opt)=>({ok:true,json:async()=>cat})};
  window.window=window;
  vm.createContext(context);
  vm.runInContext(code,context);
  return {context,db,cat,data};
}

test('hidrata exatamente seis categorias públicas e preserva Geral',async()=>{
  const {context,db}=makeContext();
  const r=await context.window.johnHydrateStorefrontFromServerV819(true);
  assert.equal(r.categoryCount,6);
  assert.equal(db.config.ecommerce.categorias.length,7);
  assert.deepEqual(Array.from(db.config.ecommerce.categorias.slice(1),x=>x.nome),['Nhoque','Panqueca','Tortas','Pães','Molhos','Salgados']);
});

test('restaura categoria e imagem nos 33 produtos sem publicar/escrever no servidor',async()=>{
  const {context,db}=makeContext();
  await context.window.johnHydrateStorefrontFromServerV819(true);
  assert.equal(db.produtos.filter(p=>p.ecommerce.categoriaId).length,33);
  assert.equal(db.produtos.filter(p=>p.ecommerce.imagem).length,33);
  assert.equal(db.produtos.filter(p=>p.ecommerce.publicar===true).length,33);
});
