# JSON Schema validation in generated Go

JSON Schema mappings describe JSON values read from and written to mapped columns.
Validation is opt-in for a target, with an override on each column mapping.
Requesting runtime support enables validation unless explicitly disabled.

```yaml
sql:
  codegen:
    go:
      jsonSchemas:
        runtime: { validate: true }
      mappings:
        column:
          public.events.payload: { jsonSchema: EventPayload }
          public.events.audit:
            jsonSchema: EventAudit
            runtime: { validate: false }
```

Write inputs receive the mapped schema's generated type when a parameter flows
unchanged into the column. Enabled validation runs before the database call,
including writes without returned rows. The validated JSON encoding is passed
to the driver without encoding the value again. Repeated parameters must satisfy
all enabled destination schemas; different named schema types use a general
input value when they cannot share a Go type.

Direct assignments through CTEs, multi-row values, JSON casts, conflict updates,
and merge arms carry destination contracts. Partial assignments, conditional
choices, and functions that transform a parameter report unsupported input
coverage. They retain their described parameter types. An input contract is
checked before execution even when the write would match no rows. It does not
validate values subsequently produced by database functions or triggers.

Reusable validators accept Go values or original JSON independently of query
execution. Their shared runtime package has no database driver dependency.
Raw JSON validation preserves required-property and additional-property evidence
that may be lost when JSON is decoded into a struct first.

Validation runs against the original JSON before decoding into generated Go
values. Required properties and additional properties remain visible at this
point. Defaults are annotations; validation does not insert them into results.
Integer bounds are checked without converting numbers to floating point.

SQL NULL bypasses JSON validation and retains the configured SQL null behavior.
The JSON literal `null` is a JSON value and must satisfy the mapped schema.
The distinction is preserved when SQL and JSON nulls use validity wrappers.

A JSON projection is checked against the selected part of its source schema.
References resolve within the original document, including recursive definitions.
Text projections use the database driver's string decoding. Unsupported or
unmapped transformations do not receive automatic JSON validation. A choice
that includes an opted-out alternative also bypasses automatic validation.

Each embedded schema is registered in a shared compiler. Standalone validators,
query inputs, and query outputs reuse compiled schemas by resource and path.
Combined contracts reuse their referenced compiled schemas. Compilation is lazy,
serialized, and cached, including failures; validation uses the cached schemas.
Runtime validation uses santhosh-tekuri/jsonschema with an ECMAScript regular
expression engine provided by regexp2. Generated validation support imports these Go modules; targets
that generate only types do not import them. Requesting standalone runtime
support also emits reusable validators when automatic query checking is disabled.
Schemas are embedded in generated code, and reference resolution does not load
external resources at runtime.
Generated resource identifiers use an internal URI scheme; schema-provided
identifiers retain their reference-resolution behavior.
Formats retain their annotation behavior.

A query validation failure identifies the query and input parameter or output
column and wraps the underlying error.
Consumers can unwrap it to inspect schema keywords, instance paths, and nested
causes. Compilation and decoding failures retain the same query context.
A failed scan does not replace the destination JSON value. A failed batch closes
its rows and returns an error without partial results.
