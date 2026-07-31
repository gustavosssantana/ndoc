import JSZip from 'jszip';
import { parseSheet } from './xlsx.js';
import { extractVariables, fillDocument } from './template.js';

/** Remove caracteres inválidos p/ nome de arquivo. */
function sanitize(name) {
  return String(name).replace(/[\/\\:*?"<>|\n\r]/g, '-').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^[-_.]+|[-_.]+$/g, '');
}

/** Resolve o padrão de nome (ex.: "Contrato_{{nome}}_{{data}}.docx"). */
function renderFilename(pattern, row, index) {
  let name = pattern
    .replace(/\{\{\s*_index\s*\}\}/g, String(index + 1))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => sanitize(row[k] ?? '') || 'sem-valor');
  if (!/\.docx$/i.test(name)) name += '.docx';
  return name;
}

/** Garante nomes únicos dentro do zip (arquivo, arquivo_2, ...). */
function unique(name, used) {
  if (!used.has(name)) { used.add(name); return name; }
  const dot = name.lastIndexOf('.');
  const base = name.slice(0, dot), ext = name.slice(dot);
  let i = 2, candidate;
  do { candidate = `${base}_${i++}${ext}`; } while (used.has(candidate));
  used.add(candidate);
  return candidate;
}

/**
 * Gera um lote de documentos a partir de um template + planilha.
 *
 * @param {Object}  opts
 * @param {Buffer}  opts.templateBuffer   .docx com {{variáveis}}
 * @param {Buffer}  opts.xlsxBuffer        planilha .xlsx
 * @param {Object}  [opts.mapping]         { variavelTemplate: colunaPlanilha }
 * @param {string}  [opts.filenamePattern] padrão do nome de cada arquivo
 * @returns {Promise<{ zipBuffer: Buffer, count: number, variables: string[], columns: string[], unmapped: string[], files: string[], ms: number }>}
 */
export async function generateBatch({ templateBuffer, xlsxBuffer, mapping = {}, filenamePattern = 'documento_{{_index}}.docx' }) {
  const started = Date.now();
  const { rows, columns } = parseSheet(xlsxBuffer);
  const variables = extractVariables(templateBuffer);

  if (rows.length === 0) throw new Error('A planilha não tem linhas de dados.');

  // auto-map: se não houver mapping explícito, casa variável -> coluna de mesmo nome
  const colSet = new Set(columns);
  const resolvedMap = {};
  const unmapped = [];
  for (const v of variables) {
    const col = mapping[v] ?? (colSet.has(v) ? v : null);
    resolvedMap[v] = col;
    if (!col) unmapped.push(v);
  }

  const out = new JSZip();
  const used = new Set();
  const files = [];

  rows.forEach((row, i) => {
    const data = {};
    for (const v of variables) {
      const col = resolvedMap[v];
      data[v] = col ? (row[col] ?? '') : '';
    }
    const docBuffer = fillDocument(templateBuffer, data);
    const name = unique(renderFilename(filenamePattern, row, i), used);
    out.file(name, docBuffer);
    files.push(name);
  });

  const zipBuffer = await out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  return { zipBuffer, count: rows.length, variables, columns, unmapped, files, ms: Date.now() - started };
}
