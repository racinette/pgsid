-- @unwitnessable 4: JSON_TABLE columns are conservative (see the node census); the fixed document always provides this member
-- @unwitnessable 5: same: the EXISTS column tests a member the document always has
-- @unwitnessable 6: same: the nested path always resolves in the fixed document
-- XMLTABLE and JSON_TABLE are FROM items that spell out their own columns.
--
-- Neither resolves against the catalog: the COLUMNS list in the query *is* the
-- column list, so failing to read it drops every column from `SELECT *`.
--
-- Only two things are non-null. FOR ORDINALITY is a generated counter, and an
-- XMLTABLE column declared NOT NULL is enforced — PostgreSQL raises rather
-- than emitting NULL. A regular column is NULL when its path matches nothing,
-- and a JSON_TABLE EXISTS column can still yield NULL under UNKNOWN ON ERROR.
-- JSON_TABLE NESTED PATH columns are spliced into the same output row.
SELECT
  x.n              AS xml_ordinality,   -- @notNull
  x.required       AS xml_not_null,     -- @notNull
  x.optional       AS xml_optional,     -- @nullable
  jt.pos           AS json_ordinality,  -- @notNull
  jt.a             AS json_regular,     -- @nullable
  jt.present       AS json_exists,      -- @nullable
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
    NESTED PATH '$.c[*]' COLUMNS (nested_val text PATH '$.d')
  )
) jt
