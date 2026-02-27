import { useCallback, useRef } from 'react';
import { useWindowManager } from '../context/WindowContext';

export function useDraggable(windowId) {
    const { focusWindow, updatePosition, windows } = useWindowManager();
    const dragRef = useRef(null);
    const rafRef = useRef(null);

    const onMouseDown = useCallback(
        (e) => {
            const win = windows.find(w => w.id === windowId);
            if (!win || win.maximized) return;

            e.preventDefault();
            focusWindow(windowId);

            const startX = e.clientX - win.position.x;
            const startY = e.clientY - win.position.y;

            let pendingX = win.position.x;
            let pendingY = win.position.y;

            const onMouseMove = (e) => {
                pendingX = e.clientX - startX;
                pendingY = Math.max(0, e.clientY - startY);

                if (!rafRef.current) {
                    rafRef.current = requestAnimationFrame(() => {
                        updatePosition(windowId, { x: pendingX, y: pendingY });
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
        [windowId, windows, focusWindow, updatePosition]
    );

    return { onMouseDown };
}
