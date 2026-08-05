-- FINDING 12 (rank 1) — the VARIADIC calling convention defeats
-- ALWAYS_NOT_NULL_BUILTINS and FIRST_ARG_BUILTINS. Those tables reason
-- about ELEMENTS ("concat ignores NULL arguments"; "concat_ws(',', NULL) is
-- ''"), but `VARIADIC <array>` passes the whole variadic parameter as ONE
-- array, and a NULL array makes the call return NULL — the argument list is
-- not "some NULL members", it is absent.
--
-- Measured NULL for: concat, concat_ws (first arg non-null!),
-- jsonb_build_array, json_build_array, jsonb_build_object, num_nulls,
-- num_nonnulls. `concat(VARIADIC ARRAY[NULL, NULL]::text[])` is '' — a
-- non-null array of NULL elements behaves as the tables say, which is the
-- distinction the fix has to make.
--
-- ALWAYS_NOT_NULL ignores argument nullability entirely, so it claims
-- notNull whatever the array expression is; FIRST_ARG only looks at
-- argument 0. STRICT_TOTAL members (num_nulls) are saved here only because
-- the literal NULL array reads nullable.
-- Mechanism: nullability-walk.ts priority 6b — no branch inspects
-- `FuncCall.func_variadic`.
SELECT
  concat(VARIADIC NULL::text[]) AS c,             -- @notNull  <-- FALSIFIED
  concat_ws(',', VARIADIC NULL::text[]) AS w,     -- @notNull  <-- FALSIFIED
  jsonb_build_array(VARIADIC NULL::text[]) AS j   -- @notNull  <-- FALSIFIED
