-- First, let's see what the current primary key is and drop it if it's not user_id
-- Then make user_id the primary key if it isn't already
DO $$ 
BEGIN
    -- Check if user_id is already the primary key
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_name = 'google_tokens' 
        AND tc.constraint_type = 'PRIMARY KEY' 
        AND kcu.column_name = 'user_id'
    ) THEN
        -- Drop existing primary key if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE table_name = 'google_tokens' 
            AND constraint_type = 'PRIMARY KEY'
        ) THEN
            ALTER TABLE public.google_tokens DROP CONSTRAINT google_tokens_pkey;
        END IF;
        
        -- Add user_id as primary key
        ALTER TABLE public.google_tokens ADD PRIMARY KEY (user_id);
    END IF;
END $$;

-- Add service role full access policy
CREATE POLICY "service role full access" 
ON public.google_tokens 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);