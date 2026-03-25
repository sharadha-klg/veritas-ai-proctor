import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");

  try {
    // GET / — root
    if (req.method === "GET" && (path === "" || path === "api")) {
      return new Response(
        JSON.stringify({ message: "chatterbox server is running" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /ping
    if (req.method === "GET" && path === "ping") {
      return new Response(
        JSON.stringify({ status: "Alive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /hello/:name
    const helloMatch = path.match(/^hello\/(.+)$/);
    if (req.method === "GET" && helloMatch) {
      const name = decodeURIComponent(helloMatch[1]);
      return new Response(
        JSON.stringify({ message: `Hello ${name}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
