import { useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, Check, Zap, Download, FileText, Table2, RefreshCw, UploadCloud, AlertTriangle, FileWarning } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useLayout } from '../contexts/LayoutContext';
import Topbar from '../components/layout/Topbar';
import { inspectFiles, generateDocuments, downloadBlob } from '../services/engine';

/* ─── helpers ──────────────────────────────────────────────────────────── */
const fmtSize = (b) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

function sanitize(s) {
  return String(s).replace(/[\/\\:*?"<>|\n\r]/g, '-').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^[-_.]+|[-_.]+$/g, '');
}
function renderName(pattern, row, index) {
  let name = String(pattern || '')
    .replace(/\{\{\s*_index\s*\}\}/g, String(index + 1))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => sanitize(row?.[k] ?? '') || 'sem-valor');
  if (!/\.docx$/i.test(name)) name += '.docx';
  return name;
}
function defaultPattern(columns) {
  const pref = columns.find(c => /nome|name|cliente/i.test(c)) || columns[0];
  return pref ? `documento_{{${pref}}}.docx` : 'documento_{{_index}}.docx';
}

/* ─── section wrapper + file badge ─────────────────────────────────────── */
function Section({ n, title, action, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,.09)', borderRadius: 16, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.25)', color: '#2563EB', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

const FileBadge = ({ kind }) => (
  <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: kind === 'docx' ? '#2563EB' : '#16A34A', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '.04em', fontFamily: "'Geist Mono', monospace" }}>
    {kind === 'docx' ? 'DOCX' : 'XLSX'}
  </div>
);

/* Dropzone OU cartão do arquivo selecionado */
function FilePicker({ kind, accept, file, meta, onPick }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const open = () => ref.current?.click();
  const handle = (f) => { if (f) onPick(f); };

  return (
    <>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { handle(e.target.files?.[0]); e.target.value = ''; }} />
      {!file ? (
        <div onClick={open}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 16px', borderRadius: 12, border: `1.5px dashed ${drag ? '#2563EB' : 'rgba(15,23,42,.18)'}`, background: drag ? 'rgba(37,99,235,.05)' : 'rgba(15,23,42,.015)', cursor: 'pointer', textAlign: 'center', transition: 'all .12s' }}>
          <UploadCloud size={22} style={{ color: drag ? '#2563EB' : 'rgba(15,23,42,.4)' }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(15,23,42,.7)' }}>Arraste ou clique para selecionar</div>
          <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.4)' }}>{accept}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderRadius: 12, background: kind === 'docx' ? 'rgba(37,99,235,.05)' : 'rgba(34,197,94,.05)', border: `1px solid ${kind === 'docx' ? 'rgba(37,99,235,.2)' : 'rgba(34,197,94,.25)'}` }}>
          <FileBadge kind={kind} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.45)', marginTop: 3, fontFamily: "'Geist Mono', monospace" }}>{meta || fmtSize(file.size)}</div>
          </div>
          <button onClick={open} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'rgba(15,23,42,.5)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2563EB'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(15,23,42,.5)'}>
            <RefreshCw size={13} /> Trocar
          </button>
        </div>
      )}
    </>
  );
}

