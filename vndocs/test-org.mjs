/**
 * A biblioteca é da empresa, não da pessoa.
 *
 *   POSTGRES_URL=... node test-org.mjs
 */
import { readFileSync } from 'node:fs';
import { db, query } from './lib/db.js';

const { POST: registrar } = await import('./lib/routes/auth-register.js');
const { GET: getPastas, POST: novaPasta } = await import('./lib/routes/folders.js');
const { POST: novoTemplate } = await import('./lib/routes/templates.js');
const { POST: novaPlanilha } = await import('./lib/routes/sheets.js');
const { GET: getGeracoes } = await import('./lib/routes/generations.js');
const { GET: getPainel } = await import('./lib/routes/dashboard.js');
const { GET: getUso } = await import('./lib/routes/usage.js');
const { POST: gerar } = await import('./lib/routes/generate.js');
const { GET: getTime, POST: convidar, DELETE: cancelar } = await import('./lib/routes/team.js');
const { GET: verConvite, POST: entrarNaEmpresa } = await import('./lib/routes/join.js');

let fails = 0;
const check = (label, cond, detalhe = '') => {
  console.log(`${cond ? '  ok  ' : ' FALHA'} ${label}${detalhe ? '  — ' + detalhe : ''}`);
  if (!cond) fails++;
};

let cookie = null;
const req = (url, opts = {}) => new Request(`http://localhost${url}`, {
  ...opts,
  headers: { ...(opts.headers || {}), ...(cookie ? { cookie } : {}) },
});
const jsonReq = (url, corpo, metodo = 'POST') => req(url, {
  method: metodo, headers: { 'content-type': 'application/json' },
  body: JSON.stringify(corpo),
});
const pegar = (res) => (res.headers.get('set-cookie') || '').split(';')[0];
function arquivoReq(url, campo, nome, buffer, extras = {}) {
  const form = new FormData();
  form.append(campo, new File([buffer], nome));
  for (const [k, v] of Object.entries(extras)) form.append(k, v);
  return req(url, { method: 'POST', body: form });
}

await query('TRUNCATE org_invites, org_usage, sessions, generations, usage_counters, templates, sheets, folders, users, orgs CASCADE');

const docx = readFileSync('./samples/template.docx');
const xlsx = readFileSync('./samples/data.xlsx');

/* ── A dona cria a conta da empresa ───────────────────────────────────── */
let r = await registrar(jsonReq('/api/auth/register', {
  email: 'ana@vita.com', senha: 'senhaboa123', nome: 'Ana', empresa: 'Vita Consultoria',
}));
check('dona se cadastra', r.status === 201, `status ${r.status}`);
const cookieAna = pegar(r);
cookie = cookieAna;

r = await getTime(req('/api/team'));
check('GET /api/team responde 200', r.status === 200, `status ${r.status}`);
const time = await r.json();
check('a organização recebe o nome da empresa', time.org.nome === 'Vita Consultoria', time.org.nome);
check('quem cadastrou é dona', time.voceEhDono === true);
check('a equipe começa com uma pessoa', time.pessoas.length === 1, String(time.pessoas.length));

/* ── Ana monta a biblioteca ───────────────────────────────────────────── */
r = await novaPasta(jsonReq('/api/folders', { nome: 'Contratos', descricao: 'Modelos padrão' }));
const pasta = await r.json();
check('dona cria pasta', r.status === 201, `status ${r.status}`);

await novoTemplate(arquivoReq('/api/templates', 'template', 'Contrato.docx', docx, { folderId: pasta.id }));
await novaPlanilha(arquivoReq('/api/sheets', 'data', 'clientes.xlsx', xlsx, { folderId: pasta.id }));

const form = new FormData();
form.append('template', new File([docx], 'Contrato.docx'));
form.append('data', new File([xlsx], 'clientes.xlsx'));
r = await gerar(req('/api/generate', { method: 'POST', body: form }));
check('dona gera um lote', r.status === 200, `status ${r.status}`);

/* ── Ana convida o Bruno ──────────────────────────────────────────────── */
/* Starter permite 1 pessoa. Subir o plano é o que libera convidar — o mesmo
   caminho que o cliente faria pagando. */
r = await convidar(jsonReq('/api/team', { email: 'bruno@vita.com' }));
check('plano Starter já recusa o primeiro convite', r.status === 409, `status ${r.status}`);

await query("UPDATE orgs SET plan = 'pro' WHERE name = 'Vita Consultoria'");

r = await convidar(jsonReq('/api/team', { email: 'bruno@vita.com' }));
check('dona cria convite', r.status === 201, `status ${r.status}`);
const convite = await r.json();
check('o código é legível para ditar', /^[A-Z2-9]{10}$/.test(convite.codigo), convite.codigo);

