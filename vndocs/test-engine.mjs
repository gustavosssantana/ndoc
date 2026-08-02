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
import { extractVariables, fillDocument, contarCampos } from './lib/template.js';
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

/* ── Campos únicos e ocorrências ──────────────────────────────────────── */
const contagem = contarCampos(docx);
check('conta campos únicos', contagem.campos.length === 7, String(contagem.campos.length));
check('conta as ocorrências separadamente',
  contagem.total > contagem.campos.length, `${contagem.total} ocorrências`);
check('um campo repetido aparece uma vez só na lista',
  new Set(contagem.campos.map((c) => c.nome)).size === contagem.campos.length);
check('cada campo traz quantas vezes aparece',
  contagem.campos.every((c) => c.ocorrencias >= 1));

/* Campos em cabeçalho e rodapé precisam ser detectados: getFullText() do
   docxtemplater lê apenas o corpo, então um campo que só existisse no
   rodapé passava despercebido — mesmo sendo preenchido na geração.
   Aqui inserimos um rodapé de verdade no .docx e conferimos. */
{
  const PizZip = (await import('pizzip')).default;
  const zip = new PizZip(docx);

  zip.file('word/footer9.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:p><w:r><w:t>Documento {{rodape_unico}}</w:t></w:r></w:p></w:ftr>');

  const comRodape = zip.generate({ type: 'nodebuffer' });
  const achados = contarCampos(comRodape).campos.map((c) => c.nome);
  check('campo que só existe no rodapé é detectado',
    achados.includes('rodape_unico'), achados.join(', '));
}

/* Um {{campo}} partido em vários runs — acontece ao editar a palavra no
   Word — precisa ser reconhecido mesmo assim. */
{
  const PizZip = (await import('pizzip')).default;
  const zip = new PizZip(docx);
  zip.file('word/header9.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:p><w:r><w:t>{{par</w:t></w:r><w:r><w:t>tido}}</w:t></w:r></w:p></w:hdr>');
  const partido = contarCampos(zip.generate({ type: 'nodebuffer' })).campos.map((c) => c.nome);
  check('campo partido entre runs é reconhecido',
    partido.includes('partido'), partido.join(', '));
}

/* ── Leitura da planilha ──────────────────────────────────────────────── */
const { columns, rows } = parseSheet(xlsx);
check('lê as 7 colunas da planilha', columns.length === 7, columns.join(','));
check('lê as 5 linhas', rows.length === 5, String(rows.length));
check('o valor da primeira linha chegou inteiro',
  String(rows[0].nome).length > 3, String(rows[0].nome));

/* ── Dados brasileiros e linhas vazias ────────────────────────────────── */
{
  const XLSX = await import('xlsx');
  const linhas = [
    { CPF: '01234567890', CEP: '01310-100', Data: new Date(2026, 1, 10), Nome: 'João D\u2019Ávila' },
    { CPF: '', CEP: '', Data: '', Nome: '' },            // linha vazia
  ];
  const ws = XLSX.utils.json_to_sheet(linhas);
  ws.A2.z = '@'; ws.C2.z = 'dd/mm/yyyy';
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const lida = parseSheet(buf);
  check('linha totalmente vazia é ignorada', lida.rows.length === 1, `${lida.rows.length} linhas`);
  check('CPF mantém o zero à esquerda',
    lida.rows[0].CPF === '01234567890', JSON.stringify(lida.rows[0].CPF));
  check('CEP não vira número', lida.rows[0].CEP === '01310-100', JSON.stringify(lida.rows[0].CEP));
  check('data sai em dd/mm/aaaa, não como serial',
    /^\d{2}\/\d{2}\/\d{4}$/.test(String(lida.rows[0].Data)), JSON.stringify(lida.rows[0].Data));
  check('acento e apóstrofo sobrevivem',
    String(lida.rows[0].Nome).includes('Ávila'), JSON.stringify(lida.rows[0].Nome));
}

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
