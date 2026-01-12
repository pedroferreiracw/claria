-- Create team_type enum
CREATE TYPE public.team_type AS ENUM ('SDR', 'Closer');

-- Create closer_evaluation_result enum
CREATE TYPE public.closer_evaluation_result AS ENUM ('fechou', 'nao_fechou', 'follow_up');

-- Add team_type column to sdrs table
ALTER TABLE public.sdrs ADD COLUMN team_type public.team_type NOT NULL DEFAULT 'SDR';

-- Create closer_evaluations table
CREATE TABLE public.closer_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closer_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  video_url TEXT,
  transcription TEXT,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_score INTEGER NOT NULL DEFAULT 0,
  result public.closer_evaluation_result NOT NULL,
  objections JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_feedback JSONB,
  meeting_duration_minutes INTEGER,
  deal_value NUMERIC,
  plan_sold TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.closer_evaluations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view closer evaluations"
ON public.closer_evaluations
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create closer evaluations"
ON public.closer_evaluations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update closer evaluations"
ON public.closer_evaluations
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete closer evaluations"
ON public.closer_evaluations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_closer_evaluations_updated_at
BEFORE UPDATE ON public.closer_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_closer_evaluations_closer_id ON public.closer_evaluations(closer_id);
CREATE INDEX idx_closer_evaluations_date ON public.closer_evaluations(date DESC);