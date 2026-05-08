
-- 1. Drop legacy integration tables
DROP TABLE IF EXISTS public.kommo_messages CASCADE;
DROP TABLE IF EXISTS public.kommo_analyses CASCADE;
DROP TABLE IF EXISTS public.kommo_conversations CASCADE;
DROP TABLE IF EXISTS public.kommo_config CASCADE;
DROP TABLE IF EXISTS public.meetime_activities CASCADE;
DROP TABLE IF EXISTS public.meetime_meetings CASCADE;
DROP TABLE IF EXISTS public.meetime_deal_feedbacks CASCADE;
DROP TABLE IF EXISTS public.meetime_prospections CASCADE;
DROP TABLE IF EXISTS public.meetime_leads CASCADE;
DROP TABLE IF EXISTS public.meetime_config CASCADE;
DROP TABLE IF EXISTS public.pipedrive_deals CASCADE;
DROP TABLE IF EXISTS public.pipedrive_config CASCADE;

-- 2. Profiles: only owner can view their profile
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 3. Evaluations: restrict SELECT (transcripts/audio) to admins
DROP POLICY IF EXISTS "Authenticated users can view Evaluations" ON public.evaluations;
CREATE POLICY "Admins can view Evaluations"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can create Evaluations" ON public.evaluations;
CREATE POLICY "Admins can create Evaluations"
  ON public.evaluations FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can update Evaluations" ON public.evaluations;
CREATE POLICY "Admins can update Evaluations"
  ON public.evaluations FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Closer evaluations: restrict to admins
DROP POLICY IF EXISTS "Authenticated users can view closer evaluations" ON public.closer_evaluations;
CREATE POLICY "Admins can view closer evaluations"
  ON public.closer_evaluations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can create closer evaluations" ON public.closer_evaluations;
CREATE POLICY "Admins can create closer evaluations"
  ON public.closer_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can update closer evaluations" ON public.closer_evaluations;
CREATE POLICY "Admins can update closer evaluations"
  ON public.closer_evaluations FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Goals: writes admin-only
DROP POLICY IF EXISTS "Authenticated users can create goals" ON public.goals;
DROP POLICY IF EXISTS "Authenticated users can update goals" ON public.goals;
DROP POLICY IF EXISTS "Authenticated users can delete goals" ON public.goals;
CREATE POLICY "Admins can create goals"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update goals"
  ON public.goals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete goals"
  ON public.goals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Development plans: writes admin-only
DROP POLICY IF EXISTS "Authenticated users can create development plans" ON public.development_plans;
DROP POLICY IF EXISTS "Authenticated users can update development plans" ON public.development_plans;
CREATE POLICY "Admins can create development plans"
  ON public.development_plans FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update development plans"
  ON public.development_plans FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Monthly scores: writes admin-only
DROP POLICY IF EXISTS "Authenticated users can manage monthly scores" ON public.monthly_scores;
CREATE POLICY "Admins can manage monthly scores"
  ON public.monthly_scores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. SDR badges: writes admin-only
DROP POLICY IF EXISTS "Authenticated users can manage sdr badges" ON public.sdr_badges;
CREATE POLICY "Admins can manage sdr badges"
  ON public.sdr_badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9. SDR streaks: writes admin-only
DROP POLICY IF EXISTS "Authenticated users can manage streaks" ON public.sdr_streaks;
CREATE POLICY "Admins can manage streaks"
  ON public.sdr_streaks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 10. Best practices: tighten INSERT to admins (was authenticated-any)
DROP POLICY IF EXISTS "Authenticated users can create best practices" ON public.best_practices;
CREATE POLICY "Admins can create best practices"
  ON public.best_practices FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. user_roles: restrict to authenticated role only (no anon)
-- Already on {authenticated} for ALL; "Admins can view all roles" is on {authenticated}. Re-create explicit.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());
