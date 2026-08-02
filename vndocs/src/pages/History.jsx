import { useState, useMemo } from 'react';
import {
  Search, RefreshCw, Download, FileText, Table2, AlertTriangle, Check, Clock,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useLayout } from '../contexts/LayoutContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import { Rotulo, Cartao, Acao } from '../components/ui/Primitivas';
import { Linha } from '../components/ui/Esqueleto';

const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'concluidos', rotulo: 'Concluídos' },
  { chave: 'erros', rotulo: 'Com erro' },
];

/* ── Peças ────────────────────────────────────────────────────────────── */

/** Selo de estado. Cor dessaturada: informa sem gritar. */
function Selo({ status }) {
  const mapa = {
    completed: { texto: 'Concluído', cor: 'var(--verde)', fundo: 'rgba(18,128,92,.10)', Icone: Check },
    processing: { texto: 'Em andamento', cor: 'var(--ambar)', fundo: 'rgba(161,102,10,.10)', Icone: Clock },
    failed: { texto: 'Falhou', cor: 'var(--rubro)', fundo: 'rgba(192,50,43,.10)', Icone: AlertTriangle },
  };
  const { texto, cor, fundo, Icone } = mapa[status] ?? mapa.completed;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 22, padding: '0 9px', borderRadius: 'var(--r-total)',
      background: fundo, color: cor,
      fontSize: 'var(--t-micro)', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Icone size={11} strokeWidth={2.4} /> {texto}
    </span>
  );
}

/** Par de arquivos: modelo em cima, dados embaixo. */
function Par({ template, planilha, compacto }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 'var(--t-base)', fontWeight: 550, color: 'var(--n9)',
        minWidth: 0,
      }}>
        <FileText size={14} strokeWidth={1.9} style={{ color: 'var(--azul)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {template}
        </span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 'var(--t-mini)', color: 'var(--n6)',
        marginTop: compacto ? 2 : 3, minWidth: 0,
      }}>
        <Table2 size={13} strokeWidth={1.9} style={{ color: 'var(--verde)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {planilha}
        </span>
      </div>
    </div>
  );
}

/** Métrica do resumo. Número grande, rótulo pequeno. */
function Metrica({ valor, rotulo, tom }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
        fontSize: 'var(--t-h2)', letterSpacing: '-0.03em',
        color: tom ?? 'var(--n9)', fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.05,
      }}>
        {valor}
      </div>
      <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 5 }}>
        {rotulo}
      </div>
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

