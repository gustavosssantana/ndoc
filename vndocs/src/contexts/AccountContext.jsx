/**
 * A conta e o consumo agora vêm de /api/auth/me, junto com a sessão, então
 * quem cuida disso é o AuthContext. Este arquivo existe apenas para que os
 * imports de `useAccount` continuem funcionando.
 */
export { useAccount } from './AuthContext';
