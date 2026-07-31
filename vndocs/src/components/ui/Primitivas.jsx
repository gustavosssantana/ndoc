/**
 * Primitivas visuais do ndocs.
 *
 * A ficha de campo é a assinatura do sistema: o produto inteiro existe para
 * trocar {{nome}} por "Ana Beatriz Lima". Mostrar o campo com a mesma forma
 * em todo lugar — na prévia do contrato, no mapeamento, na Biblioteca —
 * ensina a ler o produto sem precisar de legenda.
 */

/** Campo de template: {{assim}}. */
export function Campo({ nome, estado = 'neutro', tamanho = 'm' }) {
  const cores = {
    neutro:  { fundo: 'var(--azul-veu)', texto: 'var(--azul)' },
    casado:  { fundo: 'rgba(18,128,92,.09)', texto: 'var(--verde)' },
    orfao:   { fundo: 'rgba(161,102,10,.10)', texto: 'var(--ambar)' },
    apagado: { fundo: 'var(--n2)', texto: 'var(--n6)' },
  }[estado] ?? { fundo: 'var(--azul-veu)', texto: 'var(--azul)' };

  const escalas = {
    p: { fonte: 10.5, alturaLinha: 18, folga: '0 6px' },
    m: { fonte: 12, alturaLinha: 22, folga: '0 8px' },
    g: { fonte: 13, alturaLinha: 26, folga: '0 10px' },
  }[tamanho];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: escalas.alturaLinha, padding: escalas.folga,
      borderRadius: 6,
      background: cores.fundo, color: cores.texto,
      fontFamily: 'var(--fonte-dado)', fontSize: escalas.fonte,
      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {`{{${nome}}}`}
    </span>
  );
}

/**
 * Rótulo de seção. Maiúsculas pequenas e espaçadas, como a marcação de
 * cláusula num contrato — estrutura que diz algo, não decoração.
 */
export function Rotulo({ children, style }) {
  return (
    <div style={{
      fontFamily: 'var(--fonte-dado)',
      fontSize: 10,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: 'var(--n6)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/** Superfície padrão: papel sobre papel, separado por fio e não por sombra. */
export function Cartao({ children, style, aoClicar, destacado }) {
  return (
    <div
      onClick={aoClicar}
      style={{
        background: 'var(--n0)',
        border: destacado ? '1px solid var(--azul)' : 'var(--fio)',
        borderRadius: 'var(--r-m)',
        boxShadow: destacado ? '0 0 0 3px var(--azul-veu)' : 'var(--alt-1)',
        transition: 'border-color .18s var(--curva), box-shadow .18s var(--curva), transform .18s var(--curva)',
        cursor: aoClicar ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Cabeçalho de seção: título, apoio e uma ação.
 * Uma ação por seção — se precisar de duas, a seção está fazendo demais.
 */
export function Secao({ titulo, apoio, acao, children, style }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--fonte-titulo)', fontWeight: 600,
            fontSize: 'var(--t-h3)', letterSpacing: '-0.025em',
            color: 'var(--n9)', margin: 0,
          }}>
            {titulo}
          </h2>
          {apoio && (
            <p style={{
              fontSize: 'var(--t-base)', color: 'var(--n6)',
              margin: '4px 0 0', lineHeight: 1.5, maxWidth: '58ch',
            }}>
              {apoio}
            </p>
          )}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Botão primário. Um por tela — é onde o azul é gasto. */
export function Acao({ children, aoClicar, carregando, desabilitado, largura, tipo = 'primaria', style }) {
  const inativo = desabilitado || carregando;

  const variantes = {
    primaria: {
      background: inativo ? 'var(--n4)' : 'var(--azul)',
      color: inativo ? 'var(--n6)' : '#fff',
      border: 'none',
      boxShadow: inativo ? 'none' : '0 1px 2px rgba(37,99,235,.35), 0 8px 20px rgba(37,99,235,.22)',
    },
    quieta: {
      background: 'var(--n0)',
      color: 'var(--n8)',
      border: 'var(--fio)',
      boxShadow: 'var(--alt-1)',
    },
    fantasma: {
      background: 'transparent',
      color: 'var(--n7)',
      border: 'none',
      boxShadow: 'none',
    },
  }[tipo];

  return (
    <button
      onClick={aoClicar}
      disabled={inativo}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 42, padding: '0 18px', width: largura,
        borderRadius: 'var(--r-total)',
        fontFamily: 'inherit', fontSize: 'var(--t-base)', fontWeight: 550,
        cursor: inativo ? 'not-allowed' : 'pointer',
        transition: 'background .16s var(--curva), transform .16s var(--curva), box-shadow .16s var(--curva)',
        ...variantes, ...style,
      }}
      onMouseEnter={(e) => {
        if (inativo) return;
        if (tipo === 'primaria') e.currentTarget.style.background = 'var(--azul-forte)';
        if (tipo === 'quieta') e.currentTarget.style.background = 'var(--n1)';
        if (tipo === 'fantasma') e.currentTarget.style.background = 'var(--n2)';
      }}
      onMouseLeave={(e) => {
        if (inativo) return;
        e.currentTarget.style.background = variantes.background;
      }}
    >
      {carregando ? 'Só um momento…' : children}
    </button>
  );
}

export default Campo;
