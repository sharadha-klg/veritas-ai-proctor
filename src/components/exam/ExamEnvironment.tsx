import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertTriangle,
  Eye, Loader2, Camera, ShieldAlert
} from "lucide-react";
import { useCameraProctoring } from "@/hooks/useCameraProctoring";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  marks: number;
  options: string[] | null;
  language?: string | null;
  starter_code?: string | null;
  sort_order: number;
}

interface ExamEnvironmentProps {
  sessionId: string;
  testId: string;
  testName: string;
  timeLimit: number;
  questions: Question[];
  isOpenBook: boolean;
  onComplete: () => void;
}

const ExamEnvironment = ({
  sessionId, testId, testName, timeLimit,
  questions, isOpenBook, onComplete
}: ExamEnvironmentProps) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [riskScore, setRiskScore] = useState(0);
  const riskRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  const hasSubmittedRef = useRef(false);

  const handleTerminate = useCallback(() => {
    if (!hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      handleSubmit(true);
    }
  }, []);

  // Camera proctoring (disabled for open-book exams)
  const {
    videoRef, canvasRef, warningCount, cameraReady, lastViolation, maxWarnings
  } = useCameraProctoring({
    sessionId,
    enabled: !isOpenBook,
    intervalMs: 15000,
    onTerminate: handleTerminate,
  });

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            handleSubmit(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Proctoring: detect tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        logEvent("tab_switch", "medium", "Student switched to another tab", 8);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Proctoring: detect clipboard
  useEffect(() => {
    const handleCopy = () => logEvent("clipboard_copy", "medium", "Copy action detected", 5);
    const handlePaste = () => logEvent("clipboard_paste", "high", "Paste action detected during exam", 12);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  // Proctoring: detect fullscreen exit
  useEffect(() => {
    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        logEvent("fullscreen_exit", "high", "Student exited full-screen mode", 10);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const logEvent = useCallback(async (
    eventType: string, severity: string, description: string, riskDelta: number
  ) => {
    riskRef.current = Math.min(100, riskRef.current + riskDelta);
    setRiskScore(riskRef.current);

    await supabase.from("proctoring_events").insert({
      session_id: sessionIdRef.current,
      event_type: eventType,
      severity,
      description,
      risk_delta: riskDelta,
    });

    await supabase.from("exam_sessions")
      .update({
        risk_score: riskRef.current,
        is_flagged: riskRef.current >= 50,
      })
      .eq("id", sessionIdRef.current);
  }, []);

  const handleSubmit = async (terminated = false) => {
    setSubmitting(true);
    try {
      const answerRows = questions.map(q => ({
        session_id: sessionId,
        question_id: q.id,
        answer_text: answers[q.id] || "",
        is_correct: q.question_type === "mcq" ? undefined : undefined,
        marks_awarded: 0,
      }));

      await supabase.from("student_answers").insert(answerRows);
      await supabase.from("exam_sessions")
        .update({
          status: terminated ? "terminated" : "completed",
          completed_at: new Date().toISOString(),
          is_flagged: terminated ? true : riskRef.current >= 50,
        })
        .eq("id", sessionId);

      // Send completion email (fire-and-forget)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          supabase.functions.invoke("exam-completed-email", {
            body: {
              email: profile.email,
              name: profile.full_name,
              testName,
            },
          }).catch((e) => console.error("Completion email failed:", e));
        }
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      onComplete();
    } catch (e: any) {
      toast.error("Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[currentQ];
  const isUrgent = timeLeft < 300;
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-display font-bold gradient-text">Veritas AI</span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{testName}</span>
        </div>
        <div className="flex items-center gap-4">
          {!isOpenBook && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" /> Proctored
              </div>
              {/* Warning counter */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                warningCount >= 2
                  ? "bg-destructive/10 text-destructive"
                  : warningCount >= 1
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
              }`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                {warningCount}/{maxWarnings}
              </div>
            </>
          )}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums font-semibold ${
            isUrgent ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted text-foreground"
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Warning banner */}
      {warningCount > 0 && lastViolation && (
        <div className={`px-6 py-2 flex items-center gap-2 text-xs border-b ${
          warningCount >= 2
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : "bg-warning/10 text-warning border-warning/20"
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Warning {warningCount}/{maxWarnings}: {lastViolation}</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Questions area */}
        <div className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded text-muted-foreground">
              Question {currentQ + 1} of {questions.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{q.marks} marks</span>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <p className="text-foreground font-medium leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
          </div>

          {/* MCQ Options */}
          {q.question_type === "mcq" && q.options && (
            <div className="space-y-3">
              {(q.options as string[]).map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all active:scale-[0.99] flex items-center gap-3 ${
                    answers[q.id] === opt
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    answers[q.id] === opt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-sm text-foreground">{opt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Coding answer */}
          {q.question_type === "coding" && (
            <div>
              {q.language && (
                <p className="text-xs text-muted-foreground mb-2">Language: {q.language}</p>
              )}
              <textarea
                value={answers[q.id] || q.starter_code || ""}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                className="w-full min-h-[240px] px-4 py-3 rounded-xl bg-muted border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                placeholder="Write your code here..."
              />
            </div>
          )}
        </div>

        {/* Camera feed (small, top-right corner) */}
        {!isOpenBook && (
          <div className="absolute top-16 right-4 z-50">
            <div className="relative rounded-xl overflow-hidden border-2 border-border shadow-lg bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-32 h-24 object-cover"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-1 left-1 flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${cameraReady ? "bg-success animate-pulse" : "bg-destructive"}`} />
                <span className="text-[10px] text-white drop-shadow-md font-medium">
                  {cameraReady ? "Live" : "..."}
                </span>
              </div>
              <div className="absolute top-1 right-1">
                <Camera className="w-3 h-3 text-white/60" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-all active:scale-[0.97] disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Question dots */}
        <div className="flex gap-1.5 flex-wrap justify-center max-w-[300px]">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-all active:scale-[0.95] ${
                i === currentQ
                  ? "gradient-bg-horizontal text-primary-foreground"
                  : answers[questions[i].id]
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ(currentQ + 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-success text-success-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamEnvironment;
