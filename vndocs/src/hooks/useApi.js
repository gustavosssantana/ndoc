import { useState, useEffect, useCallback } from 'react';

/**
 * Busca JSON de uma rota da API e devolve os três estados que toda tela
 * precisa: carregando, erro e dado. Sem isso, cada página reinventaria o
 * mesmo useEffect com try/catch.
 *
 *   const { data, loading, error, recarregar } = useApi('/api/folders', []);
 */
export function useApi(path, inicial = null) {
  const [data, setData] = useState(inicial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path);
      const corpo = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(corpo?.error || `A requisição falhou (${res.status}).`);
      }
      setData(corpo);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar.');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { recarregar(); }, [recarregar]);

  return { data, loading, error, recarregar };
}

export default useApi;
