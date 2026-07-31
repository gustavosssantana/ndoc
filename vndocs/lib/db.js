import pg from 'pg';

/**
 * Pool único por instância. Em serverless a instância é reaproveitada entre
 * invocações, então o pool sobrevive e evita reconectar a cada requisição.
 * max: 1 porque cada invocação atende uma requisição de cada vez — pool
 * grande em serverless só esgota as conexões do banco.
 */
let pool;

function connectionString() {
  const url =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error(
      'Banco não configurado: defina POSTGRES_URL. Na Vercel, criar o Neon ' +
      'em Storage já injeta essa variável.',
    );
  }
  return url;
}

export function db() {
  if (!pool) {
    const url = connectionString();
    const local = /localhost|127\.0\.0\.1/.test(url);
    pool = new pg.Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      // Neon exige TLS; no Postgres local não há certificado.
      ssl: local ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (e) => console.error('erro inesperado no pool:', e.message));
  }
  return pool;
}

/** Executa uma query e devolve as linhas. */
export async function query(text, params = []) {
  const res = await db().query(text, params);
  return res.rows;
}

/** Executa e devolve a primeira linha, ou null. */
export async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/** Roda várias queries numa transação; recebe um objeto com .query. */
export async function tx(fn) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/* ── Semente ─────────────────────────────────────────────────────────── */

/**
 * Cria (ou atualiza a senha de) uma conta. Usado por `npm run db:seed` para
 * abrir a primeira conta sem precisar da tela de cadastro.
 *
 * A conta em uso nas rotas NÃO vem daqui — vem da sessão, em lib/auth.js.
 */
export async function semearConta({ email, senha, nome = '', empresa = '' }) {
  const { gerarHash, criticarSenha } = await import('./auth.js');
  const queixa = criticarSenha(senha);
  if (queixa) throw new Error(queixa);

  const limpo = String(email).trim().toLowerCase();
  return one(
    `INSERT INTO users (email, name, company, plan, password_hash)
     VALUES ($1, $2, $3, 'pro', $4)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name    = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
           company = COALESCE(NULLIF(EXCLUDED.company, ''), users.company)
     RETURNING *`,
    [limpo, nome, empresa, await gerarHash(senha)],
  );
}
