import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Structured JSON Schema for AI Intelligence & Somali-to-English Translation
const BILINGUAL_QUOTE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    original: {
      type: Type.STRING,
      description: 'Exact verbatim customer feedback note from the provided Excel dataset.',
    },
    english: {
      type: Type.STRING,
      description: 'Accurate, natural, complete English translation of the verbatim note.',
    },
    language: {
      type: Type.STRING,
      description: 'Detected language of original note: "Af-Soomaali", "English", or "Mixed".',
    },
  },
  required: ['original', 'english', 'language'],
};

const AI_INTELLIGENCE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: {
      type: Type.STRING,
      description: 'Clear, plain-English executive summary grounded strictly in the provided Excel numbers and customer feedback notes.',
    },
    noteTranslations: {
      type: Type.ARRAY,
      description: 'Exact English translations and decision classifications for every unique customer feedback note provided.',
      items: {
        type: Type.OBJECT,
        properties: {
          originalNote: { type: Type.STRING },
          detectedLanguage: {
            type: Type.STRING,
            description: '"Af-Soomaali", "English", or "Mixed"',
          },
          englishTranslation: {
            type: Type.STRING,
            description: 'Faithful, natural English translation capturing every detail, reason, promise, or objection in the note.',
          },
          decisionCategory: {
            type: Type.STRING,
            description: 'One of: "YES_POSITIVE", "NO_OBJECTION", "COMPLAINT", "CALLBACK", "UNREACHABLE", "NEUTRAL"',
          },
        },
        required: ['originalNote', 'detectedLanguage', 'englishTranslation', 'decisionCategory'],
      },
    },
    topComplaints: {
      type: Type.ARRAY,
      description: 'Only real customer complaints/problems explicitly evidenced in the notes. Empty array [] if none exist.',
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          category: { type: Type.STRING },
          count: { type: Type.INTEGER },
          percentage: { type: Type.INTEGER },
          severity: { type: Type.STRING, description: '"CRITICAL", "HIGH", "MEDIUM", or "LOW"' },
          affectedBranches: { type: Type.ARRAY, items: { type: Type.STRING } },
          bilingualQuotes: { type: Type.ARRAY, items: BILINGUAL_QUOTE_SCHEMA },
          rootCause: { type: Type.STRING },
          actionRecommendation: { type: Type.STRING },
        },
        required: ['issue', 'category', 'count', 'percentage', 'severity', 'affectedBranches', 'bilingualQuotes', 'rootCause', 'actionRecommendation'],
      },
    },
    topAppreciations: {
      type: Type.ARRAY,
      description: 'Why customers said YES: positive feedback, satisfaction, active usage, or agreement/promise to reactivate and use MyCash. Empty array [] if none exist.',
      items: {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          count: { type: Type.INTEGER },
          percentage: { type: Type.INTEGER },
          convertingBranches: { type: Type.ARRAY, items: { type: Type.STRING } },
          bilingualQuotes: { type: Type.ARRAY, items: BILINGUAL_QUOTE_SCHEMA },
          keyDriver: { type: Type.STRING },
        },
        required: ['theme', 'count', 'percentage', 'convertingBranches', 'bilingualQuotes', 'keyDriver'],
      },
    },
    rejectionAnalysis: {
      type: Type.ARRAY,
      description: 'Why customers said NO or hesitated: objections, dormancy reasons, competitor loyalty, PIN/SIM/ID barriers, lack of funds, wrong number, or refusals. Empty array [] if none exist.',
      items: {
        type: Type.OBJECT,
        properties: {
          reason: { type: Type.STRING },
          count: { type: Type.INTEGER },
          percentage: { type: Type.INTEGER },
          affectedBranches: { type: Type.ARRAY, items: { type: Type.STRING } },
          bilingualQuotes: { type: Type.ARRAY, items: BILINGUAL_QUOTE_SCHEMA },
          customerExplanation: { type: Type.STRING },
          overcomingScript: { type: Type.STRING },
        },
        required: ['reason', 'count', 'percentage', 'affectedBranches', 'bilingualQuotes', 'customerExplanation', 'overcomingScript'],
      },
    },
    appointmentInsights: {
      type: Type.OBJECT,
      properties: {
        keyObservations: { type: Type.STRING },
        actionableFollowupAdvice: { type: Type.STRING },
      },
      required: ['keyObservations', 'actionableFollowupAdvice'],
    },
    agentCoachingInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentName: { type: Type.STRING },
          customerSentimentSummary: { type: Type.STRING },
          tailoredCoachingAdvice: { type: Type.STRING },
        },
        required: ['agentName', 'customerSentimentSummary', 'tailoredCoachingAdvice'],
      },
    },
    strategicOvercomeAdvices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          priority: { type: Type.STRING, description: '"IMMEDIATE", "STRATEGIC", or "OPERATIONAL"' },
          description: { type: Type.STRING },
          expectedImpact: { type: Type.STRING },
        },
        required: ['title', 'priority', 'description', 'expectedImpact'],
      },
    },
  },
  required: [
    'executiveSummary',
    'noteTranslations',
    'topComplaints',
    'topAppreciations',
    'rejectionAnalysis',
    'appointmentInsights',
    'agentCoachingInsights',
    'strategicOvercomeAdvices',
  ],
};

