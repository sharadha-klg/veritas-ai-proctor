import { useState } from "react";
import { KeyRound, ArrowLeft, Loader2 } from "lucide-react";

interface ExamKeyEntryProps {
  testName: string;
  onVerify: (key: string) => Promise<boolean>;
  onBack: () => void;
}

const ExamKeyEntry = ({ testName, onVerify, onBack }: ExamKeyEntryProps) => {
  const [key, setKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!key.trim()) { setError("Please enter the exam key"); return; }
    setError("");
    setVerifying(true);
    const valid = await onVerify(key.trim());
    if (!valid) setError("Invalid exam key. Please check the key sent to your email and try again.");
    setVerifying(false);
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
          <p className="text-sm text-muted-foreground">Enter the exam key sent to your email to start the exam</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <input
            value={key}
            onChange={e => { setKey(e.target.value); setError(""); }}
            placeholder="Enter exam key from email..."
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
