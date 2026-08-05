import * as XLSX from 'xlsx';

/**
 * Lê a primeira aba de uma planilha e devolve as colunas e as linhas.
 *
 * Não assume que os dados começam em A1. Planilhas reais costumam ter
 * linhas ou colunas vazias antes do cabeçalho — e nesse caso o leitor
 * padrão devolvia colunas chamadas "__EMPTY", nenhum campo casava e os
 * documentos saíam todos vazios.
 *
 * @param {Buffer} buffer conteúdo do .xlsx / .xls / .csv
 * @returns {{ rows: Object[], columns: string[], headerRow: number }}
 */
export function parseSheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const nomeAba = wb.SheetNames[0];
  if (!nomeAba) return { rows: [], columns: [], headerRow: 0 };

  /* raw: false entrega o texto como a célula mostra na tela. É o que
     preserva CPF com zero à esquerda, data em dd/mm/aaaa e valor em reais —
     com raw: true, "01234567890" viraria o número 1234567890. */
  const grade = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], {
    header: 1, raw: false, defval: '', blankrows: true,
  });

  const vazio = (c) => String(c ?? '').trim() === '';

  /* O cabeçalho é a primeira linha com dois ou mais rótulos preenchidos.
     Exigir dois evita confundir um título solto ("Relatório de vendas")
     numa célula com a linha de cabeçalho de verdade. */
  let iCabecalho = grade.findIndex((l) => l.filter((c) => !vazio(c)).length >= 2);
  /* Planilha de coluna única: aceita a primeira linha preenchida. */
  if (iCabecalho === -1) iCabecalho = grade.findIndex((l) => l.some((c) => !vazio(c)));
  if (iCabecalho === -1) return { rows: [], columns: [], headerRow: 0 };

  const cabecalho = grade[iCabecalho];

  /* Guarda em que coluna cada rótulo está: as colunas vazias à esquerda
     são puladas, e uma coluna sem rótulo no meio é ignorada. */
  const posicoes = [];
  cabecalho.forEach((rotulo, i) => {
    if (!vazio(rotulo)) posicoes.push({ indice: i, nome: String(rotulo).trim() });
  });

  const columns = posicoes.map((p) => p.nome);

  const rows = grade
    .slice(iCabecalho + 1)
    .map((linha) => {
      const registro = {};
      for (const { indice, nome } of posicoes) {
        registro[nome] = String(linha[indice] ?? '');
      }
      return registro;
    })
    /* Linha totalmente vazia não vira documento em branco. */
    .filter((r) => Object.values(r).some((v) => String(v).trim() !== ''));

  return { rows, columns, headerRow: iCabecalho + 1 };
}
