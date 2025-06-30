/*
  # Add status column to workspace_members table

  1. Changes
    - Add status column to workspace_members table with default value 'active'
    - Update existing records to have 'active' status
    - Add check constraint for valid status values

  2. Security
    - No changes to RLS policies needed
*/

-- Add status column to workspace_members table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE workspace_members ADD COLUMN status text DEFAULT 'active' NOT NULL;
        
        -- Add check constraint for valid status values
        ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_status_check 
        CHECK (status IN ('active', 'inactive', 'pending'));
        
        -- Update any existing records to have 'active' status
        UPDATE workspace_members SET status = 'active' WHERE status IS NULL;
    END IF;
END $$;