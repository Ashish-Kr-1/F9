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
            className={`xp-window-frame ${win.focused ? 'focused' : 'inactive'}`}
            style={style}
            onMouseDown={() => focusWindow(win.id)}
        >
            {/* Title Bar */}
            <div
                className={`xp-title-bar ${win.focused ? '' : 'inactive'}`}
                onMouseDown={onDragStart}
                onDoubleClick={() => maximizeWindow(win.id)}
            >
                <div className="xp-title-bar-left">
                    {win.icon && (
                        <img src={win.icon} alt="" className="xp-title-icon" />
                    )}
                    <span className="xp-title-text">{win.title}</span>
                </div>
                <div className="xp-title-bar-controls">
                    <button
                        className="xp-btn xp-btn-minimize"
                        aria-label="Minimize"
                        onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                        title="Minimize"
                    >
                        <span className="xp-btn-icon">_</span>
                    </button>
                    <button
                        className="xp-btn xp-btn-maximize"
                        aria-label={win.maximized ? 'Restore' : 'Maximize'}
                        onClick={(e) => { e.stopPropagation(); maximizeWindow(win.id); }}
                        title={win.maximized ? 'Restore' : 'Maximize'}
                    >
                        <span className="xp-btn-icon">{win.maximized ? '❐' : '□'}</span>
                    </button>
                    <button
                        className="xp-btn xp-btn-close"
                        aria-label="Close"
                        onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                        title="Close"
                    >
                        <span className="xp-btn-icon">✕</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="xp-window-content">
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
