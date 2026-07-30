import { comConta, json } from './_lib.js';
import { consumoAtual } from '../lib/repo.js';
import { one } from '../lib/db.js';

const conta = (u) => ({
  id: u.id, nome: u.name, email: u.email, empresa: u.company, plano: u.plan,
});

/** GET /api/account — dados da conta + consumo do ciclo. */
export const GET = comConta(async (_req, user) => json({
  conta: conta(user),
  consumo: await consumoAtual(user),
}));

/** PATCH /api/account — corpo JSON: { nome?, empresa?, plano? } */
export const PATCH = comConta(async (request, user) => {
  const corpo = await request.json().catch(() => ({}));
  const planos = ['starter', 'pro', 'business', 'enterprise'];

  if (corpo.plano !== undefined && !planos.includes(corpo.plano)) {
    return json({ error: `Plano inválido. Use um de: ${planos.join(', ')}.` }, 400);
  }
  if (corpo.nome !== undefined && !String(corpo.nome).trim()) {
    return json({ error: 'O nome não pode ficar vazio.' }, 400);
  }

  const atualizado = await one(
    `UPDATE users
        SET name    = COALESCE($2, name),
            company = COALESCE($3, company),
            plan    = COALESCE($4, plan)
      WHERE id = $1
      RETURNING *`,
    [
      user.id,
      corpo.nome !== undefined ? String(corpo.nome).trim() : null,
      corpo.empresa !== undefined ? String(corpo.empresa).trim() : null,
      corpo.plano ?? null,
    ],
  );

  return json({ conta: conta(atualizado), consumo: await consumoAtual(atualizado) });
});
