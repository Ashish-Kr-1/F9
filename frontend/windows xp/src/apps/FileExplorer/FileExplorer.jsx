import React, { useState } from 'react';
import './FileExplorer.css';

const FOLDERS = [
    {
        name: 'My Documents', icon: '📁', children: [
            { name: 'resume.pdf', icon: '📄', size: '124 KB' },
            { name: 'notes.txt', icon: '📝', size: '2 KB' },
            { name: 'photo.jpg', icon: '🖼️', size: '3.2 MB' },
        ]
    },
    {
        name: 'My Pictures', icon: '🖼️', children: [
            { name: 'vacation.jpg', icon: '🖼️', size: '2.1 MB' },
            { name: 'birthday.png', icon: '🖼️', size: '1.5 MB' },
        ]
    },
    {
        name: 'My Music', icon: '🎵', children: [
            { name: 'song.mp3', icon: '🎶', size: '4.8 MB' },
        ]
    },
    { name: 'Desktop', icon: '🖥️', children: [] },
    { name: 'Recycle Bin', icon: '🗑️', children: [] },
    { name: 'Control Panel', icon: '⚙️', children: [] },
];

const FileExplorer = () => {
    const [selected, setSelected] = useState(FOLDERS[0]);
    const [address, setAddress] = useState('C:\\Documents and Settings\\User\\My Documents');
    const [view, setView] = useState('details');

    const handleSelect = (folder) => {
        setSelected(folder);
        setAddress(`C:\\${folder.name}`);
    };

    return (
        <div className="explorer">
            {/* Toolbar */}
            <div className="explorer-toolbar">
                <button className="exp-btn" title="Back">◀</button>
                <button className="exp-btn" title="Forward">▶</button>
                <button className="exp-btn" title="Up">⬆</button>
                <div className="exp-sep" />
                <button className="exp-btn" title="Folders">📁 Folders</button>
                <button className="exp-btn" title="Search">🔍 Search</button>
                <div className="exp-sep" />
                <div className="exp-view-group">
                    {['list', 'details', 'icons'].map(v => (
                        <button
                            key={v}
                            className={`exp-btn ${view === v ? 'active' : ''}`}
                            onClick={() => setView(v)}
                            title={v}
                        >
                            {v === 'list' ? '☰' : v === 'details' ? '≡' : '⊞'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Address Bar */}
            <div className="explorer-address">
                <span className="exp-addr-label">Address</span>
                <div className="exp-addr-bar">
                    <span>🌐</span>
                    <input
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="exp-addr-input"
                    />
                </div>
                <button className="exp-go-btn">Go</button>
            </div>

            {/* Body */}
            <div className="explorer-body">
                {/* Sidebar */}
                <div className="explorer-sidebar">
                    <div className="sidebar-section-label">Folders</div>
                    {FOLDERS.map(f => (
                        <div
                            key={f.name}
                            className={`sidebar-item ${selected?.name === f.name ? 'active' : ''}`}
                            onClick={() => handleSelect(f)}
                        >
                            <span className="sidebar-icon">{f.icon}</span>
                            <span>{f.name}</span>
                        </div>
                    ))}
                </div>

                {/* File List */}
                <div className="explorer-files">
                    {view === 'details' && (
                        <table className="exp-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Type</th>
                                    <th>Modified</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected?.children?.length === 0 ? (
                                    <tr><td colSpan={4} className="exp-empty">This folder is empty.</td></tr>
                                ) : (
                                    selected?.children?.map(f => (
                                        <tr key={f.name} className="exp-row">
                                            <td className="exp-name-cell">
                                                <span className="exp-file-icon">{f.icon}</span>
                                                {f.name}
                                            </td>
                                            <td>{f.size || ''}</td>
                                            <td>{f.name.split('.').pop().toUpperCase() + ' File'}</td>
                                            <td>2/27/2006 09:00 AM</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {(view === 'icons' || view === 'list') && (
                        <div className={`exp-${view}-grid`}>
                            {selected?.children?.map(f => (
                                <div key={f.name} className="exp-icon-item">
                                    <span className="exp-icon-big">{f.icon}</span>
                                    <span className="exp-icon-label">{f.name}</span>
                                </div>
                            ))}
                            {selected?.children?.length === 0 && (
                                <div className="exp-empty">This folder is empty.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="explorer-statusbar">
                {selected?.children?.length || 0} object(s)
            </div>
        </div>
    );
};

export default FileExplorer;
