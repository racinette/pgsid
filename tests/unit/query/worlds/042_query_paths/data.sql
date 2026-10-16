INSERT INTO query_paths VALUES(1,'record field','$.a'::jsonpath,'$."a"',false);
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(1,1,'fallback',NULL::jsonpath,'$'::jsonpath,false,'$','$');
INSERT INTO query_packets VALUES(1,1,'root packet','$'::jsonpath,'lax $','$','\x0124'::bytea,1,false);
INSERT INTO query_documents VALUES(1,1,'selected flags','{"a":[true,false],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,true,true,'[true,false]'::jsonb,'true'::jsonb);
INSERT INTO query_clock_rules VALUES(1,1,'local clock equality','"12:34:56+03:00"'::jsonb,'$.time()=="12:34:56".time()'::jsonpath,'$.time()=="12:34:56".time()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
