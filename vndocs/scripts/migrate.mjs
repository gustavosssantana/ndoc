/**
 * Aplica as migrações de db/ no banco apontado por POSTGRES_URL.
 * Idempotente: tudo usa IF NOT EXISTS, então rodar de novo não estraga nada.
 *
 *   POSTGRES_URL=... node scripts/migrate.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/db.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = join(raiz, 'db');
const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort();

if (!arquivos.length) {
  console.log('nenhuma migração em db/');
  process.exit(0);
}

const pool = db();
for (const nome of arquivos) {
  const sql = readFileSync(join(pasta, nome), 'utf8');
  process.stdout.write(`aplicando ${nome} ... `);
  await pool.query(sql);
  console.log('ok');
}
await pool.end();
console.log(`\n${arquivos.length} migração(ões) aplicada(s).`);
