-- Create table for Meetime deal feedbacks (Oportunidades/Reuniões qualificadas)
CREATE TABLE public.meetime_deal_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meetime_id TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.meetime_leads(id),
  prospection_id UUID REFERENCES public.meetime_prospections(id),
  sdr_id UUID,
  result TEXT, -- 'QUALIFIED', 'UNQUALIFIED', 'NO_CONTACT'
  meeting_date TIMESTAMP WITH TIME ZONE,
  response_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add first_contact_at and lead_time_response to prospections
ALTER TABLE public.meetime_prospections 
ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lead_time_response_seconds INTEGER;

-- Enable RLS on deal_feedbacks
ALTER TABLE public.meetime_deal_feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal feedbacks
CREATE POLICY "Authenticated users can view meetime deal feedbacks"
ON public.meetime_deal_feedbacks
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage meetime deal feedbacks"
ON public.meetime_deal_feedbacks
FOR ALL
USING (auth.uid() IS NOT NULL);