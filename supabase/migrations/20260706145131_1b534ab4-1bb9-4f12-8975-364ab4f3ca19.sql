CREATE TABLE public.mcp_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  bearer_token text,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_connectors TO authenticated;
GRANT ALL ON public.mcp_connectors TO service_role;
ALTER TABLE public.mcp_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_mcp_select" ON public.mcp_connectors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_mcp_insert" ON public.mcp_connectors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_mcp_update" ON public.mcp_connectors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_mcp_delete" ON public.mcp_connectors FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX mcp_connectors_user_idx ON public.mcp_connectors(user_id, created_at DESC);
CREATE TRIGGER mcp_connectors_updated
  BEFORE UPDATE ON public.mcp_connectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();