/* ─── page ─────────────────────────────────────────────────────────────── */
export default function Generate() {
  const { isMobile } = useLayout();
  const [templateFile, setTemplateFile] = useState(null);
  const [dataFile, setDataFile] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectErr, setInspectErr] = useState('');
  const [data, setData] = useState(null); // { variables, columns, rowCount, rows, autoMapped, unmapped }
  const [mapping, setMapping] = useState({});
  const [pattern, setPattern] = useState('');
  const [idx, setIdx] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genErr, setGenErr] = useState('');
  const [result, setResult] = useState(null); // { count, blob, size }

  const rows = data?.rows || [];
  const row = rows[idx] || null;
  const autoCount = data ? data.variables.filter(v => mapping[v]).length : 0;
  const canGenerate = templateFile && dataFile && data && data.rowCount > 0 && !inspecting && !generating;

  async function runInspect(tpl, dat) {
    if (!tpl || !dat) return;
    if (!/\.docx$/i.test(tpl.name)) { setInspectErr('O template precisa ser um arquivo .docx'); setData(null); return; }
    setInspecting(true); setInspectErr(''); setData(null); setResult(null);
    try {
      const d = await inspectFiles(tpl, dat);
      setData(d);
      const m = {};
      d.variables.forEach(v => { m[v] = d.columns.includes(v) ? v : ''; });
      setMapping(m);
      setPattern(p => p || defaultPattern(d.columns));
      setIdx(0);
    } catch (e) {
      setInspectErr(e.message);
    } finally {
      setInspecting(false);
    }
  }

  const pickTemplate = (f) => { setTemplateFile(f); runInspect(f, dataFile); };
  const pickData = (f) => { setDataFile(f); runInspect(templateFile, f); };

  async function handleGenerate() {
    setGenerating(true); setProgress(5); setGenErr('');
    const iv = setInterval(() => setProgress(p => Math.min(90, p + Math.random() * 9)), 180);
    try {
      const { blob, count } = await generateDocuments({ templateFile, dataFile, mapping, pattern });
      clearInterval(iv); setProgress(100);
      setTimeout(() => { setGenerating(false); setResult({ count, blob, size: blob.size }); }, 300);
    } catch (e) {
      clearInterval(iv); setGenerating(false); setGenErr(e.message);
    }
  }

  const reset = () => { setTemplateFile(null); setDataFile(null); setData(null); setMapping({}); setPattern(''); setResult(null); setInspectErr(''); setGenErr(''); setIdx(0); };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar crumb="GERAR" title="Gerar documentos" subtitle="Suba o template e a planilha · geração real" />

        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden', position: 'relative' }}>
          {/* ─── Left: config ─── */}
          <div className="stagger" style={{ width: isMobile ? '100%' : 460, borderRight: isMobile ? 'none' : '1px solid rgba(15,23,42,.08)', overflowY: 'auto', padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0, background: '#f6f7f9' }}>

            <Section n="1" title="Template Word">
              <FilePicker kind="docx" accept=".docx" file={templateFile}
                meta={data && templateFile ? `${data.variables.length} variáveis detectadas` : undefined}
                onPick={pickTemplate} />
            </Section>

            <Section n="2" title="Dados (planilha)">
              <FilePicker kind="xlsx" accept=".xlsx,.xls,.csv" file={dataFile}
                meta={data && dataFile ? `${data.rowCount} linhas · ${data.columns.length} colunas` : undefined}
                onPick={pickData} />
            </Section>

            {inspecting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', border: '1px solid rgba(15,23,42,.09)', borderRadius: 14, fontSize: 13, color: 'rgba(15,23,42,.6)' }}>
                <RefreshCw size={15} className="gt-spin" /> Analisando arquivos…
              </div>
            )}

            {inspectErr && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', background: 'rgba(220,38,38,.05)', border: '1px solid rgba(220,38,38,.25)', borderRadius: 14, fontSize: 12.5, color: '#B91C1C', lineHeight: 1.5 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {inspectErr}
              </div>
            )}

            {/* Mapping */}
            {data && (
              <Section n="3" title="Mapeamento" action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#16A34A', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 999, padding: '3px 9px' }}>
                  <Check size={11} strokeWidth={3} /> {autoCount}/{data.variables.length} auto
                </div>
              }>
                {data.variables.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'rgba(15,23,42,.55)' }}>
                    <FileWarning size={15} /> Nenhuma variável <code>{'{{...}}'}</code> encontrada no template.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.variables.map(v => (
                      <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ flex: 1, background: 'rgba(37,99,235,.07)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 8, padding: '7px 11px', fontFamily: "'Geist Mono', monospace", fontSize: 12, color: '#2563EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`{{${v}}}`}</div>
                        <ChevronRight size={13} style={{ color: 'rgba(15,23,42,.3)', flexShrink: 0 }} />
                        <select value={mapping[v] || ''} onChange={e => setMapping(m => ({ ...m, [v]: e.target.value }))}
                          style={{ flex: 1, background: '#fff', border: `1px solid ${mapping[v] ? 'rgba(15,23,42,.14)' : 'rgba(220,38,38,.4)'}`, borderRadius: 8, padding: '7px 9px', fontSize: 12.5, color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
                          <option value="">— não mapear —</option>
                          {data.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Filename pattern */}
            {data && (
              <Section n="4" title="Padrão de nome">
                <input value={pattern} onChange={e => setPattern(e.target.value)}
                  style={{ width: '100%', background: '#fff', border: '1px solid rgba(15,23,42,.14)', borderRadius: 10, padding: '10px 13px', fontFamily: "'Geist Mono', monospace", fontSize: 13, color: '#0f172a', outline: 'none' }} />
                <div style={{ fontSize: 11, color: 'rgba(15,23,42,.45)', marginTop: 8, lineHeight: 1.5 }}>
                  Use <code style={{ color: '#2563EB' }}>{'{{coluna}}'}</code> e <code style={{ color: '#2563EB' }}>{'{{_index}}'}</code>.
                  {row && <> Ex.: <b style={{ color: 'rgba(15,23,42,.65)' }}>{renderName(pattern, row, idx)}</b></>}
                </div>
              </Section>
            )}
          </div>

          {/* ─── Right: preview ─── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#eef1f5', overflow: 'hidden', minWidth: 0 }}>
            {data && rows.length > 0 ? (
              <>
                <div style={{ padding: '14px 22px', borderBottom: '1px solid rgba(15,23,42,.08)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, background: '#fff' }}>
                  <span style={{ fontSize: 11, color: 'rgba(15,23,42,.42)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>Preview da linha</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f3f6', border: '1px solid rgba(15,23,42,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? .4 : 1, color: 'rgba(15,23,42,.7)' }}><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: 12.5, color: 'rgba(15,23,42,.55)' }}>linha <b style={{ color: '#0f172a', fontFamily: "'Geist Mono', monospace" }}>{String(idx + 1).padStart(2, '0')}</b> / {data.rowCount}</span>
                    <button onClick={() => setIdx(i => Math.min(rows.length - 1, i + 1))} disabled={idx >= rows.length - 1} style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f3f6', border: '1px solid rgba(15,23,42,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx >= rows.length - 1 ? 'not-allowed' : 'pointer', opacity: idx >= rows.length - 1 ? .4 : 1, color: 'rgba(15,23,42,.7)' }}><ChevronRight size={14} /></button>
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, color: 'rgba(15,23,42,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Arquivo: <b style={{ color: '#0f172a', fontFamily: "'Geist Mono', monospace" }}>{renderName(pattern, row, idx)}</b>
                  </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 100px', display: 'flex', justifyContent: 'center' }}>
                  <div key={idx} className="anim-fade-in" style={{ width: '100%', maxWidth: 620, background: '#fff', borderRadius: 8, border: '1px solid rgba(15,23,42,.08)', boxShadow: '0 12px 40px rgba(15,23,42,.1)', overflow: 'hidden', alignSelf: 'flex-start' }}>
                    <div style={{ height: 4, background: 'linear-gradient(90deg,#1D4ED8,#3B82F6)' }} />
                    <div style={{ padding: '26px 30px' }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(15,23,42,.4)', fontWeight: 700, marginBottom: 16 }}>Valores desta linha</div>
                      {data.variables.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'rgba(15,23,42,.5)' }}>O template não tem variáveis — todos os documentos sairão iguais.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {data.variables.map((v, i) => {
                            const col = mapping[v];
                            const val = col ? (row[col] ?? '') : '';
                            return (
                              <div key={v} style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(15,23,42,.06)' }}>
                                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5, color: '#2563EB', minWidth: 150, flexShrink: 0 }}>{`{{${v}}}`}</span>
                                {col
                                  ? <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{String(val) || <em style={{ color: 'rgba(15,23,42,.35)', fontWeight: 400 }}>(vazio)</em>}</span>
                                  : <span style={{ fontSize: 12.5, color: '#B91C1C', fontStyle: 'italic' }}>não mapeado</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div style={{ position: 'absolute', bottom: 0, right: 0, left: 460, padding: '16px 28px', background: 'linear-gradient(to top, #eef1f5 72%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
                  {genErr && <span style={{ flex: 1, fontSize: 12.5, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 7 }}><AlertTriangle size={15} /> {genErr}</span>}
                  <button onClick={handleGenerate} disabled={!canGenerate} style={{ display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 24px', borderRadius: 12, background: canGenerate ? '#2563EB' : 'rgba(37,99,235,.4)', color: '#fff', border: 'none', fontSize: 14.5, fontWeight: 600, cursor: canGenerate ? 'pointer' : 'not-allowed', boxShadow: canGenerate ? '0 8px 24px rgba(37,99,235,.3)' : 'none' }}
                    onMouseEnter={e => canGenerate && (e.currentTarget.style.background = '#1D4ED8')} onMouseLeave={e => canGenerate && (e.currentTarget.style.background = '#2563EB')}>
                    <Zap size={17} strokeWidth={2.2} /> Gerar {data.rowCount} documento{data.rowCount === 1 ? '' : 's'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'rgba(15,23,42,.45)', textAlign: 'center', padding: 40 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fff', border: '1px solid rgba(15,23,42,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.3)' }}>
                  <FileText size={28} strokeWidth={1.6} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(15,23,42,.6)' }}>Suba o template e a planilha</div>
                <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.5 }}>Assim que os dois arquivos estiverem prontos, você vê aqui o preview de cada documento antes de gerar.</div>
              </div>
            )}
          </div>

          {/* Progress overlay */}
          {generating && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
              <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,.1)', borderRadius: 20, padding: '40px 48px', width: 420, textAlign: 'center', boxShadow: '0 24px 70px rgba(15,23,42,.25)', animation: 'fadeUp .2s ease-out' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#2563EB' }}>
                  <Zap size={28} className="gt-pulse" />
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 6 }}>Gerando documentos</h3>
                <p style={{ fontSize: 13.5, color: 'rgba(15,23,42,.5)', marginBottom: 24 }}>Preenchendo {data?.rowCount} arquivos…</p>
                <div style={{ width: '100%', height: 8, background: 'rgba(15,23,42,.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#2563EB,#3B82F6)', borderRadius: 4, transition: 'width .2s ease' }} />
                </div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: 'rgba(15,23,42,.45)' }}>{Math.round(progress)}%</div>
              </div>
            </div>
          )}

          {/* Success overlay */}
          {result && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
              <div style={{ background: '#fff', border: '1px solid rgba(34,197,94,.35)', borderRadius: 20, padding: '44px 52px', width: 460, textAlign: 'center', boxShadow: '0 24px 70px rgba(15,23,42,.25)', animation: 'fadeUp .25s ease-out' }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(34,197,94,.13)', border: '1px solid rgba(34,197,94,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', color: '#16A34A' }}>
                  <Check size={36} strokeWidth={2.5} />
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: '-0.03em', marginBottom: 8 }}>Geração concluída!</h3>
                <p style={{ fontSize: 14, color: 'rgba(15,23,42,.55)', lineHeight: 1.6, marginBottom: 6 }}>
                  <b style={{ color: '#0f172a' }}>{result.count}</b> documentos gerados.
                </p>
                <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: 'rgba(15,23,42,.4)', marginBottom: 28 }}>{fmtSize(result.size)} · .zip</p>
                <button onClick={() => downloadBlob(result.blob, 'documentos.zip')} style={{ width: '100%', height: 46, borderRadius: 999, background: '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
                  <Download size={17} /> Baixar .zip
                </button>
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 14 }}>
                  <button onClick={() => setResult(null)} style={{ background: 'none', border: 'none', color: 'rgba(15,23,42,.45)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Voltar</button>
                  <button onClick={reset} style={{ background: 'none', border: 'none', color: 'rgba(15,23,42,.45)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Nova geração</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
