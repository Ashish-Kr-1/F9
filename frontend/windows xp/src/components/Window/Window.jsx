import React, { memo } from 'react';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import { useWindowManager } from '../../context/WindowContext';
import './Window.css';

const WindowFrame = memo(({ win }) => {
    const { closeWindow, minimizeWindow, maximizeWindow, focusWindow } = useWindowManager();
    const { onMouseDown: onDragStart } = useDraggable(win.id);
    const { onResizeStart } = useResizable(win.id);

    const style = win.maximized
        ? {
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: 'calc(100vh - 36px)',
            zIndex: win.zIndex,
        }
        : {
            position: 'fixed',
            left: win.position.x,
            top: win.position.y,
            width: win.size.width,
            height: win.size.height,
            zIndex: win.zIndex,
            display: win.minimized ? 'none' : 'flex',
            flexDirection: 'column',
        };

    const WindowComponent = win.component;

    return (
        <div
            className={`window ${win.focused ? 'focused' : 'inactive'}`}
            style={style}
            onMouseDown={() => focusWindow(win.id)}
        >
            {/* Title Bar using xp.css standards */}
            <div
                className={`title-bar ${win.focused ? '' : 'inactive'}`}
                onMouseDown={onDragStart}
                onDoubleClick={() => maximizeWindow(win.id)}
            >
                <div className="title-bar-text" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {win.icon && (
                        <img src={win.icon} alt="" style={{ width: 16, height: 16, imageRendering: 'pixelated' }} />
                    )}
                    {win.title}
                </div>
                <div className="title-bar-controls">
                    <button
                        aria-label="Minimize"
                        onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                    ></button>
                    <button
                        aria-label={win.maximized ? 'Restore' : 'Maximize'}
                        onClick={(e) => { e.stopPropagation(); maximizeWindow(win.id); }}
                    ></button>
                    <button
                        aria-label="Close"
                        onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                    ></button>
                </div>
            </div>

            {/* Content wrapped in standard body */}
            <div className="window-body" style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                <WindowComponent windowId={win.id} {...(win.componentProps || {})} />
            </div>

            {/* Resize Handles */}
            {!win.maximized && (
                <>
                    <div className="resize-handle resize-right" onMouseDown={e => onResizeStart(e, 'right')} />
                    <div className="resize-handle resize-bottom" onMouseDown={e => onResizeStart(e, 'bottom')} />
                    <div className="resize-handle resize-left" onMouseDown={e => onResizeStart(e, 'left')} />
                    <div className="resize-handle resize-br" onMouseDown={e => onResizeStart(e, 'bottom-right')} />
                    <div className="resize-handle resize-bl" onMouseDown={e => onResizeStart(e, 'bottom-left')} />
                </>
            )}
        </div>
    );
});

WindowFrame.displayName = 'WindowFrame';
export default WindowFrame;
