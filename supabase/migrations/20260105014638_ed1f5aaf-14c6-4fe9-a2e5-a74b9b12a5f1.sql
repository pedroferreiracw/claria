-- Fix security issues: Restrict RLS policies to authenticated users only

-- =============================================
-- 1. SDRs table - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view SDRs" ON public.sdrs;
DROP POLICY IF EXISTS "Authenticated users can create SDRs" ON public.sdrs;
DROP POLICY IF EXISTS "Authenticated users can delete SDRs" ON public.sdrs;
DROP POLICY IF EXISTS "Authenticated users can update SDRs" ON public.sdrs;

CREATE POLICY "Authenticated users can view SDRs" 
ON public.sdrs FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create SDRs" 
ON public.sdrs FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update SDRs" 
ON public.sdrs FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete SDRs" 
ON public.sdrs FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 2. Evaluations table - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view Evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Authenticated users can create Evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Authenticated users can delete Evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Authenticated users can update Evaluations" ON public.evaluations;

CREATE POLICY "Authenticated users can view Evaluations" 
ON public.evaluations FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create Evaluations" 
ON public.evaluations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update Evaluations" 
ON public.evaluations FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete Evaluations" 
ON public.evaluations FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 3. Development plans - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view development plans" ON public.development_plans;
DROP POLICY IF EXISTS "Authenticated users can create development plans" ON public.development_plans;
DROP POLICY IF EXISTS "Authenticated users can delete development plans" ON public.development_plans;
DROP POLICY IF EXISTS "Authenticated users can update development plans" ON public.development_plans;

CREATE POLICY "Authenticated users can view development plans" 
ON public.development_plans FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create development plans" 
ON public.development_plans FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update development plans" 
ON public.development_plans FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete development plans" 
ON public.development_plans FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 4. Best practices - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view best practices" ON public.best_practices;
DROP POLICY IF EXISTS "Authenticated users can create best practices" ON public.best_practices;
DROP POLICY IF EXISTS "Authenticated users can delete best practices" ON public.best_practices;

CREATE POLICY "Authenticated users can view best practices" 
ON public.best_practices FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create best practices" 
ON public.best_practices FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete best practices" 
ON public.best_practices FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Goals - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view goals" ON public.goals;

CREATE POLICY "Authenticated users can view goals" 
ON public.goals FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 6. Badges - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;

CREATE POLICY "Authenticated users can view badges" 
ON public.badges FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 7. SDR Badges - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view sdr badges" ON public.sdr_badges;

CREATE POLICY "Authenticated users can view sdr badges" 
ON public.sdr_badges FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 8. SDR Streaks - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view streaks" ON public.sdr_streaks;

CREATE POLICY "Authenticated users can view streaks" 
ON public.sdr_streaks FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 9. Monthly Scores - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view monthly scores" ON public.monthly_scores;

CREATE POLICY "Authenticated users can view monthly scores" 
ON public.monthly_scores FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 10. Pipedrive Deals - Restrict to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view pipedrive deals" ON public.pipedrive_deals;

CREATE POLICY "Authenticated users can view pipedrive deals" 
ON public.pipedrive_deals FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 11. Pipedrive Config - Restrict to ADMINS ONLY (contains API tokens)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage pipedrive config" ON public.pipedrive_config;
DROP POLICY IF EXISTS "Authenticated users can view pipedrive config" ON public.pipedrive_config;

CREATE POLICY "Admins can view pipedrive config" 
ON public.pipedrive_config FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage pipedrive config" 
ON public.pipedrive_config FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =============================================
-- 12. Profiles - Already has reasonable policies, but restrict public viewing
-- =============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =============================================
-- 13. App Settings - Already has admin-only management, restrict public viewing
-- =============================================
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;

CREATE POLICY "Authenticated users can view settings" 
ON public.app_settings FOR SELECT 
USING (auth.uid() IS NOT NULL);