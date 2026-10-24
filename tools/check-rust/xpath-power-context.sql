BEGIN;
SET LOCAL extra_float_digits = 3;
SELECT json_agg(encode(float8send((xpath('number(' || quote_literal('1e' || n) || ')', '<r/>'::xml))[1]::text::float8), 'hex') ORDER BY n) AS "xpathPowerOfTenBits"
FROM generate_series(-323, 308) AS n;
ROLLBACK;
