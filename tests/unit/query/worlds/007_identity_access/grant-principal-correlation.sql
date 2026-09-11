-- The exact composite foreign-key correlation guarantees a principal row.
-- Omitting tenant scope permits the other tenant's identity and adding an
-- incompatible tenant predicate can remove every candidate.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  g.grant_id, -- @notNull
  (SELECT p.display_name
   FROM principals AS p
   WHERE p.tenant_id = g.tenant_id
     AND p.principal_id = g.principal_id), -- @notNull
  (SELECT p.email
   FROM principals AS p
   WHERE p.tenant_id = g.tenant_id
     AND p.principal_id = g.principal_id), -- @nullable
  (SELECT p.display_name
   FROM principals AS p
   WHERE p.tenant_id = -1
     AND p.principal_id = g.principal_id), -- @nullable
  (SELECT p.display_name
   FROM principals AS p
   WHERE p.principal_id = g.principal_id
     AND p.tenant_id = 999) -- @nullable
FROM role_grants AS g
