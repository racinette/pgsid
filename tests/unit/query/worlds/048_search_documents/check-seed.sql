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
-- name: document_edit_merged
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A b:2C','b:1B z:2','{a}','{A}','B','''a'':1A ''b'':2C,3B ''z'':4','''a'':1A','''a'':1B ''b'':2C','''b'':2C',false);
-- name: document_edit_wrong_merge
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A b:2C','b:1B z:2','{a}','{A}','B','''a'':1A ''b'':1B,2C ''z'':2','''a'':1A','''a'':1B ''b'':2C','''b'':2C',false);
-- name: document_edit_wrong_filter
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A b:2C','b:1B z:2','{a}','{A}','B','''a'':1A ''b'':2C,3B ''z'':4','''b'':2C','''a'':1B ''b'':2C','''b'':2C',false);
-- name: document_edit_wrong_weight
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A b:2C','b:1B z:2','{a}','{A}','B','''a'':1A ''b'':2C,3B ''z'':4','''a'':1A','''a'':1A ''b'':2C','''b'':2C',false);
-- name: document_edit_wrong_delete
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A b:2C','b:1B z:2','{a}','{A}','B','''a'':1A ''b'':2C,3B ''z'':4','''a'':1A','''a'':1B ''b'':2C','''a'':1A',false);
-- name: document_edit_null
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES(NULL,'z:1','{a}','{A}','B',NULL,NULL,NULL,NULL,false);
-- name: document_edit_empty
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('','','{}','{}','B','','','','',false);
-- name: document_edit_bad_filter_weight
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A','','{}','{?}','B','''a'':1A',NULL,'''a'':1A','''a'':1A',false);
-- name: document_edit_null_filter_weight
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:1A','','{}','{NULL}','B','''a'':1A',NULL,'''a'':1A','''a'':1A',false);
-- name: document_edit_skipped_invalid
INSERT INTO document_edits(source,continuation,selectors,weights,weight,expected_merged,expected_filtered,expected_reweighted,expected_deleted,bypass) VALUES('a:0','a:0','{','{?}','?',NULL,NULL,NULL,NULL,true);
-- name: document_terms_deduplicated
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{b,a,a}','''a'' ''b''','000000026100000062000000',true,false);
-- name: document_terms_wrong_document
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{b,a,a}','''b'' ''a''','000000026100000062000000',true,false);
-- name: document_terms_wrong_wire
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{b,a,a}','''a'' ''b''','',true,false);
-- name: document_terms_unicode
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{😀,é}','''é'' ''😀''',NULL,false,false);
-- name: document_terms_empty
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{}','','00000000',true,false);
-- name: document_terms_null
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES(NULL,NULL,NULL,true,false);
-- name: document_terms_null_element
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{a,NULL}',NULL,NULL,true,false);
-- name: document_terms_empty_element
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{""}',NULL,NULL,true,false);
-- name: document_terms_bad_array
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{',NULL,NULL,true,false);
-- name: document_terms_skipped_invalid
INSERT INTO document_terms(terms,expected_document,expected_wire,verify_wire,bypass) VALUES('{',NULL,NULL,true,true);
-- name: document_set_primary
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('a:1A',true,true,false);
-- name: document_set_alternate
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('z:2B',true,false,false);
-- name: document_set_absent
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('t:3C',false,false,false);
-- name: document_set_wrong_membership
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('z:2B',false,false,false);
-- name: document_set_wrong_record
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('z:2B',true,true,false);
-- name: document_set_null
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES(NULL,false,NULL,false);
-- name: document_set_empty
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('',false,false,false);
-- name: document_set_skipped_invalid
INSERT INTO document_reference_sets(source,expected_member,expected_record,bypass) VALUES('a:0',NULL,NULL,true);
-- name: document_default_matches
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('a:1A',true,true,false);
-- name: document_default_other
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('b',false,true,false);
-- name: document_default_wrong
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('b',true,true,false);
-- name: document_supplied_wrong
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('b',false,false,false);
-- name: document_default_null
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES(NULL,NULL,NULL,false);
-- name: document_default_empty
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('',false,true,false);
-- name: document_default_bad_input
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('a:0',NULL,NULL,false);
-- name: document_default_skipped
INSERT INTO document_default_windows(source,expected_default,expected_supplied,bypass) VALUES('a:0',NULL,NULL,true);
