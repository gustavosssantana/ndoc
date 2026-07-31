// Cria arquivos de amostra p/ testar o motor: samples/template.docx + samples/data.xlsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import PizZip from 'pizzip';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'samples');
mkdirSync(outDir, { recursive: true });

/* ── 1. template.docx (OOXML mínimo, mas válido) ─────────────────────── */
const p = (text) =>
  `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const bold = (text) =>
  `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bold('CONTRATO DE PRESTAÇÃO DE SERVIÇOS')}
    ${p('Nº {{numero}}')}
    ${p('')}
    ${p('Pelo presente instrumento, de um lado {{nome}}, portador(a) do CPF {{cpf}}, residente em {{cidade}}, doravante CONTRATANTE, e de outro lado Gustavo Vita Consultoria, doravante CONTRATADA, ajustam o seguinte:')}
    ${p('')}
    ${p('Cláusula 1ª - Do Objeto. A CONTRATADA prestará serviços de consultoria, com início em {{data_inicio}} e término em {{data_fim}}.')}
    ${p('Cláusula 2ª - Do Valor. A CONTRATANTE pagará o valor total de {{valor}}, em parcelas mensais.')}
    ${p('')}
    ${p('{{cidade}}, {{data_inicio}}.')}
    <w:sectPr/>
  </w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const zip = new PizZip();
zip.file('[Content_Types].xml', contentTypes);
zip.folder('_rels').file('.rels', rels);
zip.folder('word').file('document.xml', documentXml);
const docxBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(join(outDir, 'template.docx'), docxBuffer);

/* ── 2. data.xlsx (colunas casam com as {{variáveis}}) ───────────────── */
const data = [
  { numero: '2026/03/0032', nome: 'Ana Beatriz Lima',  cpf: '321.654.987-00', cidade: 'São Paulo',      valor: 'R$ 1.800,00', data_inicio: '10/02/2026', data_fim: '10/02/2027' },
  { numero: '2026/03/0033', nome: 'Carlos Eduardo Sá', cpf: '456.789.012-34', cidade: 'Rio de Janeiro', valor: 'R$ 4.500,00', data_inicio: '15/02/2026', data_fim: '15/02/2027' },
  { numero: '2026/03/0034', nome: 'Lia Pereira Costa', cpf: '789.123.456-78', cidade: 'Belo Horizonte', valor: 'R$ 2.300,00', data_inicio: '20/02/2026', data_fim: '20/02/2027' },
  { numero: '2026/03/0035', nome: 'Marcos Vinícius R.',cpf: '654.321.098-76', cidade: 'Curitiba',       valor: 'R$ 3.100,00', data_inicio: '25/02/2026', data_fim: '25/02/2027' },
  { numero: '2026/03/0036', nome: 'Patrícia Gomes',    cpf: '147.258.369-00', cidade: 'Porto Alegre',   valor: 'R$ 5.200,00', data_inicio: '01/03/2026', data_fim: '01/03/2027' },
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'clientes');
XLSX.writeFile(wb, join(outDir, 'data.xlsx'));

console.log(`✓ amostras criadas em ${outDir}`);
console.log('  - template.docx (7 variáveis)');
console.log(`  - data.xlsx (${data.length} linhas)`);
