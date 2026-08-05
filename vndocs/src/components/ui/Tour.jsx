import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../../contexts/LayoutContext';

/**
 * Tutorial guiado.
 *
 * Em vez de uma tela de boas-vindas que a pessoa fecha sem ler, este
 * componente recorta o próprio elemento da interface e explica o que ele
 * faz. Aprender apontando para a coisa real é o que faz o passo grudar.
 *
 * Cada passo aponta para um `data-tour` no elemento. Se o elemento não
 * estiver na tela — porque a pessoa está noutra página, ou porque a tela é
 * estreita — o passo é pulado em vez de apontar para o vazio.
 */

const CHAVE = 'ndocs_tour_visto';

const PASSOS = [
  {
    alvo: 'nav-gerar',
    titulo: 'Aqui começa tudo',
    texto: 'Você envia o modelo do Word e a planilha do Excel, e sai um documento para cada linha da planilha.',
  },
  {
    alvo: 'nav-biblioteca',
    titulo: 'Guarde para não subir de novo',
    texto: 'Uma pasta junta um modelo e as planilhas que combinam com ele. Da próxima vez, gere direto daqui.',
  },
  {
    alvo: 'nav-historico',
    titulo: 'Tudo que você já gerou',
    texto: 'Cada lote fica registrado, com quantos documentos saíram. Dá para baixar de novo quando precisar.',
  },
  {
    alvo: 'consumo',
    titulo: 'Seu consumo do mês',
    texto: 'Cada lote gerado conta uma geração. O limite vem do seu plano e é dividido com a equipe.',
  },
  {
    alvo: 'nav-configuracoes',
    titulo: 'Sua conta e sua equipe',
    texto: 'Em Configurações → Equipe você convida gente para a empresa. Todo mundo passa a ver a mesma biblioteca.',
  },
];

/** Guarda que a pessoa já viu, para não repetir a cada visita. */
export function tourJaVisto() {
  try {
    return localStorage.getItem(CHAVE) === 'sim';
  } catch {
    return true;   // sem localStorage, não insiste
  }
}

export function marcarTourVisto() {
  try { localStorage.setItem(CHAVE, 'sim'); } catch { /* segue a vida */ }
}

export function reabrirTour() {
  try { localStorage.removeItem(CHAVE); } catch { /* segue a vida */ }
}

