import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FileText, Table2, Clock, Download, Folder, ArrowRight, BookOpen } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useLayout } from '../contexts/LayoutContext';
import Topbar from '../components/layout/Topbar';
import { useAccount } from '../contexts/AccountContext';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';

/** Monta os quatro cartões a partir de GET /api/dashboard. */
function montarStats(p) {
  if (!p) return [];
  const nf = (n) => Number(n || 0).toLocaleString('pt-BR');

  let subDocs = 'desde o início';
  if (p.variacaoPercentual !== null && p.variacaoPercentual !== undefined) {
    const s = p.variacaoPercentual >= 0 ? '+' : '';
    subDocs = `${s}${p.variacaoPercentual}% vs. mês passado`;
  } else if (p.documentosEsteMes) {
    subDocs = `${nf(p.documentosEsteMes)} este mês`;
  }

  /* Estimativa declarada: 4 min por documento feito à mão. */
  const horas = Math.round((p.documentosGerados * 4) / 60);

  return [
    { Icon: FileText, label: 'Documentos gerados',   value: nf(p.documentosGerados), sub: subDocs, good: (p.variacaoPercentual ?? 0) >= 0 && p.documentosGerados > 0 },
    { Icon: FileText, label: 'Templates ativos',     value: nf(p.templatesAtivos),   sub: p.lotes ? `em ${nf(p.lotes)} lotes` : 'nenhum lote ainda' },
    { Icon: Table2,   label: 'Planilhas conectadas', value: nf(p.planilhas),         sub: `${nf(p.linhasTotais)} linhas no total` },
    { Icon: Clock,    label: 'Tempo economizado',    value: `${nf(horas)}h`,         sub: 'estimando 4 min por documento', good: horas > 0 },
  ];
}

/** Últimos lotes de GET /api/generations viram a lista de atividade. */
function montarAtividade(lotes) {
  if (!Array.isArray(lotes)) return [];
  return lotes.slice(0, 4).map((g) => ({
    type: 'folder',
    name: g.template,
    folder: g.status === 'failed' ? `${g.dataFile} · falhou` : g.dataFile,
    count: g.docs || null,
    time: `${g.date} ${g.time}`,
    id: g.id,
  }));
}

