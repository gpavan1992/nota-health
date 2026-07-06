-- Enum for case type
DO $$ BEGIN
  CREATE TYPE public.case_type_enum AS ENUM ('patient', 'department', 'research', 'general');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ cases ============
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  case_ref text,
  case_type public.case_type_enum NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- ============ case_members ============
CREATE TABLE public.case_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  member_email text NOT NULL,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, member_email)
);
CREATE INDEX idx_case_members_email ON public.case_members (lower(member_email));
CREATE INDEX idx_case_members_case ON public.case_members (case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_members TO authenticated;
GRANT ALL ON public.case_members TO service_role;
ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;

-- ============ case_documents ============
CREATE TABLE public.case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_documents_case ON public.case_documents (case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_documents TO authenticated;
GRANT ALL ON public.case_documents TO service_role;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- ============ case_conversations ============
CREATE TABLE public.case_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_conversations_case ON public.case_conversations (case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_conversations TO authenticated;
GRANT ALL ON public.case_conversations TO service_role;
ALTER TABLE public.case_conversations ENABLE ROW LEVEL SECURITY;

-- ============ security definer helpers ============
CREATE OR REPLACE FUNCTION public.is_case_member(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_members cm
    JOIN auth.users u ON lower(u.email) = lower(cm.member_email)
    WHERE cm.case_id = _case_id AND u.id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_case_owner(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases WHERE id = _case_id AND owner_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_case_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_case_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_case_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_case_owner(uuid, uuid) TO authenticated, service_role;

-- ============ Policies: cases ============
CREATE POLICY "Owner or member can view case"
  ON public.cases FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_case_member(id, auth.uid()));

CREATE POLICY "Users can create own cases"
  ON public.cases FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update own case"
  ON public.cases FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can delete own case"
  ON public.cases FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============ Policies: case_members ============
CREATE POLICY "Owner or self can view members"
  ON public.case_members FOR SELECT TO authenticated
  USING (
    public.is_case_owner(case_id, auth.uid())
    OR lower(member_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

CREATE POLICY "Owner can add members"
  ON public.case_members FOR INSERT TO authenticated
  WITH CHECK (public.is_case_owner(case_id, auth.uid()) AND added_by = auth.uid());

CREATE POLICY "Owner can remove members"
  ON public.case_members FOR DELETE TO authenticated
  USING (public.is_case_owner(case_id, auth.uid()));

-- ============ Policies: case_documents ============
CREATE POLICY "Owner or member can view documents"
  ON public.case_documents FOR SELECT TO authenticated
  USING (
    public.is_case_owner(case_id, auth.uid())
    OR public.is_case_member(case_id, auth.uid())
  );

CREATE POLICY "Owner can add documents"
  ON public.case_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_case_owner(case_id, auth.uid()));

CREATE POLICY "Owner can delete documents"
  ON public.case_documents FOR DELETE TO authenticated
  USING (public.is_case_owner(case_id, auth.uid()));

-- ============ Policies: case_conversations ============
CREATE POLICY "Owner or member can view conversations"
  ON public.case_conversations FOR SELECT TO authenticated
  USING (
    public.is_case_owner(case_id, auth.uid())
    OR public.is_case_member(case_id, auth.uid())
  );

CREATE POLICY "Owner can add conversations"
  ON public.case_conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_case_owner(case_id, auth.uid()));

CREATE POLICY "Owner can delete conversations"
  ON public.case_conversations FOR DELETE TO authenticated
  USING (public.is_case_owner(case_id, auth.uid()));

-- ============ Triggers ============
CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
