/**
 * Roda o app inteiro pelas rotas de verdade — as mesmas funções que a Vercel
 * chama — e imprime cada etapa. Serve para conferir que tudo funciona antes
 * de abrir o site no navegador.
 *
 *   npm run demo
 *   npm run demo -- outro@email.com "OutraSenha123"
 *
 * Precisa de POSTGRES_URL (o `vercel env pull` traz) e das migrações
 * aplicadas (`npm run db:migrate`). Pode rodar quantas vezes quiser.
 */
import { readFileSync } from 'node:fs';
import { db, semearConta } from './lib/db.js';

const { POST: login } = await import('./lib/routes/auth-login.js');
const { GET: me } = await import('./lib/routes/auth-me.js');
const { POST: novaPasta, GET: pastas } = await import('./lib/routes/folders.js');
const { POST: novoTemplate } = await import('./lib/routes/templates.js');
const { POST: novaPlanilha } = await import('./lib/routes/sheets.js');
const { POST: inspecionar } = await import('./lib/routes/inspect.js');
const { POST: gerar } = await import('./lib/routes/generate.js');
const { GET: historico } = await import('./lib/routes/generations.js');
const { GET: painel } = await import('./lib/routes/dashboard.js');
const { GET: conta } = await import('./lib/routes/account.js');

let cookie = null;
const req = (url, opts = {}) => new Request(`http://localhost${url}`, {
  ...opts,
  headers: { ...(opts.headers || {}), ...(cookie ? { cookie } : {}) },
});
const jsonReq = (url, corpo, metodo = 'POST') => req(url, {
  method: metodo, headers: { 'content-type': 'application/json' },
  body: JSON.stringify(corpo),
});
function arquivoReq(url, campos) {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) {
    form.append(k, v instanceof File ? v : String(v));
  }
  return req(url, { method: 'POST', body: form });
}

const linha = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const item = (k, v) => console.log(`   ${String(k).padEnd(22)} ${v}`);

const [emailArg, senhaArg] = process.argv.slice(2);
const EMAIL = emailArg || 'gustavo@empresa.com';
const SENHA = senhaArg || 'MinhaSenha123';

const docx = readFileSync('./samples/template.docx');
const xlsx = readFileSync('./samples/data.xlsx');

/* ── 1. conta ─────────────────────────────────────────────────────────── */
linha('1. Criando a conta  (npm run db:seed)');
const u = await semearConta({
  email: EMAIL, senha: SENHA,
  nome: 'Gustavo Santana', empresa: 'Vita Consultoria',
});
item('e-mail', u.email);
item('plano', u.plan);
item('senha guardada como', u.password_hash.slice(0, 30) + '…');

/* ── 2. login ─────────────────────────────────────────────────────────── */
linha('2. Entrando  (a tela de login faz isto)');
let r = await login(jsonReq('/api/auth/login', {
  email: EMAIL, senha: 'senhaErrada123',
}));
item('senha errada', `${r.status} — ${(await r.json()).error}`);

r = await login(jsonReq('/api/auth/login', { email: EMAIL, senha: SENHA }));
cookie = (r.headers.get('set-cookie') || '').split(';')[0];
item('senha certa', `${r.status} OK`);
item('cookie recebido', cookie.slice(0, 28) + '…  (HttpOnly)');

r = await me(req('/api/auth/me'));
const eu = await r.json();
item('sessão reconhecida', `${eu.conta.nome} · plano ${eu.conta.plano}`);
item('consumo do ciclo', `${eu.consumo.generationsUsed}/${eu.consumo.generationsLimit}`);

/* ── 3. biblioteca ────────────────────────────────────────────────────── */
linha('3. Montando a Biblioteca');
r = await novaPasta(jsonReq('/api/folders', {
  nome: 'Contratos de prestação', descricao: 'Modelos padrão de serviço', pinned: true,
}));
const pasta = await r.json();
item('pasta criada', pasta.name);

