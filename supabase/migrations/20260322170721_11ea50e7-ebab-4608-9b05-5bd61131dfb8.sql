-- Tests table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('mcq', 'coding', 'mixed')),
  time_limit INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'scheduled')),
  is_open_book BOOLEAN NOT NULL DEFAULT false,
  allowed_tools TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'coding')),
  marks INTEGER NOT NULL DEFAULT 1,
  options JSONB,
  correct_answer TEXT,
  language TEXT,
  starter_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Tests: Admins can CRUD their own tests
CREATE POLICY "Admins can view own tests"
  ON public.tests FOR SELECT TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can create tests"
  ON public.tests FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update own tests"
  ON public.tests FOR UPDATE TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can delete own tests"
  ON public.tests FOR DELETE TO authenticated
  USING (admin_id = auth.uid());

-- Students can view active tests
CREATE POLICY "Students can view active tests"
  ON public.tests FOR SELECT TO authenticated
  USING (status = 'active' OR status = 'scheduled');

-- Questions: Admins can CRUD via test ownership
CREATE POLICY "Admins can view questions for own tests"
  ON public.questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = test_id AND tests.admin_id = auth.uid()));

CREATE POLICY "Admins can create questions for own tests"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = test_id AND tests.admin_id = auth.uid()));

CREATE POLICY "Admins can update questions for own tests"
  ON public.questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = test_id AND tests.admin_id = auth.uid()));

CREATE POLICY "Admins can delete questions for own tests"
  ON public.questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = test_id AND tests.admin_id = auth.uid()));

-- Students can view questions for active tests
CREATE POLICY "Students can view questions for active tests"
  ON public.questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = test_id AND (tests.status = 'active')));

-- Triggers for updated_at
CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();