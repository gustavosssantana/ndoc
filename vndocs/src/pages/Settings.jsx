import { useState, useEffect } from 'react';
import { User, Shield, Camera, Check, LogOut, Monitor, Users, Copy, X, LogIn } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useLayout } from '../contexts/LayoutContext';
import { useAccount } from '../contexts/AccountContext';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { Rotulo, Cartao, Secao, Acao } from '../components/ui/Primitivas';
import { Linha } from '../components/ui/Esqueleto';

const ABAS = [
  { chave: 'perfil', icone: User, rotulo: 'Perfil' },
  { chave: 'equipe', icone: Users, rotulo: 'Equipe' },
  { chave: 'seguranca', icone: Shield, rotulo: 'Segurança' },
];

/* ── Retrato ──────────────────────────────────────────────────────────── */

function Retrato({ nome, src, tamanho = 72, aoTrocar, enviando }) {
  const iniciais = (nome || '')
    .split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <button
      onClick={aoTrocar}
      disabled={enviando}
      title="Trocar a foto"
      className="icone"
      style={{
        position: 'relative', width: tamanho, height: tamanho, borderRadius: '50%',
        flexShrink: 0, overflow: 'hidden', border: 'none', padding: 0,
        cursor: enviando ? 'wait' : 'pointer',
        background: src ? 'var(--n2)' : 'linear-gradient(150deg, var(--n8), var(--n9))',
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', color: 'var(--n0)',
          fontFamily: 'var(--fonte-titulo)', fontWeight: 600, fontSize: tamanho * 0.32,
          letterSpacing: '-0.02em',
        }}>
          {iniciais || '—'}
        </span>
      )}

      {/* A intenção só aparece ao passar o mouse — no celular, sempre. */}
      <span
        className="retrato-veu"
        style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(22,24,29,.55)', color: 'var(--n0)',
          opacity: enviando ? 1 : 0, transition: 'opacity .18s var(--curva)',
        }}
      >
        <Camera size={tamanho * 0.26} strokeWidth={1.8} />
      </span>
    </button>
  );
}

/* ── Campo de formulário ──────────────────────────────────────────────── */

function CampoTexto({ rotulo, valor, aoMudar, tipo = 'text', apoio, somenteLeitura, aoEnviar }) {
  const [foco, setFoco] = useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 'var(--t-mini)', fontWeight: 550, color: 'var(--n7)' }}>
        {rotulo}
      </span>
      <input
        type={tipo}
        value={valor}
        readOnly={somenteLeitura}
        onChange={(e) => aoMudar?.(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') aoEnviar?.(); }}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        style={{
          height: 44, padding: '0 14px', borderRadius: 'var(--r-p)',
          background: somenteLeitura ? 'var(--n2)' : 'var(--n0)',
          color: somenteLeitura ? 'var(--n6)' : 'var(--n9)',
          border: `1px solid ${foco ? 'var(--azul)' : 'var(--n4)'}`,
          boxShadow: foco ? '0 0 0 3px var(--azul-veu)' : 'none',
          fontFamily: 'inherit', fontSize: 'var(--t-base)', outline: 'none',
          transition: 'border-color .16s var(--curva), box-shadow .16s var(--curva)',
          cursor: somenteLeitura ? 'default' : 'text',
        }}
      />
      {apoio && (
        <span style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', lineHeight: 1.5 }}>
          {apoio}
        </span>
      )}
    </label>
  );
}

/* ── Perfil ───────────────────────────────────────────────────────────── */

