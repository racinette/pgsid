-- The target-state predicate selects the first CASE arm for disabled_reason.
-- A random predicate beside it is intentionally not a stable row fact, so
-- review_note retains its nullable alternative.
-- @args [1, 10, 300]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @null-groups none
-- @param-rejections none
UPDATE principals AS p
SET state = 'disabled',
    enabled = false,
    disabled_at = r.approved_at,
    disabled_reason = CASE
      WHEN p.enabled THEN coalesce(r.reason, 'approved request')
      ELSE NULL
    END,
    review_note = CASE
      WHEN random() < 0.5 THEN r.reviewer_note
      ELSE NULL
    END
FROM revocation_requests AS r
WHERE r.tenant_id = p.tenant_id
  AND r.requested_by = p.principal_id
  AND r.tenant_id = $1
  AND r.requested_by = $2
  AND r.request_id = $3
  AND r.approved_at IS NOT NULL
  AND p.enabled
RETURNING
  p.tenant_id,        -- @notNull
  p.principal_id,     -- @notNull
  p.disabled_at,      -- @notNull
  p.disabled_reason,  -- @notNull
  p.review_note,      -- @nullable
  p.lifecycle_marker  -- @notNull
