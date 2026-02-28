import React from 'react';
import { useWindowManager } from '../../context/WindowContext';
import { useAuth } from '../../context/AuthContext';
import { DESKTOP_ICONS } from '../../config/icons';
import InternetExplorer from '../../apps/InternetExplorer/InternetExplorer';
import './StartMenu.css';

const StartMenu = ({ onClose }) => {
    const { openWindow } = useWindowManager();
    const { user, logout } = useAuth();

    // Helper: open an app by its appId from DESKTOP_ICONS
    const openApp = (appId) => {
        const icon = DESKTOP_ICONS.find(i => i.appId === appId);
        if (icon) {
            openWindow({
                appId: icon.appId,
                title: icon.title,
                component: icon.component,
                icon: icon.src,
                size: icon.defaultSize,
                minSize: icon.minSize,
            });
        }
        onClose();
    };

    // Pinned apps for left panel (like real XP — top section)
    const pinnedApps = [
        { appId: 'internet-explorer', label: 'Internet Explorer', iconUrl: 'https://win32.run/images/xp/icons/InternetExplorer6.png', bold: true },
        { appId: 'cmd', label: 'Command Prompt', iconUrl: 'https://win32.run/images/xp/icons/CommandPrompt.png' },
        { appId: 'notepad', label: 'Notepad', iconUrl: 'https://win32.run/images/xp/icons/Notepad.png' },
        { appId: 'paint', label: 'Paint', iconUrl: 'https://win32.run/images/xp/icons/Paint.png' },
    ];

    // All Programs section (rest of apps)
    const allPrograms = [
        { appId: 'calculator', label: 'Calculator', iconUrl: 'https://win32.run/images/xp/icons/Programs.png' },
        { appId: 'control-panel', label: 'Control Panel', iconUrl: 'https://win32.run/images/xp/icons/ControlPanel.png' },
        { appId: 'snake', label: 'Snake', iconUrl: '/icons/snake.png' },
        { appId: 'minesweeper', label: 'Minesweeper', iconUrl: '/icons/minesweeper.png' },
        { appId: 'solitaire', label: 'Solitaire', iconUrl: '/icons/solitaire.png' },
    ];

    return (
        <div className="start-menu" id="start-menu">
            {/* Header strip */}
            <div className="start-menu-header">
                <div className="start-menu-avatar">
                    <img
                        src="https://ui-avatars.com/api/?name=User&background=025a9c&color=fff&size=40"
                        alt=""
                        className="avatar-img"
                    />
                </div>
                <div className="start-menu-username">{user?.username || user?.email || 'User'}</div>
            </div>

            <div className="start-menu-body">
                {/* Left panel – Pinned + All Programs */}
                <div className="start-menu-left">
                    {/* Pinned Apps */}
                    {pinnedApps.map(app => (
                        <button
                            key={app.appId}
                            className={`start-menu-item ${app.bold ? 'pinned-bold' : ''}`}
                            onClick={() => openApp(app.appId)}
                        >
                            <img src={app.iconUrl} alt="" className="start-menu-item-icon" />
                            <span className="start-menu-item-label">{app.label}</span>
                        </button>
                    ))}

                    <div className="start-menu-divider" />

                    {/* Frequently used / All Programs */}
                    {allPrograms.map(app => (
                        <button
                            key={app.appId}
                            className="start-menu-item"
                            onClick={() => openApp(app.appId)}
                        >
                            <img src={app.iconUrl} alt="" className="start-menu-item-icon" />
                            <span className="start-menu-item-label">{app.label}</span>
                        </button>
                    ))}

                    <div className="start-menu-divider" />

                    {/* All Programs arrow */}
                    <div className="start-menu-all-programs">
                        All Programs ▸
                    </div>
                </div>

                {/* Right panel – System locations (all functional) */}
                <div className="start-menu-right">
                    <button className="start-menu-right-item" onClick={() => openApp('my-documents')}>
                        <img src="https://win32.run/images/xp/icons/FolderClosed.png" alt="" className="start-menu-right-icon" /> My Documents
                    </button>
                    <button className="start-menu-right-item" onClick={() => openApp('my-documents')}>
                        <img src="https://win32.run/images/xp/icons/MyPictures.png" alt="" className="start-menu-right-icon" /> My Pictures
                    </button>
                    <button className="start-menu-right-item" onClick={() => openApp('my-documents')}>
                        <img src="https://win32.run/images/xp/icons/MyMusic.png" alt="" className="start-menu-right-icon" /> My Music
                    </button>
                    <button className="start-menu-right-item" onClick={() => openApp('my-computer')}>
                        <img src="https://win32.run/images/xp/icons/MyComputer.png" alt="" className="start-menu-right-icon" /> My Computer
                    </button>

                    <div className="start-menu-divider-h" />

                    <button className="start-menu-right-item" onClick={() => openApp('control-panel')}>
                        <img src="https://win32.run/images/xp/icons/ControlPanel.png" alt="" className="start-menu-right-icon" /> Control Panel
                    </button>
                    <button className="start-menu-right-item" onClick={() => openApp('recycle-bin')}>
                        <img src="https://win32.run/images/xp/icons/RecycleBinempty.png" alt="" className="start-menu-right-icon" /> Recycle Bin
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="start-menu-footer">
                <button className="start-footer-btn" onClick={() => { logout(); onClose(); }}>
                    <img src="https://win32.run/images/xp/icons/Logout.png" alt="" className="start-footer-icon" /> Log Off
                </button>
                <button className="start-footer-btn" onClick={() => { logout(); onClose(); }}>
                    <img src="https://win32.run/images/xp/icons/Power.png" alt="" className="start-footer-icon" /> Turn Off Computer
                </button>
            </div>
        </div>
    );
};

export default StartMenu;
