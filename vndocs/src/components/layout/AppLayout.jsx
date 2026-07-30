import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f6f7f9' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
