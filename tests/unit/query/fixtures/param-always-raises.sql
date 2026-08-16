-- The always-raises statement fact (docs/argument-nullability.md): the
-- enforced CASE constraint reads `WHEN plan = 'team' THEN seats IS NOT NULL
-- AND seats > 1 ELSE true`, and this row writes 'team' with seats = 1. The
-- guard grounds TRUE, its arm grounds FALSE, and nothing a binding could
-- change is left in the predicate — the statement rejects on every
-- execution, so $1 has no contract to carry at all. The flag is what
-- explains that blank, and the suites hold it to the observed raise rather
-- than the claim.
--
-- A VALUES row is UNIVERSAL: every execution constructs it. The same
-- assignment in an UPDATE or a MERGE arm would raise only when a row
-- matched, which this flag deliberately does not say (pinned in
-- param-mechanism.test.ts).
-- @args ["ops@example.com"]
-- @param 1 nullable
-- @always-raises
-- @no-rows: the CASE constraint is FALSE for this row under every binding
-- @raises: violates check constraint
INSERT INTO subscription (plan, seats, overflow_contact)
VALUES ('team', 1, $1)
