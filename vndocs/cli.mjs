// CLI: gera o lote de documentos a partir de um template + planilha.
//   node cli.mjs [template.docx] [data.xlsx] [saida.zip] [--pattern "Contrato_{{nome}}.docx"]
// Sem argumentos, usa os arquivos em ./samples.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { generateBatch } from './lib/generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// separa flags de argumentos posicionais
const argv = process.argv.slice(2);
const positional = [];
let pattern = 'Contrato_{{nome}}_{{data_inicio}}.docx';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--pattern') pattern = argv[++i];
  else positional.push(argv[i]);
}

const templatePath = resolve(positional[0] || join(__dirname, 'samples', 'template.docx'));
const dataPath     = resolve(positional[1] || join(__dirname, 'samples', 'data.xlsx'));
const outPath      = resolve(positional[2] || join(__dirname, 'out', 'documentos.zip'));

if (!existsSync(templatePath) || !existsSync(dataPath)) {
  console.error('✗ arquivos não encontrados. Rode `npm run samples` primeiro, ou passe os caminhos.');
  console.error(`  template: ${templatePath}`);
  console.error(`  planilha: ${dataPath}`);
  process.exit(1);
}

const result = await generateBatch({
  templateBuffer: readFileSync(templatePath),
  xlsxBuffer: readFileSync(dataPath),
  filenamePattern: pattern,
});

// garante a pasta de saída
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, result.zipBuffer);

console.log('✓ geração concluída');
console.log(`  documentos : ${result.count}`);
console.log(`  variáveis  : ${result.variables.join(', ')}`);
console.log(`  colunas    : ${result.columns.join(', ')}`);
if (result.unmapped.length) console.log(`  ⚠ não mapeadas: ${result.unmapped.join(', ')}`);
console.log(`  tempo      : ${result.ms} ms`);
console.log(`  saída      : ${outPath} (${(result.zipBuffer.length / 1024).toFixed(1)} KB)`);
console.log(`  arquivos   : ${result.files.slice(0, 3).join(', ')}${result.files.length > 3 ? ', …' : ''}`);
