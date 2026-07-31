# De-para dos arquivos

Como cada arquivo do commit `9e21479` foi reidentificado. A coluna do meio é o
que o arquivo **realmente** era, lido do `export default` e dos imports.

## Interface (React)

| Nome no repositório       | Realmente era   | Destino                                    |
| ------------------------- | --------------- | ------------------------------------------ |
| `engine.js`               | entrada React   | `src/main.jsx`                             |
| `ProtectedRoute.jsx`      | `App`           | `src/App.jsx`                              |
| `package-lock (3).json`   | `Login`         | `src/pages/Login.jsx`                      |
| `vite.config.js`          | `Register`      | `src/pages/Register.jsx`                   |
| `download (1)`            | `Dashboard`     | `src/pages/Dashboard.jsx`                  |
| `index.html`              | `Generate`      | `src/pages/Generate.jsx`                   |
| `globals.css`             | `Biblioteca`    | `src/pages/Biblioteca.jsx`                 |
| `package (2).json`        | `History`       | `src/pages/History.jsx`                    |
| `README (4).md`           | `Pricing`       | `src/pages/Pricing.jsx`                    |
| `logo.png`                | `Settings`      | `src/pages/Settings.jsx`                   |
| `EmptyState.jsx`          | `AppLayout`     | `src/components/layout/AppLayout.jsx`      |
| `Input.jsx`               | `Sidebar`       | `src/components/layout/Sidebar.jsx`        |
| `Modal.jsx`               | `Topbar`        | `src/components/layout/Topbar.jsx`         |
| `Toast.jsx`               | `ProtectedRoute`| `src/components/auth/ProtectedRoute.jsx`   |
| `useDocuments.js`         | `Button`        | `src/components/ui/Button.jsx`             |
| `Biblioteca.jsx`          | `Input`         | `src/components/ui/Input.jsx`              |
| `Dashboard.jsx`           | `Modal`         | `src/components/ui/Modal.jsx`              |
| `History.jsx`             | `Toast`         | `src/components/ui/Toast.jsx`              |
| `Generate.jsx`            | `Spinner`       | `src/components/ui/Spinner.jsx`            |
| `main.jsx`                | `EmptyState`    | `src/components/ui/EmptyState.jsx`         |
| `ToastContext.jsx`        | `StatusBadge`   | `src/components/ui/StatusBadge.jsx`        |
| `Pricing.jsx`             | `AuthContext`   | `src/contexts/AuthContext.jsx`             |
| `Register.jsx`            | `ToastContext`  | `src/contexts/ToastContext.jsx`            |
| `index.jsx`               | `useDocuments`  | `src/hooks/useDocuments.js`                |

## Motor (Node)

| Nome no repositório  | Realmente era        | Destino                            |
| -------------------- | -------------------- | ---------------------------------- |
| `App.jsx`            | servidor Fastify     | `server/src/server.js`             |
| `xlsx.js`            | geração do lote      | `server/src/generate.js`           |
| `AppLayout.jsx`      | leitura do `.docx`   | `server/src/template.js`           |
| `Sidebar.jsx`        | leitura da planilha  | `server/src/xlsx.js`               |
| `package-lock.json`  | CLI                  | `server/cli.mjs`                   |
| `server.js`          | script de amostras   | `server/scripts/make-samples.mjs`  |
| `make-samples.mjs`   | `package.json`       | `server/package.json`              |
| `package.json`       | `package-lock.json`  | `server/package-lock.json`         |
| `cli.mjs`            | README do motor      | `server/README.md`                 |
| `README.md`          | `.gitignore`         | (substituído na raiz)              |

## Escritos do zero

Estes arquivos eram importados pelo código mas não existiam no repositório:

| Arquivo                     | Por que precisava existir                                     |
| --------------------------- | ------------------------------------------------------------- |
| `index.html`                | Ponto de entrada do Vite; `main.jsx` monta em `#root`.         |
| `vite.config.js`            | Plugin React + proxy `/api` → `:4000`.                         |
| `package.json`              | Deps do front: react, react-dom, react-router-dom, lucide-react. |
| `.gitignore`                | O antigo cobria só o motor. Agora inclui `dist/` e `.env`.     |
| `src/router/index.jsx`      | `App.jsx` importa `routes` daqui.                              |
| `src/services/engine.js`    | `Generate.jsx` importa `inspectFiles`, `generateDocuments`, `downloadBlob`. |
| `src/services/mockData.js`  | 8 arquivos importam daqui. Ver lista de símbolos abaixo.        |
| `src/styles/globals.css`    | `main.jsx` importa; define os tokens `--surface`, `--text`, `--radius`, etc. |

Símbolos que `mockData.js` precisava exportar, extraídos dos imports:
`mockUser`, `mockNotifs`, `mockFolders`, `mockHistory`, `DOCUMENT_TYPES`,
`MOCK_DOCUMENTS`.

## Verificação

Ambas as partes foram instaladas e executadas:

- `npx vite build` → 1577 módulos transformados, nenhum import não resolvido.
- `npm run samples` → `template.docx` com 7 variáveis + `data.xlsx` com 5 linhas.
- `npm run gen` → 5 documentos gerados em `out/documentos.zip` (6.9 KB), 159 ms.

Os valores em `mockData.js` são invenção minha, escritos só para dar forma à
interface. Substitua por dados reais quando o backend existir.
