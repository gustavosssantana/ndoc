import Sidebar from './Sidebar';
import { useLayout } from '../../contexts/LayoutContext';

/**
 * No desktop a barra lateral fica fixa à esquerda.
 * No celular ela vira uma gaveta que desliza por cima, aberta pelo botão
 * de menu da Topbar.
 */
function Estrutura({ children }) {
  const { isMobile, menuAberto, fecharMenu } = useLayout();

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--n1)',
    }}>
      {!isMobile && <Sidebar />}

      {isMobile && menuAberto && (
        <>
          <div
            onClick={fecharMenu}
            style={{
              position: 'fixed', inset: 0, background: 'var(--n6)',
              zIndex: 60, animation: 'fadeIn .18s ease-out',
            }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 61,
            boxShadow: '0 0 40px rgba(15,23,42,.22)',
            animation: 'deslizaDaEsquerda .22s cubic-bezier(.22,1,.36,1)',
          }}>
            <Sidebar aoNavegar={fecharMenu} />
          </div>
        </>
      )}

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

/* O LayoutProvider vive na raiz (src/main.jsx), acima das páginas. */
export default function AppLayout({ children }) {
  return <Estrutura>{children}</Estrutura>;
}
