import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Notepad.css';

const Notepad = ({ windowId, fileNode }) => {
    const { api } = useAuth();
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState(fileNode ? fileNode.name : 'Untitled');
    const [wordWrap, setWordWrap] = useState(true);
    const [loading, setLoading] = useState(!!fileNode);
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
            console.log(res.data);
            setText(res.data.content || '');
            setFileName(fileNode.name);
        } catch (error) {
            console.error("Failed to load file", error);
            alert("Failed to load file content.");
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        if (text && !window.confirm('Discard changes?')) return;
        setText('');
        setFileName('Untitled');
        // Unbind from node? We can't actually change the props of the window easily right here.
        // It's just a visual clear for now.
    };

    const handleSave = async () => {
        if (fileNode) {
            // Save to backend VFS
            try {
                await api.post(`/files/${fileNode.id}/content`, { text });
            } catch (error) {
                console.error("Failed to save", error);
                alert("Failed to save to VFS.");
            }
        } else {
            // Local download fallback
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.txt`;
            a.click();
            URL.revokeObjectURL(url);
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

            {/* Toolbar stand-in (Format > Word Wrap) */}
            <div className="notepad-toolbar">
                <button onClick={handleNew} className="np-tool-btn">New</button>
                <button onClick={handleSave} className="np-tool-btn">Save</button>
                <div className="np-separator" />
                <label className="np-wrap-toggle">
                    <input
                        type="checkbox"
                        checked={wordWrap}
                        onChange={e => setWordWrap(e.target.checked)}
                    />
                    Word Wrap
                </label>
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
