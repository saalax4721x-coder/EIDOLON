-- Fix new-user profile creation during Supabase Auth signup.
-- The auth.users trigger runs as the function owner so it can insert into
-- public.profiles despite the table's RLS policies. Keep the function
-- non-callable by API roles; the trigger is the intended entry point.
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
