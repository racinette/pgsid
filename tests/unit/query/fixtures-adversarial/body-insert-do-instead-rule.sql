-- FINDING 6, second half — the same body path skips the DO INSTEAD rule
-- REFUSAL. rule_src's rule replaces the statement with `INSERT INTO
-- rule_dst VALUES (NEW.id, NULL) RETURNING id, a`, so the returned `a` is
-- the rule's literal NULL while the engine reads rule_src.a's NOT NULL.
--
-- Observed: NULL. Engine: notNull.
-- The top-level spelling refuses correctly:
--   INSERT INTO rule_src (id, a) VALUES (7, 'a') RETURNING a
--   → UnsupportedNodeError(statement, "DO INSTEAD rule (ON INSERT) on rule_src")
-- which is what makes this a bypass rather than a missing rule.
SELECT
  body_ins_rule() AS a  -- @notNull  <-- FALSIFIED
