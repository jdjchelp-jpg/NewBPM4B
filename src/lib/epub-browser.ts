import type { LocalSelection } from '@/lib/files';
import { splitChapters } from '@/lib/structure';
import { createOperationId, reportOperationProgress, type OperationProgress } from '@/lib/progress';

interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  genre?: string;
  description?: string;
}

interface ZipEntry { name: string; data: Uint8Array; }

const encoder = new TextEncoder();
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const directoryParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const local = new Uint8Array(30 + name.length + entry.data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(entry.data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    directoryParts.push(central);
    offset += local.length;
  }

  const directorySize = directoryParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, offset, true);
  // Copy views into owned ArrayBuffers so the BlobPart type stays compatible
  // with browsers whose TS DOM declarations exclude SharedArrayBuffer-backed views.
  const toBlobPart = (part: Uint8Array): ArrayBuffer => part.slice().buffer as ArrayBuffer;
  return new Blob([...localParts, ...directoryParts, end].map(toBlobPart), { type: 'application/epub+zip' });
}

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const html = (text: string) => xml(text).replace(/\r?\n/g, '<br/>');

function plainText(source: string) {
  return source
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export async function buildEpubInBrowser(options: {
  text: string;
  metadata: EpubMetadata;
  engines: Record<string, unknown>;
  cover?: LocalSelection | null;
  operationId?: string;
  onStatus?: (status: OperationProgress) => void;
}) {
  const operationId = options.operationId ?? createOperationId('epub');
  const publish = (stage: string, progress: number, detail?: string) => {
    const status: OperationProgress = { operationId, task: 'Build EPUB', stage, progress, detail, timestamp: new Date().toISOString() };
    options.onStatus?.(status);
    reportOperationProgress(status);
  };

  publish('Splitting source into chapters', 10, `${options.text.length.toLocaleString()} characters`);
  const source = plainText(options.text);
  const chapters = splitChapters(source, options.engines);
  if (!chapters.length || !source.trim()) throw new Error('Add readable book text before building the EPUB.');

  const { title, author, language, genre, description } = options.metadata;
  const esc = xml;
  const files: ZipEntry[] = [{ name: 'mimetype', data: encoder.encode('application/epub+zip') }];
  files.push({ name: 'META-INF/container.xml', data: encoder.encode('<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>') });

  let coverManifest = '';
  let coverSpine = '';
  if (options.cover?.file) {
    const extension = options.cover.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const coverName = `cover.${extension}`;
    const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
    files.push({ name: `OEBPS/${coverName}`, data: new Uint8Array(await options.cover.file.arrayBuffer()) });
    coverManifest = `<item id="cover" href="${coverName}" media-type="${mime}"/>`;
    coverSpine = '<itemref idref="cover" linear="no"/>';
  }

  const items: string[] = [];
  const refs: string[] = [];
  const nav: string[] = [];
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!;
    const paragraphs = chapter.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph) => `<p>${html(paragraph)}</p>`).join('\n');
    const chapterFile = `chapter_${i + 1}.xhtml`;
    const body = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${esc(language)}"><head><title>${esc(chapter.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><h2>${esc(chapter.title)}</h2>${paragraphs}</body></html>`;
    files.push({ name: `OEBPS/${chapterFile}`, data: encoder.encode(body) });
    items.push(`<item id="chapter_${i + 1}" href="${chapterFile}" media-type="application/xhtml+xml"/>`);
    refs.push(`<itemref idref="chapter_${i + 1}"/>`);
    nav.push(`<navPoint id="chapter_${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(chapter.title)}</text></navLabel><content src="${chapterFile}"/></navPoint>`);
    publish('Writing chapter files', 20 + Math.round(((i + 1) / chapters.length) * 55), `${i + 1}/${chapters.length} · ${chapter.title}`);
  }

  files.push({ name: 'OEBPS/style.css', data: encoder.encode('body { font-family: Georgia, serif; margin: 2em; line-height: 1.6; } h2 { font-size: 1.4em; } p { text-align: justify; margin-bottom: 0.8em; }') });
  files.push({ name: 'OEBPS/toc.ncx', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="bpm4b-${Date.now()}"/></head><docTitle><text>${esc(title)}</text></docTitle><navMap>${nav.join('')}</navMap></ncx>`) });
  files.push({ name: 'OEBPS/content.opf', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookID"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title><dc:creator>${esc(author)}</dc:creator><dc:language>${esc(language)}</dc:language><dc:identifier id="BookID">bpm4b-${Date.now()}</dc:identifier>${genre ? `<dc:subject>${esc(genre)}</dc:subject>` : ''}${description ? `<dc:description>${esc(description)}</dc:description>` : ''}</metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>${coverManifest}${items.join('')}</manifest><spine toc="ncx">${coverSpine}${refs.join('')}</spine></package>`) });

  publish('Packaging EPUB archive', 82, `${files.length} files`);
  const blob = zip(files);
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const filename = `${title.trim() || 'book'}`.replace(/[\\/:*?"<>|]+/g, '-').trim();
  anchor.href = href;
  anchor.download = `${filename || 'book'}.epub`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
  publish('Complete', 100, `${chapters.length} chapters · ${blob.size.toLocaleString()} bytes`);
  return { chapters: chapters.length, bytes: blob.size, filename: anchor.download };
}
