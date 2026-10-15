INSERT INTO document_archives(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(1,'retained import','{"n":9007199254740993,"n":2}','object','{"n":9007199254740993,"n":2}',false);
INSERT INTO document_routes(id,archive_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(1,1,'primary route','{"n":1}','[]',true,'object','{"n":1}');
INSERT INTO document_reviews(id,archive_id,label,document,recorded_kind,recorded_source,bypass) VALUES(1,1,'reviewed import','{"n":1}','object','{"n":1}',false);
INSERT INTO document_imports(id,archive_id,label,source_text,recorded_kind,recorded_source,bypass,allow_absent) VALUES(1,1,'imported document','{"n":1}','object','{"n":1}',false,false);
INSERT INTO document_fields(id,archive_id,label,document,field_name,recorded_json,recorded_text,allow_missing,bypass) VALUES(1,1,'stored field','{"name":"first","name":"last"}','name','"last"','last',false,false);
INSERT INTO document_elements(id,archive_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(1,1,'stored element','[1,null,"last"]',-1,'"last"','last',3,false,false);

INSERT INTO stored_documents(id,label,document,recorded_kind,recorded_source,allow_absent) VALUES(1,'normalized record','{"a":1,"a":2}','object','{"a": 2}',false);
INSERT INTO document_choices(id,store_id,label,primary_document,backup_document,choose_primary,recorded_kind,recorded_source) VALUES(1,1,'preferred record','{"a":2}','[]',true,'object','{"a": 2}');
INSERT INTO document_normalizations(id,store_id,label,source_text,recorded_kind,recorded_source,allow_absent,bypass) VALUES(1,1,'normalize import','{"a":1,"a":2}','object','{"a": 2}',false,false);
INSERT INTO normalized_fields(id,store_id,label,document,field_name,recorded_json,recorded_text,allow_missing,recorded_exists,bypass) VALUES(1,1,'stored name','{"name":"first","name":"last"}','name','"last"','last',false,true,false);
INSERT INTO normalized_elements(id,store_id,label,document,element_index,recorded_json,recorded_text,recorded_count,allow_missing,bypass) VALUES(1,1,'stored tail','[1,null,"last"]',-1,'"last"','last',3,false,false);
INSERT INTO document_comparisons(id,store_id,label,document,compared_document,recorded_equal,recorded_unequal,recorded_contains,recorded_contained,bypass) VALUES(1,1,'equivalent record','{"a":1}','{"a":1.00}',true,false,true,true,false);
INSERT INTO document_orderings(id,store_id,label,document,compared_document,recorded_order,recorded_lower,recorded_lower_equal,recorded_greater,recorded_greater_equal,bypass) VALUES(1,1,'ordered record','1','2',-1,true,true,false,false,false);
INSERT INTO document_scalars(id,store_id,label,numeric_document,boolean_document,recorded_numeric,recorded_small,recorded_integer,recorded_big,recorded_real,recorded_double,recorded_bounded,recorded_scale,recorded_flag,bypass) VALUES(1,1,'stored scalar','1.5','true',1.5,2,2,2,1.5,1.5,1.5,2,true,false);
