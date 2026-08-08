-- Gate: "un-extendable from above" means by EVERYTHING above, not by the top
-- join alone.
--
-- The join-level fact says a join that cannot extend one of its sides leaves
-- the joins INSIDE that side un-extendable too, and records that as
-- `incomingRequired` on each of them. The last join here cannot extend its
-- left side — `product_tags.product_id` is a NOT NULL key onto `products` —
-- so the rule reached both joins nested inside it. But the RIGHT JOIN is
-- nested inside it as well, and null-extends `r0` and `r1` for a product
-- carrying no tags.
--
-- What made that a wrong ANSWER rather than a wrong note is where
-- `incomingRequired` lands: for an INNER join it makes the join ACTIVE, which
-- pushes its qual into `scope.impliedQuals` — a fact asserted of every emitted
-- row. `r0.id = r1.tag_id` was then implied over rows where both sides are
-- NULL, and each of those columns read notNull. Two claims, both falsified by
-- the same two rows.
--
-- So an inner join is skipped when another join within the SAME side has an
-- optional group covering it. The fact still reaches the joins nothing inside
-- the side extends, which is what it was built for
-- (`fk-entail-join-level-composed.sql`).
--
-- Found by the first run of the discovery generator
-- (`tests/probe/discovery.ts`, seed 20260808) — 3000 random foreign-key joins,
-- two hits, one defect. Every condition below is necessary, measured by
-- varying each alone: without the fourth join, with its ON on a non-key
-- column, with its key pointing at `r0` instead of `r2`, or with it spelled
-- LEFT or RIGHT rather than FULL, the engine already answers nullable.
--
-- Both columns are NOT NULL in their own tables, so each is NULL exactly when
-- the RIGHT JOIN dropped the side it lives on — and they live on the same
-- side, so they go together. That is two discriminants of one group, and the
-- group is the positive half of this fixture: the claim is not merely that
-- these columns are nullable but that they are nullable TOGETHER.
-- @null-group 0*,1*
SELECT
  r0.name AS tag_name,      -- @nullable
  r1.tag_id AS pt_tag_id    -- @nullable
FROM tags r0
JOIN product_tags r1 ON r0.id = r1.tag_id
RIGHT JOIN products r2 ON r1.product_id = r2.id
FULL JOIN product_tags r3 ON r2.id = r3.product_id
