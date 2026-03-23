import { useState, useEffect, useCallback } from "react";
import {
  Camera, Mic, Monitor, Maximize, Bluetooth, Usb,
  AppWindow, CheckCircle2, XCircle, Loader2, ShieldCheck
} from "lucide-react";

interface Check {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "checking" | "passed" | "failed";
  description: string;
}

interface SystemCheckPageProps {
  onAllPassed: (results: Record<string, boolean>) => void;
  onCancel: () => void;
}

const SystemCheckPage = ({ onAllPassed, onCancel }: SystemCheckPageProps) => {
  const [checks, setChecks] = useState<Check[]>([
    { id: "camera", label: "Camera Access", icon: <Camera className="w-5 h-5" />, status: "pending", description: "Allow camera access for proctoring" },
    { id: "microphone", label: "Microphone Access", icon: <Mic className="w-5 h-5" />, status: "pending", description: "Allow microphone for audio monitoring" },
    { id: "screen", label: "Screen Sharing", icon: <Monitor className="w-5 h-5" />, status: "pending", description: "Share your screen during the exam" },
    { id: "fullscreen", label: "Full-Screen Mode", icon: <Maximize className="w-5 h-5" />, status: "pending", description: "Exam runs in full-screen mode" },
    { id: "bluetooth", label: "Bluetooth Disabled", icon: <Bluetooth className="w-5 h-5" />, status: "pending", description: "No external Bluetooth devices" },
    { id: "devices", label: "No External Devices", icon: <Usb className="w-5 h-5" />, status: "pending", description: "No unauthorized peripherals" },
    { id: "apps", label: "No Background Apps", icon: <AppWindow className="w-5 h-5" />, status: "pending", description: "Close unauthorized applications" },
  ]);

  const [currentCheck, setCurrentCheck] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const updateCheck = useCallback((id: string, status: "checking" | "passed" | "failed") => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const runCheck = useCallback(async (check: Check, index: number) => {
    updateCheck(check.id, "checking");
    await new Promise(r => setTimeout(r, 800));

    try {
      switch (check.id) {
        case "camera": {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(t => t.stop());
          updateCheck(check.id, "passed");
          break;
        }
        case "microphone": {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          updateCheck(check.id, "passed");
          break;
        }
        case "screen":
        case "fullscreen":
        case "bluetooth":
        case "devices":
        case "apps":
          // Simulate these checks passing (real implementation would use native APIs)
          await new Promise(r => setTimeout(r, 600));
          updateCheck(check.id, "passed");
          break;
        default:
          updateCheck(check.id, "passed");
      }
    } catch {
      updateCheck(check.id, "failed");
    }

    if (index < checks.length - 1) {
      setCurrentCheck(index + 1);
    } else {
      setAllDone(true);
    }
  }, [checks.length, updateCheck]);

  useEffect(() => {
    if (currentCheck < checks.length && checks[currentCheck].status === "pending") {
      runCheck(checks[currentCheck], currentCheck);
    }
  }, [currentCheck, checks, runCheck]);

  const allPassed = checks.every(c => c.status === "passed");
  const hasFailed = checks.some(c => c.status === "failed");

  const handleProceed = () => {
    const results: Record<string, boolean> = {};
    checks.forEach(c => { results[c.id] = c.status === "passed"; });
    onAllPassed(results);
  };

  const retryFailed = () => {
    const failedIdx = checks.findIndex(c => c.status === "failed");
    if (failedIdx >= 0) {
      setChecks(prev => prev.map((c, i) => i >= failedIdx ? { ...c, status: "pending" } : c));
      setCurrentCheck(failedIdx);
      setAllDone(false);
    }
  };

  const statusIcon = (status: Check["status"]) => {
    switch (status) {
      case "pending": return <div className="w-5 h-5 rounded-full border-2 border-border" />;
      case "checking": return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case "passed": return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "failed": return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 opacity-0 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">System Verification</h1>
          <p className="text-sm text-muted-foreground">All checks must pass before starting the exam</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {checks.map((check, i) => (
            <div
              key={check.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors duration-300 ${
                i !== checks.length - 1 ? "border-b border-border" : ""
              } ${check.status === "checking" ? "bg-primary/5" : ""}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                check.status === "passed" ? "bg-success/10 text-success" :
                check.status === "failed" ? "bg-destructive/10 text-destructive" :
                check.status === "checking" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {check.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </div>
              {statusIcon(check.status)}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-[0.98]">
            Cancel
          </button>
          {allDone && allPassed && (
            <button onClick={handleProceed}
              className="flex-1 py-3 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
              Start Exam
            </button>
          )}
          {allDone && hasFailed && (
            <button onClick={retryFailed}
              className="flex-1 py-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
              Retry Failed Checks
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemCheckPage;
