import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Trophy, Target, Clock } from "lucide-react";

const StudentResults = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [test, setTest] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!sessionId || !user) return;
    const fetchResults = async () => {
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("student_id", user.id)
        .single();

      if (!sess) {
        navigate("/student/dashboard");
        return;
      }
      setSession(sess);

      const [testRes, answersRes] = await Promise.all([
        supabase.from("tests").select("*").eq("id", sess.test_id).single(),
        supabase.from("student_answers").select("*").eq("session_id", sessionId),
      ]);

      setTest(testRes.data);

      if (testRes.data) {
        const { data: qs } = await supabase
          .from("questions")
          .select("*")
          .eq("test_id", testRes.data.id)
          .order("sort_order", { ascending: true });
        setQuestions(qs || []);
      }

      setAnswers(answersRes.data || []);
      setLoadingData(false);
    };
    fetchResults();
  }, [sessionId, user, navigate]);

  if (loading || (user && !profile)) return <div className="min-h-screen gradient-bg flex items-center justify-center text-primary-foreground">Loading...</div>;
  if (!user || profile?.role !== "student") return <Navigate to="/student/login" />;

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const obtainedMarks = answers.reduce((sum, a) => sum + (a.marks_awarded || 0), 0);
  const correctCount = answers.filter(a => a.is_correct).length;
  const incorrectCount = answers.filter(a => a.is_correct === false).length;
  const unanswered = questions.length - answers.length;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  const getAnswerForQuestion = (qId: string) => answers.find(a => a.question_id === qId);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button onClick={() => navigate("/student/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors active:scale-[0.97]">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="opacity-0 animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">{test?.name || "Exam"} — Results</h1>
          <p className="text-sm text-muted-foreground mb-6">Your performance breakdown</p>

          {/* Score summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <SummaryCard icon={<Trophy className="w-5 h-5 text-warning" />} label="Score" value={`${obtainedMarks}/${totalMarks}`} />
            <SummaryCard icon={<Target className="w-5 h-5 text-primary" />} label="Percentage" value={`${percentage}%`} />
            <SummaryCard icon={<CheckCircle2 className="w-5 h-5 text-success" />} label="Correct" value={`${correctCount}`} />
            <SummaryCard icon={<XCircle className="w-5 h-5 text-destructive" />} label="Incorrect" value={`${incorrectCount}`} />
          </div>

          {/* Risk score */}
          {session?.risk_score > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl px-5 py-3 mb-6 flex items-center gap-2 text-sm text-warning">
              <Clock className="w-4 h-4" />
              Proctoring risk score: {session.risk_score}%
              {session.is_flagged && <span className="ml-2 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-xs font-medium">Flagged</span>}
            </div>
          )}

          {/* Question-by-question breakdown */}
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Question Breakdown</h2>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const ans = getAnswerForQuestion(q.id);
              const isCorrect = ans?.is_correct;
              const isMcq = q.question_type === "mcq";

              return (
                <div key={q.id} className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Q{idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isMcq ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"
                      }`}>{q.question_type.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ans?.marks_awarded || 0}/{q.marks} pts</span>
                      {isCorrect === true && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {isCorrect === false && <XCircle className="w-4 h-4 text-destructive" />}
                      {isCorrect === null && <span className="text-xs text-muted-foreground">Pending</span>}
                    </div>
                  </div>

                  <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{q.question_text}</p>

                  {isMcq && q.options && (
                    <div className="space-y-1.5 mb-3">
                      {(q.options as string[]).map((opt: string, oi: number) => {
                        const isStudentAnswer = ans?.answer_text === opt;
                        const isCorrectAnswer = q.correct_answer === opt;
                        return (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            isCorrectAnswer ? "bg-success/10 border border-success/30" :
                            isStudentAnswer && !isCorrect ? "bg-destructive/10 border border-destructive/30" :
                            "bg-muted/50"
                          }`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isCorrectAnswer ? "bg-success text-success-foreground" :
                              isStudentAnswer ? "bg-destructive text-destructive-foreground" :
                              "bg-muted text-muted-foreground"
                            }`}>{String.fromCharCode(65 + oi)}</span>
                            <span className="text-foreground">{opt}</span>
                            {isCorrectAnswer && <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto" />}
                            {isStudentAnswer && !isCorrectAnswer && <XCircle className="w-3.5 h-3.5 text-destructive ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isMcq && ans?.answer_text && (
                    <div className="bg-muted rounded-lg p-3 mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                      <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">{ans.answer_text}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card rounded-xl border border-border p-4 text-center">
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default StudentResults;
