import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!profile || profile.role !== "admin") throw new Error("Unauthorized: admin only");

    const { testId } = await req.json();
    if (!testId) throw new Error("testId is required");

    // Verify test belongs to this admin
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

    // Build notification data
    const notifications = (createdSessions || []).map((session: any) => {
      const student = students.find((s) => s.user_id === session.student_id);
      return {
        email: student?.email,
        name: student?.full_name,
        exam_key: session.exam_key,
      };
    });

    // Use Lovable AI to generate a summary email notification (logged for now)
    console.log(`Test "${test.name}" activated. ${notifications.length} students notified.`);
    console.log("Exam keys generated:", notifications.map((n: any) => ({
      email: n.email,
      key: n.exam_key,
    })));

    return new Response(JSON.stringify({
      success: true,
      message: `Test activated! ${newSessions.length} new exam sessions created.`,
      sessions_created: newSessions.length,
      total_students: students.length,
      notifications,
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
