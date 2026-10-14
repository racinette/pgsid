INSERT INTO protocol_bytes(id,label) VALUES (1,'root protocol');
INSERT INTO byte_selections(id,protocol_id,label,use_code) VALUES (1,1,'empty selection',true);
INSERT INTO byte_imports(id,protocol_id,label,skip_integer) VALUES (1,1,'empty import',false);
INSERT INTO ascii_byte_hashes(id,protocol_id,label) VALUES (1,1,'empty hash');
