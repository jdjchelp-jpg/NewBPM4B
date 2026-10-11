import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import { registerMediaHandlers } from './ipc/media';
import { registerStructureHandlers } from './ipc/structure';
import { registerProjectHandlers } from './ipc/projects';

// Dev environment stability flags (recommended for systems with GPU issues)
const DEV_FLAGS = ['disable-gpu', 'disable-gpu-sandbox', 'no-sandbox', 'disable-features=GpuProcessHighPriorityPerWindow'];
for (const f of DEV_FLAGS) app.commandLine.appendSwitch(f);

let win: BrowserWindow | null = null;

function preloadPath() {
  // dev (tsc-emit or ts-node layout) and packaged layouts differ; probe both.
  const cands = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'preload.cjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
  ];
  try {
    const fs = require('fs');
    for (const c of cands) if (fs.existsSync(c)) return c;
  } catch {}
  return cands[0];
}

async function create() {
  let icon;
  try {
    // Vite copies public assets into dist for packaged apps as well as dev.
    const iconPath = path.join(app.getAppPath(), 'dist', 'bpm4b-icon.png');
    const fs = require('fs');
    if (fs.existsSync(iconPath)) icon = nativeImage.createFromPath(iconPath);
  } catch { /* icon missing — proceed without */ }

  win = new BrowserWindow({
    width: 1280, height: 860,
    icon: icon || undefined,
    webPreferences: { preload: preloadPath(), contextIsolation: true, nodeIntegration: false, sandbox: true },
    title: 'BPM4B — Audiobook Studio',
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged) {
    try {
      // Fail fast if vite isn't up yet instead of showing a blank page.
      const net = require('net');
      await new Promise<void>((res, rej) => {
        const s = net.connect(5173, '127.0.0.1');
        s.on('connect', () => { s.end(); res(); });
        s.on('error', () => rej(new Error(`Vite dev server not reachable at ${devUrl}. Run "npm run dev" first in another terminal.`)));
        setTimeout(() => rej(new Error(`Timed out waiting for Vite at ${devUrl}. Run "npm run dev" first.`)), 4000);
      });
      await win.loadURL(devUrl);
    } catch (e) {
      await win.loadURL(`data:text/html,<h1 style="font-family:sans-serif;padding:2rem">BPM4B dev &mdash; start Vite first</h1><p style="font-family:sans-serif;padding:0 2rem">${String((e as Error).message)}</p>`);
    }
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}
app.whenReady().then(() => {
  registerMediaHandlers(); registerStructureHandlers(); registerProjectHandlers();
  // File manager: audio + documents, with sensible grouped filters.
  const AUDIO = ['mp3', 'm4a', 'm4b', 'ogg', 'oga', 'wav', 'flac', 'aac', 'opus', 'wma', 'aiff', 'aif'];
  const DOCS = ['pdf', 'docx', 'txt', 'md', 'markdown', 'html', 'htm', 'rtf', 'odt', 'epub'];
  ipcMain.handle('pick-files', async (_e, o?: { filters?: { name: string; extensions: string[] }[]; kind?: 'audio' | 'doc' | 'any' }) => {
    const filters = o?.filters ?? (
      o?.kind === 'audio' ? [{ name: 'Audio', extensions: AUDIO }] :
      o?.kind === 'doc' ? [{ name: 'Documents', extensions: DOCS }, { name: 'Audio', extensions: AUDIO }] :
      [{ name: 'Audio', extensions: AUDIO }, { name: 'Documents', extensions: DOCS }, { name: 'All files', extensions: ['*'] }]
    );
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters });
    return r.canceled ? [] : r.filePaths;
  });
  ipcMain.handle('pick-folder', async () => { const r = await dialog.showOpenDialog({ properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
  ipcMain.handle('pick-save', async (_e, o) => { const r = await dialog.showSaveDialog({ defaultPath: o?.defaultPath }); return r.canceled ? null : r.filePath; });
  create();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

