-- An `unnest` field's ORIGIN is its element expression's origin
-- (`unnestFieldOrigins`), landed 2026-08-22 beside `presenceProducer` and
-- answering the other half of the same question.
--
-- `originOf` refuses for every table function, and is right to: a function
-- result is not a table row. An unnest of an array CONSTRUCTOR is the
-- exception that proves it — the value is written out in the query, so the
-- row it names is one the walk can already see, in THIS scope. That makes
-- the field carry not just presence but VALUE identity, which is what CHECK
-- entailment needs: guest's `status <> 'housed' OR room IS NOT NULL` is a
-- fact about a guest row, and `pr.q` is a guest row's `room`.
--
-- The origin is taken UNLIFTED, unlike a CTE's or a view's. A lift prefixes
-- the inner rowPath with the reference's instance because the inner row
-- identity belongs to a different scope; `g` here is a sibling FROM item, so
-- its rowPath already speaks this scope's instances and prefixing would name
-- a row that does not exist. What does compose is presence, and the entry's
-- own unit chain and optionality are merged in at the same depth.
--
--   entailed    THE CLAIM: the outer filter selects 'housed' rows, the CHECK
--               says a housed guest has a room, and the origin is what
--               carries that from `pr.q` back to guest.room. Identical to
--               the same query written without the unnest, which is the
--               fixed point it was measured against.
--   unfiltered  the same field with no filter above it — nullable, and
--               witnessed by any guest that is not housed. The control that
--               makes `entailed` a claim about the FILTER rather than about
--               the field, and the one that would catch an origin that
--               dropped its optionality.
SELECT x.entailed, y.unfiltered
FROM (
  SELECT pr.p AS st, pr.q AS entailed
  FROM guest g, unnest(ARRAY[ROW(g.status, g.room)::gfn_pair]) AS pr
) x,
(
  SELECT pr2.q AS unfiltered
  FROM guest g2, unnest(ARRAY[ROW(g2.status, g2.room)::gfn_pair]) AS pr2
) y
WHERE x.st = 'housed'
-- @notNull    (entailed: the CHECK, reached through the unnest field's origin)
-- @nullable   (unfiltered: no filter, so the CHECK entails nothing)
