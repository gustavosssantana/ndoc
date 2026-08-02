import { extractVariables, contarCampos } from '../template.js';
import { parseSheet } from '../xlsx.js';
import { casarCampos } from '../matching.js';
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
    const { campos, total } = contarCampos(upload.templateBuffer);
    const variables = campos.map((c) => c.nome);
    const { columns, rows } = parseSheet(upload.xlsxBuffer);
    /* exatos + aproximados (acento/maiúscula). O que sobra é avisado. */
    const casamento = casarCampos(variables, columns);
    const autoMapped = Object.keys(casamento.mapa);

    return json({
      variables,
      /* Únicos e ocorrências são coisas diferentes: um {{nome}} repetido
         cinco vezes é UM campo e precisa de UMA coluna na planilha. */
      fieldCounts: campos,
      totalOccurrences: total,
      columns,
      rowCount: rows.length,
      rows: rows.slice(0, PREVIEW_CAP),
      autoMapped,
      mapping: casamento.mapa,
      /* Casaram apesar de escritos diferente — a tela mostra o par para a
         pessoa conferir, em vez de esconder a correção. */
      approxMatches: casamento.aproximados,
      unmapped: casamento.semPar,
    });
  } catch (err) {
    console.error('inspect falhou:', err);
    return json({ error: err.message || 'Não foi possível ler os arquivos.' }, 422);
  }
});
