import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import { Clock, CheckCircle2, CalendarClock, Play, Loader2, Copy, Check } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const StudentDashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [testsRes, sessionsRes] = await Promise.all([
        supabase.from("tests").select("*").in("status", ["active", "scheduled"]).order("created_at", { ascending: false }),
        supabase.from("exam_sessions").select("*, tests(name)").eq("student_id", user.id),
      ]);
      setTests(testsRes.data || []);
      setSessions(sessionsRes.data || []);
      setLoadingTests(false);
    };
    fetchData();
  }, [user]);

  if (loading || (user && !profile)) return <div className="min-h-screen gradient-bg flex items-center justify-center text-primary-foreground">Loading...</div>;
  if (!user || profile?.role !== "student") return <Navigate to="/student/login" />;

  const sessionByTestId = new Map(sessions.map((session) => [session.test_id, session]));
  const completedSessionTestIds = new Set(sessions.filter(s => s.status === "completed").map(s => s.test_id));
  const inProgressSessionTestIds = new Set(sessions.filter(s => s.status === "in_progress").map(s => s.test_id));

  const activeTests = tests.filter(t => t.status === "active" && !completedSessionTestIds.has(t.id) && !inProgressSessionTestIds.has(t.id));
  const ongoingTests = tests.filter(t => inProgressSessionTestIds.has(t.id));
  const scheduledTests = tests.filter(t => t.status === "scheduled");
  const completedSessions = sessions.filter(s => s.status === "completed");

  const handleStartTest = (testId: string) => {
    navigate(`/exam/${testId}`);
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast.success("Exam key copied");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1 opacity-0 animate-fade-in">
          Welcome, {profile?.full_name?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-muted-foreground text-sm mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "80ms" }}>
          Your exam dashboard
        </p>

        {loadingTests ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {ongoingTests.length > 0 && (
              <Section title="Ongoing Tests" icon={<Clock className="w-5 h-5 text-warning" />} delay={160}>
                {ongoingTests.map(t => (
                  <TestCard key={t.id} name={t.name} timeLimit={`${t.time_limit} min`} status="In Progress" variant="ongoing"
                    examKey={sessionByTestId.get(t.id)?.exam_key}
                    onCopyKey={handleCopyKey}
                    actionLabel="Continue" onAction={() => handleStartTest(t.id)} />
                ))}
              </Section>
            )}

            {activeTests.length > 0 && (
              <Section title="Available Tests" icon={<Play className="w-5 h-5 text-primary" />} delay={200}>
                {activeTests.map(t => (
                  <TestCard key={t.id} name={t.name} timeLimit={`${t.time_limit} min`} status="Active"
                    examKey={sessionByTestId.get(t.id)?.exam_key}
                    onCopyKey={handleCopyKey}
                    variant="upcoming" actionLabel="Start Test" onAction={() => handleStartTest(t.id)} />
                ))}
              </Section>
            )}

            {scheduledTests.length > 0 && (
              <Section title="Upcoming Tests" icon={<CalendarClock className="w-5 h-5 text-primary" />} delay={240}>
                {scheduledTests.map(t => (
                  <TestCard key={t.id} name={t.name} timeLimit={`${t.time_limit} min`} status="Scheduled" variant="upcoming" />
                ))}
              </Section>
            )}

            <Section title="Completed Tests" icon={<CheckCircle2 className="w-5 h-5 text-success" />} delay={320}>
              {completedSessions.length > 0 ? completedSessions.map(s => (
                <TestCard key={s.id} name={(s as any).tests?.name || "Test"} timeLimit="" status="Completed" variant="completed"
                  score={`${s.risk_score !== undefined ? `Risk: ${s.risk_score}%` : ""}`}
                  actionLabel="View Results" onAction={() => navigate(`/student/results/${s.id}`)} />
              )) : (
                <p className="text-sm text-muted-foreground col-span-2">No completed tests yet</p>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  );
};

const Section = ({ title, icon, delay, children }: { title: string; icon: React.ReactNode; delay: number; children: React.ReactNode }) => (
  <div className="mb-8 opacity-0 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-lg font-display font-semibold text-foreground">{title}</h2>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const TestCard = ({ name, timeLimit, status, score, actionLabel, variant, onAction, examKey, onCopyKey }: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!examKey || !onCopyKey) return;
    await onCopyKey(examKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground text-sm">{name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          variant === "ongoing" ? "bg-warning/10 text-warning" :
          variant === "completed" ? "bg-success/10 text-success" :
          "bg-primary/10 text-primary"
        }`}>
          {status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {timeLimit && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeLimit}</span>}
        {score && <span>{score}</span>}
      </div>
      {examKey && (
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Exam key</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono tracking-[0.2em] text-foreground">{examKey}</code>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
              type="button"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction}
          className="mt-auto self-start flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 active:scale-[0.97] transition-all">
          <Play className="w-3.5 h-3.5" /> {actionLabel}
        </button>
      )}
    </div>
  );
};

export default StudentDashboard;
