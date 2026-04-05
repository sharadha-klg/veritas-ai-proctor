import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Violation {
  type: string;
  confidence: number;
  description: string;
}

interface UseCameraProctoringOptions {
  sessionId: string;
  enabled: boolean;
  intervalMs?: number;
  onTerminate: () => void;
}

export const useCameraProctoring = ({
  sessionId,
  enabled,
  intervalMs = 15000,
  onTerminate,
}: UseCameraProctoringOptions) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastViolation, setLastViolation] = useState<string | null>(null);
  const warningCountRef = useRef(0);
  const analyzingRef = useRef(false);

  // Start camera
  useEffect(() => {
    if (!enabled) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (err) {
        console.error("Camera access failed:", err);
        toast.error("Camera access is required for this exam");
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, 320, 240);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    return dataUrl.split(",")[1]; // base64 only
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (analyzingRef.current || !cameraReady) return;
    analyzingRef.current = true;

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) return;

      const { data, error } = await supabase.functions.invoke("analyze-proctoring", {
        body: { imageBase64, sessionId },
      });

      if (error) {
        console.error("Proctoring analysis error:", error);
        return;
      }

      if (data && !data.is_clean && data.violations?.length > 0) {
        const violations: Violation[] = data.violations;
        const highConfidence = violations.filter((v) => v.confidence >= 0.7);

        if (highConfidence.length > 0) {
          const newCount = warningCountRef.current + 1;
          warningCountRef.current = newCount;
          setWarningCount(newCount);

          const violationDesc = highConfidence
            .map((v) => v.description)
            .join("; ");
          setLastViolation(violationDesc);

          // Log to proctoring_events
          for (const v of highConfidence) {
            const riskDelta =
              v.type === "MULTIPLE_PERSONS" ? 20
              : v.type === "SHADOW" ? 15
              : v.type === "GAZE" ? 10
              : v.type === "NO_FACE" ? 12
              : 8;

            await supabase.from("proctoring_events").insert({
              session_id: sessionId,
              event_type: `camera_${v.type.toLowerCase()}`,
              severity: v.confidence >= 0.9 ? "high" : "medium",
              description: v.description,
              risk_delta: riskDelta,
            });
          }

          if (newCount >= 3) {
            toast.error(
              "Exam terminated: 3 proctoring violations detected.",
              { duration: 10000 }
            );
            onTerminate();
          } else {
            toast.warning(
              `⚠️ Warning ${newCount}/3: ${violationDesc}. ${3 - newCount} warning(s) remaining before termination.`,
              { duration: 8000 }
            );
          }
        }
      }
    } catch (err) {
      console.error("Frame analysis failed:", err);
    } finally {
      analyzingRef.current = false;
    }
  }, [cameraReady, captureFrame, sessionId, onTerminate]);

  // Periodic analysis
  useEffect(() => {
    if (!enabled || !cameraReady) return;

    // First analysis after 5 seconds
    const initialTimeout = setTimeout(analyzeFrame, 5000);
    const interval = setInterval(analyzeFrame, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, cameraReady, analyzeFrame, intervalMs]);

  return {
    videoRef,
    canvasRef,
    warningCount,
    cameraReady,
    lastViolation,
    maxWarnings: 3,
  };
};
