-- The child half of inherit-attnotnull-child-declares.sql: the constraint the
-- parent's tree scan must NOT be given is real where it was declared.
--
-- `cnn_c` redeclares the inherited `legal_name` as NOT NULL, so scanning the
-- child reads its own attnotnull and the column is non-null — no state can put
-- a NULL there, and the INSERTs that would try are refused. Without this half
-- the parent fixture is satisfiable by an engine that simply ignores child
-- constraints everywhere, which is not the rule.
SELECT
  c.legal_name   -- @notNull   (declared on the child itself)
FROM cnn_c c
