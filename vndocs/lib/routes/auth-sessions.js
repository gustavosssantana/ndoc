import { json } from './_lib.js';
import { query, one } from '../db.js';
import { lerCookie, usuarioDaSessao } from '../auth.js';
import { createHash } from 'node:crypto';

const impressao = (token) => createHash('sha256').update(token).digest('hex');

/**
 * GET /api/auth/sessions — aparelhos com sessão aberta.
 *
 * Substituiu o interruptor de "autenticação em dois fatores", que não fazia
 * nada. Isto é o mesmo assunto — segurança da conta — mas verdadeiro: as
 * sessões existem no banco e podem ser encerradas.
 */
export async function GET(request) {
  const token = lerCookie(request);
  const user = await usuarioDaSessao(token);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  const atual = impressao(token);
  const linhas = await query(
    `SELECT token_hash, user_agent, created_at, last_seen_at
       FROM sessions
      WHERE user_id = $1 AND expires_at > now()
      ORDER BY last_seen_at DESC`,
    [user.id],
  );

  return json({
    sessoes: linhas.map((s) => ({
      atual: s.token_hash === atual,
      aparelho: descreverAparelho(s.user_agent),
      desde: s.created_at,
      visto: s.last_seen_at,
    })),
  });
}

/** DELETE /api/auth/sessions — encerra todas menos a deste aparelho. */
export async function DELETE(request) {
  const token = lerCookie(request);
  const user = await usuarioDaSessao(token);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  const encerradas = await query(
    'DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2 RETURNING id',
    [user.id, impressao(token)],
  );
  return json({ encerradas: encerradas.length });
}

/** Nome legível a partir do user-agent — sem prometer precisão. */
function descreverAparelho(ua = '') {
  const s = String(ua);
  const sistema =
    /iPhone|iPad/i.test(s) ? 'iPhone' :
    /Android/i.test(s) ? 'Android' :
    /Mac OS X|Macintosh/i.test(s) ? 'Mac' :
    /Windows/i.test(s) ? 'Windows' :
    /Linux/i.test(s) ? 'Linux' : 'Aparelho';
  const navegador =
    /Edg\//i.test(s) ? 'Edge' :
    /OPR\//i.test(s) ? 'Opera' :
    /Chrome\//i.test(s) ? 'Chrome' :
    /Safari\//i.test(s) ? 'Safari' :
    /Firefox\//i.test(s) ? 'Firefox' : '';
  return navegador ? `${sistema} · ${navegador}` : sistema;
}
