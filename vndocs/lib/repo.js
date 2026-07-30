/**
 * Consultas do ndocs. Devolvem os dados já no formato que as telas consomem,
 * para o front não precisar remodelar nada — era exatamente esse formato que
 * o antigo src/services/mockData.js fingia.
 */
import { query, one, tx } from './db.js';
import { guardar, apagar, MIME } from './storage.js';
import { extractVariables } from './template.js';
import { parseSheet } from './xlsx.js';
import { limiteDo, periodoAtual } from './plans.js';

/* ── Formatação de datas ─────────────────────────────────────────────── */

/** "há 2 dias", "ontem", "agora" — como a Biblioteca mostra. */
export function relativo(data) {
  if (!data) return '—';
  const seg = Math.max(0, (Date.now() - new Date(data).getTime()) / 1000);
  if (seg < 90) return 'agora';
  const min = seg / 60;
  if (min < 60) return `há ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) return `há ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  const m = Math.round(d / 30);
  return m === 1 ? 'há 1 mês' : `há ${m} meses`;
}

function dataBR(data) {
  const d = new Date(data);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function horaBR(data) {
  const d = new Date(data);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function tamanhoLegivel(bytes) {
  const b = Number(bytes) || 0;
  if (b <= 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Pastas ──────────────────────────────────────────────────────────── */

/**
 * Pastas com o template mais recente e as planilhas de cada uma.
 * Formato exigido por src/pages/Biblioteca.jsx.
 */
export async function listarPastas(userId) {
  const pastas = await query(
    `SELECT id, name, description, pinned, updated_at
       FROM folders WHERE user_id = $1
      ORDER BY pinned DESC, name ASC`,
    [userId],
  );
  if (!pastas.length) return [];

  const ids = pastas.map((p) => p.id);

  const templates = await query(
    `SELECT DISTINCT ON (folder_id)
            folder_id, filename, variables, uses, updated_at
       FROM templates
      WHERE user_id = $1 AND folder_id = ANY($2::uuid[])
      ORDER BY folder_id, updated_at DESC`,
    [userId, ids],
  );

  const planilhas = await query(
    `SELECT folder_id, filename, row_count, updated_at
       FROM sheets
      WHERE user_id = $1 AND folder_id = ANY($2::uuid[])
      ORDER BY updated_at DESC`,
    [userId, ids],
  );

  const porPasta = new Map(templates.map((t) => [t.folder_id, t]));

  return pastas.map((p) => {
    const t = porPasta.get(p.id);
    const s = planilhas.filter((x) => x.folder_id === p.id);
    return {
      id: p.id,
      name: p.name,
      desc: p.description,
      pinned: p.pinned,
      uses: t?.uses ?? 0,
      template: {
        file: t?.filename ?? '— sem template —',
        vars: t?.variables?.length ?? 0,
        uses: t?.uses ?? 0,
        updated: relativo(t?.updated_at ?? p.updated_at),
      },
      sheets: s.map((x) => ({
        name: x.filename,
        rows: x.row_count,
        updated: relativo(x.updated_at),
      })),
    };
  });
}

export async function criarPasta(userId, { nome, descricao = '', pinned = false }) {
  if (!nome?.trim()) throw new Error('A pasta precisa de um nome.');
  return one(
    `INSERT INTO folders (user_id, name, description, pinned)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, name)
       DO UPDATE SET description = EXCLUDED.description,
                     pinned = EXCLUDED.pinned,
                     updated_at = now()
     RETURNING id, name, description, pinned`,
    [userId, nome.trim(), descricao, pinned],
  );
}

/* ── Templates e planilhas ───────────────────────────────────────────── */

/** Guarda o .docx, extrai as variáveis e registra. */
export async function salvarTemplate(userId, { filename, buffer, folderId = null }) {
  const variaveis = extractVariables(buffer);
  const arquivo = await guardar('templates', filename, buffer, MIME.docx);
  return one(
    `INSERT INTO templates
       (user_id, folder_id, filename, blob_url, blob_pathname, size_bytes, variables)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, filename, variables, size_bytes, created_at`,
    [userId, folderId, filename, arquivo.url, arquivo.pathname, arquivo.size, variaveis],
  );
}

/** Guarda o .xlsx, lê colunas e nº de linhas, e registra. */
export async function salvarPlanilha(userId, { filename, buffer, folderId = null }) {
  const { columns, rows } = parseSheet(buffer);
  const arquivo = await guardar('sheets', filename, buffer, MIME.xlsx);
  return one(
    `INSERT INTO sheets
       (user_id, folder_id, filename, blob_url, blob_pathname, size_bytes, column_names, row_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, filename, column_names, row_count, size_bytes, created_at`,
    [userId, folderId, filename, arquivo.url, arquivo.pathname, arquivo.size, columns, rows.length],
  );
}

export async function listarTemplates(userId) {
  const rows = await query(
    `SELECT id, folder_id, filename, variables, uses, size_bytes, blob_pathname, updated_at
       FROM templates WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map((t) => ({
    id: t.id,
    folderId: t.folder_id,
    file: t.filename,
    vars: t.variables.length,
    variables: t.variables,
    uses: t.uses,
    size: tamanhoLegivel(t.size_bytes),
    pathname: t.blob_pathname,
    updated: relativo(t.updated_at),
  }));
}

export async function listarPlanilhas(userId) {
  const rows = await query(
    `SELECT id, folder_id, filename, column_names, row_count, size_bytes, blob_pathname, updated_at
       FROM sheets WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map((s) => ({
    id: s.id,
    folderId: s.folder_id,
    name: s.filename,
    columns: s.column_names,
    rows: s.row_count,
    size: tamanhoLegivel(s.size_bytes),
    pathname: s.blob_pathname,
    updated: relativo(s.updated_at),
  }));
}

export async function apagarTemplate(userId, id) {
  const t = await one(
    'DELETE FROM templates WHERE user_id = $1 AND id = $2 RETURNING blob_pathname',
    [userId, id],
  );
  if (t?.blob_pathname) await apagar(t.blob_pathname);
  return Boolean(t);
}

export async function apagarPlanilha(userId, id) {
  const s = await one(
    'DELETE FROM sheets WHERE user_id = $1 AND id = $2 RETURNING blob_pathname',
    [userId, id],
  );
  if (s?.blob_pathname) await apagar(s.blob_pathname);
  return Boolean(s);
}

/* ── Histórico ───────────────────────────────────────────────────────── */

/** Formato exigido por src/pages/History.jsx. */
export async function listarGeracoes(userId, limite = 100) {
  const rows = await query(
    `SELECT id, template_name, sheet_name, doc_count, zip_size_bytes,
            elapsed_ms, status, created_at
       FROM generations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limite],
  );
  return rows.map((g) => ({
    id: g.id,
    template: g.template_name || '—',
    dataFile: g.sheet_name || '—',
    docs: g.doc_count,
    size: tamanhoLegivel(g.zip_size_bytes),
    status: g.status,
    date: dataBR(g.created_at),
    time: horaBR(g.created_at),
    seconds: Number((g.elapsed_ms / 1000).toFixed(2)),   // duração do lote
  }));
}

/**
 * Grava uma geração e incrementa o consumo do ciclo, numa transação:
 * histórico e contador nunca podem discordar.
 */
export async function registrarGeracao(userId, dados) {
  const {
    templateId = null, sheetId = null,
    templateName = '', sheetName = '',
    docCount = 0, zipSize = 0, elapsedMs = 0,
    pattern = '', status = 'completed', errorMessage = '',
  } = dados;

  return tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO generations
         (user_id, template_id, sheet_id, template_name, sheet_name,
          doc_count, zip_size_bytes, elapsed_ms, pattern, status, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, created_at`,
      [userId, templateId, sheetId, templateName, sheetName,
        docCount, zipSize, elapsedMs, pattern, status, errorMessage],
    );

    // Só conta consumo do que deu certo.
    if (status === 'completed') {
      await client.query(
        `INSERT INTO usage_counters (user_id, period, generations_used, documents_used)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (user_id, period) DO UPDATE
           SET generations_used = usage_counters.generations_used + 1,
               documents_used   = usage_counters.documents_used + $3,
               updated_at = now()`,
        [userId, periodoAtual(), docCount],
      );
      if (templateId) {
        await client.query(
          'UPDATE templates SET uses = uses + $1, updated_at = now() WHERE id = $2',
          [docCount, templateId],
        );
      }
    }

    return rows[0];
  });
}

/* ── Consumo e painel ────────────────────────────────────────────────── */

export async function consumoAtual(user) {
  const periodo = periodoAtual();
  const linha = await one(
    `SELECT generations_used, documents_used
       FROM usage_counters WHERE user_id = $1 AND period = $2`,
    [user.id, periodo],
  );
  const limite = limiteDo(user.plan);
  const usadas = linha?.generations_used ?? 0;
  const limiteNum = limite.geracoesPorMes;

  return {
    periodo,
    plano: user.plan,
    planoNome: limite.nome,
    generationsUsed: usadas,
    generationsLimit: limiteNum === Infinity ? null : limiteNum,
    documentsUsed: linha?.documents_used ?? 0,
    restantes: limiteNum === Infinity ? null : Math.max(0, limiteNum - usadas),
    excedeu: limiteNum !== Infinity && usadas >= limiteNum,
  };
}

/** Números do Dashboard. Todos vindos do banco. */
export async function painel(user) {
  const [totais, ativos, planilhas, consumo] = await Promise.all([
    one(`SELECT COALESCE(SUM(doc_count),0)::int AS docs,
                COUNT(*)::int AS lotes
           FROM generations WHERE user_id = $1 AND status = 'completed'`, [user.id]),
    one('SELECT COUNT(*)::int AS n FROM templates WHERE user_id = $1', [user.id]),
    one(`SELECT COUNT(*)::int AS n, COALESCE(SUM(row_count),0)::int AS linhas
           FROM sheets WHERE user_id = $1`, [user.id]),
    consumoAtual(user),
  ]);

  const mesPassado = await one(
    `SELECT COALESCE(SUM(doc_count),0)::int AS docs
       FROM generations
      WHERE user_id = $1 AND status = 'completed'
        AND created_at >= date_trunc('month', now()) - interval '1 month'
        AND created_at <  date_trunc('month', now())`,
    [user.id],
  );
  const esteMes = await one(
    `SELECT COALESCE(SUM(doc_count),0)::int AS docs
       FROM generations
      WHERE user_id = $1 AND status = 'completed'
        AND created_at >= date_trunc('month', now())`,
    [user.id],
  );

  let variacao = null;
  if (mesPassado.docs > 0) {
    variacao = Math.round(((esteMes.docs - mesPassado.docs) / mesPassado.docs) * 100);
  }

  return {
    documentosGerados: totais.docs,
    lotes: totais.lotes,
    templatesAtivos: ativos.n,
    planilhas: planilhas.n,
    linhasTotais: planilhas.linhas,
    documentosEsteMes: esteMes.docs,
    variacaoPercentual: variacao,
    consumo,
  };
}
