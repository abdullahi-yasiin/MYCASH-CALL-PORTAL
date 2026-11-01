// Netlify Serverless Function: /api/whatsapp-sms
// Proxies WhatsApp SMS requests to Meta WhatsApp Cloud API or Supabase Edge Function

interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
}

interface HandlerContext {
  clientContext?: any;
}

export const handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const whatsappToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN || payload.whatsappToken || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || payload.phoneNumberId || '';

    if (!whatsappToken || !phoneNumberId) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          isMockMode: true,
          message: 'WhatsApp integration active in test mode. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Netlify or Supabase Secrets to send live messages.',
          successfulCount: payload.recipients?.length || 0,
          failedCount: 0
        })
      };
    }

    // Forward to WhatsApp Cloud API
    const recipients = payload.recipients || [];
    let successfulCount = 0;
    let failedCount = 0;

    for (const r of recipients) {
      try {
        const cleanPhone = String(r.phoneNumber || '').replace(/[^\d]/g, '');
        const messageBody = (payload.messageTemplate || '').replace(/\{\{customerName\}\}/g, r.customerName || 'Customer');

        const waRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: { body: messageBody }
          })
        });

        if (waRes.ok) {
          successfulCount++;
        } else {
          failedCount++;
        }
      } catch (e) {
        failedCount++;
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        isMockMode: false,
        successfulCount,
        failedCount,
        totalRecipients: recipients.length
      })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
