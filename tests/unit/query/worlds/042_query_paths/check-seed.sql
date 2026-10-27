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
-- name: document_keyvalue_object
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue object','{"a":{"x":1,"yy":true},"flag":true}'::jsonb,'$.a.keyvalue()'::jsonpath,'$.a.keyvalue()','{}'::jsonb,false,false,true,true,'[{"id": 28, "key": "x", "value": 1}, {"id": 28, "key": "yy", "value": true}]'::jsonb,'{"id": 28, "key": "x", "value": 1}'::jsonb);
-- name: document_keyvalue_keys
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue keys','{"a":{"x":1,"yy":true},"flag":true}'::jsonb,'$.a.keyvalue().key'::jsonpath,'$.a.keyvalue().key','{}'::jsonb,false,false,true,true,'["x", "yy"]'::jsonb,'"x"'::jsonb);
-- name: document_keyvalue_values
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue values','{"a":{"x":1,"yy":true},"flag":true}'::jsonb,'$.a.keyvalue().value'::jsonpath,'$.a.keyvalue().value','{}'::jsonb,false,false,true,true,'[1, true]'::jsonb,'1'::jsonb);
-- name: document_keyvalue_ids
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue ids','{"a":{"x":1,"yy":true},"flag":true}'::jsonb,'$.a.keyvalue().id'::jsonpath,'$.a.keyvalue().id','{}'::jsonb,false,false,true,true,'[28, 28]'::jsonb,'28'::jsonb);
-- name: document_keyvalue_nested
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue nested','{"a":{"x":{"y":1}},"flag":true}'::jsonb,'$.a.keyvalue().value.keyvalue().id'::jsonpath,'$.a.keyvalue().value.keyvalue().id','{}'::jsonb,false,false,true,true,'[20000000052]'::jsonb,'20000000052'::jsonb);
-- name: document_keyvalue_generated
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue generated','{"a":{"x":1},"flag":true}'::jsonb,'$.a.keyvalue().keyvalue()'::jsonpath,'$.a.keyvalue().keyvalue()','{}'::jsonb,false,false,true,true,'[{"id": 20000000000, "key": "id", "value": 28}, {"id": 20000000000, "key": "key", "value": "x"}, {"id": 20000000000, "key": "value", "value": 1}]'::jsonb,'{"id": 20000000000, "key": "id", "value": 28}'::jsonb);
-- name: document_keyvalue_filter
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue filter','{"a":{"x":1,"yy":true},"flag":true}'::jsonb,'$.a.keyvalue()?(@.key=="yy").value'::jsonpath,'$.a.keyvalue()?(@.key=="yy").value','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_keyvalue_empty
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue empty','{"a":{},"flag":true}'::jsonb,'$.a.keyvalue()'::jsonpath,'$.a.keyvalue()','{}'::jsonb,false,false,false,true,'[]'::jsonb,NULL::jsonb);
-- name: document_keyvalue_variable
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue variable','{"a":{},"flag":true}'::jsonb,'$v.keyvalue().id'::jsonpath,'$v.keyvalue().id','{"v":{"x":1}}'::jsonb,false,false,true,true,'[10000000016]'::jsonb,'10000000016'::jsonb);
-- name: document_keyvalue_prefix
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue prefix','{"a":[{"x":1},2,{"y":3}],"flag":true}'::jsonb,'$.a[*].keyvalue()'::jsonpath,'$.a[*].keyvalue()','{}'::jsonb,true,false,true,true,'[{"id": 44, "key": "x", "value": 1}]'::jsonb,'{"id": 44, "key": "x", "value": 1}'::jsonb);
-- name: document_keyvalue_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue wrong result','{"a":{"x":1},"flag":true}'::jsonb,'$.a.keyvalue().value'::jsonpath,'$.a.keyvalue().value','{}'::jsonb,false,false,true,true,'[99]'::jsonb,'1'::jsonb);
-- name: document_keyvalue_scalar_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue scalar error','{"a":1,"flag":true}'::jsonb,'$.a.keyvalue()'::jsonpath,'$.a.keyvalue()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_keyvalue_array_unwrap
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue array unwrap','{"a":[{"x":1}],"flag":true}'::jsonb,'$.a.keyvalue()'::jsonpath,'$.a.keyvalue()','{}'::jsonb,false,false,true,true,'[{"id": 36, "key": "x", "value": 1}]'::jsonb,'{"id": 36, "key": "x", "value": 1}'::jsonb);
-- name: document_keyvalue_strict_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'keyvalue strict error','{"a":[{"x":1},2],"flag":true}'::jsonb,'strict $.a[*].keyvalue()'::jsonpath,'strict $.a[*].keyvalue()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_lax_counter_demand
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'lax counter demand','{"a":{"x":1},"flag":true}'::jsonb,'exists($.a.keyvalue()) && exists($.a.keyvalue().keyvalue()?(@.id==20000000000))'::jsonpath,'exists($.a.keyvalue()) && exists($.a.keyvalue().keyvalue()?(@.id==20000000000))','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_strict_counter_demand
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'strict counter demand','{"a":{"x":1},"flag":true}'::jsonb,'strict exists($.a.keyvalue()) && exists($.a.keyvalue().keyvalue()?(@.id==30000000000))'::jsonpath,'strict exists($.a.keyvalue()) && exists($.a.keyvalue().keyvalue()?(@.id==30000000000))','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_temporal_date
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'calendar date','{"a":"2024-02-29","flag":true}'::jsonb,'$.a.date()'::jsonpath,'$.a.date()','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_temporal_type
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'calendar type','{"a":"2024-02-29","flag":true}'::jsonb,'$.a.datetime().type()'::jsonpath,'$.a.datetime().type()','{}'::jsonb,false,false,true,true,'["date"]'::jsonb,'"date"'::jsonb);
-- name: document_temporal_offset
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'original timestamp offset','{"a":"2024-02-29T12:34:56+03:30","flag":true}'::jsonb,'$.a.timestamp_tz().string()'::jsonpath,'$.a.timestamp_tz().string()','{}'::jsonb,false,false,true,true,'["2024-02-29T12:34:56+03:30"]'::jsonb,'"2024-02-29T12:34:56+03:30"'::jsonb);
-- name: document_temporal_clock_precision
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'clock precision','{"a":"12:34:56.123456+03:30","flag":true}'::jsonb,'$.a.time_tz(2)'::jsonpath,'$.a.time_tz(2)','{}'::jsonb,false,false,true,true,'["12:34:56.12+03:30"]'::jsonb,'"12:34:56.12+03:30"'::jsonb);
-- name: document_temporal_comparison
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'typed calendar comparison','{"a":"2024-02-29","flag":true}'::jsonb,'$.a.date()<"2024-03-01T00:00:00".timestamp()'::jsonpath,'$.a.date()<"2024-03-01T00:00:00".timestamp()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_temporal_filter
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'calendar filter','{"a":["2024-02-29","bad","2024-03-01"],"flag":true}'::jsonb,'$.a[*]?(@.date()>"2024-02-28".date()).date()'::jsonpath,'$.a[*]?(@.date()>"2024-02-28".date()).date()','{}'::jsonb,false,false,true,true,'["2024-02-29","2024-03-01"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_temporal_silent_prefix
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'calendar silent prefix','{"a":["2024-02-29","bad","2024-03-01"],"flag":true}'::jsonb,'$.a.date()'::jsonpath,'$.a.date()','{}'::jsonb,true,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_temporal_suppressed_predicate
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid calendar predicate','{"a":"bad","flag":true}'::jsonb,'$.a.date()==null'::jsonpath,'$.a.date()==null','{}'::jsonb,false,false,true,true,'[null]'::jsonb,'null'::jsonb);
-- name: document_temporal_null_input
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'absent calendar document',NULL::jsonb,'$.a.date()'::jsonpath,'$.a.date()','{}'::jsonb,false,false,NULL,NULL,NULL::jsonb,NULL::jsonb);
-- name: document_temporal_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong calendar result','{"a":"2024-02-29","flag":true}'::jsonb,'$.a.date()'::jsonpath,'$.a.date()','{}'::jsonb,false,false,true,true,'["2024-03-01"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_temporal_invalid_date
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid calendar input','{"a":"2023-02-29","flag":true}'::jsonb,'$.a.date()'::jsonpath,'$.a.date()','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_temporal_hard_timezone_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'timezone required despite silent','{"a":"2024-02-29","flag":true}'::jsonb,'$.a.timestamp_tz()'::jsonpath,'$.a.timestamp_tz()','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_temporal_hard_comparison_error
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'comparison requires timezone','{"a":"2024-02-29","flag":true}'::jsonb,'$.a.date()=="2024-02-29T00:00:00+00".timestamp_tz()'::jsonpath,'$.a.date()=="2024-02-29T00:00:00+00".timestamp_tz()','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_temporal_timestamp_overflow
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'date outside timestamp range','{"a":"5874897-12-31","flag":true}'::jsonb,'$.a.timestamp()'::jsonpath,'$.a.timestamp()','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_compact_date
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'compact calendar template','{"a":"20240229","flag":true}'::jsonb,'$.a.datetime("YYYYMMDD")'::jsonpath,'$.a.datetime("YYYYMMDD")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_partial_year
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'partial year template','{"a":"69","flag":true}'::jsonb,'$.a.datetime("YY")'::jsonpath,'$.a.datetime("YY")','{}'::jsonb,false,false,true,true,'["2069-01-01"]'::jsonb,'"2069-01-01"'::jsonb);
-- name: document_template_clock_offset
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'clock template with offset','{"a":"12:34:56.123456-05:30","flag":true}'::jsonb,'$.a.datetime("HH24:MI:SS.USTZH:TZM").type()'::jsonpath,'$.a.datetime("HH24:MI:SS.USTZH:TZM").type()','{}'::jsonb,false,false,true,true,'["time with time zone"]'::jsonb,'"time with time zone"'::jsonb);
-- name: document_template_fraction_rounding
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'fractional template precision','{"a":"23:59:59.999999","flag":true}'::jsonb,'$.a.datetime("HH24:MI:SS.FF2")'::jsonpath,'$.a.datetime("HH24:MI:SS.FF2")','{}'::jsonb,false,false,true,true,'["24:00:00"]'::jsonb,'"24:00:00"'::jsonb);
-- name: document_template_invalid_silent
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid calendar template value','{"a":"2023-02-29","flag":true}'::jsonb,'$.a.datetime("YYYY-MM-DD")'::jsonpath,'$.a.datetime("YYYY-MM-DD")','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong calendar template result','{"a":"20240229","flag":true}'::jsonb,'$.a.datetime("YYYYMMDD")'::jsonpath,'$.a.datetime("YYYYMMDD")','{}'::jsonb,false,false,true,true,'["2024-03-01"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_invalid_format_silent
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'malformed template despite silent','{"a":"2024","flag":true}'::jsonb,'$.a.datetime("YYYY_")'::jsonpath,'$.a.datetime("YYYY_")','{}'::jsonb,true,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_timestamp_rounding_boundary
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'timestamp rounding beyond input boundary','{"a":"294276-12-31T23:59:59.999999","flag":true}'::jsonb,'$.a.timestamp(1)'::jsonpath,'$.a.timestamp(1)','{}'::jsonb,false,false,true,true,'["294277-01-01T00:00:00"]'::jsonb,'"294277-01-01T00:00:00"'::jsonb);
-- name: document_template_rounding_boundary
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'template rounding beyond input boundary','{"a":"294276-12-31 23:59:59.999999","flag":true}'::jsonb,'$.a.datetime("YYYY-MM-DD HH24:MI:SS.FF1")'::jsonpath,'$.a.datetime("YYYY-MM-DD HH24:MI:SS.FF1")','{}'::jsonb,false,false,true,true,'["294277-01-01T00:00:00"]'::jsonb,'"294277-01-01T00:00:00"'::jsonb);
-- name: document_timestamp_offset_boundary
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'timestamp offset before range check','{"a":"294277-01-01T00:00:00+03:30","flag":true}'::jsonb,'$.a.datetime()'::jsonpath,'$.a.datetime()','{}'::jsonb,false,false,true,true,'["294277-01-01T00:00:00+03:30"]'::jsonb,'"294277-01-01T00:00:00+03:30"'::jsonb);
-- name: document_template_iso_week
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'ISO week calendar','{"a":"2024-09-4","flag":true}'::jsonb,'$.a.datetime("IYYY-IW-ID")'::jsonpath,'$.a.datetime("IYYY-IW-ID")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_century
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'century and short year','{"a":"21 24","flag":true}'::jsonb,'$.a.datetime("CC YY")'::jsonpath,'$.a.datetime("CC YY")','{}'::jsonb,false,false,true,true,'["2024-01-01"]'::jsonb,'"2024-01-01"'::jsonb);
-- name: document_template_era
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'calendar era','{"a":"1 BC","flag":true}'::jsonb,'$.a.datetime("YYYY AD")'::jsonpath,'$.a.datetime("YYYY AD")','{}'::jsonb,false,false,true,true,'["0001-01-01 BC"]'::jsonb,'"0001-01-01 BC"'::jsonb);
-- name: document_template_julian
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'Julian calendar day','{"a":"2460370","flag":true}'::jsonb,'$.a.datetime("J")'::jsonpath,'$.a.datetime("J")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_ordinal_date
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'ordinal calendar day','{"a":"2024-060","flag":true}'::jsonb,'$.a.datetime("YYYY-DDD")'::jsonpath,'$.a.datetime("YYYY-DDD")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_partial_calendar
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'partial calendar normalization','{"a":"02-30","flag":true}'::jsonb,'$.a.datetime("MM-DD")'::jsonpath,'$.a.datetime("MM-DD")','{}'::jsonb,false,false,true,true,'["0001-03-01 BC"]'::jsonb,'"0001-03-01 BC"'::jsonb);
-- name: document_template_zero_year_normalization
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unset numeric year normalization','{"a":"0000-02-30","flag":true}'::jsonb,'$.a.datetime()'::jsonpath,'$.a.datetime()','{}'::jsonb,false,false,true,true,'["0001-03-01 BC"]'::jsonb,'"0001-03-01 BC"'::jsonb);
-- name: document_template_quarter_ignored
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'parsed quarter without date selection','{"a":"4","flag":true}'::jsonb,'$.a.datetime("Q")'::jsonpath,'$.a.datetime("Q")','{}'::jsonb,false,false,true,true,'["0001-01-01 BC"]'::jsonb,'"0001-01-01 BC"'::jsonb);
-- name: document_template_calendar_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong ordinal calendar result','{"a":"2024-060","flag":true}'::jsonb,'$.a.datetime("YYYY-DDD")'::jsonpath,'$.a.datetime("YYYY-DDD")','{}'::jsonb,false,false,true,true,'["2024-03-01"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_calendar_conflict
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'mixed calendar conventions','{"a":"2024-09-4","flag":true}'::jsonb,'$.a.datetime("YYYY-IW-ID")'::jsonpath,'$.a.datetime("YYYY-IW-ID")','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_ordinal_without_year
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'ordinal day without year','{"a":"060","flag":true}'::jsonb,'$.a.datetime("DDD")'::jsonpath,'$.a.datetime("DDD")','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_week_overflow
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'week arithmetic overflow','{"a":"2024-2147483647","flag":true}'::jsonb,'$.a.datetime("YYYY-WW")'::jsonpath,'$.a.datetime("YYYY-WW")','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_midnight
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'midnight in twelve-hour format','{"a":"12 AM","flag":true}'::jsonb,'$.a.datetime("HH12 AM")'::jsonpath,'$.a.datetime("HH12 AM")','{}'::jsonb,false,false,true,true,'["00:00:00"]'::jsonb,'"00:00:00"'::jsonb);
-- name: document_template_noon
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'noon in twelve-hour format','{"a":"12 PM","flag":true}'::jsonb,'$.a.datetime("HH12 AM")'::jsonpath,'$.a.datetime("HH12 AM")','{}'::jsonb,false,false,true,true,'["12:00:00"]'::jsonb,'"12:00:00"'::jsonb);
-- name: document_template_english_month
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'English month name','{"a":"29 February 2024","flag":true}'::jsonb,'$.a.datetime("DD Month YYYY")'::jsonpath,'$.a.datetime("DD Month YYYY")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_roman_month
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'Roman month number','{"a":"2024-II-29","flag":true}'::jsonb,'$.a.datetime("YYYY-RM-DD")'::jsonpath,'$.a.datetime("YYYY-RM-DD")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_named_weekday
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'English weekday in ISO week','{"a":"2024-09-Thursday","flag":true}'::jsonb,'$.a.datetime("IYYY-IW-Day")'::jsonpath,'$.a.datetime("IYYY-IW-Day")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_name_casefold
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'ASCII name case folding','{"a":"29 fEbRuArY 2024","flag":true}'::jsonb,'$.a.datetime("DD MONTH YYYY")'::jsonpath,'$.a.datetime("DD MONTH YYYY")','{}'::jsonb,false,false,true,true,'["2024-02-29"]'::jsonb,'"2024-02-29"'::jsonb);
-- name: document_template_twelve_hour_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong twelve-hour result','{"a":"12 AM","flag":true}'::jsonb,'$.a.datetime("HH12 AM")'::jsonpath,'$.a.datetime("HH12 AM")','{}'::jsonb,false,false,true,true,'["12:00:00"]'::jsonb,'"00:00:00"'::jsonb);
-- name: document_template_twelve_hour_invalid
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid twelve-hour clock','{"a":"13 AM","flag":true}'::jsonb,'$.a.datetime("HH12 AM")'::jsonpath,'$.a.datetime("HH12 AM")','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_named_invalid_date
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid named leap date','{"a":"29 February 2023","flag":true}'::jsonb,'$.a.datetime("DD Month YYYY")'::jsonpath,'$.a.datetime("DD Month YYYY")','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_template_clock_calendar_error_order
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'clock error before calendar error','{"a":"2023-02-29 0 AM","flag":true}'::jsonb,'$.a.datetime("YYYY-MM-DD HH12 AM")'::jsonpath,'$.a.datetime("YYYY-MM-DD HH12 AM")','{}'::jsonb,false,false,NULL,true,'[]'::jsonb,NULL::jsonb);
-- name: document_regex_match
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'regex match','{"a":"abc","flag":true}'::jsonb,'$.a like_regex "^a"'::jsonpath,'$.a like_regex "^a"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_no_match
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'regex false item','{"a":"xyz","flag":true}'::jsonb,'$.a like_regex "^a"'::jsonpath,'$.a like_regex "^a"','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'false'::jsonb);
-- name: document_regex_filter
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'regex filter','{"a":["abc","bad",1],"flag":true}'::jsonb,'$.a[*]?(@ like_regex "^a")'::jsonpath,'$.a[*]?(@ like_regex "^a")','{}'::jsonb,false,false,true,true,'["abc"]'::jsonb,'"abc"'::jsonb);
-- name: document_regex_lax_sequence
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'lax regex sequence','{"a":["abc",1],"flag":true}'::jsonb,'$.a like_regex "a"'::jsonpath,'$.a like_regex "a"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_strict_sequence
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'strict regex sequence','{"a":["abc",1],"flag":true}'::jsonb,'strict $.a[*] like_regex "a"'::jsonpath,'strict $.a[*] like_regex "a"','{}'::jsonb,false,false,true,true,'[null]'::jsonb,'null'::jsonb);
-- name: document_regex_scalar_null
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'regex wrong-type predicate','{"a":1,"flag":true}'::jsonb,'$.a like_regex "a"'::jsonpath,'$.a like_regex "a"','{}'::jsonb,false,false,true,true,'[null]'::jsonb,'null'::jsonb);
-- name: document_regex_quote_unicode
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'quoted Unicode regex','{"a":"é","flag":true}'::jsonb,'$.a like_regex "é" flag "q"'::jsonpath,'$.a like_regex "é" flag "q"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_unicode_dot
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'Unicode character without class lookup','{"a":"é","flag":true}'::jsonb,'$.a like_regex "."'::jsonpath,'$.a like_regex "."','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_case_flag
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'ASCII regex case folding','{"a":"ABC","flag":true}'::jsonb,'$.a like_regex "abc" flag "i"'::jsonpath,'$.a like_regex "abc" flag "i"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_quoted_flags
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'quoted regex ignores other syntax flags','{"a":"a.b","flag":true}'::jsonb,'$.a like_regex "a.b" flag "qmsx"'::jsonpath,'$.a like_regex "a.b" flag "qmsx"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_variable
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'regex variable input','{"flag":true}'::jsonb,'$v like_regex "^a"'::jsonpath,'$v like_regex "^a"','{"v":"abc"}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_lazy_skip
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'regex lazy missing variable','{"flag":true}'::jsonb,'(1==2)&&($missing like_regex "a")'::jsonpath,'(1==2)&&($missing like_regex "a")','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'false'::jsonb);
-- name: document_regex_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong regex result','{"a":"abc","flag":true}'::jsonb,'$.a like_regex "^a"'::jsonpath,'$.a like_regex "^a"','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'true'::jsonb);
-- name: document_regex_invalid_source
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid regex source cast','{"a":"abc","flag":true}'::jsonb,'$.a like_regex "a"'::jsonpath,'$.a like_regex "["','{}'::jsonb,true,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_unsupported_flag_source
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unsupported regex flag source cast','{"a":"abc","flag":true}'::jsonb,'$.a like_regex "a"'::jsonpath,'$.a like_regex "a" flag "x"','{}'::jsonb,true,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_skipped_invalid_source
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'skipped invalid regex source','{"a":"abc","flag":true}'::jsonb,'$.a like_regex "a"'::jsonpath,'$.a like_regex "["','{}'::jsonb,true,true,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: clock_fixed_offset
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'drop fixed offset','"12:34:56+03:00"'::jsonb,'$.time()=="12:34:56".time()'::jsonpath,'$.time()=="12:34:56".time()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: clock_precision
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'invalid clock operand makes predicate unknown','"23:59:59.999999-05:00"'::jsonb,'$.time(0)=="24:00:00".time()'::jsonpath,'$.time(0)=="24:00:00".time()','{}'::jsonb,false,false,true,NULL,'[null]'::jsonb,'null'::jsonb);
-- name: clock_false_predicate
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'false clock predicate','"12:34:56+03:00"'::jsonb,'$.time()=="12:00:00".time()'::jsonpath,'$.time()=="12:00:00".time()','{}'::jsonb,false,false,true,false,'[false]'::jsonb,'false'::jsonb);
-- name: clock_null_document
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'absent clock document',NULL::jsonb,'$.time()'::jsonpath,'$.time()','{}'::jsonb,false,false,NULL,NULL,NULL::jsonb,NULL::jsonb);
-- name: clock_silent_wrong_type
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'suppressed wrong clock type','1'::jsonb,'$.time()'::jsonpath,'$.time()','{}'::jsonb,true,false,NULL,NULL,'[]'::jsonb,NULL::jsonb);
-- name: clock_lazy_context
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'skip timezone lookup','"2024-02-29"'::jsonb,'(1==1)||($.timestamp_tz()=="2024-02-29T00:00:00Z".datetime())'::jsonpath,'(1==1)||($.timestamp_tz()=="2024-02-29T00:00:00Z".datetime())','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: clock_wrong_exists
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong clock existence','true'::jsonb,'$'::jsonpath,'$','{}'::jsonb,false,false,false,true,'[true]'::jsonb,'true'::jsonb);
-- name: clock_wrong_match
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong clock match','true'::jsonb,'$'::jsonpath,'$','{}'::jsonb,false,false,true,false,'[true]'::jsonb,'true'::jsonb);
-- name: clock_wrong_results
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong clock results','true'::jsonb,'$'::jsonpath,'$','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'true'::jsonb);
-- name: clock_wrong_first
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'wrong first clock result','true'::jsonb,'$'::jsonpath,'$','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'false'::jsonb);
-- name: clock_zone_context
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured local midnight','"2024-02-29"'::jsonb,'$.timestamp_tz()=="2024-02-29T00:00:00Z".datetime()'::jsonpath,'$.timestamp_tz()=="2024-02-29T00:00:00Z".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_midnight_zone
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_midnight_zone','"2024-02-29"'::jsonb,'$.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()'::jsonpath,'$.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_local_instant
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_local_instant','"2024-03-10T02:30:00"'::jsonb,'$.timestamp_tz()=="2024-03-10T02:30:00+00".datetime()'::jsonpath,'$.timestamp_tz()=="2024-03-10T02:30:00+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_clock_offset
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_clock_offset','"12:34:56"'::jsonb,'$.time_tz()=="12:34:56+00".datetime()'::jsonpath,'$.time_tz()=="12:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_instant_date
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_instant_date','"2024-02-29T00:30:00+03:30"'::jsonb,'$.date()=="2024-02-28".date()'::jsonpath,'$.date()=="2024-02-28".date()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_keyvalue_zone
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_keyvalue_zone','{"a":"2024-02-29"}'::jsonb,'$.keyvalue().value.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()'::jsonpath,'$.keyvalue().value.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_wrong_result
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_wrong_result','"2024-02-29"'::jsonb,'$.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()'::jsonpath,'$.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()','{}'::jsonb,false,false,true,false,'[false]'::jsonb,'false'::jsonb);

