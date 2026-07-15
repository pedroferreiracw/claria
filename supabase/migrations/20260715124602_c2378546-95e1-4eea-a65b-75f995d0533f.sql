-- 1) Backfill: grant admin role to existing @cardapioweb.com users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email IN (
  'antonio.anderson@cardapioweb.com',
  'joelma.vieira@cardapioweb.com',
  'pedro.ferreira@cardapioweb.com',
  'vithoria.pinheiro@cardapioweb.com',
  'ana.clara@cardapioweb.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Auto-grant admin on future @cardapioweb.com signups (after email verification)
CREATE OR REPLACE FUNCTION public.grant_cardapioweb_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(split_part(NEW.email, '@', 2)) = 'cardapioweb.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_cardapioweb_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_cw_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_cw_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_cardapioweb_admin();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_cw_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_cw_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_cardapioweb_admin();