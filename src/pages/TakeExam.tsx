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
      const [{ data, error }, { data: qs }, { data: studentSession }] = await Promise.all([
        supabase
          .from("tests")
          .select("*")
          .eq("id", testId)
          .single(),
        supabase
          .from("questions")
          .select("*")
          .eq("test_id", testId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("exam_sessions")
          .select("id, exam_key, status")
          .eq("test_id", testId)
          .eq("student_id", user.id)
          .maybeSingle(),
      ]);

      if (error || !data) {
        toast.error("Test not found");
        navigate("/student/dashboard");
        return;
      }

      setTest(data);
      setQuestions(qs || []);

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
...
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
