-- A pg_catalog function's FROM-position SHAPE, and — since 2026-08-22 —
-- which of its columns can be NULL.
--
-- THE SHAPE. The walk's fallback for a function whose name the user catalog
-- cannot answer for is ONE column named after the function — right for
-- generate_series, and wrong for every builtin with NAMED OUTPUT COLUMNS:
-- json_each has key and value, and jsonb_array_elements has one column named
-- `value`, the fallback's own arity with a different name (the class only an
-- ordered-name comparison catches). pg_get_function_result cannot supply this
-- — a builtin declared with OUT parameters renders as `SETOF record`
-- (measured) — so the snapshot reassembles the shape from
-- proargnames/proallargtypes into CatalogSnapshot.builtinTableFunctions,
-- environment rather than schema, like builtinStrictFunctions. The soundness
-- suite's ordered name comparison against PostgreSQL's RowDescription is the
-- real oracle there.
--
-- THE FLAGS have no catalog source at all — `attnotnull` describes table
-- columns, not function outputs — so they are curated
-- (NON_NULL_BUILTIN_TABLE_COLUMNS) and measured against the one thing that
-- could put a NULL in these columns: a document holding a JSON null.
--
--   key    is non-null by the GRAMMAR. A JSON object's field names are
--          strings, so no document produces a NULL key and none produces a
--          json `null` in that position either.
--
--   value  is NULL, and the argument that it is not is the thing this file
--          exists to refute. It reads: a JSON null is a json DATUM, so
--          `json_each('{"a": null}')` yields a value PostgreSQL's own
--          `IS NULL` calls non-null. That is TRUE — and it was admitted to
--          the curated table on it, and PostgreSQL falsified the claim in
--          five data states. The claim is not about SQL's notion of NULL; it
--          is about what reaches the consumer, and the driver PARSES a json
--          datum, so the JSON null arrives as `null`.
--
-- The `_text` pair below is that finding pinned. `json_each_text` renders the
-- same document to a real SQL NULL by a completely different route, and the
-- two `value` columns are the SAME value at the type boundary these claims
-- describe. Identical verdicts, different underlying facts — which is why
-- both are here rather than one standing for the other.
--
-- Every nullable claim is witnessed on the `a` key of a document that carries
-- a JSON null. Nothing below is argued.
--
-- `json_each` is ALSO shadowed by a user function in this schema
-- (adversarial-3 finding 6), and PostgreSQL still runs pg_catalog's: this
-- fixture is the unqualified half of that precedence, and
-- pg-catalog-shadowed-from-shape.sql the qualified one.
SELECT
  e.key,               -- @notNull
  e.value,             -- @nullable  (a json `null` reaches the driver as null)
  t.key   AS tkey,     -- @notNull
  t.value AS tval,     -- @nullable  (a real SQL NULL, same value on the wire)
  a.value AS av,       -- @nullable
  -- The single-column builtins take the value reading one branch later
  -- (builtin-from-position-value.sql); no curated flag reaches them.
  g                    -- @notNull
FROM json_each('{"a": null, "b": 2}'::json) e
CROSS JOIN json_each_text('{"a": null, "b": 2}'::json) t
CROSS JOIN jsonb_array_elements('[null, 2]'::jsonb) a
CROSS JOIN generate_series(1, 2) g
