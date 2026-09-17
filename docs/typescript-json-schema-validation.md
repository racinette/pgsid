# JSON Schema validation in generated TypeScript

Validation checks are generated ahead of time. The application executes ordinary
TypeScript functions without a runtime schema compiler or schema loader.

Each mapped document produces a graph of reusable checks indexed by JSON pointer.
Named type guards, standalone diagnostic validators, and query projections call
those checks. Scalar projections share checks as well as objects and arrays.
Query choices compose source contracts rather than copying their assertions.
Diagnostic paths remain relative to the validated value and are prefixed when
contracts are composed.

Static regular expressions are initialized when the schema module loads.
Identical patterns within a document share an expression. Property checks,
structural equality, and diagnostic operations use shared runtime helpers.

Error arrays and recursive-value tracking belong to each validation call.
Reentrant calls receive separate state. Repeated references to an object in
separate branches are permitted; cycles encountered by recursive checks report
an error. Recursive checks remove their active values when they return.

Boolean guards provide the successful-query fast path. When a guard rejects a
value, a diagnostic validator collects paths, keywords, and expected values for
the query error. Standalone callers can request diagnostics directly.

Runtime modules and type declarations have separate output destinations.
Requesting JSON Schema runtime output enables automatic query validation unless
disabled globally or for an individual column mapping. Standalone validators
remain available when automatic checking is disabled.
