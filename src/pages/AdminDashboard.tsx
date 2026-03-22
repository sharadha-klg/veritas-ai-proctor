import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { Users, FileText, BarChart3, Plus, Search, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const tabs = ["Profile", "Tests", "Results"] as const;
type Tab = typeof tabs[number];

const mockResults = [
  { name: "Ravi Kumar", email: "ravi@college.edu", college: "IIT Delhi", dept: "CSE", test: "DS Mid-Term", total: 100, scored: 82, risk: 12, flag: false },
  { name: "Priya Sharma", email: "priya@college.edu", college: "NIT Trichy", dept: "ECE", test: "OS Quiz 3", total: 50, scored: 41, risk: 68, flag: true },
  { name: "Amit Patel", email: "amit@college.edu", college: "BITS Pilani", dept: "IT", test: "DBMS Test", total: 100, scored: 91, risk: 5, flag: false },
  { name: "Sneha Reddy", email: "sneha@college.edu", college: "VIT Vellore", dept: "CSE", test: "CN Final", total: 150, scored: 112, risk: 45, flag: false },
];

const AdminDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("Profile");
  const [search, setSearch] = useState("");

  if (!loading && (!user || profile?.role !== "admin")) return <Navigate to="/admin/login" />;
  if (loading) return <div className="min-h-screen gradient-bg flex items-center justify-center text-primary-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8 w-fit opacity-0 animate-fade-in">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]
                ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "Profile" && <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
              {t === "Tests" && <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
              {t === "Results" && <BarChart3 className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
              {t}
            </button>
          ))}
        </div>

        {tab === "Profile" && <ProfileTab profile={profile} />}
        {tab === "Tests" && <TestsTab />}
        {tab === "Results" && <ResultsTab search={search} setSearch={setSearch} />}
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

const TestsTab = () => (
  <div className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-display font-bold text-foreground">Manage Tests</h2>
      <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-bg-horizontal text-primary-foreground 
        text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all">
        <Plus className="w-4 h-4" /> Create Test
      </button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        { name: "Data Structures Mid-Term", type: "MCQ", status: "Active", students: 45 },
        { name: "OS Quiz 3", type: "MCQ", status: "Completed", students: 38 },
        { name: "DBMS Assignment Test", type: "Coding", status: "Active", students: 52 },
        { name: "Computer Networks Final", type: "Mixed", status: "Scheduled", students: 60 },
      ].map((t) => (
        <div key={t.name} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              t.status === "Active" ? "bg-success/10 text-success" :
              t.status === "Completed" ? "bg-muted text-muted-foreground" :
              "bg-primary/10 text-primary"
            }`}>{t.status}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Type: {t.type}</span>
            <span>{t.students} students</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ResultsTab = ({ search, setSearch }: { search: string; setSearch: (s: string) => void }) => {
  const filtered = mockResults.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.test.toLowerCase().includes(search.toLowerCase())
  );

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
            className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground 
              placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-64"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Student", "College", "Test", "Score", "Risk", "Flag"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.college}</td>
                  <td className="px-4 py-3 text-foreground">{r.test}</td>
                  <td className="px-4 py-3 font-medium text-foreground tabular-nums">{r.scored}/{r.total}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${r.risk}%`,
                            backgroundColor: r.risk < 30 ? "hsl(var(--success))" : r.risk < 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{r.risk}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.flag ? (
                      <span className="flex items-center gap-1 text-destructive text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Red Flag
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-success text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
