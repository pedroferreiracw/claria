
-- Etapa 2: Add kommo_message_id to kommo_messages for proper deduplication
ALTER TABLE public.kommo_messages 
  ADD COLUMN IF NOT EXISTS kommo_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS kommo_messages_kommo_message_id_key 
  ON public.kommo_messages (kommo_message_id);

-- Etapa 3: Create kommo_analyses table
CREATE TABLE IF NOT EXISTS public.kommo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.kommo_conversations(id) ON DELETE CASCADE,
  sdr_id uuid REFERENCES public.sdrs(id) ON DELETE SET NULL,
  evaluation_id uuid REFERENCES public.evaluations(id) ON DELETE SET NULL,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_feedback jsonb DEFAULT NULL,
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  result text DEFAULT NULL,
  final_score integer NOT NULL DEFAULT 0,
  analyzed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

ALTER TABLE public.kommo_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kommo analyses"
  ON public.kommo_analyses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage kommo analyses"
  ON public.kommo_analyses FOR ALL
  USING (auth.uid() IS NOT NULL);
