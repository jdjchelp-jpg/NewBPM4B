import { ipcMain } from 'electron';
import fs from 'fs';
export function registerProjectHandlers() {
  ipcMain.handle('save-project', async (_e, a: { path: string; data: any }) => { fs.writeFileSync(a.path, JSON.stringify(a.data, null, 2), 'utf8'); return { ok: true }; });
  ipcMain.handle('load-project', async (_e, a: { path: string }) => JSON.parse(fs.readFileSync(a.path, 'utf8')));
}
