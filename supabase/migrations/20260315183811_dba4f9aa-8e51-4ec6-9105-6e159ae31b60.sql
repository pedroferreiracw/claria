
ALTER TABLE public.kommo_conversations 
ADD COLUMN IF NOT EXISTS message_source text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fetch_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fetch_error text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_fetch_attempt_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS chat_id text DEFAULT NULL;
