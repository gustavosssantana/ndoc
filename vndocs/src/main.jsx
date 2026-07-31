import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Toast from './components/ui/Toast';

/**
 * ToastProvider é o mais externo para que a autenticação possa avisar.
 * AuthProvider carrega a sessão, a conta e o consumo de /api/auth/me.
 * <Toast /> desenha os avisos e precisa estar montado uma única vez.
 *
 * Sem esses providers, useAuth/useToast lançam exceção e a página fica branca.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
          <Toast />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