-- name: configured_invalid_calendar
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'configured_invalid_calendar','"2024-13-01"'::jsonb,'$.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()'::jsonpath,'$.timestamp_tz()=="2024-02-29T00:00:00+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: configured_null_document
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'Null configured path',NULL,'$.timestamp_tz()'::jsonpath,'$.timestamp_tz()','{}'::jsonb,false,false,NULL,NULL,NULL,NULL);

-- name: abbreviation_zulu
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_zulu','"2024-02-29T12:34:56Z"'::jsonb,'$.datetime()=="2024-02-29T12:34:56+00".datetime()'::jsonpath,'$.datetime()=="2024-02-29T12:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_default_cst
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_default_cst','"2024-02-29T12:34:56CST"'::jsonb,'$.datetime()=="2024-02-29T18:34:56+00".datetime()'::jsonpath,'$.datetime()=="2024-02-29T18:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_template_est
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_template_est','"2024-02-29 12:34:56EST"'::jsonb,'$.datetime("YYYY-MM-DD HH24:MI:SSTZ")=="2024-02-29T17:34:56+00".datetime()'::jsonpath,'$.datetime("YYYY-MM-DD HH24:MI:SSTZ")=="2024-02-29T17:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_dynamic_date
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_dynamic_date','"2024-02-29T12:34:56MSK"'::jsonb,'$.datetime()=="2024-02-29T12:34:56+03".datetime()'::jsonpath,'$.datetime()=="2024-02-29T12:34:56+03".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_lowercase
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_lowercase','"2024-02-29T12:34:56z"'::jsonb,'$.datetime()=="2024-02-29T12:34:56+00".datetime()'::jsonpath,'$.datetime()=="2024-02-29T12:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_invalid_name
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_invalid_name','"2024-02-29T12:34:56XYZ"'::jsonb,'$.datetime()=="2024-02-29T12:34:56+00".datetime()'::jsonpath,'$.datetime()=="2024-02-29T12:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_template_error_order
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_template_error_order','"2024-13-01 12:34:56XYZ"'::jsonb,'$.datetime("YYYY-MM-DD HH24:MI:SSTZ")=="2024-02-29T12:34:56+00".datetime()'::jsonpath,'$.datetime("YYYY-MM-DD HH24:MI:SSTZ")=="2024-02-29T12:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: abbreviation_wrong_result
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_wrong_result','"2024-02-29T12:34:56CST"'::jsonb,'$.datetime()=="2024-02-29T18:34:56+00".datetime()'::jsonpath,'$.datetime()=="2024-02-29T18:34:56+00".datetime()','{}'::jsonb,false,false,true,false,'[false]'::jsonb,'false'::jsonb);

