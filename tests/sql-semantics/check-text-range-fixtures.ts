export const textRangeSchema = `
CREATE SCHEMA "Text.Range";
CREATE TYPE "Text.Range".words AS RANGE(subtype=text,collation="C",multirange_type_name=word_sets);
CREATE TYPE "Text.Range".default_words AS RANGE(subtype=text,multirange_type_name=default_word_sets);
CREATE DOMAIN "Text.Range".bound AS text CHECK(VALUE<>'');
CREATE TYPE "Text.Range".bound_words AS RANGE(subtype="Text.Range".bound,collation="C",multirange_type_name=bound_word_sets);
`
