-- Field Notice ID Format Constraint Migration
-- ============================================
-- 
-- This migration adds a CHECK constraint to ensure all Field Notice IDs
-- follow the required format: FN + exactly 5 digits (e.g., FN12345)
--
-- IMPORTANT: FN00000 is reserved as an invalid marker and should be rejected
--
-- Run this migration against your PostgreSQL database:
--   psql -d cisco_sre_dashboard -f 0001_field_notice_format_constraint.sql
--
-- Or through Docker:
--   docker exec -i cisco-sre-dashboard-postgres psql -U postgres -d cisco_sre_dashboard < migrations/0001_field_notice_format_constraint.sql

-- Step 1: Create a function to validate Field Notice ID format
CREATE OR REPLACE FUNCTION is_valid_field_notice_id(fn_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the ID matches the pattern FN + exactly 5 digits (excluding FN00000)
    RETURN fn_id IS NOT NULL 
        AND fn_id ~ '^FN[0-9]{5}$' 
        AND fn_id != 'FN00000';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Add CHECK constraint to the field_notice_records table
-- First, we need to clean up any existing invalid data

-- Create a temporary table to store records that need fixing
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Count invalid records
    SELECT COUNT(*) INTO invalid_count
    FROM field_notice_records
    WHERE NOT is_valid_field_notice_id(field_notice_id);
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % records with invalid Field Notice IDs', invalid_count;
        
        -- Log invalid records before modification
        CREATE TEMP TABLE IF NOT EXISTS invalid_fn_records AS
        SELECT id, field_notice_id, customer_name, created_at
        FROM field_notice_records
        WHERE NOT is_valid_field_notice_id(field_notice_id);
        
        RAISE NOTICE 'Invalid records logged to temp table invalid_fn_records';
    END IF;
END $$;

-- Step 3: Update invalid Field Notice IDs to a valid format where possible
UPDATE field_notice_records
SET field_notice_id = 
    CASE 
        -- If it has digits, extract and format them
        WHEN field_notice_id ~ '[0-9]+' THEN
            'FN' || LPAD(
                CASE 
                    WHEN (regexp_replace(field_notice_id, '[^0-9]', '', 'g'))::INTEGER > 99999 
                    THEN '99999'
                    WHEN (regexp_replace(field_notice_id, '[^0-9]', '', 'g'))::INTEGER < 1
                    THEN '00001'
                    ELSE (regexp_replace(field_notice_id, '[^0-9]', '', 'g'))::INTEGER::TEXT
                END, 
                5, '0'
            )
        -- If no digits, mark for manual review (this will fail constraint - intentional)
        ELSE field_notice_id
    END
WHERE NOT is_valid_field_notice_id(field_notice_id)
AND field_notice_id ~ '[0-9]+';

-- Step 4: Delete records that cannot be fixed (no valid digits)
-- COMMENTED OUT for safety - uncomment if you want to auto-delete
-- DELETE FROM field_notice_records
-- WHERE NOT is_valid_field_notice_id(field_notice_id);

-- Step 5: Add the CHECK constraint (will fail if invalid data remains)
-- First, drop if exists (for re-running the migration)
ALTER TABLE field_notice_records 
DROP CONSTRAINT IF EXISTS chk_field_notice_id_format;

-- Add the constraint
ALTER TABLE field_notice_records
ADD CONSTRAINT chk_field_notice_id_format 
CHECK (is_valid_field_notice_id(field_notice_id));

-- Step 6: Create an index for better performance on Field Notice ID queries
DROP INDEX IF EXISTS idx_field_notice_id_format;
CREATE INDEX idx_field_notice_id_format ON field_notice_records (field_notice_id)
WHERE is_valid_field_notice_id(field_notice_id);

-- Step 7: Add a comment documenting the constraint
COMMENT ON CONSTRAINT chk_field_notice_id_format ON field_notice_records IS 
'Ensures Field Notice ID follows format: FN + exactly 5 digits (FN00001-FN99999). FN00000 is reserved.';

-- Verification query
DO $$
DECLARE
    constraint_exists BOOLEAN;
    invalid_remaining INTEGER;
BEGIN
    -- Check if constraint was added
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_field_notice_id_format'
        AND table_name = 'field_notice_records'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'SUCCESS: Field Notice ID format constraint added successfully';
    ELSE
        RAISE WARNING 'FAILED: Constraint was not added';
    END IF;
    
    -- Final check for any remaining invalid IDs
    SELECT COUNT(*) INTO invalid_remaining
    FROM field_notice_records
    WHERE NOT is_valid_field_notice_id(field_notice_id);
    
    IF invalid_remaining > 0 THEN
        RAISE WARNING 'WARNING: % records still have invalid Field Notice IDs', invalid_remaining;
    ELSE
        RAISE NOTICE 'SUCCESS: All Field Notice IDs are now valid';
    END IF;
END $$;
