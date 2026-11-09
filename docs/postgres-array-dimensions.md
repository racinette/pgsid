PostgreSQL array declarations do not enforce nesting depth. Generated types
assume one dimension unless a target's column mapping specifies `dimensions`.
The annotation describes the expected depth; it does not alter the database.

```yaml
sql:
  codegen:
    typescript:
      mappings:
        column:
          public.measurements.matrix: { dimensions: 2 }
          public.measurements.values: { dimensions: [1, 2] }
    go:
      mappings:
        column:
          public.measurements.matrix: { dimensions: 2 }
          public.measurements.values: { dimensions: [1, 2] }
```

Element types remain inferred from PostgreSQL, including domain types. A
dimension annotation cannot accompany a JSON Schema mapping. Go also accepts
type overrides: an element type mapping keeps the annotation, while a column
type override or a complete array type override conflicts with it.

Fixed depths produce nested arrays or slices. A depth is never inferred from
how a value nests: below its declared levels a list is one element, which is
how an array holds elements that are lists themselves, such as values of a
domain over an array, multiranges or JSON arrays.

TypeScript represents several allowed depths as a union tagged by the depth,
`{ dimensions: 1; elements: … } | { dimensions: 2; elements: … }`. Generated
TypeScript queries send exactly the declared levels and read results by the
depth the server returns; a depth the column does not declare fails with an
error naming the setting to change. CHECK validators and query prevalidation
read arrays by the same declared depths.

Go represents an explicit list of depths with flat elements and dimension
metadata, retaining custom lower bounds. Generated Go executors check those
depths on input and output. Fixed-depth Go outputs are checked and reshaped by
the executor as well. Fixed-depth Go inputs are assumptions without additional
dimension validation.

Direct writes inherit the destination annotation. CTEs and views preserve
source annotations, and slices keep the source depth. Scalar subscripts yield
the PostgreSQL scalar type; insufficient indices can produce SQL NULL.
Unknown transformations fall back to the described PostgreSQL type with the
default depth.

SQL NULL remains distinct from an empty array. An empty array has no
dimensions; TypeScript reads it as `[]`, or with the lowest declared depth when
several are allowed. Go accepts empty arrays with zero dimensions for every
allowed depth. Element nullability applies to
scalar members rather than intermediate slices.
