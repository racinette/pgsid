INSERT INTO export_sessions(id,label,primary_cursor,fallback_cursor,expected_name,pinned) VALUES(1,'weekly export','report_main','report_backup','report_main',true);
INSERT INTO cursor_imports(id,session_id,label,source_name,source_text,expected_padded,expected_source,bypass) VALUES(1,1,'imported report','orders','import_cursor','orders  ','import_cursor',false);
INSERT INTO cursor_labels(id,session_id,label,cursor_name,expected_short,wire,ascii_transport,allow_absent) VALUES(1,1,'report label','report_main','rep','\x7265706f72745f6d61696e',true,false);
