/**
 * Chama as rotas novas do jeito que a Vercel chama, contra Postgres real.
 *
 *   POSTGRES_URL=postgres://postgres:dev@127.0.0.1/ndocs node test-routes.mjs
 */
import { readFileSync } from 'node:fs';
import { db, query } from './lib/db.js';

const { GET: getFolders, POST: postFolder, PATCH: patchFolder, DELETE: delFolder } = await import('./lib/routes/folders.js');
const { GET: getTemplates, POST: postTemplate, DELETE: delTemplate } = await import('./lib/routes/templates.js');
const { GET: getSheets, POST: postSheet } = await import('./lib/routes/sheets.js');
const { GET: getGenerations } = await import('./lib/routes/generations.js');
const { GET: getDashboard } = await import('./lib/routes/dashboard.js');
const { GET: getUsage } = await import('./lib/routes/usage.js');
const { POST: postGenerate } = await import('./lib/routes/generate.js');
const { GET: getAccount, PATCH: patchAccount, POST: postAvatar } = await import('./lib/routes/account.js');
const { POST: postRegister } = await import('./lib/routes/auth-register.js');
const { POST: postLogin } = await import('./lib/routes/auth-login.js');
const { POST: postLogout } = await import('./lib/routes/auth-logout.js');
const { GET: getMe } = await import('./lib/routes/auth-me.js');
const { POST: postInspect } = await import('./lib/routes/inspect.js');
const despachante = await import('./api/[...path].js');
const { GET: getAvatar } = await import('./lib/routes/avatar.js');
const { POST: postSenha } = await import('./lib/routes/auth-password.js');

let fails = 0;
const check = (label, cond, detalhe = '') => {
  console.log(`${cond ? '  ok  ' : ' FALHA'} ${label}${detalhe ? '  — ' + detalhe : ''}`);
  if (!cond) fails++;
};

let cookie = null;   // preenchido pelo login

const req = (url, opts = {}) => new Request(`http://localhost${url}`, {
  ...opts,
  headers: { ...(opts.headers || {}), ...(cookie ? { cookie } : {}) },
});

/** Extrai o cookie de sessão do Set-Cookie de uma resposta. */
function pegarCookie(res) {
  const bruto = res.headers.get('set-cookie');
  if (!bruto) return null;
  return bruto.split(';')[0];
}
const reqJson = (url, corpo, metodo = 'POST') => req(url, {
  method: metodo,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(corpo),
});
function reqArquivo(url, campo, nome, buffer, extras = {}) {
  const form = new FormData();
  form.append(campo, new File([buffer], nome));
  for (const [k, v] of Object.entries(extras)) form.append(k, v);
  return req(url, { method: 'POST', body: form });
}

await query('TRUNCATE sessions, generations, usage_counters, templates, sheets, folders, users CASCADE');

const docx = readFileSync('./samples/template.docx');
const xlsx = readFileSync('./samples/data.xlsx');

let r;   // reaproveitado a cada chamada

/* ── Autenticação ─────────────────────────────────────────────────────── */

/* Rota protegida, sem sessão: precisa recusar. */
r = await getFolders(req('/api/folders'));
check('sem sessão, /api/folders dá 401', r.status === 401, `status ${r.status}`);
r = await getMe(req('/api/auth/me'));
check('sem sessão, /api/auth/me dá 401', r.status === 401, `status ${r.status}`);
r = await getAvatar(req('/api/avatar'));
check('sem sessão, /api/avatar dá 401', r.status === 401, `status ${r.status}`);
r = await postInspect(req('/api/inspect', { method: 'POST', body: new FormData() }));
check('sem sessão, /api/inspect dá 401', r.status === 401, `status ${r.status}`);
r = await postGenerate(req('/api/generate', { method: 'POST', body: new FormData() }));
check('sem sessão, /api/generate dá 401', r.status === 401, `status ${r.status}`);

