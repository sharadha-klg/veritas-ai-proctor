import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Loader2, Terminal, ChevronDown } from "lucide-react";

interface CodingEnvironmentProps {
  questionId: string;
  code: string;
  defaultLanguage?: string | null;
  starterCode?: string | null;
  onChange: (code: string) => void;
}

const LANGUAGES = [
  { value: "python", label: "Python", extension: ".py" },
  { value: "c", label: "C", extension: ".c" },
  { value: "cpp", label: "C++", extension: ".cpp" },
  { value: "java", label: "Java", extension: ".java" },
  { value: "r", label: "R", extension: ".r" },
];

const STARTER_TEMPLATES: Record<string, string> = {
  python: `# Write your solution here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n        \n    }\n}\n`,
  r: `# Write your solution here\n\nmain <- function() {\n  \n}\n\nmain()\n`,
};

const CodingEnvironment = ({
  questionId, code, defaultLanguage, starterCode, onChange,
}: CodingEnvironmentProps) => {
  const [language, setLanguage] = useState(
    defaultLanguage?.toLowerCase() || "python"
  );
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput("");
    setExitCode(null);

    try {
      const { data, error } = await supabase.functions.invoke("execute-code", {
        body: { code, language, stdin },
      });

      if (error) throw error;
      if (data?.error) {
        setOutput(data.error);
        setExitCode(-1);
        return;
      }

      const compileOut = data.compileOutput || data.compileError || "";
      const runOut = data.output || data.stdout || "";
      const runErr = data.stderr || "";

      let fullOutput = "";
      if (compileOut) fullOutput += `[Compile]\n${compileOut}\n`;
      if (runOut) fullOutput += runOut;
      if (runErr) fullOutput += (fullOutput ? "\n" : "") + `[stderr]\n${runErr}`;
      if (!fullOutput.trim()) fullOutput = "(No output)";

      setOutput(fullOutput);
      setExitCode(data.exitCode ?? 0);
    } catch (e: any) {
      setOutput(`Error: ${e.message || "Failed to execute code"}`);
      setExitCode(-1);
    } finally {
      setRunning(false);
    }
  }, [code, language, stdin]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none bg-muted border border-border rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <button
            onClick={() => setShowInput(!showInput)}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            {showInput ? "Hide" : "Show"} Input
          </button>
        </div>
        <button
          onClick={handleRun}
          disabled={running || !code.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? "Running..." : "Run Code"}
        </button>
      </div>

      {/* Stdin */}
      {showInput && (
        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="Standard input (stdin)..."
          className="w-full h-16 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      )}

      {/* Code editor */}
      <div className="relative">
        <div className="absolute top-2 right-2 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
          {LANGUAGES.find(l => l.value === language)?.label}
        </div>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[280px] px-4 py-3 rounded-xl bg-[hsl(var(--muted))] border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y leading-relaxed"
          placeholder="Write your code here..."
          style={{ tabSize: 4 }}
          onKeyDown={(e) => {
            // Tab key support
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const val = e.currentTarget.value;
              onChange(val.substring(0, start) + "    " + val.substring(end));
              requestAnimationFrame(() => {
                e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
              });
            }
          }}
        />
      </div>

      {/* Output panel */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between bg-muted px-4 py-2 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Terminal className="w-3.5 h-3.5" />
            Output
          </div>
          {exitCode !== null && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              exitCode === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}>
              exit: {exitCode}
            </span>
          )}
        </div>
        <pre className="px-4 py-3 text-xs font-mono text-foreground min-h-[80px] max-h-[200px] overflow-auto whitespace-pre-wrap bg-card">
          {running ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Executing...
            </span>
          ) : output || (
            <span className="text-muted-foreground">Run your code to see output here</span>
          )}
        </pre>
      </div>
    </div>
  );
};

export default CodingEnvironment;
