import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioBase64, sessionId, durationMs } = await req.json();

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an exam audio proctoring AI. Analyze the audio clip from a proctored exam environment and detect:
1. BACKGROUND_VOICE: Are there voices in the background (someone talking, whispering, or dictating answers)?
2. MULTIPLE_VOICES: Are there clearly multiple different people speaking?
3. SUSPICIOUS_AUDIO: Any other suspicious sounds like phone ringing, notification sounds, or text-to-speech?

Respond ONLY with a JSON object (no markdown):
{
  "violations": [
    {"type": "BACKGROUND_VOICE"|"MULTIPLE_VOICES"|"SUSPICIOUS_AUDIO", "confidence": 0.0-1.0, "description": "brief description"}
  ],
  "is_clean": true/false
}

Only report violations with confidence >= 0.7. If the audio is silent or contains only normal ambient noise (keyboard typing, mouse clicks, breathing), return {"violations": [], "is_clean": true}.
Be strict but fair - a single cough or sigh is normal. Sustained talking or whispering is suspicious.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this ${durationMs || 5000}ms audio clip from a proctored exam for voice/sound violations:`
              },
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: "wav"
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_audio_analysis",
              description: "Report the audio proctoring analysis results",
              parameters: {
                type: "object",
                properties: {
                  violations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["BACKGROUND_VOICE", "MULTIPLE_VOICES", "SUSPICIOUS_AUDIO"] },
                        confidence: { type: "number" },
                        description: { type: "string" }
                      },
                      required: ["type", "confidence", "description"]
                    }
                  },
                  is_clean: { type: "boolean" }
                },
                required: ["violations", "is_clean"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_audio_analysis" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ violations: [], is_clean: true, error: "Rate limited" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI audio error:", response.status, t);
      return new Response(JSON.stringify({ violations: [], is_clean: true, error: "AI analysis failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ violations: [], is_clean: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("analyze-audio error:", e);
    return new Response(JSON.stringify({ violations: [], is_clean: true, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
