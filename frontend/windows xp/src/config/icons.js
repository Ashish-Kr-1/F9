import Notepad from '../apps/Notepad/Notepad';
import Paint from '../apps/Paint/Paint';
import Calculator from '../apps/Calculator/Calculator';
import FileExplorer from '../apps/FileExplorer/FileExplorer';
import ControlPanel from '../apps/ControlPanel/ControlPanel';
import Snake from '../apps/Snake/Snake';

export const DESKTOP_ICONS = [
    {
        appId: 'my-computer',
        label: 'My Computer',
        title: 'My Computer',
        src: 'https://win32.run/images/xp/icons/MyComputer.png',
        component: FileExplorer,
        defaultSize: { width: 680, height: 480 },
        minSize: { width: 300, height: 200 },
    },
    {
        appId: 'my-documents',
        label: 'My Documents',
        title: 'My Documents',
        src: 'https://win32.run/images/xp/icons/FolderClosed.png',
        component: FileExplorer,
        defaultSize: { width: 680, height: 480 },
        minSize: { width: 300, height: 200 },
    },
    {
        appId: 'recycle-bin',
        label: 'Recycle Bin',
        title: 'Recycle Bin',
        src: 'https://win32.run/images/xp/icons/RecycleBinempty.png',
        component: FileExplorer,
        defaultSize: { width: 500, height: 380 },
        minSize: { width: 300, height: 200 },
    },
    {
        appId: 'notepad',
        label: 'Notepad',
        title: 'Notepad',
        src: 'https://win32.run/images/xp/icons/Notepad.png',
        component: Notepad,
        defaultSize: { width: 520, height: 400 },
        minSize: { width: 280, height: 180 },
    },
    {
        appId: 'paint',
        label: 'Paint',
        title: 'Paint',
        src: 'https://win32.run/images/xp/icons/Paint.png',
        component: Paint,
        defaultSize: { width: 700, height: 520 },
        minSize: { width: 400, height: 320 },
    },
    {
        appId: 'calculator',
        label: 'Calculator',
        title: 'Calculator',
        src: 'https://win32.run/images/xp/icons/Programs.png',
        component: Calculator,
        defaultSize: { width: 240, height: 310 },
        minSize: { width: 220, height: 280 },
    },
    {
        appId: 'control-panel',
        label: 'Control Panel',
        title: 'Display Properties',
        src: 'https://win32.run/images/xp/icons/ControlPanel.png',
        component: ControlPanel,
        defaultSize: { width: 600, height: 460 },
        minSize: { width: 400, height: 320 },
    },
    {
        appId: 'snake',
        label: 'Snake',
        title: 'Snake Game',
        src: '/icons/snake.png',
        component: Snake,
        defaultSize: { width: 500, height: 500 },
        minSize: { width: 400, height: 400 },
    },
];
