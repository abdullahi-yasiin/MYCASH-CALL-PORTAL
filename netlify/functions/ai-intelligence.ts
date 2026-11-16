import { GoogleGenAI, ThinkingLevel, Type, Schema } from '@google/genai';

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
    executiveSummary: { type: Type.STRING },
    noteTranslations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalNote: { type: Type.STRING },
          detectedLanguage: { type: Type.STRING },
          englishTranslation: { type: Type.STRING },
          decisionCategory: { type: Type.STRING },
        },
        required: ['originalNote', 'detectedLanguage', 'englishTranslation', 'decisionCategory'],
      },
    },
    topComplaints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          category: { type: Type.STRING },
          count: { type: Type.INTEGER },
          percentage: { type: Type.INTEGER },
          severity: { type: Type.STRING },
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
          priority: { type: Type.STRING },
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

const normalizeModelName = (model: string): string => {
  const m = (model || '').trim();
  if (!m || m === 'gemini-3.8-flash' || m === 'gemini-2.5-flash' || m === 'gemini-2.0-flash' || m === 'gemini-1.5-flash') {
    return 'gemini-4-hydrogen';
  }
  return m;
};

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  let payload: any = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    // handled below
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    authKey ||
    payload.apiKey ||
    '';

  if (!apiKey) {
    console.error('[Netlify AI Intelligence] Missing GEMINI_API_KEY, VITE_GEMINI_API_KEY, or GOOGLE_API_KEY in environment variables.');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Gemini API key is not configured in Netlify Site Settings (Environment Variables: GEMINI_API_KEY).',
        code: 'MISSING_API_KEY',
      }),
    };
  }

  try {
    const {
      prompt,
      systemInstruction,
      useAnalysisSchema = false,
      candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    } = payload;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid "prompt" parameter in request payload.' }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelsToTry = Array.from(new Set((candidateModels as string[]).map(normalizeModelName)));

    let text: string | undefined;
    let usedModel = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[Netlify AI Intelligence] Generating analysis with model: ${model}`);
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
          console.log(`[Netlify AI Intelligence] Model ${model} generated content successfully.`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Netlify AI Intelligence] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!text) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Gemini models failed to return content.',
          details: lastError?.message || String(lastError),
        }),
      };
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch {
      const cleanJson = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
      parsedData = JSON.parse(cleanJson);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        model: usedModel,
        data: parsedData,
      }),
    };
  } catch (error: any) {
    console.error('[Netlify AI Intelligence Error]:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error?.message || 'Internal server error while processing Gemini analysis',
      }),
    };
  }
};
