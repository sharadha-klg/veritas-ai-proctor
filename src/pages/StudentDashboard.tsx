import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import { Clock, CheckCircle2, CalendarClock, Play } from "lucide-react";
import { Navigate } from "react-router-dom";

const mockTests = {
  ongoing: [
    { id: 1, name: "Data Structures Mid-Term", timeLimit: "90 min", status: "In Progress" },
  ],
  completed: [
    { id: 2, name: "Operating Systems Quiz 3", timeLimit: "30 min", status: "Completed", score: "82%" },
    { id: 3, name: "DBMS Assignment Test", timeLimit: "60 min", status: "Completed", score: "91%" },
  ],
  upcoming: [
    { id: 4, name: "Computer Networks Final", timeLimit: "120 min", status: "Scheduled", date: "Mar 28" },
    { id: 5, name: "Machine Learning Lab Exam", timeLimit: "90 min", status: "Scheduled", date: "Apr 02" },
  ],
};

const StudentDashboard = () => {
  const { user, profile, loading } = useAuth();
  if (loading || (user && !profile)) return <div className="min-h-screen gradient-bg flex items-center justify-center text-primary-foreground">Loading...</div>;
  if (!user || profile?.role !== "student") return <Navigate to="/student/login" />;

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

        {/* Ongoing */}
        <Section title="Ongoing Tests" icon={<Clock className="w-5 h-5 text-warning" />} delay={160}>
          {mockTests.ongoing.map((t) => (
            <TestCard key={t.id} {...t} actionLabel="Continue" variant="ongoing" />
          ))}
        </Section>

        {/* Upcoming */}
        <Section title="Upcoming Tests" icon={<CalendarClock className="w-5 h-5 text-primary" />} delay={240}>
          {mockTests.upcoming.map((t) => (
            <TestCard key={t.id} {...t} actionLabel="Start Test" variant="upcoming" />
          ))}
        </Section>

        {/* Completed */}
        <Section title="Completed Tests" icon={<CheckCircle2 className="w-5 h-5 text-success" />} delay={320}>
          {mockTests.completed.map((t) => (
            <TestCard key={t.id} {...t} variant="completed" />
          ))}
        </Section>
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

const TestCard = ({ name, timeLimit, status, score, date, actionLabel, variant }: any) => (
  <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-3">
    <div className="flex items-start justify-between">
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
      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeLimit}</span>
      {score && <span>Score: {score}</span>}
      {date && <span>Date: {date}</span>}
    </div>
    {actionLabel && (
      <button className="mt-auto self-start flex items-center gap-1.5 text-sm font-medium text-primary 
        hover:text-primary/80 active:scale-[0.97] transition-all">
        <Play className="w-3.5 h-3.5" /> {actionLabel}
      </button>
    )}
  </div>
);

export default StudentDashboard;
