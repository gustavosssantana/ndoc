/**
 * Utilidades compartilhadas pelas funções em api/.
 *
 * As funções da Vercel usam o handler web padrão, então o multipart chega
 * via request.formData() — sem @fastify/multipart, sem busboy.
 */

/** Teto por arquivo. Fica abaixo do limite de corpo da plataforma de propósito. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Nº máx. de linhas devolvidas ao front para preview. */
export const PREVIEW_CAP = 500;

export function json(body, status = 200) {
  return Response.json(body, { status });
}

/**
 * Extrai `template` e `data` do multipart e devolve como Buffer.
 * Lança Error com mensagem pronta para o usuário quando algo falta.
 */
export async function readUpload(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    throw new Error('Não foi possível ler o formulário. Envie como multipart/form-data.');
  }

  const template = form.get('template');
  const data = form.get('data');

  if (!template || typeof template === 'string' || !data || typeof data === 'string') {
    throw new Error('Envie os arquivos "template" (.docx) e "data" (.xlsx).');
  }

  for (const [label, file] of [['template', template], ['data', data]]) {
    if (file.size > MAX_FILE_BYTES) {
      const mb = (MAX_FILE_BYTES / 1024 / 1024).toFixed(0);
      throw new Error(`O arquivo "${label}" passa de ${mb} MB, que é o limite desta função.`);
    }
  }

  return {
    templateBuffer: Buffer.from(await template.arrayBuffer()),
    xlsxBuffer: Buffer.from(await data.arrayBuffer()),
    fields: {
      mapping: form.get('mapping'),
      pattern: form.get('pattern'),
    },
  };
}

/**
 * Envolve um handler exigindo sessão válida.
 *
 * Sem cookie de sessão, responde 401 e o handler nem roda — é isto que
 * fecha as rotas. Antes desta versão, toda requisição era atendida como se
 * fosse do dono do sistema.
 */
export function comConta(handler) {
  return async (request) => {
    let user;
    try {
      const { lerCookie, usuarioDaSessao } = await import('../auth.js');
      user = await usuarioDaSessao(lerCookie(request));
    } catch (err) {
      console.error('banco indisponivel:', err.message);
      return json({ error: 'Serviço indisponível no momento.' }, 503);
    }

    if (!user) return json({ error: 'Não autenticado.' }, 401);

    try {
      return await handler(request, user);
    } catch (err) {
      console.error('rota falhou:', err);
      return json({ error: err.message || 'Erro inesperado.' }, 500);
    }
  };
}

/** Le um unico arquivo do multipart, pelo nome do campo. */
export async function readSingleFile(request, campo) {
  const form = await request.formData();
  const file = form.get(campo);
  if (!file || typeof file === 'string') {
    throw new Error(`Envie o arquivo no campo "${campo}".`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`O arquivo passa de ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.`);
  }
  return {
    filename: file.name || campo,
    buffer: Buffer.from(await file.arrayBuffer()),
    folderId: form.get('folderId') || null,
  };
}
