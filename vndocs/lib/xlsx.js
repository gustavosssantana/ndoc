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
  // defval garante que células vazias virem string vazia (e não sumam da linha)
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

  // colunas = cabeçalho da 1ª linha (preserva a ordem original)
  const header = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || [];
  const columns = header.map(String);

  return { rows, columns };
}
