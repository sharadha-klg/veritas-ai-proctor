import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import CreateTestForm from "@/components/CreateTestForm";
import ResultsTab from "@/components/admin/ResultsTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import { Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, FileText, BarChart3, Plus, TrendingUp,
  ToggleLeft, ToggleRight, Loader2, Trash2, Send, X, Copy, Check
} from "lucide-react";

const tabs = ["Profile", "Tests", "Results", "Analytics"] as const;
type Tab = typeof tabs[number];

interface Test {
  id: string;
  name: string;
  exam_type: string;
  status: string;
  time_limit: number;
  total_marks: number;
  difficulty: string | null;
  topic: string | null;
  created_at: string;
  question_count?: number;
}

const AdminDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("Profile");
  const [showCreate, setShowCreate] = useState(false);

  if (loading || (user && !profile)) return <div className="min-h-screen gradient-bg flex items-center justify-center text-primary-foreground">Loading...</div>;
  if (!user || profile?.role !== "admin") return <Navigate to="/admin/login" />;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {showCreate ? (
          <CreateTestForm onBack={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
        ) : (
          <>
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8 w-fit opacity-0 animate-fade-in">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]
                    ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "Profile" && <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
                  {t === "Tests" && <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
                  {t === "Results" && <BarChart3 className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
                  {t === "Analytics" && <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
                  {t}
                </button>
              ))}
            </div>
            {tab === "Profile" && <ProfileTab profile={profile} />}
            {tab === "Tests" && <TestsTab onCreateNew={() => setShowCreate(true)} userId={user.id} />}
            {tab === "Results" && <ResultsTab userId={user.id} />}
            {tab === "Analytics" && <AnalyticsTab userId={user.id} />}
          </>
        )}
      </main>
    </div>
  );
};

const ProfileTab = ({ profile }: { profile: any }) => (
  <div className="bg-card rounded-xl border border-border p-6 max-w-lg opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
    <h2 className="text-xl font-display font-bold text-foreground mb-5">Admin Profile</h2>
    <div className="space-y-4">
      {[
        ["Full Name", profile?.full_name || "—"],
        ["Email", profile?.email || "—"],
        ["Organization", profile?.organization || "—"],
        ["Department", profile?.department || "—"],
        ["Role", profile?.admin_role || "Admin"],
        ["Contact", profile?.contact_number || "—"],
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground font-medium">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const TestsTab = ({ onCreateNew, userId }: { onCreateNew: () => void; userId: string }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tests").select("*, questions(id)").eq("admin_id", userId)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load tests"); }
    else { setTests((data || []).map((t: any) => ({ ...t, question_count: t.questions?.length || 0 }))); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const activateTest = async (test: Test) => {
    setActivating(test.id);
    try {
      const { data, error } = await supabase.functions.invoke("activate-test", {
        body: { testId: test.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Test activated!");
      if (data?.notifications?.length > 0) {
        toast.info(`Exam keys generated for ${data.notifications.length} students`);
      }
      fetchTests();
    } catch (e: any) {
      toast.error(e.message || "Failed to activate test");
    } finally {
      setActivating(null);
    }
  };

  const toggleStatus = async (test: Test) => {
    if (test.status === "draft") {
      await activateTest(test);
      return;
    }
    const newStatus = test.status === "active" ? "draft" : "active";
    const { error } = await supabase.from("tests").update({ status: newStatus }).eq("id", test.id);
    if (error) toast.error("Failed to update status"); else fetchTests();
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Delete this test and all its questions?")) return;
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) toast.error("Failed to delete test"); else { toast.success("Test deleted"); fetchTests(); }
  };

  const statusColor = (s: string) =>
    s === "active" ? "bg-success/10 text-success" : s === "completed" ? "bg-muted text-muted-foreground" :
    s === "scheduled" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning";

  return (
    <div className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">Manage Tests</h2>
        <button onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all">
          <Plus className="w-4 h-4" /> Create Test
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No tests yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first test to get started</p>
          <button onClick={onCreateNew} className="px-5 py-2.5 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all">Create Test</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tests.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(t.status)}`}>{t.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="uppercase">{t.exam_type}</span>
                <span>{t.question_count} Q{t.question_count !== 1 ? "s" : ""}</span>
                <span>{t.time_limit} min</span>
                {t.difficulty && <span className="capitalize">{t.difficulty}</span>}
              </div>
              {t.topic && <p className="text-xs text-muted-foreground mb-3 truncate">Topic: {t.topic}</p>}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleStatus(t)} disabled={activating === t.id}
                  className="flex items-center gap-1 text-xs text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-muted disabled:opacity-50">
                  {activating === t.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : t.status === "active" ? (
                    <ToggleRight className="w-3.5 h-3.5" />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5" />
                  )}
                  {activating === t.id ? "Activating..." : t.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => deleteTest(t.id)}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-muted">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
