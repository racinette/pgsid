INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(1,'retained import','{"n":9007199254740993,"n":2}','object','{"n":9007199254740993,"n":2}',false);
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(1,1,'primary route','{"n":1}','[]',true,'object','{"n":1}');
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(1,1,'reviewed import','{"n":1}','object','{"n":1}',false);
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(1,1,'imported document','{"n":1}','object','{"n":1}',false,false);
