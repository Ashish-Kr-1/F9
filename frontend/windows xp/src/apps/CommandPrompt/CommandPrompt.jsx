import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './CommandPrompt.css';

const WELCOME_TEXT = `Microsoft Windows XP [Version 5.1.2600]
(C) Copyright 1985-2001 Microsoft Corp.
`;

export default function CommandPrompt() {
    const { api, user } = useAuth();
    const [history, setHistory] = useState([{ type: 'output', text: WELCOME_TEXT }]);
    const [input, setInput] = useState('');
    const [currentPathStack, setCurrentPathStack] = useState([{ id: null, name: 'C:' }]);
    const [currentNode, setCurrentNode] = useState(null);
    const [cmdHistory, setCmdHistory] = useState([]);
    const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const initVfs = async () => {
            try {
                const res = await api.get('/vfs/root');
                if (res.data) {
                    setCurrentNode(res.data);
                    setCurrentPathStack([{ id: res.data.id, name: 'C:' }]);
                }
            } catch (err) {
                printLine("Error: VFS connection failed. Some commands may not work.");
            }
        };
        initVfs();
    }, [api]);

    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }, [history]);

    const handleContainerClick = () => inputRef.current?.focus();

    const printLine = (text) => {
        setHistory(prev => [...prev, { type: 'output', text }]);
    };

    const getCurrentPathString = () => {
        return currentPathStack.map(p => p.name).join('\\') + '>';
    };

    const handleCommand = async (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cmdHistory.length > 0) {
                const newIdx = cmdHistoryIdx < cmdHistory.length - 1 ? cmdHistoryIdx + 1 : cmdHistoryIdx;
                setCmdHistoryIdx(newIdx);
                setInput(cmdHistory[cmdHistory.length - 1 - newIdx]);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (cmdHistoryIdx > 0) {
                const newIdx = cmdHistoryIdx - 1;
                setCmdHistoryIdx(newIdx);
                setInput(cmdHistory[cmdHistory.length - 1 - newIdx]);
            } else {
                setCmdHistoryIdx(-1);
                setInput('');
            }
            return;
        }
        if (e.key !== 'Enter') return;

        const rawCmd = input.trim();
        const cmdPromptStr = getCurrentPathString();
        setHistory(prev => [...prev, { type: 'input', text: `${cmdPromptStr} ${rawCmd}` }]);
        setInput('');

        if (rawCmd) {
            setCmdHistory(prev => [...prev, rawCmd]);
            setCmdHistoryIdx(-1);
        }

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
    };

    const executeCommand = async (cmd, arg, args) => {
        switch (cmd) {
            // ─── 1. CLS — Clear screen ───
            case 'cls':
            case 'clear':
                setHistory([]);
                break;

            // ─── 2. HELP — List all commands ───
            case 'help':
                printLine(`Available commands:
  CD [path]         Change directory (cd .. to go up)
  CLS               Clear the screen
  COLOR [attr]      Change console colors (e.g. color 0a)
  COPY [src] [dst]  Copy a file
  DATE              Display the current date
  DEL [name]        Delete a file or folder
  DIR               List files and folders
  ECHO [text]       Display a message (echo text > file.txt)
  EXIT              Close the terminal
  HELP              This help screen
  HOSTNAME          Display the computer name
  IPCONFIG          Display network configuration
  MKDIR [name]      Create a new folder
  MOVE [old] [new]  Rename a file
  PING [host]       Simulate a ping request
  REBOOT            Restart the system
  REN [old] [new]   Rename a file
  SYSTEMINFO        Display system information
  TASKLIST          Display running processes
  TIME              Display the current time
  TITLE [text]      Set the terminal title  
  TOUCH [name]      Create an empty file
  TREE              Display directory tree
  TYPE [file]       Display the contents of a text file
  VER               Display Windows version
  WHOAMI            Display the current user`);
                break;

            // ─── 3. DIR — List directory ───
            case 'dir':
            case 'ls':
                if (!currentNode) { printLine("VFS not ready."); return; }
                const dirRes = await api.get(`/vfs/${currentNode.id}/children`);
                const children = dirRes.data;
                if (children.length === 0) {
                    printLine(" No items found.");
                } else {
                    let dirStr = ` Directory of ${getCurrentPathString().replace('>', '')}\n\n`;
                    let fileCount = 0, dirCount = 0, totalBytes = 0;
                    children.forEach(c => {
                        const isDir = c.node_type === 'folder';
                        if (isDir) dirCount++; else fileCount++;
                        totalBytes += c.size_bytes || 0;
                        const typeStr = isDir ? '<DIR>' : '     ';
                        const sizeStr = isDir ? '' : `${(c.size_bytes || 0).toLocaleString()} `;
                        dirStr += `01/01/2005  12:00 PM    ${typeStr}  ${sizeStr.padStart(10)}${c.name}\n`;
                    });
                    dirStr += `\n              ${fileCount} File(s)  ${totalBytes.toLocaleString()} bytes`;
                    dirStr += `\n              ${dirCount} Dir(s)   99,999,999,999 bytes free`;
                    printLine(dirStr);
                }
                break;

            // ─── 4. CD — Change directory ───
            case 'cd':
                if (!arg) { printLine(getCurrentPathString().replace('>', '')); return; }
                if (arg === '..' || arg === '../') {
                    if (currentPathStack.length > 1) {
                        const newStack = [...currentPathStack];
                        newStack.pop();
                        const parentEntry = newStack[newStack.length - 1];
                        setCurrentPathStack(newStack);
                        setCurrentNode({ id: parentEntry.id, name: parentEntry.name });
                    }
                    return;
                }
                const cdRes = await api.get(`/vfs/${currentNode.id}/children`);
                const target = cdRes.data.find(c => c.name.toLowerCase() === arg.toLowerCase() && c.node_type === 'folder');
                if (target) {
                    setCurrentPathStack(prev => [...prev, { id: target.id, name: target.name }]);
                    setCurrentNode(target);
                } else {
                    printLine(`The system cannot find the path specified.`);
                }
                break;

            // ─── 5. MKDIR / MD — Create folder ───
            case 'mkdir':
            case 'md':
                if (!arg) { printLine('The syntax of the command is incorrect.'); return; }
                await api.post('/vfs/create', { name: arg, type: 'folder', parentId: currentNode.id });
                printLine(`Directory created: ${arg}`);
                break;

            // ─── 6. TOUCH — Create file ───
            case 'touch':
                if (!arg) { printLine('The syntax of the command is incorrect.'); return; }
                await api.post('/vfs/create', { name: arg, type: 'file', parentId: currentNode.id });
                printLine(`File created: ${arg}`);
                break;

            // ─── 7. ECHO — Print text or write to file ───
            case 'echo':
                if (args.includes('>')) {
                    const arrowIdx = args.indexOf('>');
                    const content = args.slice(0, arrowIdx).join(' ');
                    const filename = args.slice(arrowIdx + 1).join(' ').trim();
                    if (filename) {
                        try {
                            const createRes = await api.post('/vfs/create', { name: filename, type: 'file', parentId: currentNode.id });
                            if (content) {
                                await api.post(`/files/${createRes.data.id}/content`, { text: content });
                            }
                        } catch (err) {
                            printLine(`Error: ${err.message}`);
                        }
                        return;
                    }
                }
                printLine(arg || 'ECHO is on.');
                break;

            // ─── 8. TYPE — Display file contents ───
            case 'type':
            case 'cat':
                if (!arg) { printLine('The syntax of the command is incorrect.'); return; }
                const typeRes = await api.get(`/vfs/${currentNode.id}/children`);
                const fileToRead = typeRes.data.find(c => c.name.toLowerCase() === arg.toLowerCase() && c.node_type === 'file');
                if (fileToRead) {
                    try {
                        const contentRes = await api.get(`/files/${fileToRead.id}/content`);
                        printLine(contentRes.data.content || '(empty file)');
                    } catch {
                        printLine('Error reading file.');
                    }
                } else {
                    printLine(`The system cannot find the file specified.`);
                }
                break;

            // ─── 9. DEL / RM / RMDIR — Delete ───
            case 'del':
            case 'rm':
            case 'rmdir':
            case 'rd':
                if (!arg) { printLine('The syntax of the command is incorrect.'); return; }
                const delRes = await api.get(`/vfs/${currentNode.id}/children`);
                const fileToDel = delRes.data.find(c => c.name.toLowerCase() === arg.toLowerCase());
                if (fileToDel) {
                    await api.delete(`/vfs/${fileToDel.id}`);
                    printLine(`Deleted: ${arg}`);
                } else {
                    printLine(`Could Not Find ${arg}`);
                }
                break;

            // ─── 10. REN / RENAME / MOVE — Rename ───
            case 'ren':
            case 'move':
            case 'rename':
                if (args.length < 2) { printLine('The syntax of the command is incorrect.'); return; }
                const renRes = await api.get(`/vfs/${currentNode.id}/children`);
                const fileToRen = renRes.data.find(c => c.name.toLowerCase() === args[0].toLowerCase());
                if (fileToRen) {
                    await api.patch(`/vfs/${fileToRen.id}/rename`, { newName: args[1] });
                    printLine(`Renamed: ${args[0]} -> ${args[1]}`);
                } else {
                    printLine(`The system cannot find the file specified.`);
                }
                break;

            // ─── 11. COPY / CP — Copy file ───
            case 'cp':
            case 'copy':
                if (args.length < 2) { printLine('The syntax of the command is incorrect.'); return; }
                const cpRes = await api.get(`/vfs/${currentNode.id}/children`);
                const fileToCp = cpRes.data.find(c => c.name.toLowerCase() === args[0].toLowerCase());
                if (fileToCp) {
                    await api.post(`/vfs/${fileToCp.id}/copy`, { newName: args[1] });
                    printLine(`        1 file(s) copied.`);
                } else {
                    printLine(`The system cannot find the file specified.`);
                }
                break;

            // ─── 12. TREE — Directory tree ───
            case 'tree': {
                if (!currentNode) { printLine("VFS not ready."); return; }
                const buildTree = async (nodeId, prefix = '') => {
                    const res = await api.get(`/vfs/${nodeId}/children`);
                    let output = '';
                    const items = res.data;
                    for (let i = 0; i < items.length; i++) {
                        const isLast = i === items.length - 1;
                        const connector = isLast ? '└── ' : '├── ';
                        const icon = items[i].node_type === 'folder' ? '📁 ' : '📄 ';
                        output += `${prefix}${connector}${icon}${items[i].name}\n`;
                        if (items[i].node_type === 'folder') {
                            output += await buildTree(items[i].id, prefix + (isLast ? '    ' : '│   '));
                        }
                    }
                    return output;
                };
                const treeStr = `${getCurrentPathString().replace('>', '')}\n` + await buildTree(currentNode.id);
                printLine(treeStr || 'Empty directory.');
                break;
            }

            // ─── 13. VER — Version ───
            case 'ver':
                printLine('\nMicrosoft Windows XP [Version 5.1.2600]\n');
                break;

            // ─── 14. WHOAMI — Current user ───
            case 'whoami':
                printLine(`XPDESKTOP\\${user?.username || user?.email || 'user'}`);
                break;

            // ─── 15. DATE — Current date ───
            case 'date':
                printLine(`The current date is: ${new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}`);
                break;

            // ─── 16. TIME — Current time ───
            case 'time':
                printLine(`The current time is: ${new Date().toLocaleTimeString()}`);
                break;

            // ─── 17. HOSTNAME — Computer name ───
            case 'hostname':
                printLine('XPDESKTOP');
                break;

            // ─── 18. SYSTEMINFO — System info ───
            case 'systeminfo':
                printLine(`Host Name:                 XPDESKTOP
OS Name:                   Microsoft Windows XP Professional
OS Version:                5.1.2600 Service Pack 3 Build 2600
System Manufacturer:       Web OS Clone
System Model:              Virtual Machine
Processor(s):              1 Processor(s) Installed.
                           [01]: Family 6 Model 142 ~2100 Mhz
Total Physical Memory:     512 MB
Available Physical Memory: 384 MB
Page File Location(s):    C:\\pagefile.sys
Logon Server:              \\\\XPDESKTOP
Original Install Date:     1/1/2005`);
                break;

            // ─── 19. IPCONFIG — Network config ───
            case 'ipconfig':
                printLine(`Windows IP Configuration

Ethernet adapter Local Area Connection:

   Connection-specific DNS Suffix  . :
   IP Address. . . . . . . . . . . : 192.168.1.${Math.floor(Math.random() * 254) + 1}
   Subnet Mask . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . : 192.168.1.1`);
                break;

            // ─── 20. PING — Simulated ping ───
            case 'ping': {
                const host = arg || 'localhost';
                printLine(`\nPinging ${host} with 32 bytes of data:\n`);
                for (let i = 0; i < 4; i++) {
                    const ms = Math.floor(Math.random() * 50) + 10;
                    printLine(`Reply from ${host}: bytes=32 time=${ms}ms TTL=128`);
                }
                printLine(`\nPing statistics for ${host}:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 10ms, Maximum = 55ms, Average = 32ms`);
                break;
            }

            // ─── 21. TASKLIST — Running processes ───
            case 'tasklist':
                printLine(`Image Name                     PID Session Name        Mem Usage
========================= ======== ================ ============
System Idle Process              0 Services                  16 K
System                           4 Services                 228 K
explorer.exe                  1432 Console               24,560 K
svchost.exe                    832 Services              12,320 K
csrss.exe                      448 Console                3,864 K
winlogon.exe                   528 Console                8,532 K
notepad.exe                   2184 Console                3,456 K
cmd.exe                       3072 Console                2,860 K`);
                break;

            // ─── 22. COLOR — Change colors ───
            case 'color': {
                const colorMap = {
                    '0': '#000000', '1': '#000080', '2': '#008000', '3': '#008080',
                    '4': '#800000', '5': '#800080', '6': '#808000', '7': '#c0c0c0',
                    '8': '#808080', '9': '#0000ff', 'a': '#00ff00', 'b': '#00ffff',
                    'c': '#ff0000', 'd': '#ff00ff', 'e': '#ffff00', 'f': '#ffffff',
                };
                if (arg && arg.length === 2) {
                    const bg = colorMap[arg[0]] || '#000000';
                    const fg = colorMap[arg[1]] || '#c0c0c0';
                    const el = document.querySelector('.cmd-window');
                    if (el) {
                        el.style.backgroundColor = bg;
                        el.style.color = fg;
                    }
                } else {
                    printLine('Sets console foreground and background colors.\nCOLOR [attr]  (e.g. color 0a for green on black)');
                }
                break;
            }

            // ─── 23. TITLE — Set window title ───
            case 'title':
                printLine(arg ? `Title set to: ${arg}` : 'TITLE [text] - Set window title');
                break;

            // ─── 24. REBOOT / SHUTDOWN ───
            case 'reboot':
            case 'restart':
            case 'shutdown':
                printLine('Rebooting system...');
                setTimeout(() => window.location.reload(), 1000);
                break;

            // ─── 25. EXIT ───
            case 'exit':
                window.dispatchEvent(new CustomEvent('clippyContext', {
                    detail: { action: `User closed the Terminal console` }
                }));
                printLine('Process exited. You can close the window now.');
                break;

            // ─── 🥚 EASTER EGG: OJASS ───
            case 'ojass':
                printLine(`
  ╔═══════════════════════════════════════════════╗
  ║                                               ║
  ║   🏆  Hack de Science — OJASS 2026  🏆       ║
  ║                                               ║
  ║   Built with ❤️ by Team F9                    ║
  ║                                               ║
  ║   "The best way to predict the future         ║
  ║    is to invent it."  — Alan Kay              ║
  ║                                               ║
  ║   Thank you Ojass for this amazing platform!  ║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝
`);
                break;

            // ─── 🥚 EASTER EGG: MATRIX ───
            case 'matrix':
                printLine(`Wake up, Neo...
The Matrix has you...
Follow the white rabbit. 🐇

  01001111 01001010 01000001 01010011 01010011
  (Decode me for a surprise — it spells OJASS!)`);
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
            <div ref={bottomRef} style={{ height: 1 }} />
        </div>
    );
}
