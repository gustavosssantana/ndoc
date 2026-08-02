import { json } from './_lib.js';
import { lerCookie, usuarioDaSessao } from '../auth.js';
import { ler } from '../storage.js';

/**
 * GET /api/avatar — devolve a foto de perfil de quem está logado.
 *
 * A loja de Blob é privada, então o navegador não consegue buscar a imagem
 * direto pela URL. Esta rota lê o arquivo no servidor, já com a sessão
 * conferida, e devolve os bytes.
 */
export async function GET(request) {
  const user = await usuarioDaSessao(lerCookie(request));
  if (!user) return json({ error: 'Não autenticado.' }, 401);
  if (!user.avatar_url) return json({ error: 'Sem foto.' }, 404);

  try {
    const bytes = await ler(user.avatar_url);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/*',
        /* Privado: não pode ficar em cache compartilhado. */
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('avatar falhou:', err.message);
    return json({ error: 'Não foi possível carregar a foto.' }, 404);
  }
}
