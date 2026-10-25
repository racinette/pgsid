export const tsqueryDefaultSchema = `
CREATE TYPE query_range AS RANGE(subtype=tsquery);
CREATE FUNCTION query_defaults(lo tsquery DEFAULT 'a',hi tsquery DEFAULT 'zzzzzzzzzz')
 RETURNS query_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_tail(lo tsquery,hi tsquery DEFAULT 'zzzzzzzzzz',bounds text DEFAULT '[)')
 RETURNS query_range LANGUAGE internal IMMUTABLE AS 'range_constructor3';
CREATE FUNCTION query_constructed(lo tsquery DEFAULT 'a'::tsquery || 'b'::tsquery,hi tsquery DEFAULT 'zzzzzzzzzz | zzzzzzzzzz | zzzzzzzzzz')
 RETURNS query_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_null(lo tsquery DEFAULT NULL,hi tsquery DEFAULT 'zzzzzzzzzz')
 RETURNS query_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE DOMAIN query_domain AS tsquery CHECK(VALUE<>'bad'::tsquery) DEFAULT 'domain_default';
CREATE TYPE query_domain_range AS RANGE(subtype=query_domain);
CREATE FUNCTION query_domain_defaults(lo query_domain DEFAULT 'a',hi query_domain DEFAULT 'zzzzzzzzzz')
 RETURNS query_domain_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TYPE query_array_range AS RANGE(subtype=tsquery[]);
CREATE FUNCTION query_array_defaults(lo tsquery[] DEFAULT '{a,NULL}',hi tsquery[] DEFAULT '{zzzzzzzzzz}')
 RETURNS query_array_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_array_constructed(lo tsquery[] DEFAULT ARRAY['a'::tsquery,NULL],hi tsquery[] DEFAULT '{zzzzzzzzzz}')
 RETURNS query_array_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TYPE query_record AS(value tsquery,tail int4);
CREATE TYPE query_record_range AS RANGE(subtype=query_record);
CREATE FUNCTION query_record_defaults(lo query_record DEFAULT '(a,1)',hi query_record DEFAULT '(zzzzzzzzzz,2)')
 RETURNS query_record_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_record_constructed(lo query_record DEFAULT ROW('a'::tsquery,1)::query_record,hi query_record DEFAULT '(zzzzzzzzzz,2)')
 RETURNS query_record_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_interleaved(lo tsquery,OUT result tsquery,hi tsquery DEFAULT 'zzzzzzzzzz')
 LANGUAGE sql IMMUTABLE AS $$SELECT hi$$;

CREATE FUNCTION query_grouped(lo tsquery DEFAULT 'a & (b & c)',hi tsquery DEFAULT 'zzzzzzzzzz & (zzzzzzzzzz & zzzzzzzzzz)')
 RETURNS query_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_array_grouped(lo tsquery[] DEFAULT '{"a & (b & c)",NULL}',hi tsquery[] DEFAULT '{"zzzzzzzzzz & (zzzzzzzzzz & zzzzzzzzzz)",NULL}')
 RETURNS query_array_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_record_grouped(lo query_record DEFAULT '("a & (b & c)",1)',hi query_record DEFAULT '("zzzzzzzzzz & (zzzzzzzzzz & zzzzzzzzzz)",2)')
 RETURNS query_record_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
`