/* Cadastro: validações. */
r = await postRegister(reqJson('/api/auth/register', { email: 'nao-e-email', senha: 'senhaboa123' }));
check('e-mail inválido dá 400', r.status === 400, `status ${r.status}`);
r = await postRegister(reqJson('/api/auth/register', { email: 'a@b.com', senha: '123' }));
check('senha curta dá 400', r.status === 400, `status ${r.status}`);
r = await postRegister(reqJson('/api/auth/register', { email: 'a@b.com', senha: 'somenteletras' }));
check('senha sem número dá 400', r.status === 400, `status ${r.status}`);

/* Trava de convite, quando SIGNUP_CODE está definido. */
process.env.SIGNUP_CODE = 'convite-secreto';
r = await postRegister(reqJson('/api/auth/register', { email: 'sem@codigo.com', senha: 'senhaboa123' }));
check('sem código de convite dá 403', r.status === 403, `status ${r.status}`);
r = await postRegister(reqJson('/api/auth/register', { email: 'sem@codigo.com', senha: 'senhaboa123', codigo: 'errado' }));
check('código errado dá 403', r.status === 403, `status ${r.status}`);
delete process.env.SIGNUP_CODE;

/* Cadastro válido. */
r = await postRegister(reqJson('/api/auth/register', {
  email: 'Gustavo@Empresa.com', senha: 'senhaboa123',
  nome: 'Gustavo Santana', empresa: 'Vita Consultoria',
}));
check('cadastro válido responde 201', r.status === 201, `status ${r.status}`);
const criado = await r.json();
check('e-mail é guardado em minúsculas', criado.conta.email === 'gustavo@empresa.com', criado.conta.email);
check('resposta não devolve a senha nem o hash',
  !JSON.stringify(criado).toLowerCase().includes('senha') && !JSON.stringify(criado).includes('scrypt'));
check('cadastro já entrega cookie de sessão', !!pegarCookie(r));
check('cookie é HttpOnly', /HttpOnly/i.test(r.headers.get('set-cookie') || ''));
check('cookie é SameSite=Lax', /SameSite=Lax/i.test(r.headers.get('set-cookie') || ''));

r = await postRegister(reqJson('/api/auth/register', { email: 'gustavo@empresa.com', senha: 'outrasenha123' }));
check('e-mail repetido dá 409', r.status === 409, `status ${r.status}`);

/* Login: senha errada e depois certa. */
r = await postLogin(reqJson('/api/auth/login', { email: 'gustavo@empresa.com', senha: 'errada12345' }));
check('senha errada dá 401', r.status === 401, `status ${r.status}`);
const msgErro = (await r.json()).error;
check('erro de login não diz se o e-mail existe',
  !/e-mail n|não existe|not found|inexistente/i.test(msgErro), msgErro);

r = await postLogin(reqJson('/api/auth/login', { email: 'nao.existe@x.com', senha: 'qualquer123' }));
check('e-mail inexistente dá o mesmo 401', r.status === 401);
check('mensagem é idêntica nos dois casos', (await r.json()).error === msgErro);

r = await postLogin(reqJson('/api/auth/login', { email: 'GUSTAVO@empresa.com', senha: 'senhaboa123' }));
check('login com maiúsculas funciona', r.status === 200, `status ${r.status}`);
cookie = pegarCookie(r);
check('login devolve cookie', !!cookie);

r = await getMe(req('/api/auth/me'));
check('me responde 200 com sessão', r.status === 200, `status ${r.status}`);
const eu = await r.json();
check('me identifica a conta certa', eu.conta.email === 'gustavo@empresa.com', eu.conta.email);
check('me nunca devolve password_hash', !JSON.stringify(eu).includes('scrypt'));

/* ── Pastas ───────────────────────────────────────────────────────────── */
r = await getFolders(req('/api/folders'));
check('GET /api/folders responde 200', r.status === 200);
check('começa vazio', (await r.json()).length === 0);

r = await postFolder(reqJson('/api/folders', { nome: 'Contratos', descricao: 'Prestação de serviços', pinned: true }));
check('POST /api/folders cria', r.status === 201, `status ${r.status}`);
const pasta = await r.json();

r = await postFolder(reqJson('/api/folders', {}));
check('pasta sem nome dá 400', r.status === 400);

