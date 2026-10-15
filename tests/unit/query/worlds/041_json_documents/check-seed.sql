-- name: archive_object
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'duplicate keys','{"n":9007199254740993,"n":2}','object','{"n":9007199254740993,"n":2}',false);
-- name: archive_array
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'array','[1, null, true]','array','[1, null, true]',false);
-- name: archive_json_null
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'JSON null','null','null','null',false);
-- name: archive_sql_null
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'absent document',NULL,'object',NULL,true);
-- name: archive_boolean
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'boolean','false','boolean','false',false);
-- name: archive_large_number
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'large exponent','1e2147483647','number','1e2147483647',false);
-- name: archive_unicode
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'Unicode source','"雪😊"','string','"雪😊"',false);
-- name: archive_escaped_nul
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'escaped zero','"\u0000"','string','"\u0000"',false);
-- name: archive_lone_surrogate
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'undecoded surrogate','"\ud800"','string','"\ud800"',false);
-- name: archive_wrong_kind
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'wrong shape','{}','array','{}',false);
-- name: archive_wrong_source
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'lost formatting','{ "n": 1 }','object','{"n":1}',false);
-- name: archive_wrong_presence
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'missing required document',NULL,'object',NULL,false);
-- name: archive_json_null_is_present
INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(2,'JSON null is a value','null','null','null',true);
-- name: route_primary
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(2,1,'primary route','{}','[]',true,'object','{}');
-- name: route_backup
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(2,1,'backup route',NULL,'[]',false,'array','[]');
-- name: route_json_null
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(2,1,'JSON null route','null','[]',true,'null','null');
-- name: route_sql_null
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(2,1,'absent route',NULL,NULL,true,NULL,NULL);
-- name: route_wrong_choice
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(2,1,'wrong route kind','{}','[]',false,'object','{}');
-- name: route_wrong_fallback
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(2,1,'wrong fallback source',NULL,'[]',false,'array','{}');
-- name: review_document
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(2,1,'reviewed document','{}','object','{}',false);
-- name: review_sql_null
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(2,1,'absent document',NULL,NULL,NULL,false);
-- name: review_bypass
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(2,1,'review bypass','{}','array','[]',true);
-- name: review_wrong_kind
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(2,1,'wrong reviewed shape','{}','array','{}',false);
-- name: review_wrong_source
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(2,1,'wrong reviewed source','{}','object','[]',false);
-- name: import_object
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'import object','{"n":1,"n":2}','object','{"n":1,"n":2}',false,false);
-- name: import_array
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'import array','[1, null, true]','array','[1, null, true]',false,false);
-- name: import_sql_null
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'missing import',NULL,NULL,'null',false,true);
-- name: import_json_null
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'JSON null import','null','null','null',false,false);
-- name: import_large_number
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'large exponent','1e2147483647','number','1e2147483647',false,false);
-- name: import_escaped_zero
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'undecoded zero','"\u0000"','string','"\u0000"',false,false);
-- name: import_surrogate
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'undecoded surrogate','"\ud800"','string','"\ud800"',false,false);
-- name: import_wrong_kind
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'wrong import shape','{}','array','{}',false,false);
-- name: import_wrong_source
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'wrong import source','{ "n": 1 }','object','{"n":1}',false,false);
-- name: import_wrong_presence
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'wrong import presence',NULL,NULL,'null',false,false);
-- name: import_invalid_json
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'invalid JSON input','[1,]','array','[1,]',false,false);
-- name: import_empty_json
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'empty JSON input','','object','',false,false);
-- name: import_skipped_invalid
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(2,1,'skipped invalid input','[1,]','array','[1,]',true,false);
-- name: field_last_duplicate
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'last field','{"a":1,"a":2}','a','2','2',false,false);
-- name: field_json_null
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'JSON null field','{"a":null}','a','null',NULL,false,false);
-- name: field_missing
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'missing field','{}','a',NULL,NULL,true,false);
-- name: field_sql_null
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'missing document',NULL,'a',NULL,NULL,true,false);
-- name: field_raw_unicode
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'raw Unicode field','{"雪":"😊"}','雪','"😊"','😊',false,false);
-- name: field_ascii_escape
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'ASCII escape','{"\u0061":"\u0062"}','a','"\u0062"','b',false,false);
-- name: field_container_source
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'nested source',' {"a": [1,  2] } ','a','[1,  2]','[1,  2]',false,false);
-- name: field_wrong_root
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'array instead of object','[1,2]','a',NULL,NULL,true,false);
-- name: field_wrong_source
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'wrong source','{"a":2}','a','1','2',false,false);
-- name: field_wrong_text
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'wrong text','{"a":2}','a','2','1',false,false);
-- name: field_wrong_presence
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'wrong presence','{"a":null}','a','null',NULL,true,false);
-- name: field_bad_unselected_zero
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'bad unused string','{"a":1,"z":"\u0000"}','a','1','1',false,false);
-- name: field_bad_unselected_surrogate
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'bad unused surrogate','{"a":1,"z":"\ud800"}','a','1','1',false,false);
-- name: field_encoding_context
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'requires database encoding','{"a":1,"z":"\u00e9"}','a','1','1',false,false);
-- name: field_skip_encoding_context
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(2,1,'skipped encoding context','{"a":1,"z":"\u00e9"}','a','1','1',false,true);
-- name: element_first
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'first array element','[1,null,"last"]',0,'1','1',3,false,false);
-- name: element_last
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'negative array element','[1,null,"last"]',-1,'"last"','last',3,false,false);
-- name: element_json_null
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'JSON null element','[1,null,"last"]',1,'null',NULL,3,false,false);
-- name: element_out_of_bounds
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'missing element','[]',0,NULL,NULL,0,true,false);
-- name: element_minimum_index
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'minimum index','[1,2]',-2147483648,NULL,NULL,2,true,false);
-- name: element_sql_null
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'missing array',NULL,0,NULL,NULL,NULL,true,false);
-- name: element_wrong_source
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'wrong element source','[1]',0,'2','1',1,false,false);
-- name: element_wrong_text
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'wrong element text','[1]',0,'1','2',1,false,false);
-- name: element_wrong_presence
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'wrong element presence','[null]',0,'null',NULL,1,true,false);
-- name: element_wrong_count
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'wrong array length','[1]',0,'1','1',2,false,false);
-- name: element_non_array
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'not an array','{}',0,NULL,NULL,NULL,true,false);
-- name: element_bad_unselected_zero
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'bad unused array string','[1,"\u0000"]',0,'1','1',2,false,false);
-- name: element_bad_unselected_surrogate
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(2,1,'bad unused array surrogate','[1,"\ud800"]',0,'1','1',2,false,false);
