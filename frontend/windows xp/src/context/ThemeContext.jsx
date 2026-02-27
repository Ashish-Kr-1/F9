import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
    blue: {
        id: 'blue',
        name: 'Luna Blue',
        preview: '#2454db',
    },
    olive: {
        id: 'olive',
        name: 'Olive Green',
        preview: '#6a7c3e',
    },
    silver: {
        id: 'silver',
        name: 'Silver',
        preview: '#858585',
    },
    royale: {
        id: 'royale',
        name: 'Royale',
        preview: '#1e3a6e',
    },
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('blue');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const switchTheme = useCallback((themeId) => {
        if (THEMES[themeId]) setTheme(themeId);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, switchTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