/* ── Template ─────────────────────────────────────────────────────────── */
r = await postTemplate(reqArquivo('/api/templates', 'template', 'Contrato_Prestacao.docx', docx, { folderId: pasta.id }));
check('POST /api/templates cria', r.status === 201, `status ${r.status}`);
const tpl = await r.json();
check('detecta 7 variáveis', tpl.variables?.length === 7, String(tpl.variables?.length));

r = await postTemplate(req('/api/templates', { method: 'POST', body: new FormData() }));
check('template sem arquivo dá 400', r.status === 400);

/* ── Planilha ─────────────────────────────────────────────────────────── */
r = await postSheet(reqArquivo('/api/sheets', 'data', 'clientes_julho.xlsx', xlsx, { folderId: pasta.id }));
check('POST /api/sheets cria', r.status === 201, `status ${r.status}`);
const sh = await r.json();
check('conta 5 linhas', sh.row_count === 5, String(sh.row_count));

/* ── Biblioteca montada ───────────────────────────────────────────────── */
r = await getFolders(req('/api/folders'));
const pastas = await r.json();
check('pasta traz template e planilha',
  pastas[0]?.template?.file === 'Contrato_Prestacao.docx' && pastas[0]?.sheets?.length === 1,
  JSON.stringify(pastas[0]?.template));

/* ── Inspecionar (autenticado) ────────────────────────────────────────── */
const formInsp = new FormData();
formInsp.append('template', new File([docx], 'Contrato_Prestacao.docx'));
formInsp.append('data', new File([xlsx], 'clientes_julho.xlsx'));
r = await postInspect(req('/api/inspect', { method: 'POST', body: formInsp }));
check('POST /api/inspect responde 200', r.status === 200, `status ${r.status}`);
const insp = await r.json();
check('inspect acha 7 variáveis e 7 colunas',
  insp.variables?.length === 7 && insp.columns?.length === 7);
check('inspect mapeia tudo sozinho', insp.unmapped?.length === 0, String(insp.unmapped?.length));
check('inspect conta 5 linhas', insp.rowCount === 5, String(insp.rowCount));

r = await postInspect(req('/api/inspect', { method: 'POST', body: new FormData() }));
check('inspect sem arquivos dá 400', r.status === 400, `status ${r.status}`);

/* ── Gerar com arquivos enviados ──────────────────────────────────────── */
r = await postGenerate(reqArquivo('/api/generate', 'template', 'Contrato_Prestacao.docx', docx, {}));
check('generate sem planilha dá 400', r.status === 400, `status ${r.status}`);
r = await postGenerate(reqJson('/api/generate', { mapping: 'nao-e-json-valido' }));
check('generate com mapping quebrado dá 400', r.status === 400, `status ${r.status}`);

const form = new FormData();
form.append('template', new File([docx], 'Contrato_Prestacao.docx'));
form.append('data', new File([xlsx], 'clientes_julho.xlsx'));
form.append('pattern', 'Contrato_{{nome}}.docx');
form.append('templateName', 'Contrato_Prestacao.docx');
form.append('sheetName', 'clientes_julho.xlsx');
r = await postGenerate(req('/api/generate', { method: 'POST', body: form }));
check('generate por upload responde 200', r.status === 200, `status ${r.status}`);
check('devolve zip', r.headers.get('content-type') === 'application/zip');
check('X-Doc-Count = 5', r.headers.get('x-doc-count') === '5', r.headers.get('x-doc-count'));

/* ── Gerar reaproveitando o que está salvo ────────────────────────────── */
r = await postGenerate(reqJson('/api/generate', {
  templateId: tpl.id, sheetId: sh.id, pattern: 'Recibo_{{nome}}.docx',
}));
check('generate por id responde 200', r.status === 200, `status ${r.status}`);
const zip = Buffer.from(await r.arrayBuffer());
check('zip válido vindo do storage', zip.subarray(0, 2).toString() === 'PK', `${zip.length} bytes`);

r = await postGenerate(reqJson('/api/generate', { templateId: tpl.id }));
check('generate por id sem sheetId dá 400', r.status === 400);

