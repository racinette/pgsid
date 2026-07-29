-- LANGUAGE plpgsql function returning a NOT NULL domain.
-- Priority 1 (NOT NULL domain return) is language-agnostic and wins over
-- everything. Even with a nullable argument, the domain constraint is
-- enforced at the call boundary, guaranteeing a non-null result.
-- Compare with always_text (LANGUAGE sql, same domain return).
SELECT
  plpgsql_domain_fn(p.name)       AS plpgsql_nn,    -- 
  plpgsql_domain_fn(p.deleted_at) AS plpgsql_nullarg, -- 
  always_text(p.name)             AS sql_nn,        -- 
  lower_strict(p.name)            AS strict_nn,     -- 
  lower_strict(p.deleted_at)      AS strict_null   -- 
FROM products p
