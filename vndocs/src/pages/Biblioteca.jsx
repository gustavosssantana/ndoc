import { useState } from 'react';
import {
  Search, Plus, Zap, Folder, FileText, Table2, Pencil, Trash2,
  ChevronRight, Upload, MoreVertical, Download,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useLayout } from '../contexts/LayoutContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';
import { Rotulo, Cartao, Acao } from '../components/ui/Primitivas';
import { CartaoEsqueleto } from '../components/ui/Esqueleto';

/* ── Miniaturas ───────────────────────────────────────────────────────── */

/**
 * Prévia desenhada do arquivo.
 *
 * Renderizar o .docx de verdade no navegador exigiria converter o documento
 * a cada abertura da tela. Uma silhueta reconhecível — linhas de texto para
 * o Word, grade para o Excel — comunica o tipo num relance e custa nada.
 */
function Miniatura({ tipo }) {
  const ehModelo = tipo === 'modelo';

  return (
    <div style={{
      height: 132, background: 'var(--n1)', borderBottom: 'var(--fio)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', padding: '14px 18px 0',
    }}>
      <div style={{
        width: '100%', maxWidth: 148, height: '100%',
        background: 'var(--n0)', borderRadius: '4px 4px 0 0',
        border: 'var(--fio)', borderBottom: 'none',
        padding: '11px 12px', display: 'flex', flexDirection: 'column',
        gap: ehModelo ? 5 : 0, boxShadow: '0 1px 3px rgba(22,24,29,.05)',
      }}>
        {ehModelo ? (
          <>
            <div style={{ height: 5, width: '52%', borderRadius: 2, background: 'var(--azul)', opacity: .55, marginBottom: 3 }} />
            {[100, 88, 94, 70, 90, 62].map((l, i) => (
              <div key={i} style={{ height: 3, width: `${l}%`, borderRadius: 2, background: 'var(--n3)' }} />
            ))}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} style={{
                height: 9, borderRadius: 1,
                background: i < 4 ? 'var(--verde)' : 'var(--n2)',
                opacity: i < 4 ? .5 : 1,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Cartão de arquivo, no estilo dos recentes do Drive. */
function CartaoArquivo({ tipo, nome, apoio, acoes, aoBaixar, baixando }) {
  const [sobre, setSobre] = useState(false);
  const [menu, setMenu] = useState(false);
  const ehModelo = tipo === 'modelo';
  const Icone = ehModelo ? FileText : Table2;
  const tom = ehModelo ? 'var(--azul)' : 'var(--verde)';

  return (
    <div
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => { setSobre(false); setMenu(false); }}
      style={{
        position: 'relative', background: 'var(--n0)', border: 'var(--fio)',
        borderRadius: 'var(--r-m)', overflow: 'visible', minWidth: 0,
        boxShadow: sobre ? 'var(--alt-2)' : 'var(--alt-1)',
        transition: 'box-shadow .18s var(--curva)',
      }}
    >
      <div style={{ borderRadius: 'var(--r-m) var(--r-m) 0 0', overflow: 'hidden' }}>
        <Miniatura tipo={tipo} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', minWidth: 0 }}>
        <Icone size={15} strokeWidth={2} style={{ color: tom, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--n9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {nome}
          </div>
          <div style={{
            fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {apoio}
          </div>
        </div>

        {aoBaixar && (
          <button
            onClick={(e) => { e.stopPropagation(); aoBaixar(); }}
            disabled={baixando}
            className="icone acao-baixar" title={`Baixar ${nome}`} aria-label="Baixar arquivo"
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: 'var(--n6)', cursor: baixando ? 'wait' : 'pointer',
            }}
          >
            <Download size={15} className={baixando ? 'anim-spin' : undefined} />
          </button>
        )}

        {acoes?.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}
            className="icone" aria-label="Mais opções"
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: menu ? 'var(--n2)' : 'transparent', border: 'none',
              color: 'var(--n6)', cursor: 'pointer',
            }}
          >
            <MoreVertical size={15} />
          </button>
        )}

        {menu && (
          <div style={{
            position: 'absolute', right: 10, bottom: 46, zIndex: 20,
            minWidth: 176, background: 'var(--n0)', border: 'var(--fio)',
            borderRadius: 'var(--r-p)', boxShadow: 'var(--alt-3)',
            padding: 5, display: 'flex', flexDirection: 'column',
          }}>
            {acoes.map(({ rotulo, Icone: I, aoClicar, perigo }) => (
              <button
                key={rotulo}
                onClick={() => { setMenu(false); aoClicar(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 10px', borderRadius: 7, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit', fontSize: 'var(--t-mini)',
                  color: perigo ? 'var(--rubro)' : 'var(--n8)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--n1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <I size={14} /> {rotulo}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Cartão de pasta: compacto, sem miniatura. */
function CartaoPasta({ pasta, aoAbrir, aoRenomear }) {
  const [sobre, setSobre] = useState(false);
  const temModelo = Boolean(pasta.templateId);

  return (
    <div
      onClick={() => aoAbrir(pasta.id)}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      style={{
        background: 'var(--n0)', border: 'var(--fio)', borderRadius: 'var(--r-m)',
        padding: '13px 14px', cursor: 'pointer', minWidth: 0,
        boxShadow: sobre ? 'var(--alt-2)' : 'var(--alt-1)',
        transition: 'box-shadow .18s var(--curva)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: temModelo ? 'var(--azul-veu)' : 'var(--n2)',
          color: temModelo ? 'var(--azul)' : 'var(--n5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Folder size={16} strokeWidth={1.9} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--t-base)', fontWeight: 600, color: 'var(--n9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {pasta.name}
          </div>
          <div style={{
            fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {temModelo ? `${pasta.template.vars} campos` : 'sem modelo'}
            {' · '}
            {pasta.sheets.length} {pasta.sheets.length === 1 ? 'planilha' : 'planilhas'}
            {pasta.uses > 0 && ` · ${pasta.uses} usos`}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); aoRenomear(pasta); }}
          className="icone" title="Renomear"
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: sobre ? 'var(--n6)' : 'transparent', cursor: 'pointer',
          }}
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

export default function Biblioteca() {
  const { isMobile } = useLayout();
  const { toast } = useToast();
  const { data: pastas, loading, error, recarregar } = useApi('/api/folders', []);
  const todas = Array.isArray(pastas) ? pastas : [];

  const [busca, setBusca] = useState('');
  const [dentroDe, setDentroDe] = useState(null);   // id da pasta aberta
  const [ocupado, setOcupado] = useState(null);

  const [novaAberta, setNovaAberta] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const [gerando, setGerando] = useState(null);      // pasta em preparo
  const [padrao, setPadrao] = useState('');
  const [renomeando, setRenomeando] = useState(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [descEdit, setDescEdit] = useState('');

  const pasta = todas.find((f) => f.id === dentroDe) || null;

  const visiveis = todas.filter((f) => {
    if (!busca) return true;
    return `${f.name} ${f.desc}`.toLowerCase().includes(busca.toLowerCase());
  });

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
        method: 'POST', headers: { 'content-type': 'application/json' },
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
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nomeEdit.trim(), descricao: descEdit.trim() }),
      }, 'Pasta atualizada.');
      setRenomeando(null);
    } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
  };

  const enviar = (alvo, tipo) => {
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
        form.append('folderId', alvo.id);
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

  /**
   * Baixa o arquivo original guardado na Biblioteca.
   *
   * Passa pela API porque a loja de Blob é privada — o navegador não alcança
   * o arquivo pela URL, e a rota confere a sessão antes de entregar.
   */
  const baixar = async (tipo, id, nome) => {
    setOcupado(`baixar-${id}`);
    try {
      const res = await fetch(`/api/download?tipo=${tipo}&id=${id}`);
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error || 'Não foi possível baixar o arquivo.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${nome} baixado.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const apagarPlanilha = async (s) => {
    if (!s.id) { toast.warning('Esta planilha não pode ser removida daqui.'); return; }
    if (!window.confirm(`Remover "${s.name}"? O histórico das gerações continua.`)) return;
    setOcupado('apagar');
    try {
      await chamar(`/api/sheets?id=${s.id}`, { method: 'DELETE' }, 'Planilha removida.');
    } catch (e) { toast.error(e.message); } finally { setOcupado(null); }
  };

  /** Sugere um padrão a partir das colunas: nome, cliente, ou a primeira. */
  const padraoSugerido = (alvo) => {
    const colunas = alvo?.sheets?.[0]?.columns ?? [];
    const preferida = colunas.find((c) => /nome|cliente|razao|razão/i.test(c)) || colunas[0];
    return preferida ? `documento_{{${preferida}}}.docx` : 'documento_{{_index}}.docx';
  };

  /* Abre o passo de nomear. Gerar sem perguntar o nome deixava todo mundo
     com documento_1.docx, documento_2.docx — inútil num lote de duzentos. */
  const prepararGeracao = (alvo) => {
    setGerando(alvo);
    setPadrao(padraoSugerido(alvo));
  };

  const gerar = async (alvo) => {
    setOcupado('gerar');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          templateId: alvo.templateId,
          sheetId: alvo.sheets[0].id,
          pattern: padrao.trim() || padraoSugerido(alvo),
        }),
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
      setGerando(null);
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

  const grade = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(212px, 1fr))',
    gap: isMobile ? 10 : 14,
  };

  const podeGerar = pasta && pasta.templateId && pasta.sheets.length > 0;

  return (
    <AppLayout>
      <Topbar title="Biblioteca" subtitle="Modelos e planilhas guardados" crumbLabel="Arquivos" />

      <div className="rolagem-fina" style={{
        flex: 1, overflowY: 'auto', background: 'var(--n1)',
        padding: isMobile ? '14px 14px 40px' : '22px 30px 50px',
      }}>
        <div style={{ maxWidth: 1240 }}>

          {/* Caminho */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
            fontSize: 'var(--t-base)', minWidth: 0, flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setDentroDe(null)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: pasta ? 'pointer' : 'default',
                fontFamily: 'inherit', fontSize: 'var(--t-base)',
                fontWeight: pasta ? 500 : 600,
                color: pasta ? 'var(--n6)' : 'var(--n9)',
              }}
            >
              Biblioteca
            </button>
            {pasta && (
              <>
                <ChevronRight size={15} style={{ color: 'var(--n5)', flexShrink: 0 }} />
                <span style={{
                  fontWeight: 600, color: 'var(--n9)', minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pasta.name}
                </span>
              </>
            )}
          </div>

          {/* Barra de ações: muda conforme onde você está */}
          <div style={{
            display: 'flex', gap: 10, marginBottom: 20,
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap',
          }}>
            {!pasta ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  height: 42, padding: '0 14px', flex: 1, maxWidth: isMobile ? 'none' : 320,
                  background: 'var(--n0)', border: 'var(--fio)', borderRadius: 'var(--r-p)',
                }}>
                  <Search size={15} style={{ color: 'var(--n5)', flexShrink: 0 }} />
                  <input
                    value={busca} onChange={(e) => setBusca(e.target.value)}
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
              </>
            ) : (
              <>
                <Acao tipo="quieta" aoClicar={() => enviar(pasta, 'modelo')}
                  carregando={ocupado === 'modelo'} largura={isMobile ? '100%' : undefined}>
                  <Upload size={15} /> {pasta.templateId ? 'Trocar modelo' : 'Enviar modelo'}
                </Acao>
                <Acao tipo="quieta" aoClicar={() => enviar(pasta, 'planilha')}
                  carregando={ocupado === 'planilha'} largura={isMobile ? '100%' : undefined}>
                  <Plus size={15} /> Adicionar planilha
                </Acao>
                <div style={{ flex: 1 }} />
                <Acao aoClicar={() => prepararGeracao(pasta)} desabilitado={!podeGerar}
                  carregando={ocupado === 'gerar'} largura={isMobile ? '100%' : undefined}>
                  <Zap size={16} strokeWidth={2.3} /> Gerar com esta pasta
                </Acao>
              </>
            )}
          </div>

          {/* Conteúdo */}
          {loading ? (
            <div style={grade}>
              {Array.from({ length: 6 }, (_, i) => <CartaoEsqueleto key={i} />)}
            </div>

          ) : error ? (
            <Cartao style={{ padding: 34, textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--t-corpo)', fontWeight: 550, color: 'var(--n8)' }}>
                Não foi possível carregar a biblioteca
              </div>
              <div style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', marginTop: 6 }}>{error}</div>
            </Cartao>

          ) : pasta ? (
            /* ── Dentro de uma pasta ──────────────────────────────────── */
            (!pasta.templateId && pasta.sheets.length === 0) ? (
              <Cartao style={{ padding: isMobile ? '40px 22px' : '58px 40px', textAlign: 'center' }}>
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
                  Pasta vazia
                </div>
                <p style={{
                  fontSize: 'var(--t-base)', color: 'var(--n6)',
                  margin: '8px auto 0', maxWidth: '44ch', lineHeight: 1.55,
                }}>
                  Envie o modelo do Word e a planilha que combina com ele.
                  Depois é só gerar daqui, sem subir os arquivos de novo.
                </p>
              </Cartao>
            ) : (
              <div style={grade}>
                {pasta.templateId && (
                  <CartaoArquivo
                    tipo="modelo"
                    nome={pasta.template.file}
                    apoio={`${pasta.template.vars} campos · ${pasta.template.updated}`}
                    aoBaixar={() => baixar('template', pasta.templateId, pasta.template.file)}
                    baixando={ocupado === `baixar-${pasta.templateId}`}
                    acoes={[
                      { rotulo: 'Gerar com este modelo', Icone: Zap,
                        aoClicar: () => podeGerar ? prepararGeracao(pasta) : toast.warning('Adicione uma planilha primeiro.') },
                      { rotulo: 'Baixar', Icone: Download,
                        aoClicar: () => baixar('template', pasta.templateId, pasta.template.file) },
                      { rotulo: 'Trocar arquivo', Icone: Upload, aoClicar: () => enviar(pasta, 'modelo') },
                    ]}
                  />
                )}

                {pasta.sheets.map((s) => (
                  <CartaoArquivo
                    key={s.id ?? s.name}
                    tipo="planilha"
                    nome={s.name}
                    apoio={`${s.rows} ${s.rows === 1 ? 'linha' : 'linhas'} · ${s.updated}`}
                    aoBaixar={s.id ? () => baixar('sheet', s.id, s.name) : undefined}
                    baixando={ocupado === `baixar-${s.id}`}
                    acoes={[
                      { rotulo: 'Gerar com esta planilha', Icone: Zap,
                        aoClicar: () => pasta.templateId ? prepararGeracao(pasta) : toast.warning('Envie um modelo primeiro.') },
                      { rotulo: 'Baixar', Icone: Download,
                        aoClicar: () => baixar('sheet', s.id, s.name) },
                      { rotulo: 'Remover', Icone: Trash2, perigo: true, aoClicar: () => apagarPlanilha(s) },
                    ]}
                  />
                ))}

                {!pasta.templateId && (
                  <button
                    onClick={() => enviar(pasta, 'modelo')}
                    style={{
                      minHeight: 186, borderRadius: 'var(--r-m)',
                      border: '1px dashed var(--n4)', background: 'var(--n0)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 9, cursor: 'pointer',
                      color: 'var(--n6)', fontFamily: 'inherit', padding: 16,
                    }}
                  >
                    <Upload size={19} strokeWidth={1.8} />
                    <span style={{ fontSize: 'var(--t-mini)', fontWeight: 550 }}>Enviar modelo</span>
                    <span style={{ fontSize: 'var(--t-micro)', textAlign: 'center', lineHeight: 1.45 }}>
                      Falta o .docx para poder gerar
                    </span>
                  </button>
                )}
              </div>
            )

          ) : visiveis.length === 0 ? (
            /* ── Raiz vazia ───────────────────────────────────────────── */
            <Cartao style={{ padding: isMobile ? '40px 22px' : '58px 40px', textAlign: 'center' }}>
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
                  ? 'Uma pasta guarda um modelo e as planilhas que combinam com ele. Depois é só gerar direto dali.'
                  : 'Nenhuma pasta corresponde à busca.'}
              </p>
              <div style={{ marginTop: 18 }}>
                {todas.length === 0
                  ? <Acao aoClicar={() => setNovaAberta(true)}><Plus size={15} /> Criar a primeira pasta</Acao>
                  : <Acao tipo="quieta" aoClicar={() => setBusca('')}>Limpar busca</Acao>}
              </div>
            </Cartao>

          ) : (
            /* ── Raiz: as pastas ──────────────────────────────────────── */
            <>
              <Rotulo style={{ marginBottom: 11 }}>Pastas</Rotulo>
              <div style={grade}>
                {visiveis.map((p) => (
                  <CartaoPasta
                    key={p.id} pasta={p}
                    aoAbrir={setDentroDe}
                    aoRenomear={(f) => { setRenomeando(f); setNomeEdit(f.name); setDescEdit(f.desc || ''); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>


      <Modal
        open={Boolean(gerando)} onClose={() => setGerando(null)}
        title="Como nomear os documentos"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Acao tipo="fantasma" aoClicar={() => setGerando(null)}>Cancelar</Acao>
            <Acao aoClicar={() => gerar(gerando)} carregando={ocupado === 'gerar'}>
              <Zap size={15} strokeWidth={2.3} /> Gerar
            </Acao>
          </div>
        }
      >
        {gerando && (() => {
          const colunas = gerando.sheets?.[0]?.columns ?? [];
          const linhas = gerando.sheets?.[0]?.rows ?? 0;

          /* Prévia do nome: troca cada {{coluna}} por um exemplo, para a
             pessoa ver como o arquivo vai sair antes de gerar o lote. */
          const previa = (padrao || '')
            .replace(/\{\{\s*_index\s*\}\}/g, '1')
            .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, c) => {
              const achou = colunas.find(
                (k) => k.toLowerCase().trim() === String(c).toLowerCase().trim());
              return achou ? `«${achou}»` : '(sem coluna)';
            })
            .replace(/[\/\\:*?"<>|]/g, '-') || 'documento';

          const nomeFinal = /\.docx$/i.test(previa) ? previa : `${previa}.docx`;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{
                  fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--n7)',
                  display: 'block', marginBottom: 7,
                }}>
                  Padrão do nome
                </label>
                <input
                  autoFocus value={padrao}
                  onChange={(e) => setPadrao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') gerar(gerando); }}
                  placeholder="documento_{{nome}}.docx"
                  style={{
                    width: '100%', height: 46, padding: '0 14px',
                    borderRadius: 'var(--r-p)', border: '1px solid var(--n4)',
                    background: 'var(--n0)', fontFamily: 'var(--fonte-dado)',
                    fontSize: 'var(--t-mini)', color: 'var(--n9)', outline: 'none',
                  }}
                />
              </div>

              <div style={{
                padding: '13px 15px', borderRadius: 'var(--r-p)',
                background: 'var(--n1)', border: 'var(--fio)',
              }}>
                <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginBottom: 5 }}>
                  O primeiro arquivo vai se chamar
                </div>
                <div style={{
                  fontFamily: 'var(--fonte-dado)', fontSize: 'var(--t-mini)',
                  color: 'var(--n9)', wordBreak: 'break-all',
                }}>
                  {nomeFinal}
                </div>
              </div>

              {colunas.length > 0 && (
                <div>
                  <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginBottom: 8 }}>
                    Toque numa coluna para usá-la no nome
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {colunas.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPadrao((p) => {
                          const base = p.replace(/\.docx$/i, '');
                          return `${base}_{{${c}}}.docx`;
                        })}
                        style={{
                          border: 'var(--fio)', background: 'var(--n0)',
                          borderRadius: 'var(--r-total)', padding: '5px 11px',
                          fontFamily: 'var(--fonte-dado)', fontSize: 11,
                          color: 'var(--azul)', cursor: 'pointer',
                        }}
                      >
                        {`{{${c}}}`}
                      </button>
                    ))}
                    <button
                      onClick={() => setPadrao((p) => `${p.replace(/\.docx$/i, '')}_{{_index}}.docx`)}
                      title="Número sequencial da linha"
                      style={{
                        border: 'var(--fio)', background: 'var(--n0)',
                        borderRadius: 'var(--r-total)', padding: '5px 11px',
                        fontFamily: 'var(--fonte-dado)', fontSize: 11,
                        color: 'var(--n6)', cursor: 'pointer',
                      }}
                    >
                      {'{{_index}}'}
                    </button>
                  </div>
                </div>
              )}

              <p style={{
                fontSize: 'var(--t-micro)', color: 'var(--n6)', margin: 0, lineHeight: 1.6,
              }}>
                Serão {linhas || 'várias'} {linhas === 1 ? 'documento' : 'documentos'}, um por
                linha da planilha. Nomes repetidos ganham um número no fim, para
                nenhum arquivo sobrescrever outro.
              </p>
            </div>
          );
        })()}
      </Modal>

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