function StatCard({ Icon, label, value, sub, good }) {
  return (
    <div className="hoverable" style={{ background: '#fff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 16, padding: '20px 22px', flex: '1 1 200px', minWidth: 190, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: '#f1f3f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.5)', marginBottom: 16 }}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 13, color: 'rgba(15,23,42,.5)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 34, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: good ? '#16A34A' : 'rgba(15,23,42,.4)', marginTop: 8, fontWeight: good ? 500 : 400 }}>{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { isMobile } = useLayout();
  const navigate = useNavigate();
  const { conta, consumo, primeiroNome } = useAccount();
  const { data: painel, loading: carregandoPainel } = useApi('/api/dashboard');
  const { data: lotes } = useApi('/api/generations?limit=4', []);

  const STATS = montarStats(painel);
  const ACTIVITY = montarAtividade(lotes);

  const [guiaAberto, setGuiaAberto] = useState(false);

  const used = consumo.generationsUsed ?? 0;
  const limit = consumo.generationsLimit;              // null = ilimitado
  const usePct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = limit ? Math.max(0, limit - used) : null;

  /* Média e projeção do ciclo, a partir do dia do mês — antes eram fixos. */
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const docsMes = painel?.documentosEsteMes ?? 0;
  const mediaDia = Math.round(docsMes / diaDoMes);
  const projecao = limit ? Math.round((used / diaDoMes) * diasNoMes) : null;

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* ── Header ── */}
        <Topbar crumb="HOME" title="Dashboard" subtitle={primeiroNome ? `Bem-vindo de volta, ${primeiroNome}` : 'Bem-vindo de volta'} />

        {/* ── Body ── */}
        <div className="stagger" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Hero banner */}
          <div style={{ position: 'relative', flexShrink: 0, borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(120deg,#1D4ED8 0%,#2563EB 55%,#3B82F6 100%)', padding: '32px 36px', display: 'flex', flexWrap: 'wrap', gap: 32, color: '#fff' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 30% 0%,#000 40%,transparent 80%)', pointerEvents: 'none' }} />

            {/* CTA */}
            <div style={{ flex: 1, minWidth: isMobile ? 0 : 320, position: 'relative', zIndex: 1 }}>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: 'rgba(255,255,255,.65)', letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Ação principal</div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 38, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 14 }}>Gerar uma nova leva<br />de documentos</h2>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,.8)', lineHeight: 1.55, maxWidth: 480, marginBottom: 26 }}>
                Suba um template Word e uma planilha Excel. O ndocs gera todos os arquivos preenchidos em segundos.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => navigate('/generate')} style={{ display: 'flex', alignItems: 'center', gap: 9, height: 48, padding: '0 24px', borderRadius: 12, background: '#fff', color: '#1D4ED8', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,0,0,.18)' }}>
                  <Zap size={18} strokeWidth={2.4} /> Começar geração
                </button>
                <button onClick={() => setGuiaAberto(true)} style={{ display: 'flex', alignItems: 'center', gap: 9, height: 48, padding: '0 22px', borderRadius: 12, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}>
                  <BookOpen size={17} /> Ver guia rápido
                </button>
              </div>
            </div>

            {/* Plan summary */}
            <div style={{ width: isMobile ? '100%' : 320, flexShrink: 0, position: 'relative', zIndex: 1, paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: 999, padding: '3px 12px', fontSize: 12.5, fontWeight: 600 }}>Plano {conta.plano}</span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>renova em 18 dias</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 6 }}>Gerações este mês</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 40, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 14 }}>
                {used} <span style={{ fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,.55)' }}>/ {limit ?? '∞'}</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: '100%', width: `${usePct}%`, background: '#fff', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[['Restantes', remaining ?? '∞'], ['Média/dia', mediaDia], ['Projeção', projecao ?? '∞']].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, flexShrink: 0 }}>
            {carregandoPainel
              ? <div style={{ flex: 1, padding: '32px 0', display: 'flex', justifyContent: 'center' }}><Spinner size={24} /></div>
              : STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 18, padding: '22px 24px', boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: '-0.02em' }}>Atividade recente</h3>
                <p style={{ fontSize: 12.5, color: 'rgba(15,23,42,.45)', marginTop: 2 }}>Últimas gerações do workspace</p>
              </div>
              <button onClick={() => navigate('/history')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
                Ver tudo <ArrowRight size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ACTIVITY.length === 0 && (
                <div style={{ padding: '34px 10px', textAlign: 'center', fontSize: 13, color: 'rgba(15,23,42,.45)' }}>
                  Nenhum lote gerado ainda.
                </div>
              )}
              {ACTIVITY.map((a, i) => (
                <div key={a.id} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 10px', borderTop: i === 0 ? 'none' : '1px solid rgba(15,23,42,.06)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f1f3f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.5)', flexShrink: 0 }}>
                    {a.type === 'folder' ? <Folder size={17} strokeWidth={1.8} /> : <FileText size={17} strokeWidth={1.8} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(15,23,42,.45)', marginTop: 3 }}>{a.folder}</div>
                  </div>
                  {a.count && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2563EB', background: 'rgba(37,99,235,.1)', borderRadius: 999, padding: '3px 11px', flexShrink: 0 }}>{a.count} arquivos</span>
                  )}
                  <span style={{ fontSize: 12.5, color: 'rgba(15,23,42,.4)', minWidth: 78, textAlign: 'right', flexShrink: 0 }}>{a.time}</span>
                  <button onClick={() => navigate('/history')} title="Ver no histórico" style={{ width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,23,42,.45)', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f3f6'; e.currentTarget.style.color = '#2563EB'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(15,23,42,.45)'; }}>
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guia rápido — o botão prometia um guia, então aqui está ele. */}
      <Modal
        open={guiaAberto}
        onClose={() => setGuiaAberto(false)}
        title="Como gerar documentos"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setGuiaAberto(false)}
              style={{ height: 38, padding: '0 16px', borderRadius: 999, background: '#fff', border: '1px solid rgba(15,23,42,.12)', color: 'rgba(15,23,42,.7)', fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>
              Fechar
            </button>
            <button onClick={() => { setGuiaAberto(false); navigate('/generate'); }}
              style={{ height: 38, padding: '0 18px', borderRadius: 999, background: '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              Começar agora
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            ['1', 'Prepare o modelo no Word',
             'Escreva o documento normalmente e, onde a informação muda de pessoa para pessoa, escreva o nome do campo entre chaves duplas: {{nome}}, {{cpf}}, {{valor}}. Salve como .docx.'],
            ['2', 'Monte a planilha no Excel',
             'A primeira linha são os títulos das colunas, e eles precisam ter os mesmos nomes dos campos do modelo. Cada linha seguinte vira um documento. Salve como .xlsx.'],
            ['3', 'Suba os dois e gere',
             'Em Gerar Documentos, envie o modelo e a planilha. O sistema mostra quais campos casaram e avisa se algum ficou sem par. Ao gerar, você baixa um .zip com um arquivo por linha.'],
          ].map(([n, titulo, texto]) => (
            <div key={n} style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {n}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{titulo}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(15,23,42,.6)', margin: 0 }}>{texto}</p>
              </div>
            </div>
          ))}
          <div style={{ background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.14)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'rgba(15,23,42,.65)', lineHeight: 1.55 }}>
            Salvando o modelo e a planilha numa pasta da Biblioteca, você gera
            de novo depois sem precisar subir os arquivos outra vez.
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
