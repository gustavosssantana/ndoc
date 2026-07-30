import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Plus, Zap, Star, Pencil, MoreHorizontal, RefreshCw } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/ui/Spinner';

/* ─── File-type badges ─────────────────────────────────────────────────── */
const FileBadge = ({ kind }) => {
  const blue = kind === 'docx';
  return (
    <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: blue ? '#2563EB' : '#16A34A', color: '#fff', fontSize: 8.5, fontWeight: 800, letterSpacing: '.04em', fontFamily: "'Geist Mono', monospace" }}>
      {blue ? 'DOCX' : 'XLSX'}
    </div>
  );
};

/* ─── Folder thumbnail (Word + Excel mini docs) ────────────────────────── */
function FolderThumb({ pinned, accent }) {
  const lines = [82, 96, 70, 90, 60];
  return (
    <div style={{ position: 'relative', height: 124, borderRadius: 12, background: '#eef1f5', border: '1px solid rgba(15,23,42,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' }}>
      {/* Word doc */}
      <div style={{ width: 82, height: 100, background: '#fff', borderRadius: 6, boxShadow: '0 4px 14px rgba(15,23,42,.1)', padding: '11px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 5, width: '70%', borderRadius: 3, background: accent }} />
        {lines.map((w, i) => <div key={i} style={{ height: 3.5, width: `${w}%`, borderRadius: 2, background: 'rgba(15,23,42,.12)' }} />)}
      </div>
      {/* Excel sheet */}
      <div style={{ width: 58, height: 78, background: '#fff', borderRadius: 6, boxShadow: '0 4px 14px rgba(15,23,42,.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 11, background: '#16A34A' }} />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4,1fr)', gap: 2, padding: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ background: 'rgba(34,197,94,.1)', borderRadius: 1 }} />)}
        </div>
      </div>
      {/* Star badge */}
      {pinned && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 7, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,.4)' }}>
          <Star size={12} fill="#fff" color="#fff" />
        </div>
      )}
    </div>
  );
}

/* ─── Folder card ──────────────────────────────────────────────────────── */
function FolderCard({ f, selected, onSelect, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onSelect(f.id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: 16, padding: 12, cursor: 'pointer',
        border: selected ? '2px solid #2563EB' : '1px solid rgba(15,23,42,.08)',
        boxShadow: selected ? '0 0 0 4px rgba(37,99,235,.1)' : hov ? '0 6px 20px rgba(15,23,42,.08)' : '0 1px 2px rgba(15,23,42,.04)',
        transition: 'box-shadow .15s, border-color .15s',
      }}
    >
      <FolderThumb pinned={f.pinned} accent={accent} />
      <div style={{ padding: '14px 6px 6px' }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{f.name}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(15,23,42,.45)', marginTop: 2 }}>{f.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Geist Mono', monospace", color: 'rgba(15,23,42,.6)', background: '#eef1f5', borderRadius: 6, padding: '3px 8px' }}>.docx</span>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Geist Mono', monospace", color: '#16A34A', background: 'rgba(34,197,94,.12)', borderRadius: 6, padding: '3px 8px' }}>.xlsx × {f.sheets.length}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'rgba(15,23,42,.4)' }}>{f.uses.toLocaleString('pt-BR')} usos</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Right detail panel ───────────────────────────────────────────────── */
const Overline = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(15,23,42,.4)' }}>{children}</div>
);

