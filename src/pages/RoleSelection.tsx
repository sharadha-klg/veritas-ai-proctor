import { useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, Shield } from "lucide-react";

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold text-primary-foreground">Veritas AI</h1>
      </div>

      <p className="text-primary-foreground/60 text-sm mb-12 animate-fade-in" style={{ animationDelay: "100ms" }}>
        Select your role to continue
      </p>

      {/* Role Cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
        <button
          onClick={() => navigate("/student/login")}
          className="group flex-1 glass-card rounded-2xl p-8 flex flex-col items-center gap-5 
            hover:bg-white/12 transition-all duration-300 cursor-pointer
            opacity-0 animate-fade-in-scale active:scale-[0.97]"
          style={{ animationDelay: "200ms" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center
            group-hover:bg-primary/30 transition-colors duration-300">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-display font-semibold text-primary-foreground mb-1">Student</h2>
            <p className="text-primary-foreground/50 text-sm">Take exams securely</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/admin/login")}
          className="group flex-1 glass-card rounded-2xl p-8 flex flex-col items-center gap-5 
            hover:bg-white/12 transition-all duration-300 cursor-pointer
            opacity-0 animate-fade-in-scale active:scale-[0.97]"
          style={{ animationDelay: "350ms" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center
            group-hover:bg-accent/30 transition-colors duration-300">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-display font-semibold text-primary-foreground mb-1">Admin</h2>
            <p className="text-primary-foreground/50 text-sm">Manage & monitor exams</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default RoleSelection;
