-- @unwitnessable 7: unlike actor_id, one branch's lookup carries a JOIN inside
--   the subquery (customers to orders), and key entailment reads a subquery
--   whose FROM is a single relation. The two FK hops are each individually
--   sound — shipments.order_id and orders.customer_id are both NOT NULL keys —
--   and composing them is the recorded boundary of the mechanism, not a
--   property of the data
-- Extreme fixture: set operations combining queries with different
-- structures, CTEs, subqueries, and expression types.
--
-- Tests: UNION ALL of a 3-CTE query with a 2-CTE query with a plain
-- query; INTERSECT with a subquery; different nullability profiles per
-- operand; window functions; correlated subqueries; COALESCE; strict
-- functions; domain NOT NULL; and scalar subqueries.
--
-- The query produces a unified activity feed combining order events,
-- review events, and shipment events. Each source has different
-- nullability characteristics. The UNION ALL result is then filtered
-- and ranked.

WITH order_events AS (
  SELECT
    o.id AS entity_id,
    'order' AS event_type,
    o.status AS description,
    o.placed_at AS event_time,
    o.customer_id AS actor_id,
    (
      SELECT c.email FROM customers c WHERE c.id = o.customer_id
    ) AS actor_email,
    COALESCE(
      (SELECT sum(oi.quantity * oi.unit_price)
       FROM order_items oi WHERE oi.order_id = o.id),
      0
    ) AS amount,
    (
      SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id
    ) AS detail_count,
    lower_strict(o.status) AS lower_desc,
    always_text(o.status) AS guaranteed_desc,
    NULL::text AS carrier
  FROM orders o
  WHERE o.deleted_at IS NULL
),

review_events AS (
  SELECT
    r.id AS entity_id,
    'review' AS event_type,
    COALESCE(r.comment, 'No comment') AS description,
    NULL::timestamptz AS event_time,
    r.customer_id AS actor_id,
    (
      SELECT c.email FROM customers c WHERE c.id = r.customer_id
    ) AS actor_email,
    NULL::numeric AS amount,
    1 AS detail_count,
    lower_strict(COALESCE(r.comment, 'No comment')) AS lower_desc,
    always_text(COALESCE(r.comment, 'x')) AS guaranteed_desc,
    NULL::text AS carrier
  FROM reviews r
),

shipment_events AS (
  SELECT
    s.id AS entity_id,
    'shipment' AS event_type,
    s.carrier AS description,
    COALESCE(s.shipped_at, s.delivered_at) AS event_time,
    (
      SELECT o.customer_id FROM orders o WHERE o.id = s.order_id
    ) AS actor_id,
    (
      SELECT c.email
      FROM customers c
      JOIN orders o ON o.customer_id = c.id
      WHERE o.id = s.order_id
    ) AS actor_email,
    NULL::numeric AS amount,
    (
      SELECT count(*) FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.id = s.order_id
    ) AS detail_count,
    lower_strict(s.carrier) AS lower_desc,
    always_text(s.carrier) AS guaranteed_desc,
    s.tracking_no AS carrier
  FROM shipments s
  WHERE s.shipped_at IS NOT NULL
),

combined_events AS (
  SELECT * FROM order_events
  UNION ALL
  SELECT * FROM review_events
  UNION ALL
  SELECT * FROM shipment_events
),

ranked_events AS (
  SELECT
    ce.entity_id,
    ce.event_type,
    ce.description,
    ce.event_time,
    ce.actor_id,
    ce.actor_email,
    ce.amount,
    ce.detail_count,
    ce.lower_desc,
    ce.guaranteed_desc,
    ce.carrier,
    row_number() OVER (
      PARTITION BY ce.event_type
      ORDER BY ce.entity_id
    ) AS type_seq,
    rank() OVER (
      ORDER BY ce.event_time DESC NULLS LAST
    ) AS time_rank,
    count(*) OVER () AS total_events,
    count(*) OVER (PARTITION BY ce.event_type) AS type_count
  FROM combined_events ce
)

SELECT
  re.entity_id                             AS entity_id,        -- @notNull
  re.event_type                            AS event_type,       -- @notNull
  re.description                           AS description,      -- @notNull
  COALESCE(re.description, 'N/A')          AS safe_description, -- @notNull
  re.event_time                            AS event_time,       -- @nullable
  -- Every branch keys into a NOT NULL foreign key: two are the column
  -- itself, the third a correlated lookup on shipments.order_id.
  re.actor_id                              AS actor_id,         -- @notNull
  COALESCE(re.actor_id, 0)                 AS safe_actor_id,    -- @notNull
  re.actor_email                           AS actor_email,      -- @nullable
  COALESCE(re.actor_email, 'unknown@none') AS safe_email,      -- @notNull
  re.amount                                AS amount,           -- @nullable
  COALESCE(re.amount, 0)                   AS safe_amount,      -- @notNull
  re.detail_count                          AS detail_count,     -- @notNull
  COALESCE(re.detail_count, 0)             AS safe_detail_count, -- @notNull
  re.lower_desc                            AS lower_desc,       -- @notNull
  COALESCE(re.lower_desc, 'none')          AS safe_lower_desc,  -- @notNull
  re.guaranteed_desc                       AS guaranteed_desc,  -- @notNull
  re.carrier                               AS carrier,          -- @nullable
  COALESCE(re.carrier, 'N/A')              AS safe_carrier,     -- @notNull
  re.type_seq                              AS type_seq,         -- @notNull
  re.time_rank                             AS time_rank,        -- @notNull
  re.total_events                          AS total_events,     -- @notNull
  re.type_count                            AS type_count,       -- @notNull
  CASE
    WHEN re.event_type = 'order' THEN 'ORDER'
    WHEN re.event_type = 'review' THEN 'REVIEW'
    WHEN re.event_type = 'shipment' THEN 'SHIPMENT'
    ELSE 'UNKNOWN'
  END                                      AS event_label,     -- @notNull
  CASE
    WHEN re.amount IS NOT NULL AND re.amount > 500 THEN 'high_value'
    WHEN re.amount IS NOT NULL AND re.amount > 0 THEN 'standard'
    ELSE 'no_amount'
  END                                      AS value_category    -- @notNull
FROM ranked_events re
WHERE re.time_rank <= 100
ORDER BY re.event_time DESC NULLS LAST, re.entity_id
