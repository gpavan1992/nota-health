ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS title_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_locked   boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.chat_title_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  raw_output text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_title_generation_logs TO authenticated;
GRANT ALL ON public.chat_title_generation_logs TO service_role;

ALTER TABLE public.chat_title_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own title logs read"
  ON public.chat_title_generation_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own title logs write"
  ON public.chat_title_generation_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);