import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LayoutProvider } from './contexts/LayoutContext';
import Toast from './components/ui/Toast';

/**
 * LayoutProvider é o mais externo: as páginas consultam o tamanho da tela
 * antes de montar o AppLayout, então o provedor precisa estar acima delas.
 * (Ele já esteve dentro do AppLayout, e aí toda página recebia o valor
 * padrão — os ajustes de celular não faziam efeito.)
 *
 * ToastProvider vem em seguida para que a autenticação possa avisar.
 * AuthProvider carrega a sessão, a conta e o consumo de /api/auth/me.
 * <Toast /> desenha os avisos e precisa estar montado uma única vez.
 *
 * Sem esses providers, useAuth/useToast lançam exceção e a página fica branca.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LayoutProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
            <Toast />
          </AuthProvider>
        </ToastProvider>
      </LayoutProvider>
    </BrowserRouter>
  </StrictMode>
);
