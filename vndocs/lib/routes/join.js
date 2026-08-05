import { comConta, json } from './_lib.js';
import { one, query, tx } from '../db.js';
import { limiteDo } from '../plans.js';

/**
 * POST /api/join — entra numa empresa usando um código de convite.
 *
 * Diferente do cadastro com convite: aqui a pessoa JÁ tem conta. Ela digita
 * o código dentro do app e passa a fazer parte da empresa.
 *
 * O que acontece com o que ela já tinha: o conteúdo da organização antiga
 * vai junto para a nova. É o que a pessoa espera — ela não quer perder os
 * modelos que já montou ao entrar na equipe. Nada é apagado.
 */
export const POST = comConta(async (request, user) => {
  const corpo = await request.json().catch(() => ({}));
  const codigo = String(corpo.codigo ?? '').trim().toUpperCase();

  if (!codigo) return json({ error: 'Informe o código do convite.' }, 400);

  const convite = await one(
    `SELECT code, org_id FROM org_invites
      WHERE upper(code) = $1 AND used_by IS NULL AND expires_at > now()`,
    [codigo],
  );
  if (!convite) {
    return json({ error: 'Código inválido, já usado ou vencido.' }, 404);
  }

  const orgAntiga = user.org_id;
  const orgNova = convite.org_id;

  if (orgAntiga === orgNova) {
    return json({ error: 'Você já faz parte desta empresa.' }, 409);
  }

  /* Cabe mais uma pessoa no plano de destino? */
  const org = await one('SELECT name, plan FROM orgs WHERE id = $1', [orgNova]);
  const limite = limiteDo(org?.plan);
  if (limite.usuarios !== Infinity) {
    const atual = await one(
      'SELECT COUNT(*)::int AS n FROM users WHERE org_id = $1',
      [orgNova],
    );
    if (atual.n >= limite.usuarios) {
      return json({
        error: `A empresa já usou as ${limite.usuarios} vagas do plano ${limite.nome}.`,
      }, 409);
    }
  }

  /* Se a pessoa era a única da organização antiga, o conteúdo dela vem
     junto. Se havia mais gente lá, o conteúdo fica — é da empresa, não
     dela, e levar embora seria roubar da equipe que continua. */
  const restantes = orgAntiga
    ? await one('SELECT COUNT(*)::int AS n FROM users WHERE org_id = $1 AND id <> $2',
        [orgAntiga, user.id])
    : { n: 0 };
  const levaConteudo = orgAntiga && restantes.n === 0;

  const movido = await tx(async (client) => {
    await client.query(
      "UPDATE users SET org_id = $2, org_role = 'member' WHERE id = $1",
      [user.id, orgNova],
    );
    await client.query(
      'UPDATE org_invites SET used_by = $2, used_at = now() WHERE code = $1',
      [convite.code, user.id],
    );

    if (!levaConteudo) return { pastas: 0, modelos: 0, planilhas: 0, geracoes: 0 };

    /* Nome de pasta é único por organização: se a empresa de destino já tem
       uma pasta com o mesmo nome, a que vem ganha um sufixo em vez de
       quebrar a migração. */
    const { rows: colidindo } = await client.query(
      `SELECT a.id, a.name FROM folders a
        WHERE a.org_id = $1
          AND EXISTS (SELECT 1 FROM folders b WHERE b.org_id = $2 AND b.name = a.name)`,
      [orgAntiga, orgNova],
    );
    for (const pasta of colidindo) {
      await client.query('UPDATE folders SET name = $2 WHERE id = $1',
        [pasta.id, `${pasta.name} (de ${user.name || user.email})`]);
    }

    const contas = {};
    for (const [chave, tabela] of Object.entries({
      pastas: 'folders', modelos: 'templates', planilhas: 'sheets', geracoes: 'generations',
    })) {
      const { rowCount } = await client.query(
        `UPDATE ${tabela} SET org_id = $2 WHERE org_id = $1`,
        [orgAntiga, orgNova],
      );
      contas[chave] = rowCount;
    }

    /* Soma o consumo do ciclo, para a cota da empresa não ficar errada. */
    await client.query(
      `INSERT INTO org_usage (org_id, period, generations_used, documents_used)
       SELECT $2, period, generations_used, documents_used
         FROM org_usage WHERE org_id = $1
          ON CONFLICT (org_id, period) DO UPDATE
            SET generations_used = org_usage.generations_used + EXCLUDED.generations_used,
                documents_used   = org_usage.documents_used + EXCLUDED.documents_used`,
      [orgAntiga, orgNova],
    );

    /* A organização antiga ficou sem ninguém e sem conteúdo. */
    await client.query('DELETE FROM orgs WHERE id = $1', [orgAntiga]);

    return contas;
  });

  return json({
    ok: true,
    empresa: org.name,
    levouConteudo: levaConteudo,
    movido,
  });
});

/**
 * GET /api/join?codigo=... — mostra de qual empresa é o convite.
 *
 * Serve para a pessoa confirmar antes de entrar, em vez de descobrir depois.
 * Devolve só o nome da empresa: nada sobre o conteúdo dela.
 */
export const GET = comConta(async (request, _user) => {
  const codigo = String(new URL(request.url).searchParams.get('codigo') ?? '')
    .trim().toUpperCase();
  if (!codigo) return json({ error: 'Informe o código.' }, 400);

  const linha = await one(
    `SELECT o.name, o.plan
       FROM org_invites i JOIN orgs o ON o.id = i.org_id
      WHERE upper(i.code) = $1 AND i.used_by IS NULL AND i.expires_at > now()`,
    [codigo],
  );
  if (!linha) return json({ error: 'Código inválido, já usado ou vencido.' }, 404);

  return json({ empresa: linha.name, plano: linha.plan });
});
