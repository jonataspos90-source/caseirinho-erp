const fs=require('fs');
const assert=require('assert');
const multi=fs.readFileSync(require('path').join(__dirname,'..','multiempresa-v8-12-0.js'),'utf8');
assert(!/(^|[^.\w])sessao\s*=\s*\{/m.test(multi),'multiempresa não pode atribuir sessao como variável solta');
assert(!/JSON\.stringify\(sessao\)/.test(multi),'multiempresa não pode serializar sessao solta');
assert(multi.includes('window.sessao={'),'sessão deve ser criada em window.sessao');
assert(multi.includes("JSON.stringify(window.sessao)"),'sessão global deve ser persistida');
console.log('OK login-session-v8-17-2');
