-- Add additional columns to pipedrive_deals for more detailed information
ALTER TABLE public.pipedrive_deals 
ADD COLUMN IF NOT EXISTS organization_name text,
ADD COLUMN IF NOT EXISTS person_name text,
ADD COLUMN IF NOT EXISTS expected_close_date date,
ADD COLUMN IF NOT EXISTS add_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS lost_reason text,
ADD COLUMN IF NOT EXISTS pipeline_name text;

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_status ON public.pipedrive_deals(status);
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_sdr_id ON public.pipedrive_deals(sdr_id);
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_won_time ON public.pipedrive_deals(won_time);
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_add_time ON public.pipedrive_deals(add_time);