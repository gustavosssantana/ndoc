import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Zap, Folder, FileText, Table2, Pencil, Trash2,
  ChevronLeft, ChevronRight, Upload,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useLayout } from '../contexts/LayoutContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';
import { Campo, Rotulo, Cartao, Acao } from '../components/ui/Primitivas';
import { CartaoEsqueleto } from '../components/ui/Esqueleto';

/* ── Peças ────────────────────────────────────────────────────────────── */

/** Cartão de pasta na grade. */
function CartaoPasta({ pasta, selecionada, aoAbrir }) {
  const [sobre, setSobre] = useState(false);
  const temModelo = Boolean(pasta.templateId);

  return (
    <Cartao
      aoClicar={() => aoAbrir(pasta.id)}
      destacado={selecionada}
      style={{
        padding: 16, minWidth: 0,
        transform: sobre && !selecionada ? 'translateY(-1px)' : 'none',
        boxShadow: selecionada ? undefined : sobre ? 'var(--alt-2)' : 'var(--alt-1)',
      }}
    >
      <div
        onMouseEnter={() => setSobre(true)}
        onMouseLeave={() => setSobre(false)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            background: temModelo ? 'var(--azul-veu)' : 'var(--n2)',
            color: temModelo ? 'var(--azul)' : 'var(--n5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Folder size={17} strokeWidth={1.9} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--t-base)', fontWeight: 600, color: 'var(--n9)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pasta.name}
            </div>
            <div style={{
              fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pasta.desc || 'Sem descrição'}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          marginTop: 14, paddingTop: 12, borderTop: 'var(--fio)',
          fontSize: 'var(--t-micro)', color: 'var(--n6)',
          fontVariantNumeric: 'tabular-nums', minWidth: 0,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <FileText size={12} style={{ color: temModelo ? 'var(--azul)' : 'var(--n4)', flexShrink: 0 }} />
            {temModelo ? `${pasta.template.vars} campos` : 'sem modelo'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Table2 size={12} style={{ color: pasta.sheets.length ? 'var(--verde)' : 'var(--n4)' }} />
            {pasta.sheets.length}
          </span>
          <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {pasta.uses} {pasta.uses === 1 ? 'uso' : 'usos'}
          </span>
        </div>
      </div>
    </Cartao>
  );
}

/** Uma linha de arquivo dentro do painel. */
function LinhaArquivo({ Icone, tom, titulo, apoio, acao }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '11px 12px', borderRadius: 'var(--r-p)',
      background: 'var(--n1)', minWidth: 0,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: 'var(--n0)', color: tom, border: 'var(--fio)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icone size={14} strokeWidth={1.9} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--n9)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {titulo}
        </div>
        <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 1 }}>
          {apoio}
        </div>
      </div>
      {acao}
    </div>
  );
}

/* ── Painel de detalhe ────────────────────────────────────────────────── */

