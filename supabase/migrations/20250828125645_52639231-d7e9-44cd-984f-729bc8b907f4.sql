-- Fix security warning: set search_path for the function
create or replace function set_updated_at()
returns trigger 
language plpgsql 
security definer 
set search_path = public
as $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;