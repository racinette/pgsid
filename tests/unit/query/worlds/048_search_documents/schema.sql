-- @world checks
CREATE DOMAIN imported_document AS tsvector;
CREATE DOMAIN search_document AS imported_document;

CREATE TABLE document_imports (
 source text,
 expected_normalized text,
 term_budget integer,
 bypass boolean,
 CONSTRAINT document_normalized CHECK(CASE WHEN bypass THEN true ELSE (source::search_document)::text=expected_normalized END),
 CONSTRAINT document_term_budget CHECK(CASE WHEN bypass THEN true ELSE length(COALESCE(source::search_document,NULL::tsvector))<=term_budget END)
);

CREATE TABLE document_weights (
 source text,
 weight "char",
 expected_weighted text,
 expected_stripped text,
 bypass boolean,
 CONSTRAINT document_weighted CHECK(CASE WHEN bypass THEN true ELSE setweight(source::tsvector,weight)::text=expected_weighted END),
 CONSTRAINT document_stripped CHECK(CASE WHEN bypass THEN true ELSE strip(pg_catalog.tsvector(source))::text=expected_stripped END)
);

CREATE TABLE document_ordering (
 source text,
 reference text,
 expected_less boolean,
 choose_source boolean,
 bypass boolean,
 CONSTRAINT document_order CHECK(CASE WHEN bypass THEN true ELSE (source::tsvector<reference::tsvector)=expected_less END),
 CONSTRAINT document_selected CHECK(CASE WHEN bypass THEN true ELSE (CASE WHEN choose_source THEN source::tsvector ELSE reference::tsvector END)=reference::tsvector END),
 CONSTRAINT document_lexemes CHECK(CASE WHEN bypass THEN true ELSE cardinality(tsvector_to_array(COALESCE(source::tsvector,reference::tsvector)))<=length(reference::tsvector) END)
);

CREATE DOMAIN searchable_document AS search_document CHECK(VALUE<>''::tsvector);
CREATE TABLE document_publication (
 source text,
 expected_reference boolean,
 require_nonempty boolean,
 bypass boolean,
 CONSTRAINT document_reference CHECK(CASE WHEN bypass THEN true ELSE (source::tsvector='a:1A'::tsvector)=expected_reference END),
 CONSTRAINT document_publishable CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN require_nonempty THEN source::searchable_document IS NOT NULL ELSE COALESCE(source::tsvector,'a:1A'::tsvector)<>''::tsvector END END)
);

CREATE TABLE document_edits (
 source text,
 continuation text,
 selectors text,
 weights text,
 weight "char",
 expected_merged text,
 expected_filtered text,
 expected_reweighted text,
 expected_deleted text,
 bypass boolean,
 CONSTRAINT document_merged CHECK(CASE WHEN bypass THEN true ELSE (source::tsvector||continuation::tsvector)::text=expected_merged END),
 CONSTRAINT document_filtered CHECK(CASE WHEN bypass THEN true ELSE ts_filter(source::tsvector,weights::"char"[])::text=expected_filtered END),
 CONSTRAINT document_reweighted CHECK(CASE WHEN bypass THEN true ELSE setweight(source::tsvector,weight,selectors::text[])::text=expected_reweighted END),
 CONSTRAINT document_deleted CHECK(CASE WHEN bypass THEN true ELSE ts_delete(source::tsvector,selectors::text[])::text=expected_deleted END)
);

CREATE TABLE document_terms (
 terms text,
 expected_document text,
 expected_wire text,
 verify_wire boolean,
 bypass boolean,
 CONSTRAINT document_constructed CHECK(CASE WHEN bypass THEN true ELSE array_to_tsvector(terms::text[])::text=expected_document END),
 CONSTRAINT document_wire CHECK(CASE WHEN bypass OR verify_wire IS NOT TRUE THEN true ELSE encode(tsvectorsend(array_to_tsvector(terms::text[])),'hex')=expected_wire END)
);

CREATE TYPE document_reference_set AS(head tsvector,options tsvector[]);
CREATE TABLE document_reference_sets (
 source text,
 expected_member boolean,
 expected_record boolean,
 bypass boolean,
 CONSTRAINT document_set_member CHECK(CASE WHEN bypass THEN true ELSE (ARRAY[source::tsvector]<@'{a:1A,NULL,z:2B}'::tsvector[])=expected_member END),
 CONSTRAINT document_set_record CHECK(CASE WHEN bypass THEN true ELSE (source::tsvector=($reference$("a:1A","{z:2B,NULL}")$reference$::document_reference_set).head)=expected_record END)
);

