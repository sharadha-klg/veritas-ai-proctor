import { useEffect, useState } from "react";
import { KeyRound, ArrowLeft, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ExamKeyEntryProps {
  testName: string;
  assignedKey?: string | null;
  onVerify: (key: string) => Promise<boolean>;
  onBack: () => void;
}

const ExamKeyEntry = ({ testName, assignedKey, onVerify, onBack }: ExamKeyEntryProps) => {
  const [key, setKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (assignedKey) {
      setKey(assignedKey);
    }
  }, [assignedKey]);

  const handleSubmit = async () => {
    if (!key.trim()) { setError("Please enter the exam key"); return; }
    setError("");
    setVerifying(true);
    const valid = await onVerify(key.trim());
    if (!valid) setError("Invalid exam key. Use the key shown above or from your notifications.");
    setVerifying(false);
  };

  const handleCopyKey = async () => {
    if (!assignedKey) return;
    await navigator.clipboard.writeText(assignedKey);
    setCopied(true);
    toast.success("Exam key copied");
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm opacity-0 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors active:scale-[0.97]">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-1">{testName}</h1>
          <p className="text-sm text-muted-foreground">Use your assigned exam key below to start the exam</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          {assignedKey && (
            <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Your exam key</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-base font-mono tracking-[0.25em] text-foreground">{assignedKey}</code>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <input
            value={key}
            onChange={e => { setKey(e.target.value); setError(""); }}
            placeholder="Enter exam key..."
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-center text-lg font-mono tracking-widest placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/40"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          {error && <p className="text-xs text-destructive mt-2 text-center">{error}</p>}
          <button onClick={handleSubmit} disabled={verifying}
            className="w-full mt-4 py-3 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamKeyEntry;
