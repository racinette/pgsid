import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'

const expression: EvalBoolExpression = {
  kind: 'eval-boolean-logic',
  operation: 'and',
  operands: [
    {
      kind: 'eval-scalar',
      expression: {
        kind: 'call',
        call: {
          kind: 'operator',
          type: 'pg_catalog.bool',
          signature: 'operator:["pg_catalog",">"](pg_catalog.int4,pg_catalog.int4)',
        },
        operands: [
          { kind: 'input', type: 'pg_catalog.int4', name: 'amount' },
          {
            kind: 'certain',
            expression: { kind: 'integer', type: 'pg_catalog.int4', value: '0' },
          },
        ],
      },
    },
    {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [
        {
          kind: 'eval-regex',
          subject: { kind: 'input', type: 'pg_catalog.text', name: 'email' },
          pattern: { kind: 'input', type: 'pg_catalog.text', name: 'pattern' },
          options: {
            syntax: 'advanced',
            caseSensitive: true,
            expanded: false,
            newline: 'ordinary',
          },
          negated: false,
          collation: 'C',
        },
        {
          kind: 'eval-scalar',
          expression: {
            kind: 'call',
            call: {
              kind: 'operator',
              type: 'pg_catalog.bool',
              signature: 'operator:["pg_catalog","<>"](pg_catalog.text,pg_catalog.text)',
            },
            operands: [
              { kind: 'input', type: 'pg_catalog.text', name: 'status' },
              {
                kind: 'certain',
                expression: { kind: 'text', type: 'pg_catalog.text', value: 'housed' },
              },
            ],
          },
        },
      ],
    },
  ],
}

const evaluator = emitCheckRustEvaluator(expression)
const regexEngine = readFileSync(
  fileURLToPath(new URL('../../crates/regex-engine/src/lib.rs', import.meta.url)),
  'utf8',
)
const operations = new URL('../../crates/check-evaluator/src/operations/', import.meta.url)
const semantics = [
  '../../crates/check-evaluator/src/values.rs',
  ...readdirSync(operations)
    .filter((name) => name.endsWith('.rs'))
    .sort()
    .map((name) => `../../crates/check-evaluator/src/operations/${name}`),
  '../../crates/check-evaluator/src/logic.rs',
]
  .map((path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))
  .join('\n')
const catalogNames = new Set(
  builtinCallables()
    .filter((callable) => callable.kind === 'function')
    .map((callable) => callable.rustName),
)
const implementationNames = [...semantics.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map(
  (match) => match[1]!,
)
if (new Set(implementationNames).size !== implementationNames.length)
  throw new Error('Duplicate Rust SQL implementation name')
for (const name of implementationNames)
  if (!catalogNames.has(name))
    throw new Error(`Rust SQL implementation is absent from catalog: ${name}`)
for (const name of evaluator.callables)
  if (!implementationNames.includes(name))
    throw new Error(`Rust CHECK callable has no implementation: ${name}`)
const source = `${regexEngine}\n${semantics}\n${evaluator.source}`

const output = process.argv[2]
const evaluatorOutput = process.argv[3]
if (!output || !evaluatorOutput)
  throw new Error('usage: generate.ts OUTPUT_RUST OUTPUT_EVALUATOR_RUST')
writeFileSync(output, source)
writeFileSync(evaluatorOutput, evaluator.source)
