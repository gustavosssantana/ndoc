import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const DELIMITADORES = { start: '{{', end: '}}' };

/**
 * Reconhece {{qualquer coisa}} entre as chaves.
 *
 * Só chave dupla, de propósito. Chave simples chegou a ser aceita, mas o
 * risco não compensa: "{" aparece por acaso em texto comum — fórmulas,
 * trechos de código, citações — e viraria campo, estragando o documento.
 *
 * O conteúdo é livre (aceita acento, cedilha e espaço) porque a versão
 * anterior usava [\w.]+, que em JavaScript não inclui acento: {{Número}}
 * simplesmente não era visto.
 */
const TAG_RE = /\{\{\s*([^{}\n\r]+?)\s*\}\}/g;
/**
 * Reconhece {{qualquer coisa}} entre as chaves.
 *
 * A versão anterior usava [\w.]+, que em JavaScript é só A-Z, a-z, 0-9 e
 * sublinhado — sem acento. Campos como {{Número}}, {{Endereço}} ou
 * {{Data de Emissão}} simplesmente não eram vistos, mesmo existindo no
 * documento. Em português isso derruba boa parte dos modelos reais.
 *
 * Agora aceita tudo o que não seja chave nem quebra de linha, que é o mesmo
 * critério do docxtemplater na hora de preencher — as duas pontas passam a
 * enxergar exatamente os mesmos campos.
 */

function makeDoc(templateBuffer) {
  const zip = new PizZip(templateBuffer);
  return new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: DELIMITADORES,
    // variável não mapeada vira string vazia em vez de estourar erro
    nullGetter: () => '',
  });
}

/** Partes do .docx que podem conter texto visível. */
const PARTES_COM_TEXTO = /^word\/(document\d*|header\d+|footer\d+|footnotes|endnotes)\.xml$/;

/**
 * Junta o texto de todas as partes do documento.
 *
 * getFullText() do docxtemplater devolve só o corpo — campos que existem
 * apenas no cabeçalho ou no rodapé passavam despercebidos, mesmo sendo
 * preenchidos na hora de gerar. Aqui lemos o XML de cada parte.
 *
 * O XML é lido como texto porque um mesmo {{campo}} pode estar partido em
 * vários "runs" (acontece quando se edita a palavra no Word); remover as
 * tags antes de procurar recompõe o marcador.
 */
function textoDeTodasAsPartes(templateBuffer) {
  const zip = new PizZip(templateBuffer);
  const pedacos = [];

  for (const nome of Object.keys(zip.files)) {
    if (!PARTES_COM_TEXTO.test(nome)) continue;
    const xml = zip.files[nome].asText();
    /* Tira as tags XML, mantendo o texto. Runs partidos se juntam. */
    pedacos.push(xml.replace(/<[^>]*>/g, ''));
  }
  return pedacos.join('\n');
}

/**
 * Lista os campos {{...}} do template.
 *
 * @param {Buffer} templateBuffer
 * @returns {string[]} nomes únicos, na ordem em que aparecem
 */
export function extractVariables(templateBuffer) {
  return contarCampos(templateBuffer).campos.map((c) => c.nome);
}

/**
 * Campos únicos e quantas vezes cada um aparece.
 *
 * A distinção importa na interface: um modelo com {{nome}} repetido cinco
 * vezes tem UM campo, não cinco. Dizer "5 campos" confundiria quem monta a
 * planilha, que precisa de uma coluna só.
 *
 * @returns {{ campos: {nome: string, ocorrencias: number}[], total: number }}
 */
export function contarCampos(templateBuffer) {
  const texto = textoDeTodasAsPartes(templateBuffer);
  const contagem = new Map();

  let m;
  const re = new RegExp(TAG_RE.source, 'g');
  while ((m = re.exec(texto)) !== null) {
    const nome = m[1];
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }

  const campos = [...contagem.entries()].map(([nome, ocorrencias]) => ({ nome, ocorrencias }));
  return { campos, total: campos.reduce((a, c) => a + c.ocorrencias, 0) };
}

/**
 * Preenche o template com um objeto de dados e devolve o .docx resultante.
 * @param {Buffer} templateBuffer
 * @param {Object} data  { nome: 'Ana', cpf: '...' }
 * @returns {Buffer} .docx preenchido
 */
export function fillDocument(templateBuffer, data) {
  const doc = makeDoc(templateBuffer);
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
