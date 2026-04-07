import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioViolation {
  type: string;
  confidence: number;
  description: string;
}

interface UseAudioProctoringOptions {
  sessionId: string;
  enabled: boolean;
  intervalMs?: number;
  maxWarnings?: number;
  onTerminate: () => void;
}

export const useAudioProctoring = ({
  sessionId,
  enabled,
  intervalMs = 20000,
  maxWarnings = 5,
  onTerminate,
}: UseAudioProctoringOptions) => {
  const [audioWarningCount, setAudioWarningCount] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const [lastAudioViolation, setLastAudioViolation] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioWarningRef = useRef(0);
  const analyzingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Start microphone
  useEffect(() => {
    if (!enabled) return;

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: false },
        });
        streamRef.current = stream;
        setMicReady(true);
      } catch (err) {
        console.error("Microphone access failed:", err);
        toast.error("Microphone access is required for this exam");
      }
    };

    startMic();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  const captureAudio = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!streamRef.current) {
        resolve(null);
        return;
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(",")[1] || null;
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 5000); // Record 5 seconds
    });
  }, []);

  const analyzeAudio = useCallback(async () => {
    if (analyzingRef.current || !micReady) return;
    analyzingRef.current = true;

    try {
      const audioBase64 = await captureAudio();
      if (!audioBase64) return;

      const { data, error } = await supabase.functions.invoke("analyze-audio", {
        body: { audioBase64, sessionId, durationMs: 5000 },
      });

      if (error) {
        console.error("Audio proctoring error:", error);
        return;
      }

      if (data && !data.is_clean && data.violations?.length > 0) {
        const violations: AudioViolation[] = data.violations;
        const highConfidence = violations.filter((v) => v.confidence >= 0.7);

        if (highConfidence.length > 0) {
          const newCount = audioWarningRef.current + 1;
          audioWarningRef.current = newCount;
          setAudioWarningCount(newCount);

          const violationDesc = highConfidence
            .map((v) => v.description)
            .join("; ");
          setLastAudioViolation(violationDesc);

          // Log to proctoring_events
          for (const v of highConfidence) {
            const riskDelta =
              v.type === "MULTIPLE_VOICES" ? 15
              : v.type === "BACKGROUND_VOICE" ? 10
              : 8;

            await supabase.from("proctoring_events").insert({
              session_id: sessionId,
              event_type: `audio_${v.type.toLowerCase()}`,
              severity: v.confidence >= 0.9 ? "high" : "medium",
              description: v.description,
              risk_delta: riskDelta,
            });
          }

          if (newCount >= maxWarnings) {
            toast.error(
              `Exam terminated: ${maxWarnings} audio violations detected.`,
              { duration: 10000 }
            );
            onTerminate();
          } else {
            toast.warning(
              `🎙️ Audio Warning ${newCount}/${maxWarnings}: ${violationDesc}. ${maxWarnings - newCount} warning(s) remaining.`,
              { duration: 8000 }
            );
          }
        }
      }
    } catch (err) {
      console.error("Audio analysis failed:", err);
    } finally {
      analyzingRef.current = false;
    }
  }, [micReady, captureAudio, sessionId, onTerminate, maxWarnings]);

  // Periodic analysis
  useEffect(() => {
    if (!enabled || !micReady) return;

    const initialTimeout = setTimeout(analyzeAudio, 10000);
    const interval = setInterval(analyzeAudio, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, micReady, analyzeAudio, intervalMs]);

  return {
    audioWarningCount,
    micReady,
    lastAudioViolation,
    maxAudioWarnings: maxWarnings,
  };
};
