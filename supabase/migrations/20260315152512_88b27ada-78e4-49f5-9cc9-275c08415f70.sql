
SELECT cron.schedule(
  'sync-kommo-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuluogrlwqehvhxpqjok.supabase.co/functions/v1/sync-kommo',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bHVvZ3Jsd3FlaHZoeHBxam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDU5MTUsImV4cCI6MjA4MDcyMTkxNX0.VnGWqLLJnAHDPibJUlFaww5497sTwvMKdIuITRBmQis"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'auto-analyze-kommo-every-30min',
  '15,45 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuluogrlwqehvhxpqjok.supabase.co/functions/v1/auto-analyze-kommo',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bHVvZ3Jsd3FlaHZoeHBxam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDU5MTUsImV4cCI6MjA4MDcyMTkxNX0.VnGWqLLJnAHDPibJUlFaww5497sTwvMKdIuITRBmQis"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
