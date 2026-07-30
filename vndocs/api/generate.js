import { generateBatch } from '../lib/generate.js';
import { readUpload, json } from './_lib.js';

/**
 * POST /api/generate
 *
 * Aceita duas formas de entrada:
 *   a) multipart com os arquivos: template (.docx) e data (.xlsx)
 *   b) JSON com { templateId, sheetId } apontando para arquivos já salvos
 *
 * Nos dois casos aceita mapping (JSON) e pattern.
 * Devolve o .zip no corpo + headers X-Doc-Count e X-Elapsed-Ms.
 *
 * A gravação no banco é deliberadamente tolerante a falha: se o banco cair,
 * o usuário ainda recebe os documentos. Perder o histórico é ruim; perder o
 * lote que a pessoa acabou de gerar é pior.
 */
export async function POST(request) {
  const tipo = request.headers.get('content-type') || '';
  const porId = tipo.includes('application/json');

  let templateBuffer, xlsxBuffer, mappingBruto, pattern;
  let templateId = null, sheetId = null;
  let templateName = '', sheetName = '';

  /* ── Sessão obrigatória ─────────────────────────────────────────────── */
  let user = null;
  let repo = null;
  try {
    const [auth, repoMod] = await Promise.all([
      import('../lib/auth.js'), import('../lib/repo.js'),
    ]);
    user = await auth.usuarioDaSessao(auth.lerCookie(request));
    repo = repoMod;
  } catch (err) {
    console.error('nao foi possivel verificar a sessao:', err.message);
    return json({ error: 'Serviço indisponível no momento.' }, 503);
  }

  if (!user) return json({ error: 'Não autenticado.' }, 401);

  /* ── Cota ───────────────────────────────────────────────────────────── */
  {
    try {
      const consumo = await repo.consumoAtual(user);
      if (consumo.excedeu) {
        return json({
          error: `Você já usou as ${consumo.generationsLimit} gerações do plano ${consumo.planoNome} neste ciclo.`,
          consumo,
        }, 429);
      }
    } catch (err) {
      console.warn('nao foi possivel checar a cota:', err.message);
    }
  }

  /* ── Entrada ────────────────────────────────────────────────────────── */
  if (porId) {
    const corpo = await request.json().catch(() => ({}));
    templateId = corpo.templateId || null;
    sheetId = corpo.sheetId || null;
    mappingBruto = corpo.mapping ? JSON.stringify(corpo.mapping) : null;
    pattern = corpo.pattern;

    if (!templateId || !sheetId) {
      return json({ error: 'Informe templateId e sheetId.' }, 400);
    }

    const { one } = await import('../lib/db.js');
    const { ler } = await import('../lib/storage.js');
    const tpl = await one(
      'SELECT filename, blob_pathname FROM templates WHERE user_id = $1 AND id = $2',
      [user.id, templateId],
    );
    const sh = await one(
      'SELECT filename, blob_pathname FROM sheets WHERE user_id = $1 AND id = $2',
      [user.id, sheetId],
    );
    if (!tpl || !sh) return json({ error: 'Template ou planilha não encontrados.' }, 404);

    templateName = tpl.filename;
    sheetName = sh.filename;
    [templateBuffer, xlsxBuffer] = await Promise.all([
      ler(tpl.blob_pathname), ler(sh.blob_pathname),
    ]);
  } else {
    let upload;
    try {
      upload = await readUpload(request);
    } catch (err) {
      return json({ error: err.message }, 400);
    }
    templateBuffer = upload.templateBuffer;
    xlsxBuffer = upload.xlsxBuffer;
    mappingBruto = upload.fields.mapping;
    pattern = upload.fields.pattern;
    templateName = upload.fields.templateName || 'template.docx';
    sheetName = upload.fields.sheetName || 'planilha.xlsx';
  }

  let mapping = {};
  if (mappingBruto) {
    try {
      mapping = JSON.parse(mappingBruto);
    } catch {
      return json({ error: 'O campo "mapping" não é um JSON válido.' }, 400);
    }
  }

  /* ── Geração ────────────────────────────────────────────────────────── */
  const filenamePattern = pattern || 'documento_{{_index}}.docx';
  try {
    const result = await generateBatch({
      templateBuffer, xlsxBuffer, mapping, filenamePattern,
    });

    {
      try {
        await repo.registrarGeracao(user.id, {
          templateId, sheetId, templateName, sheetName,
          docCount: result.count,
          zipSize: result.zipBuffer.length,
          elapsedMs: result.ms,
          pattern: filenamePattern,
          status: 'completed',
        });
      } catch (err) {
        console.error('lote gerado mas nao registrado:', err.message);
      }
    }

    return new Response(result.zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="documentos.zip"',
        'X-Doc-Count': String(result.count),
        'X-Elapsed-Ms': String(result.ms),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('generate falhou:', err);
    {
      try {
        await repo.registrarGeracao(user.id, {
          templateId, sheetId, templateName, sheetName,
          status: 'failed',
          errorMessage: String(err.message).slice(0, 500),
          pattern: filenamePattern,
        });
      } catch { /* nada a fazer */ }
    }
    return json({ error: err.message || 'A geração falhou.' }, 422);
  }
}
