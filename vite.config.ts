import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-dev-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/ai-intelligence' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  const authHeader = req.headers['authorization'];
                  const authKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
                  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || authKey || payload.apiKey || '';

                  if (!apiKey) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured in environment.' }));
                    return;
                  }

                  const { GoogleGenAI } = await import('@google/genai');
                  const ai = new GoogleGenAI({
                    apiKey,
                    httpOptions: {
                      headers: {
                        'User-Agent': 'aistudio-build'
                      }
                    }
                  });

                  const candidateModels = payload.candidateModels || ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
                  let text = '';
                  let usedModel = '';
                  let lastErr = null;

                  for (const model of candidateModels) {
                    try {
                      const resp = await ai.models.generateContent({
                        model,
                        contents: payload.prompt,
                        config: {
                          responseMimeType: 'application/json',
                          temperature: 0.2
                        }
                      });
                      if (resp.text && resp.text.trim().length > 0) {
                        text = resp.text;
                        usedModel = model;
                        break;
                      }
                    } catch (e: any) {
                      lastErr = e;
                    }
                  }

                  if (!text) {
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Gemini models failed', details: String(lastErr) }));
                    return;
                  }

                  let parsedData;
                  try {
                    parsedData = JSON.parse(text);
                  } catch {
                    const clean = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
                    parsedData = JSON.parse(clean);
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, model: usedModel, data: parsedData }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Server error' }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
