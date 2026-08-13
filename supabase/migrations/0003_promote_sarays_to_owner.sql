-- Sarays is one of OTTO Plumbing's four full administrators.
-- Authorization is read from the server-controlled users.data record.
update public.users
set data = jsonb_set(
      jsonb_set(coalesce(data, '{}'::jsonb), '{role}', '"owner"'::jsonb, true),
      '{active}', 'true'::jsonb, true
    ),
    updated_at = now()
where id = 'ops-1';
