import { GoogleGenAI } from '@google/genai';

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  let payload: any = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    // ignore parse error here, handled below
  }

  // Obtain Gemini API key from Netlify environment variables, auth header, or payload
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || authKey || payload.apiKey || '';

  if (!apiKey) {
    console.error('[Netlify AI Intelligence] Missing GEMINI_API_KEY or VITE_GEMINI_API_KEY in environment variables.');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Gemini API key is not configured in Netlify Site Settings (Environment Variables: GEMINI_API_KEY or VITE_GEMINI_API_KEY).',
        code: 'MISSING_API_KEY'
      })
    };
  }

  try {
    const { prompt, candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'] } = payload;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid "prompt" parameter in request payload.' })
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    let text: string | undefined;
    let usedModel = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Netlify AI Intelligence] Generating analysis with model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
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
          details: lastError?.message || String(lastError) 
        })
      };
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch (parseErr) {
      // Clean possible markdown code fences if model wrapped in ```json
      const cleanJson = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
      parsedData = JSON.parse(cleanJson);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        model: usedModel,
        data: parsedData
      })
    };
  } catch (error: any) {
    console.error('[Netlify AI Intelligence Error]:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error?.message || 'Internal server error while processing Gemini analysis' 
      })
    };
  }
};
