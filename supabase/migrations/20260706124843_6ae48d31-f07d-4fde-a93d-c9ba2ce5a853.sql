
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS openai_api_key text,
  ADD COLUMN IF NOT EXISTS google_api_key text,
  ADD COLUMN IF NOT EXISTS ai_model_secondary text,
  ADD COLUMN IF NOT EXISTS auto_signout_hours integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{"drug_interactions":true,"pubmed_citations":true,"autosave_to_cases":false}'::jsonb;
