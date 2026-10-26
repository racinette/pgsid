# CHECK validation across writes

A CHECK expression describes a candidate database row. Query parameters are
not that row: an assignment can apply a cast or expression, an omitted column
can receive a default, and a generated column can depend on other columns.
The write path must produce a partial candidate row before calling the CHECK
evaluator. A known SQL null, a known value, and an unknown value remain
distinct. When a value cannot be reproduced in the target language, the
evaluator leaves the affected result uncertain and PostgreSQL decides.

The row validator evaluates constraints against the row it receives. The
query adapter interprets assignments and decides when the row is available.
For a single-row insert with a portable expression, it can evaluate the
expression from query inputs. A default that depends on database state stays
unknown. An update may need the previous row and may affect no rows, so a
parameter alone does not justify rejecting the update before it executes.

## Execution assumptions

The CHECK settings describe the target PostgreSQL deployment. They do not inspect
the machine running generated Go or TypeScript. Declare byte order explicitly
when constraints use PostgreSQL hashes that depend on native byte layout:

```yaml
sql:
  codegen:
    checks:
      nativeByteOrder: little
```

Both `little` and `big` select arithmetic that runs consistently in every target
language. Omitting this setting leaves an affected hash uncertain unless both
orders produce the same result. Non-ASCII text hashes also require the declared
`serverEncoding: UTF8` setting. These assumptions do not supply deployment
catalog identities or session settings.
Floating NaN hashes remain uncertain because byte order does not establish the
PostgreSQL build's canonical NaN bits.

Circle-to-polygon conversion also depends on the PostgreSQL build's sine and
cosine implementation. Declare `trigonometry: fdlibm` when the deployment uses
the fdlibm kernels with binary64 arithmetic and rounding to nearest. This
selects shared arithmetic in every generated language. It describes PostgreSQL,
independently of the math library on the client machine. Without a declared
profile, reached coordinate generation stays uncertain; context-independent
NULL results, input errors and skipped branches remain available.

Interval output uses `intervalStyle: postgres`, `postgres_verbose`,
`sql_standard` or `iso_8601`. The shared formatter preserves independent signs
for month, day and time components across casts, containers and JSON. Missing
context retains known finite scalar nullness while output bytes stay uncertain.
The same setting controls the leading-negative rule in runtime text input,
including container elements. Without it, parsing retains only values or errors
shared by both sign rules. Direct text-input precision and input/output/input
round trips compare their final values across the applicable styles. Stored constants retain their
captured components independently of later session changes.

Calendar SQL output uses an explicit `dateStyle: { format: ISO, order: MDY }`
profile matching the PostgreSQL session. SQL, Postgres and German formats use
the same shared calendar formatter. Direct date and timestamp conversion to
JSON retains ISO rendering independently of that setting.

Timestamptz SQL output uses both `dateStyle` and `timeZone: America/New_York`.
The timezone declaration uses the bundled IANA rules and labels; the target
deployment must use matching timezone data. Canonical PostgreSQL TimeZone names
and explicit POSIX rules retain historical and future transitions across targets.
Direct JSON values and keys use ISO timestamps with numeric offsets independently
of DateStyle. Missing context retains known finite scalar text nullness while
bytes stay uncertain; NULLs and infinities remain independent of the settings.

Binary text output uses `byteaOutput: hex` or `escape` to match the target
session's `bytea_output`. The same formatter supplies scalar casts, array and
record fields, and JSON values and keys. Without the setting, output bytes stay
uncertain; bounded scalar values with known bytes retain known nullness. NULLs, child errors and
skipped branches remain available.

Identifier quoting uses `quoteAllIdentifiers: true` or `false` to match the
target session's `quote_all_identifiers` setting. Forced quoting escapes every
name; minimal quoting follows PostgreSQL's identifier syntax and keyword
categories. When the setting is omitted, names requiring quotes in both modes
still have definite output. Safe bare names retain known nullness while their
text stays uncertain.

## Row-rewriting triggers

PostgreSQL applies row-level BEFORE triggers before testing the resulting row
against table CHECK constraints. A trigger can change a value or skip the row.
Target-language evaluation sees the row before that trigger unless the
application supplies the row after it. A preflight failure can therefore
disagree with PostgreSQL, and a preflight pass cannot certify the final row.

Generated CHECK validation remains enabled by default when a BEFORE trigger
exists. Generation emits a warning identifying the affected table and write
operation so the user can review whether the trigger changes the checked
values. Trigger introspection identifies the presence and timing of a trigger;
it does not establish which columns its function modifies. The warning does
not change the generated checks or prevent database validation.

## Granular control

Configuration needs separate control over generated evaluators and their
automatic use in query wrappers. Keeping an evaluator available is useful
when a caller can provide a trustworthy row even if a query wrapper cannot.
Both controls should apply consistently to every generated target language.

An evaluator exclusion can name a table, domain, or individual constraint.
A column exclusion removes each constraint that reads that column; a
multi-column constraint cannot be split into independent constraints. An
automatic-use exclusion can name a table, constraint, column, or query while
leaving the corresponding evaluator available for explicit calls. A column
exclusion at this boundary likewise skips the whole dependent constraint.
Selectors should use catalog identities and report unmatched names so a
misspelling does not silently leave validation enabled.

The presence of a BEFORE trigger never infers a safe subset of columns.
Users can use the warning to inspect the trigger and choose the narrowest
exclusion that matches its behavior. The default remains enabled, with the
database as the final authority for every write.
