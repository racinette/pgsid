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
-- name: document_score_updated
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,1,'a',true,false);
-- name: document_score_wrong_count
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,3,'a',true,false);
-- name: document_score_wrong_reference
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,1,'a',false,false);
-- name: document_score_null_observation
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(NULL,1,'a',true,false);
-- name: document_score_null_reference
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,1,NULL,NULL,false);
-- name: document_score_empty_reference
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,1,'',false,false);
-- name: document_score_bad_input
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,1,'a:0',NULL,false);
-- name: document_score_skipped
INSERT INTO document_score_updates(observation,minimum_updates,source,expected_reference,bypass) VALUES(4,1,'a:0',NULL,true);
-- name: document_archive_matches
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('a',true,4,1,false);
-- name: document_archive_other
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('bb',false,4,1,false);
-- name: document_archive_wrong_reference
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('a',false,4,1,false);
-- name: document_archive_wrong_count
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('a',true,4,3,false);
-- name: document_archive_null_observation
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('a',true,NULL,1,false);
-- name: document_archive_null_reference
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES(NULL,NULL,4,1,false);
-- name: document_archive_bad_input
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('a:0',NULL,4,1,false);
-- name: document_archive_skipped
INSERT INTO document_archived_scores(source,expected_reference,observation,minimum_updates,bypass) VALUES('a:0',NULL,4,1,true);
-- name: document_empty_record_window_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES('empty',NULL,0,false,false);
-- name: document_unbounded_record_window_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES('(,)',NULL,0,false,false);
-- name: document_null_record_window_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES(NULL,NULL,0,false,false);
-- name: document_skipped_record_window_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES('invalid',NULL,0,false,true);
-- name: document_empty_record_members_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES(NULL,'{}',0,true,false);
-- name: document_unbounded_record_members_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES(NULL,'{(,)}',0,true,false);
-- name: document_null_record_members_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES(NULL,NULL,0,true,false);
-- name: document_null_seed_record_members_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES(NULL,'{}',NULL,true,false);
-- name: document_skipped_record_members_hash
INSERT INTO document_window_hashes(range_source,members_source,seed,extended,bypass) VALUES(NULL,'invalid',0,true,true);
-- name: query_simple_terms
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a & b','z','''a'' & ''b''',3,true,false);
-- name: query_grouped_terms
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a & (b & c)','z','''a'' & ''b'' & ''c''',5,true,false);
-- name: query_phrase_and_weights
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a:*AB <2> b:D','z','''a'':*AB <2> ''b'':D',3,true,false);
-- name: query_unicode_terms
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('é | 😀','z','''é'' | ''😀''',3,true,false);
-- name: query_fallback
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES(NULL,'a | b','''a'' | ''b''',3,false,false);
-- name: query_empty
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('','z','',0,true,false);
-- name: query_wrong_rendering
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a & b','z','''a'' | ''b''',3,true,false);
-- name: query_over_budget
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a & b','z','''a'' & ''b''',2,true,false);
-- name: query_missing_budget
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a','z','''a''',NULL,true,false);
-- name: query_domain_limit
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a & b & c & d','z',NULL,7,true,false);
-- name: query_malformed
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a &','z',NULL,3,true,false);
-- name: query_skipped
INSERT INTO search_query_imports(source,fallback_source,expected_rendered,node_budget,choose_source,bypass) VALUES('a &','z',NULL,NULL,true,true);
-- name: query_right_template
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('a & (b & c)',true,true,false);
-- name: query_left_template
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('(a & b) & c',true,false,false);
-- name: query_different_template
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('a & (b & c)',false,false,false);
-- name: query_wrong_template_expectation
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('a & (b & c)',true,false,false);
-- name: query_null_template
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES(NULL,NULL,true,false);
-- name: query_missing_template_selection
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('(a & b) & c',true,NULL,false);
-- name: query_malformed_template
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('a &',NULL,true,false);
-- name: query_skipped_template
INSERT INTO search_query_templates(source,expected_match,right_associated,bypass) VALUES('a &',NULL,NULL,true);
-- name: query_relation_equal_flags
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a:A','a:*B',0,true,true,false);
-- name: query_relation_boolean_operator
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a | b','a & b',-1,false,true,false);
-- name: query_relation_node_count
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a & b','a',1,false,true,false);
-- name: query_relation_missing_term
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a','a & b',-1,false,false,false);
-- name: query_relation_phrase_distance
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a <2> b','a <1> b',-1,false,true,false);
-- name: query_relation_grouping
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a & (b & c)','(a & b) & c',-1,false,true,false);
-- name: query_relation_crc_collision
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('fGEtsNKMDB','6P7Sag1hsi',1,false,false,false);
-- name: query_relation_null
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES(NULL,'a',NULL,NULL,NULL,false);
-- name: query_relation_wrong_order
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a <2> b','a <1> b',1,false,true,false);
-- name: query_relation_wrong_equality
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a:A','a:*B',0,false,true,false);
-- name: query_relation_wrong_membership
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a:*','abc',-1,false,true,false);
-- name: query_relation_bad_grammar
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a &','b',NULL,NULL,NULL,false);
-- name: query_relation_skipped
INSERT INTO search_query_relations(source,reference,expected_order,expected_equal,expected_contains,bypass) VALUES('a &','b',NULL,NULL,NULL,true);
-- name: query_construct_pair
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a','b',2,'''a'' <2> ''b''',3,'!( ''a'' | ''b'' )',false);
-- name: query_construct_empty_head
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('','b',1,'''b''',1,'!''b''',false);
-- name: query_construct_empty_pair
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('','',0,'',0,'',false);
-- name: query_construct_weighted
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a:A','b:*B',0,'''a'':A <0> ''b'':*B',3,'!( ''a'':A | ''b'':*B )',false);
-- name: query_construct_grouped
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a & (b & c)','d',1,'( ''a'' & ''b'' & ''c'' ) <-> ''d''',7,'!( ''a'' & ''b'' & ''c'' | ''d'' )',false);
-- name: query_construct_unicode
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('é:*AB','😀:D',16384,'''é'':*AB <16384> ''😀'':D',3,'!( ''é'':*AB | ''😀'':D )',false);
-- name: query_construct_null_source
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES(NULL,'b',1,NULL,NULL,NULL,false);
-- name: query_construct_null_gap
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a','b',NULL,NULL,3,'!( ''a'' | ''b'' )',false);
-- name: query_construct_wrong_phrase
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a','b',2,'''a'' <-> ''b''',3,'!( ''a'' | ''b'' )',false);
-- name: query_construct_wrong_terms
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a','b',2,'''a'' <2> ''b''',2,'!( ''a'' | ''b'' )',false);
-- name: query_construct_wrong_negation
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a','b',2,'''a'' <2> ''b''',3,'''a'' | ''b''',false);
-- name: query_construct_bad_gap
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('','b',-1,NULL,1,'!''b''',false);
-- name: query_construct_bad_source
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a &','b',NULL,NULL,NULL,NULL,false);
-- name: query_construct_skipped
INSERT INTO search_query_composition(source,continuation,gap,expected_phrase,expected_terms,expected_negation,bypass) VALUES('a &','b',-1,NULL,NULL,NULL,true);
-- name: query_index_empty
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('','',false);
-- name: query_index_null
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES(NULL,NULL,false);
-- name: query_index_double_not
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('!!a','T',false);
-- name: query_index_or_unrestricted
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a | !b','T',false);
-- name: query_index_and_reduced
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a & !b','''a''',false);
-- name: query_index_phrase_reduced
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('(a | !b) <3> c','''c''',false);
-- name: query_index_phrase_retained
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a <2> (b & !c)','''a'' <2> ''b''',false);
-- name: query_index_flags
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('é:*AB & !z','''é'':*AB',false);
-- name: query_index_wrong_unrestricted
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a & !b','T',false);
-- name: query_index_wrong_reduction
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a | !b','''a''',false);
-- name: query_index_bad_source
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a &',NULL,false);
-- name: query_index_skipped
INSERT INTO search_query_index_terms(source,expected,bypass) VALUES('a &',NULL,true);
-- name: query_rewrite_single
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a','a','x','''x''',false);
-- name: query_rewrite_no_reentry
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a','a','a & b','''a'' & ''b''',false);
-- name: query_rewrite_normalized_miss
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a & b & c & d','zz','x','''c'' & ''b'' & ''a'' & ''d''',false);
-- name: query_rewrite_subset
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a & b & c & d','b & d','x | y','''c'' & ''a'' & ( ''y'' | ''x'' )',false);
-- name: query_rewrite_not_deleted
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a & !b','b','','''a''',false);
-- name: query_rewrite_all_deleted
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a | a','a','','',false);
-- name: query_rewrite_empty_target
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a & (b & c)','','x','''a'' & ''b'' & ''c''',false);
-- name: query_rewrite_null_source
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES(NULL,'a','x',NULL,false);
-- name: query_rewrite_null_replacement
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a','a',NULL,NULL,false);
-- name: query_rewrite_flags
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a:A','a:*D','x:B','''x'':B',false);
-- name: query_rewrite_wrong_value
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a','a','x','''a''',false);
-- name: query_rewrite_bad_source
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a &','a','x',NULL,false);
-- name: query_rewrite_null_before_error
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES(NULL,'a &','x',NULL,false);
-- name: query_rewrite_skipped
INSERT INTO search_query_rewrites(source,target,replacement,expected,bypass) VALUES('a &','a &','x &',NULL,true);
-- name: query_match_term
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1','a',true,false);
-- name: query_match_absent
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1','b',false,false);
-- name: query_match_weight
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1D ab:2B','a:*B',true,false);
-- name: query_match_stripped_weight
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a','a:A',true,false);
-- name: query_match_phrase
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1 b:2','a <-> b',true,false);
-- name: query_match_reversed_phrase
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:2 b:1','a <-> b',false,false);
-- name: query_match_missing_positions
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a b:2','a <-> b',false,false);
-- name: query_match_negated_missing_positions
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a b:2','!(a <-> b)',true,false);
-- name: query_match_prefix_positions
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1A ab:2B b:3','a:* <-> b',true,false);
-- name: query_match_prefix_weights
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1A ab:2B b:3','a:*A <-> b',false,false);
-- name: query_match_unicode
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('é:1 日本:2 😀:3','é <-> 日本 <-> 😀',true,false);
-- name: query_match_empty
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1','',false,false);
-- name: query_match_null
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES(NULL,'a',NULL,false);
-- name: query_match_wrong_value
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:1','a',false,false);
-- name: query_match_bad_query_after_null
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES(NULL,'a &',NULL,false);
-- name: query_match_skipped
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:','a &',NULL,true);
-- name: query_match_negated_beyond_document
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:16383','a <-> !missing',true,false);
-- name: query_match_wrapped_position
INSERT INTO search_query_matches(document,query,expected,bypass) VALUES('a:16383','(a <-> !missing) <0> a',false,false);
-- name: score_term
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{0.1,0.2,0.4,1}',0,0.05,false);
-- name: score_high_threshold
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{0.1,0.2,0.4,1}',0,1,false);
-- name: score_proximity
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1A b:2B','a & b','{0.1,0.2,0.4,1}',0,0,false);
-- name: score_normalized
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1A b:2B','a & b','{0.1,0.2,0.4,1}',63,0,false);
-- name: score_custom_weights
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{1,1,1,1}',0,0.05,false);
-- name: score_stripped
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a b','a & b','{0.1,0.2,0.4,1}',32,0,false);
-- name: score_empty
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('','a','{0.1,0.2,0.4,1}',0,0,false);
-- name: score_empty_rejected
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('','a','{0.1,0.2,0.4,1}',0,0.1,false);
-- name: score_null_document
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES(NULL,'a','{}',0,0,false);
-- name: score_null_query
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1',NULL,'{}',0,0,false);
-- name: score_null_weights
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a',NULL,0,0,false);
-- name: score_null_threshold
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{0.1,0.2,0.4,1}',0,NULL,false);
-- name: score_bad_shape
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{}',0,0,false);
-- name: score_bad_weight
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{2,1,1,1}',0,0,false);
-- name: score_null_weight
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1','a','{NULL,1,1,1}',0,0,false);
-- name: score_skipped
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:','a &','broken',0,1,true);
-- name: score_cover_phrase_miss
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1 b:3','a <-> b','{0.1,0.2,0.4,1}',0,0.01,false);
-- name: score_cover_multiple_spans
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a:1A,4B,10C b:2B,5C,9D','a & b','{0.1,0.2,0.4,1}',4,0.001,false);
-- name: score_cover_stripped_rejected
INSERT INTO search_result_scores(document,query,weights,normalization,minimum_score,bypass) VALUES('a','a','{0.1,0.2,0.4,1}',0,0.01,false);
-- name: query_set_term
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a','a',true,true,'''a''|-|''a''',false);
-- name: query_set_modifiers
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a:A','a',true,true,'''a'':A|-|''a''',false);
-- name: query_set_different
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('z','a',true,false,'''z''|-|''a''',false);
-- name: query_set_absent
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('missing','missing',false,true,'''missing''|-|''missing''',false);
-- name: query_set_compound
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a & b','a & b',false,true,'''a'' & ''b''|-|''a'' & ''b''',false);
-- name: query_set_grouping
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a & (b & c)','(a & b) & c',false,false,'''a'' & ''b'' & ''c''|-|''a'' & ''b'' & ''c''',false);
-- name: query_set_null
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES(NULL,'a',false,NULL,'-|-|''a''',false);
-- name: query_set_all_null
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES(NULL,NULL,false,NULL,'-|-|-',false);
-- name: query_set_wrong_member
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a','a',false,true,'''a''|-|''a''',false);
-- name: query_set_wrong_record
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a','a',true,false,'''a''|-|''a''',false);
-- name: query_set_wrong_text
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a','a',true,true,'wrong',false);
-- name: query_set_bad_input
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a &','a',NULL,NULL,NULL,false);
-- name: query_set_skipped
INSERT INTO search_query_sets(source,reference,expected_member,expected_record,expected_text,bypass) VALUES('a &','b |',NULL,NULL,NULL,true);
-- name: archived_query_original_grouping
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('a & (b & c)',true,false,false);
-- name: archived_query_other_grouping
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('(a & b) & c',false,true,false);
-- name: archived_query_different_terms
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('a',false,false,false);
-- name: archived_query_null
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES(NULL,NULL,NULL,false);
-- name: archived_query_wrong_head
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('a & (b & c)',false,false,false);
-- name: archived_query_wrong_option
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('a & (b & c)',true,true,false);
-- name: archived_query_bad_input
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('a &',NULL,NULL,false);
-- name: archived_query_skipped
INSERT INTO archived_query_templates(source,expected_head,expected_option,bypass) VALUES('a &',NULL,NULL,true);
-- name: query_window_term
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('[a,zzzzzzzzzz)','{[a,zzzzzzzzzz)}','a',true,false,false);
-- name: query_window_different_nodes
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('[a,zzzzzzzzzz)','{[a,zzzzzzzzzz)}','a & (b & c)',false,true,false);
-- name: query_window_preserved_tree
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('["a & (b & c)",)','{["a & (b & c)",)}','a & (b & c)',true,true,false);
-- name: query_window_different_tree
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('(,)','{(,)}','(a & b) & c',true,false,false);
-- name: query_window_null_term
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('empty','{}',NULL,NULL,NULL,false);
-- name: query_window_null_source
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES(NULL,NULL,'a',NULL,false,false);
-- name: query_window_wrong_default
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('(,)','{(,)}','a & (b & c)',true,false,false);
-- name: query_window_bad_term
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('(,)','{(,)}','a &',NULL,NULL,false);
-- name: query_window_skipped
INSERT INTO query_window_templates(source,members,term,expected_member,expected_default,bypass) VALUES('bad','bad','a &',NULL,NULL,true);
