-- Atomically claim a waiting queue entry and create its appointment/conversation.
-- All writes run in one transaction: a failure rolls back the claim and related rows.
create or replace function public.claim_queue_entry(_queue_id uuid)
returns table (user_id uuid, appointment_id uuid, conversation_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_patient uuid;
  v_topic text;
  v_appointment uuid;
  v_conversation uuid;
begin
  if v_actor is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;

  if not (
    coalesce(public.has_role(v_actor, 'volunteer'::public.app_role), false)
    or coalesce(public.has_role(v_actor, 'admin'::public.app_role), false)
  ) then
    raise exception 'Somente voluntários ou administradores podem assumir a fila'
      using errcode = '42501';
  end if;

  -- The conditional UPDATE is the concurrency lock: only one caller can claim
  -- a row while it is still waiting. Qualify returned columns to avoid clashes
  -- with PL/pgSQL OUT parameters (user_id).
  update public.queue as q
     set status = 'matched',
         matched_volunteer_id = v_actor,
         updated_at = now()
   where q.id = _queue_id
     and q.status = 'waiting'
  returning q.user_id, q.topic into v_patient, v_topic;

  if not found then
    raise exception 'Entrada indisponível ou já assumida por outra pessoa'
      using errcode = 'P0002';
  end if;

  insert into public.appointments (
    patient_id, professional_id, scheduled_at, topic, status
  ) values (
    v_patient, v_actor, now(), coalesce(nullif(v_topic, ''), 'Conversa rápida'), 'in_progress'
  )
  returning id into v_appointment;

  insert into public.conversations (
    user_id, volunteer_id, appointment_id, status
  ) values (
    v_patient, v_actor, v_appointment, 'active'
  )
  returning id into v_conversation;

  update public.appointments
     set conversation_id = v_conversation
   where id = v_appointment;

  update public.queue
     set conversation_id = v_conversation,
         updated_at = now()
   where id = _queue_id;

  return query select v_patient, v_appointment, v_conversation;
end;
$$;

revoke all on function public.claim_queue_entry(uuid) from public, anon;
grant execute on function public.claim_queue_entry(uuid) to authenticated;