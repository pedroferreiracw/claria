
-- Remove old cron jobs and create new ones at 15-minute intervals
SELECT cron.unschedule('sync-kommo-every-30min');
SELECT cron.unschedule('auto-analyze-kommo-every-30min');

SELECT cron.schedule(
  'sync-kommo-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuluogrlwqehvhxpqjok.supabase.co/functions/v1/sync-kommo',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bHVvZ3Jsd3FlaHZoeHBxam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDU5MTUsImV4cCI6MjA4MDcyMTkxNX0.VnGWqLLJnAHDPibJUlFaww5497sTwvMKdIuITRBmQis"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'auto-analyze-kommo-every-15min',
  '7,22,37,52 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuluogrlwqehvhxpqjok.supabase.co/functions/v1/auto-analyze-kommo',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bHVvZ3Jsd3FlaHZoeHBxam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDU5MTUsImV4cCI6MjA4MDcyMTkxNX0.VnGWqLLJnAHDPibJUlFaww5497sTwvMKdIuITRBmQis"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Reset sync state to force fresh user discovery with group-based approach
DELETE FROM public.app_settings WHERE setting_key IN ('kommo_presales_users', 'kommo_sync_state', 'kommo_sync_page');
