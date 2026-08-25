# Temporary relations, and why the pipeline treats them the way it does

`SchemaBuilder.validate` opens by destroying state (`DISCARD TEMP`); a valid
function is reported as an error on purpose; the escape hatch is a config
key rather than an annotation, and no diagnostic mentions it. Each looks
questionable alone. Together they are forced, and this is the chain that
forces them — written 2026-08-25, the day it was worked out, with the two
readings that turned out to be wrong left in, because they are the ones a
reader arrives at independently.

Every claim is measured. Cases: `tests/unit/temp-relations-red.test.ts`
(24, section numbers referenced below). Register: `docs/deferred-tasks.md`
§1d (built), §1e (designed).

## 0. The substrate

```sql
CREATE TABLE temptest(col int);
CREATE TEMP TABLE temptest(tcol int);   -- lands in pg_temp_N, shadows the above
SELECT * FROM temptest;                 -- → tcol
```

`pg_temp` is not a catalog and not a schema you can create. On first temp
object PostgreSQL lazily makes `pg_temp_N` for your backend — N is the
backend id, so concurrent sessions get `pg_temp_1`, `pg_temp_2`, … each
holding a different table of the same name. Every session SEES all of them
in `pg_namespace`; what is private is resolution. `pg_temp` sits implicitly
FIRST in the search path, ahead of `"$user"` and `public`, which is the
shadowing above.

Lifetime is the SESSION, not the transaction — `ON COMMIT DROP` is how you
opt into transaction lifetime. At session end PostgreSQL drops the
namespace with `CASCADE`, and that cascade is the hinge everything below
turns on.

## 1. The snapshot excludes temp relations, and should

```ts
// src/catalog/snapshot.ts
const NOT_TEMP = `n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast_temp_%'`;
```

Not an oversight. pgsid applies migrations and inspects the catalog on ONE
connection; the application runs on a DIFFERENT one, where nothing in
`pg_temp_N` is reachable. Capturing it would put relations in the catalog
no consumer session can see — confidently wrong rather than refusing, the
direction adversarial finding 11 exists to forbid.

The corpus shows what real usage looks like — sqlc's own `ddl_pg_temp`:

```sql
-- schema.sql
CREATE TABLE pg_temp.migrate (val SERIAL);
INSERT INTO pg_temp.migrate (val) SELECT val FROM old_table;
INSERT INTO new_table (val) SELECT val FROM pg_temp.migrate;
```
```sql
-- query.sql
SELECT 1;                               -- never touches it. It cannot.
```

Two apparent counter-arguments, both measured out:

```sql
-- "strip TEMPORARY like we strip CONCURRENTLY"
CREATE TABLE oc (i int) ON COMMIT DROP;
-- ERROR: ON COMMIT can only be used on temporary tables
CREATE TABLE temptest(tcol int);
-- ERROR: relation "temptest" already exists     … and SELECT still answers `col`
```

`CONCURRENTLY` is a pure execution-strategy hint, context-free and
semantically empty. `TEMPORARY` carries three observable things: the
namespace, whether `ON COMMIT` parses, and lifetime. On the regression
corpus that is 40 `ON COMMIT` clauses across 468 temp creations in 82
files, and `temp.sql`'s masking test turned into a hard error while still
answering `col` — it does not even fix the pins it would aim at.

The second: *"PGlite is single-session, so capture them."* True of the
pg-regress REPLAY, where temp tables genuinely are live for the statements
analysed. Not of the product, where the two sessions are the point.

## 2. The first reading, and why it was wrong

```sql
-- (a) left in place, a function reads it
CREATE TEMP TABLE staging (id int NOT NULL, val text);
CREATE FUNCTION reads_staging() ... FROM staging ...;      -- diags: []

-- (b) created dynamically
DO $$ BEGIN EXECUTE 'CREATE TEMP TABLE t_dyn (i int)'; END $$;   -- diags: []

-- (c) pure scratch: create → use → drop                          -- diags: []