-- name: abbreviation_keyvalue_copy
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'abbreviation_keyvalue_copy','{"a":"2024-02-29T12:34:56EST"}'::jsonb,'$.keyvalue().value.datetime()=="2024-02-29T17:34:56+00".datetime()'::jsonpath,'$.keyvalue().value.datetime()=="2024-02-29T17:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: translated_month
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'translated_month','"2024-February-29"'::jsonb,'$.datetime("YYYY-TMMonth-DD")=="2024-02-29".date()'::jsonpath,'$.datetime("YYYY-TMMonth-DD")=="2024-02-29".date()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: translated_weekday
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'translated_weekday','"2024-09-Thursday"'::jsonb,'$.datetime("IYYY-IW-TMDay")=="2024-02-29".date()'::jsonpath,'$.datetime("IYYY-IW-TMDay")=="2024-02-29".date()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: translated_keyvalue
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'translated_keyvalue','{"a":"2024-February-29"}'::jsonb,'$.keyvalue().value.datetime("YYYY-TMMonth-DD")=="2024-02-29".date()'::jsonpath,'$.keyvalue().value.datetime("YYYY-TMMonth-DD")=="2024-02-29".date()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: translated_abbreviation
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'translated_abbreviation','"2024-February-29 12:34:56EST"'::jsonb,'$.datetime("YYYY-TMMonth-DD HH24:MI:SSTZ")=="2024-02-29T17:34:56+00".datetime()'::jsonpath,'$.datetime("YYYY-TMMonth-DD HH24:MI:SSTZ")=="2024-02-29T17:34:56+00".datetime()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: translated_invalid_month
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'translated_invalid_month','"2024-Fébruary-29"'::jsonb,'$.datetime("YYYY-TMMonth-DD")=="2024-02-29".date()'::jsonpath,'$.datetime("YYYY-TMMonth-DD")=="2024-02-29".date()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: translated_wrong_result
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'translated_wrong_result','"2024-February-29"'::jsonb,'$.datetime("YYYY-TMMonth-DD")=="2024-03-01".date()'::jsonpath,'$.datetime("YYYY-TMMonth-DD")=="2024-03-01".date()','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);

