-- Add attachments table for task files
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add skills table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add task_skills junction table
CREATE TABLE IF NOT EXISTS public.task_skills (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, skill_id)
);

-- Add career_goals table
CREATE TABLE IF NOT EXISTS public.career_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add goal_skills junction table
CREATE TABLE IF NOT EXISTS public.goal_skills (
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, skill_id)
);

-- Add review_sessions table
CREATE TABLE IF NOT EXISTS public.review_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('one_on_one', 'performance')),
  scheduled_date DATE NOT NULL,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add review_cadence table for user preferences
CREATE TABLE IF NOT EXISTS public.review_cadence (
  user_id UUID NOT NULL PRIMARY KEY,
  one_on_one TEXT NOT NULL DEFAULT 'weekly' CHECK (one_on_one IN ('weekly', 'biweekly', 'monthly')),
  performance TEXT NOT NULL DEFAULT 'quarterly' CHECK (performance IN ('quarterly', 'annual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cadence ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "Users can view their own task attachments"
  ON public.task_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task attachments"
  ON public.task_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task attachments"
  ON public.task_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for skills
CREATE POLICY "Users can view their own skills"
  ON public.skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skills"
  ON public.skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
  ON public.skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills"
  ON public.skills FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for task_skills
CREATE POLICY "Users can view their own task skills"
  ON public.task_skills FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks WHERE tasks.id = task_skills.task_id AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own task skills"
  ON public.task_skills FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks WHERE tasks.id = task_skills.task_id AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own task skills"
  ON public.task_skills FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks WHERE tasks.id = task_skills.task_id AND tasks.user_id = auth.uid()
  ));

-- RLS policies for career_goals
CREATE POLICY "Users can view their own goals"
  ON public.career_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON public.career_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.career_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.career_goals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for goal_skills
CREATE POLICY "Users can view their own goal skills"
  ON public.goal_skills FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.career_goals WHERE career_goals.id = goal_skills.goal_id AND career_goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own goal skills"
  ON public.goal_skills FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.career_goals WHERE career_goals.id = goal_skills.goal_id AND career_goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own goal skills"
  ON public.goal_skills FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.career_goals WHERE career_goals.id = goal_skills.goal_id AND career_goals.user_id = auth.uid()
  ));

-- RLS policies for review_sessions
CREATE POLICY "Users can view their own review sessions"
  ON public.review_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own review sessions"
  ON public.review_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review sessions"
  ON public.review_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review sessions"
  ON public.review_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for review_cadence
CREATE POLICY "Users can view their own cadence"
  ON public.review_cadence FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cadence"
  ON public.review_cadence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cadence"
  ON public.review_cadence FOR UPDATE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_career_goals_updated_at
  BEFORE UPDATE ON public.career_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_sessions_updated_at
  BEFORE UPDATE ON public.review_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_cadence_updated_at
  BEFORE UPDATE ON public.review_cadence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();