-- @unwitnessable 0: json_each's key is the object's field name — never NULL
-- @unwitnessable 1: its value is a json value; a JSON null is a json datum,
--   not a SQL NULL, so this column cannot be NULL either
-- @unwitnessable 2: jsonb_array_elements' element, same reasoning
-- @unwitnessable 3: generate_series over literal bounds
-- A pg_catalog function's FROM-position SHAPE. The walk's fallback for a
-- function whose name the user catalog cannot answer for is ONE column
-- named after the function — right for generate_series, and wrong for
-- every builtin with
-- NAMED OUTPUT COLUMNS: json_each has key and value, and
-- jsonb_array_elements has one column named `value`, the fallback's own
-- arity with a different name (the class only an ordered-name comparison
-- catches). pg_get_function_result cannot supply this — a builtin declared
-- with OUT parameters renders as `SETOF record` (measured) — so the
-- snapshot reassembles the shape from proargnames/proallargtypes into
-- CatalogSnapshot.builtinTableFunctions, environment rather than schema,
-- like builtinStrictFunctions. The soundness suite's ordered name
-- comparison against PostgreSQL's RowDescription is the real oracle here.
-- `json_each` is ALSO shadowed by a user function in this schema
-- (adversarial-3 finding 6), and PostgreSQL still runs pg_catalog's: this
-- fixture is the unqualified half of that precedence, and
-- pg-catalog-shadowed-from-shape.sql the qualified one.
SELECT
  e.key,          -- @nullable
  e.value,        -- @nullable
  a.value AS av,  -- @nullable
  g               -- @nullable
FROM json_each('{"a": 1, "b": 2}'::json) e
CROSS JOIN jsonb_array_elements('[1, 2]'::jsonb) a
CROSS JOIN generate_series(1, 2) g
