-- Add role column to user_profiles table if it doesn't exist
-- This migration ensures the role column exists and has proper constraints

DO $$
BEGIN
  -- Check if role column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'client';
  END IF;
  
  -- Add check constraint for valid roles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('admin', 'client', 'invited_user'));
  END IF;
END $$;

-- Update any existing users without a role to be 'client'
UPDATE user_profiles 
SET role = 'client' 
WHERE role IS NULL;

-- Make role column NOT NULL after setting defaults
ALTER TABLE user_profiles ALTER COLUMN role SET NOT NULL;

-- Create index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);