function DetailPanel({ f, onGenerate }) {
  return (
    <div className="rise" style={{ width: 360, flexShrink: 0, borderLeft: '1px solid rgba(15,23,42,.08)', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <Overline>Pasta selecionada</Overline>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 19, letterSpacing: '-0.02em', marginTop: 8 }}>{f.name}</h3>
          <div style={{ fontSize: 13, color: 'rgba(15,23,42,.5)', marginTop: 3 }}>{f.desc}</div>
        </div>

        {/* Template Word */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Overline>Template Word</Overline>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, border: '1px solid rgba(15,23,42,.1)', background: '#fff' }}>
            <FileBadge kind="docx" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.template.file}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.45)', marginTop: 2 }}>{f.template.vars} variáveis · {f.template.uses.toLocaleString('pt-BR')} usos</div>
            </div>
            <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(15,23,42,.1)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.55)', cursor: 'pointer', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f3f6'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <Pencil size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgba(15,23,42,.4)' }}>
            <RefreshCw size={12} /> atualizado {f.template.updated}
          </div>
        </div>

        {/* Planilhas Excel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Overline>Planilhas Excel</Overline>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#2563EB', background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 999, padding: '4px 11px', cursor: 'pointer' }}>
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {f.sheets.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.04)' }}>
              <FileBadge kind="xlsx" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.45)', marginTop: 2 }}>{s.rows} linhas · {s.updated}</div>
              </div>
              <button style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.4)', cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <MoreHorizontal size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Generate CTA */}
      <div style={{ padding: 20, borderTop: '1px solid rgba(15,23,42,.08)' }}>
        <button onClick={() => onGenerate(f)} style={{ width: '100%', height: 50, borderRadius: 14, background: '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 22px rgba(37,99,235,.3)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
          <Zap size={18} strokeWidth={2.2} /> Gerar com esta pasta
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
const ACCENTS = ['#2563EB', '#3B82F6', '#93C5FD', '#60A5FA', '#3B82F6', '#93C5FD'];

export default function Biblioteca() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('todos');
  const [search, setSearch] = useState('');

  /* Dados reais, vindos de GET /api/folders. */
  const { data: pastas, loading, error } = useApi('/api/folders', []);
  const todas = Array.isArray(pastas) ? pastas : [];

  const folders = todas.filter(f => {
    if (tab === 'pinned' && !f.pinned) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const ordered = [...folders].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const current = todas.find(f => f.id === selected) || todas[0] || null;

  const handleGenerate = (f) => { window._gtSelectedTemplate = f.id; navigate('/generate'); };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* ── Header ── */}
        <Topbar
          crumb="BIBLIOTECA"
          title="Biblioteca"
          subtitle="Pastas com templates Word e planilhas Excel"
          actions={
            <>
              <button style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 11, background: '#fff', border: '1px solid rgba(15,23,42,.12)', color: 'rgba(15,23,42,.72)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f7f8fa'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <Upload size={15} /> Importar
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', borderRadius: 11, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.28)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
                <Plus size={16} strokeWidth={2.4} /> Nova pasta
              </button>
            </>
          }
        />

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 360, height: 40, padding: '0 14px', borderRadius: 11, background: '#fff', border: '1px solid rgba(15,23,42,.1)' }}>
                <Search size={15} style={{ color: 'rgba(15,23,42,.35)', flexShrink: 0 }} />
                <input placeholder="Buscar pasta…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: '#0f172a', fontSize: 13.5, outline: 'none' }} />
              </div>
              <span style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 3, padding: 4, borderRadius: 12, background: '#eef1f5', border: '1px solid rgba(15,23,42,.06)' }}>
                {[['todos', 'Todos'], ['pinned', 'Pinned'], ['recentes', 'Recentes']].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} style={{ height: 30, padding: '0 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: tab === k ? '#2563EB' : 'transparent', color: tab === k ? '#fff' : 'rgba(15,23,42,.55)', transition: 'all .12s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(15,23,42,.4)', marginBottom: 14 }}>
              <Star size={12} fill="currentColor" /> Fixadas
            </div>

            {loading ? (
              <div style={{ padding: '70px 24px', display: 'flex', justifyContent: 'center' }}><Spinner size={26} /></div>
            ) : error ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#DC2626', fontWeight: 500, marginBottom: 6 }}>Não foi possível carregar a biblioteca.</div>
                <div style={{ fontSize: 12.5, color: 'rgba(15,23,42,.5)' }}>{error}</div>
              </div>
            ) : ordered.length === 0 ? (
              <div style={{ padding: '70px 24px', textAlign: 'center', color: 'rgba(15,23,42,.45)', fontSize: 14 }}>
                {todas.length === 0
                  ? 'Nenhuma pasta ainda. Suba um template na tela Gerar Documentos para começar.'
                  : 'Nenhuma pasta corresponde à busca.'}
              </div>
            ) : (
              <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {ordered.map((f, i) => (
                  <FolderCard key={f.id} f={f} selected={selected === f.id} onSelect={setSelected} accent={ACCENTS[i % ACCENTS.length]} />
                ))}
              </div>
            )}
          </div>

          {/* Detail */}
          {current && <DetailPanel f={current} onGenerate={handleGenerate} />}
        </div>
      </div>
    </AppLayout>
  );
}
