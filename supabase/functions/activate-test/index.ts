import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(to: string, subject: string, html: string, toName?: string) {
  try {
    const smtpEmail = Deno.env.get("SMTP_EMAIL");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpEmail || !smtpPassword) { console.error("SMTP not configured"); return; }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: smtpEmail, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: `"Veritas AI" <${smtpEmail}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject, html,
    });
    console.log(`Email sent to ${to}`);
  } catch (e) {
    console.error("Email send error:", e);
  }
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
      <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 24px;">A new exam has been activated for you. Use the key below to start your exam.</p>
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
    <div style="padding: 16px 32px; background: #09090b; text-align: center; border-top: 1px solid #18181b;">
      <p style="font-size: 11px; color: #52525b; margin: 0;">© Veritas AI — Secure Examination Platform</p>
    </div>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!profile || profile.role !== "admin") throw new Error("Unauthorized: admin only");

    const { testId } = await req.json();
    if (!testId) throw new Error("testId is required");

    const { data: test, error: testErr } = await serviceClient
      .from("tests")
      .select("*")
      .eq("id", testId)
      .eq("admin_id", user.id)
      .single();
    if (testErr || !test) throw new Error("Test not found");

    // Activate the test
    await serviceClient.from("tests").update({ status: "active" }).eq("id", testId);

    // Get all student profiles
    const { data: students } = await serviceClient
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("role", "student");

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Test activated. No students registered yet.",
        sessions_created: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing sessions for this test
    const { data: existingSessions } = await serviceClient
      .from("exam_sessions")
      .select("student_id")
      .eq("test_id", testId);
    const existingStudentIds = new Set((existingSessions || []).map((s: any) => s.student_id));

    // Create exam sessions for students who don't have one yet
    const newSessions = students
      .filter((s) => !existingStudentIds.has(s.user_id))
      .map((s) => ({
        test_id: testId,
        student_id: s.user_id,
        status: "pending",
      }));

    if (newSessions.length > 0) {
      const { error: insertErr } = await serviceClient
        .from("exam_sessions")
        .insert(newSessions);
      if (insertErr) {
        console.error("Failed to create sessions:", insertErr);
        throw new Error("Failed to create exam sessions");
      }
    }

    // Fetch the created sessions to get exam keys
    const { data: createdSessions } = await serviceClient
      .from("exam_sessions")
      .select("student_id, exam_key")
      .eq("test_id", testId);

    // Create in-app notifications for each student with their exam key
    const notifications = (createdSessions || []).map((session: any) => {
      const student = students.find((s) => s.user_id === session.student_id);
      return {
        user_id: session.student_id,
        title: `Exam Key for "${test.name}"`,
        message: `Your exam key is: ${session.exam_key}. Use this key to start the exam.`,
        type: "exam_key",
        metadata: {
          test_id: testId,
          test_name: test.name,
          exam_key: session.exam_key,
          time_limit: test.time_limit,
        },
      };
    });

    if (notifications.length > 0) {
      const { error: notifErr } = await serviceClient
        .from("notifications")
        .insert(notifications);
      if (notifErr) {
        console.error("Failed to create notifications:", notifErr);
      }
    }

    // Send emails with exam keys to all students
    const emailPromises = (createdSessions || []).map((session: any) => {
      const student = students.find((s) => s.user_id === session.student_id);
      if (!student?.email) return Promise.resolve();
      return sendEmail(
        supabaseUrl,
        anonKey,
        student.email,
        `🔑 Exam Key for "${test.name}" — Veritas AI`,
        examKeyEmailHtml(student.full_name || "Student", test.name, session.exam_key, test.time_limit),
        student.full_name
      );
    });
    await Promise.allSettled(emailPromises);

    // Build response data
    const responseNotifications = (createdSessions || []).map((session: any) => {
      const student = students.find((s) => s.user_id === session.student_id);
      return {
        email: student?.email,
        name: student?.full_name,
        exam_key: session.exam_key,
      };
    });

    console.log(`Test "${test.name}" activated. ${responseNotifications.length} students notified via app + email.`);

    return new Response(JSON.stringify({
      success: true,
      message: `Test activated! ${newSessions.length} new sessions. ${notifications.length} students notified via app & email.`,
      sessions_created: newSessions.length,
      total_students: students.length,
      notifications: responseNotifications,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("activate-test error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