function AbaPerfil({ isMobile }) {
  const { conta, salvar, recarregar } = useAccount();
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  useEffect(() => {
    setNome(conta.nome || '');
    setEmpresa(conta.empresa || '');
  }, [conta.nome, conta.empresa]);

  const mudou = nome !== (conta.nome || '') || empresa !== (conta.empresa || '');

  const gravar = async () => {
    if (!nome.trim()) { toast.error('O nome não pode ficar vazio.'); return; }
    setSalvando(true);
    const r = await salvar({ nome, empresa });
    setSalvando(false);
    if (r.ok) toast.success('Perfil atualizado.');
    else toast.error(r.error);
  };

  const trocarFoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async () => {
      const img = input.files?.[0];
      if (!img) return;
      setEnviandoFoto(true);
      try {
        const form = new FormData();
        form.append('avatar', img);
        const res = await fetch('/api/account', { method: 'POST', body: form });
        const corpo = await res.json().catch(() => null);
        if (!res.ok) throw new Error(corpo?.error || 'Não foi possível enviar a foto.');
        await recarregar();
        toast.success('Foto atualizada.');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setEnviandoFoto(false);
      }
    };
    input.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34, maxWidth: 620 }}>
      <Secao titulo="Perfil" apoio="Como seu nome aparece nos documentos e para quem divide a conta com você.">
        <Cartao style={{
          padding: isMobile ? 18 : 22,
          display: 'flex', alignItems: 'center', gap: 18,
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <Retrato
            nome={conta.nome} src={conta.avatar}
            tamanho={isMobile ? 84 : 72}
            aoTrocar={trocarFoto} enviando={enviandoFoto}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
              fontSize: 'var(--t-sub)', letterSpacing: '-0.02em', color: 'var(--n9)',
            }}>
              {conta.nome || 'Sem nome'}
            </div>
            <div style={{ fontSize: 'var(--t-base)', color: 'var(--n6)', marginTop: 2 }}>
              {conta.email}
            </div>
            <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 8 }}>
              {enviandoFoto ? 'Enviando a foto…' : 'Toque no retrato para trocar a foto'}
            </div>
          </div>
        </Cartao>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 16,
        }}>
          <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} aoEnviar={gravar} />
          <CampoTexto rotulo="Empresa" valor={empresa} aoMudar={setEmpresa} aoEnviar={gravar} />
        </div>

        <CampoTexto
          rotulo="E-mail"
          valor={conta.email}
          somenteLeitura
          apoio="O e-mail identifica a conta e ainda não pode ser trocado por aqui."
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Acao aoClicar={gravar} desabilitado={!mudou} carregando={salvando}
            largura={isMobile ? '100%' : undefined}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Acao>
          {mudou && !salvando && (
            <Acao tipo="fantasma" aoClicar={() => { setNome(conta.nome || ''); setEmpresa(conta.empresa || ''); }}>
              Descartar
            </Acao>
          )}
          {!mudou && !salvando && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 'var(--t-mini)', color: 'var(--n6)',
            }}>
              <Check size={14} /> Tudo salvo
            </span>
          )}
        </div>
      </Secao>
    </div>
  );
}

/* ── Segurança ────────────────────────────────────────────────────────── */

