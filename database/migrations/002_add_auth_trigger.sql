-- Migration: Create trigger to automatically create user profile on auth
-- This runs when a new user signs up via Supabase Auth

-- Create function that inserts profile into users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Extract first name from user_metadata if available (Google OAuth)
    COALESCE(NEW.raw_user_meta_data->>'given_name', NEW.raw_user_meta_data->>'first_name', ''),
    -- Extract last name from user_metadata if available (Google OAuth)
    COALESCE(NEW.raw_user_meta_data->>'family_name', NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This automatically creates a profile when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix: Allow users to insert their own profile (for API auto-creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Fix: Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: For existing users without profiles, run:
-- INSERT INTO public.users (id, email, first_name, last_name)
-- SELECT 
--   id, 
--   email,
--   COALESCE(raw_user_meta_data->>'given_name', raw_user_meta_data->>'first_name', ''),
--   COALESCE(raw_user_meta_data->>'family_name', raw_user_meta_data->>'last_name', '')
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.users);
