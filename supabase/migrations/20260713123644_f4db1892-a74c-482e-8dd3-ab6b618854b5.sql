ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ollama_base_url text,
  ADD COLUMN IF NOT EXISTS ollama_api_key text;