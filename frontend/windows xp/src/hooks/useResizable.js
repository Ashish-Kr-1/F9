import { useCallback, useRef } from 'react';
import { useWindowManager } from '../context/WindowContext';

const DIRECTIONS = {
    right: { dx: 1, dy: 0, dw: 1, dh: 0 },
    bottom: { dx: 0, dy: 0, dw: 0, dh: 1 },
    left: { dx: 1, dy: 0, dw: -1, dh: 0 },
    'bottom-right': { dx: 0, dy: 0, dw: 1, dh: 1 },
    'bottom-left': { dx: 1, dy: 0, dw: -1, dh: 1 },
};

export function useResizable(windowId) {
    const { windows, updatePosition, updateSize, focusWindow } = useWindowManager();
    const rafRef = useRef(null);

    const onResizeStart = useCallback(
        (e, direction) => {
            const win = windows.find(w => w.id === windowId);
            if (!win || win.maximized) return;

            e.preventDefault();
            e.stopPropagation();
            focusWindow(windowId);

            const dir = DIRECTIONS[direction];
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = win.size.width;
            const startH = win.size.height;
            const startPX = win.position.x;
            const startPY = win.position.y;
            const minW = win.minSize?.width || 200;
            const minH = win.minSize?.height || 150;

            let pendingW = startW, pendingH = startH, pendingX = startPX, pendingY = startPY;

            const onMouseMove = (e) => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                pendingW = Math.max(minW, startW + dx * dir.dw);
                pendingH = Math.max(minH, startH + dy * dir.dh);
                pendingX = startPX + (dir.dx ? dx : 0);
                pendingY = startPY + (dir.dy ? dy : 0);

                // Clamp left resize
                if (direction === 'left' || direction === 'bottom-left') {
                    const actualDx = startW - pendingW;
                    pendingX = startPX + actualDx;
                }

                if (!rafRef.current) {
                    rafRef.current = requestAnimationFrame(() => {
                        updateSize(windowId, { width: pendingW, height: pendingH });
                        if (dir.dx || direction === 'bottom-left') {
                            updatePosition(windowId, { x: pendingX, y: pendingY });
                        }
                        rafRef.current = null;
                    });
                }
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                if (rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        },
        [windowId, windows, updateSize, updatePosition, focusWindow]
    );

    return { onResizeStart };
}
