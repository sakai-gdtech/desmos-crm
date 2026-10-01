ALTER TABLE sales_pipelines ADD COLUMN demo_followup_stage_id uuid;
ALTER TABLE sales_pipelines ADD CONSTRAINT demo_followup_stage_fk
 FOREIGN KEY(tenant_id,id,demo_followup_stage_id) REFERENCES sales_stages(tenant_id,pipeline_id,id);
DO $$ DECLARE tenant uuid; BEGIN
 FOR tenant IN SELECT id FROM tenants LOOP
  PERFORM set_config('app.tenant_id',tenant::text,true);
  UPDATE sales_pipelines p SET demo_followup_stage_id=(
   SELECT s.id FROM sales_stages s WHERE s.tenant_id=p.tenant_id AND s.pipeline_id=p.id
    AND s.name='Proposta' ORDER BY s.position,s.id LIMIT 1
  ) WHERE p.tenant_id=tenant AND p.demo_fixture;
 END LOOP;
 PERFORM set_config('app.tenant_id','',true);
END $$;
