-- An `unnest` field's PRESENCE producer is the element expression's relation
-- (`presenceProducer`), landed 2026-08-22. It closed the generated corpus's
-- last structural bucket: 20 a_tb claims over unnest(left) and unnest(full),
-- and +60 presence groups with it.
--
-- The walk calls every unnest field nullable, and that was never the
-- operative gap. `unnest(ARRAY[ROW(u.email, u.val)::gfn_pair]) g` beside a
-- LEFT-joined `u` really does emit NULLs in both fields — an absent `u`
-- makes the ROW `(NULL, NULL)`, which unnest emits as one row with both
-- fields NULL. What was missing is that they are the SAME ROW's columns: a
-- refilter pinning one said nothing about the other, because the producer
-- list put them under the unnest item's own (REQUIRED) entry instead of
-- under u's null group.
--
-- Which is also why this could not ride on origins. `h.q` is `u.id::text`
-- and the corpus's own field is `u.val::text`; an origin claims "this column
-- IS that table column", which a CAST breaks, so `resolveBareColumnTarget`
-- refuses one and must keep refusing. A presence claim — "these columns are
-- NULL together" — a cast preserves exactly, so `presenceProducer` strips
-- casts and reads the same list a different way. Two consumers, two
-- semantics, one producer list: that is the whole finding.
--
--   pinned    u.email, and the outer WHERE pins it. NOT NULL in the catalog,
--             so pinning it proves the u row present.
--   derived   u.id::text through a SECOND unnest item. THE CLAIM: it is a
--             discriminant of the group the pin settles, and it flips only
--             because `presenceProducer` put both items' fields under u.
--             Through a different item on purpose — the group is u's, not
--             one unnest call's, and a redirect that only ever tied a single
--             item's own fields together would still pass without this.
--   spare     u.val, a group MEMBER that is not a discriminant: nullable
--             with `u` present, so the pin proves nothing about it and it
--             must stay nullable. The over-promotion control.
--   anchor    t.id, outside the group entirely — `t` is comma-joined and
--             REQUIRED, and `presenceProducer` declines for a producer whose
--             relation cannot be absent.
--
-- @planner-keeps 1: the walk settles the LEFT JOIN because `pinned` IS NOT
--   NULL is u.email, catalog NOT NULL, so no surviving row can have `u`
--   null-extended. `reduce_outer_joins` reaches strict quals in the WHERE of
--   the join's own query level; this one sits above a CTE and reads a column
--   the unnest produced, so the planner has no strict predicate on `u` at
--   the level where the join is — evidence it does not have rather than an
--   inference it declines to make.
WITH src AS (
  SELECT
    g.p  AS pinned,
    h.q  AS derived,
    g.q  AS spare,
    t.id AS anchor
  FROM t LEFT JOIN u ON u.t_id = t.id,
       unnest(ARRAY[ROW(u.email, u.val)::gfn_pair]) AS g,
       unnest(ARRAY[ROW(u.val::text, u.id::text)::gfn_pair]) AS h
)
SELECT pinned, derived, spare, anchor FROM src WHERE pinned IS NOT NULL
-- @notNull    (pinned: the outer WHERE)
-- @notNull    (derived: the presence group the pin settles)
-- @nullable   (spare: a member, not a discriminant)
-- @notNull    (anchor: t is REQUIRED)
