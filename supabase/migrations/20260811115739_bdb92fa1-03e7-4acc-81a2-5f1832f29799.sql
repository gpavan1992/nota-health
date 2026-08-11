CREATE OR REPLACE FUNCTION public.is_case_member(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.case_members cm
      JOIN auth.users u ON lower(u.email) = lower(cm.member_email)
      WHERE cm.case_id = _case_id
        AND u.id = _user_id
        AND u.email_confirmed_at IS NOT NULL
    )
$function$;

CREATE OR REPLACE FUNCTION public.is_case_owner(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases WHERE id = _case_id AND owner_id = _user_id
    )
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_case_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_case_owner(uuid, uuid) FROM anon;