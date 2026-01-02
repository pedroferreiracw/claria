-- Tabela de Metas/OKRs
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID REFERENCES public.sdrs(id) ON DELETE CASCADE,
  squad squad_type,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('score', 'evaluations', 'conversions', 'custom')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de PDI (Plano de Desenvolvimento Individual)
CREATE TABLE public.development_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL,
  weak_area TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Melhores Práticas
CREATE TABLE public.best_practices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('abertura', 'rapport', 'spin', 'bant', 'dores', 'geracaoValor', 'conducaoAgendamento', 'contornoObjecoes')),
  highlight_text TEXT,
  final_score INTEGER NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Badges/Conquistas
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  criteria JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Badges conquistados pelos SDRs
CREATE TABLE public.sdr_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sdr_id, badge_id)
);

-- Tabela de Streaks
CREATE TABLE public.sdr_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_type TEXT NOT NULL DEFAULT 'daily' CHECK (streak_type IN ('daily', 'weekly')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pontuação mensal para ranking
CREATE TABLE public.monthly_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  evaluations_count INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  rank_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sdr_id, month, year)
);

-- Tabela de configuração do Pipedrive
CREATE TABLE public.pipedrive_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_token TEXT,
  domain TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de métricas do Pipedrive sincronizadas
CREATE TABLE IF NOT EXISTS public.pipedrive_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipedrive_id INTEGER NOT NULL UNIQUE,
  sdr_id UUID REFERENCES public.sdrs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC,
  currency TEXT DEFAULT 'BRL',
  stage_name TEXT,
  status TEXT CHECK (status IN ('open', 'won', 'lost')),
  won_time TIMESTAMP WITH TIME ZONE,
  lost_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipedrive_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipedrive_deals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para Goals
CREATE POLICY "Anyone can view goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update goals" ON public.goals FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete goals" ON public.goals FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Development Plans
CREATE POLICY "Anyone can view development plans" ON public.development_plans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create development plans" ON public.development_plans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update development plans" ON public.development_plans FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete development plans" ON public.development_plans FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Best Practices
CREATE POLICY "Anyone can view best practices" ON public.best_practices FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create best practices" ON public.best_practices FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete best practices" ON public.best_practices FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Badges
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para SDR Badges
CREATE POLICY "Anyone can view sdr badges" ON public.sdr_badges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage sdr badges" ON public.sdr_badges FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Streaks
CREATE POLICY "Anyone can view streaks" ON public.sdr_streaks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage streaks" ON public.sdr_streaks FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Monthly Scores
CREATE POLICY "Anyone can view monthly scores" ON public.monthly_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage monthly scores" ON public.monthly_scores FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Pipedrive Config
CREATE POLICY "Authenticated users can view pipedrive config" ON public.pipedrive_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage pipedrive config" ON public.pipedrive_config FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas RLS para Pipedrive Deals
CREATE POLICY "Anyone can view pipedrive deals" ON public.pipedrive_deals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage pipedrive deals" ON public.pipedrive_deals FOR ALL USING (auth.uid() IS NOT NULL);

-- Triggers para updated_at
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_development_plans_updated_at BEFORE UPDATE ON public.development_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sdr_streaks_updated_at BEFORE UPDATE ON public.sdr_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_scores_updated_at BEFORE UPDATE ON public.monthly_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipedrive_config_updated_at BEFORE UPDATE ON public.pipedrive_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir badges padrão
INSERT INTO public.badges (name, description, icon, color, criteria, points) VALUES
('Primeira Avaliação', 'Completou a primeira avaliação', 'Award', 'blue', '{"type": "evaluations_count", "value": 1}', 10),
('Nota 90+', 'Alcançou nota 90 ou superior em uma avaliação', 'Star', 'yellow', '{"type": "score_above", "value": 90}', 25),
('Nota Perfeita', 'Alcançou nota 100 em uma avaliação', 'Crown', 'purple', '{"type": "score_above", "value": 100}', 50),
('Mestre em SPIN', 'Nota máxima em SPIN em 5 avaliações', 'Target', 'green', '{"type": "category_max", "category": "spin", "count": 5}', 30),
('Expert em Objeções', 'Nota máxima em contorno de objeções em 5 avaliações', 'Shield', 'red', '{"type": "category_max", "category": "contornoObjecoes", "count": 5}', 30),
('Streak de 7 dias', 'Manteve atividade por 7 dias consecutivos', 'Flame', 'orange', '{"type": "streak", "value": 7}', 40),
('Streak de 30 dias', 'Manteve atividade por 30 dias consecutivos', 'Zap', 'gold', '{"type": "streak", "value": 30}', 100),
('Top 3 do Mês', 'Ficou entre os 3 melhores do mês', 'Trophy', 'gold', '{"type": "monthly_rank", "value": 3}', 50),
('Campeão do Mês', 'Ficou em 1º lugar no ranking mensal', 'Medal', 'gold', '{"type": "monthly_rank", "value": 1}', 100),
('10 Avaliações', 'Completou 10 avaliações', 'CheckCircle', 'teal', '{"type": "evaluations_count", "value": 10}', 20);