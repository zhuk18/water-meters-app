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

    const { resident, invoice } = await req.json();

    if (!resident || !resident.email) {
      return new Response(
        JSON.stringify({ error: "Resident email not provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!invoice || !invoice.file_url) {
      return new Response(
        JSON.stringify({ error: "Invoice URL not provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Water Meters <noreply@resend.dev>",
        to: resident.email,
        subject: "Jums ir jauns rēķins",
        html: `
          <h2>Jauns rēķins ir pieejams</h2>
          <p>Sveiki ${resident.name},</p>
          <p>Jums ir augšupielādēts jauns rēķins dzīvoklim ${resident.apartment}.</p>
          <p><strong>Faila nosaukums:</strong> ${invoice.file_name}</p>
          <p>
            <a href="${invoice.file_url}" 
               style="display: inline-block; padding: 10px 20px; background-color: #2c5f7c; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
              Lejupielādēt rēķinu
            </a>
            <a href="${Deno.env.get("APP_URL")}?resident=${resident.id}" 
               style="display: inline-block; padding: 10px 20px; background-color: #1a3a4d; color: white; text-decoration: none; border-radius: 5px;">
              Skatīt visus rēķinus
            </a>
          </p>
          <p>Ar cieņu,<br/>Ūdens skaitītāju pārvaldības sistēma</p>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
