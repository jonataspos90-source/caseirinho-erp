const fs=require('fs');
const assert=require('assert');
const multi=fs.readFileSync(require('path').join(__dirname,'..','multiempresa-v8-12-0.js'),'utf8');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');

// O ERP legado declara `let sessao` no shell principal e o módulo multiempresa
// compartilha deliberadamente essa mesma sessão durante login/suporte.
assert(/let\s+sessao\s*=/.test(html),'shell principal deve declarar a sessão compartilhada antes da interação do usuário');
assert(/sessao\s*=\s*\{/.test(multi),'multiempresa deve preencher a sessão compartilhada no login/suporte');
assert(/sessionStorage\.setItem\('pcp_sessao',JSON\.stringify\(sessao\)\)/.test(multi),'sessão autenticada deve ser persistida na aba');
assert(/cloudToken:/.test(multi),'sessão deve manter token individual do login');
assert(!/localStorage\.setItem\('pcp_sessao'/.test(multi),'sessão autenticada não deve ser persistida permanentemente em localStorage');
console.log('OK login-session-v8-17-2');
