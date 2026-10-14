-- Additive, private server-only analytical metadata; encrypted payload format remains unchanged.
CREATE TABLE public.ttxd_inspections(id text PRIMARY KEY,payload text NOT NULL,version integer NOT NULL DEFAULT 1);
CREATE TABLE public.ttxd_record_metadata(kind text NOT NULL CHECK(kind IN('permit','report','inspection')),id text NOT NULL,metadata jsonb NOT NULL,version integer NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE public.ttxd_idempotency(key text PRIMARY KEY,digest text NOT NULL,kind text NOT NULL,id text NOT NULL);
CREATE TABLE public.ttxd_analytics_snapshots(id text PRIMARY KEY,payload text NOT NULL,expires bigint NOT NULL);
CREATE INDEX ttxd_metadata_commune ON public.ttxd_record_metadata((metadata->>'communeCode'));
CREATE INDEX ttxd_metadata_created ON public.ttxd_record_metadata((metadata->>'createdAt'));
CREATE INDEX ttxd_metadata_source ON public.ttxd_record_metadata((metadata->>'source'));
ALTER TABLE public.ttxd_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttxd_record_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttxd_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttxd_analytics_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttxd_inspections,public.ttxd_record_metadata,public.ttxd_idempotency,public.ttxd_analytics_snapshots FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.ttxd_inspections,public.ttxd_record_metadata,public.ttxd_idempotency,public.ttxd_analytics_snapshots TO service_role;
CREATE FUNCTION public.ttxd_write_record(p_kind text,p_id text,p_payload text,p_metadata jsonb,p_duplicate text DEFAULT NULL,p_expected integer DEFAULT NULL,p_key text DEFAULT NULL,p_digest text DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_table text;v_row record;v_payload text;v_version integer;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN('permit','report','inspection') OR p_id IS NULL OR p_payload IS NULL OR p_metadata IS NULL THEN RAISE EXCEPTION 'Invalid record'; END IF;
 v_table:=CASE p_kind WHEN 'permit' THEN 'ttxd_permits' WHEN 'report' THEN 'ttxd_reports' ELSE 'ttxd_inspections' END;
 IF p_key IS NOT NULL THEN
  IF p_digest IS NULL OR p_key !~ '^[0-9a-f]{64}$' OR p_digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid idempotency'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key,0));
  SELECT * INTO v_row FROM public.ttxd_idempotency WHERE key=p_key;
  IF FOUND THEN
   IF v_row.digest<>p_digest OR v_row.kind<>p_kind THEN RAISE EXCEPTION 'TTXD_IDEMPOTENCY_CONFLICT'; END IF;
   EXECUTE pg_catalog.format('SELECT payload FROM public.%I WHERE id=$1',v_table) INTO v_payload USING v_row.id;
   IF v_payload IS NULL THEN RAISE EXCEPTION 'Missing replay payload';END IF;
   RETURN v_payload;
  END IF;
 END IF;
 IF p_expected IS NOT NULL THEN
  IF p_expected<1 THEN RAISE EXCEPTION 'Invalid update';END IF;
  EXECUTE pg_catalog.format('SELECT payload FROM public.%I WHERE id=$1 FOR UPDATE',v_table) INTO v_payload USING p_id;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'TTXD_NOT_FOUND';END IF;
  SELECT version INTO v_version FROM public.ttxd_record_metadata WHERE kind=p_kind AND id=p_id;
  IF coalesce(v_version,1)<>p_expected THEN RAISE EXCEPTION 'TTXD_VERSION_CONFLICT';END IF;
  EXECUTE pg_catalog.format('UPDATE public.%I SET payload=$1 WHERE id=$2',v_table) USING p_payload,p_id;
  v_version:=p_expected+1;
 ELSE
  IF p_kind='permit' THEN INSERT INTO public.ttxd_permits(id,duplicate_key,payload) VALUES(p_id,p_duplicate,p_payload);
  ELSIF p_kind='report' THEN INSERT INTO public.ttxd_reports(id,payload) VALUES(p_id,p_payload);
  ELSE INSERT INTO public.ttxd_inspections(id,payload) VALUES(p_id,p_payload);END IF;
  v_version:=1;
 END IF;
 INSERT INTO public.ttxd_record_metadata(kind,id,metadata,version) VALUES(p_kind,p_id,p_metadata,v_version) ON CONFLICT(kind,id) DO UPDATE SET metadata=excluded.metadata,version=excluded.version;
 IF p_key IS NOT NULL THEN INSERT INTO public.ttxd_idempotency(key,digest,kind,id) VALUES(p_key,p_digest,p_kind,p_id);END IF;
 RETURN p_payload;
END;
$$;
REVOKE ALL ON FUNCTION public.ttxd_write_record(text,text,text,jsonb,text,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ttxd_write_record(text,text,text,jsonb,text,integer,text,text) TO service_role;

CREATE FUNCTION public.ttxd_analytics_read() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 SELECT pg_catalog.jsonb_build_object('permits',coalesce((SELECT jsonb_agg(payload) FROM public.ttxd_permits),'[]'::jsonb),'reports',coalesce((SELECT jsonb_agg(payload) FROM public.ttxd_reports),'[]'::jsonb),'inspections',coalesce((SELECT jsonb_agg(payload) FROM public.ttxd_inspections),'[]'::jsonb)) INTO result;
 IF pg_catalog.jsonb_array_length(result->'permits')+pg_catalog.jsonb_array_length(result->'reports')+pg_catalog.jsonb_array_length(result->'inspections')>10000 THEN RAISE EXCEPTION 'TTXD_ANALYTICS_LIMIT';END IF;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.ttxd_analytics_read() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ttxd_analytics_read() TO service_role;
