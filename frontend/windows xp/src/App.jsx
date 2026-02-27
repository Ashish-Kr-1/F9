import { WindowProvider } from './context/WindowContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Desktop from './components/Desktop/Desktop';
import Taskbar from './components/Taskbar/Taskbar';
import LoginScreen from './components/LoginScreen/LoginScreen';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ backgroundColor: '#000', width: '100vw', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Windows XP...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <ThemeProvider>
      <WindowProvider>
        <div className="xp-shell">
          <Desktop />
          <Taskbar />
        </div>
      </WindowProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