function AbaSeguranca({ isMobile }) {
  const { toast } = useToast();
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirma: '' });
  const [trocando, setTrocando] = useState(false);
  const { data: dados, loading, recarregar } = useApi('/api/auth/sessions');
  const [encerrando, setEncerrando] = useState(false);

  const sessoes = dados?.sessoes ?? [];
  const outras = sessoes.filter((s) => !s.atual).length;

  const trocarSenha = async () => {
    if (!senhas.atual || !senhas.nova) { toast.error('Preencha a senha atual e a nova.'); return; }
    if (senhas.nova !== senhas.confirma) { toast.error('A confirmação não confere.'); return; }
    setTrocando(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ senhaAtual: senhas.atual, senhaNova: senhas.nova }),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível trocar a senha.');
      setSenhas({ atual: '', nova: '', confirma: '' });
      toast.success('Senha alterada. Os outros aparelhos foram desconectados.');
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTrocando(false);
    }
  };

  const encerrarOutras = async () => {
    setEncerrando(true);
    try {
      const res = await fetch('/api/auth/sessions', { method: 'DELETE' });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível encerrar.');
      toast.success(corpo.encerradas === 1
        ? '1 aparelho desconectado.'
        : `${corpo.encerradas} aparelhos desconectados.`);
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEncerrando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 620 }}>
      <Secao titulo="Senha" apoio="Trocar a senha desconecta todos os outros aparelhos.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CampoTexto rotulo="Senha atual" tipo="password"
            valor={senhas.atual} aoMudar={(v) => setSenhas((s) => ({ ...s, atual: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <CampoTexto rotulo="Nova senha" tipo="password"
              valor={senhas.nova} aoMudar={(v) => setSenhas((s) => ({ ...s, nova: v }))}
              apoio="Mínimo 8 caracteres, com letra e número." />
            <CampoTexto rotulo="Repita a nova senha" tipo="password"
              valor={senhas.confirma} aoMudar={(v) => setSenhas((s) => ({ ...s, confirma: v }))}
              aoEnviar={trocarSenha} />
          </div>
          <div>
            <Acao aoClicar={trocarSenha} carregando={trocando} largura={isMobile ? '100%' : undefined}>
              {trocando ? 'Trocando…' : 'Trocar senha'}
            </Acao>
          </div>
        </div>
      </Secao>

      <Secao
        titulo="Aparelhos conectados"
        apoio="Cada vez que você entra, uma sessão é aberta. Encerre as que não reconhecer."
      >
        <Cartao style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Linha largura="45%" altura={12} />
              <Linha largura="30%" altura={10} />
            </div>
          ) : sessoes.length === 0 ? (
            <div style={{ padding: 20, fontSize: 'var(--t-base)', color: 'var(--n6)' }}>
              Nenhuma sessão ativa encontrada.
            </div>
          ) : sessoes.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: isMobile ? '14px 16px' : '16px 18px',
              borderTop: i === 0 ? 'none' : 'var(--fio)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: s.atual ? 'var(--azul-veu)' : 'var(--n2)',
                color: s.atual ? 'var(--azul)' : 'var(--n6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Monitor size={17} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--t-base)', fontWeight: 550, color: 'var(--n9)' }}>
                  {s.aparelho}
                  {s.atual && (
                    <span style={{
                      marginLeft: 8, fontSize: 'var(--t-micro)', fontWeight: 500,
                      color: 'var(--azul)', background: 'var(--azul-veu)',
                      padding: '2px 8px', borderRadius: 'var(--r-total)',
                    }}>
                      este aparelho
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 3 }}>
                  Visto {new Date(s.visto).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        </Cartao>

        {outras > 0 && (
          <div>
            <Acao tipo="quieta" aoClicar={encerrarOutras} carregando={encerrando}
              largura={isMobile ? '100%' : undefined}>
              <LogOut size={15} />
              {encerrando ? 'Encerrando…' : `Desconectar ${outras === 1 ? 'o outro aparelho' : `os outros ${outras} aparelhos`}`}
            </Acao>
          </div>
        )}
      </Secao>
    </div>
  );
}

/* ── Equipe ───────────────────────────────────────────────────────────── */