export default function History() {
  const { isMobile } = useLayout();
  const { toast } = useToast();
  const { data: lotes, loading, error, recarregar } = useApi('/api/generations', []);
  const historico = Array.isArray(lotes) ? lotes : [];

  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ocupado, setOcupado] = useState(null);

  const contas = useMemo(() => ({
    todos: historico.length,
    concluidos: historico.filter((h) => h.status === 'completed').length,
    erros: historico.filter((h) => h.status === 'failed').length,
  }), [historico]);

  const resumo = useMemo(() => {
    const ok = historico.filter((h) => h.status === 'completed');
    const docs = ok.reduce((a, h) => a + h.docs, 0);
    const tempos = ok.map((h) => Number(h.seconds)).filter((n) => Number.isFinite(n) && n > 0);
    return {
      docs,
      lotes: historico.length,
      media: tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0,
      sucesso: historico.length ? Math.round((ok.length / historico.length) * 100) : 0,
    };
  }, [historico]);

  const filtrados = historico.filter((h) => {
    if (filtro === 'concluidos' && h.status !== 'completed') return false;
    if (filtro === 'erros' && h.status !== 'failed') return false;
    if (busca) {
      const alvo = `${h.template} ${h.dataFile}`.toLowerCase();
      if (!alvo.includes(busca.toLowerCase())) return false;
    }
    return true;
  });

  /** Refaz o lote a partir dos arquivos guardados e baixa o .zip. */
  const baixar = async (h) => {
    if (!h.podeRegerar) {
      toast.warning('Os arquivos deste lote não foram guardados. Lotes novos ficam disponíveis para baixar.');
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
      a.href = url; a.download = 'documentos.zip';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Documentos prontos.');
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };

  const vazio = !loading && !error && filtrados.length === 0;

  return (
    <AppLayout>
      <Topbar title="Histórico" subtitle="Tudo o que você já gerou" crumbLabel="Arquivos" />

      <div className="rolagem-fina" style={{
        flex: 1, overflowY: 'auto', background: 'var(--n1)',
        padding: isMobile ? '16px 14px 40px' : '28px 34px 56px',
      }}>
        <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 26 }}>

          {/* Resumo */}
          <Cartao style={{ padding: isMobile ? '18px 18px' : '22px 26px' }}>
            <Rotulo style={{ marginBottom: 16 }}>Resumo</Rotulo>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: isMobile ? 20 : 28,
            }}>
              <Metrica valor={resumo.docs.toLocaleString('pt-BR')} rotulo="Documentos gerados" />
              <Metrica valor={resumo.lotes} rotulo="Lotes" />
              <Metrica valor={`${resumo.media.toFixed(1)}s`} rotulo="Tempo médio por lote" />
              <Metrica
                valor={`${resumo.sucesso}%`}
                rotulo="Sem erro"
                tom={resumo.sucesso === 100 ? 'var(--verde)' : undefined}
              />
            </div>
          </Cartao>

          {/* Controles */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              height: 42, padding: '0 14px', flex: isMobile ? 'none' : 1, maxWidth: isMobile ? 'none' : 340,
              background: 'var(--n0)', border: 'var(--fio)', borderRadius: 'var(--r-p)',
            }}>
              <Search size={15} style={{ color: 'var(--n5)', flexShrink: 0 }} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por arquivo"
                style={{
                  flex: 1, minWidth: 0, border: 'none', outline: 'none',
                  background: 'transparent', fontFamily: 'inherit',
                  fontSize: 'var(--t-base)', color: 'var(--n9)',
                }}
              />
            </div>

            <div style={{
              display: 'flex', gap: 3, padding: 3,
              background: 'var(--n2)', borderRadius: 'var(--r-p)',
              overflowX: 'auto',
            }}>
              {FILTROS.map(({ chave, rotulo }) => {
                const ativo = filtro === chave;
                return (
                  <button
                    key={chave}
                    onClick={() => setFiltro(chave)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      height: 34, padding: '0 13px', flexShrink: 0,
                      borderRadius: 8, border: 'none',
                      background: ativo ? 'var(--n0)' : 'transparent',
                      boxShadow: ativo ? 'var(--alt-1)' : 'none',
                      color: ativo ? 'var(--n9)' : 'var(--n7)',
                      fontFamily: 'inherit', fontSize: 'var(--t-mini)',
                      fontWeight: ativo ? 600 : 500, cursor: 'pointer',
                      transition: 'background .15s var(--curva)',
                    }}
                  >
                    {rotulo}
                    <span style={{
                      fontFamily: 'var(--fonte-dado)', fontSize: 10,
                      color: ativo ? 'var(--azul)' : 'var(--n5)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {contas[chave]}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={recarregar}
              disabled={loading}
              title="Atualizar a lista"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                height: 42, padding: '0 14px', flexShrink: 0,
                background: 'var(--n0)', border: 'var(--fio)', borderRadius: 'var(--r-p)',
                color: 'var(--n7)', fontFamily: 'inherit', fontSize: 'var(--t-mini)',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'anim-spin' : undefined} />
              {isMobile ? 'Atualizar' : ''}
            </button>
          </div>

          {/* Lista */}
          {loading ? (
            <Cartao style={{ padding: 0, overflow: 'hidden' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 20px', borderTop: i ? 'var(--fio)' : 'none',
                  opacity: 1 - i * 0.14,
                }}>
                  <Linha largura="34%" altura={12} />
                  <Linha largura="12%" altura={12} />
                  <Linha largura="18%" altura={12} />
                  <Linha largura="14%" altura={12} />
                </div>
              ))}
            </Cartao>
          ) : error ? (
            <Cartao style={{ padding: 40, textAlign: 'center' }}>
              <AlertTriangle size={22} style={{ color: 'var(--ambar)' }} />
              <div style={{ fontSize: 'var(--t-corpo)', color: 'var(--n8)', marginTop: 12, fontWeight: 550 }}>
                Não foi possível carregar o histórico
              </div>
              <div style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', marginTop: 6 }}>{error}</div>
              <div style={{ marginTop: 18 }}>
                <Acao tipo="quieta" aoClicar={recarregar}>Tentar de novo</Acao>
              </div>
            </Cartao>
          ) : vazio ? (
            <Cartao style={{ padding: isMobile ? '44px 22px' : '64px 40px', textAlign: 'center' }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, margin: '0 auto 18px',
                background: 'var(--n2)', color: 'var(--n5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={20} strokeWidth={1.7} />
              </div>
              <div style={{
                fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
                fontSize: 'var(--t-sub)', letterSpacing: '-0.02em', color: 'var(--n9)',
              }}>
                {historico.length === 0 ? 'Nada gerado ainda' : 'Nenhum lote encontrado'}
              </div>
              <p style={{
                fontSize: 'var(--t-base)', color: 'var(--n6)',
                margin: '8px auto 0', maxWidth: '42ch', lineHeight: 1.55,
              }}>
                {historico.length === 0
                  ? 'Assim que você gerar seu primeiro lote, ele aparece aqui com o número de documentos e o tempo que levou.'
                  : 'Nenhum lote corresponde à busca ou ao filtro escolhido.'}
              </p>
              {historico.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <Acao tipo="quieta" aoClicar={() => { setBusca(''); setFiltro('todos'); }}>
                    Limpar filtros
                  </Acao>
                </div>
              )}
            </Cartao>

          ) : isMobile ? (
            /* Celular: cada lote é um cartão. Tabela em 390px não cabe —
               espremer colunas foi o que quebrou a tela antes. */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtrados.map((h) => (
                <Cartao key={h.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <Par template={h.template} planilha={h.dataFile} compacto />
                    <Selo status={h.status} />
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    marginTop: 14, paddingTop: 13, borderTop: 'var(--fio)',
                    fontSize: 'var(--t-micro)', color: 'var(--n6)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    <span><strong style={{ color: 'var(--n9)', fontSize: 'var(--t-base)', fontWeight: 600 }}>{h.docs}</strong> {h.docs === 1 ? 'arquivo' : 'arquivos'}</span>
                    <span>{h.size}</span>
                    <span style={{ marginLeft: 'auto' }}>{h.date} · {h.time}</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Acao
                      tipo="quieta" largura="100%"
                      aoClicar={() => baixar(h)}
                      desabilitado={!h.podeRegerar}
                      carregando={ocupado === h.id}
                    >
                      <Download size={14} />
                      {ocupado === h.id ? 'Gerando…' : h.podeRegerar ? 'Baixar de novo' : 'Arquivos não guardados'}
                    </Acao>
                  </div>
                </Cartao>
              ))}
            </div>

          ) : (
            /* Desktop: tabela, com a coluna de arquivos ganhando o espaço. */
            <Cartao style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 96px 96px 150px 150px',
                gap: 16, padding: '13px 22px',
                borderBottom: 'var(--fio)', background: 'var(--n1)',
              }}>
                {['Modelo e dados', 'Arquivos', 'Tamanho', 'Quando', 'Estado'].map((c, i) => (
                  <Rotulo key={c} style={{ textAlign: i === 0 ? 'left' : i > 2 ? 'left' : 'right' }}>{c}</Rotulo>
                ))}
              </div>

              {filtrados.map((h, i) => (
                <div
                  key={h.id}
                  className="linha-lote"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) 96px 96px 150px 150px',
                    gap: 16, padding: '15px 22px', alignItems: 'center',
                    borderTop: i ? 'var(--fio)' : 'none',
                    transition: 'background .14s var(--curva)',
                  }}
                >
                  <Par template={h.template} planilha={h.dataFile} />

                  <div style={{
                    textAlign: 'right', fontFamily: 'var(--fonte-dado)',
                    fontSize: 'var(--t-corpo)', color: 'var(--n9)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {h.docs}
                  </div>

                  <div style={{
                    textAlign: 'right', fontSize: 'var(--t-mini)', color: 'var(--n6)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {h.size}
                  </div>

                  <div style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', fontVariantNumeric: 'tabular-nums' }}>
                    {h.date}
                    <span style={{ color: 'var(--n5)' }}> · {h.time}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Selo status={h.status} />
                    <button
                      onClick={() => baixar(h)}
                      disabled={!h.podeRegerar || ocupado === h.id}
                      title={h.podeRegerar ? 'Gerar de novo e baixar' : 'Lote antigo: os arquivos não foram guardados'}
                      className="icone acao-lote"
                      style={{
                        width: 32, height: 32, borderRadius: 'var(--r-p)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'var(--fio)',
                        color: h.podeRegerar ? 'var(--n7)' : 'var(--n5)',
                        cursor: h.podeRegerar ? 'pointer' : 'not-allowed',
                        opacity: h.podeRegerar ? 1 : .45,
                      }}
                    >
                      <Download size={14} className={ocupado === h.id ? 'anim-spin' : undefined} />
                    </button>
                  </div>
                </div>
              ))}
            </Cartao>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
