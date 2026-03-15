DELETE FROM public.kommo_messages;
DELETE FROM public.kommo_conversations WHERE sdr_id IS NULL;
DELETE FROM public.kommo_conversations WHERE lead_name = 'Desconhecido';