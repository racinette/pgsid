-- @unwitnessable 3: the CONTROL — a non-null array of NULL elements behaves
--   as the element-wise tables say (concat skips them, yielding ''), so this
--   value is never NULL; the engine's nullable is the variadic gate's
--   uniform conservatism, which does not inspect the array expression.
-- The VARIADIC calling convention defeats element-wise reasoning
-- (adversarial-2 finding 12): ALWAYS_NOT_NULL_BUILTINS says "concat ignores
-- NULL arguments" and FIRST_ARG_BUILTINS "concat_ws hinges on its first",
-- but `VARIADIC <array>` passes the variadic parameter as ONE array and a
-- NULL array yields NULL — measured for concat, concat_ws (first argument
-- non-null!), jsonb_build_array, json_build_array, jsonb_build_object,
-- num_nulls, num_nonnulls. Priority 6b now sends every variadic-array call
-- to conservative nullable; the first three columns witness the NULL on the
-- single row this FROM-less SELECT returns in every state.
SELECT
  concat(VARIADIC NULL::text[]) AS c,                  -- @nullable
  concat_ws(',', VARIADIC NULL::text[]) AS w,          -- @nullable
  jsonb_build_array(VARIADIC NULL::text[]) AS j,       -- @nullable
  concat(VARIADIC ARRAY[NULL, NULL]::text[]) AS ctrl   -- @nullable  ('' — see @unwitnessable)
