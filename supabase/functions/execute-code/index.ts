import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Piston API language mappings
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  c: { language: "c", version: "10.2.0" },
  cpp: { language: "c++", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
  r: { language: "r", version: "4.1.1" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, stdin } = await req.json();

    if (!code || !language) {
      return new Response(JSON.stringify({ error: "Missing code or language" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langConfig = LANGUAGE_MAP[language.toLowerCase()];
    if (!langConfig) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Piston API (free, no API key needed)
    const pistonResponse = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: language === "java" ? "Main.java" : `main.${language}`, content: code }],
        stdin: stdin || "",
        run_timeout: 10000, // 10 seconds max
        compile_timeout: 10000,
      }),
    });

    if (!pistonResponse.ok) {
      const errText = await pistonResponse.text();
      console.error("Piston error:", pistonResponse.status, errText);
      return new Response(JSON.stringify({ error: "Code execution service unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await pistonResponse.json();

    return new Response(JSON.stringify({
      output: result.run?.output || "",
      stderr: result.run?.stderr || "",
      stdout: result.run?.stdout || "",
      exitCode: result.run?.code ?? -1,
      compileOutput: result.compile?.output || "",
      compileError: result.compile?.stderr || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execute-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
