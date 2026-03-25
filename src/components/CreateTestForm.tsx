import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Sparkles, Code, ListChecks,
  Loader2, GripVertical, ChevronDown, ChevronUp
} from "lucide-react";

interface Question {
  question_text: string;
  question_type: "mcq" | "coding";
  marks: number;
  options?: string[];
  correct_answer: string;
  language?: string;
  starter_code?: string;
}

interface CreateTestFormProps {
  onBack: () => void;
  onCreated: () => void;
}

const CreateTestForm = ({ onBack, onCreated }: CreateTestFormProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"details" | "questions">("details");
  const [saving, setSaving] = useState(false);

  // Test details
  const [name, setName] = useState("");
  const [examType, setExamType] = useState<"mcq" | "coding" | "mixed">("mcq");
  const [timeLimit, setTimeLimit] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [isOpenBook, setIsOpenBook] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [topic, setTopic] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [creationMode, setCreationMode] = useState<"manual" | "ai" | null>(null);

  // AI generation
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  // Expanded question index
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleDetailsNext = () => {
    if (!name.trim()) { toast.error("Test name is required"); return; }
    if (!topic.trim()) { toast.error("Topic is required"); return; }
    setStep("questions");
  };

  const addManualQuestion = () => {
    const newQ: Question = examType === "coding"
      ? { question_text: "", question_type: "coding", marks: 10, correct_answer: "", language: "python", starter_code: "" }
      : { question_text: "", question_type: "mcq", marks: 2, options: ["", "", "", ""], correct_answer: "" };
    setQuestions([...questions, newQ]);
    setExpanded(questions.length);
  };

  const updateQuestion = (idx: number, updates: Partial<Question>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
    if (expanded === idx) setExpanded(null);
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    const q = questions[qIdx];
    const opts = [...(q.options || [])];
    opts[optIdx] = value;
    updateQuestion(qIdx, { options: opts });
  };

  const generateWithAI = async () => {
    if (!aiTopic.trim()) { toast.error("Enter a topic for AI generation"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { topic: aiTopic || topic, difficulty, examType, count: aiCount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generated = data?.questions || [];
      if (generated.length === 0) { toast.error("No questions generated"); return; }
      setQuestions([...questions, ...generated]);
      toast.success(`${generated.length} questions generated!`);
      setCreationMode(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const saveTest = async () => {
    if (questions.length === 0) { toast.error("Add at least one question"); return; }
    const invalid = questions.find(q => !q.question_text.trim() || !q.correct_answer.trim());
    if (invalid) { toast.error("All questions must have text and a correct answer"); return; }
    setSaving(true);
    try {
      const { data: test, error: testErr } = await supabase.from("tests").insert({
        admin_id: user!.id,
        name, exam_type: examType, time_limit: timeLimit,
        total_marks: totalMarks, is_open_book: isOpenBook,
        difficulty, topic, status: scheduledStart ? "scheduled" : "draft",
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
      }).select().single();
      if (testErr) throw testErr;

      const questionsToInsert = questions.map((q, i) => ({
        test_id: test.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        options: q.options ? q.options : null,
        correct_answer: q.correct_answer,
        language: q.language || null,
        starter_code: q.starter_code || null,
        sort_order: i,
      }));

      const { error: qErr } = await supabase.from("questions").insert(questionsToInsert);
      if (qErr) throw qErr;

      toast.success("Test created successfully!");
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to save test");
    } finally {
      setSaving(false);
    }
  };

  const calculatedMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  if (step === "details") {
    return (
      <div className="opacity-0 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors active:scale-[0.97]">
          <ArrowLeft className="w-4 h-4" /> Back to Tests
        </button>
        <h2 className="text-xl font-display font-bold text-foreground mb-6">Create New Test</h2>

        <div className="bg-card rounded-xl border border-border p-6 max-w-2xl space-y-5">
          <div>
            <label className={labelClass}>Test Name *</label>
            <input className={inputClass} placeholder="e.g. Data Structures Mid-Term" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Topic *</label>
            <input className={inputClass} placeholder="e.g. Binary Trees, Sorting Algorithms" value={topic} onChange={e => setTopic(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Exam Type</label>
              <select className={inputClass} value={examType} onChange={e => setExamType(e.target.value as any)}>
                <option value="mcq">MCQ</option>
                <option value="coding">Coding</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Difficulty</label>
              <select className={inputClass} value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Time Limit (minutes)</label>
              <input type="number" className={inputClass} value={timeLimit} onChange={e => setTimeLimit(+e.target.value)} min={5} />
            </div>
            <div>
              <label className={labelClass}>Total Marks</label>
              <input type="number" className={inputClass} value={totalMarks} onChange={e => setTotalMarks(+e.target.value)} min={1} />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isOpenBook} onChange={e => setIsOpenBook(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40" />
            <span className="text-sm text-foreground">Open-book exam</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Scheduled Start (optional)</label>
              <input type="datetime-local" className={inputClass} value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Auto-activates at this time</p>
            </div>
            <div>
              <label className={labelClass}>Scheduled End (optional)</label>
              <input type="datetime-local" className={inputClass} value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Auto-deactivates at this time</p>
            </div>
          </div>

          <button onClick={handleDetailsNext}
            className="w-full py-3 rounded-lg gradient-bg-horizontal text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.98] transition-all mt-2">
            Next: Add Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-fade-in">
      <button onClick={() => setStep("details")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors active:scale-[0.97]">
        <ArrowLeft className="w-4 h-4" /> Back to Details
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {questions.length} question{questions.length !== 1 ? "s" : ""} · {calculatedMarks} marks
          </p>
        </div>
        <button onClick={saveTest} disabled={saving}
          className="px-5 py-2.5 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Test"}
        </button>
      </div>

      {/* Creation mode selector */}
      {creationMode === null && (
        <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg">
          <button onClick={() => { setCreationMode("manual"); addManualQuestion(); }}
            className="bg-card rounded-xl border border-border p-5 text-left hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98] group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              {examType === "coding" ? <Code className="w-5 h-5 text-primary" /> : <ListChecks className="w-5 h-5 text-primary" />}
            </div>
            <p className="font-semibold text-foreground text-sm">Manual Entry</p>
            <p className="text-xs text-muted-foreground mt-1">Write questions yourself</p>
          </button>
          <button onClick={() => setCreationMode("ai")}
            className="bg-card rounded-xl border border-border p-5 text-left hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98] group">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-3 group-hover:bg-accent/30 transition-colors">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">AI Generate</p>
            <p className="text-xs text-muted-foreground mt-1">Auto-generate from topic</p>
          </button>
        </div>
      )}

      {/* AI Generation Panel */}
      {creationMode === "ai" && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">AI Question Generator</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Topic</label>
              <input className={inputClass} placeholder="e.g. Binary Search Trees" value={aiTopic || topic} onChange={e => setAiTopic(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Number of Questions</label>
              <input type="number" className={inputClass} value={aiCount} onChange={e => setAiCount(+e.target.value)} min={1} max={20} />
            </div>
            <div className="flex gap-3">
              <button onClick={generateWithAI} disabled={generating}
                className="flex-1 py-2.5 rounded-lg gradient-bg-horizontal text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
              </button>
              <button onClick={() => setCreationMode(null)}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-3 mb-6">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-card rounded-xl border border-border overflow-hidden">
            <button onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">Q{idx + 1}</span>
              <span className="text-sm text-foreground truncate flex-1">
                {q.question_text || <span className="text-muted-foreground italic">Untitled question</span>}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${q.question_type === "mcq" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>
                {q.question_type.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{q.marks} pts</span>
              {expanded === idx ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded === idx && (
              <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
                <div>
                  <label className={labelClass}>Question Text</label>
                  <textarea className={`${inputClass} min-h-[80px] resize-y`} placeholder="Write your question..."
                    value={q.question_text} onChange={e => updateQuestion(idx, { question_text: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Type</label>
                    <select className={inputClass} value={q.question_type} onChange={e => updateQuestion(idx, { question_type: e.target.value as any })}>
                      <option value="mcq">MCQ</option>
                      <option value="coding">Coding</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Marks</label>
                    <input type="number" className={inputClass} value={q.marks} onChange={e => updateQuestion(idx, { marks: +e.target.value })} min={1} />
                  </div>
                </div>

                {q.question_type === "mcq" && (
                  <div>
                    <label className={labelClass}>Options</label>
                    <div className="space-y-2">
                      {(q.options || ["", "", "", ""]).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${q.correct_answer === opt && opt ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <input className={`${inputClass} flex-1`} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            value={opt} onChange={e => updateOption(idx, oi, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Correct Answer</label>
                  {q.question_type === "mcq" ? (
                    <select className={inputClass} value={q.correct_answer}
                      onChange={e => updateQuestion(idx, { correct_answer: e.target.value })}>
                      <option value="">Select correct option</option>
                      {(q.options || []).filter(Boolean).map((opt, oi) => (
                        <option key={oi} value={opt}>{String.fromCharCode(65 + oi)}: {opt}</option>
                      ))}
                    </select>
                  ) : (
                    <textarea className={`${inputClass} min-h-[60px] resize-y`} placeholder="Expected solution approach..."
                      value={q.correct_answer} onChange={e => updateQuestion(idx, { correct_answer: e.target.value })} />
                  )}
                </div>

                {q.question_type === "coding" && (
                  <>
                    <div>
                      <label className={labelClass}>Language</label>
                      <select className={inputClass} value={q.language || "python"} onChange={e => updateQuestion(idx, { language: e.target.value })}>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="javascript">JavaScript</option>
                        <option value="c">C</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Starter Code</label>
                      <textarea className={`${inputClass} min-h-[100px] font-mono text-xs resize-y`} placeholder="# Write starter code here..."
                        value={q.starter_code || ""} onChange={e => updateQuestion(idx, { starter_code: e.target.value })} />
                    </div>
                  </>
                )}

                <button onClick={() => removeQuestion(idx)}
                  className="flex items-center gap-1.5 text-destructive text-xs hover:text-destructive/80 transition-colors active:scale-[0.97]">
                  <Trash2 className="w-3.5 h-3.5" /> Remove Question
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add more */}
      {questions.length > 0 && creationMode === null && (
        <div className="flex gap-3">
          <button onClick={addManualQuestion}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors active:scale-[0.97]">
            <Plus className="w-4 h-4" /> Add Question
          </button>
          <button onClick={() => setCreationMode("ai")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors active:scale-[0.97]">
            <Sparkles className="w-4 h-4" /> Generate More with AI
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateTestForm;
