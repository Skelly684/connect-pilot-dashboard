-- Delete orphaned emails (emails for leads that don't exist)
DELETE FROM email_outbox
WHERE lead_id NOT IN (SELECT id FROM leads);