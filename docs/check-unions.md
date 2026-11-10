# CHECK-derived types

A table's CHECK constraints often say more than its column types: that a text
column holds one of a few words, or that one column is set exactly when another
holds a given value. Generated TypeScript types carry both facts.

```sql
CREATE TABLE payments (
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  kind pay_kind NOT NULL,
  paid_at date,
  CHECK ((kind = 'paid') = (paid_at IS NOT NULL))
);
```

```ts
type Row = { status: 'closed' | 'open'; kind: PayKind; paid_at: string | null } & (
  { kind: 'paid'; paid_at: string } | { kind: 'pending' | 'refunded'; paid_at: null }
)
```

A column whose CHECKs admit only some literals takes their union. CHECKs that
tie columns together add one union per group of columns, intersected with the
flat row type the way outer-join presence groups are, so testing `kind` narrows
`paid_at` and leaves other groups alone.

## Where the types apply

- **Rows read**, in query results, views and table select types: columns that
  pass a base table's column through unchanged, from one row of it. A row
  reached through an outer join may be absent, which adds the all-NULL member.
  A column of a set operation takes the union of its branches' literals when
  every branch passes such a column through, and no cases. Expressions and
  casts are not narrowed. Stored
  rows meet the table's validated CHECKs, including its inheritance tree's, so
  a `NOT VALID` CHECK narrows nothing here: older rows may break it.
- **Values written**: query parameters written straight to a column, and
  table insert and update types, meet the enforced CHECKs, `NOT VALID` ones
  included. A parameter takes its column's literals, and parameters written to
  one row take that row's cases over the columns they supply; columns left to
  defaults or to the stored row may hold anything. An insert may leave out a
  column only in cases where its default or NULL fits. An update type takes
  literals only, since the rest of the row is the stored one.

- **Domains**: a domain whose CHECKs, with its base domains', admit only
  some literals has its alias narrowed to them, brand kept, so every column,
  parameter and row of the domain is. A `NOT VALID` domain constraint narrows
  nothing, since stored values may predate it.

## Members

A group's members follow its discriminant: a column whose value fixes the
other columns' shapes, preferring an enum, then a boolean, then a literal set,
then fewer members. Each value the CHECKs mention is a member, values they
never mention behave alike and share one, NULL is one more, and a value no row
can hold is none:

```ts
| { kind: 'paid'; since: string }
| { kind: 'pending'; since: null }
| { kind: 'refunded'; since: string | null }   // matched by no CASE branch
```

Without such a column, which columns are NULL may tell the members apart, as
for `num_nonnulls(a, b, c) = 1`. Without either, members are merged
combinations of values, which may overlap. A query that selects a group's
columns but not its discriminant gets merged members over what it selected.

## What is read

Each CHECK is evaluated over a small set of abstract states per column: NULL,
each literal the CHECKs compare it with, and any other value (an enum's labels
and a boolean's two values instead of "other"). Equality, `IN`, `= ANY` and
`<> ALL` over literal lists, `IS [NOT] DISTINCT FROM`, null tests, boolean
connectives, `CASE`, boolean columns, comparisons of truth values and
`num_nulls`/`num_nonnulls` counts are read. Anything else may be TRUE, FALSE or
NULL, so it never excludes a case. A combination survives when every CHECK may
be TRUE or NULL for it, as PostgreSQL accepts a row whose CHECK is NULL; the
types describe at least every row PostgreSQL accepts.

Literals become types only where unequal literals are unequal values and the
literal is the value the column holds: text and varchar under a deterministic
collation, enums, integers and booleans. `char(n)` compares without trailing
blanks and is not narrowed; neither is numeric, whose `1.0` and `1` are equal.