/* ── Bruno entra com o convite ────────────────────────────────────────── */
r = await registrar(jsonReq('/api/auth/register', {
  email: 'bruno@vita.com', senha: 'senhaboa456', nome: 'Bruno', convite: convite.codigo,
}));
check('convidado se cadastra com o código', r.status === 201, `status ${r.status}`);
const cookieBruno = pegar(r);

r = await registrar(jsonReq('/api/auth/register', {
  email: 'outro@vita.com', senha: 'senhaboa789', convite: convite.codigo,
}));
check('convite não serve duas vezes', r.status === 400, `status ${r.status}`);

/* ── O ponto central: Bruno vê a biblioteca da Ana ────────────────────── */
cookie = cookieBruno;

r = await getPastas(req('/api/folders'));
const pastasBruno = await r.json();
check('convidado vê a pasta que a dona criou',
  pastasBruno.length === 1 && pastasBruno[0].name === 'Contratos',
  JSON.stringify(pastasBruno.map((p) => p.name)));
check('e vê o modelo dentro dela',
  pastasBruno[0]?.template?.file === 'Contrato.docx', pastasBruno[0]?.template?.file);
check('e vê a planilha dentro dela', pastasBruno[0]?.sheets?.length === 1);

r = await getGeracoes(req('/api/generations'));
check('convidado vê o histórico da empresa', (await r.json()).length === 1);

r = await getPainel(req('/api/dashboard'));
const painelBruno = await r.json();
check('o painel mostra os números da empresa',
  painelBruno.documentosGerados === 5, String(painelBruno.documentosGerados));

/* ── A cota é da empresa, não somada por pessoa ───────────────────────── */
r = await getUso(req('/api/usage'));
const usoBruno = await r.json();
check('a cota é compartilhada', usoBruno.generationsUsed === 1, String(usoBruno.generationsUsed));

cookie = cookieAna;
r = await getUso(req('/api/usage'));
check('e é a mesma para a dona', (await r.json()).generationsUsed === 1);

/* Bruno gera, e a Ana vê o consumo subir. */
cookie = cookieBruno;
const form2 = new FormData();
form2.append('template', new File([docx], 'Contrato.docx'));
form2.append('data', new File([xlsx], 'clientes.xlsx'));
await gerar(req('/api/generate', { method: 'POST', body: form2 }));

cookie = cookieAna;
r = await getUso(req('/api/usage'));
check('o que o convidado gera conta para a empresa',
  (await r.json()).generationsUsed === 2, 'a cota não somou');

r = await getGeracoes(req('/api/generations'));
check('a dona vê o lote que o convidado gerou', (await r.json()).length === 2);

/* ── Convidado não manda na equipe ────────────────────────────────────── */
cookie = cookieBruno;
r = await convidar(jsonReq('/api/team', { email: 'mais@um.com' }));
check('convidado não pode convidar', r.status === 403, `status ${r.status}`);
r = await cancelar(req('/api/team?codigo=QUALQUER', { method: 'DELETE' }));
check('convidado não pode cancelar convite', r.status === 403, `status ${r.status}`);

r = await getTime(req('/api/team'));
const timeBruno = await r.json();
check('convidado vê a equipe', timeBruno.pessoas.length === 2, String(timeBruno.pessoas.length));
check('e sabe que não é dono', timeBruno.voceEhDono === false);

/* ── Outra empresa não vê nada ────────────────────────────────────────── */
r = await registrar(jsonReq('/api/auth/register', {
  email: 'carla@outra.com', senha: 'senhaboa000', empresa: 'Outra Empresa',
}));
cookie = pegar(r);

r = await getPastas(req('/api/folders'));
check('outra empresa não vê pasta alheia', (await r.json()).length === 0);
r = await getGeracoes(req('/api/generations'));
check('outra empresa não vê histórico alheio', (await r.json()).length === 0);
r = await getUso(req('/api/usage'));
check('outra empresa começa com a cota zerada', (await r.json()).generationsUsed === 0);
r = await getTime(req('/api/team'));
check('outra empresa só vê a si mesma', (await r.json()).pessoas.length === 1);

/* ── Limite de usuários do plano ──────────────────────────────────────── */
/* A Vita está no Pro: 3 pessoas. Já tem 2, então cabe um convite e o
   seguinte tem de ser recusado — contando o convite em aberto. */
cookie = cookieAna;
r = await convidar(jsonReq('/api/team', { email: 'terceira@vita.com' }));
check('cabe o terceiro no plano Pro', r.status === 201, `status ${r.status}`);
r = await convidar(jsonReq('/api/team', { email: 'quarta@vita.com' }));
check('o quarto é recusado, contando o convite em aberto',
  r.status === 409, `status ${r.status}`);
