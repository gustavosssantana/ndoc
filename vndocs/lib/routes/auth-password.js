import { json } from './_lib.js';
import { one, query } from '../db.js';
import {
  lerCookie, usuarioDaSessao, conferirSenha, gerarHash, criticarSenha,
  criarSessao, cookieDeSessao,
} from '../auth.js';

/**
 * POST /api/auth/password — { senhaAtual, senhaNova }
 *
 * Trocar a senha derruba todas as outras sessões: se alguém tinha acesso
 * indevido, ele perde na hora. A sessão de quem trocou é recriada, para a
 * pessoa não ser deslogada do próprio aparelho.
 */
export async function POST(request) {
  const token = lerCookie(request);
  const user = await usuarioDaSessao(token);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const atual = String(corpo.senhaAtual ?? '');
  const nova = String(corpo.senhaNova ?? '');

  if (!atual) return json({ error: 'Informe a senha atual.' }, 400);

  const queixa = criticarSenha(nova);
  if (queixa) return json({ error: queixa }, 400);

  if (atual === nova) {
    return json({ error: 'A nova senha precisa ser diferente da atual.' }, 400);
  }

  if (!(await conferirSenha(atual, user.password_hash))) {
    return json({ error: 'A senha atual está incorreta.' }, 401);
  }

  await query('UPDATE users SET password_hash = $2 WHERE id = $1',
    [user.id, await gerarHash(nova)]);

  /* Derruba tudo e devolve uma sessão nova para este aparelho. */
  await query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
  const sessao = await criarSessao(user.id, request.headers.get('user-agent') || '');

  return new Response(JSON.stringify({ ok: true, sessoesEncerradas: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': cookieDeSessao(sessao.token, sessao.expira),
    },
  });
}
