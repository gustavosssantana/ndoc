import { json } from './_lib.js';
import { one } from '../db.js';
import {
  gerarHash, criticarSenha, criarSessao, cookieDeSessao, contaPublica,
} from '../auth.js';

/** POST /api/auth/register — { email, senha, nome?, empresa? } */
export async function POST(request) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const email = String(corpo.email ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');
  const nome = String(corpo.nome ?? '').trim();
  const empresa = String(corpo.empresa ?? '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Informe um e-mail válido.' }, 400);
  }
  const queixa = criticarSenha(senha);
  if (queixa) return json({ error: queixa }, 400);

  /* Trava opcional de cadastro. Definindo SIGNUP_CODE nas variáveis de
     ambiente, só quem souber o código abre conta — evita que o cadastro
     fique aberto ao mundo quando a proteção de deployment sair. */
  const exigido = process.env.SIGNUP_CODE;
  if (exigido && String(corpo.codigo ?? '') !== exigido) {
    return json({ error: 'Código de convite inválido.' }, 403);
  }

  try {
    const existe = await one('SELECT id FROM users WHERE lower(email) = $1', [email]);
    if (existe) {
      return json({ error: 'Já existe uma conta com esse e-mail.' }, 409);
    }

    /* Quem entra com código de convite cai na organização de quem convidou.
       Sem código, nasce uma organização nova e a pessoa é a dona dela. */
    const convite = String(corpo.convite ?? '').trim();
    let orgId = null;
    let papel = 'owner';

    if (convite) {
      const linha = await one(
        `SELECT org_id FROM org_invites
          WHERE code = $1 AND used_by IS NULL AND expires_at > now()`,
        [convite],
      );
      if (!linha) {
        return json({ error: 'Convite inválido ou já usado.' }, 400);
      }
      orgId = linha.org_id;
      papel = 'member';
    } else {
      const org = await one(
        `INSERT INTO orgs (name, plan) VALUES ($1, 'starter') RETURNING id`,
        [empresa || nome || email],
      );
      orgId = org.id;
    }

    const user = await one(
      `INSERT INTO users (email, name, company, plan, password_hash, org_id, org_role)
       VALUES ($1, $2, $3, 'starter', $4, $5, $6) RETURNING *`,
      [email, nome, empresa, await gerarHash(senha), orgId, papel],
    );

    if (convite) {
      await one(
        'UPDATE org_invites SET used_by = $2, used_at = now() WHERE code = $1 RETURNING code',
        [convite, user.id],
      );
    }

    const { token, expira } = await criarSessao(
      user.id, request.headers.get('user-agent') || '',
    );

    return new Response(JSON.stringify({ conta: contaPublica(user) }), {
      status: 201,
      headers: {
        'content-type': 'application/json',
        'set-cookie': cookieDeSessao(token, expira),
      },
    });
  } catch (err) {
    console.error('register falhou:', err);
    return json({ error: 'Não foi possível criar a conta.' }, 500);
  }
}
