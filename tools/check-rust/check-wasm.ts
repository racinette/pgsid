import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'

const artifact = new URL('../../artifacts/check-rust-spike/', import.meta.url)
const generated = transpileCheckRust(readFileSync(new URL('check.rs', artifact), 'utf8'))
assert.equal(generated.typescript, readFileSync(new URL('check.ts', artifact), 'utf8'))
assert.equal(generated.go, readFileSync(new URL('go/check.go', artifact), 'utf8'))

const evaluator = emitCheckRustEvaluator({
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
      { kind: 'certain', expression: { kind: 'integer', type: 'pg_catalog.int4', value: '0' } },
    ],
  },
})
const standalone = transpileCheckRust(assembleCheckRust(evaluator))
assert.match(standalone.typescript, /function evaluateCheck\(/u)
assert.match(standalone.go, /func EvaluateCheck\(/u)