/* ── Histórico ────────────────────────────────────────────────────────── */
r = await getGenerations(req('/api/generations'));
const hist = await r.json();
check('histórico tem 2 lotes', hist.length === 2, String(hist.length));
check('histórico no formato da tela',
  typeof hist[0].template === 'string' && typeof hist[0].docs === 'number' &&
  /^\d{2}\/\d{2}\/\d{4}$/.test(hist[0].date),
  JSON.stringify(hist[0]));

/* ── Consumo ──────────────────────────────────────────────────────────── */
r = await getUsage(req('/api/usage'));
const uso = await r.json();
check('consumo: 2 gerações', uso.generationsUsed === 2, String(uso.generationsUsed));
check('consumo: 10 documentos', uso.documentsUsed === 10, String(uso.documentsUsed));
/* Conta recém-cadastrada nasce no plano Starter: 20 gerações por ciclo. */
check('consumo traz o limite do Starter (20)', uso.generationsLimit === 20, String(uso.generationsLimit));

/* ── Painel ───────────────────────────────────────────────────────────── */
r = await getDashboard(req('/api/dashboard'));
const painel = await r.json();
check('painel: 10 documentos', painel.documentosGerados === 10, String(painel.documentosGerados));
check('painel: 1 template', painel.templatesAtivos === 1, String(painel.templatesAtivos));
/* Só a geração feita a partir de um template salvo pode creditar uso a ele.
   A primeira foi por upload (sem templateId), então conta 5, não 10. */
check('painel: uses do template = 5 (só a geração por id credita)',
  (await (await getTemplates(req('/api/templates'))).json())[0].uses === 5,
  String((await (await getTemplates(req('/api/templates'))).json())[0].uses));

/* ── Leitura do armazenamento ─────────────────────────────────────────── */
/* O ciclo completo: guardar, ler de volta e conferir que os bytes batem.
   Foi a leitura que quebrou em produção, e não havia teste cobrindo. */
{
  const { guardar, ler } = await import('./lib/storage.js');
  const conteudo = Buffer.from('conteudo de teste para leitura');
  const salvo = await guardar('testes', 'arquivo.txt', conteudo, 'text/plain');
  check('storage: guarda e devolve caminho', Boolean(salvo.pathname));
  const devolta = await ler(salvo.pathname);
  check('storage: lê de volta os mesmos bytes',
    Buffer.compare(devolta, conteudo) === 0, `${devolta.length} bytes`);

  let erro = null;
  try { await ler('nao/existe.txt'); } catch (e) { erro = e; }
  check('storage: caminho inexistente lança erro claro',
    erro !== null && /não encontrado|ENOENT/i.test(erro.message), erro?.message);
}

/* ── Conta ────────────────────────────────────────────────────────────── */
r = await getAccount(req('/api/account'));
check('GET /api/account responde 200', r.status === 200, `status ${r.status}`);
const ct = await r.json();
check('conta traz nome, email e plano',
  !!ct.conta?.nome && !!ct.conta?.email && !!ct.conta?.plano, JSON.stringify(ct.conta));
check('conta traz o consumo junto', ct.consumo?.generationsUsed === 2, String(ct.consumo?.generationsUsed));

r = await patchAccount(reqJson('/api/account', { nome: 'Gustavo Santana', empresa: 'Vita Consultoria' }, 'PATCH'));
check('PATCH /api/account salva', r.status === 200, `status ${r.status}`);
const salvo = await r.json();
check('nome foi gravado', salvo.conta.nome === 'Gustavo Santana', salvo.conta.nome);
check('empresa foi gravada', salvo.conta.empresa === 'Vita Consultoria', salvo.conta.empresa);

r = await patchAccount(reqJson('/api/account', { nome: '   ' }, 'PATCH'));
check('nome vazio dá 400', r.status === 400, `status ${r.status}`);

r = await patchAccount(reqJson('/api/account', { plano: 'ouro' }, 'PATCH'));
check('plano inválido dá 400', r.status === 400, `status ${r.status}`);