check('e explica o motivo', /Pro|usuário/i.test((await r.json()).error || ''));

/* ── Entrar numa empresa já tendo conta ───────────────────────────────── */
/* É o caso do "digitei o código dentro do app": a pessoa já se cadastrou
   sozinha, montou seus arquivos, e depois entra numa equipe. */
r = await registrar(jsonReq('/api/auth/register', {
  email: 'diego@solo.com', senha: 'senhaboa321', nome: 'Diego', empresa: 'Diego Solo',
}));
const cookieDiego = pegar(r);
cookie = cookieDiego;

r = await novaPasta(jsonReq('/api/folders', { nome: 'Coisas do Diego' }));
const pastaDiego = await r.json();
await novoTemplate(arquivoReq('/api/templates', 'template', 'Modelo_Diego.docx', docx, { folderId: pastaDiego.id }));
r = await getPastas(req('/api/folders'));
check('quem se cadastra sozinho tem a própria biblioteca',
  (await r.json()).length === 1);

/* Ana convida o Diego. As 3 vagas do Pro já estão ocupadas, então a empresa
   sobe para Business — o mesmo caminho de quem cresce de verdade. */
await query("UPDATE orgs SET plan = 'business' WHERE name = 'Vita Consultoria'");

cookie = cookieAna;
r = await convidar(jsonReq('/api/team', { email: 'diego@solo.com' }));
const conviteDiego = await r.json();
check('dona gera convite para quem já tem conta', r.status === 201, `status ${r.status}`);

cookie = cookieDiego;

/* Antes de entrar, confere de qual empresa é o código. */
r = await verConvite(req(`/api/join?codigo=${conviteDiego.codigo}`));
check('GET /api/join mostra a empresa do código', r.status === 200, `status ${r.status}`);
check('e diz o nome dela', (await r.json()).empresa === 'Vita Consultoria');

r = await verConvite(req('/api/join?codigo=NAOEXISTE1'));
check('código inexistente dá 404', r.status === 404, `status ${r.status}`);

/* Aceita minúscula: quem digita o código não deve se preocupar com isso. */
r = await verConvite(req(`/api/join?codigo=${conviteDiego.codigo.toLowerCase()}`));
check('código em minúscula funciona', r.status === 200, `status ${r.status}`);

/* Entra. */
r = await entrarNaEmpresa(jsonReq('/api/join', { codigo: conviteDiego.codigo }));
check('POST /api/join entra na empresa', r.status === 200, `status ${r.status}`);
const entrada = await r.json();
check('confirma em qual empresa entrou', entrada.empresa === 'Vita Consultoria', entrada.empresa);
check('estando sozinho, os arquivos vão junto', entrada.levouConteudo === true);
check('e diz o que foi movido', entrada.movido.pastas >= 1, JSON.stringify(entrada.movido));

/* Agora ele vê tudo da Vita, e a Vita vê o que era dele. */
r = await getPastas(req('/api/folders'));
const pastasDiego = (await r.json()).map((p) => p.name);
check('passa a ver a biblioteca da empresa',
  pastasDiego.includes('Contratos'), JSON.stringify(pastasDiego));
check('e os arquivos dele continuam lá',
  pastasDiego.includes('Coisas do Diego'), JSON.stringify(pastasDiego));

cookie = cookieAna;
r = await getPastas(req('/api/folders'));
const pastasAna = (await r.json()).map((p) => p.name);
check('a equipe passa a ver os arquivos de quem entrou',
  pastasAna.includes('Coisas do Diego'), JSON.stringify(pastasAna));

/* O convite não serve de novo, e ele não pode entrar onde já está. */
cookie = cookieDiego;
r = await entrarNaEmpresa(jsonReq('/api/join', { codigo: conviteDiego.codigo }));
check('o mesmo código não serve duas vezes', r.status === 404, `status ${r.status}`);

r = await entrarNaEmpresa(jsonReq('/api/join', { codigo: '' }));
check('código vazio dá 400', r.status === 400, `status ${r.status}`);

/* A organização antiga, que ficou vazia, foi removida. */
const sobrou = await query("SELECT id FROM orgs WHERE name = 'Diego Solo'");
check('a empresa antiga vazia é removida', sobrou.length === 0, `${sobrou.length} sobrou`);

/* O consumo somou, em vez de sumir. */
r = await getUso(req('/api/usage'));
check('a cota da empresa continua coerente',
  (await r.json()).generationsUsed >= 2, 'consumo perdido na mudança');

await db().end();
console.log(fails === 0 ? '\nBiblioteca compartilhada ok.' : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
