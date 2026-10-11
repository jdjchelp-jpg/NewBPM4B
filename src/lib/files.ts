import { sfx } from '@/lib/sound';

export type AudioSelection = { name: string; file?: File; path?: string; url?: string; size?: number };
export type LocalSelection = { name: string; file?: File; path?: string; url?: string; size?: number };

const AUDIO_EXT = new Set(['mp3', 'm4a', 'm4b', 'ogg', 'oga', 'wav', 'flac', 'aac', 'opus', 'wma', 'aiff', 'aif']);
export const isAudioFile = (file: File) => AUDIO_EXT.has(file.name.split('.').pop()?.toLowerCase() ?? '');
export const selectionName = (selection: AudioSelection) => selection.name || selection.path?.split(/[\\/]/).pop() || 'Audio file';
export const selectionPath = (selection: AudioSelection) => selection.path ?? selection.name;

export function useAudioImport(onImport: (files: AudioSelection[]) => void) {
  const importFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    const accepted = toSelections(list);
    const rejected = list.filter((file) => !isAudioFile(file));
    if (accepted.length) { onImport(accepted); sfx.success(false); }
    if (rejected.length) sfx.warning();
    return { accepted: accepted.length, rejected: rejected.map((file) => file.name) };
  };

  const pickFiles = async (): Promise<AudioSelection[]> => {
    const bridge = (window as any).bpm4b;
    if (bridge?.pickFiles) {
      const paths: string[] = await bridge.pickFiles({ kind: 'audio' });
      return paths.map((path) => ({ name: path.split(/[\\/]/).pop() ?? path, path }));
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = [...AUDIO_EXT].map((ext) => `.${ext}`).join(','); input.multiple = true;
      input.onchange = () => {
        const result = toSelections(Array.from(input.files ?? []));
        if (result.length) sfx.success(false);
        resolve(result);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  };
  return { importFiles, pickFiles };
}

const AUDIO_EXTENSIONS = [...AUDIO_EXT];
const BOOK_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'markdown', 'html', 'htm', 'rtf', 'odt', 'epub'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export async function pickLocalFiles(kind: 'audio' | 'book' | 'image' | 'media' = 'audio', multiple = true): Promise<LocalSelection[]> {
  const bridge = (window as any).bpm4b;
  if (bridge?.pickFiles) {
    const options = kind === 'audio' ? { kind: 'audio' } : kind === 'book' ? { kind: 'doc' } : kind === 'image' ? { filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }] } : { filters: [{ name: 'Media', extensions: ['*'] }] };
    const paths: string[] = await bridge.pickFiles(options);
    return paths.map((path) => ({ name: path.split(/[\\/]/).pop() ?? path, path }));
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = multiple;
    input.accept = kind === 'audio' ? AUDIO_EXTENSIONS.map((e) => `.${e}`).join(',') : kind === 'book' ? BOOK_EXTENSIONS.map((e) => `.${e}`).join(',') : kind === 'image' ? IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',') : '';
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      resolve(files.map((file) => ({ name: file.name, file, url: URL.createObjectURL(file), size: file.size })));
      if (files.length) sfx.success(false);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export async function pickLocalFolder(): Promise<LocalSelection[]> {
  const bridge = (window as any).bpm4b;
  if (bridge?.pickFolder) {
    const folder = await bridge.pickFolder();
    if (!folder) return [];
    const result = await bridge.scanFolder?.({ folder, includeCovers: true, includeDocs: true });
    return (result?.audio ?? []).map((path: string) => ({ name: path.split(/[\\/]/).pop() ?? path, path }));
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true; input.setAttribute('webkitdirectory', '');
    input.onchange = () => {
      const files = Array.from(input.files ?? []).filter(isAudioFile);
      resolve(files.map((file) => ({ name: file.name, file, url: URL.createObjectURL(file), size: file.size })));
      if (files.length) sfx.success(false);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export async function pickImage(): Promise<LocalSelection | null> {
  return (await pickLocalFiles('image', false))[0] ?? null;
}

export function toSelections(files: File[]): AudioSelection[] {
  return files.filter(isAudioFile).map((file): AudioSelection => {
    const desktopPath = (file as File & { path?: string }).path;
    return desktopPath ? { name: file.name, path: desktopPath, size: file.size } : { name: file.name, file, url: URL.createObjectURL(file), size: file.size };
  });
}

export function revokeSelection(selection: AudioSelection) {
  if (selection.url) URL.revokeObjectURL(selection.url);
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
