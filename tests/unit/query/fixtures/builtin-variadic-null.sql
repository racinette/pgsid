-- The VARIADIC calling convention defeats element-wise reasoning
-- (adversarial-2 finding 12): ALWAYS_NOT_NULL_BUILTINS says "concat ignores
-- NULL arguments" and FIRST_ARG_BUILTINS "concat_ws hinges on its first",
-- but `VARIADIC <array>` passes the variadic parameter as ONE array and a
-- NULL array yields NULL — measured for concat, concat_ws (first argument
-- non-null!), jsonb_build_array, json_build_array, jsonb_build_object,
-- num_nulls, num_nonnulls. The first three columns witness that NULL on the
-- single row this FROM-less SELECT returns in every state.
--
-- The cause is ARRAY-nullability, not element-nullability, and `ctrl` is
-- where the two come apart: `ARRAY[...]` is a CONSTRUCTOR and is never itself
-- NULL, so the gate's whole reason is absent and concat's own claim applies
-- to the elements as it always did — `concat(VARIADIC ARRAY[NULL, NULL])` is
-- '', exactly as `concat(NULL, NULL)` is. It used to read nullable behind a
-- recorded reason that said so.
--
-- FIRST_ARG_BUILTINS comes along too, and the reason is a SIGNATURE fact
-- rather than a courtesy: `concat_ws(text, VARIADIC "any")` declares its
-- separator OUTSIDE the variadic parameter, so VARIADIC can only absorb the
-- trailing arguments and the operand the rule hinges on is still the call's
-- first. PostgreSQL will not accept the folded spelling at all — measured,
-- `concat_ws(VARIADIC ARRAY[',', 'a'])` is "function concat_ws(text[]) does
-- not exist" — so there is no shape where reading position 0 reads an
-- element. `ws_ok` and `ws_null` are the two sides of that rule.
--
-- STRICT_TOTAL_BUILTINS deliberately does NOT come along: its claim is
-- non-null in, non-null out, and a literal array's ELEMENTS are exactly where
-- a NULL still hides. No column pins that, on purpose — it is a REFUSAL, so
-- it can only ever under-claim, and a fixture for it would have to claim
-- nullable on a value that is never NULL and pay an unwitnessable reason for
-- the privilege. The gate that CAN over-claim is the literal-array test, and
-- the three NULL-array columns above falsify it.
SELECT
  concat(VARIADIC NULL::text[]) AS c,                  -- @nullable
  concat_ws(',', VARIADIC NULL::text[]) AS w,          -- @nullable
  jsonb_build_array(VARIADIC NULL::text[]) AS j,       -- @nullable
  concat(VARIADIC ARRAY[NULL, NULL]::text[]) AS ctrl,  -- @notNull
  concat_ws(',', VARIADIC ARRAY['a', NULL]::text[]) AS ws_ok, -- @notNull
  concat_ws(NULL, VARIADIC ARRAY['a']::text[]) AS ws_null     -- @nullable
