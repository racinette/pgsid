INSERT INTO query_paths VALUES(1,'record field','$.a'::jsonpath,'$."a"',false);
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(1,1,'fallback',NULL::jsonpath,'$'::jsonpath,false,'$','$');
INSERT INTO query_packets VALUES(1,1,'root packet','$'::jsonpath,'lax $','$','\x0124'::bytea,1,false);
INSERT INTO query_documents VALUES(1,1,'selected flags','{"a":[true,false],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,true,true,'[true,false]'::jsonb,'true'::jsonb);
