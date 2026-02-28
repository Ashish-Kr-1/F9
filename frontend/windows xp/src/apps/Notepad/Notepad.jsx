import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Notepad.css';

const Notepad = ({ windowId, fileNode }) => {
    const { api } = useAuth();
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState(fileNode ? fileNode.name : 'Untitled.txt');
    const [currentNode, setCurrentNode] = useState(fileNode || null);
    const [wordWrap, setWordWrap] = useState(true);
    const [loading, setLoading] = useState(!!fileNode);
    const [saving, setSaving] = useState(false);
    const [showDiscard, setShowDiscard] = useState(false);
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [saveAsName, setSaveAsName] = useState('Untitled.txt');
    const [saveAsFolder, setSaveAsFolder] = useState(null);
    const [folders, setFolders] = useState([]);
    const textRef = useRef(null);

    useEffect(() => {
        if (fileNode) {
            loadFile();
        }
    }, [fileNode]);

    const loadFile = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/files/${fileNode.id}/content`);
            setText(res.data.content || '');
            setFileName(fileNode.name);
            setCurrentNode(fileNode);
        } catch (error) {
            console.error("Failed to load file", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        if (text) {
            setShowDiscard(true);
            return;
        }
        setText('');
        setFileName('Untitled.txt');
        setCurrentNode(null);
    };

    const confirmDiscard = () => {
        setShowDiscard(false);
        setText('');
        setFileName('Untitled.txt');
        setCurrentNode(null);
    };

    // Load folder list for Save As dialog
    const loadFolders = async () => {
        try {
            const rootRes = await api.get('/vfs/root');
            const root = rootRes.data;
            const childrenRes = await api.get(`/vfs/${root.id}/children`);
            const allFolders = [
                { id: root.id, name: 'C: (Root)' },
                ...childrenRes.data.filter(n => n.node_type === 'folder')
            ];
            setFolders(allFolders);
            // Default to My Documents if it exists
            const myDocs = allFolders.find(f => f.name === 'My Documents');
            setSaveAsFolder(myDocs || allFolders[0]);
        } catch (err) {
            console.error("Failed to load folders for Save As:", err);
        }
    };

    const handleSave = async () => {
        if (currentNode) {
            // Save to existing VFS file
            try {
                setSaving(true);
                await api.post(`/files/${currentNode.id}/content`, { text });
            } catch (error) {
                console.error("Failed to save", error);
                alert("Failed to save file.");
            } finally {
                setSaving(false);
            }
        } else {
            // No file bound yet — show Save As dialog
            setSaveAsName(fileName.endsWith('.txt') ? fileName : `${fileName}.txt`);
            await loadFolders();
            setShowSaveAs(true);
        }
    };

    const handleSaveAs = async () => {
        if (!saveAsName.trim() || !saveAsFolder) return;

        try {
            setSaving(true);
            const name = saveAsName.endsWith('.txt') ? saveAsName : `${saveAsName}.txt`;

            // 1. Create a new VFS file node
            const createRes = await api.post('/vfs/create', {
                name,
                type: 'file',
                parentId: saveAsFolder.id,
            });
            const newNode = createRes.data;

            // 2. Save text content to the new file (GCS)
            await api.post(`/files/${newNode.id}/content`, { text });

            // 3. Bind Notepad to this file going forward
            setCurrentNode(newNode);
            setFileName(name);
            setShowSaveAs(false);
        } catch (error) {
            console.error("Save As failed:", error);
            alert("Failed to save file. The filename may already exist in that folder.");
        } finally {
            setSaving(false);
        }
    };

    const lines = text.split('\n').length;
    const chars = text.length;

    return (
        <div className="notepad">
            {/* Menu Bar */}
            <div className="notepad-menubar">
                {['File', 'Edit', 'Format', 'View', 'Help'].map(item => (
                    <div key={item} className="notepad-menu-item">{item}</div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="notepad-toolbar">
                <button onClick={handleNew} className="np-tool-btn">New</button>
                <button onClick={handleSave} className="np-tool-btn" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
                <div className="np-separator" />
                <label className="np-wrap-toggle">
                    <input
                        type="checkbox"
                        checked={wordWrap}
                        onChange={e => setWordWrap(e.target.checked)}
                    />
                    Word Wrap
                </label>
                <span className="np-filename-display">{fileName}{currentNode ? '' : ' (unsaved)'}</span>
            </div>

            {/* Text Area */}
            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                    Loading file...
                </div>
            ) : (
                <textarea
                    ref={textRef}
                    className="notepad-textarea"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    spellCheck={false}
                    style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', overflowX: wordWrap ? 'hidden' : 'auto' }}
                    placeholder="Type here..."
                />
            )}

            {/* Discard Confirmation Dialog */}
            {showDiscard && (
                <div className="notepad-saveas-overlay">
                    <div className="notepad-saveas-dialog">
                        <div className="saveas-titlebar">
                            <span>Notepad</span>
                            <button className="saveas-close" onClick={() => setShowDiscard(false)}>×</button>
                        </div>
                        <div className="saveas-body" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '28px' }}>⚠️</span>
                            <div>
                                <p style={{ margin: 0, fontSize: '12px', color: '#333' }}>The text in the {fileName} file has changed.</p>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#333' }}>Do you want to save the changes?</p>
                            </div>
                        </div>
                        <div className="saveas-actions" style={{ gap: '6px' }}>
                            <button className="saveas-btn save" onClick={() => { setShowDiscard(false); handleSave(); }}>Yes</button>
                            <button className="saveas-btn cancel" onClick={confirmDiscard}>No</button>
                            <button className="saveas-btn cancel" onClick={() => setShowDiscard(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save As Dialog */}
            {showSaveAs && (
                <div className="notepad-saveas-overlay">
                    <div className="notepad-saveas-dialog">
                        <div className="saveas-titlebar">
                            <span>Save As</span>
                            <button className="saveas-close" onClick={() => setShowSaveAs(false)}>×</button>
                        </div>
                        <div className="saveas-body">
                            <label>
                                Save in:
                                <select
                                    value={saveAsFolder?.id || ''}
                                    onChange={e => setSaveAsFolder(folders.find(f => f.id === e.target.value))}
                                    className="saveas-select"
                                >
                                    {folders.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                File name:
                                <input
                                    type="text"
                                    value={saveAsName}
                                    onChange={e => setSaveAsName(e.target.value)}
                                    className="saveas-input"
                                    autoFocus
                                />
                            </label>
                        </div>
                        <div className="saveas-actions">
                            <button onClick={handleSaveAs} disabled={saving} className="saveas-btn save">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setShowSaveAs(false)} className="saveas-btn cancel">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Bar */}
            <div className="notepad-statusbar">
                <span>Ln {lines}, Col 1</span>
                <span>{chars} chars</span>
                <span>UTF-8</span>
            </div>
        </div>
    );
};

export default Notepad;
