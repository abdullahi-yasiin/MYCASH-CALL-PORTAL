import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to obtain server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.VITE_GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// POST /api/ai-intelligence - Dedicated AI call center analytics endpoint
app.post('/api/ai-intelligence', async (req, res) => {
  try {
    const { prompt, candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'] } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "prompt" parameter in request payload.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        code: 'MISSING_API_KEY',
      });
    }

    let text: string | undefined;
    let usedModel = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Server AI Intelligence] Generating analysis with model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        if (response.text && response.text.trim().length > 0) {
          text = response.text;
          usedModel = model;
          console.log(`[Server AI Intelligence] Model ${model} generated content successfully.`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Server AI Intelligence] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!text) {
      return res.status(502).json({
        error: 'Gemini models failed to return content.',
        details: lastError?.message || String(lastError),
      });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch {
      const cleanJson = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
      parsedData = JSON.parse(cleanJson);
    }

    return res.json({
      success: true,
      model: usedModel,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('[Server AI Intelligence Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error while processing Gemini analysis',
    });
  }
});

// POST /api/gemini/generate - Generic server-side content generation endpoint
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3.8-flash', contents, config } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const payloadContents = contents || prompt;
    if (!payloadContents) {
      return res.status(400).json({ error: 'Missing prompt or contents in request.' });
    }

    const response = await ai.models.generateContent({
      model,
      contents: payloadContents,
      config: config || undefined,
    });

    return res.json({
      success: true,
      text: response.text,
      model,
    });
  } catch (error: any) {
    console.error('[Server Gemini Generate Error]:', error);
    return res.status(500).json({ error: error?.message || 'Error generating Gemini response' });
  }
});

// POST /api/gemini/stream - Server-Sent Events (SSE) streaming endpoint
app.post('/api/gemini/stream', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3.8-flash', contents, config } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const payloadContents = contents || prompt;
    if (!payloadContents) {
      return res.status(400).json({ error: 'Missing prompt or contents in request.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ai.models.generateContentStream({
      model,
      contents: payloadContents,
      config: config || undefined,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[Server Gemini Stream Error]:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || 'Streaming error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/whatsapp-sms - SMS proxy endpoint
app.post('/api/whatsapp-sms', async (req, res) => {
  try {
    const payload = req.body || {};
    const whatsappToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN || payload.whatsappToken || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || payload.phoneNumberId || '';

    if (!whatsappToken || !phoneNumberId) {
      return res.json({
        success: true,
        isMockMode: true,
        message: 'WhatsApp integration active in test mode. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment to send live messages.',
        successfulCount: payload.recipients?.length || 0,
        failedCount: 0,
      });
    }

    const recipients = payload.recipients || [];
    let successfulCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        const bodyData = {
          messaging_product: 'whatsapp',
          to: recipient.phone,
          type: 'text',
          text: { body: recipient.message || payload.messageText || '' },
        };

        const fbRes = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyData),
        });

        if (fbRes.ok) {
          successfulCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return res.json({
      success: true,
      successfulCount,
      failedCount,
      total: recipients.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'WhatsApp SMS proxy error' });
  }
});

// Setup dev server with Vite middleware or static serving in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
