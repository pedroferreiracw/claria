-- Create enum types
CREATE TYPE public.squad_type AS ENUM ('Águia', 'Lobo');
CREATE TYPE public.prospection_type AS ENUM ('Ligação', 'WhatsApp');
CREATE TYPE public.prospection_result AS ENUM ('prosseguiu', 'recusou', 'perdeu_interesse');

-- Create SDRs table
CREATE TABLE public.sdrs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  squad squad_type NOT NULL,
  role TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  type prospection_type NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  conversation_text TEXT,
  audio_url TEXT,
  questions_asked TEXT[] NOT NULL DEFAULT '{}',
  lead_responses TEXT[] NOT NULL DEFAULT '{}',
  result prospection_result NOT NULL,
  -- Scores stored as JSONB for flexibility
  scores JSONB NOT NULL DEFAULT '{
    "abertura": 0,
    "rapport": 0,
    "spin": 0,
    "bant": 0,
    "dores": 0,
    "geracaoValor": 0,
    "conducaoAgendamento": 0,
    "contornoObjecoes": 0
  }',
  final_score INTEGER NOT NULL DEFAULT 0,
  -- Objections stored as JSONB array
  objections JSONB NOT NULL DEFAULT '[]',
  -- AI Feedback stored as JSONB
  ai_feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SDRs (public read, authenticated write)
CREATE POLICY "Anyone can view SDRs" 
ON public.sdrs 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create SDRs" 
ON public.sdrs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update SDRs" 
ON public.sdrs 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete SDRs" 
ON public.sdrs 
FOR DELETE 
TO authenticated
USING (true);

-- RLS Policies for Evaluations (public read, authenticated write)
CREATE POLICY "Anyone can view Evaluations" 
ON public.evaluations 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create Evaluations" 
ON public.evaluations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update Evaluations" 
ON public.evaluations 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete Evaluations" 
ON public.evaluations 
FOR DELETE 
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_evaluations_sdr_id ON public.evaluations(sdr_id);
CREATE INDEX idx_evaluations_date ON public.evaluations(date);
CREATE INDEX idx_evaluations_final_score ON public.evaluations(final_score);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_sdrs_updated_at
BEFORE UPDATE ON public.sdrs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();