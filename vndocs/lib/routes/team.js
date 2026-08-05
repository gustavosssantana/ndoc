import { comConta, json } from './_lib.js';
import { one, query } from '../db.js';
import { limiteDo } from '../plans.js';
import { randomBytes } from 'node:crypto';

/**
 * GET /api/team — quem está na organização e os convites em aberto.
 *
 * A biblioteca é compartilhada por organização: todo mundo que aparece aqui
 * vê os mesmos modelos, planilhas e histórico.
 */
export const GET = comConta(async (_req, user) => {
  const orgId = user.org_id;
  if (!orgId) return json({ error: 'Conta sem organização.' }, 409);

  const [org, pessoas, convites] = await Promise.all([
    one('SELECT id, name, plan, created_at FROM orgs WHERE id = $1', [orgId]),
    query(
      `SELECT id, email, name, org_role, last_login_at, created_at
         FROM users WHERE org_id = $1
        ORDER BY (org_role = 'owner') DESC, name, email`,
      [orgId],
    ),
    query(
      `SELECT code, email, created_at, expires_at
         FROM org_invites
        WHERE org_id = $1 AND used_by IS NULL AND expires_at > now()
        ORDER BY created_at DESC`,
      [orgId],
    ),
  ]);

  const limite = limiteDo(org?.plan);

  return json({
    org: { id: org.id, nome: org.name, plano: org.plan, planoNome: limite.nome },
    limiteUsuarios: limite.usuarios === Infinity ? null : limite.usuarios,
    voceEhDono: user.org_role === 'owner',
    pessoas: pessoas.map((p) => ({
      id: p.id,
      nome: p.name || '',
      email: p.email,
      papel: p.org_role,
      voce: p.id === user.id,
      ultimoAcesso: p.last_login_at,
    })),
    convites: convites.map((c) => ({
      codigo: c.code,
      email: c.email || null,
      expira: c.expires_at,
    })),
  });
});

/**
 * POST /api/team — cria um convite.
 *
 * O convite é um código que a pessoa usa no cadastro. Não depende de envio
 * de e-mail, que ainda não existe no projeto — você passa o código como
 * preferir.
 */
export const POST = comConta(async (request, user) => {
  if (user.org_role !== 'owner') {
    return json({ error: 'Só quem é dono da conta pode convidar.' }, 403);
  }

  const orgId = user.org_id;
  const corpo = await request.json().catch(() => ({}));
  const email = String(corpo.email ?? '').trim().toLowerCase();

  const org = await one('SELECT plan FROM orgs WHERE id = $1', [orgId]);
  const limite = limiteDo(org?.plan);

  /* Conta gente e convite em aberto junto: senão dá para furar o limite
     criando dez convites de uma vez. */
  if (limite.usuarios !== Infinity) {
    const atual = await one(
      `SELECT (SELECT COUNT(*) FROM users WHERE org_id = $1)
            + (SELECT COUNT(*) FROM org_invites
                WHERE org_id = $1 AND used_by IS NULL AND expires_at > now())
              AS total`,
      [orgId],
    );
    if (Number(atual.total) >= limite.usuarios) {
      return json({
        error: `O plano ${limite.nome} permite ${limite.usuarios} ${limite.usuarios === 1 ? 'usuário' : 'usuários'}, contando os convites em aberto.`,
      }, 409);
    }
  }

  /* Código curto e legível para ditar por telefone, sem caractere ambíguo. */
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(10);
  const codigo = [...bytes].map((b) => alfabeto[b % alfabeto.length]).join('');

  const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await one(
    `INSERT INTO org_invites (code, org_id, created_by, email, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING code`,
    [codigo, orgId, user.id, email, expira],
  );

  return json({ codigo, email: email || null, expira }, 201);
});

/** DELETE /api/team?codigo=... — cancela um convite ainda não usado. */
export const DELETE = comConta(async (request, user) => {
  if (user.org_role !== 'owner') {
    return json({ error: 'Só quem é dono da conta pode cancelar convites.' }, 403);
  }
  const codigo = new URL(request.url).searchParams.get('codigo');
  if (!codigo) return json({ error: 'Informe o código.' }, 400);

  const r = await one(
    'DELETE FROM org_invites WHERE code = $1 AND org_id = $2 AND used_by IS NULL RETURNING code',
    [codigo, user.org_id],
  );
  return r ? json({ cancelado: true }) : json({ error: 'Convite não encontrado.' }, 404);
});
