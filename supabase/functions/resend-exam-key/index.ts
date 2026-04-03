import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import nodemailer from "npm:nodemailer@6.9.12";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  testId: z.string().uuid(),
});

async function sendEmail(to: string, subject: string, html: string, toName?: string) {
  const smtpEmail = Deno.env.get("SMTP_EMAIL");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");

  if (!smtpEmail || !smtpPassword) {
    throw new Error("SMTP credentials are not configured");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: smtpEmail, pass: smtpPassword },
  });

  await transporter.sendMail({
    from: `"Veritas AI" <${smtpEmail}>`,
    to: toName ? `"${toName}" <${to}>` : to,
    subject,
    html,
  });
}

function examKeyEmailHtml(studentName: string, testName: string, examKey: string, timeLimit: number) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e4e4e7; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: white;">🔑 Your Exam Key</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Veritas AI Examination Platform</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; margin: 0 0 16px;">Hi <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 24px;">Use the exam key below to access your exam.</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #71717a; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Exam Name</p>
        <p style="font-size: 18px; font-weight: 600; margin: 0 0 20px; color: #e4e4e7;">${testName}</p>
        <p style="font-size: 12px; color: #71717a; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Exam Key</p>
        <p style="font-size: 28px; font-weight: 700; margin: 0; color: #818cf8; font-family: monospace; letter-spacing: 4px;">${examKey}</p>
      </div>
      <div style="background: #1c1917; border: 1px solid #292524; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #a8a29e; margin: 0;">⏱ <strong>Time Limit:</strong> ${timeLimit} minutes</p>
      </div>
      <p style="font-size: 13px; color: #71717a; margin: 0;">Keep this key secure. Do not share it with anyone.</p>
    </div>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { testId } = parsed.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();

    if (authErr || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("role, email, full_name")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile || profile.role !== "student") {
      throw new Error("Unauthorized: student only");
    }

    const { data: test, error: testErr } = await serviceClient
      .from("tests")
      .select("id, name, time_limit, status")
      .eq("id", testId)
      .single();

    if (testErr || !test) throw new Error("Test not found");
    if (!["active", "scheduled"].includes(test.status)) {
      throw new Error("This exam is not available right now");
    }

    const { data: session, error: sessionErr } = await serviceClient
      .from("exam_sessions")
      .select("id, exam_key, status")
      .eq("test_id", testId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (sessionErr || !session) throw new Error("Exam session not found");
    if (session.status === "completed") throw new Error("This exam is already completed");
    if (!profile.email) throw new Error("No registered student email found");

    await sendEmail(
      profile.email,
      `🔑 Exam Key for "${test.name}" — Veritas AI`,
      examKeyEmailHtml(profile.full_name || "Student", test.name, session.exam_key, test.time_limit),
      profile.full_name,
    );

    return new Response(JSON.stringify({
      success: true,
      message: "Exam key sent to your registered email address.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resend-exam-key error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});