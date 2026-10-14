INSERT INTO catalog_relations(id,label,relation,namespace,row_type,relation_wire,namespace_wire,row_type_wire,recorded_word,reference,recorded_order,recorded_selection)
VALUES (1,'seed export',1,2,3,'\x00000001','\x00000002','\x00000003',1,2,-1,1);
INSERT INTO catalog_routines(id,relation_id,label,procedure,function_name,operator_signature,operator_name,procedure_wire,function_wire,signature_wire,operator_wire)
VALUES (1,1,'seed routines',4,5,6,7,'\x00000004','\x00000005','\x00000006','\x00000007');
INSERT INTO catalog_settings(id,relation_id,label,collation_id,configuration,dictionary,owner_role,collation_wire,configuration_wire,dictionary_wire,role_wire)
VALUES (1,1,'seed settings',8,9,10,11,'\x00000008','\x00000009','\x0000000a','\x0000000b');
INSERT INTO catalog_imports(id,relation_id,label,source,recorded_word,recorded_wire,skip_signatures)
VALUES (1,1,'seed numeric import','12',12,'\x0000000c',false);
