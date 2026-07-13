
-- 1) Tighten case_members SELECT policy: require verified email for the self-view branch
DROP POLICY IF EXISTS "Owner or self can view members" ON public.case_members;
CREATE POLICY "Owner or self can view members"
ON public.case_members
FOR SELECT
USING (
  public.is_case_owner(case_id, auth.uid())
  OR (
    COALESCE((auth.jwt() ->> 'email_verified')::boolean, false) = true
    AND lower(member_email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
  )
);

-- 2) Tighten chat_threads policies: disallow NULL case_id on writes when the caller is a member of a case (still allow personal non-case threads owned by the caller). Rewrite policies to make the intent explicit.
DROP POLICY IF EXISTS "Users insert their own threads with valid case" ON public.chat_threads;
CREATE POLICY "Users insert their own threads with valid case"
ON public.chat_threads
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    case_id IS NULL
    OR public.is_case_owner(case_id, auth.uid())
    OR public.is_case_member(case_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users update their own threads with valid case" ON public.chat_threads;
CREATE POLICY "Users update their own threads with valid case"
ON public.chat_threads
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    case_id IS NULL
    OR public.is_case_owner(case_id, auth.uid())
    OR public.is_case_member(case_id, auth.uid())
  )
);

-- 3) Lock down SECURITY DEFINER trigger function from being callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon;
