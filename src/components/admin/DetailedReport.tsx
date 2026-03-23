import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, User, FileText, ShieldAlert, Clock,
  AlertTriangle, CheckCircle2, Loader2, XCircle
} from "lucide-react";

interface DetailedReportProps {
  sessionId: string;
  onBack: () => void;
}

const DetailedReport = ({ sessionId, onBack }: DetailedReportProps) => {
  const [session, setSession] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (!sess) return;
      setSession(sess);

      const [profileRes, testRes, eventsRes, answersRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", sess.student_id).single(),
        supabase.from("tests").select("*").eq("id", sess.test_id).single(),
        supabase.from("proctoring_events").select("*").eq("session_id", sessionId).order("timestamp", { ascending: true }),
        supabase.from("student_answers").select("*, questions(question_text, marks, question_type)").eq("session_id", sessionId),
      ]);

      setStudent(profileRes.data);
      setTest(testRes.data);
      setEvents(eventsRes.data || []);
      setAnswers(answersRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const riskColor = (score: number) =>
    score < 30 ? "text-success" : score < 50 ? "text-warning" : "text-destructive";

  const riskBg = (score: number) =>
    score < 30 ? "bg-success/10" : score < 50 ? "bg-warning/10" : "bg-destructive/10";

  const severityColor = (s: string) =>
    s === "high" ? "bg-destructive/10 text-destructive" :
    s === "medium" ? "bg-warning/10 text-warning" :
    "bg-muted text-muted-foreground";

  const totalScored = answers.reduce((sum, a) => sum + (a.marks_awarded || 0), 0);

  return (
    <div className="opacity-0 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors active:scale-[0.97]">
        <ArrowLeft className="w-4 h-4" /> Back to Results
      </button>

      <h2 className="text-xl font-display font-bold text-foreground mb-6">Detailed Report</h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Info */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Student Information</h3>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["Name", student?.full_name],
              ["Email", student?.email],
              ["College", student?.college_name],
              ["Department", student?.department],
              ["Student ID", student?.student_id],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium text-right truncate ml-4">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Info */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Exam Information</h3>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["Test Name", test?.name],
              ["Type", test?.exam_type?.toUpperCase()],
              ["Duration", `${test?.time_limit} min`],
              ["Total Marks", test?.total_marks],
              ["Scored", `${totalScored}/${test?.total_marks || 0}`],
              ["Status", session?.status],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium capitalize">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Score */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Proctoring Summary</h3>
          </div>
          <div className="text-center py-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${riskBg(session?.risk_score || 0)}`}>
              <span className={`text-2xl font-bold tabular-nums ${riskColor(session?.risk_score || 0)}`}>
                {session?.risk_score || 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Risk Score</p>
            <div className="mt-3">
              {session?.is_flagged ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">
                  <XCircle className="w-3.5 h-3.5" /> Red Flagged
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm mt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Events</span>
              <span className="text-foreground font-medium tabular-nums">{events.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">High Severity</span>
              <span className="text-destructive font-medium tabular-nums">{events.filter(e => e.severity === "high").length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="mt-6 bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Activity Log</h3>
          <span className="text-xs text-muted-foreground ml-auto">{events.length} events</span>
        </div>
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No suspicious activity detected during this exam
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className="mt-0.5">
                  <AlertTriangle className={`w-4 h-4 ${event.severity === "high" ? "text-destructive" : event.severity === "medium" ? "text-warning" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${severityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      +{event.risk_delta} risk
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Generated Alerts */}
      {events.length > 0 && (
        <div className="mt-6 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-semibold text-foreground text-sm">AI-Generated Alerts</h3>
          </div>
          <div className="space-y-2">
            {generateAlerts(events).map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-warning mt-0.5">⚠</span>
                <span className="text-foreground">{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function generateAlerts(events: any[]): string[] {
  const alerts: string[] = [];
  const tabSwitches = events.filter(e => e.event_type === "tab_switch").length;
  const clipboardEvents = events.filter(e => e.event_type.startsWith("clipboard")).length;
  const fullscreenExits = events.filter(e => e.event_type === "fullscreen_exit").length;

  if (tabSwitches > 0) alerts.push(`Tab switching detected ${tabSwitches} time(s) — possible reference to external material`);
  if (clipboardEvents > 0) alerts.push(`Clipboard activity detected ${clipboardEvents} time(s) — potential copy/paste of answers`);
  if (fullscreenExits > 0) alerts.push(`Full-screen mode exited ${fullscreenExits} time(s) — may indicate app switching`);
  if (tabSwitches > 3 && clipboardEvents > 0) alerts.push(`Combined tab switching and clipboard usage suggests coordinated external assistance`);

  return alerts.length > 0 ? alerts : ["No significant suspicious patterns detected"];
}

export default DetailedReport;
