/**
 * Abre a primeira conta sem passar pela tela de cadastro.
 *
 *   POSTGRES_URL=... node scripts/seed.mjs email@dominio.com "senha com 8+"
 */
import { db, semearConta } from '../lib/db.js';

const [email, senha, nome = '', empresa = ''] = process.argv.slice(2);
if (!email || !senha) {
  console.error('uso: node scripts/seed.mjs <email> <senha> [nome] [empresa]');
  process.exit(1);
}

const u = await semearConta({ email, senha, nome, empresa });
console.log(`conta pronta: ${u.email} (plano ${u.plan})`);
await db().end();
