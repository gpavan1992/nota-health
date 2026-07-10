
-- chat_threads: replace blanket owner policy with case-scoped validation
DROP POLICY IF EXISTS "own threads" ON public.chat_threads;

CREATE POLICY "Users read their own threads"
  ON public.chat_threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own threads with valid case"
  ON public.chat_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      case_id IS NULL
      OR public.is_case_owner(case_id, auth.uid())
      OR public.is_case_member(case_id, auth.uid())
    )
  );

CREATE POLICY "Users update their own threads with valid case"
  ON public.chat_threads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      case_id IS NULL
      OR public.is_case_owner(case_id, auth.uid())
      OR public.is_case_member(case_id, auth.uid())
    )
  );

CREATE POLICY "Users delete their own threads"
  ON public.chat_threads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- extractions: same case-scoped validation
DROP POLICY IF EXISTS "own extractions" ON public.extractions;

CREATE POLICY "Users read their own extractions"
  ON public.extractions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own extractions with valid case"
  ON public.extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      case_id IS NULL
      OR public.is_case_owner(case_id, auth.uid())
      OR public.is_case_member(case_id, auth.uid())
    )
  );

CREATE POLICY "Users update their own extractions with valid case"
  ON public.extractions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      case_id IS NULL
      OR public.is_case_owner(case_id, auth.uid())
      OR public.is_case_member(case_id, auth.uid())
    )
  );

CREATE POLICY "Users delete their own extractions"
  ON public.extractions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- case_members: explicit owner-only update policy (previously undefined = blocked)
CREATE POLICY "Owner can update members"
  ON public.case_members
  FOR UPDATE
  TO authenticated
  USING (public.is_case_owner(case_id, auth.uid()))
  WITH CHECK (public.is_case_owner(case_id, auth.uid()));
