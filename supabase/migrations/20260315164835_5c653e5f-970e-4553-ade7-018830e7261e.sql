UPDATE public.app_settings 
SET setting_value = '{"talkPage": 1, "eventPage": 1, "talksComplete": true}'::jsonb,
    updated_at = now()
WHERE setting_key = 'kommo_sync_state';

INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
VALUES ('kommo_sync_state', '{"talkPage": 1, "eventPage": 1, "talksComplete": true}'::jsonb, now())
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = '{"talkPage": 1, "eventPage": 1, "talksComplete": true}'::jsonb,
  updated_at = now();