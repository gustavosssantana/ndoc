import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../ui/Spinner';

/**
 * Telas de entrada. Quem já tem sessão não deve ver formulário de login —
 * vai direto para o app.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <Spinner size={28} />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
}
