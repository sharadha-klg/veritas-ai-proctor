import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ExamKeyEntry from "@/components/exam/ExamKeyEntry";
import SystemCheckPage from "@/components/exam/SystemCheckPage";
import ExamEnvironment from "@/components/exam/ExamEnvironment";

type ExamStage = "key" | "checks" | "exam" | "complete";

const TakeExam = () => {
  const { testId } = useParams<{ testId: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<ExamStage>("key");
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assignedKey, setAssignedKey] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);

  useEffect(() => {
    if (!testId || !user) return;

    const fetchTest = async () => {
      const [{ data: testData, error: testError }, { data: questionData }, { data: studentSession }] = await Promise.all([
        supabase.from("tests").select("*").eq("id", testId).single(),
        supabase.from("questions").select("*").eq("test_id", testId).order("sort_order", { ascending: true }),
        supabase
          .from("exam_sessions")
          .select("id, exam_key, status")
          .eq("test_id", testId)
          .eq("student_id", user.id)
          .maybeSingle(),
      ]);

      if (testError || !testData) {
        toast.error("Test not found");
        navigate("/student/dashboard");
        return;
      }

      setTest(testData);
      setQuestions(questionData || []);

      if (studentSession) {
        setSessionId(studentSession.id);
        setAssignedKey(studentSession.exam_key);

        if (studentSession.status === "in_progress") {
          setStage("exam");
        }
      }

      setLoadingTest(false);
    };

    fetchTest();
  }, [testId, user, navigate]);

  if (loading || (user && !profile)) {
    return <div className="min-h-screen gradient-bg flex items-center justify-center text-primary-foreground">Loading...</div>;
  }

  if (!user || profile?.role !== "student") {
    return <Navigate to="/student/login" />;
  }

  if (loadingTest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleVerifyKey = async (key: string): Promise<boolean> => {
    const { data: existing } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("test_id", testId!)
      .eq("student_id", user.id)
      .eq("exam_key", key)
      .single();

    if (existing) {
      setSessionId(existing.id);
      setAssignedKey(existing.exam_key);
      setStage("checks");
      return true;
    }

    const { data: session } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("test_id", testId!)
      .eq("exam_key", key)
      .eq("status", "pending")
      .single();

    if (session) {
      setSessionId(session.id);
      setAssignedKey(session.exam_key);
      setStage("checks");
      return true;
    }

    return false;
  };

  const handleSystemChecksPassed = async (results: Record<string, boolean>) => {
    if (sessionId) {
      await supabase
        .from("exam_sessions")
        .update({
          system_checks: results,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    try {
      await document.documentElement.requestFullscreen();
    } catch {}

    setStage("exam");
  };

  const handleExamComplete = () => {
    setStage("complete");
  };

  if (stage === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center opacity-0 animate-fade-in max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Exam Submitted</h1>
          <p className="text-sm text-muted-foreground mb-6">Your answers have been recorded. You'll receive your results soon.</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-6 py-3 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (stage === "key") {
    return (
      <ExamKeyEntry
        testName={test?.name || "Exam"}
        assignedKey={assignedKey}
        onVerify={handleVerifyKey}
        onBack={() => navigate("/student/dashboard")}
      />
    );
  }

  if (stage === "checks") {
    return (
      <SystemCheckPage
        onAllPassed={handleSystemChecksPassed}
        onCancel={() => navigate("/student/dashboard")}
      />
    );
  }

  if (stage === "exam" && sessionId) {
    return (
      <ExamEnvironment
        sessionId={sessionId}
        testId={testId!}
        testName={test.name}
        timeLimit={test.time_limit}
        questions={questions}
        isOpenBook={test.is_open_book}
        onComplete={handleExamComplete}
      />
    );
  }

  return null;
};

export default TakeExam;
