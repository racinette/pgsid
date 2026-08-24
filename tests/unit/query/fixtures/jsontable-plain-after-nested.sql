-- JSON_TABLE ORDERS EACH LEVEL'S PLAIN COLUMNS BEFORE ITS NESTED PATHS'.
--
-- Found by the pg-regress replay (sqljson_jsontable.sql:469 — the corpus's
-- own comment beside the statement says "Parent columns xx1, xx appear
-- before NESTED ones", and the engine emitted document order, a PERMUTED
-- list). Document order and PostgreSQL's order coincide only while no plain
-- column FOLLOWS a nested path; this fixture puts one after, so the
-- column-sequence oracle holds the reordering: PostgreSQL's list is
-- (top, el), not (el, top).
--
-- `$.x` is absent from the document, so `top` is NULL on both rows; the
-- second array element is a JSON null, so `el` is NULL on one — both claims
-- witnessed on every execution.
SELECT jt.* FROM JSON_TABLE(
  '{"a": [1, null]}'::jsonb, '$'
  COLUMNS (
    NESTED PATH '$.a[*]' COLUMNS (el int PATH '$'),
    top int PATH '$.x'
  )
) AS jt
  -- @nullable
  -- @nullable
