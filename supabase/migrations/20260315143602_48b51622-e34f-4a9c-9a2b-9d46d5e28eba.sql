
-- Kommo config table for OAuth credentials
CREATE TABLE public.kommo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  scope_id text,
  is_connected boolean DEFAULT false,
  last_sync_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.kommo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage kommo config" ON public.kommo_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view kommo config" ON public.kommo_config
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'));

-- Kommo conversations table
CREATE TABLE public.kommo_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kommo_id text NOT NULL UNIQUE,
  sdr_id uuid REFERENCES public.sdrs(id) ON DELETE SET NULL,
  lead_name text,
  lead_phone text,
  lead_email text,
  status text DEFAULT 'active',
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  messages_count integer DEFAULT 0,
  avg_response_time_seconds integer,
  ai_analysis_id uuid REFERENCES public.evaluations(id) ON DELETE SET NULL,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.kommo_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kommo conversations" ON public.kommo_conversations
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage kommo conversations" ON public.kommo_conversations
  FOR ALL TO public
  USING (auth.uid() IS NOT NULL);

-- Kommo messages table
CREATE TABLE public.kommo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.kommo_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('sdr', 'lead', 'system')),
  sender_name text,
  content text NOT NULL,
  sent_at timestamp with time zone NOT NULL,
  response_time_seconds integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.kommo_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kommo messages" ON public.kommo_messages
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage kommo messages" ON public.kommo_messages
  FOR ALL TO public
  USING (auth.uid() IS NOT NULL);

-- Add kommo to menu settings
CREATE INDEX idx_kommo_conversations_sdr ON public.kommo_conversations(sdr_id);
CREATE INDEX idx_kommo_conversations_status ON public.kommo_conversations(status);
CREATE INDEX idx_kommo_messages_conversation ON public.kommo_messages(conversation_id);
CREATE INDEX idx_kommo_messages_sent_at ON public.kommo_messages(sent_at);
