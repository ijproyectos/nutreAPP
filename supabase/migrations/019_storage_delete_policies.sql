-- NutrIA — 019: hallazgo del pre-commit-orchestrator sobre la migración
-- 018 — confirmado contra la base en vivo (`select * from pg_policies
-- where tablename='objects'`): ningún bucket del proyecto tenía una
-- policy `for delete` sobre `storage.objects`. El "best-effort cleanup"
-- que varias Server Actions ya hacían cuando un insert falla después de
-- subir un archivo (`enviarMensaje`/`enviarMensajePaciente` en Chat,
-- `subirDocumento` acá) usa el cliente normal (anon key + sesión, sin
-- service role) — sin policy de delete, RLS deniega el `.remove()`
-- SIEMPRE, no solo en el caso raro. El `cleanupError` se loguea y el
-- flujo sigue (no rompe nada visible), pero el archivo queda huérfano
-- en Storage para siempre. No es una fuga de datos, es un gap
-- operativo silencioso.
--
-- Se arregla acá `documentos-paciente` (bucket nuevo de 018, esta app
-- confía en su cleanup) y `chat-adjuntos` (cleanup real ya en
-- producción desde 011, dependía de esto sin saberlo). `laboratorios`
-- no tiene código de limpieza que dependa de un delete (el paciente
-- sube, nadie borra). `profesional-archivos` queda deliberadamente
-- afuera — 012_configuracion_cuenta.sql ya documenta explícito que
-- reemplazar avatar/firma deja el archivo viejo huérfano a propósito,
-- no es un gap, es la decisión tomada en ese momento.
--
-- Mismo predicado que insert/select en cada caso — quien puede escribir
-- en una carpeta puede borrar ahí, no se abre nada nuevo.

create policy documentos_paciente_delete on storage.objects
  for delete using (
    bucket_id = 'documentos-paciente'
    and (storage.foldername(name))[1]::uuid in (
      select id from pacientes where profesional_id = public.auth_profesional_id()
    )
  );

create policy chat_adjuntos_delete_profesional on storage.objects
  for delete using (
    bucket_id = 'chat-adjuntos'
    and (
      (
        (storage.foldername(name))[1] = 'paciente'
        and (storage.foldername(name))[2]::uuid in (
          select id from pacientes where profesional_id = public.auth_profesional_id()
        )
      )
      or (
        (storage.foldername(name))[1] = 'grupo'
        and (storage.foldername(name))[2]::uuid in (
          select id from chat_grupos where profesional_id = public.auth_profesional_id()
        )
      )
    )
  );

create policy chat_adjuntos_delete_paciente on storage.objects
  for delete using (
    bucket_id = 'chat-adjuntos'
    and (
      (
        (storage.foldername(name))[1] = 'paciente'
        and (storage.foldername(name))[2]::uuid = public.auth_paciente_id()
      )
      or (
        (storage.foldername(name))[1] = 'grupo'
        and (storage.foldername(name))[2]::uuid in (
          select grupo_id from chat_grupo_miembros where paciente_id = public.auth_paciente_id()
        )
      )
    )
  );
