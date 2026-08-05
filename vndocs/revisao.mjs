/**
 * Casos-limite que um usuário real encontra. Roda com: node revisao.mjs
 */
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import { readFileSync } from 'node:fs';
import { parseSheet } from './lib/xlsx.js';
import { contarCampos } from './lib/template.js';
import { generateBatch } from './lib/generate.js';

const base = readFileSync('./samples/template.docx');

function modelo(corpo) {
  const z = new PizZip(base);
  z.file('word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    `<w:p><w:r><w:t>${corpo}</w:t></w:r></w:p></w:body></w:document>`);
  return z.generate({ type: 'nodebuffer' });
}

function planilha(cabecalhos, linhas) {
  const ws = XLSX.utils.aoa_to_sheet([cabecalhos, ...linhas]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

let problemas = 0;
const ver = (rotulo, ok, detalhe = '') => {
  console.log(`${ok ? '  ok  ' : ' ⚠︎   '} ${rotulo}${detalhe ? '  — ' + detalhe : ''}`);
  if (!ok) problemas++;
};

/* 1. Dois clientes com o mesmo nome: os arquivos não podem se sobrescrever. */
{
  const r = await generateBatch({
    templateBuffer: modelo('{{Nome}}'),
    xlsxBuffer: planilha(['Nome'], [['Gustavo'], ['Gustavo'], ['Gustavo']]),
    filenamePattern: 'doc_{{Nome}}.docx',
  });
  ver('nomes repetidos não se sobrescrevem',
    new Set(r.files).size === 3, r.files.join(', '));
}

/* 2. Valor com barra, dois-pontos: caracteres proibidos em nome de arquivo. */
{
  const r = await generateBatch({
    templateBuffer: modelo('{{Ref}}'),
    xlsxBuffer: planilha(['Ref'], [['2026/03: A<B>C']]),
    filenamePattern: 'doc_{{Ref}}.docx',
  });
  ver('caractere proibido é limpo do nome',
    !/[\/:<>]/.test(r.files[0]), r.files[0]);
}

/* 3. Célula vazia numa das linhas. */
{
  const r = await generateBatch({
    templateBuffer: modelo('{{Nome}} / {{Cidade}}'),
    xlsxBuffer: planilha(['Nome', 'Cidade'], [['Ana', 'SP'], ['Bruno', '']]),
    filenamePattern: 'doc_{{Nome}}.docx',
  });
  ver('célula vazia não derruba a geração', r.count === 2, String(r.count));
}

/* 4. Planilha com só o cabeçalho. */
{
  let erro = null;
  try {
    await generateBatch({
      templateBuffer: modelo('{{Nome}}'),
      xlsxBuffer: planilha(['Nome'], []),
      filenamePattern: 'doc.docx',
    });
  } catch (e) { erro = e.message; }
  ver('planilha sem linhas avisa em português',
    erro !== null && /linha/i.test(erro), erro ?? 'não lançou erro');
}

/* 5. Modelo sem nenhum campo. */
{
  const r = await generateBatch({
    templateBuffer: modelo('Texto fixo, sem campo nenhum.'),
    xlsxBuffer: planilha(['Nome'], [['Ana']]),
    filenamePattern: 'doc_{{_index}}.docx',
  });
  ver('modelo sem campos ainda gera', r.count === 1, String(r.count));
}

/* 6. Coluna a mais na planilha, sem campo correspondente. */
{
  const r = await generateBatch({
    templateBuffer: modelo('{{Nome}}'),
    xlsxBuffer: planilha(['Nome', 'Sobra'], [['Ana', 'x']]),
    filenamePattern: 'doc_{{Nome}}.docx',
  });
  ver('coluna sobrando é ignorada sem erro', r.count === 1 && r.unmapped.length === 0);
}

/* 7. Texto longo e caractere especial no valor. */
{
  const longo = 'Ação & Cia — "aspas", ponto-e-vírgula; ' + 'x'.repeat(300);
  const r = await generateBatch({
    templateBuffer: modelo('{{Texto}}'),
    xlsxBuffer: planilha(['Texto'], [[longo]]),
    filenamePattern: 'doc_{{_index}}.docx',
  });
  const zip = new PizZip(r.zipBuffer);
  const nome = Object.keys(zip.files)[0];
  const conteudo = new PizZip(zip.files[nome].asUint8Array())
    .files['word/document.xml'].asText();
  ver('texto longo e "&" não quebram o XML',
    conteudo.includes('&amp;') && !conteudo.includes('Ação & Cia'),
    'o & precisa estar escapado');
}

/* 8. Nome de arquivo que ficaria vazio depois da limpeza. */
{
  const r = await generateBatch({
    templateBuffer: modelo('{{Nome}}'),
    xlsxBuffer: planilha(['Nome'], [['///']]),
    filenamePattern: 'doc_{{Nome}}.docx',
  });
  ver('nome que sobra vazio recebe um substituto',
    r.files[0].endsWith('.docx') && r.files[0].length > 5, r.files[0]);
}

/* 9. Lote maior, para ver o tempo. */
{
  const linhas = Array.from({ length: 200 }, (_, i) => [`Cliente ${i + 1}`]);
  const t0 = Date.now();
  const r = await generateBatch({
    templateBuffer: modelo('{{Nome}}'),
    xlsxBuffer: planilha(['Nome'], linhas),
    filenamePattern: 'doc_{{Nome}}.docx',
  });
  const ms = Date.now() - t0;
  ver('200 documentos em tempo razoável',
    r.count === 200 && ms < 30000, `${ms} ms, ${(r.zipBuffer.length / 1024).toFixed(0)} KB`);
}

/* 10. Planilha com duas colunas de mesmo nome. */
{
  const lida = parseSheet(planilha(['Nome', 'Nome'], [['Ana', 'Bruno']]));
  ver('coluna duplicada não some da lista',
    lida.columns.length === 2, JSON.stringify(lida.columns));
}

console.log(problemas === 0
  ? '\nNenhum problema encontrado.'
  : `\n${problemas} ponto(s) a olhar.`);
