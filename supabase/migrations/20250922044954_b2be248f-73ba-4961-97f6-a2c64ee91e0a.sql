-- Make idem_key unique when present (needed for PostgREST on_conflict="idem_key")
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_idem_key_uniq
ON email_logs (idem_key)
WHERE idem_key IS NOT NULL;