CREATE TYPE document_window AS RANGE(subtype=tsvector);
CREATE FUNCTION document_default_window(lo tsvector DEFAULT 'a:1A',hi tsvector DEFAULT 'zzzzzzzzzz')
 RETURNS document_window LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TABLE document_default_windows (
 source text,
 expected_default boolean,
 expected_supplied boolean,
 bypass boolean,
 CONSTRAINT document_default_head CHECK(CASE WHEN bypass THEN true ELSE (lower(document_default_window())=source::tsvector) IS NOT DISTINCT FROM expected_default END),
 CONSTRAINT document_supplied_head CHECK(CASE WHEN bypass THEN true ELSE (lower(document_default_window(source::tsvector))=source::tsvector) IS NOT DISTINCT FROM expected_supplied END)
);

CREATE TYPE document_score_state AS(totals float8[],reference tsvector);
CREATE TABLE document_score_updates (
 observation integer,
 minimum_updates integer,
 source text,
 expected_reference boolean,
 bypass boolean,
 CONSTRAINT document_score_count CHECK(CASE WHEN bypass THEN true ELSE (float8_accum(($state$("{1,2,3}",a)$state$::document_score_state).totals,observation::float8))[1]>minimum_updates::float8 END),
 CONSTRAINT document_score_reference CHECK(CASE WHEN bypass THEN true ELSE (source::tsvector=($state$("{1,2,3}",a)$state$::document_score_state).reference) IS NOT DISTINCT FROM expected_reference END)
);

CREATE TYPE document_score_window AS RANGE(subtype=float8[],multirange_type_name=document_score_windows);
CREATE TABLE document_archived_scores (
 source text,
 expected_reference boolean,
 observation integer,
 minimum_updates integer,
 bypass boolean,
 CONSTRAINT document_archived_reference CHECK(CASE WHEN bypass THEN true ELSE (lower('[a,zzzzzzzzzz)'::document_window)=source::tsvector) IS NOT DISTINCT FROM expected_reference END),
 CONSTRAINT document_archived_count CHECK(CASE WHEN bypass THEN true ELSE (float8_accum(lower('{["{1,2,3}","{2,2,3}"),["{3,2,3}","{4,2,3}")}'::document_score_windows),observation::float8))[1]>minimum_updates::float8 END)
);

CREATE TYPE document_record_window AS RANGE(subtype=document_reference_set,multirange_type_name=document_record_windows);
CREATE TABLE document_window_hashes (
 range_source text,
 members_source text,
 seed bigint,
 extended bool,
 bypass bool,
 CONSTRAINT document_window_hash_support CHECK(CASE WHEN bypass THEN true WHEN extended THEN hash_multirange_extended(members_source::document_record_windows,seed) IS NULL ELSE hash_range(range_source::document_record_window) IS NULL END)
);

CREATE DOMAIN compact_search_query AS tsquery CHECK(numnode(VALUE)<=5);
CREATE TABLE search_query_imports (
 source text,
 fallback_source text,
 expected_rendered text,
 node_budget integer,
 choose_source boolean,
 bypass boolean,
 CONSTRAINT query_normalized CHECK(CASE WHEN bypass THEN true ELSE (CASE WHEN choose_source THEN source::compact_search_query ELSE fallback_source::compact_search_query END)::text=expected_rendered END),
 CONSTRAINT query_node_budget CHECK(CASE WHEN bypass THEN true ELSE numnode(COALESCE(source::tsquery,fallback_source::tsquery))<=node_budget END),
 CONSTRAINT query_presence CHECK(CASE WHEN bypass THEN true ELSE (source::tsquery IS NULL) OR node_budget IS NOT NULL END)
);

CREATE TABLE search_query_templates (
 source text,
 expected_match boolean,
 right_associated boolean,
 bypass boolean,
 CONSTRAINT query_template_tree CHECK(CASE WHEN bypass THEN true ELSE (tsquerysend(source::tsquery)=tsquerysend(CASE WHEN right_associated THEN 'a & (b & c)'::compact_search_query ELSE '(a & b) & c'::compact_search_query END)) IS NOT DISTINCT FROM expected_match END),
 CONSTRAINT query_template_selection CHECK(bypass OR source IS NULL OR right_associated IS NOT NULL)
);

