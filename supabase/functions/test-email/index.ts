export const config = { auth: { verify_jwt: false } };
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase service configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawAuthHeader = req.headers.get("Authorization") ?? "";
    const rawToken = req.headers.get("X-User-Token") ?? req.headers.get("x-user-token") ?? rawAuthHeader;
    const token = rawToken.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: userError?.message ?? "Unable to resolve user." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = userData.user.email;
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AlgoSleuth <onboarding@resend.dev>",
        to: [email],
        subject: "AlgoSleuth test email",
        text: "Hello Agent,\n\nThis is a test email from AlgoSleuth. Your notification pipeline is working.\n\n— AlgoSleuth Command",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;">
            <h2 style="margin:0 0 12px 0;">Test email delivered</h2>
            <p>Hello Agent,</p>
            <p>This is a test email from AlgoSleuth. Your notification pipeline is working.</p>
            <p style="margin-top:16px;">— AlgoSleuth Command</p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const resendBody = await resendResponse.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: resendBody?.message ?? "Resend request failed." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
