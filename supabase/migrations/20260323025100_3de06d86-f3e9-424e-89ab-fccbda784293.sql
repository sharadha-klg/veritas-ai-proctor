
-- Exam sessions table: tracks when a student takes a test
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  risk_score INTEGER NOT NULL DEFAULT 0,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  system_checks JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Student answers table
CREATE TABLE public.student_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  marks_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Proctoring events table: logs suspicious activities
CREATE TABLE public.proctoring_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT NOT NULL,
  risk_delta INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;

-- Exam sessions policies
CREATE POLICY "Students can view own sessions" ON public.exam_sessions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students can insert own sessions" ON public.exam_sessions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own sessions" ON public.exam_sessions FOR UPDATE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admins can view sessions for own tests" ON public.exam_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = exam_sessions.test_id AND tests.admin_id = auth.uid()));

-- Student answers policies
CREATE POLICY "Students can manage own answers" ON public.student_answers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_sessions WHERE exam_sessions.id = student_answers.session_id AND exam_sessions.student_id = auth.uid()));
CREATE POLICY "Admins can view answers for own tests" ON public.student_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_sessions JOIN public.tests ON tests.id = exam_sessions.test_id WHERE exam_sessions.id = student_answers.session_id AND tests.admin_id = auth.uid()));

-- Proctoring events policies
CREATE POLICY "Students can insert own events" ON public.proctoring_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.exam_sessions WHERE exam_sessions.id = proctoring_events.session_id AND exam_sessions.student_id = auth.uid()));
CREATE POLICY "Students can view own events" ON public.proctoring_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_sessions WHERE exam_sessions.id = proctoring_events.session_id AND exam_sessions.student_id = auth.uid()));
CREATE POLICY "Admins can view events for own tests" ON public.proctoring_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_sessions JOIN public.tests ON tests.id = exam_sessions.test_id WHERE exam_sessions.id = proctoring_events.session_id AND tests.admin_id = auth.uid()));

-- Updated at trigger for exam_sessions
CREATE TRIGGER update_exam_sessions_updated_at BEFORE UPDATE ON public.exam_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for proctoring events
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proctoring_events;
