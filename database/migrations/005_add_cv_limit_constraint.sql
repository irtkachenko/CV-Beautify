-- Add constraint to limit users to 5 generated CVs
-- This migration adds a check constraint and a function to enforce the limit

-- Function to check if user has reached their CV generation limit
CREATE OR REPLACE FUNCTION check_cv_generation_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Count existing CVs for this user (excluding the one being inserted)
    DECLARE
        cv_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO cv_count
        FROM generated_cvs
        WHERE user_id = NEW.user_id;
        
        -- If user already has 5 or more CVs, raise an error
        IF cv_count >= 5 THEN
            RAISE EXCEPTION 'User has reached the maximum limit of 5 generated CVs';
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit
DROP TRIGGER IF EXISTS enforce_cv_generation_limit ON generated_cvs;
CREATE TRIGGER enforce_cv_generation_limit
    BEFORE INSERT ON generated_cvs
    FOR EACH ROW
    EXECUTE FUNCTION check_cv_generation_limit();

-- Add a helpful comment for documentation
COMMENT ON FUNCTION check_cv_generation_limit() IS 'Enforces the limit of 5 generated CVs per user';
COMMENT ON TRIGGER enforce_cv_generation_limit ON generated_cvs IS 'Trigger that prevents users from creating more than 5 CVs';