function AbaEquipe({ isMobile }) {
  const { toast } = useToast();
  const { data, loading, recarregar } = useApi('/api/team');
  const [email, setEmail] = useState('');
  const [convidando, setConvidando] = useState(false);

  const org = data?.org;
  const pessoas = data?.pessoas ?? [];
  const convites = data?.convites ?? [];
  const dono = data?.voceEhDono;
  const limite = data?.limiteUsuarios;
  const ocupadas = pessoas.length + convites.length;

  const convidar = async () => {
    setConvidando(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível convidar.');
      setEmail('');
      toast.success(`Convite criado: ${corpo.codigo}`);
      recarregar();
    } catch (e) { toast.error(e.message); } finally { setConvidando(false); }
  };

  const cancelar = async (codigo) => {
    try {
      const res = await fetch(`/api/team?codigo=${codigo}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falhou.');
      toast.success('Convite cancelado.');
      recarregar();
    } catch (e) { toast.error(e.message); }
  };

  /* ── Entrar em outra empresa com um código ─────────────────────────── */
  const [codigo, setCodigo] = useState('');
  const [conferindo, setConferindo] = useState(false);
  const [achada, setAchada] = useState(null);
  const [entrando, setEntrando] = useState(false);

  /* Confere de qual empresa é o código antes de entrar: mudar de equipe não
     é algo para descobrir depois de acontecer. */
  const conferir = async () => {
    const limpo = codigo.trim().toUpperCase();
    if (limpo.length < 6) { toast.error('Digite o código completo.'); return; }
    setConferindo(true);
    setAchada(null);
    try {
      const res = await fetch(`/api/join?codigo=${encodeURIComponent(limpo)}`);
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Código não encontrado.');
      setAchada(corpo);
    } catch (e) { toast.error(e.message); } finally { setConferindo(false); }
  };

  const entrar = async () => {
    setEntrando(true);
    try {
      const res = await fetch('/api/join', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível entrar.');
      toast.success(corpo.levouConteudo
        ? `Você entrou em ${corpo.empresa}. Seus arquivos foram junto.`
        : `Você entrou em ${corpo.empresa}.`);
      setCodigo(''); setAchada(null);
      /* Recarrega: a biblioteca, o histórico e a cota mudaram de dono. */
      window.location.reload();
    } catch (e) { toast.error(e.message); } finally { setEntrando(false); }
  };

  const copiar = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success('Código copiado.');
    } catch { toast.warning(`Código: ${codigo}`); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 620 }}>
      <Secao
        titulo="Equipe"
        apoio="Todo mundo aqui vê os mesmos modelos, planilhas e histórico. A cota de gerações também é compartilhada."
      >
        <Cartao style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Linha largura="42%" altura={12} />
              <Linha largura="28%" altura={10} />
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, padding: isMobile ? '14px 16px' : '15px 18px',
                background: 'var(--n1)', borderBottom: 'var(--fio)', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 'var(--t-base)', fontWeight: 600, color: 'var(--n9)' }}>
                    {org?.nome}
                  </div>
                  <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 2 }}>
                    Plano {org?.planoNome}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--fonte-dado)', fontSize: 'var(--t-mini)',
                  color: 'var(--n7)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {ocupadas}<span style={{ color: 'var(--n5)' }}>/{limite ?? '∞'}</span>
                </div>
              </div>

              {pessoas.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: isMobile ? '13px 16px' : '14px 18px',
                  borderTop: i === 0 ? 'none' : 'var(--fio)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--n8)', color: 'var(--n0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {(p.nome || p.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--t-base)', fontWeight: 550, color: 'var(--n9)' }}>
                      {p.nome || p.email}
                      {p.voce && (
                        <span style={{ marginLeft: 7, fontSize: 'var(--t-micro)', color: 'var(--n6)' }}>
                          você
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.email}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 'var(--t-micro)', fontWeight: 600, flexShrink: 0,
                    color: p.papel === 'owner' ? 'var(--azul)' : 'var(--n6)',
                    background: p.papel === 'owner' ? 'var(--azul-veu)' : 'var(--n2)',
                    padding: '3px 9px', borderRadius: 'var(--r-total)',
                  }}>
                    {p.papel === 'owner' ? 'dono' : 'membro'}
                  </span>
                </div>
              ))}

              {convites.map((c) => (
                <div key={c.codigo} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: isMobile ? '13px 16px' : '14px 18px', borderTop: 'var(--fio)',
                  background: 'var(--n1)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--fonte-dado)', fontSize: 'var(--t-base)',
                      fontWeight: 600, color: 'var(--n9)', letterSpacing: '.06em',
                    }}>
                      {c.codigo}
                    </div>
                    <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 2 }}>
                      {c.email ? `para ${c.email} · ` : ''}convite em aberto
                    </div>
                  </div>
                  <button onClick={() => copiar(c.codigo)} className="icone" title="Copiar código"
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'var(--fio)', background: 'var(--n0)', color: 'var(--n6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Copy size={13} />
                  </button>
                  {dono && (
                    <button onClick={() => cancelar(c.codigo)} className="icone" title="Cancelar convite"
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--n5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </Cartao>

        {dono && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CampoTexto
              rotulo="Convidar alguém" tipo="email" valor={email} aoMudar={setEmail}
              aoEnviar={convidar}
              apoio="Gera um código. Quem receber usa esse código no cadastro — não enviamos e-mail ainda."
            />
            <div>
              <Acao aoClicar={convidar} carregando={convidando}
                largura={isMobile ? '100%' : undefined}>
                Gerar convite
              </Acao>
            </div>
          </div>
        )}
      </Secao>

      <Secao
        titulo="Entrar em outra empresa"
        apoio="Recebeu um código? Digite aqui para passar a fazer parte daquela equipe."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <input
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setAchada(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') conferir(); }}
              placeholder="CÓDIGO DO CONVITE"
              maxLength={14}
              style={{
                flex: 1, height: 46, padding: '0 15px', borderRadius: 'var(--r-p)',
                border: '1px solid var(--n4)', background: 'var(--n0)',
                fontFamily: 'var(--fonte-dado)', fontSize: 'var(--t-corpo)',
                letterSpacing: '.14em', textTransform: 'uppercase',
                color: 'var(--n9)', outline: 'none',
              }}
            />
            <Acao tipo="quieta" aoClicar={conferir} carregando={conferindo}
              largura={isMobile ? '100%' : undefined}>
              Conferir
            </Acao>
          </div>

          {achada && (
            <div style={{
              padding: isMobile ? 16 : '16px 18px', borderRadius: 'var(--r-m)',
              background: 'var(--azul-veu)', border: '1px solid rgba(37,99,235,.2)',
              display: 'flex', flexDirection: 'column', gap: 13,
            }}>
              <div>
                <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n7)' }}>
                  Este código é da empresa
                </div>
                <div style={{
                  fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
                  fontSize: 'var(--t-sub)', letterSpacing: '-0.02em',
                  color: 'var(--n9)', marginTop: 3,
                }}>
                  {achada.empresa}
                </div>
              </div>

              <p style={{
                fontSize: 'var(--t-mini)', color: 'var(--n7)', margin: 0, lineHeight: 1.6,
              }}>
                Ao entrar, você passa a ver a biblioteca e o histórico dessa
                empresa, e a dividir a cota de gerações com a equipe. Se você
                está sozinho na sua empresa hoje, seus arquivos vão junto.
              </p>

              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <Acao aoClicar={entrar} carregando={entrando}
                  largura={isMobile ? '100%' : undefined}>
                  <LogIn size={15} /> Entrar em {achada.empresa}
                </Acao>
                <Acao tipo="fantasma" aoClicar={() => { setAchada(null); setCodigo(''); }}>
                  Cancelar
                </Acao>
              </div>
            </div>
          )}
        </div>
      </Secao>
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

export default function Settings() {
  const { isMobile } = useLayout();
  const [aba, setAba] = useState('perfil');

  return (
    <AppLayout>
      <Topbar title="Configurações" subtitle="Sua conta e o acesso a ela" crumbLabel="Conta" />

      <div className="rolagem-fina" style={{
        flex: 1, overflowY: 'auto', background: 'var(--n1)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: isMobile ? 0 : 44,
          padding: isMobile ? '0 0 40px' : '32px 36px 60px',
          maxWidth: 1080,
        }}>
          {/* Navegação: coluna no desktop, faixa no celular */}
          <nav style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? 6 : 2,
            width: isMobile ? '100%' : 190,
            flexShrink: 0,
            position: isMobile ? 'sticky' : 'static',
            top: 0, zIndex: 5,
            padding: isMobile ? '10px 14px' : 0,
            background: isMobile ? 'var(--n1)' : 'transparent',
            borderBottom: isMobile ? 'var(--fio)' : 'none',
            overflowX: isMobile ? 'auto' : 'visible',
          }}>
            {!isMobile && <Rotulo style={{ marginBottom: 12, paddingLeft: 12 }}>Ajustes</Rotulo>}
            {ABAS.map(({ chave, icone: Icone, rotulo }) => {
              const ativa = aba === chave;
              return (
                <button
                  key={chave}
                  onClick={() => setAba(chave)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    height: 40, padding: '0 14px', flexShrink: 0,
                    borderRadius: isMobile ? 'var(--r-total)' : 'var(--r-p)',
                    border: isMobile && ativa ? '1px solid var(--n4)' : '1px solid transparent',
                    background: ativa ? 'var(--n0)' : 'transparent',
                    boxShadow: ativa && !isMobile ? 'var(--alt-1)' : 'none',
                    color: ativa ? 'var(--n9)' : 'var(--n7)',
                    fontFamily: 'inherit', fontSize: 'var(--t-base)',
                    fontWeight: ativa ? 600 : 500,
                    cursor: 'pointer', transition: 'background .15s var(--curva), color .15s var(--curva)',
                  }}
                >
                  <Icone size={16} strokeWidth={1.9} />
                  {rotulo}
                </button>
              );
            })}
          </nav>

          <div style={{
            flex: 1, minWidth: 0, width: '100%',
            padding: isMobile ? '24px 14px 0' : 0,
          }}>
            {aba === 'perfil' ? <AbaPerfil isMobile={isMobile} />
              : aba === 'equipe' ? <AbaEquipe isMobile={isMobile} />
              : <AbaSeguranca isMobile={isMobile} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
