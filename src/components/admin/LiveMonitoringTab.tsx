import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, AlertTriangle, Clock, Users, ShieldAlert,
  Loader2, RefreshCw, CheckCircle, XCircle, Radio
} from "lucide-react";

interface LiveSession {
  id: string;
  student_id: string;
  test_id: string;
  status: string;
  risk_score: number;
  is_flagged: boolean;
  started_at: string | null;
  student_name: string;
  student_email: string;
  test_name: string;
  answered_count: number;
  total_questions: number;
  recent_events: ProctoringEvent[];
}

interface ProctoringEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  timestamp: string;
}

const LiveMonitoringTab = ({ userId }: { userId: string }) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    // Get all active tests for this admin
    const { data: tests } = await supabase
      .from("tests")
      .select("id, name")
      .eq("admin_id", userId)
      .eq("status", "active");

    if (!tests || tests.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const testIds = tests.map((t) => t.id);
    const testMap = Object.fromEntries(tests.map((t) => [t.id, t.name]));

    // Get in-progress sessions for these tests
    const { data: examSessions } = await supabase
      .from("exam_sessions")
      .select("*")
      .in("test_id", testIds)
      .eq("status", "in_progress");

    if (!examSessions || examSessions.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const studentIds = [...new Set(examSessions.map((s) => s.student_id))];
    const sessionIds = examSessions.map((s) => s.id);

    // Fetch profiles, answers, and recent events in parallel
    const [profilesRes, answersRes, eventsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", studentIds),
      supabase
        .from("student_answers")
        .select("session_id, id")
        .in("session_id", sessionIds),
      supabase
        .from("proctoring_events")
        .select("*")
        .in("session_id", sessionIds)
        .order("timestamp", { ascending: false })
        .limit(100),
    ]);

    const profileMap = Object.fromEntries(
      (profilesRes.data || []).map((p) => [p.user_id, p])
    );

    // Count answers per session
    const answerCounts: Record<string, number> = {};
    (answersRes.data || []).forEach((a) => {
      answerCounts[a.session_id] = (answerCounts[a.session_id] || 0) + 1;
    });

    // Get question counts per test
    const { data: questions } = await supabase
      .from("questions")
      .select("test_id, id")
      .in("test_id", testIds);

    const questionCounts: Record<string, number> = {};
    (questions || []).forEach((q) => {
      questionCounts[q.test_id] = (questionCounts[q.test_id] || 0) + 1;
    });

    // Group events per session (last 5)
    const eventsBySession: Record<string, ProctoringEvent[]> = {};
    (eventsRes.data || []).forEach((e) => {
      if (!eventsBySession[e.session_id]) eventsBySession[e.session_id] = [];
      if (eventsBySession[e.session_id].length < 5) {
        eventsBySession[e.session_id].push(e);
      }
    });

    const liveSessions: LiveSession[] = examSessions.map((s) => ({
      id: s.id,
      student_id: s.student_id,
      test_id: s.test_id,
      status: s.status,
      risk_score: s.risk_score,
      is_flagged: s.is_flagged,
      started_at: s.started_at,
      student_name: profileMap[s.student_id]?.full_name || "Unknown",
      student_email: profileMap[s.student_id]?.email || "",
      test_name: testMap[s.test_id] || "Unknown Test",
      answered_count: answerCounts[s.id] || 0,
      total_questions: questionCounts[s.test_id] || 0,
      recent_events: eventsBySession[s.id] || [],
    }));

    setSessions(liveSessions.sort((a, b) => b.risk_score - a.risk_score));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Realtime subscription for exam_sessions changes
  useEffect(() => {
    const channel = supabase
      .channel("live-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_sessions" },
        () => {
          fetchSessions();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "proctoring_events" },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  const getRiskColor = (score: number) => {
    if (score >= 50) return "text-destructive";
    if (score >= 25) return "text-warning";
    return "text-success";
  };

  const getRiskBg = (score: number) => {
    if (score >= 50) return "bg-destructive/10";
    if (score >= 25) return "bg-warning/10";
    return "bg-success/10";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "text-destructive bg-destructive/10";
    if (severity === "high") return "text-destructive bg-destructive/10";
    if (severity === "medium") return "text-warning bg-warning/10";
    return "text-muted-foreground bg-muted";
  };

  const getElapsedTime = (startedAt: string | null) => {
    if (!startedAt) return "—";
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-bold text-foreground">
            Live Monitoring
          </h2>
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </span>
        </div>
        <button
          onClick={() => { setLoading(true); fetchSessions(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No active sessions</p>
          <p className="text-sm text-muted-foreground">
            Students will appear here when they start an exam
          </p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" /> Active Students
              </div>
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Flagged
              </div>
              <p className="text-2xl font-bold text-destructive">
                {sessions.filter((s) => s.is_flagged).length}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Avg Risk
              </div>
              <p className={`text-2xl font-bold ${getRiskColor(
                sessions.reduce((a, s) => a + s.risk_score, 0) / sessions.length
              )}`}>
                {Math.round(sessions.reduce((a, s) => a + s.risk_score, 0) / sessions.length)}%
              </p>
            </div>
          </div>

          {/* Sessions list */}
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`bg-card rounded-xl border transition-all ${
                  session.is_flagged ? "border-destructive/40" : "border-border"
                }`}
              >
                {/* Session header */}
                <button
                  onClick={() =>
                    setExpandedSession(
                      expandedSession === session.id ? null : session.id
                    )
                  }
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Risk indicator */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${getRiskBg(
                        session.risk_score
                      )} ${getRiskColor(session.risk_score)}`}
                    >
                      {session.risk_score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {session.student_name}
                        </span>
                        {session.is_flagged && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                            FLAGGED
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {session.test_name} · {session.student_email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {session.answered_count}/{session.total_questions} answered
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {getElapsedTime(session.started_at)}
                    </div>
                  </div>
                </button>

                {/* Expanded: recent events */}
                {expandedSession === session.id && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Recent Proctoring Events
                    </p>
                    {session.recent_events.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No violations detected yet
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {session.recent_events.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between text-xs py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded font-medium capitalize ${getSeverityColor(
                                  e.severity
                                )}`}
                              >
                                {e.severity}
                              </span>
                              <span className="text-foreground">
                                {e.description}
                              </span>
                            </div>
                            <span className="text-muted-foreground whitespace-nowrap ml-4">
                              {new Date(e.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LiveMonitoringTab;
