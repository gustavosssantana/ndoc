import { useRoutes } from 'react-router-dom';
import { routes } from './router/index.jsx';

export default function App() {
  return useRoutes(routes);
}
