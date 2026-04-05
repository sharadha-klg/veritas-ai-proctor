import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, sessionId } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
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
            content: `You are an exam proctoring AI. Analyze the webcam image and detect:
1. GAZE: Is the student looking away from the screen? (looking left, right, up, down significantly)
2. MULTIPLE_PERSONS: Is there more than one person visible in the frame?
3. SHADOW: Are there suspicious shadows suggesting another person nearby but out of frame?
4. NO_FACE: Is the student's face not visible or mostly hidden?

Respond ONLY with a JSON object (no markdown):
{
  "violations": [
    {"type": "GAZE"|"MULTIPLE_PERSONS"|"SHADOW"|"NO_FACE", "confidence": 0.0-1.0, "description": "brief description"}
  ],
  "is_clean": true/false
}

Only report violations with confidence >= 0.7. If everything looks normal, return {"violations": [], "is_clean": true}.
Be strict but fair - brief glances away are normal, sustained looking away is suspicious.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this webcam frame from a proctored exam for violations:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_proctoring_analysis",
              description: "Report the proctoring analysis results",
              parameters: {
                type: "object",
                properties: {
                  violations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["GAZE", "MULTIPLE_PERSONS", "SHADOW", "NO_FACE"] },
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
        tool_choice: { type: "function", function: { name: "report_proctoring_analysis" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", violations: [], is_clean: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted", violations: [], is_clean: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ violations: [], is_clean: true, error: "AI analysis failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
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
    console.error("analyze-proctoring error:", e);
    return new Response(JSON.stringify({ violations: [], is_clean: true, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
