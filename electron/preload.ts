import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
contextBridge.exposeInMainWorld('bpm4b', {
  pickFiles: (o?: any) => ipcRenderer.invoke('pick-files', o),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickSave: (o?: any) => ipcRenderer.invoke('pick-save', o),
  mp3ToM4b: (a: any) => ipcRenderer.invoke('mp3-to-m4b', a),
  convert: (a: any) => ipcRenderer.invoke('convert', a),
  readMeta: (a: any) => ipcRenderer.invoke('read-meta', a),
  readDoc: (a: any) => ipcRenderer.invoke('read-doc', a),
  detectStructure: (a: any) => ipcRenderer.invoke('detect-structure', a),
  splitChapters: (a: any) => ipcRenderer.invoke('split-chapters', a),
  docToEpub: (a: any) => ipcRenderer.invoke('doc-to-epub', a),
  scanFolder: (a: { folder: string; includeCovers?: boolean; includeDocs?: boolean }) => ipcRenderer.invoke('scan-folder', a),
  readChapters: (a: any) => ipcRenderer.invoke('read-chapters', a),
  writeChapters: (a: any) => ipcRenderer.invoke('write-chapters', a),
  extractAudio: (a: any) => ipcRenderer.invoke('extract-audio', a),
  mergeAudio: (a: any) => ipcRenderer.invoke('merge-audio', a),
  writeMeta: (a: any) => ipcRenderer.invoke('write-meta', a),
  saveProject: (a: any) => ipcRenderer.invoke('save-project', a),
  loadProject: (a: any) => ipcRenderer.invoke('load-project', a),
  onProgress: (cb: (p: number) => void) => {
    ipcRenderer.on('bpm4b:progress', (_e: IpcRendererEvent, p: number) => cb(p));
  },
});


