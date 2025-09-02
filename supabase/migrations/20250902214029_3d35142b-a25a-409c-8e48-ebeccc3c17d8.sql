-- Add send_first_immediately column to campaigns table
ALTER TABLE campaigns ADD COLUMN send_first_immediately boolean DEFAULT true;