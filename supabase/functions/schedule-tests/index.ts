import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Activate tests whose scheduled_start has passed and are still scheduled/draft
    const { data: toActivate } = await supabase
      .from("tests")
      .select("id")
      .in("status", ["draft", "scheduled"])
      .not("scheduled_start", "is", null)
      .lte("scheduled_start", now);

    let activated = 0;
    for (const test of toActivate || []) {
      await supabase.from("tests").update({ status: "active" }).eq("id", test.id);
      activated++;
    }

    // Deactivate tests whose scheduled_end has passed and are still active
    const { data: toDeactivate } = await supabase
      .from("tests")
      .select("id")
      .eq("status", "active")
      .not("scheduled_end", "is", null)
      .lte("scheduled_end", now);

    let deactivated = 0;
    for (const test of toDeactivate || []) {
      await supabase.from("tests").update({ status: "inactive" }).eq("id", test.id);
      deactivated++;
    }

    return new Response(
      JSON.stringify({ activated, deactivated, timestamp: now }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
