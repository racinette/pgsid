INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('a:1A','''a'':1A',1,false);
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A','B','''a'':1B','''a''',false);
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a:1','a:1',false,true,false);
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:1A',true,true,false);
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A b:2C','b:1B z:2','{a}','{A}','B','''a'':1A ''b'':2C,3B ''z'':4','''a'':1A','''a'':1B ''b'':2C','''b'':2C',false);
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{b,a,a}','''a'' ''b''','000000026100000062000000',true,false);
