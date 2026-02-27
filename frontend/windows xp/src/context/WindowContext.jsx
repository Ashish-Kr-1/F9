import { createContext, useContext, useReducer, useCallback, useRef } from 'react';

const WindowContext = createContext(null);

const initialState = {
    windows: [],
    nextId: 1,
    highestZ: 100,
};

function windowReducer(state, action) {
    switch (action.type) {
        case 'OPEN_WINDOW': {
            // Check if already open (single instance apps)
            const existing = state.windows.find(w => w.appId === action.payload.appId);
            if (existing) {
                // restore and focus it
                return {
                    ...state,
                    highestZ: state.highestZ + 1,
                    windows: state.windows.map(w =>
                        w.id === existing.id
                            ? { ...w, minimized: false, focused: true, zIndex: state.highestZ + 1 }
                            : { ...w, focused: false }
                    ),
                };
            }
            const newWindow = {
                id: state.nextId,
                appId: action.payload.appId,
                title: action.payload.title,
                component: action.payload.component,
                icon: action.payload.icon,
                minimized: false,
                maximized: false,
                focused: true,
                zIndex: state.highestZ + 1,
                componentProps: action.payload.componentProps || {},
                position: action.payload.position || {
                    x: 80 + (state.nextId % 8) * 30,
                    y: 60 + (state.nextId % 6) * 25,
                },
                size: action.payload.size || { width: 640, height: 480 },
                minSize: action.payload.minSize || { width: 200, height: 150 },
            };
            return {
                ...state,
                nextId: state.nextId + 1,
                highestZ: state.highestZ + 1,
                windows: [
                    ...state.windows.map(w => ({ ...w, focused: false })),
                    newWindow,
                ],
            };
        }

        case 'CLOSE_WINDOW':
            return {
                ...state,
                windows: state.windows.filter(w => w.id !== action.id),
            };

        case 'MINIMIZE_WINDOW':
            return {
                ...state,
                windows: state.windows.map(w =>
                    w.id === action.id ? { ...w, minimized: true, focused: false } : w
                ),
            };

        case 'MAXIMIZE_WINDOW':
            return {
                ...state,
                windows: state.windows.map(w =>
                    w.id === action.id ? { ...w, maximized: !w.maximized } : w
                ),
            };

        case 'FOCUS_WINDOW':
            return {
                ...state,
                highestZ: state.highestZ + 1,
                windows: state.windows.map(w =>
                    w.id === action.id
                        ? { ...w, minimized: false, focused: true, zIndex: state.highestZ + 1 }
                        : { ...w, focused: false }
                ),
            };

        case 'UPDATE_POSITION':
            return {
                ...state,
                windows: state.windows.map(w =>
                    w.id === action.id ? { ...w, position: action.position } : w
                ),
            };

        case 'UPDATE_SIZE':
            return {
                ...state,
                windows: state.windows.map(w =>
                    w.id === action.id ? { ...w, size: action.size } : w
                ),
            };

        default:
            return state;
    }
}

export function WindowProvider({ children }) {
    const [state, dispatch] = useReducer(windowReducer, initialState);

    const openWindow = useCallback((config) => {
        dispatch({ type: 'OPEN_WINDOW', payload: config });
    }, []);

    const closeWindow = useCallback((id) => {
        dispatch({ type: 'CLOSE_WINDOW', id });
    }, []);

    const minimizeWindow = useCallback((id) => {
        dispatch({ type: 'MINIMIZE_WINDOW', id });
    }, []);

    const maximizeWindow = useCallback((id) => {
        dispatch({ type: 'MAXIMIZE_WINDOW', id });
    }, []);

    const focusWindow = useCallback((id) => {
        dispatch({ type: 'FOCUS_WINDOW', id });
    }, []);

    const updatePosition = useCallback((id, position) => {
        dispatch({ type: 'UPDATE_POSITION', id, position });
    }, []);

    const updateSize = useCallback((id, size) => {
        dispatch({ type: 'UPDATE_SIZE', id, size });
    }, []);

    return (
        <WindowContext.Provider
            value={{
                windows: state.windows,
                openWindow,
                closeWindow,
                minimizeWindow,
                maximizeWindow,
                focusWindow,
                updatePosition,
                updateSize,
            }}
        >
            {children}
        </WindowContext.Provider>
    );
}

export function useWindowManager() {
    const ctx = useContext(WindowContext);
    if (!ctx) throw new Error('useWindowManager must be used inside WindowProvider');
    return ctx;
}