export default function Tour({ aoFechar }) {
  const isMobile = useIsMobile();
  const [i, setI] = useState(0);
  const [caixa, setCaixa] = useState(null);

  /* Só os passos cujo elemento existe agora. */
  const visiveis = PASSOS.filter(
    (p) => typeof document !== 'undefined' && document.querySelector(`[data-tour="${p.alvo}"]`),
  );
  const passo = visiveis[i];

  const medir = useCallback(() => {
    if (!passo) return;
    const el = document.querySelector(`[data-tour="${passo.alvo}"]`);
    if (!el) { setCaixa(null); return; }
    const r = el.getBoundingClientRect();
    setCaixa({ topo: r.top, esq: r.left, larg: r.width, alt: r.height });
  }, [passo]);

  useLayoutEffect(() => { medir(); }, [medir]);

  useEffect(() => {
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [medir]);

  const encerrar = useCallback(() => {
    marcarTourVisto();
    aoFechar?.();
  }, [aoFechar]);

  /* Esc fecha, setas navegam: quem usa teclado não fica preso. */
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'Escape') encerrar();
      if (e.key === 'ArrowRight') setI((n) => Math.min(visiveis.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [encerrar, visiveis.length]);

  if (!passo || !caixa) return null;

  const ultimo = i === visiveis.length - 1;
  const folga = 8;

  /* O balão fica ao lado no computador e embaixo no celular, sem sair da
     tela — um balão cortado é pior que nenhum. */
  const largura = isMobile ? Math.min(320, window.innerWidth - 28) : 320;
  let esq = isMobile
    ? Math.max(14, Math.min(window.innerWidth - largura - 14, caixa.esq))
    : caixa.esq + caixa.larg + folga + 6;
  let topo = isMobile ? caixa.topo + caixa.alt + folga + 6 : caixa.topo;

  if (!isMobile && esq + largura > window.innerWidth - 14) {
    esq = Math.max(14, caixa.esq - largura - folga - 6);
  }
  topo = Math.max(14, Math.min(topo, window.innerHeight - 210));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }}>
      {/* Escurece tudo menos o alvo. A sombra gigante é o truque que abre o
          buraco sem precisar de quatro divs em volta. */}
      <div
        onClick={encerrar}
        style={{
          position: 'fixed',
          top: caixa.topo - folga,
          left: caixa.esq - folga,
          width: caixa.larg + folga * 2,
          height: caixa.alt + folga * 2,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(15,23,42,.62)',
          transition: 'all .28s var(--curva)',
          pointerEvents: 'auto',
        }}
      />

      {/* Contorno do alvo */}
      <div style={{
        position: 'fixed',
        top: caixa.topo - folga,
        left: caixa.esq - folga,
        width: caixa.larg + folga * 2,
        height: caixa.alt + folga * 2,
        borderRadius: 12,
        border: '2px solid var(--azul)',
        pointerEvents: 'none',
        transition: 'all .28s var(--curva)',
      }} />

      {/* Balão */}
      <div
        role="dialog"
        aria-label={passo.titulo}
        style={{
          position: 'fixed', top: topo, left: esq, width: largura,
          background: 'var(--n0)', borderRadius: 'var(--r-m)',
          boxShadow: '0 2px 8px rgba(22,24,29,.1), 0 24px 56px rgba(22,24,29,.24)',
          padding: 18, transition: 'all .28s var(--curva)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--fonte-dado)', fontSize: 10, letterSpacing: '.14em',
            textTransform: 'uppercase', color: 'var(--n6)',
          }}>
            Passo {i + 1} de {visiveis.length}
          </span>
          <button
            onClick={encerrar}
            aria-label="Fechar o tutorial"
            className="icone"
            style={{
              width: 24, height: 24, borderRadius: 7, border: 'none', flexShrink: 0,
              background: 'transparent', color: 'var(--n5)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <h3 style={{
          fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
          fontSize: 'var(--t-sub)', letterSpacing: '-0.022em',
          color: 'var(--n9)', margin: '9px 0 0',
        }}>
          {passo.titulo}
        </h3>
        <p style={{
          fontSize: 'var(--t-mini)', color: 'var(--n7)',
          lineHeight: 1.6, margin: '6px 0 0',
        }}>
          {passo.texto}
        </p>

        {/* Marcadores de progresso */}
        <div style={{ display: 'flex', gap: 5, margin: '16px 0 14px' }}>
          {visiveis.map((_, n) => (
            <span key={n} style={{
              height: 3, flex: 1, borderRadius: 999,
              background: n <= i ? 'var(--azul)' : 'var(--n3)',
              transition: 'background .2s var(--curva)',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={encerrar}
            style={{
              background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 'var(--t-mini)', color: 'var(--n6)',
            }}
          >
            Pular tutorial
          </button>

          <div style={{ flex: 1 }} />

          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              style={{
                height: 36, padding: '0 14px', borderRadius: 'var(--r-total)',
                background: 'var(--n0)', border: 'var(--fio)', color: 'var(--n8)',
                fontFamily: 'inherit', fontSize: 'var(--t-mini)', fontWeight: 550,
                cursor: 'pointer',
              }}
            >
              Voltar
            </button>
          )}

          <button
            onClick={() => (ultimo ? encerrar() : setI(i + 1))}
            style={{
              height: 36, padding: '0 18px', borderRadius: 'var(--r-total)',
              background: 'var(--azul)', border: 'none', color: '#fff',
              fontFamily: 'inherit', fontSize: 'var(--t-mini)', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ultimo ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}
