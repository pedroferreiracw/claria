
-- app_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view settings" ON public.app_settings FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- badges
DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;
DROP POLICY IF EXISTS "Authenticated users can view badges" ON public.badges;
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view badges" ON public.badges FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- best_practices
DROP POLICY IF EXISTS "Admins can delete best practices" ON public.best_practices;
DROP POLICY IF EXISTS "Authenticated users can view best practices" ON public.best_practices;
CREATE POLICY "Admins can delete best practices" ON public.best_practices FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view best practices" ON public.best_practices FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- closer_evaluations
DROP POLICY IF EXISTS "Admins can delete closer evaluations" ON public.closer_evaluations;
CREATE POLICY "Admins can delete closer evaluations" ON public.closer_evaluations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- development_plans
DROP POLICY IF EXISTS "Admins can delete development plans" ON public.development_plans;
DROP POLICY IF EXISTS "Authenticated users can view development plans" ON public.development_plans;
CREATE POLICY "Admins can delete development plans" ON public.development_plans FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view development plans" ON public.development_plans FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- evaluations
DROP POLICY IF EXISTS "Admins can delete Evaluations" ON public.evaluations;
CREATE POLICY "Admins can delete Evaluations" ON public.evaluations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- goals
DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.goals;
CREATE POLICY "Authenticated users can view goals" ON public.goals FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- sdrs
DROP POLICY IF EXISTS "Admins can create SDRs" ON public.sdrs;
DROP POLICY IF EXISTS "Admins can delete SDRs" ON public.sdrs;
DROP POLICY IF EXISTS "Admins can update SDRs" ON public.sdrs;
DROP POLICY IF EXISTS "Authenticated users can view SDRs" ON public.sdrs;
CREATE POLICY "Admins can create SDRs" ON public.sdrs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete SDRs" ON public.sdrs FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update SDRs" ON public.sdrs FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view SDRs" ON public.sdrs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
