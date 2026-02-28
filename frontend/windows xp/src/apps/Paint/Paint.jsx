import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Pencil, Eraser, PaintBucket, Square, Circle, Minus, Trash2, Save } from 'lucide-react';
import './Paint.css';

const COLORS = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
    '#ffa500', '#a52a2a', '#ffb6c1', '#90ee90', '#add8e6', '#dda0dd', '#f0e68c', '#e6e6e6',
];

const TOOLS = ['pencil', 'eraser', 'fill', 'rect', 'ellipse', 'line'];

const Paint = () => {
    const { api } = useAuth();
    const canvasRef = useRef(null);
    const [color, setColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [tool, setTool] = useState('pencil');
    const [lineWidth, setLineWidth] = useState(2);
    const [drawing, setDrawing] = useState(false);
    const [snapshot, setSnapshot] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState('painting.png');
    const [saveFolder, setSaveFolder] = useState(null);
    const [folders, setFolders] = useState([]);
    const startPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const floodFill = useCallback((ctx, x, y, fillColor) => {
        const canvas = canvasRef.current;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const targetColor = [...data.slice((Math.floor(y) * canvas.width + Math.floor(x)) * 4, (Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 4)];
        const fillRGB = [parseInt(fillColor.slice(1, 3), 16), parseInt(fillColor.slice(3, 5), 16), parseInt(fillColor.slice(5, 7), 16), 255];

        if (targetColor.every((v, i) => v === fillRGB[i])) return;

        const stack = [[Math.floor(x), Math.floor(y)]];
        while (stack.length) {
            const [cx, cy] = stack.pop();
            const idx = (cy * canvas.width + cx) * 4;
            if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;
            if (!targetColor.every((v, i) => data[idx + i] === v)) continue;
            fillRGB.forEach((v, i) => { data[idx + i] = v; });
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        ctx.putImageData(imgData, 0, 0);
    }, []);

    const onMouseDown = (e) => {
        const pos = getPos(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (tool === 'fill') {
            floodFill(ctx, pos.x, pos.y, color);
            return;
        }

        setDrawing(true);
        startPos.current = pos;
        setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = tool === 'eraser' ? bgColor : color;
        ctx.lineWidth = tool === 'eraser' ? lineWidth * 5 : lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const onMouseMove = (e) => {
        if (!drawing) return;
        const pos = getPos(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.strokeStyle = tool === 'eraser' ? bgColor : color;
        ctx.lineWidth = tool === 'eraser' ? lineWidth * 5 : lineWidth;
        ctx.lineCap = 'round';

        if (tool === 'pencil' || tool === 'eraser') {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else {
            ctx.putImageData(snapshot, 0, 0);
            ctx.beginPath();

            if (tool === 'rect') {
                ctx.strokeRect(startPos.current.x, startPos.current.y, pos.x - startPos.current.x, pos.y - startPos.current.y);
            } else if (tool === 'ellipse') {
                const rx = Math.abs(pos.x - startPos.current.x) / 2;
                const ry = Math.abs(pos.y - startPos.current.y) / 2;
                const cx = startPos.current.x + (pos.x - startPos.current.x) / 2;
                const cy = startPos.current.y + (pos.y - startPos.current.y) / 2;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (tool === 'line') {
                ctx.moveTo(startPos.current.x, startPos.current.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        }
    };

    const onMouseUp = () => setDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

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
            const myPics = allFolders.find(f => f.name === 'My Pictures');
            setSaveFolder(myPics || allFolders[0]);
        } catch (err) {
            console.error("Failed to load folders:", err);
        }
    };

    const handleSaveClick = async () => {
        await loadFolders();
        setShowSaveDialog(true);
    };

    const handleSaveToVFS = async () => {
        if (!saveName.trim() || !saveFolder) return;
        try {
            setSaving(true);
            const name = saveName.endsWith('.png') ? saveName : `${saveName}.png`;

            // Get canvas as base64 PNG
            const dataUrl = canvasRef.current.toDataURL('image/png');

            // Create VFS node
            const createRes = await api.post('/vfs/create', {
                name,
                type: 'file',
                parentId: saveFolder.id,
            });
            const newNode = createRes.data;

            // Save the PNG data to backend
            await api.post(`/files/${newNode.id}/content`, {
                text: dataUrl,
                mimeType: 'image/png'
            });

            setShowSaveDialog(false);
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save painting.");
        } finally {
            setSaving(false);
        }
    };

    const toolIcon = {
        pencil: <Pencil size={14} />,
        eraser: <Eraser size={14} />,
        fill: <PaintBucket size={14} />,
        rect: <Square size={14} />,
        ellipse: <Circle size={14} />,
        line: <Minus size={14} />
    };

    return (
        <div className="paint">
            {/* Menu */}
            <div className="paint-menubar">
                {['File', 'Edit', 'View', 'Image', 'Colors', 'Help'].map(m => (
                    <div key={m} className="paint-menu-item">{m}</div>
                ))}
            </div>

            <div className="paint-body">
                {/* Toolbox */}
                <div className="paint-toolbox">
                    {TOOLS.map(t => (
                        <button
                            key={t}
                            className={`paint-tool ${tool === t ? 'active' : ''}`}
                            onClick={() => setTool(t)}
                            title={t}
                        >
                            {toolIcon[t]}
                        </button>
                    ))}
                    <div className="paint-tool-sep" />
                    <div className="paint-label">Size</div>
                    {[1, 2, 4, 6].map(s => (
                        <button
                            key={s}
                            className={`paint-size-btn ${lineWidth === s ? 'active' : ''}`}
                            onClick={() => setLineWidth(s)}
                            title={`${s}px`}
                        >
                            <div style={{ width: s * 4, height: s * 4, background: '#000', borderRadius: '50%' }} />
                        </button>
                    ))}
                    <div className="paint-tool-sep" />
                    <button className="paint-action-btn" onClick={clearCanvas} title="Clear"><Trash2 size={14} /></button>
                    <button className="paint-action-btn" onClick={handleSaveClick} title="Save to My Pictures" disabled={saving}>
                        <Save size={14} />
                    </button>
                </div>

                {/* Canvas */}
                <div className="paint-canvas-wrap">
                    <canvas
                        ref={canvasRef}
                        width={580}
                        height={400}
                        className="paint-canvas"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    />
                </div>
            </div>

            {/* Color Palette */}
            <div className="paint-palette-bar">
                <div className="paint-active-colors">
                    <div className="paint-bg-swatch" style={{ background: bgColor }} title="Background" onClick={() => setBgColor(color)} />
                    <div className="paint-fg-swatch" style={{ background: color }} title="Foreground" />
                </div>
                <div className="paint-palette">
                    {COLORS.map(c => (
                        <div
                            key={c}
                            className="paint-color"
                            style={{ background: c }}
                            onClick={() => setColor(c)}
                            onContextMenu={e => { e.preventDefault(); setBgColor(c); }}
                            title={c}
                        />
                    ))}
                </div>
                <div className="paint-hint">Left click = foreground, Right click = background</div>
            </div>

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="paint-save-overlay">
                    <div className="paint-save-dialog">
                        <div className="paint-save-titlebar">
                            <span>Save As</span>
                            <button className="paint-save-close" onClick={() => setShowSaveDialog(false)}>×</button>
                        </div>
                        <div className="paint-save-body">
                            <label>
                                Save in:
                                <select
                                    value={saveFolder?.id || ''}
                                    onChange={e => setSaveFolder(folders.find(f => f.id === e.target.value))}
                                    className="paint-save-select"
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
                                    value={saveName}
                                    onChange={e => setSaveName(e.target.value)}
                                    className="paint-save-input"
                                    autoFocus
                                />
                            </label>
                        </div>
                        <div className="paint-save-actions">
                            <button onClick={handleSaveToVFS} disabled={saving} className="paint-save-btn save">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setShowSaveDialog(false)} className="paint-save-btn cancel">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Paint;
