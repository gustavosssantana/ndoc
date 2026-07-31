/**
 * Testa a camada de dados contra um Postgres de verdade.
 *
 *   POSTGRES_URL=postgres://postgres:dev@127.0.0.1/ndocs node test-db.mjs
 *
 * Confere não só que as consultas rodam, mas que o formato devolvido é
 * exatamente o que as telas consomem — foi errar esse formato que derrubou
 * a Biblioteca antes.
 */
import { readFileSync } from 'node:fs';
import { db, semearConta, query } from './lib/db.js';
import * as repo from './lib/repo.js';

let fails = 0;
const check = (label, cond, detalhe = '') => {
  console.log(`${cond ? '  ok  ' : ' FALHA'} ${label}${detalhe ? '  — ' + detalhe : ''}`);
  if (!cond) fails++;
};

/* Base limpa a cada execução. */
await query('TRUNCATE sessions, generations, usage_counters, templates, sheets, folders, users CASCADE');

/* ── 1. Conta ─────────────────────────────────────────────────────────── */
const user = await semearConta({
  email: 'Gustavo.Pescare@Gmail.com', senha: 'senhaboa123',
  nome: 'Gustavo Santana', empresa: 'Gustavo Vita Consultoria',
});
check('cria a conta semente', !!user?.id, user?.email);
check('e-mail é normalizado para minúsculas', user.email === 'gustavo.pescare@gmail.com', user.email);
check('conta tem plano válido', ['starter', 'pro', 'business', 'enterprise'].includes(user.plan), user.plan);
check('senha é guardada como hash scrypt, não em claro',
  user.password_hash.startsWith('scrypt$') && !user.password_hash.includes('senhaboa123'));

const denovo = await semearConta({ email: 'gustavo.pescare@gmail.com', senha: 'outrasenha123' });
check('semear de novo não duplica a conta', denovo.id === user.id);

/* ── 2. Pasta ─────────────────────────────────────────────────────────── */
const pasta = await repo.criarPasta(user.id, {
  nome: 'Contratos de prestação',
  descricao: 'Modelos padrão de serviço',
  pinned: true,
});
check('cria pasta', !!pasta?.id, pasta?.name);

const mesmaPasta = await repo.criarPasta(user.id, { nome: 'Contratos de prestação' });
check('pasta repetida não duplica', mesmaPasta.id === pasta.id);

/* ── 3. Template e planilha ───────────────────────────────────────────── */
const docx = readFileSync('./samples/template.docx');
const xlsx = readFileSync('./samples/data.xlsx');

const tpl = await repo.salvarTemplate(user.id, {
  filename: 'Contrato_Prestacao.docx', buffer: docx, folderId: pasta.id,
});
check('guarda o template', !!tpl?.id);
check('detecta as 7 variáveis', tpl.variables.length === 7, tpl.variables.join(','));

const sh = await repo.salvarPlanilha(user.id, {
  filename: 'clientes_julho.xlsx', buffer: xlsx, folderId: pasta.id,
});
check('guarda a planilha', !!sh?.id);
check('conta 5 linhas', sh.row_count === 5, String(sh.row_count));
check('lê as 7 colunas', sh.column_names.length === 7, sh.column_names.join(','));

/* ── 4. Formato que a Biblioteca exige ────────────────────────────────── */
const pastas = await repo.listarPastas(user.id);
check('lista 1 pasta', pastas.length === 1, String(pastas.length));

const f = pastas[0];
const camposOk =
  typeof f.name === 'string' && typeof f.desc === 'string' &&
  typeof f.pinned === 'boolean' && typeof f.uses === 'number' &&
  typeof f.template?.file === 'string' && typeof f.template?.vars === 'number' &&
  typeof f.template?.uses === 'number' && typeof f.template?.updated === 'string' &&
  Array.isArray(f.sheets);
check('formato da pasta bate com Biblioteca.jsx', camposOk, JSON.stringify(Object.keys(f)));
check('template.vars = 7', f.template.vars === 7, String(f.template.vars));
check('sheets tem name/rows/updated',
  f.sheets.length === 1 && typeof f.sheets[0].name === 'string' &&
  typeof f.sheets[0].rows === 'number' && typeof f.sheets[0].updated === 'string',
  JSON.stringify(f.sheets[0]));

/* ── 5. Registrar geração e contar consumo ────────────────────────────── */
await repo.registrarGeracao(user.id, {
  templateId: tpl.id, sheetId: sh.id,
  templateName: 'Contrato_Prestacao.docx', sheetName: 'clientes_julho.xlsx',
  docCount: 5, zipSize: 7000, elapsedMs: 607, pattern: 'Contrato_{{nome}}.docx',
});

const consumo1 = await repo.consumoAtual(user);
check('consumo: 1 geração', consumo1.generationsUsed === 1, String(consumo1.generationsUsed));
check('consumo: 5 documentos', consumo1.documentsUsed === 5, String(consumo1.documentsUsed));
check('consumo tem limite do plano', consumo1.generationsLimit === 500, String(consumo1.generationsLimit));

const tplsDepois = await repo.listarTemplates(user.id);
check('uses do template subiu para 5', tplsDepois[0].uses === 5, String(tplsDepois[0].uses));

/* Falha não deve contar consumo. */
await repo.registrarGeracao(user.id, {
  templateName: 'Procuracao.docx', sheetName: 'processos.xlsx',
  status: 'failed', errorMessage: 'variável ausente',
});
const consumo2 = await repo.consumoAtual(user);
check('geração falhada não conta consumo', consumo2.generationsUsed === 1, String(consumo2.generationsUsed));

/* ── 6. Formato que o Histórico exige ─────────────────────────────────── */
const hist = await repo.listarGeracoes(user.id);
check('histórico com 2 registros', hist.length === 2, String(hist.length));
const h = hist[0];
const histOk =
  typeof h.template === 'string' && typeof h.dataFile === 'string' &&
  typeof h.docs === 'number' && typeof h.size === 'string' &&
  ['completed', 'processing', 'failed'].includes(h.status) &&
  /^\d{2}\/\d{2}\/\d{4}$/.test(h.date) && /^\d{2}:\d{2}$/.test(h.time);
check('formato do histórico bate com History.jsx', histOk, JSON.stringify(h));
check('a falhada aparece como failed', hist.some((x) => x.status === 'failed'));

/* ── 7. Painel ────────────────────────────────────────────────────────── */
const p = await repo.painel(user);
check('painel: 5 documentos gerados', p.documentosGerados === 5, String(p.documentosGerados));
check('painel: 1 template ativo', p.templatesAtivos === 1, String(p.templatesAtivos));
check('painel: 1 planilha, 5 linhas',
  p.planilhas === 1 && p.linhasTotais === 5, `${p.planilhas}/${p.linhasTotais}`);
check('painel traz o consumo', p.consumo?.generationsUsed === 1);

/* ── 8. Apagar ────────────────────────────────────────────────────────── */
const apagou = await repo.apagarPlanilha(user.id, sh.id);
check('apaga planilha', apagou === true);
const pastasDepois = await repo.listarPastas(user.id);
check('pasta fica sem planilhas', pastasDepois[0].sheets.length === 0);
const histIntacto = await repo.listarGeracoes(user.id);
check('histórico sobrevive ao arquivo apagado',
  histIntacto.length === 2 && histIntacto.some((x) => x.dataFile === 'clientes_julho.xlsx'));

await db().end();
console.log(fails === 0 ? '\nCamada de dados ok.' : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
