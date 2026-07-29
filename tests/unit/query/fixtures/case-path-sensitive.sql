-- Path-sensitive CASE: a branch result is walked under the conditions that
-- must hold for that branch to run.
--
-- A branch runs only when its condition is TRUE, so every strict operand in
-- that condition is non-null inside it — the same inference WHERE promotion
-- makes. Reaching a later branch or the ELSE means no earlier condition was
-- TRUE, which is far weaker: a condition is skipped when it is FALSE *or
-- NULL*. Only conditions that can never evaluate to NULL support an
-- inference there.
--
-- customers.name and addresses.line2/postal_code are nullable; email, city
-- and line1 are NOT NULL.
SELECT
  -- Positive guard: the branch tested the column it returns.
  CASE WHEN c.name IS NOT NULL THEN c.name ELSE 'anon' END      AS guarded,      -- @notNull

  -- A strict comparison being TRUE also proves its operands are non-null.
  CASE WHEN c.name = 'x' THEN c.name ELSE 'anon' END            AS eq_guarded,   -- @notNull

  -- Negative guard: IS NULL is total (never NULL itself), so reaching the
  -- ELSE proves it was FALSE.
  CASE WHEN c.name IS NULL THEN 'anon' ELSE c.name END          AS else_guarded, -- @notNull

  -- An OR that is not TRUE has no TRUE disjunct, so every disjunct is not
  -- TRUE and each total one yields its inference.
  CASE WHEN c.name IS NULL OR c.deleted_at IS NULL
       THEN 'anon' ELSE c.name END                              AS or_guarded,   -- @notNull

  -- Earlier conditions are negated for later branches.
  CASE WHEN c.name IS NULL THEN 'anon'
       WHEN c.email > 'a' THEN c.name
       ELSE 'other' END                                         AS later_branch, -- @notNull

  -- TRAP: a strict condition is NULL when its operand is, so the row falls
  -- through to the ELSE with the operand still NULL. Falsity proves nothing.
  CASE WHEN a.postal_code > 'x' THEN 'big'
       ELSE a.postal_code END                                   AS strict_else,  -- @nullable

  -- TRAP: an AND that is not TRUE tells us only that *some* conjunct failed.
  CASE WHEN c.name IS NULL AND c.deleted_at IS NULL
       THEN 'anon' ELSE c.name END                              AS and_else,     -- @nullable

  -- TRAP: no ELSE — an unmatched CASE is NULL however well-guarded.
  CASE WHEN c.name IS NOT NULL THEN c.name END                  AS no_else,      -- @nullable

  -- TRAP: the simple form compares values rather than evaluating predicates,
  -- so its WHEN expressions contribute no guards — not even here, where the
  -- comparison would otherwise prove `c.name` IS NULL in that branch.
  CASE (c.name IS NULL) WHEN true THEN c.name ELSE 'x' END      AS simple_form,  -- @nullable

  -- A guard proving a column of an optional relation is non-null also proves
  -- the row exists, promoting the alias for the rest of the branch.
  CASE WHEN a.line2 IS NOT NULL THEN a.city ELSE 'none' END     AS promoted,     -- @notNull

  -- Outside any branch the same column is still nullable.
  a.city                                                        AS bare_city     -- @nullable
FROM customers c
LEFT JOIN addresses a ON a.customer_id = c.id
