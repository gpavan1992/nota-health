
REVOKE EXECUTE ON FUNCTION public.is_case_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_case_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_case_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_case_member(uuid, uuid) TO service_role;
