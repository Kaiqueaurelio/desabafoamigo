
CREATE OR REPLACE FUNCTION public.my_queue_position()
RETURNS TABLE(
  in_queue boolean,
  queue_id uuid,
  queue_position integer,
  ahead_of_me integer,
  urgency text,
  created_at timestamptz,
  waiting_seconds integer,
  estimated_wait_seconds integer,
  avg_service_seconds integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  me record;
  ahead int;
  avg_service int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT q.id AS id, q.urgency AS urgency, q.created_at AS created_at
    INTO me
    FROM public.queue q
   WHERE q.user_id = uid AND q.status = 'waiting'
   ORDER BY q.created_at DESC
   LIMIT 1;

  IF me.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::int, NULL::int, NULL::text,
                        NULL::timestamptz, NULL::int, NULL::int, NULL::int;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO ahead
    FROM public.queue q
   WHERE q.status = 'waiting'
     AND q.id <> me.id
     AND (
       CASE q.urgency WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
       <
       CASE me.urgency WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
       OR (
         q.urgency = me.urgency AND q.created_at < me.created_at
       )
     );

  SELECT COALESCE(
           AVG(EXTRACT(EPOCH FROM (c.ended_at - c.created_at)))::int,
           480
         )
    INTO avg_service
    FROM (
      SELECT created_at, ended_at
        FROM public.conversations
       WHERE status = 'ended' AND ended_at IS NOT NULL
       ORDER BY ended_at DESC
       LIMIT 20
    ) c;

  IF avg_service < 120 THEN avg_service := 120; END IF;
  IF avg_service > 1800 THEN avg_service := 1800; END IF;

  RETURN QUERY SELECT
    true,
    me.id,
    (ahead + 1)::int,
    ahead::int,
    me.urgency::text,
    me.created_at,
    EXTRACT(EPOCH FROM (now() - me.created_at))::int,
    (ahead * avg_service)::int,
    avg_service::int;
END $$;

REVOKE ALL ON FUNCTION public.my_queue_position() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_queue_position() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_queue_position() TO authenticated;
