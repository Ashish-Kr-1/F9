import React, { memo, useCallback } from 'react';
import { useWindowManager } from '../../context/WindowContext';
import WindowFrame from '../Window/Window';
import './Desktop.css';
import Clippy from "../clippy-ai/Clippy";
// Desktop Icons configuration
import { DESKTOP_ICONS } from '../../config/icons';

const DesktopIcon = memo(({ icon, onDoubleClick }) => (
    <div
        className="desktop-icon"
        onDoubleClick={onDoubleClick}
        title={icon.label}
    >
        <div className="desktop-icon-img-wrap">
            <img src={icon.src} alt={icon.label} className="desktop-icon-img" draggable={false} />
        </div>
        <span className="desktop-icon-label">{icon.label}</span>
    </div>
));
DesktopIcon.displayName = 'DesktopIcon';

const Desktop = () => {
    const { windows, openWindow } = useWindowManager();

    const handleIconOpen = useCallback((icon) => {
        openWindow({
            appId: icon.appId,
            title: icon.title,
            component: icon.component,
            icon: icon.src,
            size: icon.defaultSize,
            minSize: icon.minSize,
        });
    }, [openWindow]);

    return (
        <div className="desktop-root" id="desktop-root">
            {/* Wallpaper is pure CSS via data-theme */}

            {/* Icon Grid */}
            <div className="desktop-icons-grid">
                {DESKTOP_ICONS.map(icon => (
                    <DesktopIcon
                        key={icon.appId}
                        icon={icon}
                        onDoubleClick={() => handleIconOpen(icon)}
                    />
                ))}
            </div>

            {/* Window Layer */}
            {windows.map(win => (
                <WindowFrame key={win.id} win={win} />
            ))}
            <Clippy />
        </div>
    );
};

export default Desktop;
