// Supabase Edge Function: send-whatsapp-sms
// Deployed to: https://<project-ref>.supabase.co/functions/v1/send-whatsapp-sms
//
// Purpose: Dispatches WhatsApp SMS messages to customers based on Excel status
// or dormant period (>90 days) using Meta's WhatsApp Cloud API.
//
// Configuration / Secrets required in Supabase Dashboard (Edge Functions -> Secrets):
// 1. WHATSAPP_API_TOKEN: Meta Graph API User/System Token (Bearer ...)
// 2. WHATSAPP_PHONE_NUMBER_ID: Sender phone number ID from WhatsApp Business Manager
// 3. (Optional) WHATSAPP_API_VERSION: defaults to v19.0
// 4. SUPABASE_URL: automatically provided by Supabase Edge Runtime
// 5. SUPABASE_SERVICE_ROLE_KEY: automatically provided by Supabase Edge Runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

interface RecipientPayload {
  customerId?: string;
  customerName: string;
  phoneNumber: string;
  areaOfReg?: string;
  status?: string;
  dormantDays?: number;
  customParams?: Record<string, string>;
}

interface RequestPayload {
  action?: "send_campaign" | "send_test" | "verify_token";
  recipients?: RecipientPayload[];
  messageTemplate: string;
  campaignTitle?: string;
  filterType?: "STATUS" | "DORMANT_90" | "CUSTOM";
  selectedStatuses?: string[];
  minDormantDays?: number;
  targetBranch?: string;
  triggeredById?: string;
  triggeredByName?: string;
  // Overrides if passed from authenticated client
  whatsappToken?: string;
  phoneNumberId?: string;
}

/**
 * Normalizes phone numbers to international format (E.164):
 * Somalia: +252 61xxxxxxx -> 25261xxxxxxx
 */
function cleanPhoneNumber(rawPhone: string): string {
  let cleaned = String(rawPhone || "").trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  // Local Somalia format e.g. 061XXXXXXX -> 25261XXXXXXX
  if (cleaned.startsWith("06") && cleaned.length === 9) {
    cleaned = "252" + cleaned.substring(1);
  } else if (cleaned.startsWith("6") && cleaned.length === 8) {
    cleaned = "252" + cleaned;
  }
  return cleaned;
}

/**
 * Replaces message placeholders: {{customerName}}, {{phoneNumber}}, {{branch}}, {{status}}, {{dormantDays}}
 */
