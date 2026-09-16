# JSON Schema validation in generated Go

JSON Schema mappings describe JSON values returned by database queries.
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

Compiled schemas are cached and reused across calls. Runtime validation uses
santhosh-tekuri/jsonschema with an ECMAScript regular expression engine provided
by regexp2. Generated validation support imports these Go modules; targets
without enabled mappings do not import them. Schemas are embedded in generated
code, and reference resolution does not load external resources at runtime.
Formats retain their annotation behavior.

A failure identifies the query and output column and wraps the underlying error.
Consumers can unwrap it to inspect schema keywords, instance paths, and nested
causes. Compilation and decoding failures retain the same query context.
A failed scan does not replace the destination JSON value. A failed batch closes
its rows and returns an error without partial results.
