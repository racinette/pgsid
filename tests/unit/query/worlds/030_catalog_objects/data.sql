INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (1,'unsigned_identifier','4294967295'::oid,'\xffffffff'::bytea,'4294967295','4294967295'::oid);
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (1,1,'integer_casts','4294967295'::oid,-1,4294967295,-1);
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (1,1,'hexadecimal_import','0xffffffff','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
