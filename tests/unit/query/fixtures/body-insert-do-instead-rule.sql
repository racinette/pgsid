-- The body path meets the DO INSTEAD rule refusal (adversarial-2 finding
-- 6, second half): rule_src's rule replaces body_ins_rule's INSERT with
-- one against rule_dst returning a literal NULL for a, while the engine
-- once read rule_src.a's NOT NULL through the unpatched buildDmlScope
-- call. buildInsertScope now throws the rule refusal inside the body —
-- and the inliner CATCHES it: an inlined body is an optimization, so the
-- refusal costs the call its precision (conservative nullable), not the
-- statement its analysis. The top-level spelling of the same INSERT
-- refuses outright — pinned in unsupported-nodes.test.ts. Witnessed: the
-- rule's literal NULL comes back on every call.
SELECT
  body_ins_rule() AS a  -- @nullable
