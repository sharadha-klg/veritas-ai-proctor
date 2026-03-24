import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Users, AlertTriangle, CheckCircle2, Radio,
  Eye, Clock, Shield, RefreshCw
} from "lucide-react";

interface LiveMonitoringTabProps {
  userId: string;
}

interface LiveSession {
  id: string;
  student_id: string;
  test_id: string;
  status: string;
  risk_score: number;
  is_flagged: boolean;
  started_at: string | null;
  created_at: string;
  student_name: string;
  student_email: string;
  test_name: string;
  answered_count: number;
  total_questions: number;
}

const LiveMonitoringTab = ({ userId }: LiveMonitoringTabProps) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("all");
  const [tests, setTests] = useState<{ id: string; name: string }[]>([]);

  const fetchLiveData = useCallback(async () => {
    // Get admin's tests
    const { data: adminTests } = await supabase
      .from("tests")
      .select("id, name")
      .eq("admin_id", userId)
      .eq("status", "active");

    if (!adminTests || adminTests.length === 0) {
      setTests([]);
      setSessions([]);
      setLoading(false);
      return;
    }

    setTests(adminTests);
    const testIds = adminTests.map(t => t.id);
    const testMap = Object.fromEntries(adminTests.map(t => [t.id, t.name]));

    // Get active/in-progress sessions
    const { data: sessionsData } = await supabase
      .from("exam_sessions")
      .select("*")
      .in("test_id", testIds)
      .in("status", ["in_progress", "pending", "completed"])
      .order("started_at", { ascending: false });

    if (!sessionsData || sessionsData.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // Fetch student profiles
    const studentIds = [...new Set(sessionsData.map(s => s.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", studentIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Fetch answer counts per session
    const sessionIds = sessionsData.map(s => s.id);
    const { data: answers } = await supabase
      .from("student_answers")
      .select("session_id")
      .in("session_id", sessionIds);
    const answerCountMap: Record<string, number> = {};
    (answers || []).forEach(a => {
      answerCountMap[a.session_id] = (answerCountMap[a.session_id] || 0) + 1;
    });

    // Fetch question counts per test
    const { data: questions } = await supabase
      .from("questions")
      .select("test_id")
      .in("test_id", testIds);
    const qCountMap: Record<string, number> = {};
    (questions || []).forEach(q => {
      qCountMap[q.test_id] = (qCountMap[q.test_id] || 0) + 1;
    });

    const enriched: LiveSession[] = sessionsData.map(s => ({
      id: s.id,
      student_id: s.student_id,
      test_id: s.test_id,
      status: s.status,
      risk_score: s.risk_score,
      is_flagged: s.is_flagged,
      started_at: s.started_at,
      created_at: s.created_at,
      student_name: profileMap[s.student_id]?.full_name || "Unknown",
      student_email: profileMap[s.student_id]?.email || "",
      test_name: testMap[s.test_id] || "Unknown",
      answered_count: answerCountMap[s.id] || 0,
      total_questions: qCountMap[s.test_id] || 0,
    }));

    setSessions(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Real-time subscription for exam_sessions changes
  useEffect(() => {
    const channel = supabase
      .channel("live-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_sessions" },
        () => {
          fetchLiveData();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "proctoring_events" },
        () => {
          fetchLiveData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveData]);

  const filtered = selectedTest === "all"
    ? sessions
    : sessions.filter(s => s.test_id === selectedTest);

  const inProgress = filtered.filter(s => s.status === "in_progress");
  const completed = filtered.filter(s => s.status === "completed");
  const pending = filtered.filter(s => s.status === "pending");
  const flaggedCount = filtered.filter(s => s.is_flagged).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center opacity-0 animate-fade-in">
        <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">No active tests</p>
        <p className="text-sm text-muted-foreground">Activate a test to start monitoring students in real-time</p>
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-bold text-foreground">Live Monitoring</h2>
          <span className="flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTest}
            onChange={e => setSelectedTest(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All Active Tests</option>
            {tests.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={fetchLiveData}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors active:scale-[0.97]">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat icon={<Eye className="w-4 h-4" />} label="In Progress" value={inProgress.length} variant="primary" />
        <MiniStat icon={<Clock className="w-4 h-4" />} label="Pending" value={pending.length} variant="muted" />
        <MiniStat icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={completed.length} variant="success" />
        <MiniStat icon={<AlertTriangle className="w-4 h-4" />} label="Flagged" value={flaggedCount} variant="destructive" />
      </div>

      {/* Active sessions table */}
      {inProgress.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-success" /> Currently Taking Exam ({inProgress.length})
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Student", "Test", "Progress", "Risk", "Status", "Duration"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inProgress.map(s => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Completed sessions */}
      {completed.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" /> Completed ({completed.length})
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Student", "Test", "Progress", "Risk", "Flag", "Score"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completed.map(s => (
                    <CompletedRow key={s.id} session={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Pending ({pending.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map(s => (
              <div key={s.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">{s.test_name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No sessions yet</p>
          <p className="text-sm text-muted-foreground">Students will appear here once they start the exam</p>
        </div>
      )}
    </div>
  );
};

const SessionRow = ({ session: s }: { session: LiveSession }) => {
  const progressPct = s.total_questions > 0
    ? Math.round((s.answered_count / s.total_questions) * 100)
    : 0;

  const elapsed = s.started_at
    ? Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60000)
    : 0;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{s.student_name}</p>
        <p className="text-xs text-muted-foreground">{s.student_email}</p>
      </td>
      <td className="px-4 py-3 text-foreground">{s.test_name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{s.answered_count}/{s.total_questions}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${s.risk_score}%`,
                backgroundColor:
                  s.risk_score < 30 ? "hsl(var(--success))" :
                  s.risk_score < 50 ? "hsl(var(--warning))" :
                  "hsl(var(--destructive))",
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{s.risk_score}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {s.is_flagged ? (
          <span className="flex items-center gap-1 text-destructive text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Flagged
          </span>
        ) : (
          <span className="flex items-center gap-1 text-success text-xs font-medium">
            <Shield className="w-3.5 h-3.5" /> Clear
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{elapsed} min</td>
    </tr>
  );
};

const CompletedRow = ({ session: s }: { session: LiveSession }) => (
  <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
    <td className="px-4 py-3">
      <p className="font-medium text-foreground">{s.student_name}</p>
      <p className="text-xs text-muted-foreground">{s.student_email}</p>
    </td>
    <td className="px-4 py-3 text-foreground">{s.test_name}</td>
    <td className="px-4 py-3">
      <span className="text-xs tabular-nums text-muted-foreground">{s.answered_count}/{s.total_questions} answered</span>
    </td>
    <td className="px-4 py-3">
      <span className="text-xs tabular-nums text-muted-foreground">{s.risk_score}%</span>
    </td>
    <td className="px-4 py-3">
      {s.is_flagged ? (
        <span className="flex items-center gap-1 text-destructive text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" /> Flagged
        </span>
      ) : (
        <span className="flex items-center gap-1 text-success text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Clear
        </span>
      )}
    </td>
    <td className="px-4 py-3 text-xs text-foreground font-medium">—</td>
  </tr>
);

const MiniStat = ({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: number; variant: string }) => {
  const variantStyles: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

export default LiveMonitoringTab;
