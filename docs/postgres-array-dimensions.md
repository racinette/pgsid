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

Element types remain inferred from PostgreSQL, including domain types and
custom element mappings. Dimension annotations cannot accompany an explicit
column type override or a JSON Schema mapping.
Complete PostgreSQL array type overrides also conflict with dimension
annotations; use an element type mapping when the generator should add depth.

Fixed depths produce nested arrays or slices. TypeScript represents several
allowed depths as a union of complete array shapes. Go represents an explicit
list of depths with flat elements and dimension metadata, retaining custom
lower bounds. Generated Go executors check those depths on input and output.
Fixed-depth Go outputs are checked and reshaped by the executor as well.
TypeScript annotations and fixed-depth Go inputs are assumptions without
additional dimension validation.

Direct writes inherit the destination annotation. CTEs and views preserve
source annotations, and slices keep the source depth. Scalar subscripts yield
the PostgreSQL scalar type; insufficient indices can produce SQL NULL.
Unknown transformations fall back to the described PostgreSQL type with the
default depth.

SQL NULL remains distinct from an empty array. Go accepts empty arrays with
zero dimensions for every allowed depth. Element nullability applies to
scalar members rather than intermediate slices.
