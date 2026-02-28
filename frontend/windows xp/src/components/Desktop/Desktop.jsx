import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { useWindowManager } from '../../context/WindowContext';
import { useAuth } from '../../context/AuthContext';
import WindowFrame from '../Window/Window';
import './Desktop.css';
import Clippy from "../clippy-ai/Clippy";
import Notepad from '../../apps/Notepad/Notepad';
// Desktop Icons configuration
import { DESKTOP_ICONS } from '../../config/icons';

/**
 * DesktopIcon — draggable icon with double-click to launch.
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
                onDragEnd(icon.appId || icon.id, { x: lastX, y: lastY });
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [position, icon.appId || icon.id, onDragEnd]);

    const handleClick = useCallback(() => {
        setSelected(true);
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
 * Build initial grid positions for all icons (static + dynamic)
 */
function buildPositions(icons, startIndex = 0) {
    const ICON_W = 86;
    const ICON_H = 80;
    const START_X = 10;
    const START_Y = 10;
    const COL_COUNT = 2;

    const positions = {};
    icons.forEach((icon, i) => {
        const idx = startIndex + i;
        const col = idx % COL_COUNT;
        const row = Math.floor(idx / COL_COUNT);
        positions[icon.appId || icon.id] = {
            x: START_X + col * ICON_W,
            y: START_Y + row * ICON_H,
        };
    });
    return positions;
}

const Desktop = () => {
    const { windows, openWindow } = useWindowManager();
    const { api, user } = useAuth();
    const [desktopFiles, setDesktopFiles] = useState([]);
    const [iconPositions, setIconPositions] = useState(() => buildPositions(DESKTOP_ICONS));
    const [showEasterEgg, setShowEasterEgg] = useState(false);

    // 🥚 Konami Code Easter Egg: ↑↑↓↓←→←→BA
    useEffect(() => {
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIdx = 0;
        const handleKonami = (e) => {
            if (e.key === konamiCode[konamiIdx]) {
                konamiIdx++;
                if (konamiIdx === konamiCode.length) {
                    setShowEasterEgg(true);
                    konamiIdx = 0;
                }
            } else {
                konamiIdx = 0;
            }
        };
        window.addEventListener('keydown', handleKonami);
        return () => window.removeEventListener('keydown', handleKonami);
    }, []);

    // Fetch VFS Desktop folder contents
    useEffect(() => {
        if (!user || !api) return;

        const fetchDesktopFiles = async () => {
            try {
                const rootRes = await api.get('/vfs/root');
                if (!rootRes.data || !rootRes.data.id) return;
                const childrenRes = await api.get(`/vfs/${rootRes.data.id}/children`);
                const desktopFolder = childrenRes.data.find(f => f.name === 'Desktop' && f.node_type === 'folder');
                if (!desktopFolder) return;
                const filesRes = await api.get(`/vfs/${desktopFolder.id}/children`);
                setDesktopFiles(filesRes.data.map(f => ({
                    ...f,
                    appId: `desktop-file-${f.id}`,
                    label: f.name,
                    src: f.node_type === 'folder'
                        ? 'https://win32.run/images/xp/icons/FolderClosed.png'
                        : 'https://win32.run/images/xp/icons/Notepad.png',
                    isVfsFile: true,
                })));
            } catch (err) {
                console.error('[Desktop Sync] Failed:', err);
            }
        };

        fetchDesktopFiles();

        // Auto-sync every 10 seconds
        const interval = setInterval(fetchDesktopFiles, 10000);

        // Also sync on window focus
        const onFocus = () => fetchDesktopFiles();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [user, api]);

    // Rebuild positions when desktopFiles change (append after static icons)
    useEffect(() => {
        if (desktopFiles.length > 0) {
            setIconPositions(prev => ({
                ...prev,
                ...buildPositions(desktopFiles, DESKTOP_ICONS.length),
            }));
        }
    }, [desktopFiles]);

    const allIcons = [...DESKTOP_ICONS, ...desktopFiles];

    const handleIconOpen = useCallback((icon) => {
        if (icon.isVfsFile) {
            // Open VFS file/folder in Notepad (files) or FileExplorer (folders)
            if (icon.node_type === 'folder') {
                const FileExplorer = DESKTOP_ICONS.find(i => i.appId === 'my-computer')?.component;
                if (FileExplorer) {
                    openWindow({
                        appId: `explorer-${icon.id}`,
                        title: icon.name,
                        component: FileExplorer,
                        icon: 'https://win32.run/images/xp/icons/FolderClosed.png',
                        size: { width: 680, height: 480 },
                        minSize: { width: 300, height: 200 },
                    });
                }
            } else {
                openWindow({
                    appId: `notepad-${icon.id}`,
                    title: icon.name + ' - Notepad',
                    component: Notepad,
                    icon: 'https://win32.run/images/xp/icons/Notepad.png',
                    componentProps: { fileNode: icon },
                    size: { width: 600, height: 400 },
                    minSize: { width: 300, height: 200 },
                });
            }
        } else {
            openWindow({
                appId: icon.appId,
                title: icon.title,
                component: icon.component,
                icon: icon.src,
                size: icon.defaultSize,
                minSize: icon.minSize,
                componentProps: icon.componentProps,
            });
        }
    }, [openWindow]);

    const handleDragEnd = useCallback((appId, pos) => {
        setIconPositions(prev => ({ ...prev, [appId]: pos }));
    }, []);

    return (
        <div className="desktop-root" id="desktop-root">
            {/* Draggable Icon Layer */}
            <div className="desktop-icons-layer">
                {allIcons.map(icon => (
                    <DesktopIcon
                        key={icon.appId || icon.id}
                        icon={icon}
                        position={iconPositions[icon.appId || icon.id] || { x: 10, y: 10 }}
                        onDoubleClick={handleIconOpen}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </div>

            {/* Window Layer */}
            {windows.map(win => (
                <WindowFrame key={win.id} win={win} />
            ))}

            {/* 🥚 Konami Code Easter Egg Popup */}
            {showEasterEgg && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 99999
                }} onClick={() => setShowEasterEgg(false)}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
                        border: '3px solid #e94560', borderRadius: '12px', padding: '40px',
                        textAlign: 'center', maxWidth: '420px', color: '#fff',
                        boxShadow: '0 0 40px rgba(233,69,96,0.4)', fontFamily: 'Tahoma, sans-serif'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆🎮🎉</div>
                        <h2 style={{ margin: '0 0 8px', color: '#e94560', fontSize: '22px' }}>You found the Easter Egg!</h2>
                        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#ddd', lineHeight: '1.5' }}>
                            Built with ❤️ for <strong style={{ color: '#e94560' }}>Ojass 2026</strong> — Hack de Science
                        </p>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#aaa' }}>
                            Team F9 thanks the Ojass organizing committee for creating this incredible hackathon platform.
                        </p>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '16px' }}>
                            ↑↑↓↓←→←→BA • Click anywhere to close
                        </div>
                    </div>
                </div>
            )}

            <Clippy />
        </div>
    );
};

export default Desktop;
