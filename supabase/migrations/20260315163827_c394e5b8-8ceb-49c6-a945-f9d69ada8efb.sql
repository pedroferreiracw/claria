ALTER TABLE public.kommo_conversations 
ADD COLUMN IF NOT EXISTS kommo_contact_id text,
ADD COLUMN IF NOT EXISTS responsible_user_id integer;