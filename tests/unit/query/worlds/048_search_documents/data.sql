INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('a:1A','''a'':1A',1,false);
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A','B','''a'':1B','''a''',false);
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a:1','a:1',false,true,false);
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:1A',true,true,false);
