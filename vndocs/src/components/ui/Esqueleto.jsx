/**
 * Silhuetas de carregamento.
 *
 * Melhor que um spinner por dois motivos: o espaço do conteúdo já fica
 * reservado, então a página não salta quando o dado chega; e a forma da
 * silhueta antecipa o que vem, o que faz a espera parecer mais curta.
 */

export function Linha({ largura = '100%', altura = 12, style }) {
  return (
    <div
      className="esqueleto"
      style={{ width: largura, height: altura, borderRadius: 6, ...style }}
    />
  );
}

/** Cartão de pasta, como aparece na Biblioteca. */
export function CartaoEsqueleto() {
  return (
    <div style={{
      background: 'var(--n0)', border: '1px solid var(--n3)',
      borderRadius: 14, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div className="esqueleto" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Linha largura="62%" altura={13} />
          <Linha largura="40%" altura={10} />
        </div>
      </div>
      <Linha largura="100%" altura={9} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Linha largura={54} altura={9} />
        <Linha largura={72} altura={9} />
      </div>
    </div>
  );
}

/** Grade de cartões. */
export function GradeEsqueleto({ quantidade = 6 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 14,
    }}>
      {Array.from({ length: quantidade }, (_, i) => <CartaoEsqueleto key={i} />)}
    </div>
  );
}

/** Linhas de tabela, para o histórico. */
export function TabelaEsqueleto({ linhas = 6, colunas = 6 }) {
  const larguras = ['18%', '32%', '10%', '12%', '12%', '16%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 18,
            padding: '15px 16px',
            borderBottom: '1px solid var(--n2)',
            opacity: 1 - i * 0.11,
          }}
        >
          {Array.from({ length: colunas }, (_, c) => (
            <Linha key={c} largura={larguras[c] ?? '12%'} altura={11} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Linha;
