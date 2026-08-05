import { json } from './_lib.js';
import { one } from '../db.js';
import { lerCookie, usuarioDaSessao } from '../auth.js';
import { ler, MIME } from '../storage.js';

/**
 * GET /api/download?tipo=template|sheet&id=...
 *
 * Devolve o arquivo original guardado na Biblioteca.
 *
 * A loja de Blob é privada, então o navegador não alcança o arquivo pela
 * URL. Esta rota lê no servidor, já com a sessão conferida, e entrega os
 * bytes. O `WHERE user_id` é o que impede alguém de baixar arquivo de outra
 * conta trocando o id na barra de endereço.
 */
export async function GET(request) {
  const user = await usuarioDaSessao(lerCookie(request));
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  const params = new URL(request.url).searchParams;
  const tipo = params.get('tipo');
  const id = params.get('id');

  if (!id) return json({ error: 'Informe o id do arquivo.' }, 400);
  if (tipo !== 'template' && tipo !== 'sheet') {
    return json({ error: 'Tipo inválido. Use "template" ou "sheet".' }, 400);
  }

  const tabela = tipo === 'template' ? 'templates' : 'sheets';
  const registro = await one(
    `SELECT filename, blob_pathname FROM ${tabela} WHERE user_id = $1 AND id = $2`,
    [user.id, id],
  );
  if (!registro) return json({ error: 'Arquivo não encontrado.' }, 404);

  let bytes;
  try {
    bytes = await ler(registro.blob_pathname);
  } catch (err) {
    console.error('download falhou:', err.message);
    return json({
      error: `Não foi possível acessar o armazenamento: ${err.message}`,
    }, 502);
  }

  /* O nome vai entre aspas e sem quebra de linha: nome com espaço ou acento
     truncaria o cabeçalho e o navegador salvaria com nome errado. */
  const seguro = String(registro.filename).replace(/["\r\n]/g, '').trim() || 'arquivo';

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': tipo === 'template' ? MIME.docx : MIME.xlsx,
      'Content-Disposition': `attachment; filename="${seguro}"; filename*=UTF-8''${encodeURIComponent(seguro)}`,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
