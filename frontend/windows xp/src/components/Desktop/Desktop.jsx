import React, { memo, useCallback, useState, useRef } from 'react';
import { useWindowManager } from '../../context/WindowContext';
import WindowFrame from '../Window/Window';
import './Desktop.css';
import Clippy from "../clippy-ai/Clippy";
// Desktop Icons configuration
import { DESKTOP_ICONS } from '../../config/icons';

/**
 * DesktopIcon — draggable icon with double-click to launch.
 *
 * We maintain per-icon positions in local state so icons can be
 * rearranged without touching the window store.
 */
const DesktopIcon = memo(({ icon, position, onDoubleClick, onDragEnd }) => {
    const isDragging = useRef(false);
    const dragStartPos = useRef({ mx: 0, my: 0, ix: 0, iy: 0 });
    const [selected, setSelected] = useState(false);
    const clickTimer = useRef(null);

    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        isDragging.current = false;

        const startX = e.clientX;
        const startY = e.clientY;
        const startIconX = position.x;
        const startIconY = position.y;

        let lastX = startIconX;
        let lastY = startIconY;

        const onMouseMove = (mv) => {
            const dx = mv.clientX - startX;
            const dy = mv.clientY - startY;
            if (!isDragging.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
                isDragging.current = true;
            }
            if (isDragging.current) {
                lastX = startIconX + dx;
                lastY = startIconY + dy;
                onDragEnd(icon.appId, { x: lastX, y: lastY });
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [position, icon.appId, onDragEnd]);

    const handleClick = useCallback(() => {
        setSelected(true);
        // Clear selection after a delay
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => setSelected(false), 2000);
    }, []);

    const handleDoubleClick = useCallback(() => {
        if (clickTimer.current) clearTimeout(clickTimer.current);
        setSelected(false);
        onDoubleClick(icon);
    }, [icon, onDoubleClick]);

    return (
        <div
            className={`desktop-icon${selected ? ' selected' : ''}`}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                transform: 'none',
            }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            title={icon.label}
        >
            <div className="desktop-icon-img-wrap">
                <img src={icon.src} alt={icon.label} className="desktop-icon-img" draggable={false} />
            </div>
            <span className="desktop-icon-label">{icon.label}</span>
        </div>
    );
});
DesktopIcon.displayName = 'DesktopIcon';

/**
 * Build initial grid positions for desktop icons
 * 2 columns of icons, starting at top-left
 */
function buildInitialPositions() {
    const ICON_W = 86;
    const ICON_H = 80;
    const START_X = 10;
    const START_Y = 10;
    const COL_COUNT = 2;

    const positions = {};
    DESKTOP_ICONS.forEach((icon, i) => {
        const col = i % COL_COUNT;
        const row = Math.floor(i / COL_COUNT);
        positions[icon.appId] = {
            x: START_X + col * ICON_W,
            y: START_Y + row * ICON_H,
        };
    });
    return positions;
}

const Desktop = () => {
    const { windows, openWindow } = useWindowManager();
    const [iconPositions, setIconPositions] = useState(buildInitialPositions);

    const handleIconOpen = useCallback((icon) => {
        openWindow({
            appId: icon.appId,
            title: icon.title,
            component: icon.component,
            icon: icon.src,
            size: icon.defaultSize,
            minSize: icon.minSize,
            componentProps: icon.componentProps,
        });
    }, [openWindow]);

    const handleDragEnd = useCallback((appId, pos) => {
        setIconPositions(prev => ({ ...prev, [appId]: pos }));
    }, []);

    return (
        <div className="desktop-root" id="desktop-root">
            {/* Wallpaper is pure CSS via data-theme */}

            {/* Draggable Icon Layer */}
            <div className="desktop-icons-layer">
                {DESKTOP_ICONS.map(icon => (
                    <DesktopIcon
                        key={icon.appId}
                        icon={icon}
                        position={iconPositions[icon.appId] || { x: 10, y: 10 }}
                        onDoubleClick={handleIconOpen}
                        onDragEnd={handleDragEnd}
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
