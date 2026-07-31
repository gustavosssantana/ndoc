import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const DELIMITERS = { start: '{{', end: '}}' };
const TAG_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function makeDoc(templateBuffer) {
  const zip = new PizZip(templateBuffer);
  return new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: DELIMITERS,
    // variável não mapeada vira string vazia em vez de estourar erro
    nullGetter: () => '',
  });
}

/**
 * Lista as variáveis {{...}} presentes no texto do template.
 * @param {Buffer} templateBuffer
 * @returns {string[]} nomes únicos, na ordem de aparição
 */
export function extractVariables(templateBuffer) {
  const text = makeDoc(templateBuffer).getFullText();
  const seen = new Set();
  let m;
  while ((m = TAG_RE.exec(text)) !== null) seen.add(m[1]);
  return [...seen];
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