-- (d) dropped while a function still reads it
DROP TABLE staging;   -- error: relation "staging" does not exist  ← TRUE positive
```

(d) is correct: after that migration commits, calling the function really
does fail. And (b) shows something worth keeping — a migration RUNS, so
however the table was made (literal DDL, dynamic SQL, a called function) it
is *state* by the time anything looks. Snapshot awareness would reach
dynamic SQL here, unlike in a function body where nothing has executed.

So the reading was: **migration statements cost nothing.** It survived
until the next question.

## 3. The pivot: dependencies are tracked by TYPE, never through a body

```sql
CREATE TEMP TABLE tt (i int);
CREATE FUNCTION app.by_sig()     RETURNS SETOF tt LANGUAGE sql AS $$ SELECT * FROM tt $$;
CREATE FUNCTION other.by_arg(x tt) RETURNS int   LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION app.by_atomic()  RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT i FROM tt LIMIT 1; END;
CREATE FUNCTION app.by_body()    RETURNS int LANGUAGE sql     AS $$ SELECT i FROM tt LIMIT 1 $$;
CREATE FUNCTION app.by_plpgsql() RETURNS int LANGUAGE plpgsql AS $$ BEGIN RETURN (SELECT i FROM tt LIMIT 1); END $$;
```
```
tracked (pg_depend)    by_arg, by_atomic, by_sig
DROP TABLE tt          ERROR: cannot drop table tt because other objects depend on it
after DISCARD TEMP     app.by_body, app.by_plpgsql          ← the survivors
SELECT app.by_body()   ERROR: relation "tt" does not exist
```

A reference that lands in the TYPE SYSTEM — return type, argument type, a
parsed `BEGIN ATOMIC` body — becomes a `pg_depend` row. One inside an
opaque string body never does. The plain `DROP` refuses; the schema-level
cascade at session end takes them silently, and it crosses schemas because
`pg_depend` decides, not where the function lives.

**Tracked references leave with the table and are self-correcting.
Untracked ones outlive it and are permanently broken.**

## 4. Which makes the clean-looking case the worst one

```sql
CREATE TEMP TABLE staging (id int NOT NULL, val text);
CREATE FUNCTION public.reads_staging() ... FROM staging ...;
-- diags: []          ← §2(a), and now read it through §3
```

`reads_staging` has an opaque body, so nothing records the dependency, so
it SURVIVES into the shipped database and fails on every call the
application makes. plpgsql_check said nothing because it reads the live
catalog and `staging` was sitting in it.

**The visibility that made the check pass is exactly what made the silence
wrong.** A false negative, and worse than the false positive (§6) the
investigation started from: a false positive annoys, a false negative ships
a broken function.

So "migration statements cost nothing" was wrong, in the expensive
direction.

## 5. The fix, and the fix it made unnecessary

```
search_path before              app, public
check reads_staging BEFORE      []                                    ← the false negative
DISCARD TEMP
search_path after               app, public                           ← preserved
functions left                  reads_staging                         ← get_users_t is GONE
check reads_staging AFTER       error: relation "staging" does not exist
```

The first design was a **capture-closure check** — walk `pg_depend`, warn
when a captured object's dependency is not captured. It was written up
before the better answer appeared: pgsid inspects the catalog BEFORE the
migration session ends, so it describes a state nobody will connect to.
Simulate session end instead. Four consequences:

1. The false negative becomes a true positive.
2. A function whose SIGNATURE names a temp relation cascades away before
   the snapshot sees it, so the dangling capture stops *existing* rather
   than being diagnosed. **The closure check became unnecessary** —
   consistency by construction, the stronger kind of fix.
3. `DISCARD TEMP`, not `DISCARD ALL`:
   ```
   DISCARD ALL in txn:  ERROR: DISCARD ALL cannot run inside a transaction block
   search_path after DISCARD ALL:  reset      ← validate must preserve it
   ```
4. BEFORE the `BEGIN`:
   ```
   inside txn after DISCARD TEMP:  0 temp relations
   after ROLLBACK:                 1          ← it is transactional; validate always rolls back
   ```

The one thing lost is now reported rather than silent: a migration that
says `CREATE FUNCTION` and ends with no function gets a warning carrying
the `CREATE`'s own range.

## 6. The residue: a function that builds its own temp table

```sql
CREATE FUNCTION stager() RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
  CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
  INSERT INTO tmp_stage VALUES (1);
  RETURN (SELECT count(*) FROM tmp_stage);
END $$;
```
```
SELECT stager()   →  1                                    ← the function is valid
plpgsql_check     →  error: relation "tmp_stage" does not exist
```

Untouched by §5, because the table is created at CALL time and a migration
never calls the function. Not the snapshot's doing, and no snapshot scope
closes it — the DDL is inside an opaque body, and libpg-query exposes
`parse`/`parseSync` only, with no plpgsql parser. pgsid holds bodies as
`prosrc` text.

## 7. Why every obvious escape is dead

plpgsql_check documents four. The decisive measurement, on a database
WITHOUT the extension — i.e. the user's production:

```sql
CREATE FUNCTION stager() RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
  PERFORM plpgsql_check_pragma('table: tmp_stage(i int)');
  ...
