import { json } from './_lib.js';
import { one, query } from '../db.js';
import {
  conferirSenha, criarSessao, cookieDeSessao, contaPublica, limparSessoesVencidas,
} from '../auth.js';

/** POST /api/auth/login — { email, senha } */
export async function POST(request) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const email = String(corpo.email ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');
  if (!email || !senha) return json({ error: 'Informe e-mail e senha.' }, 400);

  try {
    const user = await one('SELECT * FROM users WHERE lower(email) = $1', [email]);

    /* Mesma mensagem para e-mail inexistente e senha errada: dizer qual dos
       dois falhou entrega a quem tenta adivinhar quais e-mails existem. */
    const generico = { error: 'E-mail ou senha incorretos.' };

    if (!user || !user.password_hash) {
      /* Gasta tempo parecido mesmo sem usuário, para o tempo de resposta não
         revelar se a conta existe. */
      await conferirSenha(senha, 'scrypt$16384$8$1$00$00');
      return json(generico, 401);
    }

    if (!(await conferirSenha(senha, user.password_hash))) {
      return json(generico, 401);
    }

    limparSessoesVencidas();
    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    const { token, expira } = await criarSessao(
      user.id, request.headers.get('user-agent') || '',
    );

    return new Response(JSON.stringify({ conta: contaPublica(user) }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': cookieDeSessao(token, expira),
      },
    });
  } catch (err) {
    console.error('login falhou:', err);
    return json({ error: 'Não foi possível entrar agora.' }, 500);
  }
}
