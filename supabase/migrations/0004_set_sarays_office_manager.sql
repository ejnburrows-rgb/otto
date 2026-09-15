-- Sarays is OTTO Plumbing's office manager.
-- Authorization is read from the server-controlled users.data record.
update public.users
set data = jsonb_set(
      jsonb_set(coalesce(data, '{}'::jsonb), '{role}', '"office"'::jsonb, true),
      '{active}', 'true'::jsonb, true
    ),
    updated_at = now()
where id = 'ops-1';
