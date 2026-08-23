-- @planner-keeps 1: the `c` join settles on c2's promotion, which is a fact
--   about two joins asking one question; the planner reduces a join from its
--   own qual and a uniqueness proof, and has no rule that relates two of them
-- NOT NULL domain columns on the optional side of a LEFT JOIN become
-- nullable. The domain's NOT NULL constraint guarantees the value is non-null
-- when a row exists, but the outer join can produce NULL-extended rows where
-- no match is found — the entire row, domain column included. The walk reports
-- that as nullable because the join's OPTIONAL state overrides the catalog's
-- notNull flag. `c3` is where it still does.
--
-- coupons.discount_percent is typed as the discount_percent domain (NOT NULL)
-- and the catalog reports attnotnull = true. WHERE promotion recovers non-null
-- for c2 directly.
--
-- `c` recovers it INDIRECTLY, and that is what this fixture became about. Its
-- ON is `c.id = 1` — a CONSTANT restriction, not a join condition, so no key
-- of any kind is involved and foreign-key entailment has nothing to say. But
-- c2 scans the SAME RELATION under the SAME RESTRICTION and the WHERE promotes
-- it, so any state where c2 has a row is one where c has the same row. The two
-- joins cannot be separated by data.
--
-- Both columns used to be nullable behind recorded reasons that said exactly
-- that, ending "the two joins cannot be separated by data. Measured — deleting
-- coupon 1 from dense returns no rows at all". The reason was a proof; what it
-- lacked was somewhere for the walk to put it.
--
-- There are two gates and each has its own column, because either one alone
-- lets the other's counterexample through.
--
-- `c3` is the RESTRICTION gate. Same relation, same shape, DIFFERENT constant
-- — and no coupon has id -1, so it is NULL on every row of every state. A rule
-- that compared restrictions loosely would claim notNull here.
--
-- `f` is the RELATION gate. Its ON is `f.id = 1`, which is the SAME predicate
-- as c2's once each is read against its own alias — and fk_nv is a different
-- table, seeded by no data state, so the join extends on every row. A rule
-- that matched restrictions without checking what they restrict would promote
-- it off c2's WHERE. (fk_nv is otherwise only ever scanned alone, where it
-- returns nothing and settles nothing; here it earns a witness.)
--
-- The refusal for a qual mentioning a THIRD alias is conservative rather than
-- load-bearing, and is marked so: two joins correlated to the same outer row
-- do in fact match together, so no fixture can show that refusal earning its
-- place. It stays because widening it would need an argument about join order
-- that nothing here would check.
SELECT
  o.id                              AS order_id,          -- @notNull
  c.discount_percent                AS discount,          -- @notNull
  c.code                            AS coupon_code,       -- @notNull
  COALESCE(c.code, 'none')          AS safe_code,         -- @notNull
  c2.discount_percent               AS promoted_discount, -- @notNull
  c3.code                           AS other_constant,    -- @nullable
  f.o_id                            AS other_relation     -- @nullable
FROM orders o
LEFT JOIN coupons c ON c.id = 1
LEFT JOIN coupons c2 ON c2.id = 1
LEFT JOIN coupons c3 ON c3.id = -1
LEFT JOIN fk_nv f ON f.id = 1
WHERE c2.code IS NOT NULL
