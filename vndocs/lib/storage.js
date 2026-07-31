/**
 * Armazenamento dos arquivos .docx e .xlsx.
 *
 * Em produção usa o Vercel Blob. Sem o token (testes, máquina local) grava
 * numa pasta e devolve o mesmo formato de resposta, para o resto do código
 * não precisar saber onde está rodando.
 */
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const LOCAL_DIR = process.env.LOCAL_BLOB_DIR || '.local-blob';

/**
 * Token de leitura e escrita, quando existe.
 *
 * Projetos conectados a uma loja de Blob pelo painel da Vercel usam OIDC e
 * NÃO recebem token nenhum — só BLOB_STORE_ID. O token continua existindo
 * para uso fora da Vercel, e aí pode vir com prefixo (NDOC_BLOB_...), por
 * isso a busca pelo sufixo.
 */
function tokenDoBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const chave = Object.keys(process.env).find((k) => k.endsWith('_READ_WRITE_TOKEN'));
  return chave ? process.env[chave] : null;
}

/**
 * Há Blob disponível se tivermos token OU se a loja estiver conectada por
 * OIDC (o que a plataforma sinaliza com BLOB_STORE_ID). Exigir token era o
 * erro: com OIDC ele nunca aparece, e o código caía para o disco local.
 */
function usandoBlob() {
  return Boolean(tokenDoBlob() || process.env.BLOB_STORE_ID);
}

/** Só passa o token adiante quando ele existe; com OIDC o SDK se vira. */
function opcoesDeAuth() {
  const token = tokenDoBlob();
  return token ? { token } : {};
}

/** Rodando na Vercel? Lá o disco é somente leitura, fora de /tmp. */
function naVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Sem o Blob em produção não há onde guardar arquivo. Falhar aqui, com
 * mensagem clara, é melhor do que estourar um erro de disco somente leitura
 * lá na frente — que foi o que aconteceu e deixou três telas quebradas sem
 * explicação.
 */
function exigirArmazenamento() {
  if (!usandoBlob() && naVercel()) {
    throw new Error(
      'Armazenamento de arquivos não configurado: não encontrei BLOB_STORE_ID ' +
      'nem um token do Blob. Conecte uma loja de Blob ao projeto em Storage ' +
      'e publique de novo.',
    );
  }
}

/** Nome de arquivo seguro, com prefixo aleatório para não colidir. */
function caminhoPara(tipo, filename) {
  const limpo = String(filename)
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(-120);
  return `${tipo}/${randomUUID()}-${limpo}`;
}

/**
 * Grava um arquivo e devolve onde ele foi parar.
 * @returns {Promise<{ url: string, pathname: string, size: number }>}
 */
export async function guardar(tipo, filename, buffer, contentType) {
  exigirArmazenamento();
  const pathname = caminhoPara(tipo, filename);

  if (usandoBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      ...opcoesDeAuth(),
    });
    return { url: blob.url, pathname: blob.pathname, size: buffer.length };
  }

  const destino = join(LOCAL_DIR, pathname);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, buffer);
  return { url: `local://${pathname}`, pathname, size: buffer.length };
}

/** Lê de volta um arquivo guardado, pelo pathname. */
export async function ler(pathname) {
  exigirArmazenamento();
  if (usandoBlob()) {
    const { head } = await import('@vercel/blob');
    const info = await head(pathname, opcoesDeAuth());
    const res = await fetch(info.url);
    if (!res.ok) throw new Error(`Não foi possível baixar ${pathname}.`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(LOCAL_DIR, pathname));
}

/** Apaga um arquivo. Falha silenciosa: se já não existe, o objetivo foi atingido. */
export async function apagar(pathname) {
  try {
    if (usandoBlob()) {
      const { del } = await import('@vercel/blob');
      await del(pathname, opcoesDeAuth());
      return true;
    }
    await unlink(join(LOCAL_DIR, pathname));
    return true;
  } catch {
    return false;
  }
}

export const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
