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
-- name: document_penultimate
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'penultimate element','{"a":[1,2,3],"flag":true}'::jsonb,'$.a[last-1]'::jsonpath,'$.a[last-1]','{}'::jsonb,false,false,true,true,'[2]'::jsonb,'2'::jsonb);
-- name: document_delta
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'numeric delta','{"flag":false}'::jsonb,'$delta+1'::jsonpath,'$delta+1','{"delta":[1]}'::jsonb,false,false,true,false,'[2]'::jsonb,'2'::jsonb);
-- name: document_signed_sequence
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'signed sequence','{"flag":true}'::jsonb,'-$delta'::jsonpath,'-$delta','{"delta":[1,2]}'::jsonb,false,false,true,true,'[-1,-2]'::jsonb,'-1'::jsonb);
-- name: document_signed_prefix
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'signed prefix','{"flag":true}'::jsonb,'-$delta'::jsonpath,'-$delta','{"delta":[1,"x",2]}'::jsonb,true,false,true,true,'[-1]'::jsonb,'-1'::jsonb);
-- name: document_operand_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'uncompleted operand','{"a":[],"flag":true}'::jsonb,'$.a[*]'::jsonpath,'strict -$delta[0,8]','{"delta":[1]}'::jsonb,true,false,false,true,'[]'::jsonb,NULL::jsonb);
-- name: document_arithmetic_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'division by zero','{"flag":true}'::jsonb,'1/0'::jsonpath,'1/0','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_binary_sequence_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'multiple numeric operands','{"flag":true}'::jsonb,'$delta+1'::jsonpath,'$delta+1','{"delta":[1,2]}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_binary_right_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'right operand before left type','{"flag":true}'::jsonb,'true+$missing'::jsonpath,'true+$missing','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_nested_last
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'nested last scopes','{"a":[0,1,2],"i":[1,0],"flag":false}'::jsonb,'$.a[$.i[last] to last]'::jsonpath,'$.a[$.i[last] to last]','{}'::jsonb,false,false,true,false,'[0,1,2]'::jsonb,'0'::jsonb);
-- name: document_wrong_arithmetic
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong arithmetic result','{"flag":false}'::jsonb,'$delta+1'::jsonpath,'$delta+1','{"delta":[1]}'::jsonb,false,false,true,false,'[3]'::jsonb,'2'::jsonb);
-- name: document_filter
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'filtered numbers','{"a":[1,2,3],"flag":true}'::jsonb,'$.a?(@>1)'::jsonpath,'$.a?(@>1)','{}'::jsonb,false,false,true,true,'[2,3]'::jsonb,'2'::jsonb);
-- name: document_filter_none
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'no matching number','{"a":[1],"flag":false}'::jsonb,'$.a?(@>1)'::jsonpath,'$.a?(@>1)','{}'::jsonb,false,false,false,false,'[]'::jsonb,NULL::jsonb);
-- name: document_filter_variable
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'variable filter','{"a":[1,2,3],"flag":true}'::jsonb,'$.a?(@>$limit)'::jsonpath,'$.a?(@>$limit)','{"limit":2}'::jsonb,false,false,true,true,'[3]'::jsonb,'3'::jsonb);
-- name: document_predicate_unknown
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'known unknown predicate','{"flag":true}'::jsonb,'1=="x"'::jsonpath,'1=="x"','{}'::jsonb,false,false,true,true,'[null]'::jsonb,'null'::jsonb);
-- name: document_predicate_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'suppressed predicate error','{"flag":true}'::jsonb,'strict $.missing==1'::jsonpath,'strict $.missing==1','{}'::jsonb,false,false,true,true,'[null]'::jsonb,'null'::jsonb);
-- name: document_predicate_skip
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'lazy true predicate','{"flag":false}'::jsonb,'(1==1) || exists($missing)'::jsonpath,'(1==1) || exists($missing)','{}'::jsonb,false,false,true,false,'[true]'::jsonb,'true'::jsonb);
-- name: document_nested_filter
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'nested current scopes','{"a":[{"values":[1,2],"keep":true},{"values":[1],"keep":true},{"values":[3],"keep":false}],"flag":true}'::jsonb,'$.a?(exists(@.values?(@>1)) && @.keep==true).values'::jsonpath,'$.a?(exists(@.values?(@>1)) && @.keep==true).values','{}'::jsonb,false,false,true,true,'[[1,2]]'::jsonb,'[1,2]'::jsonb);
-- name: document_starts_with
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'prefix match','{"a":["abc","xyz","abd"],"flag":true}'::jsonb,'$.a?(@ starts with "ab")'::jsonpath,'$.a?(@ starts with "ab")','{}'::jsonb,false,false,true,true,'["abc","abd"]'::jsonb,'"abc"'::jsonb);
-- name: document_filter_wrong_results
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong filtered numbers','{"a":[1,2,3],"flag":true}'::jsonb,'$.a?(@>1)'::jsonpath,'$.a?(@>1)','{}'::jsonb,false,false,true,true,'[1,2,3]'::jsonb,'2'::jsonb);
-- name: document_filter_missing_variable
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'missing filter variable','{"a":[1,2],"flag":true}'::jsonb,'$.a?(@==$missing)'::jsonpath,'$.a?(@==$missing)','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_type
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'array type','{"a":[1,2],"flag":true}'::jsonb,'$.a.type()'::jsonpath,'$.a.type()','{}'::jsonb,false,false,true,true,'["array"]'::jsonb,'"array"'::jsonb);
-- name: document_size
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'array size','{"a":[1,2,3],"flag":true}'::jsonb,'$.a.size()'::jsonpath,'$.a.size()','{}'::jsonb,false,false,true,true,'[3]'::jsonb,'3'::jsonb);
-- name: document_numeric_methods
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'numeric filter and magnitude','{"a":[1,"x",-2.5],"flag":true}'::jsonb,'$.a?(@.type()=="number").abs()'::jsonpath,'$.a?(@.type()=="number").abs()','{}'::jsonb,false,false,true,true,'[1,2.5]'::jsonb,'1'::jsonb);
-- name: document_method_prefix
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'method silent prefix','{"a":[1,"x",2],"flag":true}'::jsonb,'$.a.abs()'::jsonpath,'$.a.abs()','{}'::jsonb,true,false,true,true,'[1]'::jsonb,'1'::jsonb);
-- name: document_double_number
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'retain decimal number','{"a":1.234567890123456789,"flag":true}'::jsonb,'$.a.double()'::jsonpath,'$.a.double()','{}'::jsonb,false,false,true,true,'[1.234567890123456789]'::jsonb,'1.234567890123456789'::jsonb);
-- name: document_double_string
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'convert decimal string','{"a":"1.234567890123456789","flag":true}'::jsonb,'$.a.double()'::jsonpath,'$.a.double()','{}'::jsonb,false,false,true,true,'[1.23456789012346]'::jsonb,'1.23456789012346'::jsonb);
-- name: document_method_original_source
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'original method grouping','{"a":1,"flag":true}'::jsonb,'$.a.abs()'::jsonpath,'(-2+3).abs()','{}'::jsonb,false,false,true,true,'[1]'::jsonb,'1'::jsonb);
-- name: document_method_wrong_size
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong method result','{"a":[1,2,3],"flag":true}'::jsonb,'$.a.size()'::jsonpath,'$.a.size()','{}'::jsonb,false,false,true,true,'[2]'::jsonb,'3'::jsonb);
-- name: document_method_type_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'non-numeric magnitude','{"a":false,"flag":true}'::jsonb,'$.a.abs()'::jsonpath,'$.a.abs()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_method_float_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'float range error','{"a":1e309,"flag":true}'::jsonb,'$.a.double()'::jsonpath,'$.a.double()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_integer_round
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'integer round','{"a":1.5,"flag":true}'::jsonb,'$.a.integer()'::jsonpath,'$.a.integer()','{}'::jsonb,false,false,true,true,'[2]'::jsonb,'2'::jsonb);
-- name: document_bigint_string
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'bigint string','{"a":"-9223372036854775808","flag":true}'::jsonb,'$.a.bigint()'::jsonpath,'$.a.bigint()','{}'::jsonb,false,false,true,true,'[-9223372036854775808]'::jsonb,'-9223372036854775808'::jsonb);
-- name: document_boolean_string
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'boolean string','{"a":"of","flag":true}'::jsonb,'$.a.boolean()'::jsonpath,'$.a.boolean()','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'false'::jsonb);
-- name: document_number_string
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'number string','{"a":"001.2300","flag":true}'::jsonb,'$.a.number()'::jsonpath,'$.a.number()','{}'::jsonb,false,false,true,true,'[1.2300]'::jsonb,'1.2300'::jsonb);
-- name: document_decimal_round
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'decimal round','{"a":"12.345","flag":true}'::jsonb,'$.a.decimal(4,2)'::jsonpath,'$.a.decimal(4,2)','{}'::jsonb,false,false,true,true,'[12.35]'::jsonb,'12.35'::jsonb);
-- name: document_decimal_negative_scale
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'decimal negative scale','{"a":1234,"flag":true}'::jsonb,'$.a.decimal(3,-1)'::jsonpath,'$.a.decimal(3,-1)','{}'::jsonb,false,false,true,true,'[1230]'::jsonb,'1230'::jsonb);
-- name: document_string_chain
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'string chain','{"a":"001.2300","flag":true}'::jsonb,'$.a.number().string()'::jsonpath,'$.a.number().string()','{}'::jsonb,false,false,true,true,'["1.2300"]'::jsonb,'"1.2300"'::jsonb);
-- name: document_string_predicate
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'string predicate','{"a":12,"flag":true}'::jsonb,'$.a.string() starts with "1"'::jsonpath,'$.a.string() starts with "1"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_conversion_prefix
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'conversion prefix','{"a":[1,"bad",2],"flag":true}'::jsonb,'$.a.integer()'::jsonpath,'$.a.integer()','{}'::jsonb,true,false,true,true,'[1]'::jsonb,'1'::jsonb);
-- name: document_conversion_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'conversion wrong result','{"a":1.5,"flag":true}'::jsonb,'$.a.integer()'::jsonpath,'$.a.integer()','{}'::jsonb,false,false,true,true,'[1]'::jsonb,'2'::jsonb);
-- name: document_integer_string_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'integer string error','{"a":"1.5","flag":true}'::jsonb,'$.a.integer()'::jsonpath,'$.a.integer()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_boolean_fraction_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'boolean fraction error','{"a":1.0,"flag":true}'::jsonb,'$.a.boolean()'::jsonpath,'$.a.boolean()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_decimal_range_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'decimal range error','{"a":12.345,"flag":true}'::jsonb,'$.a.decimal(3,2)'::jsonpath,'$.a.decimal(3,2)','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_decimal_argument_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'decimal argument error','{"a":1,"flag":true}'::jsonb,'$.a.decimal(0)'::jsonpath,'$.a.decimal(0)','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_string_null_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'string null error','{"a":null,"flag":true}'::jsonb,'$.a.string()'::jsonpath,'$.a.string()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
