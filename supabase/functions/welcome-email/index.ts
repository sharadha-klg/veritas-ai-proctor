import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function welcomeEmailHtml(name: string, role: string) {
  const features = role === "student"
    ? `
      <li style="padding: 8px 0; border-bottom: 1px solid #27272a;">📝 Take AI-proctored exams securely</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #27272a;">🔑 Receive unique exam keys via notifications & email</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #27272a;">📊 View detailed results and performance analytics</li>
      <li style="padding: 8px 0;">🛡️ Fair examination with anti-cheating measures</li>`
    : `
      <li style="padding: 8px 0; border-bottom: 1px solid #27272a;">🤖 Generate questions with AI assistance</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #27272a;">📋 Create & manage MCQ and coding exams</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #27272a;">👁️ AI-powered proctoring with risk scoring</li>
      <li style="padding: 8px 0;">📈 Detailed analytics and result management</li>`;

  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e4e4e7; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white;">Welcome to Veritas AI! 🎉</h1>
      <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Your secure examination platform</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; margin: 0 0 16px;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 24px;">Welcome aboard! Your account has been created as a <strong style="color: #818cf8;">${role}</strong>. Here's what you can do:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #d4d4d8;">
          ${features}
        </ul>
      </div>
      <p style="font-size: 13px; color: #71717a; margin: 0; text-align: center;">If you have any questions, feel free to reach out to us.</p>
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

    const { email, name, role } = await req.json();
    if (!email || !name) throw new Error("Missing required fields: email, name");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpEmail, pass: smtpPassword },
    });

    await transporter.sendMail({
      from: `"Veritas AI" <${smtpEmail}>`,
      to: `"${name}" <${email}>`,
      subject: "🎉 Welcome to Veritas AI — Your Secure Exam Platform",
      html: welcomeEmailHtml(name, role || "student"),
    });

    console.log(`Welcome email sent to ${email}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("welcome-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