END $$;
-- CREATE:  OK
SELECT stager();
-- ERROR: function plpgsql_check_pragma(unknown) does not exist
```

The pragma is not a call pgsid makes; it is a `PERFORM` inside the FUNCTION
BODY, and that body is the user's migration text, which also runs where the
extension is absent. `CREATE FUNCTION` gives no warning; it fails later, at
call time. **A tool that emits "add a pragma" as a hint ships a bug to fix
a false positive** — the measurement most likely to be re-proposed from the
extension's documentation alone.

```
session-level pragma call:  [{"plpgsql_check_pragma":1}]              ← accepted, no-op
check right after it:       error: relation "tmp_stage" does not exist
plpgsql_check_function_tb:  (name, relid, fatal_errors, …)            ← no table parameter
SET plpgsql.enable_check:   ERROR: invalid configuration parameter name
```

So it cannot be supplied from outside the body either, and the documented
per-function opt-out does not exist in our runtime. What remains is the
fake-table trick — automated, scoped to pgsid's own session instead of
being a permanent shadow table the user maintains.

An annotation (`-- pgsid-ignore: missing-relation(…)`) was rejected on a
measured property, not taste:

```sql
CREATE TEMP TABLE tmp_stage (i int);        -- the declaration
-- checking a body that reads tmp_stage.nope:
--   error: column "nope" does not exist    ← still caught
```

**A pre-created relation DECLARES rather than silences.** Suppression would
blind the checker to everything downstream of that relation — in a function
built around a temp table, the whole body, in the one function the user
flagged as understood.

## 8. What that leaves: `engine.runtime`

```yaml
# pgsid.yaml
engine:
  poolSize: 2
  runtime: engine/runtime.sql       # string or array, as `schema` already allows
```
```sql
-- engine/runtime.sql — ordinary DDL, no new syntax anywhere
CREATE TEMP TABLE tmp_stage (i int);
```

Run inside `validate`'s transaction AFTER the discard. Plumbing notes in
`docs/deferred-tasks.md` §1e. Three decisions worth the reasons:

- **Config key, not a magic filename.** `pgsid.yaml` already declares paths
  (`schema`, `sql.paths`); `pgsid.init.sql` would be a parallel mechanism.
  Home is `engine`, which already means "the PGlite instance pgsid stands
  up".
- **After the discard**, because:
  ```
  check with the declaration:        []
  DISCARD TEMP
  same check after:                  error: relation "tmp_stage" does not exist
  ```
- **No diagnostic points at it.** `relation "x" does not exist` is USUALLY
  exactly what it says — a missing table, a function written ahead of it, a
  typo. Hinting "declare it in `engine.runtime`" on every instance
  advertises the escape hatch as the first move on a genuinely broken
  function. Documented and found by someone who already knows they have a
  runtime-created relation. A TARGETED hint — only when the body textually
  contains `CREATE TEMP TABLE <name>` — is defensible and stays available,
  but it is a substring scan built to produce one sentence.

The accepted cost:

```sql
CREATE FUNCTION intended() ... BEGIN CREATE TEMP TABLE tmp_stage (i int); ... END;
CREATE FUNCTION mistake()  ... BEGIN RETURN (SELECT count(*) FROM tmp_stage); END;
-- before the declaration:  mistake() → error: relation "tmp_stage" does not exist
-- after:                   mistake() → []          ← masked
```

Opt-in per relation name rather than per diagnostic, which is far narrower
than a general ignore mechanism. Escalation if it bites: scope visibility
to functions whose body textually creates that relation.

## 9. Still open

- `engine.runtime` itself — the key and the wiring. `SchemaBuilder` takes
  no config today, so `validate(pg)` needs the paths passed in. The
  mechanism is measured (§7b); only plumbing is missing.
- `EXECUTE 'CREATE TEMP TABLE …'` inside a body is pinned as a BOUNDARY,
  not a target: a string in a body that has not run, so neither the
  snapshot nor a body scan reaches it. `engine.runtime` covers it anyway —
  the declaration does not care how the relation would have been made.
- ```sql
  SET search_path TO pg_temp;
  CREATE TABLE accounts (id int NOT NULL, email text NOT NULL);
  -- apply: ok   diags: []   snapshot tables: []
  ```
  Contrived alone; the realistic harm is a LATER migration inheriting a
  non-LOCAL `SET search_path`. Recorded, not built — the clearest candidate
  is a warning when a migration's DDL contributes nothing to the snapshot.

## 10. Two wrong readings, kept on purpose

1. **"Temp-unawareness costs nothing on the migration side."** Held until
   §3 was measured. False in the expensive direction — the clean-looking
   case is the false negative.
2. **"Emit a hint recommending `plpgsql_check_pragma`."** Proposed twice.
   It ships a function that fails at call time wherever the extension is
   absent, with no warning at `CREATE`.

The pattern in both: a conclusion drawn from what the tool could SEE at the
moment it looked, rather than from what the database will look like when
somebody else connects. That is the question to ask of any new rule here.
