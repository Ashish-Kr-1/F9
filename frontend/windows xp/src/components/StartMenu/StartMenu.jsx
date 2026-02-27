import React from 'react';
import { useWindowManager } from '../../context/WindowContext';
import { DESKTOP_ICONS } from '../../config/icons';
import './StartMenu.css';

const StartMenu = ({ onClose }) => {
    const { openWindow } = useWindowManager();

    const handleOpen = (icon) => {
        openWindow({
            appId: icon.appId,
            title: icon.title,
            component: icon.component,
            icon: icon.src,
            size: icon.defaultSize,
            minSize: icon.minSize,
        });
        onClose();
    };

    return (
        <div className="start-menu" id="start-menu">
            {/* Header strip */}
            <div className="start-menu-header">
                <div className="start-menu-avatar">
                    <div className="avatar-placeholder">👤</div>
                </div>
                <div className="start-menu-username">User</div>
            </div>

            <div className="start-menu-body">
                {/* Left panel – pinned / recent apps */}
                <div className="start-menu-left">
                    <div className="start-menu-section-label">Applications</div>
                    {DESKTOP_ICONS.map(icon => (
                        <button
                            key={icon.appId}
                            className="start-menu-item"
                            onClick={() => handleOpen(icon)}
                        >
                            <img src={icon.src} alt="" className="start-menu-item-icon" />
                            <span className="start-menu-item-label">{icon.title}</span>
                        </button>
                    ))}

                    <div className="start-menu-divider" />

                    {/* Static items */}
                    <button className="start-menu-item" onClick={onClose}>
                        <img src="/icons/documents.png" alt="" className="start-menu-item-icon" />
                        <span className="start-menu-item-label">My Documents</span>
                    </button>
                    <button className="start-menu-item" onClick={onClose}>
                        <img src="/icons/computer.png" alt="" className="start-menu-item-icon" />
                        <span className="start-menu-item-label">My Computer</span>
                    </button>
                    <button className="start-menu-item" onClick={onClose}>
                        <span className="start-menu-emoji">🌐</span>
                        <span className="start-menu-item-label">Internet Explorer</span>
                    </button>
                </div>

                {/* Right panel */}
                <div className="start-menu-right">
                    <button className="start-menu-right-item">
                        <span>📁</span> My Documents
                    </button>
                    <button className="start-menu-right-item">
                        <span>🖼️</span> My Pictures
                    </button>
                    <button className="start-menu-right-item">
                        <span>🎵</span> My Music
                    </button>
                    <button className="start-menu-right-item">
                        <span>🖥️</span> My Computer
                    </button>
                    <div className="start-menu-divider-h" />
                    <button className="start-menu-right-item">
                        <span>⚙️</span> Control Panel
                    </button>
                    <button className="start-menu-right-item">
                        <span>🖨️</span> Printers &amp; Faxes
                    </button>
                    <button className="start-menu-right-item">
                        <span>❓</span> Help and Support
                    </button>
                    <button className="start-menu-right-item">
                        <span>🔍</span> Search
                    </button>
                    <button className="start-menu-right-item">
                        <span>⚡</span> Run...
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="start-menu-footer">
                <button className="start-footer-btn" onClick={onClose}>
                    <span>🔒</span> Log Off
                </button>
                <button className="start-footer-btn" onClick={onClose}>
                    <span>⏻</span> Turn Off Computer
                </button>
            </div>
        </div>
    );
};

export default StartMenu;
