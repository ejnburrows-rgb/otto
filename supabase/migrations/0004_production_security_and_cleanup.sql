-- Production hardening and deterministic default-record cleanup.

-- Make built-in templates converge across every device.
delete from public.workflows
where data->>'name' in ('New Service Call', 'Job Completed');

insert into public.workflows (id, data, updated_at) values
('workflow-new-service-call-v1', jsonb_build_object(
  'id','workflow-new-service-call-v1','name','New Service Call','name_es','Nueva Llamada de Servicio','trigger','call','template',true,
  'steps',jsonb_build_array('Create/confirm customer','Create job','Schedule visit','Assign field worker','Notify office'),
  'steps_es',jsonb_build_array('Crear/confirmar cliente','Crear trabajo','Agendar visita','Asignar trabajador','Notificar oficina'),
  'created',now()::text,'updated',now()::text), now()),
('workflow-job-completed-v1', jsonb_build_object(
  'id','workflow-job-completed-v1','name','Job Completed','name_es','Trabajo Completado','trigger','job_completed','template',true,
  'steps',jsonb_build_array('Upload final photos','Create invoice','Send invoice to customer','Create follow-up in 7 days'),
  'steps_es',jsonb_build_array('Subir fotos finales','Crear factura','Enviar factura al cliente','Crear seguimiento en 7 días'),
  'created',now()::text,'updated',now()::text), now())
on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

delete from public.sops
where data->>'title' in ('Water heater replacement', 'Sewer camera inspection');

insert into public.sops (id, data, updated_at) values
('sop-water-heater-replacement-v1', jsonb_build_object(
  'id','sop-water-heater-replacement-v1','title','Water heater replacement','title_es','Reemplazo de calentador de agua','category','Install',
  'body','Shut off water and gas/power. Drain tank. Disconnect lines. Remove old unit. Set new unit level. Connect water, T&P valve, gas/electric. Fill, purge air, check for leaks. Light/energize. Photograph finished install for the job folder.',
  'body_es','Cierre el agua y gas/electricidad. Drene el tanque. Desconecte líneas. Retire la unidad vieja. Nivele la nueva. Conecte agua, válvula T&P, gas/electricidad. Llene, purgue aire, revise fugas. Encienda. Tome foto de la instalación terminada para la carpeta.',
  'created',now()::text,'updated',now()::text), now()),
('sop-sewer-camera-inspection-v1', jsonb_build_object(
  'id','sop-sewer-camera-inspection-v1','title','Sewer camera inspection','title_es','Inspección con cámara de drenaje','category','Diagnostic',
  'body','Locate cleanout. Insert camera, record footage. Note distance to any blockage or break. Save video/photos to the job folder. Recommend hydro-jet or repair as needed and create an estimate.',
  'body_es','Ubique el registro. Inserte la cámara, grabe. Anote la distancia a obstrucciones o roturas. Guarde video/fotos en la carpeta del trabajo. Recomiende hydro-jet o reparación y cree un presupuesto.',
  'created',now()::text,'updated',now()::text), now())
on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

-- Remove the verified false restore alert and the public-signup orphan.
delete from public.alerts where id = 'al_mspx4n7y4kyc2';
delete from auth.users where lower(email) = 'ejnrcg@yahoo.com';

-- Private storage remains service-role-only and rejects oversized or obviously
-- executable uploads. The API relay applies an additional filename/type check.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
      'application/pdf','application/json','application/octet-stream','text/plain','text/csv',
      'application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/dxf','application/x-dxf','image/vnd.dwg','application/acad','application/x-acad','application/dwg',
      'model/vnd.dwf','application/vnd.dgn'
    ]::text[]
where id = 'job-photos';

-- Defense in depth: direct browser roles are explicitly denied on every
-- document-store table. The server-side service role bypasses RLS as intended.
do $$
declare table_name text;
begin
  for table_name in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists deny_direct_client_access on public.%I', table_name);
    execute format('create policy deny_direct_client_access on public.%I as restrictive for all to anon, authenticated using (false) with check (false)', table_name);
  end loop;
end $$;
