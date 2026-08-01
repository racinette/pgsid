-- USING is an equality on each named column, and the presence fixpoint now
-- receives the synthesized conjuncts exactly as if they were spelled ON:
-- under the INNER USING join every row proves both sides' id non-null, and
-- the strict conjunct's presence promotion means u's columns keep their
-- base nullability (email notNull, val nullable — witnessed by sparse's
-- NULL u.val). t.name stays nullable: the qual says nothing about it.
SELECT
  u.email AS em,   -- @notNull
  u.val AS uv,     -- @nullable
  t.name AS nm     -- @nullable
FROM t JOIN u USING (id)
