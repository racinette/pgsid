-- The SQL/JSON dedicated nodes (PG16+ syntax; json_build_object and friends
-- stay FuncCalls on the ALWAYS_NOT_NULL list). Value-list constructors
-- always produce a container — a NULL member is absorbed or serialized
-- (measured 2026-08-01) — while JSON_SCALAR is strict (NULL in → NULL out)
-- and IS JSON is NULL for NULL input: a predicate, but not a total one.
-- XMLELEMENT constructs an element even from NULL children. JSON_ARRAY of a
-- subquery is deliberately NOT upgraded: over an empty subquery it returns
-- NULL (measured), so the query form keeps the conservative fallback.
SELECT
  json_object('k' VALUE t.name) AS obj,   -- @notNull
  json_array(t.name, 1) AS arr,           -- @notNull
  JSON_SCALAR(t.id) AS scal,              -- @notNull
  JSON_SCALAR(t.name) AS scal_n,          -- @nullable
  t.name IS JSON AS isj,                  -- @nullable
  XMLELEMENT(NAME e, t.name) AS xel       -- @notNull
FROM t
