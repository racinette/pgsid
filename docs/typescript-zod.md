# zod schemas

With `schema: { outDir, zod: true }` under `sql.codegen.typescript`, each
schema directory gets a `zod.ts` of zod v4 schemas beside `checks.ts`. It
imports `zod/v4`, which zod 4 and zod 3.25 both provide.

```ts
import { paymentsInsertSchema, withPaymentsChecks } from './generated/schema/public/zod.js'

const insert = withPaymentsChecks(paymentsInsertSchema)
const patch = withPaymentsChecks(paymentsInsertSchema.partial())
```

Per table there are `<table>SelectSchema`, `<table>InsertSchema` and
`<table>UpdateSchema`, object schemas with the fields of the select, insert and
update table types: nullable where the column is, optional where an insert may
leave the column to its default or NULL and everywhere in an update, and
without generated and always-identity columns where writes cannot set them.

A field accepts exactly what the generated queries send. Booleans, safe
integers, bigints and text are native zod; an enum or a column whose CHECKs
admit only some literals is a `z.enum` or literal union. Every other shape
(dates, timestamps, numerics, arrays, ranges, records, geometry) is a
`z.custom` checked by the query codec's own encoder and typed as the table
type's field. A field of a domain also takes the domain's literals and meets
the domain's CHECKs. A JSON field is a JSON container (`json(value)` or `jsonText(text)`); its
JSON Schema, if the column has one, is checked when the container's value is
read, as for rows.

`with<Table>Checks(schema)` adds the table's CHECKs as a refinement to any
shape picked from these schemas, so `.partial()`, `.pick()` and `.omit()`
shapes check too: a column a value leaves out leaves the checks reading it
undecided, and only a check that comes out FALSE or raises reports an issue,
with the constraint and its SQLSTATE in `params`. A value of the right shape
that the server's input rejects, such as month 13 in a date, fails the checks
that read it with the server's error. Refinements run once the fields parse.

The inferred types are the flat field types; the case unions CHECKs derive
(see `check-unions.md`) are checked by the refinement, not carried by zod's
types.
