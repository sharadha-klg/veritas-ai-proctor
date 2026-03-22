import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const DashboardHeader = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = profile?.full_name?.charAt(0).toUpperCase() || "U";

  const handleLogout = async () => {
    const role = profile?.role;
    await logout();
    navigate(role === "student" ? "/student/login" : "/admin/login");
  };

  return (
    <header className="gradient-bg-horizontal px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-primary-foreground text-lg">Veritas AI</span>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center
            text-primary-foreground font-semibold text-sm hover:bg-accent/40 active:scale-[0.95] transition-all"
        >
          {initial}
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-48 bg-card rounded-xl shadow-xl border border-border 
            py-2 z-50 animate-fade-in-scale origin-top-right">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <button
              onClick={() => { setOpen(false); }}
              className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-foreground 
                hover:bg-muted transition-colors"
            >
              <User className="w-4 h-4" /> Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-destructive 
                hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
