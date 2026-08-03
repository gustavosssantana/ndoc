import { useState, useRef } from 'react';
import {
  FileText, Table2, Upload, Zap, Download, Check, AlertTriangle,
  ChevronLeft, ChevronRight, RotateCcw, X,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useLayout } from '../contexts/LayoutContext';
import { inspectFiles, generateDocuments, downloadBlob } from '../services/engine';
import { Campo, Rotulo, Cartao, Acao } from '../components/ui/Primitivas';
import { Linha } from '../components/ui/Esqueleto';

/* ── Nome de arquivo ──────────────────────────────────────────────────── */

function limpar(s) {
  return String(s)
    .replace(/[\/\\:*?"<>|\n\r]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
}

function montarNome(padrao, linha, indice) {
  let nome = String(padrao || '')
    .replace(/\{\{\s*_index\s*\}\}/g, String(indice + 1))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => limpar(linha?.[k] ?? '') || 'sem-valor');
  if (!/\.docx$/i.test(nome)) nome += '.docx';
  return nome;
}

function padraoInicial(colunas) {
  const preferida = colunas.find((c) => /nome|name|cliente/i.test(c)) || colunas[0];
  return preferida ? `documento_{{${preferida}}}.docx` : 'documento_{{_index}}.docx';
}

const tamanhoLegivel = (b) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`;

/* ── Passo ────────────────────────────────────────────────────────────── */

/**
 * Numerar aqui é honesto: gerar documentos é uma sequência de verdade —
 * primeiro os arquivos, depois o encaixe dos campos, depois o resultado.
 * A ordem carrega informação que a pessoa precisa.
 */
function Passo({ n, titulo, apoio, acao, ativo = true, children }) {
  return (
    <section style={{ opacity: ativo ? 1 : .5, transition: 'opacity .3s var(--curva)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 14,
      }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
          background: ativo ? 'var(--n9)' : 'var(--n3)',
          color: ativo ? 'var(--n0)' : 'var(--n6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--fonte-dado)', fontSize: 11, fontWeight: 600,
        }}>
          {n}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{
              fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
              fontSize: 'var(--t-sub)', letterSpacing: '-0.024em',
              color: 'var(--n9)', margin: 0,
            }}>
              {titulo}
            </h2>
            {acao}
          </div>
          {apoio && (
            <p style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {apoio}
            </p>
          )}
        </div>
      </div>
      <div style={{ paddingLeft: 37 }}>{children}</div>
    </section>
  );
}

/* ── Área de arquivo ──────────────────────────────────────────────────── */

function Solta({ tipo, aceita, arquivo, resumo, aoEscolher, aoLimpar }) {
  const entrada = useRef(null);
  const [sobre, setSobre] = useState(false);
  const ehModelo = tipo === 'modelo';
  const Icone = ehModelo ? FileText : Table2;
  const tom = ehModelo ? 'var(--azul)' : 'var(--verde)';

  if (arquivo) {
    return (
      <Cartao style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: ehModelo ? 'var(--azul-veu)' : 'rgba(18,128,92,.10)', color: tom,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icone size={18} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--t-base)', fontWeight: 550, color: 'var(--n9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {arquivo.name}
          </div>
          <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 2 }}>
            {resumo ?? tamanhoLegivel(arquivo.size)}
          </div>
        </div>
        <button
          onClick={aoLimpar} title="Remover" aria-label="Remover arquivo" className="icone"
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: 'var(--n5)', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--n2)'; e.currentTarget.style.color = 'var(--n7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n5)'; }}
        >
          <X size={15} />
        </button>
      </Cartao>
    );
  }

  return (
    <div
      onClick={() => entrada.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault(); setSobre(false);
        const f = e.dataTransfer.files?.[0];
        if (f) aoEscolher(f);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 13,
        padding: '18px 16px', cursor: 'pointer',
        borderRadius: 'var(--r-m)',
        border: `1px dashed ${sobre ? tom : 'var(--n4)'}`,
        background: sobre ? (ehModelo ? 'var(--azul-veu)' : 'rgba(18,128,92,.06)') : 'var(--n0)',
        transition: 'border-color .16s var(--curva), background .16s var(--curva)',
      }}
    >
      <input
        ref={entrada} type="file" accept={aceita} hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) aoEscolher(f); e.target.value = ''; }}
      />
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: 'var(--n2)', color: 'var(--n6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Upload size={17} strokeWidth={1.8} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--t-base)', fontWeight: 550, color: 'var(--n8)' }}>
          {ehModelo ? 'Modelo do Word' : 'Planilha do Excel'}
        </div>
        <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 2 }}>
          {ehModelo ? 'Arraste o .docx ou toque para escolher' : 'Arraste o .xlsx ou toque para escolher'}
        </div>
      </div>
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

export default function Generate() {
  const { isMobile } = useLayout();

  const [modelo, setModelo] = useState(null);
  const [planilha, setPlanilha] = useState(null);
  const [lendo, setLendo] = useState(false);
  const [erroLeitura, setErroLeitura] = useState('');
  const [dados, setDados] = useState(null);
  const [mapa, setMapa] = useState({});
  const [padrao, setPadrao] = useState('');
  const [indice, setIndice] = useState(0);

  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erroGeracao, setErroGeracao] = useState('');
  const [resultado, setResultado] = useState(null);

  const linhas = dados?.rows || [];
  const linha = linhas[indice] || null;
  const semPar = dados ? dados.variables.filter((v) => !mapa[v]) : [];
  const podeGerar = modelo && planilha && dados && dados.rowCount > 0 && !lendo && !gerando;

  async function inspecionar(tpl, dat) {
    if (!tpl || !dat) return;
    if (!/\.docx$/i.test(tpl.name)) {
      setErroLeitura('O modelo precisa ser um arquivo .docx');
      setDados(null);
      return;
    }
    setLendo(true); setErroLeitura(''); setDados(null); setResultado(null);
    try {
      const d = await inspectFiles(tpl, dat);
      setDados(d);
      /* O servidor já resolveu o casamento, inclusive os aproximados. */
      const m = {};
      d.variables.forEach((v) => { m[v] = d.mapping?.[v] ?? ''; });
      setMapa(m);
      setPadrao((p) => p || padraoInicial(d.columns));
      setIndice(0);
    } catch (e) {
      setErroLeitura(e.message);
    } finally {
      setLendo(false);
    }
  }

  const escolherModelo = (f) => { setModelo(f); inspecionar(f, planilha); };
  const escolherPlanilha = (f) => { setPlanilha(f); inspecionar(modelo, f); };

  async function gerar() {
    setGerando(true); setProgresso(6); setErroGeracao('');
    const passo = setInterval(() => setProgresso((p) => Math.min(92, p + Math.random() * 9)), 180);
    try {
      const { blob, count } = await generateDocuments({
        templateFile: modelo, dataFile: planilha, mapping: mapa, pattern: padrao,
      });
      clearInterval(passo); setProgresso(100);
      setTimeout(() => {
        setGerando(false);
        setResultado({ count, blob, size: blob.size });
      }, 320);
    } catch (e) {
      clearInterval(passo); setGerando(false); setErroGeracao(e.message);
    }
  }

  const recomecar = () => {
    setModelo(null); setPlanilha(null); setDados(null);
    setMapa({}); setPadrao(''); setResultado(null);
    setErroLeitura(''); setErroGeracao(''); setIndice(0);
  };

  /* ── Resultado ocupa a tela: é o fim do fluxo ─────────────────────── */
  if (resultado) {
    return (
      <AppLayout>
        <Topbar title="Gerar documentos" subtitle="Lote concluído" crumbLabel="Gerar" />
        <div className="rolagem-fina" style={{
          flex: 1, overflowY: 'auto', background: 'var(--n1)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: isMobile ? '28px 14px 40px' : '56px 34px',
        }}>
          <Cartao style={{
            maxWidth: 520, width: '100%',
            padding: isMobile ? '32px 22px' : '44px 40px', textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 20px',
              background: 'rgba(18,128,92,.10)', color: 'var(--verde)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={24} strokeWidth={2.4} />
            </div>

            <div style={{
              fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
              fontSize: 'var(--t-h1)', letterSpacing: '-0.035em',
              color: 'var(--n9)', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>
              {resultado.count}
            </div>
            <div style={{ fontSize: 'var(--t-corpo)', color: 'var(--n7)', marginTop: 8 }}>
              {resultado.count === 1 ? 'documento gerado' : 'documentos gerados'}
            </div>
            <div style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', marginTop: 4 }}>
              {tamanhoLegivel(resultado.size)} · a partir de {modelo?.name}
            </div>

            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Acao largura="100%" aoClicar={() => downloadBlob(resultado.blob, 'documentos.zip')}>
                <Download size={16} /> Baixar o .zip
              </Acao>
              <Acao tipo="fantasma" largura="100%" aoClicar={recomecar}>
                <RotateCcw size={15} /> Gerar outro lote
              </Acao>
            </div>

            <p style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 20, lineHeight: 1.6 }}>
              O modelo e a planilha ficaram guardados na Biblioteca. Dá para
              baixar este lote de novo pelo Histórico.
            </p>
          </Cartao>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Topbar title="Gerar documentos" subtitle="Modelo mais planilha, um documento por linha" crumbLabel="Gerar" />

      <div className="rolagem-fina" style={{
        flex: 1, overflowY: 'auto', background: 'var(--n1)',
        padding: isMobile ? '18px 14px 40px' : '30px 34px 60px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 380px',
          gap: isMobile ? 30 : 40,
          maxWidth: 1120, alignItems: 'start',
        }}>
          {/* Coluna do fluxo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 34, minWidth: 0 }}>

            <Passo
              n="1"
              titulo="Os dois arquivos"
              apoio="O modelo traz os campos entre chaves. A planilha traz uma linha por documento."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Solta
                  tipo="modelo" aceita=".docx" arquivo={modelo}
                  resumo={dados
                    ? `${dados.variables.length} ${dados.variables.length === 1 ? 'campo' : 'campos'}` +
                      (dados.totalOccurrences > dados.variables.length
                        ? ` · ${dados.totalOccurrences} ocorrências no documento`
                        : '')
                    : undefined}
                  aoEscolher={escolherModelo}
                  aoLimpar={() => { setModelo(null); setDados(null); setResultado(null); }}
                />
                <Solta
                  tipo="planilha" aceita=".xlsx,.xls" arquivo={planilha}
                  resumo={dados ? `${dados.rowCount} linhas · ${dados.columns.length} colunas` : undefined}
                  aoEscolher={escolherPlanilha}
                  aoLimpar={() => { setPlanilha(null); setDados(null); setResultado(null); }}
                />
              </div>

              {erroLeitura && (
                <div style={{
                  display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 12,
                  padding: '12px 14px', borderRadius: 'var(--r-p)',
                  background: 'rgba(192,50,43,.07)', border: '1px solid rgba(192,50,43,.18)',
                }}>
                  <AlertTriangle size={15} style={{ color: 'var(--rubro)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 'var(--t-mini)', color: 'var(--n8)', lineHeight: 1.5 }}>
                    {erroLeitura}
                  </span>
                </div>
              )}
            </Passo>

            <Passo
              n="2"
              titulo="O encaixe dos campos"
              apoio="Cada campo do modelo procura a coluna de mesmo nome."
              ativo={Boolean(dados) || lendo}
            >
              {lendo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Linha largura="70%" altura={14} />
                  <Linha largura="52%" altura={14} />
                  <Linha largura="61%" altura={14} />
                </div>
              ) : !dados ? (
                <p style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', margin: 0 }}>
                  Assim que os dois arquivos chegarem, os campos aparecem aqui.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    fontSize: 'var(--t-mini)', color: 'var(--n7)',
                  }}>
                    {semPar.length === 0 ? (
                      <>
                        <Check size={14} style={{ color: 'var(--verde)' }} />
                        Todos os {dados.variables.length} campos encontraram sua coluna.
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} style={{ color: 'var(--ambar)' }} />
                        {semPar.length} {semPar.length === 1 ? 'campo ficou' : 'campos ficaram'} sem coluna —
                        {semPar.length === 1 ? ' ele sai vazio' : ' eles saem vazios'} nos documentos.
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {dados.variables.map((v) => (
                      <Campo key={v} nome={v} estado={mapa[v] ? 'casado' : 'orfao'} />
                    ))}
                  </div>

                  {/* Casou apesar de escrito diferente: mostramos o par para
                      a pessoa conferir, em vez de corrigir escondido. */}
                  {dados.approxMatches?.length > 0 && (
                    <div style={{
                      padding: '11px 13px', borderRadius: 'var(--r-p)',
                      background: 'var(--n1)', border: 'var(--fio)',
                      fontSize: 'var(--t-micro)', color: 'var(--n7)', lineHeight: 1.6,
                    }}>
                      Casados por semelhança:{' '}
                      {dados.approxMatches.map((a, i) => (
                        <span key={a.campo}>
                          {i > 0 && ' · '}
                          <span style={{ fontFamily: 'var(--fonte-dado)' }}>{`{{${a.campo}}}`}</span>
                          {' → coluna '}
                          <span style={{ fontFamily: 'var(--fonte-dado)', color: 'var(--n9)' }}>{a.coluna}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                    <span style={{ fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--n7)' }}>
                      Como nomear cada arquivo
                    </span>
                    <input
                      value={padrao}
                      onChange={(e) => setPadrao(e.target.value)}
                      placeholder="documento_{{nome}}.docx"
                      style={{
                        height: 42, padding: '0 13px', borderRadius: 'var(--r-p)',
                        border: '1px solid var(--n4)', background: 'var(--n0)',
                        fontFamily: 'var(--fonte-dado)', fontSize: 'var(--t-mini)',
                        color: 'var(--n9)', outline: 'none',
                      }}
                    />
                    {linha && (
                      <span style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)' }}>
                        Vai sair assim:{' '}
                        <span style={{ fontFamily: 'var(--fonte-dado)', color: 'var(--n8)' }}>
                          {montarNome(padrao, linha, indice)}
                        </span>
                      </span>
                    )}
                  </label>
                </div>
              )}
            </Passo>

            <Passo
              n="3"
              titulo="Gerar"
              apoio={dados ? `Um documento para cada uma das ${dados.rowCount} linhas.` : undefined}
              ativo={Boolean(podeGerar) || gerando}
            >
              {gerando ? (
                <div>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--n3)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${progresso}%`, height: '100%', background: 'var(--azul)',
                      borderRadius: 999, transition: 'width .25s var(--curva)',
                    }} />
                  </div>
                  <div style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', marginTop: 10 }}>
                    Preenchendo os documentos…
                  </div>
                </div>
              ) : (
                <>
                  <Acao
                    aoClicar={gerar}
                    desabilitado={!podeGerar}
                    largura={isMobile ? '100%' : undefined}
                  >
                    <Zap size={16} strokeWidth={2.3} />
                    {dados ? `Gerar ${dados.rowCount} documentos` : 'Gerar documentos'}
                  </Acao>

                  {erroGeracao && (
                    <div style={{
                      display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 12,
                      padding: '12px 14px', borderRadius: 'var(--r-p)',
                      background: 'rgba(192,50,43,.07)', border: '1px solid rgba(192,50,43,.18)',
                    }}>
                      <AlertTriangle size={15} style={{ color: 'var(--rubro)', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 'var(--t-mini)', color: 'var(--n8)', lineHeight: 1.5 }}>
                        {erroGeracao}
                      </span>
                    </div>
                  )}
                </>
              )}
            </Passo>
          </div>

          {/* Prévia: no celular vai para o fim, depois dos passos */}
          <Cartao style={{
            padding: 0, overflow: 'hidden',
            position: isMobile ? 'static' : 'sticky', top: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', borderBottom: 'var(--fio)', background: 'var(--n1)',
            }}>
              <Rotulo>Prévia</Rotulo>
              {dados && dados.rowCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={() => setIndice((i) => Math.max(0, i - 1))}
                    disabled={indice === 0} className="icone" aria-label="Linha anterior"
                    style={{
                      width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent',
                      color: indice === 0 ? 'var(--n4)' : 'var(--n7)',
                      cursor: indice === 0 ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span style={{
                    fontFamily: 'var(--fonte-dado)', fontSize: 11, color: 'var(--n7)',
                    minWidth: 54, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {indice + 1} / {dados.rowCount}
                  </span>
                  <button
                    onClick={() => setIndice((i) => Math.min(linhas.length - 1, i + 1))}
                    disabled={indice >= linhas.length - 1} className="icone" aria-label="Próxima linha"
                    style={{
                      width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent',
                      color: indice >= linhas.length - 1 ? 'var(--n4)' : 'var(--n7)',
                      cursor: indice >= linhas.length - 1 ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: 16, minHeight: 190 }}>
              {!dados ? (
                <div style={{
                  height: 170, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center',
                }}>
                  <FileText size={22} strokeWidth={1.6} style={{ color: 'var(--n4)' }} />
                  <span style={{ fontSize: 'var(--t-mini)', color: 'var(--n6)', maxWidth: '26ch', lineHeight: 1.5 }}>
                    A prévia mostra os valores da primeira linha assim que os arquivos chegarem.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {dados.variables.map((v) => (
                    <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Campo nome={v} tamanho="p" estado={mapa[v] ? 'casado' : 'orfao'} />
                        {(() => {
                          const n = dados.fieldCounts?.find((c) => c.nome === v)?.ocorrencias ?? 1;
                          return n > 1 ? (
                            <span style={{ fontSize: 'var(--t-micro)', color: 'var(--n5)' }}>
                              {n}× no documento
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div style={{
                        fontSize: 'var(--t-mini)', color: mapa[v] ? 'var(--n9)' : 'var(--n5)',
                        paddingLeft: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {mapa[v] ? (String(linha?.[mapa[v]] ?? '') || '—') : 'sem coluna correspondente'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Cartao>
        </div>
      </div>
    </AppLayout>
  );
}
