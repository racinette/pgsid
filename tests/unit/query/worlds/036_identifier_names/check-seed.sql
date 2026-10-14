-- name: identifier_ascii
INSERT INTO registry_names(id,label,seed,identifier,rendered,wire,hash_word,hash_seeded) VALUES (101,'identifier_ascii',0,'Alpha','Alpha','\x416c706861',1378080625,-5694265466405267599);
-- name: identifier_utf8
INSERT INTO registry_names(id,label,seed,identifier,rendered,wire,hash_word,hash_seeded) VALUES (101,'identifier_utf8',0,'é😀','é😀','\xc3a9f09f9880',-606280436,-8970857853428636404);
-- name: identifier_spaces
INSERT INTO registry_names(id,label,seed,identifier,rendered,wire,hash_word,hash_seeded) VALUES (101,'identifier_spaces',0,'A ','A ','\x4120',-1104556960,4420931616170953824);
-- name: identifier_empty
INSERT INTO registry_names(id,label,seed,identifier,rendered,wire,hash_word,hash_seeded) VALUES (101,'identifier_empty',0,'','','\x',-1477818771,-6939563903564495251);
-- name: identifier_null
INSERT INTO registry_names(id,label,seed,identifier,rendered,wire,hash_word,hash_seeded) VALUES (101,'identifier_null',0,NULL,NULL,NULL,NULL,NULL);
-- name: identifier_wrong_text
INSERT INTO registry_names(id,label,seed,identifier,rendered) VALUES (101,'identifier_wrong_text',0,'Alpha','Beta');
-- name: identifier_wrong_wire
INSERT INTO registry_names(id,label,seed,identifier,wire) VALUES (101,'identifier_wrong_wire',0,'A','\x00');
-- name: identifier_wrong_hash
INSERT INTO registry_names(id,label,seed,identifier,hash_word) VALUES (101,'identifier_wrong_hash',0,'A',0);
-- name: identifier_wrong_seeded_hash
INSERT INTO registry_names(id,label,seed,identifier,hash_seeded) VALUES (101,'identifier_wrong_seeded_hash',0,'A',0);
-- name: comparison_equal
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal,precedes,different) VALUES (101,1,'comparison_equal','A','A',true,false,false);
-- name: comparison_ordered
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal,precedes,different) VALUES (101,1,'comparison_ordered','A','B',false,true,true);
-- name: comparison_spaces
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal,precedes,different) VALUES (101,1,'comparison_spaces','A ','A',false,false,true);
-- name: comparison_utf8
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal,precedes,different) VALUES (101,1,'comparison_utf8','é','😀',false,true,true);
-- name: comparison_nullable
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal,precedes,different) VALUES (101,1,'comparison_nullable',NULL,'A',NULL,NULL,true);
-- name: comparison_null
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal,precedes,different) VALUES (101,1,'comparison_null',NULL,NULL,NULL,NULL,NULL);
-- name: comparison_wrong_equal
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,names_equal) VALUES (101,1,'comparison_wrong_equal','A','B',true);
-- name: comparison_wrong_order
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,precedes) VALUES (101,1,'comparison_wrong_order','A','B',false);
-- name: comparison_wrong_distinct
INSERT INTO identifier_comparisons(id,registry_id,label,proposed,reference,different) VALUES (101,1,'comparison_wrong_distinct','A','A',true);
-- name: preference_primary
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,selected,smallest,largest,changed) VALUES (101,1,'preference_primary','B','A',true,'B','A','B','B');
-- name: preference_fallback
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,selected,smallest,largest,changed) VALUES (101,1,'preference_fallback','B','A',false,'A','A','B','B');
-- name: preference_equal
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,selected,smallest,largest,changed) VALUES (101,1,'preference_equal','A','A',true,'A','A','A',NULL);
-- name: preference_nullable
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,selected,smallest,largest,changed) VALUES (101,1,'preference_nullable',NULL,'B',false,'B','B','B',NULL);
-- name: preference_null
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,selected,smallest,largest,changed) VALUES (101,1,'preference_null',NULL,NULL,true,NULL,NULL,NULL,NULL);
-- name: preference_wrong_selected
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,selected) VALUES (101,1,'preference_wrong_selected','B','A',true,'A');
-- name: preference_wrong_smallest
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,smallest) VALUES (101,1,'preference_wrong_smallest','B','A',false,'B');
-- name: preference_wrong_largest
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,largest) VALUES (101,1,'preference_wrong_largest','B','A',false,'A');
-- name: preference_wrong_changed
INSERT INTO identifier_preferences(id,registry_id,label,primary_name,fallback_name,use_primary,changed) VALUES (101,1,'preference_wrong_changed','B','A',false,'A');
-- name: import_empty
INSERT INTO identifier_imports(id,registry_id,label,source,recorded,bypass) VALUES (101,1,'import_empty','','',false);
-- name: import_wrong_empty
INSERT INTO identifier_imports(id,registry_id,label,source,recorded,bypass) VALUES (101,1,'import_wrong_empty','','wrong',false);
-- name: import_null
INSERT INTO identifier_imports(id,registry_id,label,source,recorded,bypass) VALUES (101,1,'import_null',NULL,NULL,false);
-- name: import_bypassed_width
INSERT INTO identifier_imports(id,registry_id,label,source,recorded,bypass) VALUES (101,1,'import_bypassed_width','deployment specific name width','ignored',true);