CREATE TABLE search_query_relations (
 source text,
 reference text,
 expected_order integer,
 expected_equal boolean,
 expected_contains boolean,
 bypass boolean,
 CONSTRAINT query_less_order CHECK(CASE WHEN bypass THEN true ELSE (source::tsquery<reference::tsquery) IS NOT DISTINCT FROM (expected_order<0) END),
 CONSTRAINT query_greater_order CHECK(CASE WHEN bypass THEN true ELSE (source::tsquery>reference::tsquery) IS NOT DISTINCT FROM (expected_order>0) END),
 CONSTRAINT query_equivalent CHECK(CASE WHEN bypass THEN true ELSE (source::tsquery=reference::tsquery) IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT query_terms_contained CHECK(CASE WHEN bypass THEN true ELSE (source::tsquery @> reference::tsquery) IS NOT DISTINCT FROM expected_contains END)
);

CREATE TABLE search_query_composition (
 source text,
 continuation text,
 gap integer,
 expected_phrase text,
 expected_terms integer,
 expected_negation text,
 bypass boolean,
 CONSTRAINT query_phrase_composed CHECK(CASE WHEN bypass THEN true ELSE tsquery_phrase(source::tsquery,continuation::tsquery,gap)::text IS NOT DISTINCT FROM expected_phrase END),
 CONSTRAINT query_terms_composed CHECK(CASE WHEN bypass THEN true ELSE numnode(source::tsquery && continuation::tsquery) IS NOT DISTINCT FROM expected_terms END),
 CONSTRAINT query_negation_composed CHECK(CASE WHEN bypass THEN true ELSE (!!(source::tsquery || continuation::tsquery))::text IS NOT DISTINCT FROM expected_negation END)
);

CREATE TABLE search_query_index_terms (
 source text,
 expected text,
 bypass boolean,
 CONSTRAINT query_index_terms CHECK(CASE WHEN bypass THEN true ELSE querytree(source::tsquery) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE search_query_rewrites (
 source text,
 target text,
 replacement text,
 expected text,
 bypass boolean,
 CONSTRAINT query_subtree_rewritten CHECK(CASE WHEN bypass THEN true ELSE ts_rewrite(source::tsquery,target::tsquery,replacement::tsquery)::text IS NOT DISTINCT FROM expected END)
);

CREATE TABLE search_query_matches (
 document text,
 query text,
 expected boolean,
 bypass boolean,
 CONSTRAINT match_document_query CHECK(CASE WHEN bypass THEN true ELSE (document::tsvector @@ query::tsquery) IS NOT DISTINCT FROM expected END),
 CONSTRAINT match_query_document CHECK(CASE WHEN bypass THEN true ELSE (query::tsquery @@ document::tsvector) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE search_result_scores (
 document text,
 query text,
 weights text,
 normalization integer,
 minimum_score real,
 bypass boolean,
 CONSTRAINT score_default CHECK(CASE WHEN bypass THEN true ELSE ts_rank(document::tsvector,query::tsquery)>=minimum_score END),
 CONSTRAINT score_normalized CHECK(CASE WHEN bypass THEN true ELSE ts_rank(document::tsvector,query::tsquery,normalization)>=minimum_score END),
 CONSTRAINT score_weighted CHECK(CASE WHEN bypass THEN true ELSE ts_rank(weights::real[],document::tsvector,query::tsquery)>=minimum_score END),
 CONSTRAINT score_weighted_normalized CHECK(CASE WHEN bypass THEN true ELSE ts_rank(weights::real[],document::tsvector,query::tsquery,normalization)>=minimum_score END),
 CONSTRAINT score_cover_default CHECK(CASE WHEN bypass THEN true ELSE ts_rank_cd(document::tsvector,query::tsquery)>=minimum_score END),
 CONSTRAINT score_cover_normalized CHECK(CASE WHEN bypass THEN true ELSE ts_rank_cd(document::tsvector,query::tsquery,normalization)>=minimum_score END),
 CONSTRAINT score_cover_weighted CHECK(CASE WHEN bypass THEN true ELSE ts_rank_cd(weights::real[],document::tsvector,query::tsquery)>=minimum_score END),
 CONSTRAINT score_cover_weighted_normalized CHECK(CASE WHEN bypass THEN true ELSE ts_rank_cd(weights::real[],document::tsvector,query::tsquery,normalization)>=minimum_score END)
);

CREATE TYPE query_reference_set AS(head tsquery,options tsquery[]);
CREATE TABLE search_query_sets (
 source text,
 reference text,
 expected_member boolean,
 expected_record boolean,
 expected_text text,
 bypass boolean,
 CONSTRAINT query_set_member CHECK(CASE WHEN bypass THEN true ELSE (ARRAY[source::tsquery]<@ARRAY['a'::tsquery,NULL::tsquery,'z'::tsquery]) IS NOT DISTINCT FROM expected_member END),
 CONSTRAINT query_set_record CHECK(CASE WHEN bypass THEN true ELSE ((ROW(source::tsquery,ARRAY[reference::tsquery])::query_reference_set).head=reference::tsquery) IS NOT DISTINCT FROM expected_record END),
 CONSTRAINT query_set_text CHECK(CASE WHEN bypass THEN true ELSE array_to_string(ARRAY[source::tsquery,NULL::tsquery,reference::tsquery],'|','-') IS NOT DISTINCT FROM expected_text END)
);
