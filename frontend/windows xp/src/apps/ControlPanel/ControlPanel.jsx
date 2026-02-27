import React, { useState } from 'react';
import { useTheme, THEMES } from '../../context/ThemeContext';
import './ControlPanel.css';

const ControlPanel = () => {
    const { theme, switchTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('display');

    const TABS = ['display', 'screen saver', 'appearance', 'desktop'];

    return (
        <div className="control-panel">
            {/* Category sidebar */}
            <div className="cp-sidebar">
                <div className="cp-sidebar-title">Control Panel</div>
                {['Display', 'System', 'Network', 'Sound', 'Firewall', 'User Accounts', 'Date &amp; Time'].map(item => (
                    <div key={item} className="cp-sidebar-item">
                        <span>⚙️</span>
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                    </div>
                ))}
            </div>

            {/* Main content */}
            <div className="cp-main">
                <div className="cp-header">Display Properties</div>

                {/* Tabs */}
                <div className="cp-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            className={`cp-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="cp-tab-content">
                    {activeTab === 'appearance' && (
                        <div className="cp-appearance">
                            <h3 className="cp-section-title">Windows and Buttons Style</h3>
                            <div className="cp-theme-grid">
                                {Object.values(THEMES).map(t => (
                                    <div
                                        key={t.id}
                                        className={`cp-theme-card ${theme === t.id ? 'selected' : ''}`}
                                        onClick={() => switchTheme(t.id)}
                                    >
                                        <div
                                            className="cp-theme-preview"
                                            style={{ background: `linear-gradient(135deg, ${t.preview} 0%, ${t.preview}aa 100%)` }}
                                        >
                                            <div className="cp-preview-titlebar" style={{ background: t.preview }}>
                                                <span>Sample Window</span>
                                                <div className="cp-preview-btns">
                                                    <div />
                                                    <div />
                                                    <div style={{ background: '#c00' }} />
                                                </div>
                                            </div>
                                            <div className="cp-preview-body">
                                                <div className="cp-preview-text">Text Sample</div>
                                                <div className="cp-preview-btn" style={{ background: t.preview }}>Button</div>
                                            </div>
                                        </div>
                                        <div className="cp-theme-name">
                                            {theme === t.id && <span className="cp-check">✓ </span>}
                                            {t.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="cp-apply-row">
                                <button className="cp-apply-btn" onClick={() => { }}>OK</button>
                                <button className="cp-apply-btn" onClick={() => { }}>Cancel</button>
                                <button className="cp-apply-btn primary" onClick={() => { }}>Apply</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'display' && (
                        <div className="cp-display">
                            <h3 className="cp-section-title">Screen Resolution</h3>
                            <div className="cp-monitor-preview">
                                <div className="cp-monitor-screen">
                                    <div className="cp-monitor-desktop">
                                        <div className="cp-monitor-window">
                                            <div className="cp-monitor-title">My Documents</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="cp-monitor-stand" />
                                <div className="cp-monitor-base" />
                            </div>
                            <div className="cp-slider-row">
                                <span>Less</span>
                                <input type="range" min="800" max="1920" defaultValue="1024" className="cp-slider" />
                                <span>More</span>
                            </div>
                            <div className="cp-res-label">1024 × 768 pixels</div>

                            <h3 className="cp-section-title" style={{ marginTop: 16 }}>Color Quality</h3>
                            <select className="cp-select">
                                <option>Highest (32 bit)</option>
                                <option>Medium (16 bit)</option>
                                <option>Low (8 bit)</option>
                            </select>
                        </div>
                    )}

                    {activeTab === 'desktop' && (
                        <div className="cp-desktop-tab">
                            <h3 className="cp-section-title">Desktop Wallpaper</h3>
                            <div className="cp-wallpaper-list">
                                {['Bliss', 'Azul', 'Harmony', 'Luna', 'None'].map(w => (
                                    <div key={w} className="cp-wallpaper-item">
                                        <input type="radio" name="wallpaper" id={`wp-${w}`} defaultChecked={w === 'Bliss'} />
                                        <label htmlFor={`wp-${w}`}>{w}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'screen saver' && (
                        <div className="cp-screensaver">
                            <h3 className="cp-section-title">Screen Saver</h3>
                            <select className="cp-select" defaultValue="none">
                                <option value="none">(None)</option>
                                <option value="blank">Blank</option>
                                <option value="bubbles">Bubbles</option>
                                <option value="marquee">Marquee</option>
                            </select>
                            <div className="cp-hint">Wait: <input type="number" defaultValue={10} min={1} max={999} style={{ width: 50 }} /> minutes</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ControlPanel;
