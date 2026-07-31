import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Plus, Zap, Star, Pencil, MoreHorizontal, RefreshCw, ChevronLeft } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useLayout } from '../contexts/LayoutContext';
import Topbar from '../components/layout/Topbar';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/ui/Spinner';
import { GradeEsqueleto } from '../components/ui/Esqueleto';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';

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

function DetailPanel({ f, onGenerate, onRenomear, onAddTemplate, onAddPlanilha, onApagarPlanilha, ocupado, isMobile, onVoltar }) {
  /* Só dá para gerar quando a pasta tem os dois: modelo e dados. */
  const podeGerar = Boolean(f.templateId) && f.sheets.length > 0;
  return (
    <div className="rise" style={{ width: isMobile ? '100%' : 360, flexShrink: 0, borderLeft: isMobile ? 'none' : '1px solid rgba(15,23,42,.08)', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          {isMobile && (
            <button
              onClick={onVoltar}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13.5, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <ChevronLeft size={16} /> Todas as pastas
            </button>
          )}
          <Overline>Pasta selecionada</Overline>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 19, letterSpacing: '-0.02em', marginTop: 8 }}>{f.name}</h3>
          <div style={{ fontSize: 13, color: 'rgba(15,23,42,.5)', marginTop: 3 }}>{f.desc}</div>
        </div>

        {/* Template Word */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Overline>Template Word</Overline>
            <button
              onClick={() => onAddTemplate(f)}
              disabled={ocupado === 'template'}
              title={f.templateId ? 'Substituir o template desta pasta' : 'Enviar um .docx para esta pasta'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#2563EB', background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 999, padding: '5px 11px', cursor: 'pointer' }}
            >
              <Plus size={13} /> {ocupado === 'template' ? 'Enviando…' : (f.templateId ? 'Trocar' : 'Enviar template')}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, border: '1px solid rgba(15,23,42,.1)', background: '#fff' }}>
            <FileBadge kind="docx" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.template.file}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.45)', marginTop: 2 }}>{f.template.vars} variáveis · {f.template.uses.toLocaleString('pt-BR')} usos</div>
            </div>
            <button onClick={() => onRenomear(f)} title="Renomear a pasta" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(15,23,42,.1)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.55)', cursor: 'pointer', flexShrink: 0 }}
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
            <button onClick={() => onAddPlanilha(f)} disabled={ocupado === 'upload'} title="Enviar uma planilha .xlsx para esta pasta" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#2563EB', background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 999, padding: '4px 11px', cursor: 'pointer' }}>
              <Plus size={13} /> {ocupado === 'upload' ? 'Enviando…' : 'Adicionar'}
            </button>
          </div>
          {f.sheets.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.04)' }}>
              <FileBadge kind="xlsx" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.45)', marginTop: 2 }}>{s.rows} linhas · {s.updated}</div>
              </div>
              <button onClick={() => onApagarPlanilha(s)} title={`Remover ${s.name}`} style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.4)', cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <MoreHorizontal size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Generate CTA */}
      <div style={{ padding: 20, borderTop: '1px solid rgba(15,23,42,.08)' }}>
        <button
          onClick={() => onGenerate(f)}
          disabled={!podeGerar || ocupado === 'gerar'}
          title={podeGerar
            ? 'Gera os documentos a partir do template e da planilha desta pasta'
            : (!f.templateId
                ? 'Esta pasta ainda não tem um template .docx'
                : 'Esta pasta ainda não tem uma planilha .xlsx')}
          style={{ width: '100%', height: 50, borderRadius: 14, background: podeGerar ? '#2563EB' : 'rgba(15,23,42,.14)', color: podeGerar ? '#fff' : 'rgba(15,23,42,.45)', cursor: podeGerar ? 'pointer' : 'not-allowed', border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: podeGerar ? '0 8px 22px rgba(37,99,235,.3)' : 'none' }}
          onMouseEnter={e => { if (podeGerar) e.currentTarget.style.background = '#1D4ED8'; }} onMouseLeave={e => { if (podeGerar) e.currentTarget.style.background = '#2563EB'; }}>
          <Zap size={18} strokeWidth={2.2} /> {ocupado === 'gerar' ? 'Gerando…' : 'Gerar com esta pasta'}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
const ACCENTS = ['#2563EB', '#3B82F6', '#93C5FD', '#60A5FA', '#3B82F6', '#93C5FD'];

