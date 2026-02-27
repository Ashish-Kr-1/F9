import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './CommandPrompt.css';

const WELCOME_TEXT = `Microsoft Windows XP [Version 5.1.2600]
(C) Copyright 1985-2001 Microsoft Corp.
`;

export default function CommandPrompt() {
    const { api } = useAuth();
    const [history, setHistory] = useState([{ type: 'output', text: WELCOME_TEXT }]);
    const [input, setInput] = useState('');
    const [currentPathStack, setCurrentPathStack] = useState([{ id: null, name: 'C:' }]);
    const [currentNode, setCurrentNode] = useState(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Initial setup to fetch root node and seed state
    useEffect(() => {
        const initVfs = async () => {
            try {
                const res = await api.get('/vfs/root');
                if (res.data) {
                    setCurrentNode(res.data);
                    setCurrentPathStack([{ id: res.data.id, name: 'C:' }]);
                }
            } catch (err) {
                console.error("Terminal could not connect to VFS", err);
                printLine("Error: VFS connection failed. Some commands may not work.");
            }
        };
        initVfs();
    }, [api]);

    // Scroll to bottom whenever history changes
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [history]);

    // Focus input on any click within the window
    const handleContainerClick = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const printLine = (text) => {
        setHistory(prev => [...prev, { type: 'output', text }]);
    };

    const getCurrentPathString = () => {
        return currentPathStack.map(p => p.name).join('\\') + '>';
    };

    const handleCommand = async (e) => {
        if (e.key === 'Enter') {
            const rawCmd = input.trim();
            const cmdPromptStr = getCurrentPathString();

            // Print user command immediately
            setHistory(prev => [...prev, { type: 'input', text: `${cmdPromptStr} ${rawCmd}` }]);
            setInput('');

            // Send context global OS event for Clippy
            window.dispatchEvent(new CustomEvent('clippyContext', {
                detail: { action: `User ran terminal command: ${rawCmd}` }
            }));

            if (!rawCmd) return;

            const [cmd, ...args] = rawCmd.split(' ');
            const arg = args.join(' ');

            try {
                await executeCommand(cmd.toLowerCase(), arg, args);
            } catch (err) {
                printLine(`Command error: ${err.message || 'Unknown error occurred.'}`);
            }
        }
    };

    // The command processor
    const executeCommand = async (cmd, arg, args) => {
        switch (cmd) {
            case 'cls':
            case 'clear':
                setHistory([]);
                break;

            case 'help':
                printLine(`Supported commands:
  CD      Displays the name of or changes the current directory.
  CLS     Clears the screen.
  DEL     Deletes one or more files.
  DIR     Displays a list of files and subdirectories in a directory.
  ECHO    Displays messages, or turns command-echoing on or off.
  HELP    Provides Help information for Windows commands.
  MKDIR   Creates a directory.
  MD      Creates a directory.
  RMDIR   Removes a directory.
  RD      Removes a directory.
  EXIT    Quits the CMD.EXE program (or close window).`);
                break;

            case 'dir':
            case 'ls':
                if (!currentNode) {
                    printLine("VFS not ready.");
                    return;
                }
                const dirRes = await api.get(`/vfs/${currentNode.id}/children`);
                const children = dirRes.data;
                if (children.length === 0) {
                    printLine(" No items found.");
                } else {
                    let dirStr = ` Directory of ${getCurrentPathString().replace('>', '')}\n\n`;
                    let fileCount = 0;
                    let dirCount = 0;
                    children.forEach(c => {
                        const isDir = c.node_type === 'folder';
                        if (isDir) dirCount++; else fileCount++;
                        const typeStr = isDir ? '<DIR>' : '     ';
                        dirStr += `01/01/2005  12:00 PM    ${typeStr}          ${c.name}\n`;
                    });
                    dirStr += `\n              ${fileCount} File(s)              0 bytes`;
                    dirStr += `\n              ${dirCount} Dir(s)   99,999,999,999 bytes free`;
                    printLine(dirStr);
                }
                break;

            case 'cd':
                if (!arg) {
                    printLine(getCurrentPathString().replace('>', ''));
                    return;
                }

                if (arg === '..' || arg === '../') {
                    if (currentPathStack.length > 1) {
                        const newStack = [...currentPathStack];
                        newStack.pop();
                        const parentEntry = newStack[newStack.length - 1];
                        setCurrentPathStack(newStack);

                        // We need to fetch the actual node info for the parent depending on endpoints
                        // Since we just have the ID, we could fetch root and traverse down or rely on a specific node fetch API
                        // Since there isn't a fetch single node API exactly, let's just cheat and try to fetch children of its parent
                        // Wait, we just keep the active node as an ID and fetch children of IT locally.
                        const vfsMockNode = { id: parentEntry.id, name: parentEntry.name };
                        setCurrentNode(vfsMockNode);
                    }
                    return;
                } else {
                    // cd <folder>
                    const childrenRes = await api.get(`/vfs/${currentNode.id}/children`);
                    const child = childrenRes.data.find(c => c.name.toLowerCase() === arg.toLowerCase() && c.node_type === 'folder');
                    if (child) {
                        setCurrentPathStack(prev => [...prev, { id: child.id, name: child.name }]);
                        setCurrentNode(child);
                    } else {
                        printLine(`The system cannot find the path specified.`);
                    }
                }
                break;

            case 'mkdir':
            case 'md':
                if (!arg) {
                    printLine('The syntax of the command is incorrect.');
                    return;
                }
                await api.post('/vfs/create', { name: arg, type: 'folder', parentId: currentNode.id });
                break;

            case 'echo':
                // Check if it's echoing into a file
                if (args.includes('>')) {
                    const arrowIndex = args.indexOf('>');
                    const content = args.slice(0, arrowIndex).join(' ');
                    const filename = args.slice(arrowIndex + 1).join(' ');
                    if (filename) {
                        try {
                            const res = await api.post('/vfs/create', { name: filename, type: 'file', parentId: currentNode.id });
                            printLine(''); // Success silently
                        } catch (err) {
                            printLine(`Error creating file: ${err.message}`);
                        }
                        return;
                    }
                }
                printLine(arg);
                break;

            case 'del':
            case 'rm':
            case 'rmdir':
            case 'rd':
                if (!arg) {
                    printLine('The syntax of the command is incorrect.');
                    return;
                }
                const delRes = await api.get(`/vfs/${currentNode.id}/children`);
                const fileToDel = delRes.data.find(c => c.name.toLowerCase() === arg.toLowerCase());
                if (fileToDel) {
                    await api.delete(`/vfs/${fileToDel.id}`);
                } else {
                    printLine(`Could Not Find C:\\WINDOWS\\SYSTEM32\\${arg}`);
                }
                break;

            case 'exit':
                // Send closing event
                window.dispatchEvent(new CustomEvent('clippyContext', {
                    detail: { action: `User closed the Terminal console` }
                }));
                // We'd close the window here via context if we could access it cleanly,
                // but for simplicity it just prints for now unless we pass down WindowContext
                printLine('Process exited. You can close the window now.');
                break;

            default:
                printLine(`'${cmd}' is not recognized as an internal or external command,
operable program or batch file.`);
                break;
        }
    };

    return (
        <div className="cmd-window" onClick={handleContainerClick}>
            {history.map((line, i) => (
                <div key={i} className="cmd-output">
                    {line.text}
                </div>
            ))}

            <div className="cmd-input-line">
                <span className="cmd-prompt">{getCurrentPathString()}</span>
                <input
                    ref={inputRef}
                    className="cmd-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleCommand}
                    autoFocus
                    spellCheck="false"
                    autoComplete="off"
                />
            </div>
            {/* Invisible div to scroll to bottom */}
            <div ref={bottomRef} style={{ height: 1 }} />
        </div>
    );
}
