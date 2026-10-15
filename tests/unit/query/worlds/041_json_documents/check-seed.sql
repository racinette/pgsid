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