// Normalize legacy/deprecated model aliases to valid @google/genai models
const normalizeModelName = (model: string): string => {
  const m = (model || '').trim();
  if (!m || m === 'gemini-3.8-flash' || m === 'gemini-2.5-flash' || m === 'gemini-2.0-flash' || m === 'gemini-1.5-flash') {
    return 'gemini-4-hydrogen';
  }
  return m;
};

// Helper to obtain server-side Gemini client
const getGeminiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
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

// POST /api/ai-intelligence - Dedicated AI call center analytics & Somali translation endpoint
app.post('/api/ai-intelligence', async (req, res) => {
  try {
    const {
      prompt,
      systemInstruction,
      useAnalysisSchema = false,
      candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    } = req.body;

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

    const modelsToTry = Array.from(new Set((candidateModels as string[]).map(normalizeModelName)));

    let text: string | undefined;
    let usedModel = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[Server AI Intelligence] Generating analysis with model: ${model}`);
        const config: Record<string, any> = {
          responseMimeType: 'application/json',
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }
        if (useAnalysisSchema) {
          config.responseSchema = AI_INTELLIGENCE_RESPONSE_SCHEMA;
        }
        if (model === 'gemini-4-hydrogen') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
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
    const { prompt, model = 'gemini-4-hydrogen', contents, config } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const payloadContents = contents || prompt;
    if (!payloadContents) {
      return res.status(400).json({ error: 'Missing prompt or contents in request.' });
    }

    const safeModel = normalizeModelName(model);
    const safeConfig = config ? { ...config } : undefined;
    if (safeConfig && safeModel.startsWith('gemini-4-')) {
      delete safeConfig.temperature;
      delete safeConfig.topP;
      delete safeConfig.topK;
      delete safeConfig.candidateCount;
    }

    const response = await ai.models.generateContent({
      model: safeModel,
      contents: payloadContents,
      config: safeConfig,
    });

    return res.json({
      success: true,
      text: response.text,
      model: safeModel,
    });
  } catch (error: any) {
    console.error('[Server Gemini Generate Error]:', error);
    return res.status(500).json({ error: error?.message || 'Error generating Gemini response' });
  }
});

// POST /api/gemini/stream - Server-Sent Events (SSE) streaming endpoint
app.post('/api/gemini/stream', async (req, res) => {
  try {
    const { prompt, model = 'gemini-4-hydrogen', contents, config } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const payloadContents = contents || prompt;
    if (!payloadContents) {
      return res.status(400).json({ error: 'Missing prompt or contents in request.' });
    }

    const safeModel = normalizeModelName(model);
    const safeConfig = config ? { ...config } : undefined;
    if (safeConfig && safeModel.startsWith('gemini-4-')) {
      delete safeConfig.temperature;
      delete safeConfig.topP;
      delete safeConfig.topK;
      delete safeConfig.candidateCount;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ai.models.generateContentStream({
      model: safeModel,
      contents: payloadContents,
      config: safeConfig,
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
