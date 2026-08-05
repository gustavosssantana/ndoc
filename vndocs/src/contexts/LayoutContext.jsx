import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Detecta largura de tela. Os estilos do projeto são inline, e estilo inline
 * ganha de media query no CSS — então a decisão de layout precisa acontecer
 * no JavaScript.
 */
export function useLarguraMenorQue(px) {
  const [menor, setMenor] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${px}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const aoMudar = (e) => setMenor(e.matches);
    setMenor(mq.matches);
    /* addEventListener em MediaQueryList é o caminho moderno; o addListener
       fica de reserva para navegadores antigos. */
    if (mq.addEventListener) {
      mq.addEventListener('change', aoMudar);
      return () => mq.removeEventListener('change', aoMudar);
    }
    mq.addListener(aoMudar);
    return () => mq.removeListener(aoMudar);
  }, [px]);

  return menor;
}

/** Celular: a barra lateral vira gaveta e as colunas viram uma só. */
export const useIsMobile = () => useLarguraMenorQue(860);

/** Telas médias: colunas duplas viram simples, mas a barra lateral fica. */
export const useIsTablet = () => useLarguraMenorQue(1180);

const LayoutContext = createContext({
  isMobile: false, isTablet: false, menuAberto: false,
  abrirMenu: () => {}, fecharMenu: () => {},
});

export function LayoutProvider({ children }) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [menuAberto, setMenuAberto] = useState(false);

  /* Ao voltar para tela grande, a gaveta não deve continuar "aberta". */
  useEffect(() => { if (!isMobile) setMenuAberto(false); }, [isMobile]);

  /* Com a gaveta aberta, o conteúdo atrás não rola junto. */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (menuAberto) {
      const antes = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = antes; };
    }
    return undefined;
  }, [menuAberto]);

  return (
    <LayoutContext.Provider value={{
      isMobile, isTablet, menuAberto,
      abrirMenu: () => setMenuAberto(true),
      fecharMenu: () => setMenuAberto(false),
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
