/**
 * Casamento entre os campos do modelo e as colunas da planilha.
 *
 * A regra é o nome igual. Mas "igual" para uma pessoa não é o mesmo que
 * "igual" para o computador: quem escreve {{Número}} no Word costuma
 * digitar "Numero" na planilha, ou "nome" em vez de "Nome". Recusar esses
 * casos faz o produto parecer quebrado por um acento.
 *
 * Então comparamos por uma forma normalizada — sem acento, sem maiúscula,
 * sem espaço sobrando. O que NÃO fazemos é adivinhar: "Cliente" não casa
 * com {{Nome}}, porque escolher a coluna errada sozinho é pior do que
 * avisar que faltou. Sinônimo é decisão de quem conhece os dados.
 */

/** Reduz um nome à sua forma comparável. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')                    // separa a letra do acento
    .replace(/[\u0300-\u036f]/g, '')     // remove os acentos
    .replace(/[\s_-]+/g, ' ')            // espaço, sublinhado e hífen se equivalem
    .trim()
    .toLowerCase();
}

/**
 * Para cada campo, acha a coluna correspondente.
 *
 * @param {string[]} campos   nomes vindos do modelo
 * @param {string[]} colunas  cabeçalhos da planilha
 * @returns {{ mapa: Object, exatos: string[], aproximados: {campo,coluna}[], semPar: string[] }}
 */
export function casarCampos(campos, colunas) {
  /* Índice das colunas pela forma normalizada. A primeira ocorrência vence,
     para o resultado não depender da ordem quando há duas parecidas. */
  const porNormal = new Map();
  for (const c of colunas) {
    const chave = normalizar(c);
    if (!porNormal.has(chave)) porNormal.set(chave, c);
  }

  const mapa = {};
  const exatos = [];
  const aproximados = [];
  const semPar = [];

  for (const campo of campos) {
    if (colunas.includes(campo)) {
      mapa[campo] = campo;
      exatos.push(campo);
      continue;
    }
    const achada = porNormal.get(normalizar(campo));
    if (achada) {
      mapa[campo] = achada;
      aproximados.push({ campo, coluna: achada });
    } else {
      semPar.push(campo);
    }
  }

  return { mapa, exatos, aproximados, semPar };
}