function interpolateMessage(
  template: string,
  recipient: RecipientPayload
): string {
  let result = template;
  result = result.replace(/\{\{customerName\}\}/gi, recipient.customerName || "Customer");
  result = result.replace(/\{\{name\}\}/gi, recipient.customerName || "Customer");
  result = result.replace(/\{\{phoneNumber\}\}/gi, recipient.phoneNumber || "");
  result = result.replace(/\{\{branch\}\}/gi, recipient.areaOfReg || "MyCash");
  result = result.replace(/\{\{area\}\}/gi, recipient.areaOfReg || "MyCash");
  result = result.replace(/\{\{status\}\}/gi, recipient.status || "Customer");
  result = result.replace(/\{\{dormantDays\}\}/gi, String(recipient.dormantDays ?? "90+"));
  return result;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestPayload = await req.json().catch(() => ({ messageTemplate: "" }));

    const whatsappToken = body.whatsappToken || Deno.env.get("WHATSAPP_API_TOKEN") || Deno.env.get("WHATSAPP_TOKEN") || "";
    const phoneNumberId = body.phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
    const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") || "v19.0";

    // Action 1: Verify Token / Connectivity
    if (body.action === "verify_token") {
      if (!whatsappToken || !phoneNumberId) {
        return new Response(
          JSON.stringify({
            success: false,
            configured: false,
            message: "WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured in Supabase Secrets."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check WhatsApp Business phone number details
      const verifyRes = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json"
          }
        }
      );
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            configured: true,
            error: verifyData.error?.message || "Invalid credentials or token expired",
            details: verifyData
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          configured: true,
          displayPhoneNumber: verifyData.display_phone_number || verifyData.id,
          verifiedName: verifyData.verified_name || "WhatsApp Business Account",
          qualityRating: verifyData.quality_rating || "GREEN"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 2: Send Single Test Message or Campaign Batch
    const recipients = body.recipients || [];
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided in request payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaignId = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const template = body.messageTemplate || "Hello {{customerName}}, welcome to MyCash!";

    // Record Campaign record in Supabase
    try {
      await supabase.from("whatsapp_campaigns").insert({
        id: campaignId,
        title: body.campaignTitle || `WhatsApp Broadcast ${new Date().toLocaleDateString()}`,
        filter_type: body.filterType || "CUSTOM",
        selected_statuses: body.selectedStatuses || [],
        min_dormant_days: body.minDormantDays || 0,
        target_branch: body.targetBranch || "ALL",
        message_template: template,
        total_recipients: recipients.length,
        successful_count: 0,
        failed_count: 0,
        status: "SENDING",
        triggered_by_id: body.triggeredById || "",
        triggered_by_name: body.triggeredByName || "HQ Admin",
        created_at: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn("Could not record whatsapp_campaigns in database:", dbErr);
    }

    // If WhatsApp Token is not set in secrets, we can simulate delivery with logs so the user
    // can test the UI workflows end-to-end and see clear instructions to supply their token!
    const isMockMode = !whatsappToken || !phoneNumberId;

    let successfulCount = 0;
    let failedCount = 0;
    const messageLogs: any[] = [];
    const results: any[] = [];

    // Process messages with small chunks to prevent rate limiting
    for (const recipient of recipients) {
      const normalizedPhone = cleanPhoneNumber(recipient.phoneNumber);
      const personalizedBody = interpolateMessage(template, recipient);
      const logId = `wlog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      if (isMockMode) {
        // Simulated dispatch
        successfulCount++;
        const simulatedLog = {
          id: logId,
          campaign_id: campaignId,
          customer_id: recipient.customerId || null,
          customer_name: recipient.customerName,
          phone_number: normalizedPhone,
          message_body: personalizedBody,
          status: "SIMULATED",
          whatsapp_message_id: `mock-msg-${Date.now()}-${successfulCount}`,
          error_message: "Simulated: WhatsApp token pending in Supabase Secrets.",
          sent_at: new Date().toISOString()
        };
        messageLogs.push(simulatedLog);
        results.push({
          recipient: recipient.customerName,
          phone: normalizedPhone,
          status: "SIMULATED",
          message: "Simulated successfully. Add WHATSAPP_API_TOKEN in Supabase Secrets for live transmission."
        });
      } else {
        // Live WhatsApp Cloud API call
        try {
          const waResponse = await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${whatsappToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: normalizedPhone,
                type: "text",
                text: { preview_url: false, body: personalizedBody }
              })
            }
          );

          const waData = await waResponse.json();

          if (waResponse.ok && waData.messages && waData.messages.length > 0) {
            successfulCount++;
            const liveLog = {
              id: logId,
              campaign_id: campaignId,
              customer_id: recipient.customerId || null,
              customer_name: recipient.customerName,
              phone_number: normalizedPhone,
              message_body: personalizedBody,
              status: "SENT",
              whatsapp_message_id: waData.messages[0].id,
              error_message: null,
              sent_at: new Date().toISOString()
            };
            messageLogs.push(liveLog);
            results.push({
              recipient: recipient.customerName,
              phone: normalizedPhone,
              status: "SENT",
              messageId: waData.messages[0].id
            });
          } else {
            failedCount++;
            const errMsg = waData.error?.message || "WhatsApp API rejected message dispatch.";
            const failLog = {
              id: logId,
              campaign_id: campaignId,
              customer_id: recipient.customerId || null,
              customer_name: recipient.customerName,
              phone_number: normalizedPhone,
              message_body: personalizedBody,
              status: "FAILED",
              whatsapp_message_id: null,
              error_message: errMsg,
              sent_at: new Date().toISOString()
            };
            messageLogs.push(failLog);
            results.push({
              recipient: recipient.customerName,
              phone: normalizedPhone,
              status: "FAILED",
              error: errMsg
            });
          }
        } catch (fetchErr: any) {
          failedCount++;
          const failLog = {
            id: logId,
            campaign_id: campaignId,
            customer_id: recipient.customerId || null,
            customer_name: recipient.customerName,
            phone_number: normalizedPhone,
            message_body: personalizedBody,
            status: "FAILED",
            whatsapp_message_id: null,
            error_message: fetchErr.message || "Network error calling Meta WhatsApp API",
            sent_at: new Date().toISOString()
          };
          messageLogs.push(failLog);
          results.push({
            recipient: recipient.customerName,
            phone: normalizedPhone,
            status: "FAILED",
            error: fetchErr.message
          });
        }
      }
    }

    // Persist logs & update campaign status in Supabase
    try {
      if (messageLogs.length > 0) {
        await supabase.from("whatsapp_message_logs").insert(messageLogs);
      }
      await supabase
        .from("whatsapp_campaigns")
        .update({
          successful_count: successfulCount,
          failed_count: failedCount,
          status: failedCount === recipients.length ? "FAILED" : "COMPLETED",
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignId);
    } catch (dbUpdateErr) {
      console.warn("Could not update campaign status in database:", dbUpdateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        isMockMode,
        totalRecipients: recipients.length,
        successfulCount,
        failedCount,
        results: results.slice(0, 50),
        message: isMockMode
          ? "Campaign simulated! Supabase Edge Function is ready. Add WHATSAPP_API_TOKEN & WHATSAPP_PHONE_NUMBER_ID to Supabase secrets for real-time live WhatsApp SMS."
          : `Dispatched ${successfulCount} of ${recipients.length} messages successfully via WhatsApp Cloud API.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error in WhatsApp Edge Function" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
