import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PublicRoute from '../components/auth/PublicRoute';

import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Generate from '../pages/Generate';
import Biblioteca from '../pages/Biblioteca';
import History from '../pages/History';
import Pricing from '../pages/Pricing';
import Settings from '../pages/Settings';

/** Exige sessão. */
const guard = (element) => <ProtectedRoute>{element}</ProtectedRoute>;
/** Só para quem NÃO tem sessão. */
const aberta = (element) => <PublicRoute>{element}</PublicRoute>;

/**
 * Rotas consumidas por App.jsx via useRoutes.
 * Os caminhos batem com os do Sidebar (NAV_TOP / NAV_GROUPS).
 */
export const routes = [
  { path: '/login', element: aberta(<Login />) },
  { path: '/register', element: aberta(<Register />) },

  { path: '/', element: guard(<Dashboard />) },
  { path: '/generate', element: guard(<Generate />) },
  { path: '/biblioteca', element: guard(<Biblioteca />) },
  { path: '/history', element: guard(<History />) },
  { path: '/pricing', element: guard(<Pricing />) },
  { path: '/settings', element: guard(<Settings />) },

  { path: '*', element: <Navigate to="/" replace /> },
];

export default routes;
