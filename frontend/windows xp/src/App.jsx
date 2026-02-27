import { WindowProvider } from './context/WindowContext';
import { ThemeProvider } from './context/ThemeContext';
import Desktop from './components/Desktop/Desktop';
import Taskbar from './components/Taskbar/Taskbar';
import './index.css';

function App() {
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

export default App;
