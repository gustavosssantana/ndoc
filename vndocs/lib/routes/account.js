import { comConta, json } from './_lib.js';
import { consumoAtual } from '../repo.js';
import { one } from '../db.js';

const conta = (u) => ({
  id: u.id, nome: u.name, email: u.email, empresa: u.company, plano: u.plan,
  /* O front usa este caminho como src da imagem; o carimbo evita cache
     velho depois de trocar a foto. */
  avatar: u.avatar_url ? `/api/avatar?v=${Date.parse(u.created_at) || 0}` : '',
  temAvatar: Boolean(u.avatar_url),
});

/** Limite da foto: imagens de perfil não precisam ser grandes. */
const MAX_AVATAR = 2 * 1024 * 1024;
const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  /* O plano é da organização, não da pessoa: mudá-lo em users não teria
     efeito nenhum na cota, que é lida de orgs. E só quem é dono pode. */
  if (corpo.plano !== undefined) {
    if (user.org_role !== 'owner') {
      return json({ error: 'Só quem é dono da conta pode mudar o plano.' }, 403);
    }
    await one('UPDATE orgs SET plan = $2 WHERE id = $1 RETURNING id',
      [user.org_id, corpo.plano]);
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

/**
 * POST /api/account — multipart com o campo "avatar".
 * Guarda a imagem no Blob e salva a URL na conta.
 */
export const POST = comConta(async (request, user) => {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Envie a imagem como multipart/form-data.' }, 400);
  }

  const arquivo = form.get('avatar');
  if (!arquivo || typeof arquivo === 'string') {
    return json({ error: 'Envie a imagem no campo "avatar".' }, 400);
  }
  if (!TIPOS_IMAGEM.includes(arquivo.type)) {
    return json({ error: 'Use uma imagem JPG, PNG, WEBP ou GIF.' }, 400);
  }
  if (arquivo.size > MAX_AVATAR) {
    return json({ error: 'A imagem passa de 2 MB.' }, 400);
  }

  const { guardar } = await import('../storage.js');
  const salvo = await guardar(
    'avatars', arquivo.name || 'foto', Buffer.from(await arquivo.arrayBuffer()), arquivo.type,
  );

  /* Guardamos o caminho, não a URL: a loja é privada e a imagem é servida
     por GET /api/avatar, que confere a sessão antes de entregar os bytes. */
  const atualizado = await one(
    'UPDATE users SET avatar_url = $2 WHERE id = $1 RETURNING *',
    [user.id, salvo.pathname],
  );

  return json({ conta: conta(atualizado), consumo: await consumoAtual(atualizado) });
});
