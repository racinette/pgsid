-- The group face of the duplicate-name star hazard: before positional
-- resolution, the lifted shipments group pulled outer column 1 (g.a AS
-- id — a DIFFERENT unit) in as a discriminant via first-name-match, a
-- claim execution falsifies on any shipped order without a gm match.
-- Fixed, the lift translates by ordinal: the sh unit is {0,2}, and g's
-- single bare column is below the floor. dense: orders 2/4 unshipped
-- (absent), 1/3 shipped (present); no gm rows, so column 1's NULL is
-- witnessed there too.
-- @null-group 0*,2*
SELECT s.* FROM (
  SELECT
    sh.id,          -- @nullable
    g.a AS id,      -- @nullable
    sh.carrier      -- @nullable
  FROM orders o
  LEFT JOIN shipments sh ON sh.order_id = o.id
  LEFT JOIN gm g ON g.a = o.id
) s
