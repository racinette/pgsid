INSERT INTO registry_names(id,label) VALUES (1,'root identifier');
INSERT INTO identifier_comparisons(id,registry_id,label) VALUES (1,1,'empty comparison');
INSERT INTO identifier_preferences(id,registry_id,label,use_primary) VALUES (1,1,'empty preference',false);
INSERT INTO identifier_imports(id,registry_id,label,bypass) VALUES (1,1,'empty import',false);
