-- Run only against isolated QA database, after the two migrations.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE a text;b text;v integer;n integer;
BEGIN
 a:=public.ttxd_write_record('report','SQL-QA-1','encrypted-test-envelope','{"communeCode":"04000","status":"received","source":"demo"}',NULL,NULL,repeat('1',64),repeat('2',64));
 b:=public.ttxd_write_record('report','SQL-QA-2','second-envelope','{"communeCode":"04000","status":"received","source":"demo"}',NULL,NULL,repeat('1',64),repeat('2',64));
 IF a<>b THEN RAISE EXCEPTION 'Replay differed';END IF;
 SELECT count(*) INTO n FROM public.ttxd_reports;IF n<>1 THEN RAISE EXCEPTION 'Replay duplicated';END IF;
 BEGIN
  PERFORM public.ttxd_write_record('report','SQL-QA-3','changed','{}',NULL,NULL,repeat('1',64),repeat('3',64));
  RAISE EXCEPTION 'Conflict incorrectly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'TTXD_IDEMPOTENCY_CONFLICT' THEN RAISE;END IF;END;
 PERFORM public.ttxd_write_record('report','SQL-QA-1','updated-envelope','{"communeCode":"04000","status":"resolved","source":"demo"}',NULL,1,NULL,NULL);
 SELECT version INTO v FROM public.ttxd_record_metadata WHERE kind='report' AND id='SQL-QA-1';IF v<>2 THEN RAISE EXCEPTION 'Version metadata mismatch';END IF;
 BEGIN
  PERFORM public.ttxd_write_record('report','SQL-QA-1','stale-envelope','{}',NULL,1,NULL,NULL);
  RAISE EXCEPTION 'Stale update incorrectly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'TTXD_VERSION_CONFLICT' THEN RAISE;END IF;END;
 SELECT payload INTO a FROM public.ttxd_reports WHERE id='SQL-QA-1';IF a<>'updated-envelope' THEN RAISE EXCEPTION 'Stale update overwrote';END IF;
 IF jsonb_array_length(public.ttxd_analytics_read()->'reports')<>1 THEN RAISE EXCEPTION 'Snapshot count mismatch';END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF has_table_privilege('anon','public.ttxd_inspections','SELECT') OR has_table_privilege('authenticated','public.ttxd_record_metadata','SELECT') OR has_function_privilege('anon','public.ttxd_analytics_read()','EXECUTE') OR has_function_privilege('authenticated','public.ttxd_write_record(text,text,text,jsonb,text,integer,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Public privilege leak';END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relname IN('ttxd_inspections','ttxd_record_metadata','ttxd_idempotency','ttxd_analytics_snapshots') AND NOT relrowsecurity) THEN RAISE EXCEPTION 'Missing RLS';END IF;
END $$;
ROLLBACK;
