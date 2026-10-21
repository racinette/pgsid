export const customDefaultSchema = `
CREATE SCHEMA "Default.Range";
CREATE TYPE "Default.Range".span AS RANGE(subtype=int4,multirange_type_name=default_set);
CREATE FUNCTION "Default.Range".closed(lo int4 DEFAULT 1,hi int4 DEFAULT 3,bounds text DEFAULT '[]')
 RETURNS "Default.Range".span LANGUAGE internal IMMUTABLE AS 'range_constructor3';
CREATE FUNCTION "Default.Range".calculated(lo int4 DEFAULT abs(-2),hi int4 DEFAULT (3+2),bounds text DEFAULT '[)')
 RETURNS "Default.Range".span LANGUAGE internal IMMUTABLE AS 'range_constructor3';
CREATE FUNCTION "Default.Range".null_bound(lo int4 DEFAULT NULL,hi int4 DEFAULT 3)
 RETURNS "Default.Range".span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION "Default.Range".pack(item "Default.Range".span DEFAULT '[1,3)'::"Default.Range".span)
 RETURNS public.default_set LANGUAGE internal IMMUTABLE STRICT AS 'multirange_constructor1';
CREATE FUNCTION "Default.Range".null_pack(item "Default.Range".span DEFAULT NULL)
 RETURNS public.default_set LANGUAGE internal IMMUTABLE STRICT AS 'multirange_constructor1';
CREATE FUNCTION "Default.Range".many(VARIADIC items "Default.Range".span[] DEFAULT ARRAY['[1,3)'::"Default.Range".span,'[5,7)'::"Default.Range".span])
 RETURNS public.default_set LANGUAGE internal IMMUTABLE STRICT AS 'multirange_constructor2';
CREATE FUNCTION "Default.Range".empty_many(VARIADIC items "Default.Range".span[] DEFAULT '{}')
 RETURNS public.default_set LANGUAGE internal IMMUTABLE STRICT AS 'multirange_constructor2';
CREATE FUNCTION "Default.Range".null_many(VARIADIC items "Default.Range".span[] DEFAULT NULL)
 RETURNS public.default_set LANGUAGE internal IMMUTABLE STRICT AS 'multirange_constructor2';
CREATE DOMAIN "Default.Range".positive AS int4 CHECK(VALUE>0);
CREATE TYPE "Default.Range".positive_span AS RANGE(subtype="Default.Range".positive);
CREATE FUNCTION "Default.Range".positive_bounds(lo "Default.Range".positive DEFAULT 1,hi "Default.Range".positive DEFAULT 3)
 RETURNS "Default.Range".positive_span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TYPE "Default.Range".decimal_span AS RANGE(subtype=numeric);
CREATE FUNCTION "Default.Range".decimal_bounds(lo numeric DEFAULT 1.2000,hi numeric DEFAULT 3.40000)
 RETURNS "Default.Range".decimal_span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE TYPE "Default.Range".day_span AS RANGE(subtype=date);
CREATE FUNCTION "Default.Range".day_bounds(lo date DEFAULT '2000-01-02',hi date DEFAULT '2000-01-05')
 RETURNS "Default.Range".day_span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION "Default.Range".external_default() RETURNS int4 LANGUAGE sql IMMUTABLE AS $$SELECT 2$$;
CREATE FUNCTION "Default.Range".callback(lo int4 DEFAULT "Default.Range".external_default(),hi int4 DEFAULT 3)
 RETURNS "Default.Range".span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION "Default.Range".session_bound(lo int4 DEFAULT extract(day from current_date)::int4,hi int4 DEFAULT 40)
 RETURNS "Default.Range".span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION "Default.Range".division(lo int4 DEFAULT (1/0),hi int4 DEFAULT 3)
 RETURNS "Default.Range".span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
`
