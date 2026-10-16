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
-- name: document_flags
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'selected flags','{"a":[true,false],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,true,true,'[true,false]'::jsonb,'true'::jsonb);
-- name: document_empty
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'empty array','{"a":[],"flag":false}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,false,false,'[]'::jsonb,NULL::jsonb);
-- name: document_null
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'absent document',NULL::jsonb,'$'::jsonpath,'$','{}'::jsonb,false,false,NULL,NULL,NULL::jsonb,NULL::jsonb);
-- name: document_silent_prefix
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'silent prefix','{"a":[true],"flag":true}'::jsonb,'strict $.a[0,8]'::jsonpath,'strict $.a[0,8]','{}'::jsonb,true,false,NULL,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_variable
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'variable selection','{"flag":false}'::jsonb,'$selection[*]'::jsonpath,'$selection[*]','{"selection":[1,2]}'::jsonb,false,false,true,false,'[1,2]'::jsonb,'1'::jsonb);
-- name: document_bypassed_source
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unreached invalid source','{"a":[true],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'(','{}'::jsonb,false,true,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_wrong_exists
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong existence','{"a":[true],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,false,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_wrong_match
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong flag','{"a":[true],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,true,false,'[true]'::jsonb,'true'::jsonb);
-- name: document_wrong_results
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong results','{"a":[true,false],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,true,true,'[false,true]'::jsonb,'true'::jsonb);
-- name: document_wrong_first
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong first','{"a":[true,false],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'$.a[*]','{}'::jsonb,false,false,true,true,'[true,false]'::jsonb,'false'::jsonb);
-- name: document_strict_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'strict missing member','{"flag":true}'::jsonb,'strict $.missing'::jsonpath,'strict $.missing','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_variable_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'missing variable','{"flag":true}'::jsonb,'$missing'::jsonpath,'$missing','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_vars_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid variable container','{"flag":true}'::jsonb,'$'::jsonpath,'$','[]'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_source_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'reached invalid source','{"a":[true],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'(','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
