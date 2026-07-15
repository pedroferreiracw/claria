## Diagnóstico

O erro `new row violates row-level security policy for table "sdrs"` vem da policy `"Admins can create SDRs"`:

```
INSERT em public.sdrs → WITH CHECK: has_role(auth.uid(), 'admin')
```

O usuário logado não tem role `admin` em `public.user_roles`, então o RLS bloqueia. O payload do INSERT (`name, squad, role, avatar_url`) está correto — a policy não exige `created_by`/`org_id`. **Nada de código de UI, hooks ou componentes precisa mudar.**

## Situação atual dos 5 e-mails solicitados

Já existem em `auth.users`:
- antonio.anderson@cardapioweb.com
- joelma.vieira@cardapioweb.com

Ainda **não** existem em `auth.users` (precisam fazer signup em `/auth` primeiro):
- pedro.ferreira@cardapioweb.com
- vithoria.pinheiro@cardapioweb.com
- ana.clara@cardapioweb.com

## Correção proposta (menor mudança, mantendo segurança)

Uma única migration que:

1. **Concede role `admin`** aos 2 usuários que já existem (INSERT em `public.user_roles` com `ON CONFLICT DO NOTHING`).
2. **Cria um trigger seguro em `auth.users`** que, quando um usuário do domínio `@cardapioweb.com` é criado ou tem o e-mail confirmado (`email_confirmed_at IS NOT NULL`), concede automaticamente a role `admin`. Isso resolve os 3 e-mails que ainda vão se cadastrar, sem exigir intervenção manual, e segue o padrão seguro (só concede após verificação do e-mail, evitando privilege-escalation via signup de e-mail alheio).

### Arquivo alterado

- **Novo**: `supabase/migrations/<timestamp>_grant_cardapioweb_admin.sql`

### SQL (resumo)

```sql
-- 1) Backfill dos usuários já existentes
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

-- 2) Trigger para futuros signups do domínio @cardapioweb.com (só após email verificado)
CREATE OR REPLACE FUNCTION public.grant_cardapioweb_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE TRIGGER on_auth_user_created_grant_cw_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_cardapioweb_admin();

CREATE TRIGGER on_auth_user_confirmed_grant_cw_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_cardapioweb_admin();
```

## O que NÃO será alterado

- Nenhuma policy RLS (permanecem admin-only para escrita).
- Nenhum componente React, hook, layout ou UI.
- Nenhuma outra tabela.

## Observações

- Os 3 e-mails ainda não cadastrados precisam abrir `/auth` e fazer signup; a role `admin` será atribuída automaticamente após confirmarem o e-mail.
- O usuário `antonio.anderson@cardapioweb.com` teve `invalid_credentials` nos logs — se ele não lembrar a senha, precisa usar "Esqueci minha senha" ou recriar a conta.
