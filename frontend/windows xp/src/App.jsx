import { useState, useCallback } from 'react';
import { WindowProvider } from './context/WindowContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Desktop from './components/Desktop/Desktop';
import Taskbar from './components/Taskbar/Taskbar';
import BootScreen from './components/BootScreen/BootScreen';
import ShutdownScreen from './components/ShutdownScreen/ShutdownScreen';
import LoginScreen from './components/LoginScreen/LoginScreen';
import './index.css';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [phase, setPhase] = useState('boot'); // boot → login → desktop → shutdown

  const handleBootComplete = useCallback(() => {
    setPhase('login');
  }, []);

  const handleShutdown = useCallback(() => {
    setPhase('shutdown');
  }, []);

  const handleShutdownComplete = useCallback(() => {
    logout();
    setPhase('boot');
  }, [logout]);

  // Boot screen
  if (phase === 'boot') {
    return <BootScreen onComplete={handleBootComplete} />;
  }

  // Shutdown screen
  if (phase === 'shutdown') {
    return <ShutdownScreen onComplete={handleShutdownComplete} />;
  }

  // Loading auth state
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#000',
        width: '100vw',
        height: '100vh',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Tahoma, sans-serif'
      }}>
        Loading Windows XP...
      </div>
    );
  }

  // Login screen
  if (!user) {
    return <LoginScreen />;
  }

  // Desktop (pass shutdown handler down)
  return (
    <ThemeProvider>
      <WindowProvider>
        <div className="xp-shell">
          <Desktop />
          <Taskbar onShutdown={handleShutdown} />
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
