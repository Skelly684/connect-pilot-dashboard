-- Add is_blocked column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;

-- Add index for faster lookups
CREATE INDEX idx_profiles_is_blocked ON public.profiles(is_blocked) WHERE is_blocked = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_blocked IS 'When true, user account is temporarily blocked from accessing the application';