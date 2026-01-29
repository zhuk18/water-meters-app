import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }

    const { residents, subject, message } = await req.json();

    if (!residents || residents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No residents provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const validEmails = residents.filter((r) => r.email && r.email.trim());

    if (validEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid email addresses found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = await Promise.allSettled(
      validEmails.map((resident) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Water Meters <noreply@resend.dev>",
            to: resident.email,
            subject,
            html: `
              <h2>${subject}</h2>
              <p>Sveiki ${resident.name},</p>
              <p>${message}</p>
              <p>
                <a href="${Deno.env.get("APP_URL")}?resident=${resident.id}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #2c5f7c; color: white; text-decoration: none; border-radius: 5px;">
                  Ievadīt rādījumus
                </a>
              </p>
              <p>Ar cieņu,<br/>Ūdens skaitītāju pārvaldības sistēma</p>
            `,
          }),
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: validEmails.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send emails",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
