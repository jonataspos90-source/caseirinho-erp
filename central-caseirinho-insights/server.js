'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT)||3000;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');let pathname;
 try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400);return res.end('Bad request')}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found')}
 const ext=path.extname(file);res.setHeader('Content-Type',types[ext]||'application/octet-stream');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control',ext==='.html'||ext==='.webmanifest'||path.basename(file)==='sw.js'?'no-store':'public, max-age=300');
 fs.createReadStream(file).pipe(res);
 });
}).listen(port,'0.0.0.0',()=>console.log('Central Caseirinho listening on '+port));
