-- name: session_primary
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'primary report','report_main','backup','report_main',true);
-- name: session_fallback
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'fallback report',NULL,'backup','backup',false);
-- name: session_empty
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'empty cursor name','','backup','',true);
-- name: session_unicode
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'unicode cursor','报告😀',NULL,'报告😀',true);
-- name: session_long
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'long cursor name','this_cursor_name_is_intentionally_longer_than_the_postgresql_identifier_limit_and_must_remain_complete',NULL,'this_cursor_name_is_intentionally_longer_than_the_postgresql_identifier_limit_and_must_remain_complete',true);
-- name: session_null
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'absent report',NULL,NULL,NULL,true);
-- name: session_unopened_portal
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'scheduled cursor','a_cursor_that_is_not_open',NULL,'a_cursor_that_is_not_open',true);
-- name: session_wrong_primary
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'incorrect primary name','report_main','backup','different',true);
-- name: session_wrong_fallback
INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(101,'incorrect fallback name',NULL,'backup','different',false);
-- name: import_padded
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(101,1,'padded import','orders','report','orders  ','report',false);
-- name: import_empty
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(101,1,'empty import','','','        ','',false);
-- name: import_null
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(101,1,'absent import',NULL,NULL,NULL,NULL,false);
-- name: import_skipped
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(101,1,'skipped import','orders','report','wrong','wrong',true);
-- name: import_trimmed_failure
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(101,1,'lost trailing spaces','orders','report','orders','report',false);
-- name: import_wrong_source
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(101,1,'incorrect source name','orders','report','orders  ','wrong',false);
-- name: label_ascii
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'ASCII label','report_main','rep','\x7265706f72745f6d61696e',true,false);
-- name: label_empty
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'empty label','','','\x',true,false);
-- name: label_unicode_skipped
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'unicode label without wire validation','报告😀','报告😀','\x00',false,false);
-- name: label_unicode_wire
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'unicode wire in this session','报告😀','报告😀','\xe68aa5e5918af09f9880',true,false);
-- name: label_null
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'absent label',NULL,NULL,NULL,true,true);
-- name: label_long
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'long label','abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuv','abc',NULL,true,false);
-- name: label_bad_short
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'incorrect short label','report_main','bad','\x7265706f72745f6d61696e',true,false);
-- name: label_bad_wire
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'incorrect wire','report_main','rep','\x00',true,false);
-- name: label_bad_presence
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'incorrect presence',NULL,NULL,NULL,true,false);
-- name: label_wrong_unicode_short
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'incorrect unicode label','报告😀','错',NULL,false,false);
-- name: label_skipped_bad_wire
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(101,1,'skipped wire comparison','report_main','rep','\x00',false,false);
