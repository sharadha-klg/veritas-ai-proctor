import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, AlertTriangle, CheckCircle2, Loader2, Eye
} from "lucide-react";
import DetailedReport from "./DetailedReport";

interface ResultsTabProps {
  userId: string;
}

const ResultsTab = ({ userId }: ResultsTabProps) => {
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      // Get all tests by this admin
      const { data: tests } = await supabase
        .from("tests")
        .select("id, name")
        .eq("admin_id", userId);

      if (!tests || tests.length === 0) {
        setLoading(false);
        return;
      }

      const testIds = tests.map(t => t.id);
      const testMap = Object.fromEntries(tests.map(t => [t.id, t.name]));

      const { data: sessionsData } = await supabase
        .from("exam_sessions")
        .select("*")
        .in("test_id", testIds)
        .order("created_at", { ascending: false });

      if (!sessionsData || sessionsData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch student profiles
      const studentIds = [...new Set(sessionsData.map(s => s.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", studentIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      const enriched = sessionsData.map(s => ({
        ...s,
        test_name: testMap[s.test_id] || "Unknown",
        student: profileMap[s.student_id] || null,
      }));

      setSessions(enriched);
      setLoading(false);
    };

    fetchResults();
  }, [userId]);

  if (selectedSession) {
    return <DetailedReport sessionId={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    return (
      s.student?.full_name?.toLowerCase().includes(q) ||
      s.student?.email?.toLowerCase().includes(q) ||
      s.test_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-display font-bold text-foreground">Results</h2>
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search students or tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">No results found</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Student", "College", "Test", "Status", "Risk", "Flag", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.student?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{s.student?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.student?.college_name || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{s.test_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        s.status === "completed" ? "bg-success/10 text-success" :
                        s.status === "in_progress" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {s.status}
                      </span>
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
                          <AlertTriangle className="w-3.5 h-3.5" /> Red Flag
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-success text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedSession(s.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors active:scale-[0.97]">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTab;
