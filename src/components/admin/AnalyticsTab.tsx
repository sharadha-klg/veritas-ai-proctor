import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

interface AnalyticsTabProps {
  userId: string;
}

const CHART_COLORS = {
  primary: "hsl(187, 36%, 49%)",
  success: "hsl(152, 55%, 45%)",
  warning: "hsl(38, 92%, 55%)",
  destructive: "hsl(0, 72%, 55%)",
  secondary: "hsl(206, 37%, 24%)",
  muted: "hsl(200, 15%, 90%)",
};

const AnalyticsTab = ({ userId }: AnalyticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    totalSessions: 0,
    completedSessions: 0,
    flaggedSessions: 0,
    avgRiskScore: 0,
    completionRate: 0,
  });
  const [completionData, setCompletionData] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [testPerformance, setTestPerformance] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Get all tests by this admin
      const { data: tests } = await supabase
        .from("tests")
        .select("id, name, created_at")
        .eq("admin_id", userId)
        .order("created_at", { ascending: true });

      if (!tests || tests.length === 0) {
        setLoading(false);
        return;
      }

      const testIds = tests.map((t) => t.id);
      const testMap = Object.fromEntries(tests.map((t) => [t.id, t.name]));

      // Get all sessions for these tests
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("*")
        .in("test_id", testIds);

      const allSessions = sessions || [];
      const completed = allSessions.filter((s) => s.status === "completed");
      const flagged = allSessions.filter((s) => s.is_flagged);
      const avgRisk = allSessions.length > 0
        ? Math.round(allSessions.reduce((sum, s) => sum + s.risk_score, 0) / allSessions.length)
        : 0;

      setStats({
        totalTests: tests.length,
        totalSessions: allSessions.length,
        completedSessions: completed.length,
        flaggedSessions: flagged.length,
        avgRiskScore: avgRisk,
        completionRate: allSessions.length > 0
          ? Math.round((completed.length / allSessions.length) * 100)
          : 0,
      });

      // Completion data per test
      const testCompletionMap: Record<string, { name: string; completed: number; pending: number; in_progress: number }> = {};
      tests.forEach((t) => {
        testCompletionMap[t.id] = { name: t.name.length > 15 ? t.name.slice(0, 15) + "…" : t.name, completed: 0, pending: 0, in_progress: 0 };
      });
      allSessions.forEach((s) => {
        if (testCompletionMap[s.test_id]) {
          if (s.status === "completed") testCompletionMap[s.test_id].completed++;
          else if (s.status === "in_progress") testCompletionMap[s.test_id].in_progress++;
          else testCompletionMap[s.test_id].pending++;
        }
      });
      setCompletionData(Object.values(testCompletionMap));

      // Risk distribution
      const riskBuckets = [
        { name: "Low (0-25%)", value: 0, color: CHART_COLORS.success },
        { name: "Medium (26-49%)", value: 0, color: CHART_COLORS.warning },
        { name: "High (50-75%)", value: 0, color: CHART_COLORS.destructive },
        { name: "Critical (76-100%)", value: 0, color: CHART_COLORS.secondary },
      ];
      allSessions.forEach((s) => {
        if (s.risk_score <= 25) riskBuckets[0].value++;
        else if (s.risk_score <= 49) riskBuckets[1].value++;
        else if (s.risk_score <= 75) riskBuckets[2].value++;
        else riskBuckets[3].value++;
      });
      setRiskDistribution(riskBuckets.filter((b) => b.value > 0));

      // Test performance over time (flagged trends)
      const byMonth: Record<string, { month: string; flagged: number; clean: number }> = {};
      allSessions.forEach((s) => {
        const d = new Date(s.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!byMonth[key]) byMonth[key] = { month: label, flagged: 0, clean: 0 };
        if (s.is_flagged) byMonth[key].flagged++;
        else byMonth[key].clean++;
      });
      setTestPerformance(Object.values(byMonth));

      setLoading(false);
    };

    fetchAnalytics();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stats.totalTests === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center opacity-0 animate-fade-in">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">No analytics yet</p>
        <p className="text-sm text-muted-foreground">Create tests and have students take them to see analytics</p>
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <h2 className="text-xl font-display font-bold text-foreground mb-6">Analytics</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Sessions" value={stats.totalSessions} color="primary" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completion Rate" value={`${stats.completionRate}%`} color="success" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg Risk Score" value={`${stats.avgRiskScore}%`}
          color={stats.avgRiskScore < 30 ? "success" : stats.avgRiskScore < 50 ? "warning" : "destructive"} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Flagged Students" value={stats.flaggedSessions} color="destructive" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Completion by test */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Test Completion Rates</h3>
          {completionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completionData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 15%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(200, 10%, 45%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(200, 10%, 45%)" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(200, 15%, 88%)", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="in_progress" name="In Progress" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={CHART_COLORS.muted} radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No session data yet</p>
          )}
        </div>

        {/* Risk distribution */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Risk Score Distribution</h3>
          {riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(200, 15%, 88%)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [`${value} students`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No risk data yet</p>
          )}
        </div>
      </div>

      {/* Flagged trends */}
      {testPerformance.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Flagged vs Clean Students Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={testPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 15%, 88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(200, 10%, 45%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(200, 10%, 45%)" }} />
              <Tooltip
                contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(200, 15%, 88%)", borderRadius: "8px", fontSize: "12px" }}
              />
              <Line type="monotone" dataKey="clean" name="Clean" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="flagged" name="Flagged" stroke={CHART_COLORS.destructive} strokeWidth={2} dot={{ r: 4 }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color] || colorMap.primary}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
};

export default AnalyticsTab;
