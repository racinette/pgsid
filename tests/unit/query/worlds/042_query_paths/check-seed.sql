-- name: path_root
INSERT INTO query_paths(id,label,path,recorded_query,allow_absent) VALUES(2,'root','$'::jsonpath,'$',false);
-- name: path_strict
INSERT INTO query_paths(id,label,path,recorded_query,allow_absent) VALUES(2,'strict field','strict $.a'::jsonpath,'strict $."a"',false);
-- name: path_number
INSERT INTO query_paths(id,label,path,recorded_query,allow_absent) VALUES(2,'normalized number','- -1.2300'::jsonpath,'1.2300',false);
-- name: path_null
INSERT INTO query_paths(id,label,path,recorded_query,allow_absent) VALUES(2,'absent',NULL::jsonpath,NULL,true);
-- name: path_wrong_source
INSERT INTO query_paths(id,label,path,recorded_query,allow_absent) VALUES(2,'wrong source','$'::jsonpath,'$."missing"',false);
-- name: path_wrong_presence
INSERT INTO query_paths(id,label,path,recorded_query,allow_absent) VALUES(2,'wrong presence',NULL::jsonpath,NULL,false);
-- name: choice_primary
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(2,1,'primary','$.a'::jsonpath,'$'::jsonpath,true,'$."a"','$."a"');
-- name: choice_backup
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(2,1,'backup','$.a'::jsonpath,'$'::jsonpath,false,'$','$."a"');
-- name: choice_fallback
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(2,1,'fallback',NULL::jsonpath,'strict $'::jsonpath,false,'strict $','strict $');
-- name: choice_null
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(2,1,'both absent',NULL::jsonpath,NULL::jsonpath,true,NULL,NULL);
-- name: choice_wrong_selected
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(2,1,'wrong choice','$.a'::jsonpath,'$'::jsonpath,false,'$."a"','$."a"');
-- name: choice_wrong_fallback
INSERT INTO query_selections(id,path_id,label,primary_path,backup_path,choose_primary,recorded_choice,recorded_fallback) VALUES(2,1,'wrong fallback','$.a'::jsonpath,'$'::jsonpath,true,'$."a"','$');
-- name: packet_root
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'root','$'::jsonpath,'lax $','$','\x0124'::bytea,1,false);
-- name: packet_normalized
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'number','0xFF'::jsonpath,'0xFF','255','\x01323535'::bytea,1,false);
-- name: packet_null
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'absent',NULL::jsonpath,NULL,NULL,NULL,NULL,false);
-- name: packet_skipped
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'skipped','"雪"'::jsonpath,'(',NULL,NULL,NULL,true);
-- name: packet_wrong_source
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'wrong source','$'::jsonpath,'$','wrong','\x0124'::bytea,1,false);
-- name: packet_wrong_wire
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'wrong wire','$'::jsonpath,'$','$','\xff'::bytea,1,false);
-- name: packet_wrong_version
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'wrong version','$'::jsonpath,'$','$','\x0124'::bytea,2,false);
-- name: packet_invalid_source
INSERT INTO query_packets(id,path_id,label,path,source_text,recorded_query,recorded_wire,recorded_version,bypass) VALUES(2,1,'syntax error','$'::jsonpath,'(',NULL,'\x0124'::bytea,1,false);
