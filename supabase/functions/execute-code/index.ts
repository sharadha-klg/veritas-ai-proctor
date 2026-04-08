import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_MAP: Record<string, string> = {
  python: "python3",
  c: "c",
  cpp: "cpp",
  java: "java",
  r: "r",
};

async function pollResult(id: string, maxAttempts = 20): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`
    );
    const data = await res.json();
    if (data.status === "completed") return data;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Code execution timed out");
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, stdin } = await req.json();

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: "Missing code or language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = LANGUAGE_MAP[language.toLowerCase()];
    if (!lang) {
      return new Response(
        JSON.stringify({
          error: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create execution job
    const createRes = await fetch("https://api.paiza.io/runners/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language: lang,
        input: stdin || "",
        api_key: "guest",
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Paiza create error:", createRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Code execution service unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createData = await createRes.json();
    const result = await pollResult(createData.id);

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const buildStderr = result.build_stderr || "";
    const exitCode = result.exit_code ?? (result.result === "success" ? 0 : 1);

    return new Response(
      JSON.stringify({
        output: stdout || stderr,
        stderr,
        stdout,
        exitCode,
        compileOutput: buildStderr ? buildStderr : "",
        compileError: result.build_result === "failure" ? buildStderr : "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("execute-code error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
