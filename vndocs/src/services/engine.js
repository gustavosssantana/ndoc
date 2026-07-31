/**
 * Cliente HTTP do motor de geração (server/).
 * Contrato definido em server/src/server.js:
 *   POST /inspect  -> { variables, columns, rowCount, rows, autoMapped, unmapped }
 *   POST /generate -> corpo .zip + headers X-Doc-Count e X-Elapsed-Ms
 */

const BASE = import.meta.env?.VITE_ENGINE_URL || '/api';

async function readError(res, fallback) {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
  } catch {
    /* resposta não era JSON */
  }
  return fallback;
}

/**
 * Lê template + planilha e devolve as variáveis do .docx e as colunas do .xlsx,
 * já com o mapeamento automático que o motor conseguiu inferir.
 */
export async function inspectFiles(templateFile, dataFile) {
  const form = new FormData();
  form.append('template', templateFile);
  form.append('data', dataFile);

  const res = await fetch(`${BASE}/inspect`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(await readError(res, 'Não foi possível ler os arquivos.'));
  }
  return res.json();
}

/**
 * Gera o lote e devolve o .zip como Blob.
 * @returns {Promise<{ blob: Blob, count: number, elapsedMs: number }>}
 */
export async function generateDocuments({ templateFile, dataFile, mapping, pattern }) {
  const form = new FormData();
  form.append('template', templateFile);
  form.append('data', dataFile);
  if (mapping) form.append('mapping', JSON.stringify(mapping));
  if (pattern) form.append('pattern', pattern);

  const res = await fetch(`${BASE}/generate`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(await readError(res, 'A geração falhou.'));
  }

  const blob = await res.blob();

  // O motor já expõe estes headers (exposedHeaders em server/src/server.js),
  // mas o fallback evita quebrar a UI se isso mudar.
  const count = Number(res.headers.get('X-Doc-Count')) || 0;
  const elapsedMs = Number(res.headers.get('X-Elapsed-Ms')) || 0;

  return { blob, count, elapsedMs };
}

/** Dispara o download de um Blob com o nome informado. */
export function downloadBlob(blob, filename = 'documentos.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Checagem rápida de que o motor está no ar. */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
