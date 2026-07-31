import { useState, useEffect, useMemo } from 'react';
import { Search, Download, RefreshCw, FileText, AlertTriangle } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/ui/Spinner';
import { TabelaEsqueleto } from '../components/ui/Esqueleto';
import { useToast } from '../contexts/ToastContext';

const FILTERS = [
  { key: 'todos',      label: 'Todos'      },
  { key: 'concluidos', label: 'Concluídos' },
  { key: 'erros',      label: 'Erros'      },
];

export default function History() {
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  /* Dados reais, de GET /api/generations. O banco usa
     completed / processing / failed como status. */
  const { data: lotes, loading, error: erroCarga, recarregar } = useApi('/api/generations', []);
  const { toast } = useToast();
  const [ocupado, setOcupado] = useState(null);   // id do lote em processamento

  /**
   * Regera um lote a partir do template e da planilha salvos e baixa o .zip.
   * O .zip original não fica guardado — cada geração é refeita a partir dos
   * arquivos, o que dá o mesmo resultado.
   */
  const regerar = async (h) => {
    if (!h.podeRegerar) {
      toast.warning('Os arquivos deste lote não foram guardados. Lotes gerados a partir de agora ficam disponíveis para baixar de novo.');
      return;
    }
    setOcupado(h.id);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId: h.templateId, sheetId: h.sheetId }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error || 'Não foi possível gerar.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documentos.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${res.headers.get('X-Doc-Count') || ''} documentos prontos.`.trim());
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };
  const historico = Array.isArray(lotes) ? lotes : [];

  // ── Derived stats (computed, not hardcoded) ────────────────
  const stats = useMemo(() => {
    const done   = historico.filter(h => h.status === 'completed');
    const errors = historico.length - done.length;
    const totalDocs = done.reduce((a, h) => a + h.docs, 0);
    /* Duração real do lote, vinda de elapsed_ms. Antes isto tentava ler
       "14:02" como número, o que dava 14 e não queria dizer nada. */
    const times = done
      .map(h => Number(h.seconds))
      .filter(n => Number.isFinite(n) && n > 0);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const success = historico.length ? Math.round((done.length / historico.length) * 100) : 0;
    const maxDocs = Math.max(1, ...historico.map(h => h.docs));
    // oldest → newest for the throughput chart
    const series = [...historico].reverse();
    return { totalDocs, errors, avg, success, maxDocs, series, runs: historico.length };
  }, [historico]);

  const counts = useMemo(() => ({
    todos:      historico.length,
    concluidos: historico.filter(h => h.status === 'completed').length,
    erros:      historico.filter(h => h.status === 'failed').length,
  }), [historico]);

  const filtered = historico.filter(h => {
    if (filter === 'concluidos' && h.status !== 'completed') return false;
    if (filter === 'erros' && h.status !== 'failed') return false;
    if (search &&
        !h.template.toLowerCase().includes(search.toLowerCase()) &&
        !h.dataFile.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <style>{styles}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar
          title="Histórico"
          subtitle="Todas as gerações realizadas"
          actions={
            <button className="h-ghost-btn" onClick={recarregar} disabled={loading}>
              <RefreshCw size={13} strokeWidth={1.9} className={loading ? 'anim-spin' : undefined} /> Atualizar
            </button>
          }
        />

        <div className="h-scroll stagger">

          {/* ── Summary band ─────────────────────────────── */}
          <section className="h-summary">
            <div className="h-hero">
              <span className="h-eyebrow">Documentos gerados</span>
              <span className="h-hero-num">{stats.totalDocs.toLocaleString('pt-BR')}</span>
              <span className="h-hero-sub">em {stats.runs} gerações este mês</span>
            </div>

            <div className="h-spark">
              <div className="h-spark-head">
                <span>Volume por geração</span>
                <span className="h-spark-cap">menos · mais</span>
              </div>
              <div className="h-spark-bars" role="img" aria-label="Volume de documentos por geração ao longo do mês">
                {stats.series.map((h, i) => {
                  const ratio = h.docs / stats.maxDocs;
                  const err = h.status === 'failed';
                  return (
                    <div className="h-spark-col" key={h.id} title={`${h.docs} docs · ${h.template}`}>
                      <div
                        className={`h-spark-bar h-anim ${err ? 'is-err' : ''}`}
                        style={{
                          height: mounted ? `${Math.max(ratio * 100, 6)}%` : '0%',
                          transitionDelay: `${i * 28}ms`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-metrics">
              <div className="h-metric">
                <span className="h-metric-num">{stats.success}%</span>
                <span className="h-metric-lbl">Taxa de sucesso</span>
              </div>
              <div className="h-metric">
                <span className="h-metric-num">{stats.avg.toFixed(1)}s</span>
                <span className="h-metric-lbl">Tempo médio</span>
              </div>
              <div className="h-metric">
                <span className="h-metric-num" style={{ color: stats.errors ? 'var(--red)' : 'var(--text-mute)' }}>
                  {stats.errors}
                </span>
                <span className="h-metric-lbl">{stats.errors === 1 ? 'Erro' : 'Erros'}</span>
              </div>
            </div>
          </section>

          {/* ── Controls ─────────────────────────────────── */}
          <div className="h-controls">
            <div className="h-searchbox">
              <Search size={14} style={{ color: 'var(--text-mute)', flexShrink: 0 }} />
              <input
                placeholder="Buscar por template ou planilha…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="h-segment">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`h-seg-btn ${filter === f.key ? 'is-active' : ''}`}
                >
                  {f.label}
                  <span className="h-seg-count">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Ledger ───────────────────────────────────── */}
          <div className="h-card h-table-wrap">
            <table className="h-ledger">
              <thead>
                <tr>
                  <th className="h-th-tick" />
                  <th>Data</th>
                  <th>Template e planilha</th>
                  <th className="h-num-col">Volume</th>
                  <th className="h-num-col">Tamanho</th>
                  <th className="h-num-col">Tempo</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <TabelaEsqueleto linhas={6} />
                    </td>
                  </tr>
                ) : erroCarga ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="h-empty">
                        <AlertTriangle size={22} strokeWidth={1.6} />
                        <p>Não foi possível carregar o histórico. {erroCarga}</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="h-empty">
                        <FileText size={22} strokeWidth={1.6} />
                        <p>{historico.length === 0
                          ? 'Nenhuma geração ainda. Gere seu primeiro lote na tela Gerar Documentos.'
                          : 'Nenhuma geração corresponde à sua busca.'}</p>
                        {historico.length > 0 && (
                          <button className="h-link-btn" onClick={() => { setSearch(''); setFilter('todos'); }}>
                            Limpar filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((h, i) => {
                  const err = h.status === 'failed';
                  const ratio = h.docs / stats.maxDocs;
                  return (
                    <tr key={h.id} className={err ? 'is-err-row' : ''}>
                      <td className="h-tick-cell">
                        <span className={`h-tick ${err ? 'is-err' : ''}`} />
                      </td>
                      <td className="h-date">{h.date}</td>
                      <td className="h-tpl-cell">
                        <span className="h-tpl">{h.template}</span>
                        <span className="h-src">{h.dataFile}</span>
                      </td>
                      <td className="h-num-col">
                        <div className="h-vol">
                          <span className="h-vol-num">{h.docs}</span>
                          <div className="h-vol-track">
                            <div
                              className={`h-vol-fill h-anim ${err ? 'is-err' : ''}`}
                              style={{
                                width: mounted ? `${Math.max(ratio * 100, 4)}%` : '0%',
                                transitionDelay: `${i * 22}ms`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="h-num-col h-meta">{h.size}</td>
                      <td className="h-num-col h-meta">{h.time}</td>
                      <td>
                        {err ? (
                          <span className="h-pill is-err"><AlertTriangle size={11} strokeWidth={2.2} />Erro</span>
                        ) : (
                          <span className="h-pill is-ok"><span className="h-dot" />Concluído</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {err ? (
                          <button className="h-act h-act-retry"
                            onClick={() => regerar(h)}
                            disabled={ocupado === h.id || !h.podeRegerar}
                            title={h.podeRegerar ? 'Gerar de novo a partir dos arquivos salvos' : 'Lote antigo: os arquivos não foram guardados'}>
                            <RefreshCw size={12} className={ocupado === h.id ? 'anim-spin' : undefined} />
                            {ocupado === h.id ? 'Gerando…' : 'Tentar de novo'}
                          </button>
                        ) : (
                          <button className="h-act h-act-dl"
                            onClick={() => regerar(h)}
                            disabled={ocupado === h.id || !h.podeRegerar}
                            title={h.podeRegerar ? 'Gerar de novo e baixar o .zip' : 'Lote antigo: os arquivos não foram guardados'}>
                            <Download size={12} />
                            {ocupado === h.id ? 'Gerando…' : 'Baixar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = `
.h-scroll { flex: 1; overflow-y: auto; padding: 24px 32px 40px; display: flex; flex-direction: column; gap: 22px; }

/* Topbar action */
.h-ghost-btn {
  height: 30px; padding: 0 12px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--line);
  color: var(--text-dim); font-size: 12.5px;
  display: flex; align-items: center; gap: 6px; transition: background .15s, border-color .15s;
}
.h-ghost-btn:hover { background: var(--surface-2); border-color: var(--line-strong); }

/* ── Summary band ── */
.h-summary {
  display: grid; grid-template-columns: minmax(160px, 0.9fr) 1.4fr auto;
  align-items: stretch; gap: 0;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius-lg); overflow: hidden;
}
.h-hero { padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; }
.h-eyebrow {
  font-size: 11px; color: var(--text-mute); text-transform: uppercase;
  letter-spacing: .08em; font-weight: 600;
}
.h-hero-num {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 52px; line-height: 1; letter-spacing: -0.04em; color: var(--text);
  margin: 8px 0 2px; font-variant-numeric: tabular-nums;
}
.h-hero-sub { font-size: 12.5px; color: var(--text-mute); }

.h-spark {
  padding: 18px 24px; display: flex; flex-direction: column;
  border-left: 1px solid var(--line); border-right: 1px solid var(--line);
}
.h-spark-head {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 11px; color: var(--text-mute); text-transform: uppercase;
  letter-spacing: .07em; font-weight: 600; margin-bottom: 12px;
}
.h-spark-cap { font-size: 9.5px; letter-spacing: .02em; opacity: .7; }
.h-spark-bars { flex: 1; display: flex; align-items: flex-end; gap: 5px; min-height: 56px; }
.h-spark-col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.h-spark-bar {
  width: 100%; border-radius: 3px 3px 1px 1px;
  background: linear-gradient(180deg, var(--orange-2), var(--orange));
  transition: height .5s cubic-bezier(.2,.7,.3,1);
}
.h-spark-bar.is-err { background: linear-gradient(180deg, #FCA5A5, var(--red)); }

.h-metrics { display: flex; flex-direction: column; padding: 6px 0; min-width: 150px; }
.h-metric {
  flex: 1; display: flex; align-items: baseline; gap: 9px;
  padding: 0 24px; border-bottom: 1px solid var(--line);
}
.h-metric:last-child { border-bottom: none; }
.h-metric-num {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 19px;
  letter-spacing: -0.02em; color: var(--text); min-width: 46px;
  font-variant-numeric: tabular-nums;
}
.h-metric-lbl { font-size: 12px; color: var(--text-dim); }

/* ── Controls ── */
.h-controls { display: flex; align-items: center; gap: 12px; }
.h-searchbox {
  display: flex; align-items: center; gap: 8px; flex: 1;
  height: 38px; padding: 0 13px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--line); transition: border-color .15s, box-shadow .15s;
}
.h-searchbox:focus-within { border-color: var(--orange); box-shadow: 0 0 0 3px var(--orange-dim); }
.h-searchbox input { flex: 1; font-size: 13px; color: var(--text); }
.h-searchbox input::placeholder { color: var(--text-mute); }

.h-segment {
  display: flex; gap: 2px; padding: 3px;
  background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px;
}
.h-seg-btn {
  height: 30px; padding: 0 12px; border-radius: 7px;
  font-size: 12.5px; font-weight: 500; color: var(--text-dim);
  display: flex; align-items: center; gap: 7px; transition: all .14s;
}
.h-seg-btn:hover { color: var(--text); }
.h-seg-btn.is-active {
  background: var(--surface); color: var(--orange);
  box-shadow: 0 1px 2px rgba(15,23,42,.07);
}
.h-seg-count {
  font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 600;
  padding: 1px 6px; border-radius: 999px;
  background: rgba(15,23,42,.06); color: var(--text-mute);
}
.h-seg-btn.is-active .h-seg-count { background: var(--orange-dim); color: var(--orange); }

/* ── Ledger ── */
.h-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; }
.h-ledger { width: 100%; border-collapse: collapse; }
@media (max-width: 860px) {
  .h-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .h-ledger { min-width: 680px; }
  .h-hero { flex-direction: column; }
}
.h-ledger th {
  font-size: 10.5px; color: var(--text-mute); font-weight: 600;
  text-transform: uppercase; letter-spacing: .07em; text-align: left;
  padding: 12px 16px; border-bottom: 1px solid var(--line); white-space: nowrap;
}
.h-ledger th.h-num-col { text-align: left; }
.h-th-tick { width: 4px; padding: 0 !important; }
.h-ledger td { padding: 13px 16px; border-bottom: 1px solid rgba(15,23,42,.05); vertical-align: middle; }
.h-ledger tbody tr:last-child td { border-bottom: none; }
.h-ledger tbody tr { transition: background .12s; }
.h-ledger tbody tr:hover td { background: rgba(37,99,235,.035); }

.h-tick-cell { width: 4px; padding: 0 !important; }
.h-tick { display: block; width: 3px; height: 30px; border-radius: 0 3px 3px 0; background: var(--green); opacity: .85; }
.h-tick.is-err { background: var(--red); }

.h-date {
  font-family: 'Geist Mono', monospace; font-size: 12px;
  color: var(--text-mute); white-space: nowrap;
}
.h-tpl-cell { min-width: 220px; }
.h-tpl {
  display: block; font-size: 13.5px; font-weight: 500; color: var(--text);
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.h-src { display: block; font-size: 11.5px; color: var(--text-mute); margin-top: 2px; }
.h-meta { font-family: 'Geist Mono', monospace; font-size: 12px; color: var(--text-mute); white-space: nowrap; }

.h-vol { display: flex; flex-direction: column; gap: 5px; min-width: 84px; }
.h-vol-num {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px;
  color: var(--text); letter-spacing: -.01em; font-variant-numeric: tabular-nums;
}
.h-vol-track { width: 76px; height: 4px; border-radius: 999px; background: rgba(15,23,42,.07); overflow: hidden; }
.h-vol-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--orange-3), var(--orange));
  transition: width .55s cubic-bezier(.2,.7,.3,1);
}
.h-vol-fill.is-err { background: rgba(15,23,42,.15); }

.h-pill {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 999px; padding: 2px 10px; font-size: 11.5px; font-weight: 500; white-space: nowrap;
}
.h-pill.is-ok  { background: rgba(22,163,74,.10); color: #15803D; }
.h-pill.is-err { background: rgba(220,38,38,.10); color: #DC2626; }
.h-dot { width: 6px; height: 6px; border-radius: 50%; background: #16A34A; }

.h-act {
  height: 28px; padding: 0 11px; border-radius: 999px; font-size: 12px;
  display: inline-flex; align-items: center; gap: 6px; transition: all .14s; white-space: nowrap;
}
.h-act-dl { background: var(--surface); border: 1px solid var(--line); color: var(--text-dim); }
.h-act-dl:hover { border-color: var(--orange); color: var(--orange); background: var(--orange-dim); }
.h-act-retry { background: var(--orange); border: 1px solid var(--orange); color: #fff; }
.h-act-retry:hover { filter: brightness(1.07); }

.h-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 16px; color: var(--text-mute); }
.h-empty p { font-size: 13px; }
.h-link-btn { font-size: 12.5px; color: var(--orange); font-weight: 500; }
.h-link-btn:hover { text-decoration: underline; }

/* ── Responsive ── */
@media (max-width: 880px) {
  .h-summary { grid-template-columns: 1fr; }
  .h-spark { border-left: none; border-right: none; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .h-metrics { flex-direction: row; }
  .h-metric { flex-direction: column; align-items: flex-start; gap: 2px; justify-content: center; border-bottom: none; border-right: 1px solid var(--line); padding: 12px 18px; }
  .h-metric:last-child { border-right: none; }
  .h-card { overflow-x: auto; }
}

@media (prefers-reduced-motion: reduce) {
  .h-anim { transition: none !important; }
  .anim-fade-up { animation: none !important; }
}
`;
