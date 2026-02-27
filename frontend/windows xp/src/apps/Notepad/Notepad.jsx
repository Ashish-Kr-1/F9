import React, { useState, useRef } from 'react';
import './Notepad.css';

const Notepad = () => {
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState('Untitled');
    const [wordWrap, setWordWrap] = useState(true);
    const textRef = useRef(null);

    const handleNew = () => {
        if (text && !window.confirm('Discard changes?')) return;
        setText('');
        setFileName('Untitled');
    };

    const handleSave = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
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
            <textarea
                ref={textRef}
                className="notepad-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                spellCheck={false}
                style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', overflowX: wordWrap ? 'hidden' : 'auto' }}
                placeholder="Type here..."
            />

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
