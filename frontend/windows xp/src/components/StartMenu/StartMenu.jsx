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
                        <img src="https://win32.run/images/xp/icons/FolderClosed.png" alt="" className="start-menu-item-icon" />
                        <span className="start-menu-item-label">My Documents</span>
                    </button>
                    <button className="start-menu-item" onClick={onClose}>
                        <img src="https://win32.run/images/xp/icons/MyComputer.png" alt="" className="start-menu-item-icon" />
                        <span className="start-menu-item-label">My Computer</span>
                    </button>
                    <button className="start-menu-item" onClick={onClose}>
                        <img src="https://win32.run/images/xp/icons/InternetExplorer6.png" alt="" className="start-menu-item-icon" />
                        <span className="start-menu-item-label">Internet Explorer</span>
                    </button>
                </div>

                {/* Right panel */}
                <div className="start-menu-right">
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/FolderClosed.png" alt="" className="start-menu-right-icon" /> My Documents
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/MyPictures.png" alt="" className="start-menu-right-icon" /> My Pictures
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/MyMusic.png" alt="" className="start-menu-right-icon" /> My Music
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/MyComputer.png" alt="" className="start-menu-right-icon" /> My Computer
                    </button>
                    <div className="start-menu-divider-h" />
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/ControlPanel.png" alt="" className="start-menu-right-icon" /> Control Panel
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/Programs.png" alt="" className="start-menu-right-icon" /> Printers &amp; Faxes
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/HelpandSupport.png" alt="" className="start-menu-right-icon" /> Help and Support
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/Search.png" alt="" className="start-menu-right-icon" /> Search
                    </button>
                    <button className="start-menu-right-item">
                        <img src="https://win32.run/images/xp/icons/Run.png" alt="" className="start-menu-right-icon" /> Run...
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="start-menu-footer">
                <button className="start-footer-btn" onClick={onClose}>
                    <img src="https://win32.run/images/xp/icons/Logout.png" alt="" className="start-footer-icon" /> Log Off
                </button>
                <button className="start-footer-btn" onClick={onClose}>
                    <img src="https://win32.run/images/xp/icons/Power.png" alt="" className="start-footer-icon" /> Turn Off Computer
                </button>
            </div>
        </div>
    );
};

export default StartMenu;
