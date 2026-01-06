-- Create meetime_config table for storing integration configuration
CREATE TABLE public.meetime_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_token TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetime_leads table
CREATE TABLE public.meetime_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meetime_id TEXT NOT NULL UNIQUE,
  sdr_id UUID,
  name TEXT,
  email TEXT,
  company TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  fit_score INTEGER,
  cadence_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetime_prospections table
CREATE TABLE public.meetime_prospections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meetime_id TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.meetime_leads(id) ON DELETE CASCADE,
  sdr_id UUID,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetime_activities table
CREATE TABLE public.meetime_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meetime_id TEXT NOT NULL UNIQUE,
  prospection_id UUID REFERENCES public.meetime_prospections(id) ON DELETE CASCADE,
  sdr_id UUID,
  type TEXT,
  status TEXT,
  execution_date TIMESTAMP WITH TIME ZONE,
  annotation TEXT,
  call_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetime_meetings table
CREATE TABLE public.meetime_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meetime_id TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.meetime_leads(id) ON DELETE CASCADE,
  sdr_id UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled',
  no_show BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_meetime_leads_sdr_id ON public.meetime_leads(sdr_id);
CREATE INDEX idx_meetime_leads_status ON public.meetime_leads(status);
CREATE INDEX idx_meetime_prospections_sdr_id ON public.meetime_prospections(sdr_id);
CREATE INDEX idx_meetime_prospections_status ON public.meetime_prospections(status);
CREATE INDEX idx_meetime_activities_sdr_id ON public.meetime_activities(sdr_id);
CREATE INDEX idx_meetime_activities_type ON public.meetime_activities(type);
CREATE INDEX idx_meetime_activities_execution_date ON public.meetime_activities(execution_date);
CREATE INDEX idx_meetime_meetings_sdr_id ON public.meetime_meetings(sdr_id);
CREATE INDEX idx_meetime_meetings_status ON public.meetime_meetings(status);
CREATE INDEX idx_meetime_meetings_scheduled_at ON public.meetime_meetings(scheduled_at);

-- Enable RLS on all tables
ALTER TABLE public.meetime_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetime_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetime_prospections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetime_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetime_meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetime_config (admin only)
CREATE POLICY "Admins can manage meetime config"
ON public.meetime_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view meetime config"
ON public.meetime_config
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for meetime_leads
CREATE POLICY "Authenticated users can view meetime leads"
ON public.meetime_leads
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage meetime leads"
ON public.meetime_leads
FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for meetime_prospections
CREATE POLICY "Authenticated users can view meetime prospections"
ON public.meetime_prospections
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage meetime prospections"
ON public.meetime_prospections
FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for meetime_activities
CREATE POLICY "Authenticated users can view meetime activities"
ON public.meetime_activities
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage meetime activities"
ON public.meetime_activities
FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for meetime_meetings
CREATE POLICY "Authenticated users can view meetime meetings"
ON public.meetime_meetings
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage meetime meetings"
ON public.meetime_meetings
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add update trigger for meetime_config
CREATE TRIGGER update_meetime_config_updated_at
BEFORE UPDATE ON public.meetime_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();