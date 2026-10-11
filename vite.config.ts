import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import type { Plugin } from 'vite';

function progressTerminal(): Plugin {
  return {
    name: 'bpm4b-progress-terminal',
    configureServer(server) {
      server.middlewares.use('/__bpm4b/progress', (request, response, next) => {
        if (request.method !== 'POST') { next(); return; }
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk: string) => {
          body += chunk;
          if (body.length > 8192) { response.statusCode = 413; response.end(); request.destroy(); }
        });
        request.on('end', () => {
          try {
            const update = JSON.parse(body) as { task?: unknown; stage?: unknown; progress?: unknown; detail?: unknown; timestamp?: unknown };
            const task = typeof update.task === 'string' ? update.task.slice(0, 80) : 'BPM4B operation';
            const stage = typeof update.stage === 'string' ? update.stage.slice(0, 120) : 'Working';
            const progress = typeof update.progress === 'number' ? Math.max(0, Math.min(100, Math.round(update.progress))) : 0;
            const detail = typeof update.detail === 'string' ? update.detail.replace(/[\r\n\t]+/g, ' ').slice(0, 180) : '';
            server.config.logger.info(`[BPM4B ${progress.toString().padStart(3, ' ')}%] ${task} — ${stage}${detail ? ` · ${detail}` : ''}`);
            response.statusCode = 204;
            response.end();
          } catch {
            response.statusCode = 400;
            response.end('Invalid progress event');
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), progressTerminal()],
  // Preserve the path Vite received instead of canonicalizing every import via
  // realpath. This also avoids EPERM for readable workspace files on Windows
  // when the checkout inherits restricted sandbox ACLs.
  resolve: { alias: { '@': path.resolve(__dirname, 'src') }, preserveSymlinks: true },
  // Fall forward to the next available port when a stale or user-owned Vite
  // process already occupies 5173; Vite prints the selected URL on startup.
  server: { port: 5173, strictPort: false },
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
  build: { outDir: 'dist' },
  // Electron loads dist/index.html over file:// — keep asset URLs relative.
  base: './',
});


