import * as XLSX from 'xlsx';

/**
 * Lê a primeira aba de uma planilha .xlsx/.csv e devolve linhas + colunas.
 * @param {Buffer} buffer  conteúdo do arquivo
 * @returns {{ rows: Object[], columns: string[] }}
 */
export function parseSheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], columns: [] };

  const ws = wb.Sheets[sheetName];

  /* raw: false entrega o texto como a célula mostra na tela. É o que
     preserva CPF com zero à esquerda, data em dd/mm/aaaa e valor em reais —
     com raw: true, "01234567890" viraria o número 1234567890 e a data
     viraria o serial do Excel.
     defval mantém a coluna na linha mesmo quando a célula está vazia. */
  const brutas = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

  /* Cabeçalho: também como texto, senão uma coluna chamada "2026" chegaria
     como número e nunca casaria com {{2026}} do modelo. */
  const cabecalho = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })[0] || [];
  const columns = cabecalho.map((c) => String(c ?? '').trim()).filter(Boolean);

  /* Linha totalmente vazia não vira documento em branco. Planilhas reais
     costumam ter linhas soltas no fim. */
  const rows = brutas.filter((linha) =>
    Object.values(linha).some((v) => String(v ?? '').trim() !== ''));

  return { rows, columns };
}
