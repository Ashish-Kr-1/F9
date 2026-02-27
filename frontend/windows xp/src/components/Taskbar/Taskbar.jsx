import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWindowManager } from '../../context/WindowContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import StartMenu from '../StartMenu/StartMenu';
import './Taskbar.css';

const Clock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');
    const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
    const h12 = (time.getHours() % 12 || 12).toString().padStart(2, '0');

    return (
        <div className="taskbar-clock" title={time.toLocaleDateString()}>
            <span>{h12}:{m} {ampm}</span>
        </div>
    );
};

const TaskbarButton = ({ win }) => {
    const { focusWindow, minimizeWindow } = useWindowManager();

    const handleClick = useCallback(() => {
        if (win.focused && !win.minimized) {
            minimizeWindow(win.id);
        } else {
            focusWindow(win.id);
        }
    }, [win, focusWindow, minimizeWindow]);

    return (
        <button
            className={`taskbar-btn ${win.focused && !win.minimized ? 'active' : ''}`}
            onClick={handleClick}
            title={win.title}
        >
            {win.icon && <img src={win.icon} alt="" className="taskbar-btn-icon" />}
            <span className="taskbar-btn-label">{win.title}</span>
        </button>
    );
};

const Taskbar = () => {
    const { windows } = useWindowManager();
    const { theme, switchTheme, themes } = useTheme();
    const [startOpen, setStartOpen] = useState(false);
    const [volumeOpen, setVolumeOpen] = useState(false);
    const startRef = useRef(null);

    // Close start menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (startRef.current && !startRef.current.contains(e.target)) {
                setStartOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <>
            {startOpen && (
                <StartMenu onClose={() => setStartOpen(false)} />
            )}

            <div className="taskbar" id="taskbar">
                {/* Start Button */}
                <div ref={startRef} style={{ display: 'flex', height: '100%' }}>
                    <button
                        className={`start-btn ${startOpen ? 'active' : ''}`}
                        onClick={() => setStartOpen(v => !v)}
                        id="start-button"
                    >
                        <img
                            src="/icons/start.png"
                            alt=""
                            className="start-logo"
                        />
                        <span className="start-text">start</span>
                    </button>
                </div>

                {/* Separator */}
                <div className="taskbar-separator" />

                {/* Window Buttons */}
                <div className="taskbar-windows">
                    {windows.map(win => (
                        <TaskbarButton key={win.id} win={win} />
                    ))}
                </div>

                {/* System Tray */}
                <div className="system-tray">
                    {/* Theme Switcher */}
                    <div className="tray-themes">
                        {Object.values(themes).map(t => (
                            <div
                                key={t.id}
                                className={`tray-theme-dot ${theme === t.id ? 'active' : ''}`}
                                style={{ background: t.preview }}
                                title={t.name}
                                onClick={() => switchTheme(t.id)}
                            />
                        ))}
                    </div>

                    {/* Volume icon */}
                    <div className="tray-icon" title="Volume">🔊</div>

                    {/* Network icon */}
                    <div className="tray-icon" title="Network">🌐</div>

                    <div className="tray-divider" />
                    <Clock />
                </div>
            </div>
        </>
    );
};

export default Taskbar;
