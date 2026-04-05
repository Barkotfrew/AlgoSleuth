export const config = { auth: { verify_jwt: false } };
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: userError?.message ?? "Unable to resolve user." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = userData.user.email ?? "";
    let emailSent = false;
    let emailError: string | null = null;

    if (email) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AlgoSleuth <onboarding@resend.dev>",
              to: [email],
              subject: "Your AlgoSleuth account has been deleted",
              text:
                "Hello Agent,\n\nYour AlgoSleuth account has been permanently deleted. If you did not request this, please contact support.\n\n— AlgoSleuth Command",
              html: `
                <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;">
                  <h2 style="margin:0 0 12px 0;">Account deleted</h2>
                  <p>Hello Agent,</p>
                  <p>Your AlgoSleuth account has been permanently deleted.</p>
                  <p>If you did not request this, please contact support immediately.</p>
                  <p style="margin-top:16px;">— AlgoSleuth Command</p>
                </div>
              `,
            }),
          });

          emailSent = resendResponse.ok;
          if (!resendResponse.ok) {
            const resendBody = await resendResponse.json().catch(() => ({}));
            emailError = resendBody?.message ?? "Failed to send confirmation email.";
          }
        } catch (error) {
          emailError = error instanceof Error ? error.message : "Failed to send confirmation email.";
        }
      } else {
        emailError = "Missing RESEND_API_KEY.";
      }
    }

    return new Response(JSON.stringify({ success: true, emailSent, emailError }), {
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