function Painel({
  pasta, isMobile, ocupado, aoVoltar,
  aoRenomear, aoEnviarModelo, aoEnviarPlanilha, aoApagarPlanilha, aoGerar,
}) {
  const temModelo = Boolean(pasta.templateId);
  const podeGerar = temModelo && pasta.sheets.length > 0;

  const motivo = !temModelo
    ? 'Envie um modelo .docx para esta pasta'
    : 'Adicione uma planilha .xlsx para esta pasta';

  return (
    <div style={{
      width: isMobile ? '100%' : 372, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderLeft: isMobile ? 'none' : 'var(--fio)',
      background: 'var(--n0)', minWidth: 0,
      height: isMobile ? 'auto' : '100%',
    }}>
      <div className="rolagem-fina" style={{
        flex: 1, overflowY: 'auto',
        padding: isMobile ? '16px 14px' : '22px 22px 8px',
      }}>
        {isMobile && (
          <button
            onClick={aoVoltar}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
              fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--azul)',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} /> Todas as pastas
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Rotulo>Pasta</Rotulo>
            <h2 style={{
              fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
              fontSize: 'var(--t-h3)', letterSpacing: '-0.025em',
              color: 'var(--n9)', margin: '7px 0 0', wordBreak: 'break-word',
            }}>
              {pasta.name}
            </h2>
            <p style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', margin: '3px 0 0' }}>
              {pasta.desc || 'Sem descrição'}
            </p>
          </div>
          <button
            onClick={() => aoRenomear(pasta)}
            title="Renomear a pasta" className="icone"
            style={{
              width: 32, height: 32, borderRadius: 'var(--r-p)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--n0)', border: 'var(--fio)', color: 'var(--n6)', cursor: 'pointer',
            }}
          >
            <Pencil size={14} />
          </button>
        </div>

        {/* Modelo */}
        <div style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <Rotulo>Modelo</Rotulo>
            <button
              onClick={() => aoEnviarModelo(pasta)}
              disabled={ocupado === 'modelo'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 'var(--t-micro)', fontWeight: 600, color: 'var(--azul)',
                background: 'var(--azul-veu)', border: 'none',
                borderRadius: 'var(--r-total)', padding: '5px 11px', cursor: 'pointer',
              }}
            >
              <Upload size={12} />
              {ocupado === 'modelo' ? 'Enviando…' : temModelo ? 'Trocar' : 'Enviar'}
            </button>
          </div>

          {temModelo ? (
            <>
              <LinhaArquivo
                Icone={FileText} tom="var(--azul)"
                titulo={pasta.template.file}
                apoio={`${pasta.template.uses} ${pasta.template.uses === 1 ? 'uso' : 'usos'} · ${pasta.template.updated}`}
              />
              {pasta.template.vars > 0 && (
                <div style={{ marginTop: 10, fontSize: 'var(--t-micro)', color: 'var(--n6)' }}>
                  {pasta.template.vars} campos para preencher
                </div>
              )}
            </>
          ) : (
            <div style={{
              padding: '16px 14px', borderRadius: 'var(--r-p)',
              border: '1px dashed var(--n4)', background: 'var(--n1)',
              fontSize: 'var(--t-mini)', color: 'var(--n6)', lineHeight: 1.5,
            }}>
              Sem modelo. Envie o .docx com os campos entre chaves para poder
              gerar direto desta pasta.
            </div>
          )}
        </div>

        {/* Planilhas */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <Rotulo>Planilhas</Rotulo>
            <button
              onClick={() => aoEnviarPlanilha(pasta)}
              disabled={ocupado === 'planilha'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 'var(--t-micro)', fontWeight: 600, color: 'var(--verde)',
                background: 'rgba(18,128,92,.09)', border: 'none',
                borderRadius: 'var(--r-total)', padding: '5px 11px', cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              {ocupado === 'planilha' ? 'Enviando…' : 'Adicionar'}
            </button>
          </div>

          {pasta.sheets.length === 0 ? (
            <div style={{
              padding: '16px 14px', borderRadius: 'var(--r-p)',
              border: '1px dashed var(--n4)', background: 'var(--n1)',
              fontSize: 'var(--t-mini)', color: 'var(--n6)', lineHeight: 1.5,
            }}>
              Nenhuma planilha ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pasta.sheets.map((s) => (
                <LinhaArquivo
                  key={s.id ?? s.name}
                  Icone={Table2} tom="var(--verde)"
                  titulo={s.name}
                  apoio={`${s.rows} ${s.rows === 1 ? 'linha' : 'linhas'} · ${s.updated}`}
                  acao={
                    <button
                      onClick={() => aoApagarPlanilha(s)}
                      title={`Remover ${s.name}`} className="icone"
                      style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none', color: 'var(--n5)', cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rubro)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--n5)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ação da pasta */}
      <div className="borda-segura" style={{
        padding: isMobile ? '14px' : '16px 22px',
        borderTop: 'var(--fio)', background: 'var(--n0)',
      }}>
        <Acao
          largura="100%"
          aoClicar={() => aoGerar(pasta)}
          desabilitado={!podeGerar}
          carregando={ocupado === 'gerar'}
        >
          <Zap size={16} strokeWidth={2.3} />
          {ocupado === 'gerar' ? 'Gerando…' : 'Gerar com esta pasta'}
        </Acao>
        {!podeGerar && (
          <div style={{
            fontSize: 'var(--t-micro)', color: 'var(--n6)',
            marginTop: 9, textAlign: 'center',
          }}>
            {motivo}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

export default function Biblioteca() {
  const navegar = useNavigate();
  const { isMobile } = useLayout();
  const { toast } = useToast();
  const { data: pastas, loading, error, recarregar } = useApi('/api/folders', []);
  const todas = Array.isArray(pastas) ? pastas : [];

  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const [novaAberta, setNovaAberta] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const [renomeando, setRenomeando] = useState(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [descEdit, setDescEdit] = useState('');

  const visiveis = todas.filter((f) => {
    if (!busca) return true;
    const alvo = `${f.name} ${f.desc}`.toLowerCase();
    return alvo.includes(busca.toLowerCase());
  });

  /* No celular o detalhe é um passo; no computador fica sempre ao lado. */
  const atual = isMobile
    ? todas.find((f) => f.id === selecionada) || null
    : todas.find((f) => f.id === selecionada) || todas[0] || null;

  const chamar = async (rota, opcoes, sucesso) => {
    const res = await fetch(rota, opcoes);
    const corpo = await res.json().catch(() => null);
    if (!res.ok) throw new Error(corpo?.error || 'Não foi possível concluir.');
    if (sucesso) toast.success(sucesso);
    recarregar();
    return corpo;
  };

  const criarPasta = async () => {
    if (!novoNome.trim()) { toast.error('Dê um nome à pasta.'); return; }
    setOcupado('criar');
    try {
      await chamar('/api/folders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim(), descricao: novaDesc.trim() }),
      }, `Pasta "${novoNome.trim()}" criada.`);
      setNovaAberta(false); setNovoNome(''); setNovaDesc('');
    } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
  };

  const salvarNome = async () => {
    if (!nomeEdit.trim()) { toast.error('A pasta precisa de um nome.'); return; }
    setOcupado('renomear');
    try {
      await chamar(`/api/folders?id=${renomeando.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nomeEdit.trim(), descricao: descEdit.trim() }),
      }, 'Pasta atualizada.');
      setRenomeando(null);
    } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
  };

  /** Envia um arquivo para dentro da pasta. */
  const enviar = (pasta, tipo) => {
    const ehModelo = tipo === 'modelo';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ehModelo ? '.docx' : '.xlsx,.xls';
    input.onchange = async () => {
      const arquivo = input.files?.[0];
      if (!arquivo) return;
      setOcupado(ehModelo ? 'modelo' : 'planilha');
      try {
        const form = new FormData();
        form.append(ehModelo ? 'template' : 'data', arquivo);
        form.append('folderId', pasta.id);
        const corpo = await chamar(ehModelo ? '/api/templates' : '/api/sheets', {
          method: 'POST', body: form,
        });
        toast.success(ehModelo
          ? `${arquivo.name} — ${corpo.variables?.length ?? 0} campos encontrados.`
          : `${arquivo.name} — ${corpo.row_count} linhas.`);
      } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
    };
    input.click();
  };

  const apagarPlanilha = async (s) => {
    if (!s.id) { toast.warning('Esta planilha não pode ser removida daqui.'); return; }
    if (!window.confirm(`Remover "${s.name}"? O histórico das gerações continua.`)) return;
    setOcupado('apagar');
    try {
      await chamar(`/api/sheets?id=${s.id}`, { method: 'DELETE' }, 'Planilha removida.');
    } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
  };

  const gerar = async (pasta) => {
    setOcupado('gerar');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId: pasta.templateId, sheetId: pasta.sheets[0].id }),
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
      const n = res.headers.get('X-Doc-Count');
      toast.success(n ? `${n} documentos gerados.` : 'Documentos gerados.');
      recarregar();
    } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
  };

  const campoModal = (rotulo, valor, aoMudar, aoEnviar, foco) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--n7)' }}>{rotulo}</span>
      <input
        autoFocus={foco} value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') aoEnviar(); }}
        style={{
          height: 44, padding: '0 13px', borderRadius: 'var(--r-p)',
          border: '1px solid var(--n4)', background: 'var(--n0)',
          fontFamily: 'inherit', fontSize: 'var(--t-base)', outline: 'none',
        }}
      />
    </label>
  );

  return (
    <AppLayout>
      <Topbar title="Biblioteca" subtitle="Modelos e planilhas guardados" crumbLabel="Arquivos" />

      <div style={{
        flex: 1, display: 'flex', minHeight: 0,
        flexDirection: isMobile ? 'column' : 'row',
        overflow: isMobile ? 'auto' : 'hidden',
        background: 'var(--n1)',
      }}>
        {/* Grade de pastas */}
        <div
          className="rolagem-fina"
          style={{
            flex: 1, minWidth: 0, overflowY: isMobile ? 'visible' : 'auto',
            padding: isMobile ? '16px 14px 30px' : '24px 28px 40px',
            display: isMobile && atual ? 'none' : 'block',
          }}
        >
          <div style={{
            display: 'flex', gap: 10, marginBottom: 18,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              height: 42, padding: '0 14px', flex: 1, maxWidth: isMobile ? 'none' : 320,
              background: 'var(--n0)', border: 'var(--fio)', borderRadius: 'var(--r-p)',
            }}>
              <Search size={15} style={{ color: 'var(--n5)', flexShrink: 0 }} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar pasta"
                style={{
                  flex: 1, minWidth: 0, border: 'none', outline: 'none',
                  background: 'transparent', fontFamily: 'inherit',
                  fontSize: 'var(--t-base)', color: 'var(--n9)',
                }}
              />
            </div>
            <Acao aoClicar={() => setNovaAberta(true)} largura={isMobile ? '100%' : undefined}>
              <Plus size={16} /> Nova pasta
            </Acao>
          </div>

          {loading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12,
            }}>
              {Array.from({ length: 6 }, (_, i) => <CartaoEsqueleto key={i} />)}
            </div>
          ) : error ? (
            <Cartao style={{ padding: 34, textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--t-corpo)', fontWeight: 550, color: 'var(--n8)' }}>
                Não foi possível carregar a biblioteca
              </div>
              <div style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', marginTop: 6 }}>{error}</div>
            </Cartao>
          ) : visiveis.length === 0 ? (
            <Cartao style={{ padding: isMobile ? '40px 22px' : '60px 40px', textAlign: 'center' }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, margin: '0 auto 18px',
                background: 'var(--n2)', color: 'var(--n5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Folder size={20} strokeWidth={1.7} />
              </div>
              <div style={{
                fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
                fontSize: 'var(--t-sub)', letterSpacing: '-0.02em', color: 'var(--n9)',
              }}>
                {todas.length === 0 ? 'Nenhuma pasta ainda' : 'Nenhuma pasta encontrada'}
              </div>
              <p style={{
                fontSize: 'var(--t-base)', color: 'var(--n6)',
                margin: '8px auto 0', maxWidth: '44ch', lineHeight: 1.55,
              }}>
                {todas.length === 0
                  ? 'Uma pasta guarda um modelo e as planilhas que combinam com ele. Depois é só gerar direto dali, sem subir os arquivos de novo.'
                  : 'Nenhuma pasta corresponde à busca.'}
              </p>
              <div style={{ marginTop: 18 }}>
                {todas.length === 0
                  ? <Acao aoClicar={() => setNovaAberta(true)}><Plus size={15} /> Criar a primeira pasta</Acao>
                  : <Acao tipo="quieta" aoClicar={() => setBusca('')}>Limpar busca</Acao>}
              </div>
            </Cartao>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12,
            }}>
              {visiveis.map((p) => (
                <CartaoPasta
                  key={p.id} pasta={p}
                  selecionada={!isMobile && atual?.id === p.id}
                  aoAbrir={setSelecionada}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detalhe */}
        {atual && (
          <Painel
            pasta={atual} isMobile={isMobile} ocupado={ocupado}
            aoVoltar={() => setSelecionada(null)}
            aoRenomear={(f) => { setRenomeando(f); setNomeEdit(f.name); setDescEdit(f.desc || ''); }}
            aoEnviarModelo={(f) => enviar(f, 'modelo')}
            aoEnviarPlanilha={(f) => enviar(f, 'planilha')}
            aoApagarPlanilha={apagarPlanilha}
            aoGerar={gerar}
          />
        )}
      </div>

      <Modal
        open={novaAberta} onClose={() => setNovaAberta(false)} title="Nova pasta"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Acao tipo="fantasma" aoClicar={() => setNovaAberta(false)}>Cancelar</Acao>
            <Acao aoClicar={criarPasta} carregando={ocupado === 'criar'}>Criar pasta</Acao>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {campoModal('Nome', novoNome, setNovoNome, criarPasta, true)}
          {campoModal('Descrição', novaDesc, setNovaDesc, criarPasta)}
        </div>
      </Modal>

      <Modal
        open={Boolean(renomeando)} onClose={() => setRenomeando(null)} title="Renomear pasta"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Acao tipo="fantasma" aoClicar={() => setRenomeando(null)}>Cancelar</Acao>
            <Acao aoClicar={salvarNome} carregando={ocupado === 'renomear'}>Salvar</Acao>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {campoModal('Nome', nomeEdit, setNomeEdit, salvarNome, true)}
          {campoModal('Descrição', descEdit, setDescEdit, salvarNome)}
        </div>
      </Modal>
    </AppLayout>
  );
}
