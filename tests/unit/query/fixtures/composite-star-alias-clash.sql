-- `(x).*` where x names BOTH a range-table alias and a composite COLUMN of
-- that relation (adversarial-2 finding 13): the parenthesized form is the
-- VALUE spelling, and PostgreSQL resolves p to the COLUMN — fields sku and
-- qty — while the engine's old alias-first order expanded the RELATION's
-- id and p. Same arity, entirely different columns: id's notNull landed on
-- PostgreSQL's sku, the second same-arity permutation this project has
-- met, and another argument for the ordered-name consumer gate.
-- expandCompositeStar now tries column resolution first; both fields are
-- forced nullable (a NULL composite nulls every field) and witnessed by
-- the generated NULL and empty-qty composites. The non-clashing alias
-- spelling stays correct — composite-star-whole-row.sql pins it.
SELECT (p).*
FROM cc p
-- @nullable   (sku)
-- @nullable   (qty)