-- name: document_regex_unicode_alpha
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_alpha','{"a":"é","flag":true}'::jsonb,'$.a like_regex "[[:alpha:]]"'::jsonpath,'$.a like_regex "[[:alpha:]]"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_unicode_digit
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_digit','{"a":"١","flag":true}'::jsonb,'$.a like_regex "[[:digit:]]"'::jsonpath,'$.a like_regex "[[:digit:]]"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_unicode_directional_upper
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_directional_upper','{"a":"S","flag":true}'::jsonb,'$.a like_regex "ſ" flag "i"'::jsonpath,'$.a like_regex "ſ" flag "i"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_unicode_directional_lower
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_directional_lower','{"a":"s","flag":true}'::jsonb,'$.a like_regex "ſ" flag "i"'::jsonpath,'$.a like_regex "ſ" flag "i"','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'false'::jsonb);
-- name: document_regex_unicode_titlecase_literal
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_titlecase_literal','{"a":"ǅ","flag":true}'::jsonb,'$.a like_regex "ǅ" flag "i"'::jsonpath,'$.a like_regex "ǅ" flag "i"','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'false'::jsonb);
-- name: document_regex_unicode_titlecase_range
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_titlecase_range','{"a":"ǅ","flag":true}'::jsonb,'$.a like_regex "[ǅ-ǅ]" flag "i"'::jsonpath,'$.a like_regex "[ǅ-ǅ]" flag "i"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: document_regex_unicode_keyvalue
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_keyvalue','{"a":"é","flag":true}'::jsonb,'$.keyvalue()?(@.value like_regex "[[:alpha:]]").value'::jsonpath,'$.keyvalue()?(@.value like_regex "[[:alpha:]]").value','{}'::jsonb,false,false,true,true,'["é"]'::jsonb,'"é"'::jsonb);
-- name: document_regex_unicode_wrong_result
INSERT INTO query_documents(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_wrong_result','{"a":"é","flag":true}'::jsonb,'$.a like_regex "[[:alpha:]]"'::jsonpath,'$.a like_regex "[[:alpha:]]"','{}'::jsonb,false,false,true,true,'[false]'::jsonb,'true'::jsonb);
-- name: clock_regex_unicode_class
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_class','"é"'::jsonb,'$ like_regex "[[:alpha:]]"'::jsonpath,'$ like_regex "[[:alpha:]]"','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
-- name: clock_regex_unicode_directional
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_directional','"s"'::jsonb,'$ like_regex "ſ" flag "i"'::jsonpath,'$ like_regex "ſ" flag "i"','{}'::jsonb,false,false,true,false,'[false]'::jsonb,'false'::jsonb);
-- name: clock_regex_unicode_lazy
INSERT INTO query_clock_rules(id,path_id,label,document,path,source_text,variables,silent,bypass,expected_exists,expected_match,expected_results,expected_first) VALUES(2,1,'unicode_lazy','"é"'::jsonb,'(1==1)||($missing like_regex "[[:alpha:]]")'::jsonpath,'(1==1)||($missing like_regex "[[:alpha:]]")','{}'::jsonb,false,false,true,true,'[true]'::jsonb,'true'::jsonb);
