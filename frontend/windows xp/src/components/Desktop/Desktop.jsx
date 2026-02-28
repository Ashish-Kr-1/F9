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
    const [desktopFiles, setDesktopFiles] = useState([]); // VFS files from Desktop folder
    const [iconPositions, setIconPositions] = useState(() => buildPositions(DESKTOP_ICONS));

    // Fetch VFS Desktop folder contents
    useEffect(() => {
        if (!user || !api) return;
        const fetchDesktopFiles = async () => {
            try {
                // First get root to find Desktop folder
                const rootRes = await api.get('/vfs/root');
                console.log('[Desktop Sync] Root:', rootRes.data);
                if (!rootRes.data || !rootRes.data.id) return;
                const childrenRes = await api.get(`/vfs/${rootRes.data.id}/children`);
                console.log('[Desktop Sync] Root children:', childrenRes.data);
                const desktopFolder = childrenRes.data.find(f => f.name === 'Desktop' && f.node_type === 'folder');
                if (!desktopFolder) {
                    console.warn('[Desktop Sync] No Desktop folder found among root children');
                    return;
                }
                console.log('[Desktop Sync] Desktop folder:', desktopFolder);
                const filesRes = await api.get(`/vfs/${desktopFolder.id}/children`);
                console.log('[Desktop Sync] Desktop files:', filesRes.data);
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
            <Clippy />
        </div>
    );
};

export default Desktop;