r = await patchAccount(reqJson('/api/account', { plano: 'business' }, 'PATCH'));
const trocado = await r.json();
check('troca de plano muda o limite',
  trocado.consumo.generationsLimit === 5000, String(trocado.consumo.generationsLimit));

/* Volta ao plano anterior para não afetar o resto. */
await patchAccount(reqJson('/api/account', { plano: 'pro' }, 'PATCH'));

/* ── Apagar ───────────────────────────────────────────────────────────── */
r = await delTemplate(req(`/api/templates?id=${tpl.id}`, { method: 'DELETE' }));
check('DELETE /api/templates apaga', r.status === 200, `status ${r.status}`);
r = await delTemplate(req(`/api/templates?id=${tpl.id}`, { method: 'DELETE' }));
check('apagar de novo dá 404', r.status === 404);

r = await getGenerations(req('/api/generations'));
check('histórico sobrevive ao template apagado', (await r.json()).length === 2);

/* ── Pasta: renomear e apagar ─────────────────────────────────────────── */
r = await patchFolder(reqJson(`/api/folders?id=${pasta.id}`, { nome: 'Contratos 2026', descricao: 'Renomeada' }, 'PATCH'));
check('PATCH /api/folders renomeia', r.status === 200, `status ${r.status}`);
check('nome novo foi gravado', (await r.json()).name === 'Contratos 2026');

r = await patchFolder(reqJson(`/api/folders?id=${pasta.id}`, { nome: '  ' }, 'PATCH'));
check('nome vazio dá 400', r.status === 400, `status ${r.status}`);

r = await patchFolder(reqJson('/api/folders?id=11111111-1111-1111-1111-111111111111', { nome: 'X' }, 'PATCH'));
check('pasta inexistente dá 404', r.status === 404, `status ${r.status}`);

/* ── Foto de perfil ───────────────────────────────────────────────────── */
const pngMinimo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

function reqImagem(url, nome, tipo, buffer) {
  const form = new FormData();
  form.append('avatar', new File([buffer], nome, { type: tipo }));
  return req(url, { method: 'POST', body: form });
}

r = await postAvatar(reqImagem('/api/account', 'foto.png', 'image/png', pngMinimo));
check('POST /api/account guarda a foto', r.status === 200, `status ${r.status}`);
check('conta passa a ter avatar', Boolean((await r.json()).conta.avatar));

/* A imagem é servida pela API, não por URL pública: a loja é privada. */
r = await getAvatar(req('/api/avatar'));
check('GET /api/avatar devolve a imagem', r.status === 200, `status ${r.status}`);
const bytes = Buffer.from(await r.arrayBuffer());
check('avatar volta com os mesmos bytes', bytes.length === pngMinimo.length,
  `${bytes.length} vs ${pngMinimo.length}`);
check('avatar não vai para cache compartilhado',
  (r.headers.get('cache-control') || '').includes('private'),
  r.headers.get('cache-control'));

r = await postAvatar(reqImagem('/api/account', 'planilha.xlsx', 'application/vnd.ms-excel', pngMinimo));
check('arquivo que não é imagem dá 400', r.status === 400, `status ${r.status}`);

r = await postAvatar(reqImagem('/api/account', 'gigante.png', 'image/png', Buffer.alloc(3 * 1024 * 1024)));
check('imagem acima de 2 MB dá 400', r.status === 400, `status ${r.status}`);

/* ── Troca de senha ───────────────────────────────────────────────────── */
r = await postSenha(reqJson('/api/auth/password', { senhaAtual: 'errada12345', senhaNova: 'novasenha123' }));
check('senha atual errada dá 401', r.status === 401, `status ${r.status}`);

r = await postSenha(reqJson('/api/auth/password', { senhaAtual: 'senhaboa123', senhaNova: 'curta' }));
check('senha nova fraca dá 400', r.status === 400, `status ${r.status}`);

r = await postSenha(reqJson('/api/auth/password', { senhaAtual: 'senhaboa123', senhaNova: 'senhaboa123' }));
check('senha nova igual à atual dá 400', r.status === 400, `status ${r.status}`);

