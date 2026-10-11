import { ipcMain } from 'electron';
import { detect, splitChapters, type EngineState } from './detect';
export function registerStructureHandlers() {
  ipcMain.handle('detect-structure', async (_e, a: { text: string; engines?: Partial<EngineState> }) => detect(a.text, a.engines ?? {}));
  ipcMain.handle('split-chapters', async (_e, a: { text: string; engines?: Partial<EngineState> }) => splitChapters(a.text, a.engines ?? {}));
}

