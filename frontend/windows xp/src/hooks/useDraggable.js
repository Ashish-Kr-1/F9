import { useCallback, useRef, useEffect } from 'react';
import { useWindowManager } from '../context/WindowContext';

/**
 * useDraggable — performance-optimised drag hook.
 *
 * We store the current window state in a ref so the mousemove handler
 * never needs to close over the `windows` array from the store (which
 * would cause a new handler on every render / state update).
 */
export function useDraggable(windowId) {
    const { focusWindow, updatePosition, windows } = useWindowManager();
    const winRef = useRef(null);
    const rafRef = useRef(null);

    // Keep the ref up-to-date whenever windows changes
    useEffect(() => {
        winRef.current = windows.find(w => w.id === windowId) || null;
    }, [windows, windowId]);

    const onMouseDown = useCallback(
        (e) => {
            const win = winRef.current;
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
        // Only windowId and stable callbacks — NOT windows array
        [windowId, focusWindow, updatePosition]
    );

    return { onMouseDown };
}
