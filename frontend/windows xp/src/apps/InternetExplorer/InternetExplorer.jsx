import React, { useState, useRef } from 'react';
import './InternetExplorer.css';

const DEFAULT_URL = 'https://www.wikipedia.org';

const BOOKMARKS = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'Google', url: 'https://www.google.com/webhp?igu=1' },
    { name: 'Archive.org', url: 'https://web.archive.org/' },
    { name: 'CNN', url: 'https://lite.cnn.com/' },
];

// XP-style toolbar icons (win32.run sources)
const ICONS = {
    back: 'https://win32.run/images/xp/icons/Back.png',
    forward: 'https://win32.run/images/xp/icons/Forward.png',
    stop: 'https://win32.run/images/xp/icons/Stop.png',
    refresh: 'https://win32.run/images/xp/icons/Refresh.png',
    home: 'https://win32.run/images/xp/icons/Home.png',
    fav: 'https://win32.run/images/xp/icons/Favorites.png',
    ie: 'https://win32.run/images/xp/icons/InternetExplorer6.png',
    network: 'https://win32.run/images/xp/icons/Internet.png',
};

const InternetExplorer = () => {
    const [url, setUrl] = useState(DEFAULT_URL);
    const [addressBar, setAddressBar] = useState(DEFAULT_URL);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [history, setHistory] = useState([DEFAULT_URL]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const iframeRef = useRef(null);

    const navigate = (targetUrl) => {
        let finalUrl = targetUrl.trim();
        if (!finalUrl) return;
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
        }
        setUrl(finalUrl);
        setAddressBar(finalUrl);
        setLoading(true);
        setError(false);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(finalUrl);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleGo = () => navigate(addressBar);
    const handleKeyDown = (e) => { if (e.key === 'Enter') handleGo(); };

    const handleBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const prevUrl = history[newIndex];
            setUrl(prevUrl); setAddressBar(prevUrl);
            setLoading(true); setError(false);
        }
    };

    const handleForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const nextUrl = history[newIndex];
            setUrl(nextUrl); setAddressBar(nextUrl);
            setLoading(true); setError(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true); setError(false);
        if (iframeRef.current) iframeRef.current.src = url;
    };

    const handleStop = () => {
        setLoading(false);
        if (iframeRef.current) iframeRef.current.src = 'about:blank';
    };

    const handleHome = () => navigate(DEFAULT_URL);
    const handleIframeLoad = () => setLoading(false);
    const handleIframeError = () => { setLoading(false); setError(true); };

    return (
        <div className="ie-browser">
            {/* Menu Bar */}
            <div className="ie-menubar">
                {['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'].map(item => (
                    <div key={item} className="ie-menu-item">{item}</div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="ie-toolbar">
                <button className="ie-nav-btn" onClick={handleBack} disabled={historyIndex <= 0} title="Back">
                    <img src={ICONS.back} alt="" className="ie-btn-icon-img" />
                    <span className="ie-btn-text">Back</span>
                </button>
                <button className="ie-nav-btn" onClick={handleForward} disabled={historyIndex >= history.length - 1} title="Forward">
                    <img src={ICONS.forward} alt="" className="ie-btn-icon-img" />
                    <span className="ie-btn-text">Forward</span>
                </button>

                <div className="ie-toolbar-sep" />

                <button className="ie-nav-btn" onClick={handleStop} title="Stop" disabled={!loading}>
                    <img src={ICONS.stop} alt="" className="ie-btn-icon-img" />
                    <span className="ie-btn-text">Stop</span>
                </button>
                <button className="ie-nav-btn" onClick={handleRefresh} title="Refresh">
                    <img src={ICONS.refresh} alt="" className="ie-btn-icon-img" />
                    <span className="ie-btn-text">Refresh</span>
                </button>
                <button className="ie-nav-btn" onClick={handleHome} title="Home">
                    <img src={ICONS.home} alt="" className="ie-btn-icon-img" />
                    <span className="ie-btn-text">Home</span>
                </button>

                <div className="ie-toolbar-sep" />

                {/* Bookmarks */}
                {BOOKMARKS.map(b => (
                    <button key={b.name} className="ie-bookmark-btn" onClick={() => navigate(b.url)} title={b.url}>
                        <img src={ICONS.fav} alt="" className="ie-bookmark-icon" />
                        {b.name}
                    </button>
                ))}

                {/* Animated globe when loading */}
                <div className="ie-loading-globe" title={loading ? 'Loading...' : 'Done'}>
                    <img
                        src={ICONS.ie}
                        alt=""
                        className={`ie-globe-img ${loading ? 'spinning' : ''}`}
                    />
                </div>
            </div>

            {/* Address Bar */}
            <div className="ie-address-bar">
                <span className="ie-address-label">Address</span>
                <div className="ie-address-input-wrap">
                    <img src={ICONS.ie} alt="" className="ie-address-icon" />
                    <input
                        className="ie-address-input"
                        value={addressBar}
                        onChange={(e) => setAddressBar(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter a URL..."
                    />
                </div>
                <button className="ie-go-btn" onClick={handleGo}>Go</button>
            </div>

            {/* Content Area */}
            <div className="ie-content">
                {loading && (
                    <div className="ie-loading-bar">
                        <div className="ie-loading-progress" />
                    </div>
                )}

                {error && (
                    <div className="ie-error-page">
                        <img src={ICONS.ie} alt="" style={{ width: 48, height: 48, marginBottom: 16, imageRendering: 'pixelated' }} />
                        <h2>This page can't be displayed</h2>
                        <p>The webpage at <strong>{url}</strong> might be temporarily down, or it may have refused to be loaded in a frame (X-Frame-Options or CORS restriction).</p>
                        <div className="ie-error-suggestions">
                            <h3>Try again:</h3>
                            <ul>
                                <li>Click the <strong>Refresh</strong> button, or try again later.</li>
                                <li>Some websites block framing for security reasons — this is normal.</li>
                                <li>Try visiting <strong>Wikipedia</strong> or <strong>Archive.org</strong> which work great inside Internet Explorer.</li>
                            </ul>
                        </div>
                        <button className="ie-retry-btn" onClick={handleRefresh}>
                            Try Again
                        </button>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    className="ie-iframe"
                    src={url}
                    title="Internet Explorer"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    style={{ display: error ? 'none' : 'block' }}
                />
            </div>

            {/* Status Bar */}
            <div className="ie-statusbar">
                <span className="ie-status-text">
                    {loading ? 'Opening page...' : 'Done'}
                </span>
                <span className="ie-status-zone">
                    <img src={ICONS.network} alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', imageRendering: 'pixelated', marginRight: 4 }} />
                    Internet
                </span>
            </div>
        </div>
    );
};

export default InternetExplorer;
