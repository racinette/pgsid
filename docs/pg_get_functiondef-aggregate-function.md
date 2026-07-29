# pg_get_functiondef on aggregate functions

## Bug

`pg_get_functiondef(oid)` raises `ERROR 42809: "name" is an aggregate function`
when called on a `pg_proc` row with `prokind = 'a'` (aggregate). It only
supports regular functions (`prokind = 'f'`) and procedures (`prokind = 'p'`).

This is PostgreSQL's own behavior, not a PGlite-specific issue. The error
comes from `ruleutils.c:2956` in the `pg_get_functiondef` routine, which
explicitly rejects aggregates.

## Reproduction

```typescript
import { PGlite } from "@electric-sql/pglite";

const pg = await PGlite.create();
await pg.exec(`
  CREATE FUNCTION count_it_sfunc(state bigint, val integer) RETURNS bigint
    LANGUAGE sql AS 'SELECT state + 1';
  CREATE AGGREGATE count_it(integer) (
    SFUNC = count_it_sfunc, STYPE = bigint, INITCOND = '0'
  );
`);
// Throws: ERROR 42809: "count_it" is an aggregate function
await pg.query(`
  SELECT pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
`);
```

## Impact

`snapshotCatalog` in `src/catalog/snapshot.ts` queries all user-schema
functions via `queryFunctions()`, which calls `pg_get_functiondef(p.oid)`
unconditionally on every `pg_proc` row. When the schema contains a
user-defined aggregate (created via `CREATE AGGREGATE`), the snapshot query
fails with `42809`, preventing the entire catalog snapshot from completing.

Fields the snapshot needs from `pg_get_functiondef`:
- `definition` — the full `pg_get_functiondef` text, stored as
  `FunctionInfo.definition`.

For aggregates, this field is not needed by the nullability walk (aggregates
short-circuit at dispatch priority 3 — conservative nullable — before body
recursion at priority 5). It may be needed by other consumers (e.g. the
apply pipeline's function comparison), but for aggregates the
`pg_get_functiondef` output is not meaningful anyway (it returns the
`CREATE AGGREGATE` text, not a function definition).

## Fix

In `src/catalog/snapshot.ts`, `queryFunctions()` wraps the
`pg_get_functiondef` call in a `CASE` expression that skips it for
aggregates:

```sql
CASE WHEN p.prokind != 'a'
     THEN pg_get_functiondef(p.oid)
     ELSE NULL
END AS definition,
```

All other columns the snapshot reads from `pg_proc` (`prosrc`, `prokind`,
`proisstrict`, `prorettype`, etc.) work fine for aggregates — they are
direct column reads, not function calls.

## Open question

Should `FunctionInfo.definition` for aggregates contain the
`pg_get_functiondef`-equivalent text (i.e. the `CREATE AGGREGATE`
statement)? If a future consumer needs it, `pg_get_functiondef` won't
provide it. An alternative is `pg_get_function_arguments` + manual
reconstruction, but that's out of scope for the nullability walk fix.
