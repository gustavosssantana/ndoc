import { extractVariables } from '../lib/template.js';
import { parseSheet } from '../lib/xlsx.js';
import { readUpload, json, PREVIEW_CAP, comConta } from './_lib.js';

/**
 * POST /api/inspect
 * multipart: template (.docx), data (.xlsx)
 * -> variáveis do template + colunas da planilha + mapeamento inferido
 */
export const POST = comConta(async (request) => {
  let upload;
  try {
    upload = await readUpload(request);
  } catch (err) {
    return json({ error: err.message }, 400);
  }

  try {
    const variables = extractVariables(upload.templateBuffer);
    const { columns, rows } = parseSheet(upload.xlsxBuffer);
    const autoMapped = variables.filter((v) => columns.includes(v));

    return json({
      variables,
      columns,
      rowCount: rows.length,
      rows: rows.slice(0, PREVIEW_CAP),
      autoMapped,
      unmapped: variables.filter((v) => !autoMapped.includes(v)),
    });
  } catch (err) {
    console.error('inspect falhou:', err);
    return json({ error: err.message || 'Não foi possível ler os arquivos.' }, 422);
  }
});
