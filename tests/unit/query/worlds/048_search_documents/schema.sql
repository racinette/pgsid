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
