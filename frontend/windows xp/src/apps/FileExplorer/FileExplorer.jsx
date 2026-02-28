import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWindowManager } from '../../context/WindowContext';
import Notepad from '../Notepad/Notepad';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import './FileExplorer.css';

/**
 * FileExplorer supports three modes via the `mode` prop:
 *   - 'default' / undefined  →  normal file browsing (My Computer)
 *   - 'recycle-bin'           →  show soft-deleted files with restore/permanent-delete
 */
const FileExplorer = ({ mode }) => {
    const { api } = useAuth();
    const { openWindow } = useWindowManager();

    const isRecycleBin = mode === 'recycle-bin';

    const [rootNode, setRootNode] = useState(null);
    const [currentNode, setCurrentNode] = useState(null);
    const [children, setChildren] = useState([]);
    const [pathStack, setPathStack] = useState([]);
    const [view, setView] = useState('details');

    // Create UI
    const [isCreating, setIsCreating] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState('folder');

    // Rename UI
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Clipboard for Copy/Move
    const [clipboard, setClipboard] = useState(null); // { nodeId: string, action: 'copy' | 'cut' }

    // XP Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState(null);

    // ─── Lifecycle ───────────────────────────────────
    useEffect(() => {
        if (isRecycleBin) {
            fetchRecycleBin();
        } else {
            fetchRoot();
        }
    }, []);

    // ─── Data fetching ───────────────────────────────
    const fetchRoot = async () => {
        try {
            const res = await api.get('/vfs/root');
            if (res.data && res.data.id) {
                setRootNode(res.data);
                setCurrentNode(res.data);
                // Show Desktop folder as first child of root
                setPathStack([{ id: res.data.id, name: res.data.name }]);
                fetchChildren(res.data.id);
            }
        } catch (err) {
            console.error('Failed to fetch root', err);
        }
    };

    const fetchChildren = async (folderId) => {
        try {
            const res = await api.get(`/vfs/${folderId}/children`);
            setChildren(res.data);
        } catch (err) {
            console.error('Failed to fetch children', err);
        }
    };

    const fetchRecycleBin = async () => {
        try {
            const res = await api.get('/vfs/recycle-bin/list');
            setChildren(res.data);
            setPathStack([{ id: 'recycle-bin', name: 'Recycle Bin' }]);
        } catch (err) {
            console.error('Failed to fetch recycle bin', err);
        }
    };

    // ─── Address ─────────────────────────────────────
    const addressString = pathStack.map(p => p.name).join('\\') || 'C:';

    // ─── Navigation ──────────────────────────────────
    const navigateInto = (node) => {
        setCurrentNode(node);
        setPathStack(prev => [...prev, { id: node.id, name: node.name }]);
        fetchChildren(node.id);
    };

    const handleUp = () => {
        if (pathStack.length <= 1) return;
        const newStack = pathStack.slice(0, -1);
        const parentEntry = newStack[newStack.length - 1];
        setPathStack(newStack);
        setCurrentNode(parentEntry);
        fetchChildren(parentEntry.id);
    };

    // ─── Open node ───────────────────────────────────
    const handleOpenNode = (node) => {
        if (isRecycleBin) return; // Don't open files from recycle bin
        if (node.node_type === 'folder') {
            navigateInto(node);
        } else {
            openWindow({
                appId: `notepad-${node.id}`,
                title: node.name + ' - Notepad',
                component: Notepad,
                icon: 'https://win32.run/images/xp/icons/Notepad.png',
                componentProps: { fileNode: node },
                size: { width: 600, height: 400 },
                minSize: { width: 300, height: 200 },
            });
        }
    };

    // ─── Create ──────────────────────────────────────
    const handleCreate = async () => {
        if (!newItemName) return;
        try {
            await api.post('/vfs/create', {
                name: newItemName,
                type: newItemType,
                parentId: currentNode.id,
            });
            setIsCreating(false);
            setNewItemName('');
            fetchChildren(currentNode.id);
        } catch (err) {
            console.error(err);
        }
    };

    // ─── Delete (sends to Recycle Bin) ───────────────
    const requestDelete = (node) => {
        setConfirmDialog({
            icon: 'https://win32.run/images/xp/icons/RecycleBinempty.png',
            title: 'Confirm File Delete',
            message: `Are you sure you want to send '${node.name}' to the Recycle Bin?`,
            onYes: async () => {
                try {
                    await api.delete(`/vfs/${node.id}`);
                    if (isRecycleBin) fetchRecycleBin();
                    else fetchChildren(currentNode.id);
                } catch (err) {
                    console.error(err);
                }
                setConfirmDialog(null);
            },
            onNo: () => setConfirmDialog(null),
        });
    };

    // ─── Recycle Bin actions ─────────────────────────
    const handleRestore = async (nodeId) => {
        try {
            await api.patch(`/vfs/${nodeId}/restore`);
            fetchRecycleBin();
        } catch (err) {
            console.error(err);
        }
    };

    const requestPermanentDelete = (node) => {
        setConfirmDialog({
            icon: 'https://win32.run/images/xp/icons/RecycleBinempty.png',
            title: 'Confirm Permanent Delete',
            message: `Are you sure you want to permanently delete '${node.name}'? This cannot be undone.`,
            onYes: async () => {
                try {
                    await api.delete(`/vfs/${node.id}/permanent`);
                    fetchRecycleBin();
                } catch (err) {
                    console.error(err);
                }
                setConfirmDialog(null);
            },
            onNo: () => setConfirmDialog(null),
        });
    };

    // ─── Rename ──────────────────────────────────────
    const startRename = (node) => {
        setRenamingId(node.id);
        setRenameValue(node.name);
    };

    const commitRename = async (nodeId) => {
        if (!renameValue.trim()) { setRenamingId(null); return; }
        try {
            await api.patch(`/vfs/${nodeId}/rename`, { newName: renameValue.trim() });
            setRenamingId(null);
            fetchChildren(currentNode.id);
        } catch (err) {
            console.error(err);
        }
    };

    // ─── Clipboard ───────────────────────────────────
    const handleCopy = (node) => {
        setClipboard({ nodeId: node.id, action: 'copy', name: node.name });
    };

    const handleCut = (node) => {
        setClipboard({ nodeId: node.id, action: 'cut', name: node.name });
    };

    const handlePaste = async () => {
        if (!clipboard || !currentNode) return;
        try {
            if (clipboard.action === 'copy') {
                await api.post(`/vfs/${clipboard.nodeId}/copy`, {
                    newName: `${clipboard.name} - Copy`
                });
            } else if (clipboard.action === 'cut') {
                await api.patch(`/vfs/${clipboard.nodeId}/move`, {
                    targetParentId: currentNode.id
                });
                setClipboard(null); // Clear clipboard after move
            }
            fetchChildren(currentNode.id);
        } catch (err) {
            console.error('Paste failed', err);
        }
    };

    // ─── Tree-view state ─────────────────────────────
    const [treeData, setTreeData] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    // Build tree on root load
    useEffect(() => {
        if (rootNode) {
            buildTree(rootNode);
        }
    }, [rootNode]);

    const buildTree = async (root) => {
        try {
            const res = await api.get(`/vfs/${root.id}/children`);
            const folders = res.data.filter(n => n.node_type === 'folder');
            setTreeData({
                ...root,
                children: folders.map(f => ({ ...f, children: null })), // null = not loaded yet
            });
            setExpandedNodes(new Set([root.id]));
        } catch (err) {
            console.error('Tree build failed', err);
        }
    };

    // Recursively update a node inside the tree
    const updateNodeChildren = (node, targetId, newChildren) => {
        if (node.id === targetId) {
            return { ...node, children: newChildren };
        }
        if (!node.children) return node;
        return {
            ...node,
            children: node.children.map(child => updateNodeChildren(child, targetId, newChildren)),
        };
    };

    const toggleExpand = async (nodeId) => {
        const next = new Set(expandedNodes);
        if (next.has(nodeId)) {
            next.delete(nodeId);
            setExpandedNodes(next);
        } else {
            next.add(nodeId);
            setExpandedNodes(next);
            // Fetch children from API if not loaded yet
            try {
                const res = await api.get(`/vfs/${nodeId}/children`);
                const folders = res.data.filter(n => n.node_type === 'folder');
                setTreeData(prev => updateNodeChildren(prev, nodeId, folders.map(f => ({ ...f, children: null }))));
            } catch (err) {
                console.error('Failed to load tree children', err);
            }
        }
    };

    const handleTreeClick = (node) => {
        setCurrentNode(node);
        // rebuild path stack (simplified: root + this node)
        if (rootNode && node.id === rootNode.id) {
            setPathStack([{ id: node.id, name: node.name }]);
        } else {
            setPathStack([{ id: rootNode.id, name: rootNode.name }, { id: node.id, name: node.name }]);
        }
        fetchChildren(node.id);
    };

    // ─── Icons ───────────────────────────────────────
    const getIcon = (type) =>
        type === 'folder'
            ? 'https://win32.run/images/xp/icons/FolderClosed.png'
            : 'https://win32.run/images/xp/icons/Notepad.png';

    // Recursive tree node renderer
    const TreeNode = ({ node, depth = 0 }) => {
        const isExpanded = expandedNodes.has(node.id);
        const isActive = currentNode && currentNode.id === node.id;
        const hasChildren = node.children === null || (node.children && node.children.length > 0);

        const handleToggle = async (e) => {
            e.stopPropagation();
            const next = new Set(expandedNodes);
            if (next.has(node.id)) {
                next.delete(node.id);
                setExpandedNodes(next);
            } else {
                next.add(node.id);
                setExpandedNodes(next);
                // Fetch children for tree if not loaded
                try {
                    const res = await api.get(`/vfs/${node.id}/children`);
                    const folders = res.data.filter(n => n.node_type === 'folder');
                    setTreeData(prev => updateNodeChildren(prev, node.id, folders.map(f => ({ ...f, children: null }))));
                } catch (err) {
                    console.error('Failed to load tree children', err);
                }
            }
        };

        const handleNavigate = (e) => {
            e.stopPropagation();
            // Always navigate: update right panel
            setCurrentNode(node);
            if (rootNode && node.id === rootNode.id) {
                setPathStack([{ id: node.id, name: node.name }]);
            } else {
                setPathStack([{ id: rootNode.id, name: rootNode.name }, { id: node.id, name: node.name }]);
            }
            fetchChildren(node.id);
            // Auto-expand if not already expanded
            if (!expandedNodes.has(node.id)) {
                handleToggle(e);
            }
        };

        return (
            <div>
                <div
                    className={`tree-item ${isActive ? 'tree-active' : ''}`}
                    style={{ paddingLeft: 8 + depth * 16 }}
                    onClick={handleNavigate}
                >
                    <span className="tree-toggle" onClick={handleToggle}>{hasChildren ? (isExpanded ? '▾' : '▸') : ' '}</span>
                    <img src="https://win32.run/images/xp/icons/FolderClosed.png" alt="" className="tree-icon" />
                    <span className="tree-label">{node.name}</span>
                </div>
                {isExpanded && node.children && node.children.map(child => (
                    <TreeNode key={child.id} node={child} depth={depth + 1} />
                ))}
            </div>
        );
    };

    // ─── Render ──────────────────────────────────────
    return (
        <div className="explorer">
            {/* XP Confirm Dialog */}
            {confirmDialog && <ConfirmDialog {...confirmDialog} />}

            {/* Toolbar */}
            <div className="explorer-toolbar">
                {!isRecycleBin && (
                    <>
                        <button className="exp-btn" title="Back" onClick={handleUp} disabled={pathStack.length <= 1}>
                            ◀ Back
                        </button>
                        <button className="exp-btn" title="Up" onClick={handleUp} disabled={pathStack.length <= 1}>
                            ⬆ Up
                        </button>
                        <div className="exp-sep" />
                        <button className="exp-btn" title="New Folder" onClick={() => { setIsCreating(true); setNewItemType('folder'); }}>
                            📁 New Folder
                        </button>
                        <button className="exp-btn" title="New File" onClick={() => { setIsCreating(true); setNewItemType('file'); }}>
                            📄 New File
                        </button>
                        <div className="exp-sep" />
                        <button className="exp-btn" onClick={handlePaste} disabled={!clipboard} title={clipboard ? `Paste ${clipboard.name}` : "Nothing to paste"}>
                            📋 Paste
                        </button>
                    </>
                )}
                {isRecycleBin && (
                    <span style={{ padding: '2px 8px', fontWeight: 'bold', color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🗑️ Recycle Bin
                    </span>
                )}
                <div className="exp-view-group">
                    <button className={`exp-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List view">
                        ☰
                    </button>
                    <button className={`exp-btn ${view === 'details' ? 'active' : ''}`} onClick={() => setView('details')} title="Details view">
                        ≡
                    </button>
                    <button className={`exp-btn ${view === 'icons' ? 'active' : ''}`} onClick={() => setView('icons')} title="Icons view">
                        ⊞
                    </button>
                </div>
            </div>

            {/* Address Bar */}
            <div className="explorer-address">
                <span className="exp-addr-label">Address</span>
                <div className="exp-addr-bar">
                    <img
                        src={isRecycleBin
                            ? 'https://win32.run/images/xp/icons/RecycleBinempty.png'
                            : 'https://win32.run/images/xp/icons/explorerproperties.png'}
                        alt="" className="exp-addr-icon" />
                    <input value={addressString} readOnly className="exp-addr-input" />
                </div>
            </div>

            {/* Body */}
            <div className="explorer-body">
                {/* Tree-View Sidebar */}
                {!isRecycleBin && treeData && (
                    <div className="explorer-sidebar">
                        <div className="sidebar-section-label">Folders</div>
                        <TreeNode node={treeData} depth={0} />
                    </div>
                )}

                <div className="explorer-files" style={{ width: isRecycleBin ? '100%' : undefined }}>
                    {/* Create inline form */}
                    {isCreating && !isRecycleBin && (
                        <div style={{ padding: '8px', background: '#ece9d8', borderBottom: '1px solid #ccc', display: 'flex', gap: 4 }}>
                            <input
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder={`Enter ${newItemType} name`}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
                            />
                            <button onClick={handleCreate}>Save</button>
                            <button onClick={() => setIsCreating(false)}>Cancel</button>
                        </div>
                    )}

                    {/* Details view */}
                    {view === 'details' && (
                        <table className="exp-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>{isRecycleBin ? 'Deleted' : 'Created At'}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {children.length === 0 ? (
                                    <tr><td colSpan={4} className="exp-empty">
                                        {isRecycleBin ? 'Recycle Bin is empty.' : 'This folder is empty.'}
                                    </td></tr>
                                ) : (
                                    children.map(f => (
                                        <tr key={f.id} className="exp-row" onDoubleClick={() => handleOpenNode(f)}>
                                            <td className="exp-name-cell">
                                                <span className="exp-file-icon">
                                                    <img src={getIcon(f.node_type)} alt="" className="exp-img-icon" />
                                                </span>
                                                {renamingId === f.id ? (
                                                    <input
                                                        className="rename-input"
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onBlur={() => commitRename(f.id)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitRename(f.id); if (e.key === 'Escape') setRenamingId(null); }}
                                                        autoFocus
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span>{f.name}</span>
                                                )}
                                            </td>
                                            <td>{f.node_type}</td>
                                            <td>{new Date(isRecycleBin ? f.deleted_at : f.created_at).toLocaleDateString()}</td>
                                            <td>
                                                {isRecycleBin ? (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); handleRestore(f.id); }} title="Restore">♻️ Restore</button>
                                                        <button onClick={(e) => { e.stopPropagation(); requestPermanentDelete(f); }} title="Delete Permanently">❌ Delete</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); handleCopy(f); }} title="Copy">📋 Copy</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleCut(f); }} title="Cut">✂️ Cut</button>
                                                        <button onClick={(e) => { e.stopPropagation(); startRename(f); }} title="Rename">✏️ Rename</button>
                                                        <button onClick={(e) => { e.stopPropagation(); requestDelete(f); }} title="Delete">🗑️ Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* Icons / List view */}
                    {(view === 'icons' || view === 'list') && (
                        <div className={`exp-${view}-grid`}>
                            {children.map(f => (
                                <div key={f.id} className="exp-icon-item" onDoubleClick={() => handleOpenNode(f)}>
                                    <span className="exp-icon-big">
                                        <img src={getIcon(f.node_type)} alt="" className="exp-img-icon-big" />
                                    </span>
                                    {renamingId === f.id ? (
                                        <input
                                            className="rename-input"
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onBlur={() => commitRename(f.id)}
                                            onKeyDown={e => { if (e.key === 'Enter') commitRename(f.id); if (e.key === 'Escape') setRenamingId(null); }}
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="exp-icon-label">{f.name}</span>
                                    )}
                                    {isRecycleBin ? (
                                        <>
                                            <button className="del-btn-small" onClick={(e) => { e.stopPropagation(); handleRestore(f.id); }} title="Restore">♻️</button>
                                            <button className="del-btn-small" onClick={(e) => { e.stopPropagation(); requestPermanentDelete(f); }} title="Delete">❌</button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="del-btn-small" onClick={(e) => { e.stopPropagation(); handleCopy(f); }} title="Copy">📋</button>
                                            <button className="del-btn-small" onClick={(e) => { e.stopPropagation(); handleCut(f); }} title="Cut">✂️</button>
                                            <button className="del-btn-small" onClick={(e) => { e.stopPropagation(); startRename(f); }} title="Rename">✏️</button>
                                            <button className="del-btn-small" onClick={(e) => { e.stopPropagation(); requestDelete(f); }} title="Delete">🗑️</button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {children.length === 0 && (
                                <div className="exp-empty">
                                    {isRecycleBin ? 'Recycle Bin is empty.' : 'This folder is empty.'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="explorer-statusbar">
                {children.length} object(s)
            </div>
        </div>
    );
};

export default FileExplorer;
