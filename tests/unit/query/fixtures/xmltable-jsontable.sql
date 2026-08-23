-- @unwitnessable 4: JSON_TABLE columns are conservative (see the node census); the fixed document always provides this member
-- @unwitnessable 9: same: the nested path always resolves in the fixed document
-- XMLTABLE and JSON_TABLE are FROM items that spell out their own columns.
--
-- Neither resolves against the catalog: the COLUMNS list in the query *is* the
-- column list, so failing to read it drops every column from `SELECT *`.
--
-- Non-null are the GENERATED columns, plus one declared one. FOR ORDINALITY is
-- a counter. A JSON_TABLE EXISTS column answers a PREDICATE, and a predicate
-- has no room for "absent" — a missing member is false, not NULL. And an
-- XMLTABLE column declared NOT NULL is enforced: PostgreSQL raises rather than
-- emitting NULL. A regular column is NULL when its path matches nothing.
-- JSON_TABLE NESTED PATH columns are spliced into the same output row.
--
-- `present` used to be nullable with a recorded reason, and the reason WAS the
-- rule: "only an explicit UNKNOWN ON ERROR could make it NULL". `exists_unk`
-- is that clause, and it is the one EXISTS column here that is genuinely
-- nullable — `strict $.b[*]` over a document without `b` RAISES, which is the
-- error the behaviour clause answers for. `nested_exists` is the second gate:
-- inside a NESTED PATH the predicate is still total, but the path is an OUTER
-- JOIN against the level above, and `$.zz[*]` matches nothing. Both witnessed.
SELECT
  x.n              AS xml_ordinality,   -- @notNull
  x.required       AS xml_not_null,     -- @notNull
  x.optional       AS xml_optional,     -- @nullable
  jt.pos           AS json_ordinality,  -- @notNull
  jt.a             AS json_regular,     -- @nullable
  jt.present       AS json_exists,      -- @notNull
  jt.exists_strict AS json_exists_raising, -- @notNull
  jt.exists_unk    AS json_exists_unknown, -- @nullable
  jt.nested_exists AS json_nested_exists,  -- @nullable
  jt.nested_val    AS json_nested       -- @nullable
FROM XMLTABLE(
  '/r' PASSING xml '<r><required>1</required></r>'
  COLUMNS n FOR ORDINALITY,
          required int PATH 'required' NOT NULL,
          optional text PATH 'optional'
) x
CROSS JOIN JSON_TABLE(
  '{"a":1,"c":[{"d":"x"}]}'::jsonb, '$'
  COLUMNS (
    pos FOR ORDINALITY,
    a int PATH '$.a',
    present bool EXISTS PATH '$.b',
    exists_strict bool EXISTS PATH 'strict $.b[*]',
    exists_unk bool EXISTS PATH 'strict $.b[*]' UNKNOWN ON ERROR,
    NESTED PATH '$.zz[*]' COLUMNS (nested_exists bool EXISTS PATH '$.b'),
    NESTED PATH '$.c[*]' COLUMNS (nested_val text PATH '$.d')
  )
) jt
