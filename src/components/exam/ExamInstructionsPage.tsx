import { useState, useEffect } from "react";
import { BookOpen, Clock, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ExamInstructionsPageProps {
  testName: string;
  timeLimit: number;
  totalQuestions: number;
  isOpenBook: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const ExamInstructionsPage = ({
  testName,
  timeLimit,
  totalQuestions,
  isOpenBook,
  onAccept,
  onCancel,
}: ExamInstructionsPageProps) => {
  const [countdown, setCountdown] = useState(30);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const canProceed = countdown === 0 && accepted;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl opacity-0 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Exam Instructions
          </h1>
          <p className="text-sm text-muted-foreground">{testName}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 mb-4 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Time Limit</p>
              <p className="text-xs text-muted-foreground">
                You have <strong>{timeLimit} minutes</strong> to complete{" "}
                <strong>{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</strong>. The timer starts once you proceed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Proctoring</p>
              <p className="text-xs text-muted-foreground">
                {isOpenBook
                  ? "This is an open-book exam. Proctoring is relaxed."
                  : "Your camera, microphone, and screen will be monitored. Suspicious activity will be flagged and may terminate your exam."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Important Rules</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 mt-1">
                <li>Do not switch tabs or leave the exam window.</li>
                <li>Do not use any unauthorized tools or devices.</li>
                <li>Answers are auto-saved periodically.</li>
                <li>Once submitted, you cannot re-enter the exam.</li>
                <li>Violations may result in immediate termination.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Submission</p>
              <p className="text-xs text-muted-foreground">
                You can navigate between questions freely. Click "Submit Exam" when done, or the exam auto-submits when time runs out.
              </p>
            </div>
          </div>
        </div>

        {countdown > 0 && (
          <div className="text-center mb-4">
            <span className="text-xs text-muted-foreground">
              Please read the instructions carefully. You can accept in{" "}
              <strong className="text-primary">{countdown}s</strong>
            </span>
          </div>
        )}

        {countdown === 0 && (
          <label className="flex items-start gap-3 mb-4 cursor-pointer bg-muted/50 rounded-lg p-3 border border-border">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-snug">
              I have read and understood all the instructions. I agree to abide by the exam rules and accept that any violations may result in termination of my exam.
            </span>
          </label>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!canProceed}
            className="flex-1 py-3 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructionsPage;
