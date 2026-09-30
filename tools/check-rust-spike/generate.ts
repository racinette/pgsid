import { writeFileSync } from 'node:fs'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { writeCheckRustSources } from '../check-rust/sources.js'
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
              collation: 'C',
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
const source = assembleCheckRust(evaluator)
const catalogNames = new Set(
  builtinCallables()
    .filter((callable) => callable.kind === 'function')
    .map((callable) => callable.rustName),
)
const implementationNames = [
  ...source.modules.flatMap((module) =>
    module.files.flatMap((file) => [...file.source.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)]),
  ),
].map((match) => match[1]!)
if (new Set(implementationNames).size !== implementationNames.length)
  throw new Error('Duplicate Rust SQL implementation name')
for (const name of implementationNames)
  if (!catalogNames.has(name))
    throw new Error(`Rust SQL implementation is absent from catalog: ${name}`)
for (const name of evaluator.callables)
  if (!implementationNames.includes(name))
    throw new Error(`Rust CHECK callable has no implementation: ${name}`)

const output = process.argv[2]
const evaluatorOutput = process.argv[3]
if (!output || !evaluatorOutput)
  throw new Error('usage: generate.ts OUTPUT_RUST OUTPUT_EVALUATOR_RUST')
writeCheckRustSources(output, source)
writeFileSync(evaluatorOutput, evaluator.source)
