-- name: catalog_relation_word
INSERT INTO catalog_relations(id,label,relation,relation_wire,recorded_word,reference,recorded_order,recorded_selection) VALUES (101,'high relation',4294967295,'\xffffffff',4294967295,2147483648,1,4294967295);
-- name: catalog_relation_zero
INSERT INTO catalog_relations(id,label,relation,relation_wire,recorded_word,reference,recorded_order,recorded_selection) VALUES (101,'zero relation',0,'\x00000000',0,1,-1,0);
-- name: catalog_relation_equal
INSERT INTO catalog_relations(id,label,relation,relation_wire,recorded_word,reference,recorded_order,recorded_selection) VALUES (101,'equal relation',125,'\x0000007d',125,125,0,125);
-- name: catalog_relation_wrong_wire
INSERT INTO catalog_relations(id,label,relation,relation_wire) VALUES (101,'wrong relation wire',4294967295,'\x00000000');
-- name: catalog_relation_wrong_word
INSERT INTO catalog_relations(id,label,relation,recorded_word) VALUES (101,'wrong relation word',2147483648,1);
-- name: catalog_relation_wrong_order
INSERT INTO catalog_relations(id,label,relation,reference,recorded_order) VALUES (101,'wrong relation order',1,2,1);
-- name: catalog_relation_wrong_selection
INSERT INTO catalog_relations(id,label,relation,reference,recorded_selection) VALUES (101,'wrong relation selection',1,2,2);
-- name: catalog_relation_null_fallback
INSERT INTO catalog_relations(id,label,relation,reference,recorded_selection) VALUES (101,'null relation fallback',NULL,2147483648,2147483648);
-- name: catalog_relation_all_null
INSERT INTO catalog_relations(id,label,relation,reference,recorded_selection) VALUES (101,'null relation',NULL,NULL,NULL);
-- name: catalog_namespace_high
INSERT INTO catalog_relations(id,label,namespace,namespace_wire) VALUES (101,'high namespace',4294967295,'\xffffffff');
-- name: catalog_namespace_wrong_wire
INSERT INTO catalog_relations(id,label,namespace,namespace_wire) VALUES (101,'wrong namespace wire',1,'\x00000000');
-- name: catalog_row_type_high
INSERT INTO catalog_relations(id,label,row_type,row_type_wire) VALUES (101,'high row type',2147483648,'\x80000000');
-- name: catalog_row_type_wrong_wire
INSERT INTO catalog_relations(id,label,row_type,row_type_wire) VALUES (101,'wrong row type wire',1,'\x00000000');
-- name: catalog_routines_all_words
INSERT INTO catalog_routines(id,relation_id,label,procedure,function_name,operator_signature,operator_name,procedure_wire,function_wire,signature_wire,operator_wire) VALUES (101,1,'all routine words',0,2147483647,2147483648,4294967295,'\x00000000','\x7fffffff','\x80000000','\xffffffff');
-- name: catalog_procedure_high
INSERT INTO catalog_routines(id,relation_id,label,procedure,procedure_wire) VALUES (101,1,'high procedure',4294967295,'\xffffffff');
-- name: catalog_procedure_wrong_wire
INSERT INTO catalog_routines(id,relation_id,label,procedure,procedure_wire) VALUES (101,1,'wrong procedure wire',1,'\x00000000');
-- name: catalog_function_high
INSERT INTO catalog_routines(id,relation_id,label,function_name,function_wire) VALUES (101,1,'high function',4294967295,'\xffffffff');
-- name: catalog_function_wrong_wire
INSERT INTO catalog_routines(id,relation_id,label,function_name,function_wire) VALUES (101,1,'wrong function wire',1,'\x00000000');
-- name: catalog_signature_high
INSERT INTO catalog_routines(id,relation_id,label,operator_signature,signature_wire) VALUES (101,1,'high signature',4294967295,'\xffffffff');
-- name: catalog_signature_wrong_wire
INSERT INTO catalog_routines(id,relation_id,label,operator_signature,signature_wire) VALUES (101,1,'wrong signature wire',1,'\x00000000');
-- name: catalog_operator_high
INSERT INTO catalog_routines(id,relation_id,label,operator_name,operator_wire) VALUES (101,1,'high operator',2147483648,'\x80000000');
-- name: catalog_operator_wrong_wire
INSERT INTO catalog_routines(id,relation_id,label,operator_name,operator_wire) VALUES (101,1,'wrong operator wire',1,'\x00000000');
-- name: catalog_routines_null
INSERT INTO catalog_routines(id,relation_id,label,procedure,function_name,operator_signature,operator_name) VALUES (101,1,'null routines',NULL,NULL,NULL,NULL);
-- name: catalog_settings_all_words
INSERT INTO catalog_settings(id,relation_id,label,collation_id,configuration,dictionary,owner_role,collation_wire,configuration_wire,dictionary_wire,role_wire) VALUES (101,1,'all setting words',0,2147483647,2147483648,4294967295,'\x00000000','\x7fffffff','\x80000000','\xffffffff');
-- name: catalog_collation_high
INSERT INTO catalog_settings(id,relation_id,label,collation_id,collation_wire) VALUES (101,1,'high collation_id',4294967295,'\xffffffff');
-- name: catalog_collation_wrong_wire
INSERT INTO catalog_settings(id,relation_id,label,collation_id,collation_wire) VALUES (101,1,'wrong collation_id wire',1,'\x00000000');
-- name: catalog_configuration_high
INSERT INTO catalog_settings(id,relation_id,label,configuration,configuration_wire) VALUES (101,1,'high configuration',4294967295,'\xffffffff');
-- name: catalog_configuration_wrong_wire
INSERT INTO catalog_settings(id,relation_id,label,configuration,configuration_wire) VALUES (101,1,'wrong configuration wire',1,'\x00000000');
-- name: catalog_dictionary_high
INSERT INTO catalog_settings(id,relation_id,label,dictionary,dictionary_wire) VALUES (101,1,'high dictionary',2147483648,'\x80000000');
-- name: catalog_dictionary_wrong_wire
INSERT INTO catalog_settings(id,relation_id,label,dictionary,dictionary_wire) VALUES (101,1,'wrong dictionary wire',1,'\x00000000');
-- name: catalog_role_high
INSERT INTO catalog_settings(id,relation_id,label,owner_role,role_wire) VALUES (101,1,'high role',4294967295,'\xffffffff');
-- name: catalog_role_wrong_wire
INSERT INTO catalog_settings(id,relation_id,label,owner_role,role_wire) VALUES (101,1,'wrong role wire',1,'\x00000000');
-- name: catalog_settings_null
INSERT INTO catalog_settings(id,relation_id,label,collation_id,configuration,dictionary,owner_role) VALUES (101,1,'null settings',NULL,NULL,NULL,NULL);
-- name: catalog_import_decimal
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'decimal import','125',125,'\x0000007d',false);
-- name: catalog_import_octal
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'octal import','012',10,'\x0000000a',false);
-- name: catalog_import_high
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'high import','4294967295',4294967295,'\xffffffff',false);
-- name: catalog_import_zero
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'zero import','0',0,'\x00000000',false);
-- name: catalog_import_dash
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'sentinel import','-',0,'\x00000000',true);
-- name: catalog_import_null
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'null import',NULL,NULL,NULL,false);
-- name: catalog_import_wrong_wire
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'wrong import wire','1',1,'\x00000000',false);
-- name: catalog_import_wrong_lookup
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures) VALUES (101,1,'wrong import lookup','1',2,'\x00000001',false);
-- name: catalog_import_invalid_octal
INSERT INTO catalog_imports(id,relation_id,label,source,skip_signatures) VALUES (101,1,'invalid octal','08',false);
-- name: catalog_import_overflow
INSERT INTO catalog_imports(id,relation_id,label,source,skip_signatures) VALUES (101,1,'word overflow','4294967296',false);
-- name: catalog_import_uint64_overflow
INSERT INTO catalog_imports(id,relation_id,label,source,skip_signatures) VALUES (101,1,'unsigned long overflow','18446744073709551616',false);
-- name: catalog_import_empty
INSERT INTO catalog_imports(id,relation_id,label,source,skip_signatures) VALUES (101,1,'empty name','',false);
-- name: catalog_import_whitespace
INSERT INTO catalog_imports(id,relation_id,label,source,skip_signatures) VALUES (101,1,'whitespace name','  ',false);