export default function Biblioteca() {
  const { isMobile, isTablet } = useLayout();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('todos');
  const [search, setSearch] = useState('');

  /* Dados reais, vindos de GET /api/folders. */
  const { data: pastas, loading, error, recarregar } = useApi('/api/folders', []);
  const { toast } = useToast();

  /* Formulário de nova pasta. */
  const [novaAberta, setNovaAberta] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const [criando, setCriando] = useState(false);

  const criarPasta = async () => {
    if (!novoNome.trim()) { toast.error('Dê um nome à pasta.'); return; }
    setCriando(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim(), descricao: novaDesc.trim() }),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível criar a pasta.');
      toast.success(`Pasta "${novoNome.trim()}" criada.`);
      setNovaAberta(false);
      setNovoNome(''); setNovaDesc('');
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCriando(false);
    }
  };
  const todas = Array.isArray(pastas) ? pastas : [];

  const folders = todas.filter(f => {
    if (tab === 'pinned' && !f.pinned) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const ordered = [...folders].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  /* No desktop, a primeira pasta já vem aberta ao lado da lista.
     No celular isso empurraria a lista para fora da tela, então o detalhe
     só aparece depois de tocar numa pasta — e com um jeito de voltar. */
  const current = isMobile
    ? (todas.find(f => f.id === selected) || null)
    : (todas.find(f => f.id === selected) || todas[0] || null);

  /**
   * Gera direto da pasta: usa o template e a primeira planilha guardados e
   * baixa o .zip. Antes isto só gravava um id numa variável global que
   * ninguém lia, e levava para uma tela vazia.
   */
  const handleGenerate = async (f) => {
    if (!f.templateId || !f.sheets.length) {
      toast.warning(!f.templateId
        ? 'Esta pasta ainda não tem um template. Envie um .docx pela tela Gerar Documentos.'
        : 'Esta pasta ainda não tem planilha. Use o botão Adicionar.');
      return;
    }
    setOcupado('gerar');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId: f.templateId, sheetId: f.sheets[0].id }),
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
      const n = res.headers.get('X-Doc-Count');
      toast.success(n ? `${n} documentos gerados.` : 'Documentos gerados.');
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };

  /* ── Ações da pasta ─────────────────────────────────────────────────── */
  const [ocupado, setOcupado] = useState(null);
  const [renomeando, setRenomeando] = useState(null);   // pasta em edição
  const [nomeEdit, setNomeEdit] = useState('');
  const [descEdit, setDescEdit] = useState('');

  const abrirRenomear = (f) => {
    setRenomeando(f);
    setNomeEdit(f.name);
    setDescEdit(f.desc || '');
  };

  const salvarRenomear = async () => {
    if (!nomeEdit.trim()) { toast.error('A pasta precisa de um nome.'); return; }
    setOcupado('renomear');
    try {
      const res = await fetch(`/api/folders?id=${renomeando.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nomeEdit.trim(), descricao: descEdit.trim() }),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível renomear.');
      toast.success('Pasta atualizada.');
      setRenomeando(null);
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };

  /** Envia um .docx para a pasta. É isto que libera o "Gerar com esta pasta". */
  const enviarTemplate = (f) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx';
    input.onchange = async () => {
      const arquivo = input.files?.[0];
      if (!arquivo) return;
      setOcupado('template');
      try {
        const form = new FormData();
        form.append('template', arquivo);
        form.append('folderId', f.id);
        const res = await fetch('/api/templates', { method: 'POST', body: form });
        const corpo = await res.json().catch(() => null);
        if (!res.ok) throw new Error(corpo?.error || 'Não foi possível enviar o template.');
        const n = corpo.variables?.length ?? 0;
        toast[n ? 'success' : 'warning'](n
          ? `${arquivo.name} — ${n} ${n === 1 ? 'campo detectado' : 'campos detectados'}.`
          : `${arquivo.name} enviado, mas nenhum campo {{...}} foi encontrado.`);
        recarregar();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setOcupado(null);
      }
    };
    input.click();
  };

  /** Abre o seletor de arquivo e envia a planilha para dentro da pasta. */
  const enviarPlanilha = (f) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async () => {
      const arquivo = input.files?.[0];
      if (!arquivo) return;
      setOcupado('upload');
      try {
        const form = new FormData();
        form.append('data', arquivo);
        form.append('folderId', f.id);
        const res = await fetch('/api/sheets', { method: 'POST', body: form });
        const corpo = await res.json().catch(() => null);
        if (!res.ok) throw new Error(corpo?.error || 'Não foi possível enviar a planilha.');
        toast.success(`${arquivo.name} adicionada — ${corpo.row_count} linhas.`);
        recarregar();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setOcupado(null);
      }
    };
    input.click();
  };

  const apagarPlanilha = async (s) => {
    if (!s.id) { toast.warning('Esta planilha não pode ser removida daqui.'); return; }
    if (!window.confirm(`Remover a planilha "${s.name}"? O histórico das gerações continua.`)) return;
    setOcupado('apagar');
    try {
      const res = await fetch(`/api/sheets?id=${s.id}`, { method: 'DELETE' });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível remover.');
      toast.success('Planilha removida.');
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };

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
              <button onClick={() => navigate('/generate')} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 11, background: '#fff', border: '1px solid rgba(15,23,42,.12)', color: 'rgba(15,23,42,.72)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f7f8fa'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <Upload size={15} /> Importar
              </button>
              <button onClick={() => setNovaAberta(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', borderRadius: 11, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.28)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
                <Plus size={16} strokeWidth={2.4} /> Nova pasta
              </button>
            </>
          }
        />

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden' }}>
          {/* Grid */}
          <div className="rolagem-fina" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '24px 28px', display: isMobile && current ? 'none' : 'block' }}>
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
              <GradeEsqueleto quantidade={6} />
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
          {current && (
            <DetailPanel
              f={current}
              onGenerate={handleGenerate}
              onRenomear={abrirRenomear}
              onAddTemplate={enviarTemplate}
              onAddPlanilha={enviarPlanilha}
              onApagarPlanilha={apagarPlanilha}
              ocupado={ocupado}
              isMobile={isMobile}
              onVoltar={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {/* Nova pasta */}
      <Modal
        open={novaAberta}
        onClose={() => setNovaAberta(false)}
        title="Nova pasta"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setNovaAberta(false)}
              style={{ height: 38, padding: '0 16px', borderRadius: 999, background: '#fff', border: '1px solid rgba(15,23,42,.12)', color: 'rgba(15,23,42,.7)', fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={criarPasta} disabled={criando}
              style={{ height: 38, padding: '0 18px', borderRadius: 999, background: criando ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: criando ? 'not-allowed' : 'pointer' }}>
              {criando ? 'Criando…' : 'Criar pasta'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12.5, color: 'rgba(15,23,42,.6)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Nome da pasta
            </label>
            <input
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarPasta(); }}
              placeholder="Contratos de prestação"
              style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, border: '1px solid rgba(15,23,42,.14)', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12.5, color: 'rgba(15,23,42,.6)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Descrição <span style={{ fontWeight: 400, color: 'rgba(15,23,42,.4)' }}>(opcional)</span>
            </label>
            <input
              value={novaDesc}
              onChange={e => setNovaDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarPasta(); }}
              placeholder="Modelos padrão de serviço"
              style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, border: '1px solid rgba(15,23,42,.14)', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff' }}
            />
          </div>
        </div>
      </Modal>

      {/* Renomear pasta */}
      <Modal
        open={Boolean(renomeando)}
        onClose={() => setRenomeando(null)}
        title="Renomear pasta"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setRenomeando(null)}
              style={{ height: 38, padding: '0 16px', borderRadius: 999, background: '#fff', border: '1px solid rgba(15,23,42,.12)', color: 'rgba(15,23,42,.7)', fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={salvarRenomear} disabled={ocupado === 'renomear'}
              style={{ height: 38, padding: '0 18px', borderRadius: 999, background: ocupado === 'renomear' ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: ocupado === 'renomear' ? 'not-allowed' : 'pointer' }}>
              {ocupado === 'renomear' ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12.5, color: 'rgba(15,23,42,.6)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Nome</label>
            <input autoFocus value={nomeEdit} onChange={e => setNomeEdit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvarRenomear(); }}
              style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, border: '1px solid rgba(15,23,42,.14)', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 12.5, color: 'rgba(15,23,42,.6)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Descrição</label>
            <input value={descEdit} onChange={e => setDescEdit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvarRenomear(); }}
              style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, border: '1px solid rgba(15,23,42,.14)', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff' }} />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
