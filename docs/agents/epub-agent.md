# EPUB Agent

**Scope**: `writeEpub` + `doc-to-epub` in `electron/ipc/media.ts`, `src/pages/Epub.tsx`.

## Pipeline
```
documents / pasted text
      ↓  readDocText (txt · md · markdown · html · htm · csv · xml · log)
full text
      ↓  splitChapters(full, engines)      ← Chapter Detection Agent
{ title, content }[]
      ↓  writeEpub(chapters, out, meta)
valid .epub (mimetype + META-INF/container.xml + OEBPS/{opf,ncx,xhtml,css})
```

## Rules
1. **No faked output.** If a format cannot be read yet, throw a message naming
   the missing parser. Never write an empty or placeholder EPUB.
2. `mimetype` must be the first zip entry and STORED (uncompressed). The current
   writer uses PowerShell `Compress-Archive` with a Python `zipfile` fallback
   that guarantees this ordering.
3. Escape `& < > "` in every XML text node and attribute.
4. Metadata: title, author, language, optional genre + description.
5. Language list in the UI covers many languages; English is never assumed.
6. Binary parsers (pdf-parse, mammoth, jszip) are **dependency-gated** — they may
   only be added if `npm audit` stays at 0. Until then, offer "paste the text".

## Next dependency-gated step
Add `pdf-parse`, `mammoth`, `jszip` one at a time, each behind its own audit
check, wired into `readDocText` so the EPUB pipeline gets full PDF/DOCX/EPUB
support without weakening the security gate.