/* Guarda uma segunda sessão para provar que a troca derruba as outras. */
const outraSessao = pegarCookie(await postLogin(reqJson('/api/auth/login', {
  email: 'gustavo@empresa.com', senha: 'senhaboa123',
})));

r = await postSenha(reqJson('/api/auth/password', { senhaAtual: 'senhaboa123', senhaNova: 'trocada456' }));
check('troca de senha responde 200', r.status === 200, `status ${r.status}`);
check('troca devolve cookie novo', !!pegarCookie(r));
cookie = pegarCookie(r);

const guardado = cookie;
cookie = outraSessao;
r = await getMe(req('/api/auth/me'));
check('a outra sessão foi derrubada pela troca', r.status === 401, `status ${r.status}`);
cookie = guardado;

r = await getMe(req('/api/auth/me'));
check('quem trocou continua logado', r.status === 200, `status ${r.status}`);

r = await postLogin(reqJson('/api/auth/login', { email: 'gustavo@empresa.com', senha: 'senhaboa123' }));
check('senha antiga não vale mais', r.status === 401, `status ${r.status}`);
r = await postLogin(reqJson('/api/auth/login', { email: 'gustavo@empresa.com', senha: 'trocada456' }));
check('senha nova funciona', r.status === 200, `status ${r.status}`);
cookie = pegarCookie(r);

/* ── Porta de entrada única (api/[...path].js) ────────────────────────── */
/* Em produção nenhuma rota é chamada direto: tudo passa por este arquivo. */
r = await despachante.GET(req('/api/health'));
check('despachante roteia GET /api/health', r.status === 200, `status ${r.status}`);
check('e devolve o corpo certo', (await r.json()).ok === true);

r = await despachante.GET(req('/api/auth/me'));
check('despachante roteia caminho com barra (/api/auth/me)', r.status === 200, `status ${r.status}`);

r = await despachante.GET(req('/api/folders'));
check('despachante roteia rota protegida com sessão', r.status === 200, `status ${r.status}`);

r = await despachante.GET(req('/api/nao-existe'));
check('rota inexistente dá 404', r.status === 404, `status ${r.status}`);

r = await despachante.DELETE(req('/api/health', { method: 'DELETE' }));
check('método não aceito dá 405', r.status === 405, `status ${r.status}`);
check('405 informa os métodos aceitos', (r.headers.get('allow') || '').includes('GET'),
  r.headers.get('allow') || 'sem header allow');

r = await despachante.GET(req('/api/health/'));
check('barra no fim não atrapalha', r.status === 200, `status ${r.status}`);

/* ── Logout revoga de verdade ─────────────────────────────────────────── */
r = await postLogout(req('/api/auth/logout', { method: 'POST' }));
check('logout responde 200', r.status === 200, `status ${r.status}`);
check('logout limpa o cookie', /Expires=Thu, 01 Jan 1970/.test(r.headers.get('set-cookie') || ''));

r = await getMe(req('/api/auth/me'));
check('sessão não vale mais depois do logout', r.status === 401, `status ${r.status}`);
r = await getFolders(req('/api/folders'));
check('rota protegida volta a dar 401', r.status === 401, `status ${r.status}`);

/* Um token inventado não abre nada. */
cookie = 'ndocs_session=' + 'f'.repeat(64);
r = await getMe(req('/api/auth/me'));
check('token inventado dá 401', r.status === 401, `status ${r.status}`);

/* ── Isolamento entre contas ──────────────────────────────────────────── */
cookie = null;
r = await postRegister(reqJson('/api/auth/register', { email: 'outra@pessoa.com', senha: 'senhaboa456' }));
cookie = pegarCookie(r);
r = await getFolders(req('/api/folders'));
const pastasDaOutra = await r.json();
check('outra conta não vê as pastas da primeira', pastasDaOutra.length === 0,
  `viu ${pastasDaOutra.length}`);
r = await getGenerations(req('/api/generations'));
check('outra conta não vê o histórico da primeira', (await r.json()).length === 0);

await db().end();
console.log(fails === 0 ? '\nRotas ok.' : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
