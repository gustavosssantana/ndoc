/**
 * Testa o motor puro — sem HTTP, sem banco, sem sessão.
 *
 * As rotas de /api agora exigem autenticação, então os endpoints são cobertos
 * em test-routes.mjs, que faz login. Aqui fica o que não depende de nada:
 * a leitura do .docx, a leitura da planilha, a montagem do lote, e a única
 * rota pública que existe (/api/health).
 *
 *   node test-engine.mjs
 */
import { readFileSync } from 'node:fs';
import { extractVariables, fillDocument } from './lib/template.js';
import { parseSheet } from './lib/xlsx.js';
import { generateBatch } from './lib/generate.js';
import { GET as health } from './lib/routes/health.js';
import { criticarSenha, gerarHash, conferirSenha } from './lib/auth.js';

let fails = 0;
const check = (label, cond, detalhe = '') => {
  console.log(`${cond ? '  ok  ' : ' FALHA'} ${label}${detalhe ? '  — ' + detalhe : ''}`);
  if (!cond) fails++;
};

const docx = readFileSync('./samples/template.docx');
const xlsx = readFileSync('./samples/data.xlsx');

/* ── Leitura do template ──────────────────────────────────────────────── */
const vars = extractVariables(docx);
check('extrai as 7 variáveis do .docx', vars.length === 7, vars.join(','));
check('acha os campos esperados',
  ['numero', 'nome', 'cpf', 'cidade', 'valor'].every((v) => vars.includes(v)));

/* ── Leitura da planilha ──────────────────────────────────────────────── */
const { columns, rows } = parseSheet(xlsx);
check('lê as 7 colunas da planilha', columns.length === 7, columns.join(','));
check('lê as 5 linhas', rows.length === 5, String(rows.length));
check('o valor da primeira linha chegou inteiro',
  String(rows[0].nome).length > 3, String(rows[0].nome));

/* ── Preenchimento ────────────────────────────────────────────────────── */
const um = fillDocument(docx, { nome: 'Ana Beatriz Lima', cidade: 'São Paulo' });
check('preenche um documento', Buffer.isBuffer(um) || um?.length > 0);

/* ── Lote ─────────────────────────────────────────────────────────────── */
const lote = await generateBatch({
  templateBuffer: docx, xlsxBuffer: xlsx,
  filenamePattern: 'Contrato_{{nome}}.docx',
});
check('gera 5 documentos', lote.count === 5, String(lote.count));
check('nenhuma variável ficou sem par', lote.unmapped.length === 0, lote.unmapped.join(','));
check('o .zip é válido', lote.zipBuffer.subarray(0, 2).toString() === 'PK');
check('o nome do arquivo usa o padrão',
  lote.files[0].startsWith('Contrato_'), lote.files[0]);
check('mede o tempo', typeof lote.ms === 'number' && lote.ms >= 0, String(lote.ms));

/* Planilha sem as colunas do template: o motor não deve estourar. */
const vazia = await generateBatch({
  templateBuffer: docx,
  xlsxBuffer: xlsx,
  mapping: { nome: 'coluna_que_nao_existe' },
  filenamePattern: 'doc_{{_index}}.docx',
});
check('mapeamento apontando para coluna inexistente não quebra', vazia.count === 5);

/* ── Rota pública ─────────────────────────────────────────────────────── */
const h = await health();
check('GET /api/health responde 200', h.status === 200);
const corpo = await h.json();
check('health devolve ok:true', corpo.ok === true);

/* ── Senha ────────────────────────────────────────────────────────────── */
check('recusa senha curta', criticarSenha('abc1') !== null);
check('recusa senha sem número', criticarSenha('somenteletras') !== null);
check('recusa senha sem letra', criticarSenha('12345678') !== null);
check('aceita senha razoável', criticarSenha('senhaboa123') === null);

const hash = await gerarHash('senhaboa123');
check('hash não contém a senha', !hash.includes('senhaboa123'), hash.slice(0, 24) + '…');
check('hash usa scrypt', hash.startsWith('scrypt$'));
check('confere a senha certa', await conferirSenha('senhaboa123', hash));
check('recusa a senha errada', !(await conferirSenha('senhaboa124', hash)));
check('recusa hash malformado', !(await conferirSenha('x', 'lixo')));

const hash2 = await gerarHash('senhaboa123');
check('dois hashes da mesma senha são diferentes (sal)', hash !== hash2);

console.log(fails === 0 ? '\nMotor ok.' : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
