-- name: document_normalization
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('b:3C a:2B a:1A','''a'':1A,2B ''b'':3C',2,false);
-- name: document_wrong_normalization
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('a:1A','''a'':1B',1,false);
-- name: document_too_many_terms
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('a b','''a'' ''b''',1,false);
-- name: document_empty
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('','',0,false);
-- name: document_null
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES(NULL,NULL,0,false);
-- name: document_unicode
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('😀:2 é:1','''é'':1 ''😀'':2',2,false);
-- name: document_invalid_position
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('a:0',NULL,1,false);
-- name: document_invalid_quoted_word
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('''',NULL,1,false);
-- name: document_skipped_invalid
INSERT INTO document_imports(source,expected_normalized,term_budget,bypass) VALUES('a:0',NULL,0,true);
-- name: document_reweighted
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A,2C b:3','B','''a'':1B,2B ''b'':3B','''a'' ''b''',false);
-- name: document_wrong_weight
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A','B','''a'':1A','''a''',false);
-- name: document_wrong_strip
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A','B','''a'':1B','''b''',false);
-- name: document_bad_weight
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A','?',NULL,NULL,false);
-- name: document_null_weight
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:1A',NULL,NULL,'''a''',false);
-- name: document_null_weighted_source
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES(NULL,'?',NULL,NULL,false);
-- name: document_skipped_bad_weight
INSERT INTO document_weights(source,weight,expected_weighted,expected_stripped,bypass) VALUES('a:0','?',NULL,NULL,true);
-- name: document_equal
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a:1','a:1',false,true,false);
-- name: document_size_order
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a','bb',true,false,false);
-- name: document_position_order
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a:2','a:1',true,false,false);
-- name: document_wrong_order
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a:2','a:1',false,false,false);
-- name: document_wrong_selection
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a','bb',true,true,false);
-- name: document_wrong_lexeme_count
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a b','a',false,false,false);
-- name: document_null_order
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES(NULL,'a',NULL,false,false);
-- name: document_skipped_order_error
INSERT INTO document_ordering(source,reference,expected_less,choose_source,bypass) VALUES('a:0','a',false,true,true);

-- name: document_reference_match
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:1A',true,true,false);
-- name: document_reference_other
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('bb',false,true,false);
-- name: document_reference_wrong
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:1A',false,false,false);
-- name: document_reference_wrong_other
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('bb',true,false,false);
-- name: document_empty_domain
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('',false,true,false);
-- name: document_empty_fallback
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('',false,false,false);
-- name: document_missing_fallback
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES(NULL,NULL,false,false);
-- name: document_missing_required
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES(NULL,NULL,true,false);
-- name: document_reference_syntax
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:0',NULL,false,false);
-- name: document_reference_skipped
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:0',NULL,true,true);
-- name: document_reference_unicode
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('é:1',false,true,false);
-- name: document_reference_normalized
INSERT INTO document_publication(source,expected_reference,require_nonempty,bypass) VALUES('a:1A a:1B',true,true,false);
