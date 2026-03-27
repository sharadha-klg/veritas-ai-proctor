import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function completionEmailHtml(studentName: string, testName: string) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e4e4e7; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 40px 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white;">✅ Exam Submitted!</h1>
      <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Veritas AI Examination Platform</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; margin: 0 0 16px;">Hi <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 24px;">You have successfully completed and submitted your exam. Here's a summary:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #71717a; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Exam Name</p>
        <p style="font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #e4e4e7;">${testName}</p>
        <div style="display: inline-block; background: #052e16; border: 1px solid #166534; border-radius: 8px; padding: 8px 20px;">
          <p style="font-size: 14px; color: #4ade80; margin: 0; font-weight: 600;">Successfully Submitted ✓</p>
        </div>
      </div>
      <div style="background: #1c1917; border: 1px solid #292524; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #a8a29e; margin: 0;">📋 Your answers have been recorded and will be evaluated. You'll be able to view your results on the dashboard once they're published.</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">View Dashboard →</a>
      </div>
    </div>
    <div style="padding: 16px 32px; background: #09090b; text-align: center; border-top: 1px solid #18181b;">
      <p style="font-size: 11px; color: #52525b; margin: 0;">© Veritas AI — Secure Examination Platform</p>
    </div>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const smtpEmail = Deno.env.get("SMTP_EMAIL");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpEmail || !smtpPassword) throw new Error("SMTP credentials not configured");

    const { email, name, testName } = await req.json();
    if (!email || !testName) throw new Error("Missing required fields: email, testName");

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: smtpEmail,
      password: smtpPassword,
    });

    await client.send({
      from: `Veritas AI <${smtpEmail}>`,
      to: name ? `${name} <${email}>` : email,
      subject: `✅ Exam "${testName}" Submitted Successfully — Veritas AI`,
      content: "",
      html: completionEmailHtml(name || "Student", testName),
    });

    await client.close();

    console.log(`Completion email sent to ${email} for test "${testName}"`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("exam-completed-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