r = await novoTemplate(arquivoReq('/api/templates', {
  template: new File([docx], 'Contrato_Prestacao.docx'), folderId: pasta.id,
}));
const tpl = await r.json();
item('template salvo', `${tpl.filename} — ${tpl.variables.length} campos`);
item('campos detectados', tpl.variables.join(', '));

r = await novaPlanilha(arquivoReq('/api/sheets', {
  data: new File([xlsx], 'clientes_julho.xlsx'), folderId: pasta.id,
}));
const sh = await r.json();
item('planilha salva', `${sh.filename} — ${sh.row_count} linhas`);

/* ── 4. inspeção ──────────────────────────────────────────────────────── */
linha('4. Conferindo o encaixe  (tela Gerar Documentos)');
r = await inspecionar(arquivoReq('/api/inspect', {
  template: new File([docx], 'Contrato_Prestacao.docx'),
  data: new File([xlsx], 'clientes_julho.xlsx'),
}));
const insp = await r.json();
item('variáveis no template', insp.variables.length);
item('colunas na planilha', insp.columns.length);
item('encaixaram sozinhas', insp.autoMapped.length);
item('sem par', insp.unmapped.length === 0 ? 'nenhuma' : insp.unmapped.join(', '));

/* ── 5. geração ───────────────────────────────────────────────────────── */
linha('5. Gerando o lote');
r = await gerar(jsonReq('/api/generate', {
  templateId: tpl.id, sheetId: sh.id, pattern: 'Contrato_{{nome}}_{{data_inicio}}.docx',
}));
const zip = Buffer.from(await r.arrayBuffer());
item('resposta', `${r.status} ${r.headers.get('content-type')}`);
item('documentos gerados', r.headers.get('x-doc-count'));
item('tempo', `${r.headers.get('x-elapsed-ms')} ms`);
item('tamanho do .zip', `${(zip.length / 1024).toFixed(1)} KB`);

const { default: JSZip } = await import('jszip');
const conteudo = await JSZip.loadAsync(zip);
console.log('\n   arquivos dentro do .zip:');
Object.keys(conteudo.files).forEach((f) => console.log(`     · ${f}`));

/* ── 6. telas ─────────────────────────────────────────────────────────── */
linha('6. O que as telas mostram agora');

r = await painel(req('/api/dashboard'));
const p = await r.json();
console.log('   Dashboard:');
item('  documentos gerados', p.documentosGerados);
item('  templates ativos', p.templatesAtivos);
item('  planilhas', `${p.planilhas} (${p.linhasTotais} linhas)`);

r = await historico(req('/api/generations'));
const h = await r.json();
console.log('\n   Histórico:');
h.forEach((g) => item(`  ${g.date} ${g.time}`,
  `${g.template} → ${g.docs} docs, ${g.size}, ${g.status}`));

r = await pastas(req('/api/folders'));
const [f] = await r.json();
console.log('\n   Biblioteca:');
item(`  ${f.name}`, `${f.template.file} (${f.template.vars} campos, ${f.template.uses} usos)`);
f.sheets.forEach((s) => item('    planilha', `${s.name} — ${s.rows} linhas, ${s.updated}`));

r = await conta(req('/api/account'));
const c = await r.json();
console.log('\n   Plano:');
item('  plano', c.consumo.planoNome);
item('  gerações no ciclo', `${c.consumo.generationsUsed}/${c.consumo.generationsLimit}`);
item('  documentos no ciclo', c.consumo.documentsUsed);
item('  restantes', c.consumo.restantes);

/* ── 7. sem sessão ────────────────────────────────────────────────────── */
linha('7. E sem estar logado?');
cookie = null;
for (const [nome, fn, url] of [
  ['/api/dashboard', painel, '/api/dashboard'],
  ['/api/folders', pastas, '/api/folders'],
  ['/api/generations', historico, '/api/generations'],
]) {
  const res = await fn(req(url));
  item(nome, `${res.status} — ${(await res.json()).error}`);
}

await db().end();
console.log(`\n\x1b[1mFim.\x1b[0m  Entre no site com ${EMAIL} e a senha que você usou.\n`);
