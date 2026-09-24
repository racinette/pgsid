# Restricted Rust AST wire contract

The Rust parser accepts source text and returns a JSON syntax tree. Validation
happens before serialization. The same tree is consumed by the Go and TypeScript
transpilers; neither target parses Rust or applies a target-specific allowlist.
The tree describes the accepted Rust syntax, not generated-language operations.

The envelope has `schemaVersion` and source-ordered `items`. Every node has a
`kind` discriminator. A new kind or field changes the contract and requires both
transpilers to be updated before the parser may emit it. Unknown nodes are
contract violations, not regex `Uncertain` results.

Here is an encoding of a function from the transpiler smoke test:

```rust
pub fn shift_span(span: Span, offset: usize) -> Span {
    let mut shifted = span;
    shifted.start += offset;
    shifted.end += offset;
    shifted
}
```

```json
{
  "schemaVersion": 1,
  "items": [
    {
      "kind": "function",
      "visibility": "public",
      "name": "shift_span",
      "parameters": [
        { "name": "span", "type": { "kind": "path", "segments": ["Span"] } },
        { "name": "offset", "type": { "kind": "path", "segments": ["usize"] } }
      ],
      "returnType": { "kind": "path", "segments": ["Span"] },
      "body": [
        {
          "kind": "local",
          "binding": { "name": "shifted", "mutable": true },
          "initializer": { "kind": "path", "segments": ["span"] }
        },
        {
          "kind": "expression",
          "semicolon": true,
          "value": {
            "kind": "binary",
            "operator": "add-assign",
            "left": {
              "kind": "field",
              "base": { "kind": "path", "segments": ["shifted"] },
              "member": "start"
            },
            "right": { "kind": "path", "segments": ["offset"] }
          }
        },
        {
          "kind": "expression",
          "semicolon": true,
          "value": {
            "kind": "binary",
            "operator": "add-assign",
            "left": {
              "kind": "field",
              "base": { "kind": "path", "segments": ["shifted"] },
              "member": "end"
            },
            "right": { "kind": "path", "segments": ["offset"] }
          }
        },
        {
          "kind": "expression",
          "semicolon": false,
          "value": { "kind": "path", "segments": ["shifted"] }
        }
      ]
    }
  ]
}
```

The initial item kinds are `constant`, `struct`, `enum`, and `function`.
Structs carry named fields. Enums carry unit or single-payload variants.
Allowed `derive` names are transmitted as a list on structs and enums.
For example, an enum with a payload is encoded as:

```json
{
  "kind": "enum",
  "visibility": "public",
  "name": "Outcome",
  "derives": ["Clone", "Copy", "PartialEq", "Eq"],
  "variants": [
    { "name": "Found", "payload": { "kind": "path", "segments": ["Span"] } },
    { "name": "NoMatch" },
    { "name": "Uncertain" }
  ]
}
```

Types use `path` with `segments` and, only for `Vec`, `typeArguments`; immutable
references use `reference` with an `inner` type. Function parameters carry a
name and type. A local binding also records whether it is mutable and may carry
an explicit type.

```json
[
  { "kind": "reference", "inner": { "kind": "path", "segments": ["str"] } },
  {
    "kind": "path",
    "segments": ["Vec"],
    "typeArguments": [{ "kind": "path", "segments": ["char"] }]
  }
]
```

Blocks are ordered arrays of `local` or `expression` statements. Expression
statements preserve the Rust semicolon distinction. The initial expression
kinds are `integer`, `path`, `parenthesized`, `binary`, `field`, `index`,
`method-call`, `struct-literal`, `call`, `if`, `while`, `return`, and `break`.
`method-call` preserves its receiver, name, and ordered arguments; `call`
preserves its callee and ordered arguments. The validator admits only the
specific methods and constructors in the supported Rust dialect.

Integer literals are decimal strings, not JSON numbers, to avoid precision
loss at the JavaScript boundary. The validator must reject or canonicalize
other Rust literal spellings and enforce the shared numeric limits. Source
positions and Rust punctuation tokens are omitted: they do not affect accepted
program behavior. Parser diagnostics remain the Rust component's responsibility.

This is an AST transport format, not a normalized evaluator IR. The validator
still has to check names, types, derives, and operations in addition to syntax;
the current spike's syntax-only pass is not yet that full contract check.
