-- Update existing menu settings to include new items
UPDATE app_settings 
SET setting_value = setting_value || 
  '{"goals": true, "development": true, "compare": true, "bestPractices": true, "gamification": true, "pipedrive": true}'::jsonb
WHERE setting_key = 'menu'
AND NOT (setting_value ? 'goals');