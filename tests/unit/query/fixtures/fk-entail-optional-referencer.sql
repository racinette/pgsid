-- Gate: the referencing side must arrive carrying STORED rows.
--
-- The key constrains rows of orders; a NULL-extended orders slice is not one
-- of them, and its customer_id is NULL, which matches nothing. So `c` really
-- can extend here even though orders.customer_id is a NOT NULL foreign key —
-- witnessed by every t row with no order (t.id and o.id share no values in any
-- state, so the first LEFT JOIN extends on every row).
--
-- The FULL-JOIN arm of the entailment is the near miss to keep in view: there
-- the referencing side is optional too, but by the SAME join, so its own
-- extension yields rows where the referenced side is present rather than
-- absent. Here the extension happens one join EARLIER, and the difference is
-- the whole gate.
SELECT
  t.id    AS tid,            -- @notNull
  o.id    AS order_id,       -- @nullable
  c.email AS customer_email  -- @nullable
FROM t
LEFT JOIN orders o ON o.id = t.id + 100000
LEFT JOIN customers c ON c.id = o.customer_id
