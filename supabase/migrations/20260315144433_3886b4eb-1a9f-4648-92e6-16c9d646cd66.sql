
ALTER TABLE public.kommo_config ADD COLUMN IF NOT EXISTS integration_id text;
ALTER TABLE public.kommo_config ADD COLUMN IF NOT EXISTS secret_key text;
