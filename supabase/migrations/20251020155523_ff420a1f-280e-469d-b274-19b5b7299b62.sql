-- Add INSERT policy for email templates
CREATE POLICY "Users can create their own templates"
ON email_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for email templates
CREATE POLICY "Users can update their own templates"
ON email_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for email templates
CREATE POLICY "Users can delete their own templates"
ON email_templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);