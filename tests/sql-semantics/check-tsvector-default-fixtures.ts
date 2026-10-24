export const tsvectorDefaultSchema = `
CREATE TYPE vector_range AS RANGE(subtype=tsvector);
CREATE FUNCTION vector_defaults(lo tsvector DEFAULT 'a',hi tsvector DEFAULT 'zzzzzzzzzz')
 RETURNS vector_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION vector_tail(lo tsvector,hi tsvector DEFAULT 'zzzzzzzzzz',bounds text DEFAULT '[)')
 RETURNS vector_range LANGUAGE internal IMMUTABLE AS 'range_constructor3';
CREATE FUNCTION vector_constructed(lo tsvector DEFAULT 'a'::tsvector || 'b'::tsvector,hi tsvector DEFAULT 'zzzzzzzzzz')
 RETURNS vector_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION vector_null(lo tsvector DEFAULT NULL,hi tsvector DEFAULT 'zzzzzzzzzz')
 RETURNS vector_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE DOMAIN vector_domain AS tsvector CHECK(VALUE<>'bad'::tsvector) DEFAULT 'domain_default';
CREATE TYPE vector_domain_range AS RANGE(subtype=vector_domain);
CREATE FUNCTION vector_domain_defaults(lo vector_domain DEFAULT 'a',hi vector_domain DEFAULT 'zzzzzzzzzz')
 RETURNS vector_domain_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TYPE vector_array_range AS RANGE(subtype=tsvector[]);
CREATE FUNCTION vector_array_defaults(lo tsvector[] DEFAULT '{a,NULL}',hi tsvector[] DEFAULT '{zzzzzzzzzz}')
 RETURNS vector_array_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION vector_array_constructed(lo tsvector[] DEFAULT ARRAY['a'::tsvector,NULL],hi tsvector[] DEFAULT '{zzzzzzzzzz}')
 RETURNS vector_array_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TYPE vector_record AS(value tsvector,tail int4);
CREATE TYPE vector_record_range AS RANGE(subtype=vector_record);
CREATE FUNCTION vector_record_defaults(lo vector_record DEFAULT '(a,1)',hi vector_record DEFAULT '(zzzzzzzzzz,2)')
 RETURNS vector_record_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION vector_record_constructed(lo vector_record DEFAULT ROW('a'::tsvector,1)::vector_record,hi vector_record DEFAULT '(zzzzzzzzzz,2)')
 RETURNS vector_record_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION vector_interleaved(lo tsvector,OUT result tsvector,hi tsvector DEFAULT 'zzzzzzzzzz')
 LANGUAGE sql IMMUTABLE AS $$SELECT hi$$;
`
